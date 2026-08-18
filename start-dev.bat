@echo off
cd /d "%~dp0api"
echo Starting backend on http://localhost:3000 ...
echo Portal login: http://localhost:3000/portal/login.html
echo.
npm run dev
pause
