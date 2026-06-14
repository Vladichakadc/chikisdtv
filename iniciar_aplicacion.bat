@echo off
cd /d "%~dp0"
title ChikisdTV Launcher

echo ============================================
echo   ChikisdTV - Iniciando Aplicacion
echo ============================================
echo.

REM Verificar Node
where node >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Node.js no esta instalado. Descargar desde https://nodejs.org
    pause
    exit /b 1
)

REM Instalar dependencias backend si faltan
if not exist "server\node_modules" (
    echo [SETUP] Instalando dependencias del backend...
    cd server
    call npm install
    cd ..
)

REM Instalar dependencias frontend si faltan
if not exist "client\node_modules" (
    echo [SETUP] Instalando dependencias del frontend...
    cd client
    call npm install
    cd ..
)

echo.
echo [START] Lanzando servidor backend (puerto 4000)...
start "ChikisdTV Backend" cmd /k "cd /d "%~dp0server" && npm start"

timeout /t 5 >nul

echo [START] Lanzando frontend (puerto 5174)...
start "ChikisdTV Frontend" cmd /k "cd /d "%~dp0client" && npm run dev"

timeout /t 3 >nul

echo.
echo ============================================
echo   ChikisdTV listo
echo   Backend:  http://localhost:4000
echo   Frontend: http://localhost:5174
echo   Admin:    admin@chikisdtv.com / admin123
echo ============================================
echo.
pause
