-- Migración 001: PQRS en Línea (Fase A)
-- Proyecto: tmahegehoshaciodewzm (producto Cerca)
-- Referencia: docs/PLAN-ACCIONES-CUMPLIMIENTO-LANDING.md, docs/ESQUEMA-PQRS-COMUNICADOS-RECORDATORIOS.md

-- ========== TABLAS ==========

CREATE TABLE IF NOT EXISTS public.pqrs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conjunto_id uuid NOT NULL REFERENCES public.conjuntos(id) ON DELETE CASCADE,
  resident_id uuid NOT NULL REFERENCES public.residents(id) ON DELETE CASCADE,
  unit_id uuid REFERENCES public.units(id) ON DELETE SET NULL,
  type text NOT NULL CHECK (type IN ('Peticion', 'Queja', 'Reclamo', 'Sugerencia')),
  subject text NOT NULL,
  description text NOT NULL,
  status text NOT NULL DEFAULT 'Abierto' CHECK (status IN ('Abierto', 'En_revision', 'Respondido', 'Cerrado', 'Rechazado')),
  priority text NOT NULL DEFAULT 'Media' CHECK (priority IN ('Baja', 'Media', 'Alta')),
  assigned_to_id uuid REFERENCES public.residents(id) ON DELETE SET NULL,
  due_at timestamptz,
  closed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_pqrs_conjunto_id ON public.pqrs(conjunto_id);
CREATE INDEX idx_pqrs_conjunto_status ON public.pqrs(conjunto_id, status);
CREATE INDEX idx_pqrs_resident_id ON public.pqrs(resident_id);
CREATE INDEX idx_pqrs_assigned_to_id ON public.pqrs(assigned_to_id);

COMMENT ON TABLE public.pqrs IS 'PQRS: peticiones, quejas, reclamos y sugerencias por conjunto (landing compliance).';

--

CREATE TABLE IF NOT EXISTS public.pqrs_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pqrs_id uuid NOT NULL REFERENCES public.pqrs(id) ON DELETE CASCADE,
  author_id uuid REFERENCES public.residents(id) ON DELETE SET NULL,
  body text NOT NULL,
  is_internal boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_pqrs_comments_pqrs_id ON public.pqrs_comments(pqrs_id);

--

CREATE TABLE IF NOT EXISTS public.pqrs_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pqrs_id uuid NOT NULL REFERENCES public.pqrs(id) ON DELETE CASCADE,
  changed_by_id uuid REFERENCES public.residents(id) ON DELETE SET NULL,
  old_status text,
  new_status text NOT NULL,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_pqrs_history_pqrs_id ON public.pqrs_history(pqrs_id);

-- Trigger para actualizar updated_at en pqrs
CREATE OR REPLACE FUNCTION public.set_pqrs_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_pqrs_updated_at ON public.pqrs;
CREATE TRIGGER trg_pqrs_updated_at
  BEFORE UPDATE ON public.pqrs
  FOR EACH ROW EXECUTE FUNCTION public.set_pqrs_updated_at();

-- ========== RLS ==========

ALTER TABLE public.pqrs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pqrs_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pqrs_history ENABLE ROW LEVEL SECURITY;

-- Helper: resident_id del usuario actual en un conjunto (devuelve el primero si tiene varios)
CREATE OR REPLACE FUNCTION public.current_resident_id(p_conjunto_id uuid)
RETURNS uuid AS $$
  SELECT id FROM public.residents
  WHERE user_id = auth.uid() AND conjunto_id = p_conjunto_id
  LIMIT 1;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- PQRS: residente ve los suyos (autor o asignado)
CREATE POLICY pqrs_select_resident ON public.pqrs
  FOR SELECT USING (
    conjunto_id IN (SELECT conjunto_id FROM public.residents WHERE user_id = auth.uid())
    AND (
      resident_id = public.current_resident_id(conjunto_id)
      OR assigned_to_id = public.current_resident_id(conjunto_id)
    )
  );

-- PQRS: residente puede insertar si es residente de ese conjunto y se asigna a sí mismo como autor
CREATE POLICY pqrs_insert_resident ON public.pqrs
  FOR INSERT WITH CHECK (
    conjunto_id IN (SELECT conjunto_id FROM public.residents WHERE user_id = auth.uid())
    AND resident_id = public.current_resident_id(conjunto_id)
  );

-- PQRS: permitir UPDATE/SELECT para admins: política amplia por conjunto (refinar cuando exista tabla conjunto_admins)
-- Por ahora: cualquier usuario que sea resident puede actualizar si está asignado o es autor (cierre desde app)
CREATE POLICY pqrs_update_resident ON public.pqrs
  FOR UPDATE USING (
    conjunto_id IN (SELECT conjunto_id FROM public.residents WHERE user_id = auth.uid())
    AND (resident_id = public.current_resident_id(conjunto_id) OR assigned_to_id = public.current_resident_id(conjunto_id))
  );

-- Comentarios: ver si puede ver el PQRS
CREATE POLICY pqrs_comments_select ON public.pqrs_comments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.pqrs p
      WHERE p.id = pqrs_comments.pqrs_id
      AND p.conjunto_id IN (SELECT conjunto_id FROM public.residents WHERE user_id = auth.uid())
      AND (p.resident_id = public.current_resident_id(p.conjunto_id) OR p.assigned_to_id = public.current_resident_id(p.conjunto_id))
      AND (NOT pqrs_comments.is_internal OR p.assigned_to_id = public.current_resident_id(p.conjunto_id))
    )
  );

CREATE POLICY pqrs_comments_insert ON public.pqrs_comments
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.pqrs p
      WHERE p.id = pqrs_comments.pqrs_id
      AND p.conjunto_id IN (SELECT conjunto_id FROM public.residents WHERE user_id = auth.uid())
      AND (p.resident_id = public.current_resident_id(p.conjunto_id) OR p.assigned_to_id = public.current_resident_id(p.conjunto_id))
    )
  );

-- Historial: mismo criterio que ver el PQRS
CREATE POLICY pqrs_history_select ON public.pqrs_history
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.pqrs p
      WHERE p.id = pqrs_history.pqrs_id
      AND p.conjunto_id IN (SELECT conjunto_id FROM public.residents WHERE user_id = auth.uid())
      AND (p.resident_id = public.current_resident_id(p.conjunto_id) OR p.assigned_to_id = public.current_resident_id(p.conjunto_id))
    )
  );

-- ========== STORAGE (bucket vía SQL si está disponible) ==========
-- En Supabase Dashboard: crear bucket "pqrs-attachments" privado y políticas por conjunto_id/pqrs_id.
-- Opcional: INSERT INTO storage.buckets (id, name, public) VALUES ('pqrs-attachments', 'pqrs-attachments', false);
