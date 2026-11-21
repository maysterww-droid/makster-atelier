@echo off
cd /d "%~dp0"
node --test dist\tests\*.test.js
pause
