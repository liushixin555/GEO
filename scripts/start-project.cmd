@echo off
setlocal

set "ROOT=%~dp0.."
set "APP_URL=http://localhost:3000/"
set "PG_SERVICE=postgresql-x64-17"

cd /d "%ROOT%"

echo ========================================
echo  Boyun project launcher
echo ========================================
echo.

echo [1/3] Checking PostgreSQL service...
powershell -NoProfile -ExecutionPolicy Bypass -Command "$ErrorActionPreference='Stop'; $serviceName='%PG_SERVICE%'; $port=5432; $svc=Get-Service -Name $serviceName -ErrorAction SilentlyContinue; if ($null -eq $svc) { Write-Host ('PostgreSQL service not found: ' + $serviceName); exit 2 }; if ($svc.Status -ne 'Running') { try { Start-Service -Name $serviceName } catch { Write-Host 'Failed to start PostgreSQL. Please run this shortcut as administrator.'; Write-Host $_.Exception.Message; exit 3 } }; $deadline=(Get-Date).AddSeconds(45); do { Start-Sleep -Seconds 1; $svc=Get-Service -Name $serviceName; $portReady=Test-NetConnection -ComputerName '127.0.0.1' -Port $port -InformationLevel Quiet -WarningAction SilentlyContinue; if ($svc.Status -eq 'Running' -and $portReady) { Write-Host ('PostgreSQL status: Running, port ' + $port + ' is ready.'); exit 0 } } while ((Get-Date) -lt $deadline); Write-Host 'PostgreSQL did not become ready in time. Please check service status and port 5432.'; exit 4"
if not "%ERRORLEVEL%"=="0" (
  echo.
  echo PostgreSQL is not ready, project startup stopped.
  echo If you just turned on the computer, try running this shortcut as administrator.
  pause
  exit /b 1
)

echo.
echo [2/3] Checking local ports...
netstat -ano | findstr /R /C:":3000 .*LISTENING" >nul
set "PAGE_RUNNING=%ERRORLEVEL%"
netstat -ano | findstr /R /C:":8080 .*LISTENING" >nul
set "API_RUNNING=%ERRORLEVEL%"

if "%PAGE_RUNNING%"=="0" if "%API_RUNNING%"=="0" (
  echo Project already appears to be running.
  echo Opening %APP_URL%
  start "" "%APP_URL%"
  echo.
  echo You can close this window.
  pause
  exit /b 0
)

echo.
echo [3/3] Starting frontend and backend...
echo Browser will open automatically in a few seconds.
start "open browser" powershell -NoProfile -ExecutionPolicy Bypass -Command "Start-Sleep -Seconds 8; Start-Process '%APP_URL%'"

"C:\Program Files\nodejs\npm.cmd" run dev

echo.
echo Project service exited.
pause
