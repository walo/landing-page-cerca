# Especificación de esquema: PQRS, Comunicados Masivos y Recordatorios a morosos

Documento de diseño (fase *Definir*) para las acciones del [PLAN-ACCIONES-CUMPLIMIENTO-LANDING.md](./PLAN-ACCIONES-CUMPLIMIENTO-LANDING.md). Proyecto Supabase: **tmahegehoshaciodewzm**.

---

## 1. Contexto y convenciones

- **Aislamiento por conjunto:** Todas las tablas nuevas incluyen `conjunto_id` (FK a `conjuntos.id`) y las políticas RLS filtran por él.
- **Auth:** Se asume integración con `auth.users`; residentes vinculados vía `residents.user_id`. Los administradores del conjunto se identifican por rol o tabla de perfiles (ajustar según el proyecto).
- **Timestamps:** Uso de `timestamptz` y `now()` por defecto.

---

## 2. Fase A: PQRS en Línea

### 2.1 Modelo de datos

| Tabla | Propósito |
|-------|------------|
| `pqrs` | Cabecera de cada PQRS: tipo (P/Q/R/S), estado, prioridad, autor (resident), unidad opcional, fechas. |
| `pqrs_comments` | Comentarios y respuestas; trazabilidad. |
| `pqrs_history` | Historial de cambios de estado (auditoría). |

### 2.2 Tabla `pqrs`

| Columna | Tipo | Restricciones | Descripción |
|---------|------|---------------|-------------|
| `id` | uuid | PK, default gen_random_uuid() | |
| `conjunto_id` | uuid | FK → conjuntos(id), NOT NULL | |
| `resident_id` | uuid | FK → residents(id), NOT NULL | Autor (quien abre). |
| `unit_id` | uuid | FK → units(id), NULLABLE | Unidad relacionada (opcional). |
| `type` | text | CHECK IN ('Peticion','Queja','Reclamo','Sugerencia') | Tipo PQRS. |
| `subject` | text | NOT NULL | Asunto. |
| `description` | text | NOT NULL | Descripción detallada. |
| `status` | text | CHECK IN ('Abierto','En_revision','Respondido','Cerrado','Rechazado'), default 'Abierto' | |
| `priority` | text | CHECK IN ('Baja','Media','Alta'), default 'Media' | |
| `assigned_to_id` | uuid | FK → residents(id), NULLABLE | Responsable de seguimiento (admin/residente). |
| `due_at` | timestamptz | NULLABLE | Fecha límite de respuesta/cierre. |
| `closed_at` | timestamptz | NULLABLE | Cierre efectivo. |
| `created_at` | timestamptz | default now() | |
| `updated_at` | timestamptz | default now() | |

**Índices:** `(conjunto_id)`, `(conjunto_id, status)`, `(resident_id)`, `(assigned_to_id)`.

### 2.3 Tabla `pqrs_comments`

| Columna | Tipo | Restricciones | Descripción |
|---------|------|---------------|-------------|
| `id` | uuid | PK, default gen_random_uuid() | |
| `pqrs_id` | uuid | FK → pqrs(id) ON DELETE CASCADE | |
| `author_id` | uuid | FK → residents(id), NULLABLE | Quien escribe (NULL = sistema). |
| `body` | text | NOT NULL | Contenido. |
| `is_internal` | boolean | default false | Solo visible para administración. |
| `created_at` | timestamptz | default now() | |

**Índices:** `(pqrs_id)`.

### 2.4 Tabla `pqrs_history`

| Columna | Tipo | Restricciones | Descripción |
|---------|------|---------------|-------------|
| `id` | uuid | PK, default gen_random_uuid() | |
| `pqrs_id` | uuid | FK → pqrs(id) ON DELETE CASCADE | |
| `changed_by_id` | uuid | FK → residents(id), NULLABLE | |
| `old_status` | text | NULLABLE | |
| `new_status` | text | NOT NULL | |
| `notes` | text | NULLABLE | |
| `created_at` | timestamptz | default now() | |

