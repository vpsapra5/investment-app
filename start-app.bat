@echo off
set PATH=C:\Program Files\nodejs;%PATH%
cd /d "%~dp0"
echo ===================================================
echo ⚡ Starting Investment App - Smart Money & Stock Intelligence...
echo ===================================================
start "" "http://localhost:3456"
node server.js
pause
