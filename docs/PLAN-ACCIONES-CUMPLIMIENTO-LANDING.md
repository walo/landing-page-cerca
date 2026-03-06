# Plan: definición y ejecución de acciones de cumplimiento (landing vs Supabase)

Plan para definir y ejecutar las **acciones recomendadas** del documento [VERIFICACION-SUPABASE-FUNCIONALIDADES-LANDING.md](./VERIFICACION-SUPABASE-FUNCIONALIDADES-LANDING.md) (sección 5), con el fin de alinear el proyecto Supabase **tmahegehoshaciodewzm** al 100% con las funcionalidades ofrecidas en el landing.

---

## 1. Referencia y alcance

| Documento origen | Sección | Acciones |
|-----------------|---------|----------|
| [VERIFICACION-SUPABASE-FUNCIONALIDADES-LANDING.md](./VERIFICACION-SUPABASE-FUNCIONALIDADES-LANDING.md) | § 5 | 1) Comunicados Masivos, 2) PQRS en Línea, 3) Recordatorios a morosos |

**Proyecto Supabase:** `tmahegehoshaciodewzm`  
**Contexto:** Tablas existentes `conjuntos`, `residents`, `units`, `bills`, `treasury_payments`, etc. (ver documento de verificación).

---

## 2. Orden sugerido y dependencias

```
Fase A: PQRS en Línea        (independiente; base para reportes y trazabilidad)
Fase B: Comunicados Masivos  (independiente; puede reutilizar residents/units para destinatarios)
Fase C: Recordatorios       (opcional; depende de bills y posiblemente de notificaciones de B)
```

Las fases A y B pueden ejecutarse en paralelo. La fase C es opcional y puede apoyarse en un canal de notificaciones definido en B.

---

## 3. Fase A: PQRS en Línea

### 3.1 Definir

| Paso | Actividad | Entregable |
|------|-----------|------------|
| A.1 | Modelar entidades: tipo (P/Q/R/S), estado, prioridad, asignación, fechas límite. | Documento de diseño (entidad-relación o descripción de tablas). |
| A.2 | Definir relación con `conjuntos`, `residents` (autor) y opcionalmente `units`. | Esquema lógico con FKs. |
| A.3 | Definir historial/trazabilidad: comentarios, cambios de estado, adjuntos (Storage). | Especificación de tabla(s) de historial y política de Storage. |
| A.4 | Definir políticas RLS: quién puede crear (residentes), quién ver/gestionar (admin/conjunto), aislamiento por `conjunto_id`. | Lista de políticas RLS por tabla. |

**Entregable de fase (Definir):** Especificación de esquema PQRS + RLS (doc o ADR) y, si aplica, nombres de tablas (`pqrs`, `pqrs_comments`, `pqrs_history`).

### 3.2 Ejecutar

| Paso | Actividad | Entregable |
|------|-----------|------------|
| A.5 | Escribir migración(es) SQL: tablas, índices, FKs, checks (tipo, estado). | Archivo(s) de migración en el proyecto. |
| A.6 | Habilitar RLS y crear políticas según A.4. | Políticas aplicadas en Supabase. |
| A.7 | Si hay adjuntos: crear bucket y políticas de Storage. | Bucket configurado + políticas. |
| A.8 | (Opcional) RPC o vista para listado filtrado por conjunto/estado/tipo. | Función o vista en BD. |
| A.9 | Verificar con datos de prueba y con MCP/CLI que las políticas restringen por conjunto. | Checklist de pruebas. |

**Entregable de fase (Ejecutar):** Esquema PQRS desplegado en `tmahegehoshaciodewzm`, RLS y Storage (si aplica) operativos.

---

## 4. Fase B: Comunicados Masivos

### 4.1 Definir

| Paso | Actividad | Entregable |
|------|-----------|------------|
| B.1 | Modelar comunicado: título, contenido, tipo (comunicado/circular/alerta), fecha envío, autor, conjunto. | Diseño de tabla principal (ej. `announcements` o `communications`). |
| B.2 | Definir destinatarios: todos los residentes, por zona, por unidad o lista explícita. Reutilizar `residents`/`units`/`zones`. | Reglas de segmentación y tabla/vista de “destinatarios por comunicado”. |
| B.3 | Definir historial de envíos: por canal (email/push), estado (pendiente/enviado/fallido), timestamp. | Especificación de tabla `announcement_deliveries` o equivalente. |
| B.4 | Elegir integración: Resend/SendGrid/Mailgun para email; OneSignal/FCM u otro para push. | Decisión de proveedor(es) y flujo (Edge Function vs servicio externo). |
| B.5 | Definir RLS: solo administradores del conjunto pueden crear/editar; residentes pueden leer comunicados dirigidos a ellos. | Lista de políticas RLS. |

**Entregable de fase (Definir):** Especificación de esquema de comunicados + modelo de envíos + integración (doc o ADR).

### 4.2 Ejecutar