**Índices:** `(pqrs_id)`.

### 2.5 Storage (adjuntos PQRS)

- **Bucket:** `pqrs-attachments` (privado).
- **Path sugerido:** `{conjunto_id}/{pqrs_id}/{filename}`.
- **Políticas:** Lectura/escritura según RLS: autor del PQRS o residente asignado o admin del conjunto pueden subir/leer; borrado solo admin o autor del PQRS.

### 2.6 Políticas RLS (PQRS)

| Tabla | Política | Condición |
|-------|----------|-----------|
| `pqrs` | SELECT residente | `conjunto_id` en conjuntos del usuario Y (autor = resident_id O asignado = resident_id O usuario es admin del conjunto). |
| `pqrs` | INSERT residente | `conjunto_id` pertenece al usuario y `resident_id` = su resident.id. |
| `pqrs` | UPDATE admin | Solo administradores del conjunto (verificar por rol/perfil). |
| `pqrs_comments` | SELECT | Quien puede ver el PQRS; si `is_internal = true` solo admin. |
| `pqrs_comments` | INSERT | Autor del PQRS o asignado o admin. |
| `pqrs_history` | SELECT | Mismo que pqrs. INSERT vía trigger o RPC (solo backend/admin). |

*Nota:* La verificación de “admin del conjunto” depende de cómo esté modelado en el proyecto (ej. tabla `conjunto_admins` o claim en JWT). En las migraciones se deja una política basada en `conjunto_id` y se recomienda refinar con la tabla de roles real.

---

## 3. Fase B: Comunicados Masivos

### 3.1 Modelo de datos

| Tabla | Propósito |
|-------|------------|
| `announcements` | Cabecera del comunicado: título, contenido, tipo, autor, conjunto, segmentación. |
| `announcement_deliveries` | Envío por destinatario/canal: estado (pendiente/enviado/fallido), canal (email/push), timestamp. |

Destinatarios se derivan de `residents` (y opcionalmente `units`/`zones`) según reglas de segmentación guardadas en `announcements.target_type` y JSON de filtros.

### 3.2 Tabla `announcements`

| Columna | Tipo | Restricciones | Descripción |
|---------|------|---------------|-------------|
| `id` | uuid | PK, default gen_random_uuid() | |
| `conjunto_id` | uuid | FK → conjuntos(id), NOT NULL | |
| `author_id` | uuid | FK → residents(id), NULLABLE | Quien publica (admin). |
| `title` | text | NOT NULL | |
| `body` | text | NOT NULL | Cuerpo del comunicado. |
| `type` | text | CHECK IN ('Comunicado','Circular','Alerta'), default 'Comunicado' | |
| `target_type` | text | CHECK IN ('all','by_zone','by_unit','explicit'), default 'all' | Cómo se calculan destinatarios. |
| `target_config` | jsonb | NULLABLE | Ej. `{"zone_ids":[]}` o `{"unit_ids":[]}` o `{"resident_ids":[]}`. |
| `scheduled_at` | timestamptz | NULLABLE | Para envío diferido. |
| `sent_at` | timestamptz | NULLABLE | Primera ejecución de envío. |
| `created_at` | timestamptz | default now() | |
| `updated_at` | timestamptz | default now() | |

**Índices:** `(conjunto_id)`, `(conjunto_id, created_at DESC)`.

### 3.3 Tabla `announcement_deliveries`

| Columna | Tipo | Restricciones | Descripción |
|---------|------|---------------|-------------|
| `id` | uuid | PK, default gen_random_uuid() | |
| `announcement_id` | uuid | FK → announcements(id) ON DELETE CASCADE | |
| `resident_id` | uuid | FK → residents(id) | Destinatario. |
| `channel` | text | CHECK IN ('email','push') | |
| `status` | text | CHECK IN ('pending','sent','failed'), default 'pending' | |
| `sent_at` | timestamptz | NULLABLE | |
| `error_message` | text | NULLABLE | Si status = 'failed'. |
| `created_at` | timestamptz | default now() | |

