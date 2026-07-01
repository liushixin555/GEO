@echo off
setlocal
set "ROOT=%~dp0.."

cd /d "%ROOT%"
start "" powershell.exe -NoExit -ExecutionPolicy Bypass -Command "Set-Location -LiteralPath '%ROOT%'; codex"
