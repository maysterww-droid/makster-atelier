@echo off
setlocal
cd /d "%~dp0"
set PORT=8787
node dist\apps\core-api\src\server.js
