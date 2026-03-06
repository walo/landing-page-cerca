# Verificación Supabase: cumplimiento de funcionalidades del landing

Documento que registra el análisis de cumplimiento entre las **seis funcionalidades** ofrecidas en la sección "Todo lo que necesitas para administrar" del landing page y el esquema y capacidades del **proyecto Supabase del producto Cerca**.

---

## 1. Alcance y método

| Campo | Valor |
|-------|--------|
| **Proyecto Supabase** | `tmahegehoshaciodewzm` (producto / app conjuntos) |
| **URL** | `https://tmahegehoshaciodewzm.supabase.co` |
| **Fuente** | MCP Supabase (`user-supabase-mcp-server`): `list_tables` (verbose), `list_edge_functions`, consultas SQL |
| **Fecha de análisis** | Marzo 2025 |

**Funcionalidades verificadas** (según copia del landing):

1. Gestión de Cartera  
2. Directorio de Residentes  
3. Comunicados Masivos  
4. PQRS en Línea  
5. Reservas de Zonas Comunes  
6. Reportes e Informes  

---

## 2. Resumen ejecutivo

| Funcionalidad | Cumplimiento | Observación |
|---------------|---------------|-------------|
| Gestión de Cartera | ✅ Cumple | Tablas `bills`, `treasury_payments`, `financial_config`; Wompi soportado. Recordatorios a morosos requieren lógica (EF/cron o tabla de notificaciones). |
| Directorio de Residentes | ✅ Cumple | `residents`, `units`, `zones`, `conjuntos`; tipos Propietario/Arrendatario y permisos por unidad. |
| Comunicados Masivos | ❌ No cumple | No existe tabla para comunicados, circulares o historial de envíos. |
| PQRS en Línea | ❌ No cumple | No existe tabla para peticiones, quejas, reclamos o sugerencias con trazabilidad. |
| Reservas de Zonas Comunes | ✅ Cumple | `common_areas` y `reservations` con estados y aprobación. |
| Reportes e Informes | ✅ Cumple | Datos suficientes para informes financieros, de cartera y de actividad vía queries/vistas/RPC. |

**Conclusión:** El proyecto **tmahegehoshaciodewzm** respalda **4 de 6** funcionalidades. Faltan **Comunicados Masivos** y **PQRS en Línea**.

---

## 3. Detalle por funcionalidad

### 3.1 Gestión de Cartera — ✅ Cumple

| Prometido en el landing | Soporte en Supabase |
|-------------------------|----------------------|
| Cuotas de administración | **bills**: por unidad (`unit_id`), período (`period`), monto, intereses, total, vencimiento (`due_date`), estado (`Pending`, `Paid`, `Overdue`, `Annulled`, `Partial`). |
| Generar recibos / pagos | **treasury_payments**: por unidad y factura, monto, método de pago, referencia, comprobante (`proof_url`), fecha de pago. |
| Integración Wompi | **treasury_payments**: `payment_method` incluye `'Wompi'`, campo `wompi_transaction_id`. **financial_config**: configuración por conjunto (claves Wompi, cuenta bancaria, cuota mensual, tasa de interés). |
| Recordatorios a morosos | Morosidad identificable con `bills.status = 'Overdue'`. No hay tabla de recordatorios enviados; implementable con Edge Function + cron o tabla de notificaciones. |

### 3.2 Directorio de Residentes — ✅ Cumple

| Prometido | Soporte en Supabase |
|-----------|----------------------|
| Propietarios y arrendatarios | **residents**: `type` (Propietario, Arrendatario, Familiar, Encargado), `unit_id`, `conjunto_id`, `user_id`, `status`. |
| Unidades | **units**: por conjunto y zona, nombre, tipo (Apartamento, Casa, Local, etc.), código de citófono. **zones** y **conjuntos** para estructura del conjunto. |
| Accesos y permisos por unidad | **residents**: `is_authorized_voice`, `is_primary_contact`, `status`. RLS y lógica de negocio permiten restricción por unidad/conjunto. |

### 3.3 Comunicados Masivos — ❌ No cumple

| Prometido | Estado |
|-----------|--------|
| Comunicados, circulares, alertas por correo y push | No existe tabla para comunicados (p. ej. `announcements`, `communications`, `broadcasts`). No hay soporte de datos para contenido enviado ni destinatarios. |

**Recomendación:** Crear tablas para comunicados (cabecera, contenido, segmentos/destinatarios) e integrar envío por correo/push vía Edge Functions o servicios externos.

### 3.4 PQRS en Línea — ❌ No cumple

| Prometido | Estado |
|-----------|--------|
| Peticiones, quejas, reclamos, sugerencias con trazabilidad | No existe tabla para PQRS (p. ej. `pqrs`, `tickets`, `complaints`, `requests`). No hay soporte para tipo, estado, comentarios ni trazabilidad. |

**Recomendación:** Crear tabla(s) para PQRS (tipo P/Q/R/S, estado, comentarios, asignación, fechas) y, si aplica, historial de cambios.

### 3.5 Reservas de Zonas Comunes — ✅ Cumple

| Prometido | Soporte en Supabase |
|-----------|----------------------|
| Salón comunal, piscina, BBQ, etc. | **common_areas**: nombre, descripción, capacidad, costo por hora, requiere aprobación, horarios (`opening_hours` jsonb), activo. |
| Disponibilidad y reservas | **reservations**: zona común, residente, inicio/fin, estado (Pending, Approved, Rejected, Cancelled, Completed), costo, asistentes, propósito. |

### 3.6 Reportes e Informes — ✅ Cumple

| Prometido | Estado |
|-----------|--------|
| Informes financieros, de cartera y de actividad para asambleas | Datos base presentes: **bills**, **treasury_payments**, **residents**, **units**, **reservations**, **visits**, etc. Reportes realizables con queries, vistas materializadas o RPC. |

---

## 4. Tablas y Edge Functions consultadas

- **Tablas públicas relevantes:** `bills`, `treasury_payments`, `financial_config`, `residents`, `units`, `zones`, `conjuntos`, `common_areas`, `reservations`, `clients`, `catalog_*`, `feature_definitions`, entre otras.
- **Edge Functions listadas:** `validate-subscription`, `check-feature-access`.

---

## 5. Acciones recomendadas

1. **Comunicados Masivos:** Diseñar e implementar esquema (tablas/vistas) para comunicados y envíos; definir integración correo/push (Edge Functions o terceros).
2. **PQRS en Línea:** Diseñar e implementar esquema para PQRS (tipos, estados, comentarios, trazabilidad) y políticas RLS.
3. **Recordatorios a morosos (Gestión de Cartera):** Opcional: tabla de notificaciones/recordatorios o Edge Function programada que use `bills.status = 'Overdue'` para envío de recordatorios.

**Plan de ejecución:** Ver [PLAN-ACCIONES-CUMPLIMIENTO-LANDING.md](./PLAN-ACCIONES-CUMPLIMIENTO-LANDING.md) para la definición y ejecución paso a paso de estas acciones.

---

*Documento generado a partir del análisis vía MCP Supabase sobre el proyecto `tmahegehoshaciodewzm`.*