| Paso | Actividad | Entregable |
|------|-----------|------------|
| B.6 | Migración SQL: tablas de comunicados y de envíos/deliveries, FKs a `conjuntos`/`residents`. | Archivo(s) de migración. |
| B.7 | RLS y, si aplica, Storage para adjuntos de comunicados. | Políticas y bucket. |
| B.8 | Edge Function(s): “enviar comunicado” (genera filas de envío, llama a API de email/push). | Edge Function desplegada. |
| B.9 | (Opcional) Cron o job que procese cola de envíos pendientes. | Cron configurado o función invocada por scheduler. |
| B.10 | Pruebas con un conjunto y unos pocos residentes (email y/o push). | Checklist de pruebas. |

**Entregable de fase (Ejecutar):** Esquema de comunicados desplegado, envíos por correo y/o push funcionando vía Edge Functions.

---

## 5. Fase C: Recordatorios a morosos (opcional)

### 5.1 Definir

| Paso | Actividad | Entregable |
|------|-----------|------------|
| C.1 | Decidir enfoque: solo Edge Function programada (cron) que consulta `bills` con `status = 'Overdue'` y envía recordatorio, o además tabla de “recordatorios enviados” para no duplicar. | Decisión y, si aplica, diseño de tabla `overdue_reminders`. |
| C.2 | Definir canal: email, push o ambos. Reutilizar integración de Comunicados (Fase B) si existe. | Especificación de canal y contenido del mensaje. |
| C.3 | Definir frecuencia y reglas (ej. recordar a los X días de vencimiento, máximo N recordatorios por factura). | Reglas de negocio documentadas. |

**Entregable de fase (Definir):** Especificación corta de recordatorios (enfoque, canal, reglas).

### 5.2 Ejecutar

| Paso | Actividad | Entregable |
|------|-----------|------------|
| C.4 | Si se eligió tabla de recordatorios: migración. | Migración aplicada. |
| C.5 | Edge Function que liste facturas vencidas (por conjunto), genere envíos y opcionalmente registre en tabla de recordatorios. | Edge Function desplegada. |
| C.6 | Configurar invocación periódica (Supabase Cron o externo). | Cron/job activo. |
| C.7 | Prueba con factura en mora de prueba. | Checklist de pruebas. |

**Entregable de fase (Ejecutar):** Recordatorios a morosos operativos (y, si aplica, trazabilidad en BD).

---

## 6. Resumen de entregables por fase

| Fase | Definir | Ejecutar |
|------|---------|----------|
| **A. PQRS** | Especificación esquema + RLS (+ Storage) | Migraciones, RLS, Storage, pruebas |
| **B. Comunicados** | Especificación esquema + envíos + integración | Migraciones, RLS, Edge Function(s), cron, pruebas |
| **C. Recordatorios** | Enfoque, canal, reglas | Tabla opcional, Edge Function, cron, pruebas |

---

## 7. Ubicación de entregables (desarrollo del plan)

Los entregables de las fases *Definir* y *Ejecutar* se generaron en el repositorio con la metodología de la skill supabase-suscripciones (normalización, RLS, Edge Functions).

| Entregable | Ubicación |
|------------|-----------|
| **Especificación de diseño (Definir)** | [docs/ESQUEMA-PQRS-COMUNICADOS-RECORDATORIOS.md](./ESQUEMA-PQRS-COMUNICADOS-RECORDATORIOS.md) |
| **Migraciones SQL (Ejecutar)** | [docs/supabase-product-migrations/](./supabase-product-migrations/): `001_pqrs_tables_and_rls.sql`, `002_announcements_tables_and_rls.sql`, `003_overdue_reminders.sql` |
| **Instrucciones de aplicación** | [docs/supabase-product-migrations/README.md](./supabase-product-migrations/README.md) |
| **Edge Functions (stubs)** | [docs/supabase-product-migrations/edge-functions/send-announcement/](./supabase-product-migrations/edge-functions/send-announcement/), [send-overdue-reminders/](./supabase-product-migrations/edge-functions/send-overdue-reminders/) |

**Proyecto destino:** aplicar migraciones y desplegar Edge Functions en **tmahegehoshaciodewzm** (producto), no en fervyhznyunpyunevmzb (suscripciones).

---

## 8. Cierre de cumplimiento

Al terminar las fases A y B (y opcionalmente C):

1. Actualizar [VERIFICACION-SUPABASE-FUNCIONALIDADES-LANDING.md](./VERIFICACION-SUPABASE-FUNCIONALIDADES-LANDING.md): marcar Comunicados Masivos y PQRS como **Cumple** y reflejar recordatorios en Gestión de Cartera si se implementó C.
2. Registrar en este plan la **fecha de cierre** de cada fase y el enlace a migraciones/commits o al proyecto Supabase.

---

*Plan derivado de las acciones recomendadas en §5 de VERIFICACION-SUPABASE-FUNCIONALIDADES-LANDING.md. Proyecto Supabase: `tmahegehoshaciodewzm`.*
