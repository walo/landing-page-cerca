# Historia de Usuario: Alineación del landing con estándares Cerca

**ID**: US-001  
**Prioridad**: Alta  
**Referencia**: Acciones recomendadas en [ANALISIS-LANDING.md](../ANALISIS-LANDING.md#7-acciones-recomendadas)

## 1. Definición (Como/Quiero/Para)

**Como**: equipo de desarrollo y producto  
**Quiero**: implementar las acciones recomendadas del análisis del landing (OnPush, estilos, contraste, SEO, Zod)  
**Para**: alinear la aplicación con las skills UI-UX Cerca y Angular Admin Architect, mejorar rendimiento, accesibilidad y SEO para los visitantes.

## 2. Criterios de Aceptación (Gherkin)

- **Escenario 1**: Landing cumple estándares de arquitectura y estilos
  - **Dado** que existe el análisis del landing con acciones recomendadas
  - **Cuando** se implementan las tareas de prioridad alta y media (OnPush, eliminación de estilos inline, contraste de labels)
  - **Entonces** el componente `App` usa `ChangeDetectionStrategy.OnPush`, no hay atributos `style="..."` en el template y los labels del formulario usan clases de contraste adecuadas (`text-gray-600` o `text-gray-700`)

- **Escenario 2**: SEO y preview social correctos
  - **Dado** que el landing se comparte en redes o se indexa por buscadores
  - **Cuando** se añaden las metas `og:image` y el atributo `lang="es"` en el HTML raíz
  - **Entonces** las vistas previas en redes muestran imagen y el documento declara idioma español para SEO y accesibilidad

- **Escenario 3**: Validación con Zod (alineación angular-admin-architect)
  - **Dado** que el formulario de registro envía datos a la Edge Function `register-client`
  - **Cuando** se introduce validación con Zod para el DTO de registro y la respuesta
  - **Entonces** los datos se validan con esquema Zod antes del envío y la respuesta del backend se valida antes de actualizar el estado, con manejo de errores de formato

## 3. Tareas Técnicas (Arquitectura Cerca)

### Backend (Supabase/Edge Functions)
- [ ] No aplica: las acciones son solo frontend del landing; la Edge Function `register-client` no se modifica.

### Frontend (Landing – Angular)
- [ ] Añadir `ChangeDetectionStrategy.OnPush` al componente `App` en `app.ts`; verificar que todo el estado reactivo pasa por Signals o formularios.
- [ ] Eliminar todos los estilos inline (`style="..."`) en `app.html`; reemplazar por clases Tailwind o del design system (logos, fondos decorativos, toast).
- [ ] Cambiar labels del formulario de `text-gray-300` a `text-gray-600` o `text-gray-700` en las secciones de datos del conjunto y del administrador.
- [ ] Añadir meta `og:image` (ruta pública a imagen social, ej. `cerca-logo-full.png`) en el mismo bloque de metas que en `ngOnInit` de `App`; asegurar URL absoluta si se comparte en redes.
- [ ] Verificar o añadir `<html lang="es">` en `index.html` (o plantilla raíz que use el proyecto).
- [ ] Instalar Zod; definir esquemas `RegistrationDtoSchema` y `RegistrationResultSchema` (ej. en `core/models` o archivo de schemas); validar DTO antes de `registerClient` y respuesta antes de asignar a `registrationResult`; manejar `safeParse`/errores con mensaje genérico.

### App Residente
- [ ] No aplica.

## 4. Validación de Seguridad y Privacidad
- [ ] No se exponen datos nuevos; Zod solo valida formato. Mantener sin enviar datos sensibles en meta tags (og:image es público).
- [ ] Confirmar que `og:image` apunta a recurso público y que no incluye información personal.

## 5. Multi-tenancy y RLS
- No aplica para el landing: la página es pública y no opera sobre datos por `tenant_id`. Las consultas a Supabase (planes, check NIT/nombre) ya usan anon key y políticas existentes.

## 6. Notas
- Orden sugerido: (1) OnPush, (2) estilos y contraste, (3) SEO, (4) Zod.
- Design system: preferir tokens/clases de `design-system/tokens` y `design-system/styles` al sustituir estilos inline cuando existan en el proyecto.
