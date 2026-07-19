---
name: code-review-guide
description: Guía completa de review y ultrareview - comandos de code review. Usa este skill cuando el usuario quiera hacer un review de código, entender cómo usar herramientas de review, validar calidad antes de un PR, o integrar reviews en su workflow de CI/CD.
type: guide
tags:
  - code-review
  - quality
  - validation
  - testing
---

# Code Review Guide - /review y /ultrareview 🔍

Guía completa para usar los comandos de code review nativos.

## /review - Code Review Local

Análisis rápido de cambios en el branch actual.

### Uso Básico

```bash
/review
```

Analiza automáticamente:
- Cambios no commiteados
- Archivos modificados
- Commits nuevos

### Con Opciones

```bash
/review
  --branch main
  --since "2 days ago"
  --fix true
  --severity critical
```

### Qué Revisa

✅ **Correctitud**
- Errores lógicos
- Edge cases
- Null checks

✅ **Calidad**
- Estándares de código
- Duplicación
- Complejidad

✅ **Seguridad**
- Vulnerabilidades comunes
- Inyecciones
- Manejo de secretos

✅ **Performance**
- Bucles ineficientes
- Memory leaks
- Llamadas redundantes

✅ **Testing**
- Cobertura de tests
- Edge cases no cubiertos
- Mocks adecuados

### Salida

```
📝 REVIEW RESULTS
├─ ✅ 5 items passed
├─ ⚠️  2 warnings
├─ 🔴 1 error encontrado
└─ 📊 Código quality score: 92/100
```

---

## /ultrareview - Multi-Agent Cloud Review

Review profesional multi-agente en la nube. **Más potente y exhaustivo.**

### Uso Básico

```bash
/ultrareview
```

### Con Opciones

```bash
/ultrareview
  --branch main
  --compare main...feature-branch
  --deep true
  --report pdf
```

### Agentes Involucrados

🤖 **Architecture Agent**
- Decisiones de diseño
- Patrones utilizados
- Escalabilidad

🤖 **Security Agent**
- Vulnerabilidades
- Secrets exposure
- OWASP compliance

🤖 **Performance Agent**
- Optimizaciones
- Memory management
- N+1 queries

🤖 **Testing Agent**
- Cobertura de tests
- Test quality
- Mutation testing

🤖 **Code Quality Agent**
- Estándares
- Legibilidad
- Mantenibilidad

## Comparación: /review vs /ultrareview

| Aspecto | /review | /ultrareview |
|---------|---------|--------------|
| Velocidad | ⚡ Rápido (< 1 min) | ⏳ Lento (15-20 min) |
| Profundidad | 📊 Buena | 📊📊 Excelente |
| Agentes | 1 | 5+ |
| Uso | Desarrollo | Pre-PR |

---

## Flujos de Trabajo Recomendados

### Workflow 1: Development

```bash
# 1. Escribir código
# ... (desarrollo)

# 2. Review rápido
/review

# 3. Corregir issues
# ... (fixes)

# 4. Commit
git commit -m "feat: nueva funcionalidad"
```

### Workflow 2: Pre-PR

```bash
# 1. Completa la feature
# 2. Review local
/review
# 3. Arregla issues
# 4. Ultra review antes de PR
/ultrareview
# 5. Push y create PR
git push origin feature
```

---

## Tips y Tricks

### 1. Ignorar Archivos

```bash
# Crear .reviewignore
/dist
/build
*.min.js
node_modules/
```

### 2. Auto-Fix

```bash
/review --fix true
```

### 3. Report Exportable

```bash
/ultrareview --format json --output review.json
/ultrareview --format html --output review.html
```

---

## FAQ

**¿Cuándo usar /review?**
→ Durante desarrollo, validaciones rápidas

**¿Cuándo usar /ultrareview?**
→ Antes de PR, releases, auditorías de código

---

## Vea También

- `/skill-creator` - Crear custom review skills
- `/gsd` - Ejecutar fixes de review
- `/claude-men` - Aprender de findings
