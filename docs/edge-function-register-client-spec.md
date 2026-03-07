# Especificación: Edge Function register-client

Especificación para la Edge Function `register-client` del proyecto Supabase Suscripciones.  
El flujo se basa en **`is_enterprise`** del plan.

**Estado:** Implementado (versión desplegada). Código fuente en `supabase/functions/register-client/index.ts`.

---

## Campo is_enterprise en plans

- `plans.is_enterprise = false` → **Cerca Pro** (persona, un conjunto)
- `plans.is_enterprise = true` → **Cerca Enterprise** (empresa, varios conjuntos)

La landing envía `is_enterprise` en el payload (derivado del plan).  
La Edge Function puede usar ese valor o consultar el plan por `plan_id`.

---

## Flujo cuando `is_enterprise = false` (Cerca Pro)

1. Crear **client** (client_type: SINGLE_CONJUNTO)
2. Crear **eco_conjuntos** (nombre, direccion, client_id, etc.)
3. Crear **client_subscription** (trial 15 días) y vincular `eco_conjuntos.active_subscription_id`
4. Crear usuario en **auth.users** con `contact_email`
5. Enviar **email** con enlace para crear contraseña (activar cuenta)
6. Insertar en tabla de vinculación usuario–cliente (admin_users / client_users)

---

## Flujo cuando `is_enterprise = true` (Cerca Enterprise)

1. Crear **client** (client_type: ADMIN_COMPANY)
2. **NO** crear eco_conjuntos (los conjuntos se crean desde saas-admin)
3. Crear **client_subscription** en estado trial
4. Crear usuario en **auth.users** con `contact_email`
5. Enviar **email** con enlace para crear contraseña (activar cuenta)
6. Insertar en tabla de vinculación usuario–cliente (admin_users / client_users) con rol admin_company

---

## Problemas detectados a corregir

| Plan        | Problema                                          | Acción requerida                                                              |
|-------------|----------------------------------------------------|-------------------------------------------------------------------------------|
| Cerca Pro   | No se crea registro en `eco_conjuntos`             | Implementar creación de `eco_conjuntos` cuando `is_enterprise = false`        |
| Cerca Enterprise | No se crea usuario en auth, no se envía correo | Implementar creación en auth y envío de email cuando `is_enterprise = true`   |

---

## Payload recibido desde la landing

```json
{
  "client_type": "SINGLE_CONJUNTO" | "ADMIN_COMPANY",
  "is_enterprise": true | false,
  "name": "...",
  "contact_name": "...",
  "contact_email": "...",
  "contact_phone": "...",
  "tax_id": "...",
  "billing_address": "...",
  "billing_city": "...",
  "plan_id": "uuid"
}
```

## Variables de entorno (Supabase Edge Function)

| Variable | Descripción |
|----------|-------------|
| `CERCA_ADMIN_SET_PASSWORD_URL` | URL base (ej. `https://admin.cerca.com`) o URL completa a `/auth/set-password` (Cerca Pro). Si es base, se añade `/auth/set-password` automáticamente. |
| `SAAS_ADMIN_SET_PASSWORD_URL` | Igual para Cerca Enterprise. |

**Importante:** **Las dos URLs** (Pro y Enterprise) deben estar en **Redirect URLs** del proyecto Supabase:  
**Authentication** → **URL Configuration** → **Redirect URLs**.  
Si la URL de Pro (`CERCA_ADMIN_SET_PASSWORD_URL`) no está en la lista, el correo de invitación **no se envía** para registros Cerca Pro (Enterprise puede seguir funcionando si su URL sí está). Añade la URL exacta, ej. `https://tu-cerca-admin.com/auth/set-password`.

**Nota sobre Secrets:** Que los Secrets se guarden cifrados en Supabase es normal; la Edge Function los lee correctamente en ejecución.

---

## Los correos de invitación no llegan

Por defecto Supabase **solo envía emails a direcciones preautorizadas** (miembros del equipo del proyecto). Los correos a usuarios registrados (ej. `walter.utria@hotmail.com`) **no se envían** si no hay SMTP personalizado.

**Solución: configurar Custom SMTP**

1. Ir a **Supabase Dashboard** → tu proyecto → **Authentication** → **SMTP Settings**
2. Activar **Custom SMTP** y configurar:
   - **Host** (ej. `smtp.resend.com`, `smtp.sendgrid.net`)
   - **Port** (587, 465, 25 según proveedor)
   - **Username** y **Password** del proveedor
   - **Sender email** (ej. `no-reply@tudominio.com`)
   - **Sender name** (ej. `Cerca`)

**Proveedores recomendados:** Resend, Brevo, SendGrid, Postmark, AWS SES, ZeptoMail.

**Verificación:** Tras configurar, hacer un nuevo registro; el correo debería llegar (revisar también spam).

---

## Correo personalizado (Send Email Hook + Resend)

Para enviar correos con diseño propio de Cerca Citofonía en lugar del correo por defecto de Supabase:

1. **Crear la Edge Function `send-email`** (código en `supabase/functions/send-email/index.ts`).
2. **Configurar secrets** en Supabase:
   - `RESEND_API_KEY` — API key de Resend
   - `SEND_EMAIL_HOOK_SECRET` — Se genera en Auth Hooks (ver paso 4)
   - `SENDER_EMAIL` — Ej: `Cerca <no-reply@tudominio.com>` (dominio verificado en Resend)
   - `CERCA_LOGO_URL` (opcional) — URL pública del logo de Cerca Citofonía
3. **Desplegar la función**: `supabase functions deploy send-email --no-verify-jwt`
4. **Configurar el hook** en Supabase Dashboard → **Authentication** → **Hooks** → **Send Email**:
   - Crear hook → Tipo: HTTPS
   - URL: `https://fervyhznyunpyunevmzb.supabase.co/functions/v1/send-email`
   - Generar secret y copiarlo a `SEND_EMAIL_HOOK_SECRET`
   - Guardar

Cuando el hook está activo, Supabase deja de usar SMTP para auth y envía todos los correos (invite, recovery, etc.) a través de **send-email**, que usa Resend con la plantilla personalizada. La Edge Function **register-client** usa este flujo: al llamar `inviteUserByEmail`, Auth invoca el hook send-email; el `data.contact_name` enviado en la invitación se usa en el saludo del correo ("Hola, {contact_name}").
