# Migraciones y Edge Functions — Proyecto producto (tmahegehoshaciodewzm)

Estos archivos se aplican al proyecto Supabase **tmahegehoshaciodewzm** (producto Cerca), **no** al proyecto de suscripciones (fervyhznyunpyunevmzb).

## Orden de aplicación

1. **001_pqrs_tables_and_rls.sql** — Tablas PQRS, comentarios, historial y RLS. Requiere tablas existentes: `conjuntos`, `residents`, `units`.
2. **002_announcements_tables_and_rls.sql** — Tablas comunicados y envíos, RLS. Requiere función `current_resident_id` (creada en 001).
3. **003_overdue_reminders.sql** — Tabla de trazabilidad de recordatorios a morosos. Requiere `bills`.

## Cómo aplicar

- **Supabase Dashboard:** SQL Editor → pegar contenido de cada archivo en orden y ejecutar.
- **CLI:** `supabase db push` o `supabase migration up` si enlazas este directorio al proyecto tmahegehoshaciodewzm.

## Storage

Crear manualmente el bucket **pqrs-attachments** (privado) en Storage y definir políticas por `conjunto_id`/`pqrs_id` según docs/ESQUEMA-PQRS-COMUNICADOS-RECORDATORIOS.md.

## Edge Functions

Carpeta **edge-functions/** contiene stubs para desplegar en el proyecto producto:

- **send-announcement:** genera `announcement_deliveries` y simula envío (integrar Resend/SendGrid y push).
- **send-overdue-reminders:** lista facturas Overdue, verifica máximo de recordatorios y registra en `overdue_reminders`.

Desplegar con `supabase functions deploy send-announcement` (y `send-overdue-reminders`) desde el proyecto enlazado. Configurar cron (Dashboard o pg_cron) para invocar `send-overdue-reminders` de forma periódica.
