# Análisis del landing page Cerca

Documento de validación del estado actual de la aplicación landing para el sistema de administración/citofonía Cerca. Incluye conexión a Supabase, relación con MCP, cumplimiento de las skills UI-UX Cerca y Angular Admin Architect, y SEO.

---

## 1. Resumen ejecutivo

| Área | Estado | Observación principal |
|------|--------|------------------------|
| Supabase (app) | ✅ Correcto | Cliente JS + Edge Function alineados con proyecto `fervyhznyunpyunevmzb` |
| MCP Supabase | ✅ Alineado | Mismo proyecto; MCP no forma parte del runtime del landing |
| UI/UX (skill) | ✅ Alto | Falta eliminar estilos inline y revisar contraste en labels |
| Angular/Arquitectura (skill) | ⚠️ Parcial | Falta OnPush y Zod para DTO/respuestas |
| SEO | ✅ Básico cubierto | Recomendable añadir `og:image` y `lang="es"` |

---

## 2. Conexión a Supabase en la aplicación

### 2.1 Cliente Supabase

- **Archivo**: `src/app/core/services/registration.service.ts`
- **Configuración**: `createClient(environment.supabaseUrl, environment.supabaseAnonKey)` con `@supabase/supabase-js`.
- **Uso**:
  - **Planes**: `getActivePlans()` lee tabla `plans` con relación `plan_features`; solo se ejecuta en browser (`isPlatformBrowser`) para no romper SSR.
  - **Validaciones**: `checkNitExists()` y `checkNameExists()` consultan `tenants` con `count: 'exact', head: true`.

### 2.2 Edge Function de registro

- **Método**: `registerClient(dto)` usa `HttpClient` (no el cliente Supabase).
- **Endpoint**: `environment.registerEndpoint` → `https://fervyhznyunpyunevmzb.supabase.co/functions/v1/register-client`.
- **DTO**: Definido en `src/app/core/models/registration.model.ts` (`RegistrationDto`, `RegistrationResult`).

### 2.3 Entorno

- **Archivo**: `src/environments/environment.ts`
- **Valores**: `supabaseUrl` y `registerEndpoint` apuntan al mismo proyecto Supabase; coherentes con el dominio de suscripciones.

**Conclusión**: Integración correcta: lectura y validaciones vía cliente Supabase; registro vía Edge Function pública.

---

## 3. Conexión al servidor MCP de Supabase

- **Servidor MCP**: `user-supabase-mcp-server` (herramientas de gestión: SQL, migrations, Edge Functions, etc.).
- **Proyecto**: El skill de Supabase indica conexión al proyecto `fervyhznyunpyunevmzb`; la app usa la misma URL en `environment.supabaseUrl`.
- **Uso en runtime**: El landing **no** invoca MCP; se conecta a Supabase con `@supabase/supabase-js` y HTTP. El MCP es para uso del agente (consultas, despliegues, tipos), no del front.

**Conclusión**: Configuración MCP y app apuntan al mismo proyecto; la app no depende de MCP, lo cual es correcto.

---

## 4. Revisión UI/UX (skill ui-ux-cerca)

### 4.1 Cumplimientos

- Tailwind y diseño: hero, beneficios, características, planes, formulario de registro, éxito y footer bien estructurados.
- Control Flow: `@if`, `@for` con `track`; sin `*ngIf`/`*ngFor`.
- Signals: `plans`, `selectedPlan`, `step`, `registrationResult`, `errorMessage`, `isLoadingPlans`; computeds para `isLoading`, `isSuccess`, `isError`.
- Formularios: labels asociados, mensajes de error, feedback “Verificando disponibilidad…”.
- CTAs claros y tamaños táctiles adecuados.
- Uso de tokens de marca (`bg-accent`, `bg-gradient-lime`, `text-navy-600`, etc.).

### 4.2 Puntos a mejorar

- **Estilos inline**: Varios `style="..."` (logos, fondos decorativos, toast). La skill indica preferir utilidades Tailwind o design system.
- **Contraste**: Algunos labels usan `text-gray-300` sobre fondo claro; revisar a `text-gray-600`/`700` para accesibilidad.
- **Design system**: Confirmar que todas las clases provienen de `design-system/styles` y `design-system/tokens` cuando aplique.

---

## 5. Revisión Angular / Arquitectura (skill angular-admin-architect)

### 5.1 Cumplimientos

- Componente `App` standalone; Signals y Control Flow moderno.
- SSR con `RenderMode.Prerender` en `app.routes.server.ts`.
- Lógica en servicio (`RegistrationService`); modelos en `registration.model.ts`.

### 5.2 Desalineaciones

- **ChangeDetection**: `App` no declara `changeDetection: ChangeDetectionStrategy.OnPush`. Recomendado para alineación con el estándar del admin.
- **Zod**: Validación actual con `Validators` de Angular. La skill pide Zod para formularios y respuestas API; opcional para este landing, recomendable para consistencia:
  - Esquema Zod para `RegistrationDto` antes de llamar a `registerClient`.
  - Validación de la respuesta de `register-client` con esquema de `RegistrationResult` en el servicio.

---

## 6. SEO

- **Meta/Title**: Configurados en `ngOnInit` de `App`: `title`, `description`, `keywords`, `og:title`, `og:description`, `og:type`, `robots`, `viewport`. Con prerender, se incluyen en el HTML inicial.
- **Recomendaciones**:
  - Añadir `og:image` con logo/imagen social (ej. `cerca-logo-full.png`).
  - Verificar `<html lang="es">` en `index.html`.
  - Favicon ya presente en `public`.

---

## 7. Acciones recomendadas

| Prioridad | Acción |
|-----------|--------|
| Alta | Añadir `ChangeDetectionStrategy.OnPush` al componente `App`. |
| Media | Eliminar estilos inline; migrar a Tailwind o design system. |
| Media | Revisar contraste de labels del formulario (`text-gray-300` → `text-gray-600`/`700`). |
| Media | Añadir meta `og:image` y `lang="es"` en el HTML raíz. |
| Baja | Introducir Zod para validación de DTO y respuesta de `register-client` si se quiere alineación total con angular-admin-architect. |

---

*Documento generado a partir de la validación del estado de la aplicación landing (marzo 2026).*
