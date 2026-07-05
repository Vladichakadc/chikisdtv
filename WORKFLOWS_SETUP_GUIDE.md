# CI/CD Workflows Setup Guide

Todos los workflows están listos en la carpeta `workflows-config/`.

## Pasos para mover los workflows a `.github/workflows/`:

1. **Opción 1: Desde GitHub Web**
   - Ve a https://github.com/Vladichakadc/chikisdtv/tree/workflows/setup-ci-cd/workflows-config
   - Copia el contenido de cada archivo `.yml`
   - Crea un nuevo archivo en `.github/workflows/` con ese contenido

2. **Opción 2: Desde la terminal**
   ```bash
   git clone https://github.com/Vladichakadc/chikisdtv.git
   cd chikisdtv
   git checkout workflows/setup-ci-cd
   
   # Mover workflows
   mv workflows-config/*.yml .github/workflows/
   
   git add .github/workflows/
   git commit -m "feat: Move workflows to .github/workflows"
   git push origin workflows/setup-ci-cd
   ```

## Workflows incluidos:

✅ **ci-cd-build-test.yml** - Construcción y pruebas (Node 18.x, 20.x)
✅ **playwright-tests.yml** - Tests E2E automatizados
✅ **code-quality.yml** - Análisis de código, seguridad, linting
✅ **deploy-production.yml** - Despliegue automático a producción
✅ **status-checks.yml** - Control de estado de checks

## Configuraciones incluidas:

✅ `.eslintrc.json` - Reglas de ESLint
✅ `.prettierrc.json` - Formato de código
✅ `playwright.config.ts` - Configuración de Playwright
✅ `tests/e2e/example.spec.ts` - Tests de ejemplo
✅ `package.json` - Actualizado con dependencias

## Próximos pasos:

1. Crear un Pull Request desde `workflows/setup-ci-cd` hacia `main`
2. Mover los workflows desde `workflows-config/` a `.github/workflows/`
3. Fusionar el PR
4. Ejecutar `npm install` en el cliente para instalar nuevas dependencias
