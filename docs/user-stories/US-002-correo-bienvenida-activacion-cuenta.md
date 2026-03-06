# Historia de Usuario: Correo de bienvenida desde la Landing con activación de cuenta

**ID**: US-002  
**Prioridad**: Alta

## 1. Definición (Como/Quiero/Para)
**Como**: persona interesada en probar/adquirir Cerca que registra su conjunto desde la Landing page  
**Quiero**: recibir un correo de bienvenida personalizado con mi nombre y un enlace para crear mi contraseña en `cerca-admin`  
**Para**: activar mi cuenta como ADMIN de mi conjunto y acceder por primera vez al panel administrativo

## 2. Criterios de Aceptación (Gherkin)
- **Escenario 1**: Registro exitoso desde la Landing y orquestación backend
  - **Dado** que estoy en la Landing page de Cerca y veo el formulario de registro de conjunto con los campos:
    - datos del conjunto (`nombre_conjunto`, `nit_conjunto`, `ciudad`, `direccion`)
    - datos del administrador (`admin_full_name`, `admin_email`, `admin_phone`)
  - **Y** que he completado todos los campos requeridos y aceptado los términos y política de privacidad
  - **Cuando** envío el formulario y el backend de la Landing recibe la petición `POST /api/registro-conjunto` con el payload válido
  - **Entonces** el backend de la Landing llama a la Edge Function `landing_signup` del proyecto Suscripciones (`fervyhznyunpyunevmzb`) usando la clave `anon` en el header de autorización
  - **Y** la Edge Function crea (o asocia) el conjunto en `public.eco_conjuntos`, el usuario en `auth.users` y el perfil en `public.eco_profiles` con `role = 'ADMIN'` y `full_name = admin_full_name`

