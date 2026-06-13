@echo off
setlocal

set PORT=5174
set URL=http://localhost:%PORT%/flow-focus/

cd /d "%~dp0\.."

netstat -ano | findstr ":%PORT% " | findstr "LISTENING" >nul
if %errorlevel% neq 0 (
    if not exist "node_modules" (
        echo Installing dependencies, this only happens once...
        call npm install
    )
    start "FlowFocus Dev Server" /min cmd /c "npm run dev"
    ping -n 6 127.0.0.1 >nul
)

start "" %URL%
