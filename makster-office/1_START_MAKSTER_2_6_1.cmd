@echo off
setlocal
cd /d "%~dp0"
set PORT=8787
start "Makster AI 2.6.1" cmd /k node dist\apps\core-api\src\server.js
ping 127.0.0.1 -n 3 >nul
start "" http://localhost:8787
endlocal