**Índices:** `(announcement_id)`, `(resident_id, channel)`, `(status)` donde status = 'pending' (para cola).

### 3.4 Integración envío

- **Email:** Resend, SendGrid o Mailgun vía Edge Function. Obtener email del residente desde `auth.users` o perfil vinculado a `residents.user_id`.
- **Push:** OneSignal, FCM o similar; token por usuario en tabla de perfiles o `user_metadata`.
- **Flujo:** Edge Function `send-announcement` (o cron que procese `announcement_deliveries` con status = 'pending'), llama al proveedor y actualiza `status` y `sent_at`/`error_message`.

### 3.5 Políticas RLS (Comunicados)

| Tabla | Política | Condición |
|-------|----------|-----------|
| `announcements` | SELECT residente | `conjunto_id` del residente Y existe una fila en `announcement_deliveries` con su `resident_id` (recibió el comunicado). |
| `announcements` | INSERT/UPDATE/DELETE | Solo admin del conjunto. |
| `announcement_deliveries` | SELECT | Mismo que announcements para residente (solo sus filas); admin ve todas del conjunto. |
| `announcement_deliveries` | INSERT/UPDATE | Solo Edge Function o admin (en la práctica, inserción vía RPC/EF al “disparar” envío). |

---

## 4. Fase C: Recordatorios a morosos

### 4.1 Enfoque

- **Opción A:** Edge Function programada (cron) que consulta `bills` con `status = 'Overdue'`, obtiene unidad/residente, envía email/push y opcionalmente registra en tabla para no repetir.
- **Opción B:** Solo Edge Function sin tabla; idempotencia por ventana de tiempo (ej. “un recordatorio por factura por semana”).

Se recomienda **tabla `overdue_reminders`** para trazabilidad y control de “máximo N recordatorios por factura”.

### 4.2 Tabla `overdue_reminders`

| Columna | Tipo | Restricciones | Descripción |
|---------|------|---------------|-------------|
| `id` | uuid | PK, default gen_random_uuid() | |
| `conjunto_id` | uuid | FK → conjuntos(id) | |
| `bill_id` | uuid | FK → bills(id) ON DELETE CASCADE | |
| `channel` | text | CHECK IN ('email','push') | |
| `sent_at` | timestamptz | default now() | |
| `created_at` | timestamptz | default now() | |

**Índices:** `(bill_id, channel)`, `(conjunto_id)`.

**Regla de negocio:** Antes de enviar, contar cuántos `overdue_reminders` existen para ese `bill_id`; si ya se llegó al máximo (ej. 3), no enviar.

### 4.3 Canal y contenido

- Reutilizar integración de Comunicados (Fase B) para envío (email/push).
- Contenido: plantilla con datos de la factura (unidad, período, monto, vencimiento).

### 4.4 Políticas RLS

- `overdue_reminders`: SELECT/INSERT solo vía servicio (Edge Function con service_role o RPC con verificación). RLS puede restringir SELECT por `conjunto_id` para admins.

---

## 5. Resumen de entregables de diseño

| Fase | Tablas | Storage | RLS |
|------|--------|---------|-----|
| A. PQRS | `pqrs`, `pqrs_comments`, `pqrs_history` | bucket `pqrs-attachments` | Por conjunto + autor/asignado/admin |
| B. Comunicados | `announcements`, `announcement_deliveries` | — | Admin crea; residente lee los suyos |
| C. Recordatorios | `overdue_reminders` | — | Uso vía EF/RPC |

---

*Especificación para proyecto **tmahegehoshaciodewzm**. Aplicar migraciones en ese proyecto (no en el de suscripciones fervyhznyunpyunevmzb).*