- **Escenario 2**: Envío del correo de bienvenida con enlace de creación de contraseña
  - **Dado** que la Edge Function `landing_signup` creó correctamente el conjunto, el usuario y el perfil del administrador
  - **Y** que el usuario aún no tiene confirmada su cuenta (`auth.users.confirmed_at` es `NULL`
  - **Cuando** la Edge Function genera un enlace seguro de invitación o recuperación de contraseña hacia `cerca-admin`
  - **Entonces** se envía un correo de bienvenida al `admin_email` con:
    - el nombre completo del administrador tomado de `public.eco_profiles.full_name`
    - un enlace único para crear la contraseña inicial
  - **Y** el backend de la Landing recibe de `landing_signup` una respuesta de éxito con `ok: true` y un mensaje tipo “Correo de bienvenida enviado”
  - **Y** el frontend de la Landing muestra el mensaje: “Hemos recibido tu solicitud. Revisa tu correo para crear tu contraseña y acceder a Cerca.”

- **Escenario 3**: Creación de contraseña y activación de cuenta en `cerca-admin`
  - **Dado** que el administrador recibió el correo de bienvenida con el enlace de creación de contraseña vigente (no expirado, no usado)
  - **Cuando** abre el enlace, define una contraseña válida y confirma el formulario en `cerca-admin`
  - **Entonces** Supabase actualiza la contraseña del usuario en `auth.users` y marca la cuenta como confirmada (`confirmed_at` y/o `email_confirmed_at` dejan de ser `NULL`)
  - **Y** el administrador puede iniciar sesión en `cerca-admin` como ADMIN del conjunto asociado

## 3. Tareas Técnicas (Arquitectura Cerca)

### Backend (Supabase/Edge Functions — Proyecto Suscripciones)
- [ ] [Supabase] Confirmar uso de `auth.users` como fuente de verdad para email y estado de confirmación (`confirmed_at`, `email_confirmed_at`).  
- [ ] [Supabase] Confirmar uso de `public.eco_profiles` como tabla de perfil de usuario, utilizando `eco_profiles.full_name` y `role = 'ADMIN'` para el administrador del conjunto.  
- [ ] [Supabase] Confirmar y/o ajustar el modelo de `public.eco_conjuntos` para almacenar `nombre`, `nit`, `direccion`, `ciudad` y `subdominio` del conjunto, vinculando con clientes/suscripciones si aplica.  
- [ ] [Edge Function] Implementar la Edge Function `landing_signup` que:
  - Reciba el payload con secciones `conjunto`, `admin` y `metadata` desde el backend de la Landing.  
  - Cree/actualice el registro en `public.eco_conjuntos`.  
  - Cree el usuario en `auth.users` mediante Auth Admin API sin contraseña fija, usando flujo de invitación / recover link.  
  - Cree el perfil en `public.eco_profiles` con `id = auth.users.id`, `role = 'ADMIN'`, `conjunto_id = eco_conjuntos.id`, `full_name = admin.full_name`.  
  - Genere el enlace seguro para crear la contraseña y envíe el correo de bienvenida al `admin_email`.  
  - Devuelva al menos `{ ok: boolean, message: string, conjunto_id?: uuid, user_id?: uuid }`.  
- [ ] [Multi-tenant] Asegurar que toda la lógica respete el modelo multi-tenant (relaciones entre `eco_conjuntos`, `clients`, suscripciones y `eco_profiles`).  
- [ ] [RLS] Revisar y/o ajustar políticas de RLS para que:
  - Solo Edge Functions con `service_role` puedan crear conjuntos, usuarios y perfiles desde la Landing.  
  - Los administradores solo puedan ver/gestionar datos de su propio conjunto.  

### Backend Landing (API / servidor Landing page)
- [ ] Definir el endpoint `POST /api/registro-conjunto` que reciba el payload del formulario de la Landing.  
- [ ] Implementar validación server-side de los campos mínimos (`nombre_conjunto`, `nit_conjunto`, `ciudad`, `direccion`, `admin_full_name`, `admin_email`, `admin_phone`) y aplicar medidas anti-spam (reCAPTCHA, rate limiting).  
- [ ] Construir el payload esperado por `landing_signup` con las secciones `conjunto`, `admin`, `metadata.landing_source` y, opcionalmente, parámetros de campaña (`utm_*`).  
- [ ] Invocar la Edge Function `landing_signup` via HTTP (`/functions/v1/landing_signup`) usando la clave `anon` del proyecto Suscripciones en el header `Authorization: Bearer <SUPABASE_ANON_KEY>` leída desde variables de entorno.  
- [ ] Mapear la respuesta de `landing_signup` a códigos y mensajes claros para el frontend (éxito, error recuperable, error inesperado).  

### Frontend Landing (UI)
- [ ] Mostrar el formulario de registro con todos los campos definidos en las instrucciones de flujo de la Landing.  
- [ ] Validar en cliente campos requeridos, formato de email, formato de teléfono y aceptación de términos/política de privacidad.  
- [ ] Al enviar, desactivar el botón, mostrar estado de carga y hacer `POST` a `/api/registro-conjunto` con el body JSON correspondiente.  
- [ ] Gestionar respuestas de éxito y error mostrando los mensajes definidos (“Hemos recibido tu solicitud...”, mensajes de error amigables).  
- [ ] No incluir ninguna lógica de Supabase ni llaves secretas en el código frontend.  

### Frontend (Angular Admin — Opcional para mejoras futuras)
- [ ] [UI Admin] (Opcional) Agregar en el panel administrativo una acción para reenviar el correo de bienvenida/activación a usuarios cuyo estado de cuenta siga pendiente (derivado de `auth.users.confirmed_at IS NULL`).  
- [ ] [UX] Mostrar en las vistas de detalle/listado de usuarios un indicador claro de estado de activación (pendiente/activo) basado en los campos de Supabase.  
- [ ] [Signals] Gestionar el estado de carga y resultado al reenviar el correo de bienvenida, utilizando Signals y patrones de diseño atómico (botones, mensajes de estado, etc.).  

## 4. Validación de Seguridad y Privacidad
- [ ] [Llaves] Asegurar que el proyecto Landing nunca use ni exponga claves `service_role`; solo la clave `anon` del proyecto Suscripciones, almacenada en variables de entorno del backend.  
- [ ] [Tokens] Garantizar que los tokens de activación y enlaces completos no se registren en logs ni se muestren en la UI; solo IDs de auditoría o correos cuando sea estrictamente necesario.  
- [ ] [RLS y permisos] Verificar que las políticas de RLS en Supabase y los permisos por rol impidan accesos cruzados entre tenants o conjuntos.  
- [ ] [Audit log] Registrar eventos críticos (creación de conjunto, creación de usuario ADMIN, envío de correo de bienvenida, activación de cuenta) en mecanismos de auditoría existentes (`auth.audit_log_entries` u otra tabla dedicada), respetando RLS y multi-tenancy.  
- [ ] [Protección endpoint] Proteger el endpoint `/api/registro-conjunto` contra abuso mediante rate limiting, reCAPTCHA u otro mecanismo anti-bot en el backend de la Landing.  
