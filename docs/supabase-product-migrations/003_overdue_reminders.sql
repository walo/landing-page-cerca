-- Migración 003: Recordatorios a morosos (Fase C - opcional)
-- Proyecto: tmahegehoshaciodewzm (producto Cerca)
-- Referencia: docs/PLAN-ACCIONES-CUMPLIMIENTO-LANDING.md, docs/ESQUEMA-PQRS-COMUNICADOS-RECORDATORIOS.md

-- ========== TABLA ==========

CREATE TABLE IF NOT EXISTS public.overdue_reminders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conjunto_id uuid NOT NULL REFERENCES public.conjuntos(id) ON DELETE CASCADE,
  bill_id uuid NOT NULL REFERENCES public.bills(id) ON DELETE CASCADE,
  channel text NOT NULL CHECK (channel IN ('email', 'push')),
  sent_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_overdue_reminders_bill_channel ON public.overdue_reminders(bill_id, channel);
CREATE INDEX idx_overdue_reminders_conjunto ON public.overdue_reminders(conjunto_id);

COMMENT ON TABLE public.overdue_reminders IS 'Trazabilidad de recordatorios enviados por facturas en mora. Edge Function consulta bills con status=Overdue y registra aquí.';

-- ========== RLS ==========

ALTER TABLE public.overdue_reminders ENABLE ROW LEVEL SECURITY;

-- Inserción/lectura típicamente vía Edge Function con service_role. Política para que admin del conjunto vea historial.
CREATE POLICY overdue_reminders_select ON public.overdue_reminders
  FOR SELECT USING (
    conjunto_id IN (SELECT conjunto_id FROM public.residents WHERE user_id = auth.uid())
  );

-- INSERT/UPDATE: solo vía backend (RPC o Edge Function). Sin política INSERT para anon/authenticated se evita que el cliente inserte; la EF usa service_role.
-- Si se necesita que un rol "billing_admin" inserte desde el cliente, añadir política con esa condición.
