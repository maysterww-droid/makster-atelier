@echo off
cd /d "%~dp0"
call npm run worker:once
pause
