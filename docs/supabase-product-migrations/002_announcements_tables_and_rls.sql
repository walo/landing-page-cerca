-- Migración 002: Comunicados Masivos (Fase B)
-- Proyecto: tmahegehoshaciodewzm (producto Cerca)
-- Referencia: docs/PLAN-ACCIONES-CUMPLIMIENTO-LANDING.md, docs/ESQUEMA-PQRS-COMUNICADOS-RECORDATORIOS.md

-- ========== TABLAS ==========

CREATE TABLE IF NOT EXISTS public.announcements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conjunto_id uuid NOT NULL REFERENCES public.conjuntos(id) ON DELETE CASCADE,
  author_id uuid REFERENCES public.residents(id) ON DELETE SET NULL,
  title text NOT NULL,
  body text NOT NULL,
  type text NOT NULL DEFAULT 'Comunicado' CHECK (type IN ('Comunicado', 'Circular', 'Alerta')),
  target_type text NOT NULL DEFAULT 'all' CHECK (target_type IN ('all', 'by_zone', 'by_unit', 'explicit')),
  target_config jsonb,
  scheduled_at timestamptz,
  sent_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_announcements_conjunto_id ON public.announcements(conjunto_id);
CREATE INDEX idx_announcements_conjunto_created ON public.announcements(conjunto_id, created_at DESC);

COMMENT ON TABLE public.announcements IS 'Comunicados, circulares y alertas por conjunto (landing compliance).';
COMMENT ON COLUMN public.announcements.target_config IS 'Ej: {"zone_ids":[]} | {"unit_ids":[]} | {"resident_ids":[]} para segmentación.';

--

CREATE TABLE IF NOT EXISTS public.announcement_deliveries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  announcement_id uuid NOT NULL REFERENCES public.announcements(id) ON DELETE CASCADE,
  resident_id uuid NOT NULL REFERENCES public.residents(id) ON DELETE CASCADE,
  channel text NOT NULL CHECK (channel IN ('email', 'push')),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed')),
  sent_at timestamptz,
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_announcement_deliveries_announcement ON public.announcement_deliveries(announcement_id);
CREATE INDEX idx_announcement_deliveries_resident_channel ON public.announcement_deliveries(resident_id, channel);
CREATE INDEX idx_announcement_deliveries_pending ON public.announcement_deliveries(status) WHERE status = 'pending';

COMMENT ON TABLE public.announcement_deliveries IS 'Envíos por destinatario y canal para trazabilidad.';

-- Trigger updated_at
CREATE OR REPLACE FUNCTION public.set_announcements_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_announcements_updated_at ON public.announcements;
CREATE TRIGGER trg_announcements_updated_at
  BEFORE UPDATE ON public.announcements
  FOR EACH ROW EXECUTE FUNCTION public.set_announcements_updated_at();

-- ========== RLS ==========

ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.announcement_deliveries ENABLE ROW LEVEL SECURITY;

-- Announcements: residente ve solo los que tiene en sus deliveries (fue destinatario)
CREATE POLICY announcements_select_resident ON public.announcements
  FOR SELECT USING (
    conjunto_id IN (SELECT conjunto_id FROM public.residents WHERE user_id = auth.uid())
    AND EXISTS (
      SELECT 1 FROM public.announcement_deliveries ad
      WHERE ad.announcement_id = announcements.id
      AND ad.resident_id = public.current_resident_id(announcements.conjunto_id)
    )
  );

-- Announcements: INSERT/UPDATE/DELETE solo para "admin". Sin tabla conjunto_admins: permitir a cualquier resident del conjunto por ahora (refinar con rol).
-- Para producción: restringir a rol admin (ej. tabla conjunto_admins o claim).
CREATE POLICY announcements_insert_resident ON public.announcements
  FOR INSERT WITH CHECK (
    conjunto_id IN (SELECT conjunto_id FROM public.residents WHERE user_id = auth.uid())
  );

CREATE POLICY announcements_update_resident ON public.announcements
  FOR UPDATE USING (
    conjunto_id IN (SELECT conjunto_id FROM public.residents WHERE user_id = auth.uid())
  );

CREATE POLICY announcements_delete_resident ON public.announcements
  FOR DELETE USING (
    conjunto_id IN (SELECT conjunto_id FROM public.residents WHERE user_id = auth.uid())
  );

-- Deliveries: residente ve solo los suyos
CREATE POLICY announcement_deliveries_select_resident ON public.announcement_deliveries
  FOR SELECT USING (
    resident_id = public.current_resident_id(
      (SELECT conjunto_id FROM public.announcements WHERE id = announcement_deliveries.announcement_id)
    )
  );

-- Deliveries: INSERT/UPDATE típicamente vía Edge Function (service_role). Política para que quien crea el announcement pueda insertar deliveries.
CREATE POLICY announcement_deliveries_insert ON public.announcement_deliveries
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.announcements a
      WHERE a.id = announcement_deliveries.announcement_id
      AND a.conjunto_id IN (SELECT conjunto_id FROM public.residents WHERE user_id = auth.uid())
    )
  );

CREATE POLICY announcement_deliveries_update ON public.announcement_deliveries
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.announcements a
      WHERE a.id = announcement_deliveries.announcement_id
      AND a.conjunto_id IN (SELECT conjunto_id FROM public.residents WHERE user_id = auth.uid())
    )
  );
