# 🎯 Claude Code Skills - Master Guide

**Actualizado**: 2026-07-18  
**Skills Disponibles**: 7 + Skills Nativas

---

## 📦 Skills Instaladas

### Oficiales (Pre-existentes)

```bash
/help              # Ayuda interactiva de Claude Code
/review            # Code review local rápido
/ultrareview       # Code review multi-agente en cloud
/clear             # Limpiar contexto
/code-review       # Alias de review (alternativa)
```

### Nuevas (Recién Instaladas)

```
✅ /skill-creator      # Crear y gestionar skills personalizadas
✅ /gsd                # Get Stuff Done - Completar tareas estructuradas
✅ /context-mode       # Gestionar contexto de conversación
✅ /claude-men         # Mentoría especializada en desarrollo
✅ code-review-guide   # Guía de /review y /ultrareview
```

---

## 🚀 Uso Rápido por Tarea

### Quiero escribir código rápido
```bash
/gsd --task "Crear componente React" --priority high
```

### Quiero validar mi código
```bash
/review                    # Rápido
/ultrareview              # Profundo (pre-PR)
```

### Quiero aprender una técnica
```bash
/claude-men --topic "testing" --level intermediate
```

### Quiero optimizar mi contexto
```bash
/context-mode focus       # Para tareas cortas
/context-mode deep        # Para proyectos largos
/context-mode hybrid      # Balance (recomendado)
```

### Quiero crear una skill personalizada
```bash
/skill-creator create mi-skill --description "Mi skill" --type generator
```

---

## 📚 Skills Detalladas

### 1. /skill-creator - Creator of Skills 🛠️

**Propósito**: Crear y gestionar skills personalizadas

**Ubicación**: `.claude/skills/skill-creator/SKILL.md`

**Uso**:
```bash
# Crear nueva skill
/skill-creator create nombre-skill --description "Descripción"

# Instalar desde GitHub
/skill-creator install https://github.com/user/skill-name

# Validar skill
/skill-creator validate .claude/skills/mi-skill
```

**Casos de Uso**:
- Crear skills específicas del proyecto
- Instalar skills de comunidades
- Validar estructura de skills

---

### 2. /gsd - Get Stuff Done 📋

**Propósito**: Completar tareas con metodología estructurada

**Ubicación**: `.claude/skills/gsd/SKILL.md`

**Uso**:
```bash
# Ejecutar tarea
/gsd --task "Refactorizar módulo X" --priority high

# Con timeline
/gsd --task "Tarea" --timeline "3 días" --parallel true

# Con deliverables específicos
/gsd --task "Tarea" --deliverables "code,tests,docs"
```

**Fases**:
1. Clarificación (5-10%)
2. Planificación (10-15%)
3. Ejecución (70-80%)
4. Validación (5-10%)

**Integración**: Perfecto para `/feature-planning` y `/review`

---

### 3. /context-mode - Context Management 🧠

**Propósito**: Optimizar uso de contexto en conversaciones

**Ubicación**: `.claude/skills/context-mode/SKILL.md`

**Modos**:
```bash
/context-mode deep         # Máxima profundidad
/context-mode focus        # Máxima eficiencia
/context-mode hybrid       # Balance (recomendado)
/context-mode project xyz  # Contexto del proyecto
```

**Comandos**:
```bash
/context-mode info         # Ver estado actual
/context-mode snapshot save "nombre"
/context-mode snapshot load "nombre"
/context-mode cleanup      # Limpiar obsoleto
/context-mode reset        # Reset a inicial
```

**Integración**: Usa en todas las sesiones largas

---

### 4. /claude-men - Claude Mentorship 👨‍🏫

**Propósito**: Mentoría especializada en desarrollo

**Ubicación**: `.claude/skills/claude-men/SKILL.md`

**Áreas**:
```bash
/claude-men architecture     # Diseño de sistemas
/claude-men code-quality     # Mejores prácticas
/claude-men workflow         # Git, CI/CD
/claude-men problem-solving  # Debugging
/claude-men career           # Desarrollo profesional
```

**Ejemplo**:
```bash
/claude-men
  --topic "React Performance"
  --level intermediate
  --goal "optimizar app grande"
  --time 60m
```

**Salida**: Conceptos + ejemplos + ejercicios + plan de seguimiento

---

### 5. /review - Code Review Local ⚡

**Propósito**: Validación rápida de código

**Nativo de Claude Code** (no requiere instalación)

**Uso**:
```bash
/review                    # Review cambios actuales
/review --quick            # Versión rápida
/review --severity critical # Solo críticos
/review --fix true         # Auto-fix problemas
```

**Analiza**:
✅ Correctitud  
✅ Calidad  
✅ Seguridad  
✅ Performance  
✅ Testing  

**Tiempo**: < 1 minuto

---

### 6. /ultrareview - Multi-Agent Cloud Review 🚀

**Propósito**: Review profesional exhaustivo

**Nativo de Claude Code** (necesita autenticación)

**Uso**:
```bash
/ultrareview                    # Review completo
/ultrareview --deep true        # Extra profundo
/ultrareview --report pdf       # Con reporte
/ultrareview --strict true      # Modo strict
```

