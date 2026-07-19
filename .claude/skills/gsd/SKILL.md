---
name: gsd
description: Get Stuff Done - Skill para completar tareas con metodología estructurada
type: workflow
tags:
  - productivity
  - methodology
  - execution
---

# GSD - Get Stuff Done 📋

Metodología estructurada para completar tareas de forma eficiente y sistemática.

## Metodología

### 1. Clarificación
- Definir objetivo específico
- Identificar entregables
- Establecer criterios de éxito

### 2. Planificación
- Desglosar en sub-tareas
- Asignar dependencias
- Estimar duración

### 3. Ejecución
- Ejecutar paso a paso
- Reportar progreso
- Ajustar según sea necesario

### 4. Validación
- Verificar calidad
- Confirmar entregables
- Documentar resultados

## Uso

```bash
/gsd
  --task "Descripción de tarea"
  --deliverables "list of outputs"
  --timeline "estimado"
```

## Fases de Ejecución

| Fase | Duración | Salida |
|------|----------|---------|
| Clarificación | 5-10% | Especificación clara |
| Planificación | 10-15% | Plan detallado |
| Ejecución | 70-80% | Trabajo completado |
| Validación | 5-10% | Confirmación QA |

## Checklist de Entrega

- [ ] Objetivo confirmado
- [ ] Plan aprobado
- [ ] Tareas completadas
- [ ] Calidad validada
- [ ] Documentación actualizada
- [ ] Entregables confirmados

## Ejemplo

```bash
/gsd
  --task "Refactorizar módulo de pagos"
  --deliverables "código limpio, tests pasando, documentación"
  --timeline "2 días"
```

## Integración con Otros Skills

- Usar `/skill-creator` para documentar procesos
- Usar `/review` para validación de código
- Usar `/feature-planning` para tareas complejas

## Principios

✅ Transparencia total en progreso
✅ Comunicación clara de bloqueadores
✅ Calidad sobre velocidad
✅ Documentación simultanea
✅ Confirmación en cada fase
