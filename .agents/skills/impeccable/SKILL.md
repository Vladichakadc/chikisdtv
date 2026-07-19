---
name: impeccable
description: Skill para escritura de código perfecto - limpieza extrema, standards, y calidad absoluta. Actívalo cuando el usuario pida código limpio, refactor de calidad, aplicar estándares estrictos (ESLint/Prettier/TypeScript), o cuando quiera llevar su código al nivel de perfección absoluta.
type: validator
tags:
  - code-quality
  - standards
  - perfection
  - linting
  - formatting
---

# Impeccable - Code Perfection Skill ✨

Skill especializado en producir código absolutamente limpio, perfectamente formateado y que cumple con los estándares más exigentes.

## Características

### 1. Análisis de Código
- Detecta desviaciones de standards
- Identifica código redundante
- Encuentra anti-patterns
- Valida convenciones de naming

### 2. Formateo Automático
- Indentación perfecta
- Espaciado consistente
- Líneas optimizadas
- Imports organizados

### 3. Estándares Aplicados
- ESLint/Prettier (JavaScript/TypeScript)
- PEP 8 (Python)
- PSR-12 (PHP)
- Go fmt (Go)

### 4. Validaciones
- ✅ Type checking
- ✅ Null safety
- ✅ Error handling
- ✅ Edge cases

## Uso

### Análisis Completo
```bash
/impeccable analyze --file src/app.jsx
```

### Auto-format
```bash
/impeccable format --directory src/ --recursive true
```

### Validar Standards Específicos
```bash
/impeccable validate
  --file src/
  --standards "eslint,typescript,prettier"
  --strict true
```

## Niveles de Pureza

### Level 1: Basic Cleanup
```bash
/impeccable --level basic
```
- Formateo automático
- Imports organizados
- Espacios en blanco

### Level 2: Code Quality
```bash
/impeccable --level intermediate
```
- Elimina dead code
- Simplifica lógica
- Mejora legibilidad

### Level 3: Perfection (Impeccable)
```bash
/impeccable --level strict
```
- Refactor completo
- Optimización máxima
- Standards extremos
- Zero warnings

## Reglas Impeccables

### Nomenclatura
- camelCase para variables/funciones
- PascalCase para clases/componentes
- UPPER_SNAKE_CASE para constantes
- _ prefijo para privados

### Estructura
- Máximo 3 niveles de anidamiento
- Funciones < 20 líneas (ideal)
- Máximo 100 caracteres por línea
- Archivos < 500 líneas

### Imports
- Agrupar por categoría
- Ordenar alfabéticamente
- Eliminar imports no usados
- Usar absolute paths

### Comments
- Solo cuando es necesario
- Explicar el "por qué", no el "qué"
- Mantener actualizados
- Evitar comentarios obvios

## Ejemplo

### Antes (Impuro)
```javascript
function calc(a,b,c){
  var result = 0
  for(var i=0;i<a.length;i++){
    result+=a[i]*b[i]
  }
  return result
}
```

### Después (Impeccable)
```javascript
const calculateDotProduct = (vectorA, vectorB) => {
  return vectorA.reduce((sum, value, index) => sum + value * vectorB[index], 0);
};
```

## Puntuación de Impecabilidad

```
Puntuación Impeccable:
├─ Formateo:      100/100 ✅
├─ Naming:         95/100 ⚠️
├─ Structure:      98/100 ✅
├─ Standards:      99/100 ✅
└─ TOTAL:          98/100 ⭐
```

## Niveles de Exigencia

| Nivel | Descripción | Warnings | Errors |
|-------|-------------|----------|--------|
| Relaxed | Básico | ✅ Permitidos | ❌ No |
| Standard | Profesional | ⚠️ Máximo 5 | ❌ No |
| Strict | Exigente | ❌ 0 | ❌ No |
| Impeccable | Perfección | ❌ 0 | ❌ 0 |

## Vea También

- `/review` - Validación de lógica
- `/gsd` - Completar tareas impecables
- `/claude-men` - Aprender estándares
- `/skill-creator` - Crear custom standards
