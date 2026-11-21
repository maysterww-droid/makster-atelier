@echo off
chcp 65001 >nul
cd /d %~dp0
set PORT=8787
echo.
echo MAKSTER AI 2.5 - PRO ENGINEERING MERGE
echo Kitchen CAD / Engineering / Quote / Contract / Change Order / Production
echo Open http://localhost:8787
start "" http://localhost:8787
node dist\apps\core-api\src\server.js
pause
