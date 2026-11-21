@echo off
cd /d "%~dp0"
title MAKSTER 2.6 - STAGING ACCEPTANCE V3
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0VERIFY_MAKSTER_STAGING_2_6.ps1"
echo.
echo ------------------------------------------------------------
echo Look for: STAGING ACCEPTANCE: PASS
echo If FAIL, take a photo of this window and send it to ChatGPT.
echo ------------------------------------------------------------
pause
