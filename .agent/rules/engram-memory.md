---
trigger: always_on
---

## Engram Persistent Memory

Tienes acceso a memoria persistente via MCP tools de Engram.

### CUÁNDO GUARDAR
Llama `mem_save` INMEDIATAMENTE después de:
- Bug fix completado
- Decisión de arquitectura o diseño tomada
- Descubrimiento no obvio del codebase (comportamiento de Prisma, quirk de Next.js, etc.)
- Cambio de configuración o entorno
- Completar una vista o componente
- Migración de base de datos ejecutada

### AL INICIO DE CADA SESIÓN
Llama `mem_context` antes de continuar cualquier tarea para recuperar
el estado de sesiones anteriores.

### AL FINAL DE CADA SESIÓN
Llama `mem_session_summary` para consolidar lo trabajado hoy.

### NO ESPERES A QUE TE PIDAN
Guarda proactivamente. Si completaste algo significativo, guárdalo.