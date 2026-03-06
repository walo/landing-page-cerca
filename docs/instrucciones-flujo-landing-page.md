## Instrucciones flujo landing page

### 1. Objetivo del flujo

- **Objetivo**: permitir que una persona interesada en probar/adquirir Cerca registre su conjunto desde la **Landing page**, reciba un **correo de bienvenida** con enlace para crear contraseña en `cerca-admin` y pueda acceder como **ADMIN** de su conjunto.
- **Backend de datos**: proyecto Supabase Suscripciones (`fervyhznyunpyunevmzb`), tablas `auth.users`, `public.eco_conjuntos`, `public.eco_profiles`.
- **Regla clave**: la Landing **no** usa llaves `service_role` directamente. Toda lógica de negocio y acceso privilegiado va en Edge Functions / servicios del proyecto Suscripciones.

### 2. Campos del formulario de la Landing

El formulario de registro de la Landing debe capturar, como mínimo:

- **Datos del conjunto residencial**
  - `nombre_conjunto` (Nombre del conjunto)
  - `nit_conjunto` (NIT del conjunto)
  - `ciudad`
  - `direccion`
- **Datos del administrador**
  - `admin_full_name` (Nombre completo)
  - `admin_email` (Correo electrónico)
  - `admin_phone` (Teléfono celular)

> Estos campos se mapearán en el backend hacia `eco_conjuntos` (datos del conjunto) y `eco_profiles` / `auth.users` (datos del administrador).

### 3. Responsabilidades del proyecto Landing page

#### 3.1 Frontend (UI de la Landing)

- **Mostrar el formulario** con los campos anteriores (ya implementado en el diseño actual).
- **Validar en cliente** (mínimo):
  - Campos requeridos.
  - Email con formato válido.
  - Teléfono con longitud/formato razonable.
  - Aceptación de términos y política de privacidad.
- **Al enviar el formulario**:
  - Desactivar el botón de envío y mostrar estado de carga.
  - Enviar una petición `POST` a una **API interna del proyecto Landing**, por ejemplo: `/api/registro-conjunto` (o la ruta que se defina).
  - Incluir en el body JSON todos los campos validados.
  - No incluir ninguna lógica de Supabase ni llaves secretas en el frontend.
- **Al recibir respuesta**:
  - Si es **éxito**:
    - Mostrar un mensaje tipo: “Hemos recibido tu solicitud. Te enviamos un correo con instrucciones para crear tu contraseña y acceder a Cerca.”
  - Si es **error** (por ejemplo email ya registrado, NIT duplicado, fallo de backend):
    - Mostrar un mensaje amigable con la razón básica (sin detalles sensibles) y permitir reintento.

#### 3.2 Backend del proyecto Landing (API / servidor)

El backend de la Landing actúa como **fachada HTTP** hacia una Edge Function del proyecto Suscripciones. Sus responsabilidades son:

- Exponer un endpoint `POST /api/registro-conjunto` que:
  - Reciba el payload del formulario.
  - Valide nuevamente (server-side) los campos mínimos y aplique reglas anti-spam (reCAPTCHA, rate limiting, etc.).
  - Construya un objeto `payload` con los campos necesarios para el backend Suscripciones.
  - Llame a la **Edge Function `landing_signup`** del proyecto Suscripciones vía HTTP.
  - Mapee la respuesta de la Edge Function a códigos y mensajes apropiados para el frontend.

##### 3.2.1 Llamada a la Edge Function `landing_signup`

- **URL recomendada** (ajustar si cambia el nombre):
  - `POST https://fervyhznyunpyunevmzb.supabase.co/functions/v1/landing_signup`
- **Autenticación desde la Landing**:
  - Usar la **clave `anon` pública** del proyecto Suscripciones en el header `Authorization: Bearer <SUPABASE_ANON_KEY>`, almacenada en variables de entorno del backend de la Landing (nunca en el frontend).
  - La Edge Function `landing_signup` internamente utilizará `service_role` (no visible para la Landing) para crear conjunto, usuario y perfil.
- **Payload mínimo sugerido**:

