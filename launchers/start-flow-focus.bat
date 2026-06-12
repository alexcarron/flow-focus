@echo off
setlocal

set PORT=4200
set URL=http://localhost:%PORT%

cd /d "%~dp0"

netstat -ano | findstr ":%PORT% " | findstr "LISTENING" >nul
if %errorlevel% neq 0 (
    start "FlowFocus Server" /min cmd /c "npm start"
    ping -n 4 127.0.0.1 >nul
)

start "" %URL%
