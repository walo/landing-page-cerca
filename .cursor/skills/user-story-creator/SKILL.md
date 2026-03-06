---
name: user-story-creator
description: Genera historias de usuario completas y detalladas siguiendo los estándares de arquitectura, diseño atómico y legalidad PH del ecosistema Cerca. Actívala cuando el usuario proporcione una descripción breve de una funcionalidad ("Yo como...").
---

# Creador de Historias de Usuario

Transforma requerimientos breves en historias de usuario robustas con criterios de aceptación Gherkin, desgloses técnicos y validaciones legales de Propiedad Horizontal.

## Meta

Automatizar la documentación técnica y de negocio para nuevas funcionalidades, asegurando cumplimiento de reglas del ecosistema Cerca.

## Instrucciones

### 1. Analizar el requerimiento

- Identificar roles involucrados (Admin Conjunto, Revisoría Fiscal, Residente, etc.).
- Evaluar impacto en sistema **multi-tenant**.
- Determinar si aplica normativa PH (cobros, sanciones, administración).

### 2. Ubicación de salida

- Generar archivo en `docs/user-stories/`.
- Nombre: `US-{consecutivo}-{slug-funcionalidad}.md` (ej: `US-001-registro-residente.md`).

### 3. Cargar plantilla

- Usar estructura de [user_story_template.md](user_story_template.md).

### 4. Aplicar reglas PH

Si la historia involucra cobros, sanciones o administración:

- Citar **Ley 675 de 2001** o principios de Propiedad Horizontal.
- Incluir fundamento legal en sección dedicada.

### 5. Estándares técnicos

| Área | Referencia obligatoria |
|------|------------------------|
| **Backend** | `tenant_id`, RLS (Row Level Security), multi-tenancy |
| **Frontend** | Atomic Design, Signals, Standalone Components |
| **Integración** | Supabase, Zod para validación |

### 6. Gherkin

- Mínimo **2 escenarios** de criterios de aceptación.
- Formato estándar: Given / When / Then.
- Lenguaje de negocio en **español**; términos técnicos en inglés.

### 7. Desglose de tareas

Dividir en:

- **Backend**: Tablas, RLS, Edge Functions, migraciones.
- **Frontend Admin**: Componentes, rutas, servicios (si aplica).
- **App Residente**: Pantallas móvil (si aplica).

## Ejemplo de activación

- **Usuario**: "Crea una historia de usuario: Yo como administrador quiero registrar un residente".
- **Acción**: Generar documento en `docs/user-stories/registro-residente.md` siguiendo la plantilla, reglas PH y estándares técnicos.

## Restricciones

- **No** omitir la sección de RLS / multi-tenancy.
- **No** duplicar componentes si ya existen en la arquitectura atómica (consultar `design-system/`).
- Lenguaje de negocio en **español**; términos técnicos en inglés.
- Verificar existencia de componentes antes de proponer nuevos.

## Disparadores

- "Crea una historia de usuario: Yo como..."
- "Genera la documentación para..."
- "Historia de usuario para [funcionalidad]"
