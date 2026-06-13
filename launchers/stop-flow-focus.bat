@echo off
setlocal

set PORT=5174
set FOUND=0

for /f "tokens=5" %%P in ('netstat -ano ^| findstr ":%PORT% " ^| findstr "LISTENING"') do (
    taskkill /F /PID %%P >nul 2>&1
    set FOUND=1
)

if "%FOUND%"=="1" (
    echo FlowFocus dev server stopped.
) else (
    echo FlowFocus dev server is not running.
)

pause
