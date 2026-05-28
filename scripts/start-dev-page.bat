@echo off
setlocal
for %%I in ("%~dp0..") do set "ROOT=%%~fI"
cd /d "%ROOT%"
node "%ROOT%\node_modules\vite\bin\vite.js" --config vite.config.ts --host 127.0.0.1 --port 5173 > "%ROOT%\dev-page.out.log" 2> "%ROOT%\dev-page.err.log"
