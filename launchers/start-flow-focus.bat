@echo off
setlocal

set PORT=4200
set URL=http://localhost:%PORT%/flow-focus

cd /d "%~dp0"

netstat -ano | findstr ":%PORT% " | findstr "LISTENING" >nul
if %errorlevel% neq 0 (
    call "..\..\hub\start-hub.bat"
    ping -n 4 127.0.0.1 >nul
)

start "" %URL%
