@echo off
chcp 65001 >nul
cd /d %~dp0
set PORT=8787

echo.
echo MAKSTER AI 2.6.0 - PERSISTENT UNIFIED CORE
echo CAD / Kitchen Engineering / Quote / Contract / Change Order / Production Gate
echo.
echo Business persistence mode is selected from environment:
echo   Supabase = SUPABASE_URL + SUPABASE_PUBLISHABLE_KEY + SUPABASE_SECRET_KEY
echo   Local fallback = memory

echo Open http://localhost:8787
start "" http://localhost:8787
node dist\apps\core-api\src\server.js
pause
