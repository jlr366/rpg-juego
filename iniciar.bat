@echo off
echo === RPG Launcher ===
echo.

set ROOT=%~dp0

echo Iniciando Backend...
start "RPG Backend" cmd /k "cd /d %ROOT%backend && node server.js"

timeout /t 3 /nobreak >nul

echo Iniciando Frontend...
start "RPG Frontend" cmd /k "cd /d %ROOT%frontend && node scripts/build.mjs"

echo.
echo Las dos ventanas se abrieron.
echo Cuando el frontend muestre "Running on http://..." abre esa URL en el navegador.
echo.
pause
