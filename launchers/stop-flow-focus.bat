@echo off
setlocal

cd /d "%~dp0"

echo FlowFocus is served by the shared Local Web Apps hub on port 4200.
echo Stopping it will also stop every other app served from the hub.
echo.

call "..\..\hub\stop-hub.bat"
