@echo off
cd /d "%~dp0.."
where ffmpeg >nul 2>nul || (echo FFmpeg is required & pause & exit /b 1)
where ffprobe >nul 2>nul || (echo FFprobe is required & pause & exit /b 1)
echo Starting Makster Local Render Agent...
python local-render-agent\agent.py
pause
