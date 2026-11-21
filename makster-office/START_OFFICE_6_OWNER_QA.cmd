@echo off
chcp 65001 >nul
cd /d "%~dp0"
set PORT=8796
echo MAKSTER Office 6.0 - isolated OWNER QA
echo No publishing. No paid AI. Production credentials are not used.
echo Open http://127.0.0.1:8796/
start "" http://127.0.0.1:8796/
node scripts\smm-preview.mjs
pause
