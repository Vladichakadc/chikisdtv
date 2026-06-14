@echo off
cd /d "%~dp0"
title ChikisdTV - Descargar BD de Produccion

echo ============================================
echo   ChikisdTV - Descargar BD de Produccion
echo ============================================
echo.

REM Verificar que Railway CLI este instalado
where railway >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Railway CLI no esta instalado.
    echo Instalalo desde https://docs.railway.com/guides/cli
    pause
    exit /b 1
)

REM Vincular con el proyecto/servicio/ambiente de produccion
echo [INFO] Vinculando con Railway...
railway link -p "ChikisdTV Manager" -s server -e production
if errorlevel 1 (
    echo [ERROR] No se pudo vincular con Railway. Ejecuta "railway login" e intenta de nuevo.
    pause
    exit /b 1
)

REM Respaldar la base local actual antes de sobrescribirla
if exist "database.sqlite" (
    for /f %%i in ('powershell -NoProfile -Command "Get-Date -Format yyyyMMdd_HHmmss"') do set TIMESTAMP=%%i
    echo [INFO] Respaldando database.sqlite local como database.sqlite.bak_%TIMESTAMP%
    copy /y "database.sqlite" "database.sqlite.bak_%TIMESTAMP%" >nul
)

REM Descargar la base de datos de produccion a un archivo temporal
echo [INFO] Descargando /data/database.sqlite desde el volumen de Railway...
if exist "database.sqlite.new" del /f /q "database.sqlite.new"
railway volume files --volume server-volume download /data/database.sqlite ./database.sqlite.new --overwrite
if errorlevel 1 (
    echo [ERROR] Fallo la descarga. El archivo local no fue modificado.
    pause
    exit /b 1
)

REM Reemplazar la base local con la descargada
move /y "database.sqlite.new" "database.sqlite" >nul

echo.
echo ============================================
echo   Listo. database.sqlite actualizado con
echo   la copia de produccion.
echo ============================================
echo.
pause
