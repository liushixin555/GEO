@echo off
setlocal
set "ROOT=%~dp0.."
set "CODE=%ROOT%\.tools\vscode\Code.exe"

if not exist "%CODE%" (
  echo VS Code executable was not found: %CODE%
  exit /b 1
)

start "" "%CODE%" "%ROOT%"
