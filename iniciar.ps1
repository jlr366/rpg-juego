# Script para levantar el RPG completo
# Uso: clic derecho -> "Ejecutar con PowerShell"
# O desde terminal: powershell -ExecutionPolicy Bypass -File .\iniciar.ps1

$root = Split-Path -Parent $MyInvocation.MyCommand.Definition
if (-not $root) { $root = $PSScriptRoot }
if (-not $root) { $root = Get-Location }

Write-Host "=== RPG Launcher ===" -ForegroundColor White
Write-Host "Ruta: $root" -ForegroundColor DarkGray
Write-Host ""

# Terminar procesos anteriores en los puertos usados (opcional)
Write-Host "Iniciando Backend (node server.js)..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList @(
  "-ExecutionPolicy", "Bypass",
  "-NoExit",
  "-Command",
  "Write-Host 'BACKEND' -ForegroundColor Cyan; Set-Location '$root\backend'; node server.js"
)

Start-Sleep -Seconds 3

Write-Host "Iniciando Frontend (esbuild watch)..." -ForegroundColor Green
Start-Process powershell -ArgumentList @(
  "-ExecutionPolicy", "Bypass",
  "-NoExit",
  "-Command",
  "Write-Host 'FRONTEND' -ForegroundColor Green; Set-Location '$root\frontend'; node scripts/build.mjs"
)

Write-Host ""
Write-Host "Abriendo en dos ventanas separadas." -ForegroundColor Yellow
Write-Host "Cuando el frontend diga 'Running on http://...' abre esa URL." -ForegroundColor Yellow
Write-Host ""
Write-Host "Para detener: cierra las ventanas del backend y frontend." -ForegroundColor Red
Write-Host ""
Write-Host "Presiona cualquier tecla para cerrar esta ventana..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