**Agentes**:
- 🤖 Architecture Agent
- 🤖 Security Agent
- 🤖 Performance Agent
- 🤖 Testing Agent
- 🤖 Code Quality Agent

**Tiempo**: 15-20 minutos  
**Costo**: Facturable (tokens)

---

### 7. code-review-guide - Guía de Code Review 🔍

**Propósito**: Documentación de /review y /ultrareview

**Ubicación**: `.claude/skills/code-review-guide/SKILL.md`

**Contiene**:
- Guía completa de ambos comandos
- Comparación detallada
- Workflows recomendados
- Tips y tricks
- Integración con CI/CD

**Uso**: Referencia mientras revisas código

---

## 🎯 Workflow Recomendado

### Durante Desarrollo (Daily)

```bash
# 1. Comienza sesión
/context-mode hybrid

# 2. Planifica tarea
/feature-planning --feature "nueva-funcionalidad"

# 3. Ejecuta con GSD
/gsd --task "Implementar feature" --priority high

# 4. Valida con review rápido
/review
```

### Antes de PR

```bash
# 1. Review local profundo
/review --severity high

# 2. Arregla issues
# ... (cambios)

# 3. Ultra review final
/ultrareview --strict true

# 4. Arregla críticos
# ... (cambios)

# 5. Push y crear PR
git push origin feature-branch
```

### Fin de Sprint

```bash
# 1. Review de todo el código
/ultrareview --branch develop

# 2. Aprender de findings
/claude-men --topic "arquitectura" --context "ultrareview-results"

# 3. Documentar mejoras
# ... (actualizar docs)

# 4. Crear skills de aprendizaje
/skill-creator create sprint-lessons --type guide
```

---

## 📊 Matriz de Decisión

| Situación | Skill | Razón |
|-----------|-------|-------|
| Escribir código rápido | `/gsd` | Estructura + eficiencia |
| Validar cambios | `/review` | Rápido + suficiente |
| Antes de PR importante | `/ultrareview` | Profundo + profesional |
| Sesión larga | `/context-mode hybrid` | Optimizar tokens |
| Aprender técnica | `/claude-men` | Mentoría personalizada |
| Crear skill del proyecto | `/skill-creator` | Reutilizable |
| Referencia de reviews | `code-review-guide` | Documentación |

---

## 🔧 Configuración Recomendada

### Para Proyectos Grandes

```bash
# .claude.yml
skills:
  default-context: hybrid
  auto-gsd-enabled: true
  review-on-commit: true
  ultrareview-frequency: weekly
```

### Para Equipos

```bash
# .claude/skills/proyecto-guide.md
Crear skill con guías del proyecto

# .claude/skills/standards.md
Crear skill con estándares del equipo
```

---

## 💡 Pro Tips

### Tip 1: Combinar Skills
```bash
# Máxima productividad
/context-mode hybrid
/gsd --task "refactor" --parallel true
/review
/ultrareview
```

### Tip 2: Snapshots para Cambios de Contexto
```bash
# Cuando cambias de tarea
/context-mode snapshot save "tarea-1"
/context-mode snapshot load "tarea-2"
```

### Tip 3: Skills Personalizadas
```bash
# Crear skill para estándares del proyecto
/skill-creator create project-standards
# Usar en cada PR
/project-standards --validate true
```

### Tip 4: Mentoría Continua
```bash
# Después de cada /ultrareview
/claude-men --topic "finding-1-solutions"
# Aprender de los errores
```

---

## 📖 Ubicación de Skills

```
.claude/
├── skills/
│   ├── skill-creator/
│   │   └── SKILL.md
│   ├── gsd/
│   │   └── SKILL.md
│   ├── context-mode/
│   │   └── SKILL.md
│   ├── claude-men/
│   │   └── SKILL.md
│   ├── code-review-guide/
│   │   └── SKILL.md
│   └── ... (otros skills)
└── SKILLS_MASTER_GUIDE.md  ← Este archivo
```

---

## 🆘 Troubleshooting

**¿/review tarda mucho?**
→ Usa `/context-mode focus` primero

**¿/ultrareview no funciona?**
→ Asegúrate de tener `git init` en el repo

**¿Skills no aparecen?**
→ Recarga VS Code o terminal

**¿Cómo reportar un issue?**
→ Crear issue en GitHub con `/skill-creator create bug-report`

---

## 📞 Soporte

- 📚 **Documentación**: Leer `.claude/skills/*/SKILL.md`
- 🆘 **Ayuda rápida**: `/help`
- 🔍 **Referencia**: Este archivo (SKILLS_MASTER_GUIDE.md)
- 💬 **Mentoría**: `/claude-men --topic "skill-usage"`

---

## 🎓 Próximos Pasos

1. ✅ Lee este guide
2. ✅ Prueba `/review` en tu código actual
3. ✅ Prueba `/gsd --task "primera-tarea"`
4. ✅ Experimenta con `/context-mode`
5. ✅ Usa `/ultrareview` antes de próximo PR
6. ✅ Crea tu primer skill con `/skill-creator`

---

**¡Listo para ser más productivo! 🚀**

*Última actualización: 2026-07-18*
