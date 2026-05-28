@echo off
setlocal
for %%I in ("%~dp0..") do set "ROOT=%%~fI"
set "UPLOAD_DIR=%ROOT%\uploads"
cd /d "%ROOT%"
node "%ROOT%\node_modules\ts-node\dist\bin.js" --project tsconfig.api.json apis/server.ts > "%ROOT%\dev-api.out.log" 2> "%ROOT%\dev-api.err.log"
