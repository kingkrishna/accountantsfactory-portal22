@echo off
echo ========================================
echo Starting AccountantsFactory Backend Server
echo ========================================
echo.

REM Check if .env exists
if not exist .env (
    echo [ERROR] .env file not found!
    echo.
    echo Please create .env file first:
    echo 1. Copy .env.template to .env
    echo 2. Update the values in .env file
    echo.
    pause
    exit /b 1
)

REM Check if node_modules exists
if not exist node_modules (
    echo [INFO] Installing dependencies...
    call npm install
    echo.
)

echo [INFO] Starting server...
echo [INFO] Server will run on http://localhost:3000
echo [INFO] Press Ctrl+C to stop the server
echo.
echo ========================================
echo.

call npm run dev
