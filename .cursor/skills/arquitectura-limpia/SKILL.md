---
name: arquitectura-limpia
description: Implementa patrones de diseño (SOLID, Clean Architecture) y excelencia técnica en frontend y mobile. Código desacoplado, tipado estricto, Repository, Signals. Usar al refactorizar módulos, aplicar Clean Architecture, implementar Repository/Factory o gestionar estado.
---

# Arquitectura Limpia

Estándares de excelencia técnica para aplicaciones cliente (Frontend y Mobile) en el ecosistema Cerca: código mantenible, testeable y escalable.

## Meta

Aplicar principios SOLID y Clean Architecture en todas las capas, usando los patrones y herramientas de estado más eficientes.

## Disparadores Semánticos

- "Aplica Clean Architecture a este módulo"
- "Implementa el patrón Repository para..."
- "Refactoriza usando Signals"
- "Configura Riverpod en..."

## Patrones Fundamentales

| Patrón | Uso |
|--------|-----|
| **Repository** | Separar obtención de datos (API, Local Storage) de la lógica de negocio |
| **Factory** | Centralizar creación de objetos complejos o entidades de dominio |
| **SOLID** | S: una responsabilidad; O: extensible sin modificar; L: sustituibilidad de subtipos; I: interfaces mínimas; D: depender de abstracciones |

## Frontend (Angular)

- **Signals**: `signal()`, `computed()`, `effect()` para estado reactivo en lugar de RxJS cuando sea posible.
- **Dependency Injection**: `inject()` para servicios y dependencias.
- **Strict Typing**: Interfaces claras para DTOs y modelos. Prohibido `any`.

## Restricciones

- **PROHIBIDO** inyección por constructor en Angular si el proyecto usa `inject()`.
- **PROHIBIDO** estados mutables globales sin gestor de estado (Riverpod/Signals).
- **PROHIBIDO** ignorar tipado estricto en el intercambio entre capas.
