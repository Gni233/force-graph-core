@echo off
cd /d "%~dp0"
echo Starting Force Graph...
call npm run electron:dev
pause