```json
{
  "conjunto": {
    "nombre": "Conjunto Residencial El Prado",
    "nit": "900123456-1",
    "ciudad": "Bogotá",
    "direccion": "Calle 50 # 20-30, Barrio El Prado"
  },
  "admin": {
    "full_name": "Carlos Rodríguez Pérez",
    "email": "admin@conjunto.com",
    "phone": "3001234567"
  },
  "metadata": {
    "landing_source": "cerca-home-2026-landing",
    "utm_campaign": "..."
  }
}
```

- **Manejo de respuesta**:
  - En caso de éxito, la Edge Function debería devolver algo como:

```json
{
  "ok": true,
  "conjunto_id": "<uuid>",
  "user_id": "<uuid>",
  "message": "Correo de bienvenida enviado"
}
```

  - En caso de error, devolverá `ok: false` y un `code` / `message` que el backend de la Landing traducirá a un mensaje de usuario (sin exponer detalles internos).

### 4. Contrato esperado con la Edge Function `landing_signup` (lado Suscripciones)

> Esta sección sirve como **contrato** para el equipo que implemente la Edge Function en el proyecto Suscripciones. No se implementa en la Landing, pero la Landing debe asumir este comportamiento.

La Edge Function `landing_signup` debe encargarse de:

- **Crear/actualizar el conjunto** en `public.eco_conjuntos`:
  - Insertar con `nombre`, `nit`, `direccion`, `ciudad` (si se modela) y un `subdominio` único derivado del nombre.
  - Vincular con `clients` / suscripción de prueba si aplica.
- **Crear el usuario en `auth.users`** usando Supabase Auth Admin API:
  - Usar el `email` y opcionalmente guardar `full_name` y `phone` en `user_metadata`.
  - No establecer contraseña fija; usar flujo de invitación / recover link.
- **Crear el perfil en `public.eco_profiles`** del administrador del conjunto:
  - `id = auth.users.id`
  - `role = 'ADMIN'`
  - `conjunto_id = eco_conjuntos.id`
  - `full_name = admin.full_name`
- **Generar el enlace seguro para crear contraseña** (invite/recover) y **enviar el correo de bienvenida** al `admin_email`:
  - El correo debe incluir el `full_name` y el enlace de creación de contraseña hacia `cerca-admin`.
- **Devolver un resultado claro** a la Landing (éxito o error con código razonable).

### 5. Mensajes y estados en la Landing

- **Estado inicial**: formulario vacío, botón de “Solicitar demo” / “Registrar conjunto” habilitado.
- **En envío**: mostrar spinner o texto “Procesando tu solicitud…”, desactivar el botón.
- **En éxito**:
  - Mensaje visible: “Hemos recibido tu solicitud. Revisa tu correo para crear tu contraseña y acceder a Cerca.”
  - Opcional: sugerir revisar carpeta de spam.
- **En error recuperable** (email ya usado, NIT duplicado, etc.):
  - Mensaje tipo: “No hemos podido completar el registro con estos datos. Verifica que el correo y el NIT no estén ya registrados o inténtalo de nuevo en unos minutos.”
- **En error inesperado** (fallo infraestructura):
  - Mensaje genérico y registro en logs del backend (sin datos sensibles).

### 6. Consideraciones de seguridad para el proyecto Landing

- No exponer nunca claves `service_role` en el código del proyecto Landing (ni frontend ni backend).
- Mantener la clave `anon` del proyecto Suscripciones en variables de entorno del backend de la Landing.
- No loggear tokens de activación ni enlaces completos; solo IDs de auditoría o correos (cuando sea necesario y cumpliendo políticas de privacidad).
- Proteger el endpoint `/api/registro-conjunto` contra abuso (rate limiting, reCAPTCHA u otro mecanismo anti-bot).

### 7. Resumen ejecutivo

- El **frontend de la Landing** solo muestra el formulario, valida datos y llama a `/api/registro-conjunto`.
- El **backend de la Landing** valida y reenvía la solicitud a la Edge Function `landing_signup` del proyecto Suscripciones.
- La **Edge Function** crea `eco_conjuntos`, `auth.users`, `eco_profiles`, genera el enlace de contraseña y envía el correo de bienvenida.
- La Landing muestra un mensaje de confirmación y no necesita conocer detalles internos del ecosistema Suscripciones.

