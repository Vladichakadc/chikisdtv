---
name: skill-creator
description: Herramienta para crear y gestionar skills personalizadas. Usa este skill cuando el usuario pida crear una nueva skill, instalar skills, validar skills, o gestionar el repositorio de skills del proyecto.
type: generator
tags:
  - development
  - productivity
  - skills
---

# Skill Creator

Herramienta especializada para crear, validar e instalar skills personalizadas en proyectos de Claude Code y Antigravity IDE.

## Funcionalidad

Este skill te permite:

1. **Crear nuevas skills** desde cero con estructura estándar
2. **Validar skills** para asegurar que cumplan con el formato YAML
3. **Instalar skills** desde GitHub o archivos locales
4. **Documentar skills** con ejemplos y casos de uso
5. **Gestionar versiones** de skills

## Uso

### Crear una nueva skill

```
/skill-creator create nombre-skill
  --description "Descripción breve"
  --type generator|validator|transformer
```

### Instalar desde GitHub

```
/skill-creator install https://github.com/usuario/repo
  --path .claude/skills/nombre-skill
```

### Validar skill

```
/skill-creator validate .claude/skills/nombre-skill
```

## Estructura de Archivo

Una skill debe tener este formato:

```markdown
---
name: nombre-skill
description: Descripción clara de la skill
tags:
  - tag1
  - tag2
type: generator
---

# Nombre de la Skill

Descripción detallada...

## Características

- Característica 1
- Característica 2

## Uso

Instrucciones de uso...
```

## Ejemplo Completo

Para crear una skill personalizada, ejecuta:

```bash
/skill-creator create mi-skill \
  --description "Mi skill personalizada" \
  --type generator \
  --tags productivity,development
```

Esto creará:
```
.agents/skills/mi-skill/
└── SKILL.md
```

## Variables Disponibles

- `{PROJECT_ROOT}` - Raíz del proyecto
- `{AGENTS_DIR}` - Directorio .agents/
- `{SKILLS_DIR}` - Directorio de skills

## Vea También

- `/review` - Para reviews de código
- `/feature-planning` - Para planificación de features
- `/help` - Para ayuda general
