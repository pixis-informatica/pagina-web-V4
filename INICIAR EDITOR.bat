@echo off
title PIXIS LIVE EDITOR - Servidor Local
color 5F
cls

echo.
echo  ╔══════════════════════════════════════════════════════╗
echo  ║        PIXIS LIVE EDITOR — Iniciando servidor        ║
echo  ╚══════════════════════════════════════════════════════╝
echo.

REM Ir al directorio del script
cd /d "%~dp0"

REM Verificar si Node.js está instalado
where node >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo  [ERROR] Node.js no está instalado.
    echo.
    echo  Descargalo desde: https://nodejs.org
    echo.
    pause
    exit /b 1
)

echo  [OK] Node.js detectado
echo.

REM Instalar dependencias si faltan
echo  Verificando librerias...
call npm install --no-save
echo.

echo  Iniciando servidor en http://localhost:8080
echo.

REM Abrir el navegador automáticamente después de 1.5 segundos
start "" /b cmd /c "timeout /t 2 /nobreak >nul && start http://localhost:8080/login.html"

REM Iniciar el servidor
node server.js

REM Si el servidor falla, mostrar error y pausa
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo  [ERROR] El servidor falló con código %ERRORLEVEL%
    echo.
    pause
)
