---
name: ui-ux-cerca
description: Especialista en diseño de interfaces modernas con Angular 18+ (Signals, Control Flow) y Tailwind CSS. Usar para crear componentes premium, accesibles y consistentes con la marca Cerca. Se aplica cuando el usuario pide diseñar pantallas, estilizar vistas, mejorar UX, aplicar estilos de marca o refactorizar a Control Flow.
---

# UI-UX Cerca

Interfaces visualmente impresionantes, performantes y alineadas con la marca Cerca, usando Angular 18+ y Tailwind CSS.

## Meta
UX fluida, UI moderna, centrada en accesibilidad, rendimiento (Signals) y consistencia visual.

## Disparadores
- "Crea un componente UI con Tailwind"
- "Diseña la pantalla de... usando Signals"
- "Estiliza esta vista"
- "Mejora la experiencia de usuario"
- "Aplica los estilos de marca"
- "Refactoriza a Control Flow"

---

## 1. Gestión de Estado y Reactividad (Signals)

| Patrón | Uso obligatorio |
|--------|-----------------|
| **Signals** | `signal()`, `computed()`, `effect()` para estado local y reactividad |
| **Inputs** | `input()` y `model()` en lugar de `@Input` / `@Output` |
| **Change Detection** | Siempre `ChangeDetectionStrategy.OnPush` |

**Regla**: No crear `signal()` dentro de métodos o bucles; deben ser propiedades de clase.

---

## 2. Control Flow & Views

Reemplazo total de directivas estructurales antiguas:

| Antiguo | Nuevo |
|---------|-------|
| `*ngIf` | `@if`, `@else` |
| `*ngFor` | `@for` (con `track` obligatorio) |
| `*ngSwitch` | `@switch`, `@case`, `@default` |

Para contenido no crítico o bajo el fold, usar bloques `@defer` con triggers (`on viewport`, `on idle`, etc.).

---

## 3. Estilos y Branding (Tailwind + Design System)

**Design System (obligatorio)**: Usar siempre que se estilice algo:
- **Estilos**: `@src/app/design-system/styles/` — tema, overrides y base (importar en componentes cuando haga falta).
- **Tokens**: `@src/app/design-system/tokens/` — colores, tipografía, spacing, radius, botones, cards, inputs, badges, etc. Preferir variables/mezclas del design system antes que valores sueltos.

**Framework**: Tailwind CSS para el resto del estilizado. Evitar CSS/SCSS propio salvo animaciones complejas.

### Paleta de marca (obligatorio)

| Contexto | Clases |
|----------|--------|
| Fondo general | `bg-stone-50` |
| Primario (acciones/botones) | `text-sky-600`, `bg-sky-600` |
| Éxito (confirmaciones) | `text-emerald-500`, `bg-emerald-500` |
| Alertas / mora | `text-rose-500`, `bg-rose-500` |
| Bordes sutiles | `border-stone-200` |

**Clases**: Preferir utilidades (`flex`, `grid`, `p-4`, etc.).

---

## 4. Componentes y Accesibilidad

- **Bases**: Elementos HTML nativos o primitivas headless accesibles.
- **Responsividad**: Mobile-First. Usar `sm:`, `md:`, `lg:`, `xl:` para adaptar.
- **Táctil**: Mínimo **44×44px** en elementos interactivos.
- **Accesibilidad**: `aria-*`, contraste adecuado. No omitir.

---

## 5. Validación de formularios (Zod)

**Librería**: Zod para esquemas y validación.

- Definir esquemas con `z.object()`, `z.string()`, `z.number()`, etc.
- Integrar con Angular Reactive Forms mediante validadores personalizados o `ng-zod` si está disponible.
- Validar datos de entrada antes de enviar al backend.
- Mostrar mensajes de error accesibles (`aria-describedby`, `aria-invalid`).

---

## Restricciones

- **Prohibido**: `*ngIf`, `*ngFor`, estilos en línea (`style="..."`).
- No ignorar el design system: usar tokens y estilos de `design-system/tokens` y `design-system/styles` cuando sea necesario.
- No ignorar accesibilidad.
- No crear señales dentro de métodos o bucles.
