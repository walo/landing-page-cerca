# Historia de Usuario: Registro Cerca Enterprise desde la landing (empresa administradora)

**ID**: US-005  
**Prioridad**: Alta

## 1. Definición (Como/Quiero/Para)
**Como**: empresa administradora que gestiona varios conjuntos residenciales (con opción de marca blanca)  
**Quiero**: registrarme desde la landing solo con los datos de mi empresa y mi contacto como administrador de la empresa  
**Para**: recibir un correo para crear mi contraseña e ingresar a **saas-admin (Suscripciones)** y allí crear mis conjuntos y administradores de conjunto

## 2. Criterios de Aceptación (Gherkin)

- **Escenario 1**: Registro exitoso Cerca Enterprise: creación de client (empresa) y suscripción trial, sin conjunto
  - **Dado** que el backend de la landing recibe un payload válido con `client_type: "ADMIN_COMPANY"`, `plan_id` (Cerca Enterprise), datos de la empresa (nombre, NIT, ciudad, dirección) y datos del contacto (nombre, correo, teléfono)
  - **Cuando** se invoca la RPC o Edge Function de registro público para Cerca Enterprise (ej. `register_empresa_from_landing_enterprise`)
  - **Entonces** se crea un registro en `clients` con `client_type = 'ADMIN_COMPANY'`, `name` = nombre de la empresa, `tax_id`, `billing_city`, `billing_address`, `contact_name`, `contact_email`, `contact_phone`
  - **Y** se crea una suscripción en `client_subscriptions` en estado **trial** (plan Cerca Enterprise)
  - **Y** no se crea ningún registro en `eco_conjuntos` en la landing; los conjuntos se crean después desde saas-admin
  - **Y** se valida unicidad (email, NIT empresa) y se devuelve error claro si ya existe

- **Escenario 2**: Correo de confirmación y redirección a saas-admin
  - **Dado** que se crearon correctamente el client (ADMIN_COMPANY) y la client_subscription en trial
  - **Cuando** el backend ejecuta el flujo de registro
  - **Entonces** se crea el usuario en Auth con `contact_email` y se envía el correo de confirmación y creación de contraseña
  - **Y** se inserta en la tabla de vinculación usuario-cliente (ej. `admin_users` o `client_users`) con `user_id`, `client_id` y rol `admin_company` (para RLS en saas-admin)
  - **Y** el frontend muestra "Revisa tu correo para crear tu contraseña e ingresar" y redirige a la URL de login de **saas-admin (Suscripciones)** (`SAAS_ADMIN_LOGIN_URL`)
  - **Y** tras crear contraseña y primer login en saas-admin, la empresa puede administrar perfil, crear conjuntos, crear administradores de conjunto, subdominio e imágenes (marca blanca)

- **Escenario 3**: Solo admin_company y super_admin acceden a saas-admin; administradores de conjunto no
  - **Dado** que existen clientes tipo ADMIN_COMPANY y administradores de conjunto creados por la empresa desde saas-admin
  - **Cuando** se aplican las políticas RLS en saas-admin
  - **Entonces** solo el **super_admin** (Cerca interno) y el **administrador de la empresa (admin_company)** pueden acceder a saas-admin
  - **Y** los administradores de conjunto no ingresan a saas-admin; solo acceden a **cerca-admin** con el conjunto asignado

## 3. Tareas Técnicas (Arquitectura Cerca)

### Backend (Supabase — Proyecto Suscripciones)
- [ ] Crear **RPC o Edge Function de registro público** (sin `is_super_admin`), ej. `register_empresa_from_landing_enterprise`, que:
  - Reciba payload con datos de la empresa y del contacto, `plan_id` (Cerca Enterprise), `client_type: ADMIN_COMPANY`.
  - Cree `client` (ADMIN_COMPANY) y `client_subscription` en estado trial. No crear `eco_conjunto`.
  - Valide unicidad (email, NIT empresa) y devuelva errores claros.
- [ ] **Auth:** signUp o flujo de invitación con `contact_email`; envío de email de confirmación y creación de contraseña hacia saas-admin.
- [ ] **Vinculación usuario ↔ cliente:** insertar en `admin_users` o `client_users` (user_id, client_id, role: admin_company) para RLS en saas-admin.
- [ ] **RLS:** políticas en saas-admin para que admin_company solo vea su `client_id`, sus conjuntos y suscripciones; super_admin vea todo. Los administradores de conjunto no tienen acceso a tablas/vistas de saas-admin (acceso solo a cerca-admin).
- [ ] (Opcional, para otra US) Regla de activación Enterprise: validar en backend 2 conjuntos con NIT/nombre diferentes y mínimo 500 unidades por conjunto para activar plan Enterprise (documento sección 8).

### Backend Landing (API)
- [ ] Endpoint que reciba el payload del formulario Cerca Enterprise y llame a la RPC/Edge Function con la autorización definida.
- [ ] Mapear respuestas de éxito y error a mensajes claros para el frontend.

### Frontend Landing
- [ ] Envío del payload según US-003 (formulario Cerca Enterprise). Manejo de respuesta y redirección a `SAAS_ADMIN_LOGIN_URL`.

## 4. Validación de Seguridad y Privacidad
- [ ] La RPC/Edge Function de registro debe ser invocable de forma controlada desde el backend de la landing; no exponer service_role.
- [ ] RLS obligatorio: admin_company solo ve su empresa y sus conjuntos; administradores de conjunto solo su conjunto en cerca-admin.
- [ ] Registrar en audit log la creación de client (ADMIN_COMPANY), suscripción trial y usuario desde la landing.

## 5. Referencias
- Especificación: `docs/flujo-registro-landing-conjunto.md` (secciones 5.2, 7, 8, 9, 11).
- UI y payload: US-003. Facturación por apartamento/unidad (documento sección 2). Administradores de conjunto se crean desde saas-admin (fuera del alcance de esta US).
