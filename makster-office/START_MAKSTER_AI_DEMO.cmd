@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo.
echo MAKSTER AI 5.6.0 - PRODUCTION HARDENING + RELEASE GATE
echo Press Ctrl+C here to stop the server.
echo.
start "" http://localhost:8787
node dist\apps\core-api\src\server.js
pause
