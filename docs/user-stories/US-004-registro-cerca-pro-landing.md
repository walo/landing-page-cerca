# Historia de Usuario: Registro Cerca Pro desde la landing (persona administradora y un conjunto)

**ID**: US-004  
**Prioridad**: Alta

## 1. Definición (Como/Quiero/Para)
**Como**: persona administradora que gestiona un solo conjunto residencial (PH)  
**Quiero**: registrarme desde la landing con los datos de mi conjunto y mis datos como administrador, y recibir un correo para crear mi contraseña  
**Para**: acceder a **cerca-admin** y gestionar mi único conjunto tras confirmar mi cuenta

## 2. Criterios de Aceptación (Gherkin)

- **Escenario 1**: Registro exitoso Cerca Pro: creación de client, conjunto y suscripción trial
  - **Dado** que el backend de la landing recibe un payload válido con `client_type: "SINGLE_CONJUNTO"`, `plan_id` (Cerca Pro), datos del conjunto (nombre, NIT, ciudad, dirección) y datos del administrador (nombre, correo, teléfono)
  - **Cuando** se invoca la RPC o Edge Function de registro público para Cerca Pro (ej. `register_conjunto_from_landing_pro`)
  - **Entonces** se crea un registro en `clients` con `client_type = 'SINGLE_CONJUNTO'`, `name` = nombre del conjunto, `tax_id`, `billing_city`, `billing_address`, `contact_name`, `contact_email`, `contact_phone`
  - **Y** se crea un registro en `eco_conjuntos` con `nombre`, `direccion` (y `client_id` vinculado)
  - **Y** se crea una suscripción en `client_subscriptions` con `trial_end_date = now() + 15 days` y se vincula `eco_conjuntos.active_subscription_id`
  - **Y** se valida unicidad (email, NIT, nombre según aplique) y se devuelve error claro si ya existe

- **Escenario 2**: Creación de usuario Auth y envío de correo de confirmación / creación de contraseña
  - **Dado** que se crearon correctamente el client, el eco_conjunto y la client_subscription para Cerca Pro
  - **Cuando** el backend ejecuta el flujo de registro
  - **Entonces** se crea el usuario en Auth con `contact_email` y se envía el correo de confirmación y creación de contraseña
  - **Y** se inserta en la tabla de vinculación usuario-cliente (ej. `admin_users` o `client_users`) con `user_id`, `client_id` y rol equivalente a administrador del conjunto (para RLS en cerca-admin)
  - **Y** la respuesta al frontend indica éxito y el usuario ve "Revisa tu correo para crear tu contraseña e ingresar" y es redirigido al login de **cerca-admin**

- **Escenario 3**: Administrador confirma y accede solo a su conjunto en cerca-admin
  - **Dado** que el administrador creó su contraseña tras el enlace del correo
  - **Cuando** inicia sesión en cerca-admin
  - **Entonces** las políticas RLS permiten ver y gestionar únicamente el conjunto asociado a su `client_id` / `eco_conjunto`
  - **Y** no tiene acceso a datos de otros clientes ni conjuntos

## 3. Tareas Técnicas (Arquitectura Cerca)

### Backend (Supabase — Proyecto Suscripciones)
- [ ] Crear **RPC o Edge Function de registro público** (sin `is_super_admin`), ej. `register_conjunto_from_landing_pro`, que:
  - Reciba payload con datos del conjunto y del administrador, `plan_id` (Cerca Pro), `client_type: SINGLE_CONJUNTO`.
  - Cree `client` (SINGLE_CONJUNTO), `eco_conjunto`, `client_subscription` con trial 15 días y vincule `eco_conjuntos.active_subscription_id`.
  - Valide unicidad (email, NIT, nombre conjunto) y devuelva errores claros.
- [ ] **Auth:** signUp o flujo de invitación con `contact_email`; envío de email de confirmación y creación de contraseña hacia cerca-admin.
- [ ] **Vinculación usuario ↔ cliente:** insertar en `admin_users` o `client_users` (user_id, client_id, role: conjunto_admin o equivalente) para que RLS en cerca-admin restrinja por conjunto.
- [ ] **RLS:** políticas que aseguren que el usuario administrador del conjunto solo vea su `client_id` y su `eco_conjunto` (multi-tenancy).
- [ ] Subdominio del conjunto: opcional (NULL o generado desde el nombre).

### Backend Landing (API)
- [ ] Endpoint que reciba el payload del formulario Cerca Pro y llame a la RPC/Edge Function con clave anon o la autorización definida (nunca service_role en la landing).
- [ ] Mapear respuestas de éxito y error (duplicado, validación, etc.) a mensajes claros para el frontend.

### Frontend Landing
- [ ] Envío del payload según US-003 (formulario Cerca Pro). Manejo de respuesta y redirección a `CERCA_ADMIN_LOGIN_URL`.

## 4. Validación de Seguridad y Privacidad
- [ ] La RPC/Edge Function de registro debe ser invocable de forma controlada (anon o API key desde backend de la landing); no exponer service_role.
- [ ] RLS obligatorio: ningún usuario debe ver datos de otro tenant (otro client_id / otro conjunto).
- [ ] Registrar en audit log (o equivalente) la creación de client, conjunto, suscripción y usuario desde la landing.

## 5. Referencias
- Especificación: `docs/flujo-registro-landing-conjunto.md` (secciones 5.1, 6, 9, 11).
- UI y payload: US-003. Facturación por apartamento/unidad (documento sección 2).
