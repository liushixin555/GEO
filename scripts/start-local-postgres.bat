@echo off
setlocal
set "ROOT=%~dp0.."
set "PGROOT=%ROOT%\.local\postgresql-17.10\pgsql"
set "PGDATA=%ROOT%\.local\pgdata"
set "PGLOG=%ROOT%\.local\postgres.log"
set "PATH=%PGROOT%\bin;%PATH%"

if not exist "%PGDATA%" (
  echo PostgreSQL data directory not found: %PGDATA%
  exit /b 1
)

postgres.exe -D "%PGDATA%" -p 5432 >> "%PGLOG%" 2>&1
