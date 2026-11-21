@echo off
cd /d %~dp0
set PORT=8787
echo MAKSTER AI 2.3 - FURNITURE CAD GEOMETRY
start "" http://localhost:8787
node dist\apps\core-api\src\server.js
pause
