@echo off

:: Start the JSON server
json-server --watch json-server/tasksDatabase.json --port 3004

:: Wait a moment to ensure the server starts
timeout /t 5

:: Start the SSH tunnel
ssh -R 80:localhost:3004 ssh.localhost.run
