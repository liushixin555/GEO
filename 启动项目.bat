@echo off
title Start Boyun Project

set "PROJECT_DIR=D:\GEO\git_code\GEO"
set "APP_URL=http://localhost:3000"
set "DB_HOST=127.0.0.1"
set "DB_PORT=5432"
set "API_HEALTH_URL=http://localhost:8080/api/health"

cd /d "%PROJECT_DIR%"
if errorlevel 1 goto err

echo ==============================
echo   Starting Boyun Project
echo ==============================
echo.

echo [1/5] PostgreSQL...
if exist "D:\Software\PostgreSQL\bin\pg_ctl.exe" (
    start /MIN "PG" "D:\Software\PostgreSQL\bin\pg_ctl.exe" start -D "D:\Software\data" -w -t 5 2>nul
) else (
    echo  - PostgreSQL pg_ctl.exe not found, skipped
)
if exist "D:\Software\PostgreSQL\bin\pg_isready.exe" (
    echo  - Waiting for PostgreSQL ready...
    for /l %%i in (1,1,30) do (
        "D:\Software\PostgreSQL\bin\pg_isready.exe" -h "%DB_HOST%" -p "%DB_PORT%" >nul 2>&1
        if not errorlevel 1 goto db_ready
        timeout /t 1 /nobreak >nul
    )
    echo  - PostgreSQL is not ready after 30 seconds
    goto err_db
) else (
    timeout /t 5 /nobreak >nul
)

:db_ready
echo  - PostgreSQL ready

echo [2/5] Prisma check...
if not exist "node_modules\@prisma\client\.prisma\client\default.d.ts" (
    if exist "node_modules\@prisma\client\.prisma" rmdir "node_modules\@prisma\client\.prisma" >nul 2>&1
    if exist "node_modules\.prisma" (
        mklink /J "node_modules\@prisma\client\.prisma" "node_modules\.prisma" >nul 2>&1
        echo  - Prisma link fixed
    ) else (
        echo  - node_modules\.prisma not found, please install dependencies first
    )
) else (
    echo  - Prisma link OK
)

echo [3/5] Stop old dev processes...
powershell -NoProfile -ExecutionPolicy Bypass -File "%PROJECT_DIR%\scripts\stop-dev-processes.ps1" >nul 2>&1
timeout /t 1 /nobreak >nul

echo [4/5] Backend source dev server, port 8080...
start "Backend" /D "%PROJECT_DIR%" /MIN cmd /k "title Backend && npm.cmd run dev:api"
echo  - Waiting for backend health...
for /l %%i in (1,1,30) do (
    powershell -NoProfile -Command "try { $r = Invoke-WebRequest -UseBasicParsing -Uri '%API_HEALTH_URL%' -TimeoutSec 2; if ($r.StatusCode -eq 200) { exit 0 } else { exit 1 } } catch { exit 1 }" >nul 2>&1
    if not errorlevel 1 goto api_ready
    timeout /t 1 /nobreak >nul
)
echo  - Backend health check timeout, continuing anyway
goto api_wait_done

:api_ready
echo  - Backend ready

:api_wait_done

echo [5/5] Frontend dev server, port 3000...
start "Frontend" /D "%PROJECT_DIR%" /MIN cmd /k "title Frontend && npm.cmd run dev:page"

echo Waiting 8 seconds...
timeout /t 8 /nobreak >nul
start "" "%APP_URL%"

echo.
echo ==============================
echo  DONE. Login: 123 / 123
echo ==============================
echo.
echo Backend uses source mode: npm run dev:api
echo Old dist/apis/server.js is no longer used.
echo.
pause
exit /b 0

:err
echo ERROR: Cannot find project directory: %PROJECT_DIR%
pause
exit /b 1

:err_db
echo ERROR: PostgreSQL is not ready. Please check D:\Software\data and port %DB_PORT%.
pause
exit /b 1
