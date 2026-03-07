# Historia de Usuario: Selector de plan (Cerca Pro / Cerca Enterprise) y formularios condicionales en la landing

**ID**: US-003  
**Prioridad**: Alta

## 1. Definición (Como/Quiero/Para)
**Como**: visitante de la landing page de Cerca que desea registrar su conjunto o su empresa administradora  
**Quiero**: elegir entre Cerca Pro (persona administradora de un conjunto) o Cerca Enterprise (empresa administradora de varios conjuntos) y ver un formulario acorde a mi elección  
**Para**: completar el registro con los datos correctos y ser redirigido al panel que me corresponde (cerca-admin o saas-admin)

## 2. Criterios de Aceptación (Gherkin)

- **Escenario 0**: Selector de plan con tarjetas según diseño de referencia
  - **Dado** que estoy en la sección de planes de la landing page de Cerca
  - **Entonces** veo dos tarjetas en horizontal: **Cerca Pro** y **Cerca Enterprise**
  - **Y** la tarjeta seleccionada se muestra con estilo destacado (ej. fondo azul oscuro en Pro), ícono de verificación en esquina y botón "✔ Plan seleccionado"
  - **Y** la tarjeta no seleccionada muestra botón "Seleccionar este plan"
  - **Y** la tarjeta Cerca Enterprise puede mostrar la etiqueta "MAS POPULAR"

- **Escenario 1**: Usuario elige Cerca Pro y ve el formulario de conjunto + administrador
  - **Dado** que estoy en la sección de registro de la landing page de Cerca
  - **Cuando** selecciono el plan **Cerca Pro** (tarjeta o botón "Seleccionar este plan" en esa tarjeta)
  - **Entonces** se muestra el formulario con:
    - Datos del conjunto: nombre del conjunto, NIT del conjunto, ciudad, dirección del conjunto
    - Datos del administrador: nombre completo, correo electrónico, teléfono celular
  - **Y** el payload preparado incluye `client_type: "SINGLE_CONJUNTO"` y `plan_id` correspondiente a Cerca Pro

- **Escenario 2**: Usuario elige Cerca Enterprise y ve el formulario solo de empresa + contacto
  - **Dado** que estoy en la sección de registro de la landing page de Cerca
  - **Cuando** selecciono el plan **Cerca Enterprise** (tarjeta o botón "Seleccionar este plan" en esa tarjeta)
  - **Entonces** se muestra el formulario con:
    - Datos de la empresa: nombre de la empresa, NIT de la empresa, ciudad, dirección de la empresa
    - Datos del contacto: nombre completo (administrador de la empresa), correo electrónico, teléfono celular
  - **Y** no se solicitan datos de "primer conjunto"
  - **Y** el payload preparado incluye `client_type: "ADMIN_COMPANY"` y `plan_id` correspondiente a Cerca Enterprise

- **Escenario 3**: Tras envío exitoso, redirección según plan
  - **Dado** que envié el formulario y el backend respondió con éxito
  - **Cuando** me registré como **Cerca Pro**
  - **Entonces** se muestra el mensaje "Revisa tu correo para crear tu contraseña e ingresar" y se redirige a la URL de login de **cerca-admin** (variable `CERCA_ADMIN_LOGIN_URL`)
  - **Cuando** me registré como **Cerca Enterprise**
  - **Entonces** se muestra el mismo mensaje y se redirige a la URL de login de **saas-admin (Suscripciones)** (variable `SAAS_ADMIN_LOGIN_URL`)

## 3. Tareas Técnicas (Arquitectura Cerca)

### Frontend Landing (UI)
- [ ] Implementar **selector de plan** con el diseño de tarjetas (mantener la selección como en el diseño de referencia):
  - Sección titulada tipo "Planes simples y transparentes", con subtítulo (ej. "Sin contratos de permanencia. Cancela cuando quieras. Comienza con X días gratis.").
  - **Dos tarjetas en horizontal:** Cerca Pro y Cerca Enterprise.
  - **Tarjeta Cerca Pro:** fondo azul oscuro cuando está seleccionada; círculo con ícono de verificación en esquina superior derecha; botón inferior "✔ Plan seleccionado" (fondo blanco, texto azul). Cuando no está seleccionada, estilo neutro con botón "Seleccionar este plan".
  - **Tarjeta Cerca Enterprise:** fondo claro con borde/sombra; etiqueta tipo pill "MAS POPULAR" en esquina superior derecha; precio y listado de características; botón "Seleccionar este plan" (verde) cuando no está seleccionada; al seleccionarla, mismo patrón visual que Pro (tarjeta destacada + "✔ Plan seleccionado").
  - La selección determina `client_type` (SINGLE_CONJUNTO / ADMIN_COMPANY) y el `plan_id` enviado en el payload.
- [ ] Implementar **formulario condicional**:
  - Si Cerca Pro: campos conjunto (nombre, NIT, ciudad, dirección) + administrador (nombre, correo, teléfono).
  - Si Cerca Enterprise: campos empresa (nombre, NIT, ciudad, dirección) + contacto (nombre, correo, teléfono). Sin campos de conjunto.
- [ ] Construir **payload** de envío con `plan_id`, `client_type` y campos según plan (mapeo según docs/flujo-registro-landing-conjunto.md secciones 5.1 y 5.2).
- [ ] Validación en cliente: campos requeridos, formato email, teléfono, aceptación términos/política. Usar Zod o validación equivalente si existe en el proyecto.
- [ ] Tras submit exitoso: mensaje "Revisa tu correo para crear tu contraseña e ingresar"; redirección a `CERCA_ADMIN_LOGIN_URL` (Pro) o `SAAS_ADMIN_LOGIN_URL` (Enterprise) desde variables de entorno.
- [ ] No exponer llaves de Supabase ni lógica sensible en el frontend; todo el registro vía backend de la landing (proxy a Edge Function/RPC).

### Backend / Base de datos (Supabase — Proyecto Suscripciones)
- [ ] En la tabla **`plans`**, agregar el campo **`es_plan_empresarial`** (boolean, por defecto `false`):
  - `true` para el plan Cerca Enterprise (empresa administradora de varios conjuntos).
  - `false` para el plan Cerca Pro (persona administradora de un conjunto).
- [ ] Asegurar que al crear o actualizar planes desde el panel admin (saas-admin o herramienta interna) se pueda marcar "es plan empresarial". La landing puede usar este campo para derivar `client_type` o validar que el `plan_id` enviado corresponde al tipo de registrante elegido.

### Backend Landing (API)
- [ ] Endpoint(s) que reciban el payload con `plan_id` y `client_type` y deleguen al flujo correspondiente (US-004 para Pro, US-005 para Enterprise).
- [ ] Validación server-side y anti-spam (rate limiting, reCAPTCHA si aplica).

## 4. Validación de Seguridad y Privacidad
- [ ] Las URLs de redirección (cerca-admin, saas-admin) deben leerse de variables de entorno, no estar hardcodeadas.
- [ ] No registrar en logs datos sensibles completos (contraseñas, tokens); solo códigos de respuesta y referencias necesarias para soporte.

## 5. Referencias
- Especificación: `docs/flujo-registro-landing-conjunto.md` (secciones 3, 4, 5, 12).
- Integración backend: US-004 (Cerca Pro), US-005 (Cerca Enterprise).
