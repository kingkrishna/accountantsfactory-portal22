@echo off
REM Zoho Quick Deployment Script for Windows
REM This helps prepare the deployment package on Windows before uploading to Zoho

setlocal enabledelayedexpansion

echo ================================
echo AccountantsFactory Zoho Deployment
echo ================================
echo.

REM Check if Node.js is installed
echo Checking prerequisites...
node --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Node.js not found. Please install Node.js 16+
    echo Download from: https://nodejs.org/
    pause
    exit /b 1
)

echo OK: Node.js is installed
npm --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: npm not found
    pause
    exit /b 1
)

echo OK: npm is installed
echo.

REM Navigate to API directory
echo Step 1: Installing backend dependencies...
cd api
if errorlevel 1 (
    echo ERROR: Cannot find api directory
    pause
    exit /b 1
)

echo Current directory: %cd%
echo.

REM Install dependencies
echo Step 2: Running npm install...
call npm install --production
if errorlevel 1 (
    echo ERROR: npm install failed
    pause
    exit /b 1
)

echo.
echo Step 3: Checking Prisma...
call npm list @prisma/client >nul 2>&1
if errorlevel 1 (
    echo ERROR: Prisma not installed
    pause
    exit /b 1
)

echo OK: Prisma installed
echo.

REM Create .env if it doesn't exist
echo Step 4: Setting up environment file...
if not exist .env (
    if exist .env.zoho.template (
        copy .env.zoho.template .env
        echo Created .env from template
        echo WARNING: Update .env with your Zoho credentials before deploying!
    )
)

echo.
echo ================================
echo Preparation Complete!
echo ================================
echo.
echo Next steps:
echo 1. Edit .env file with your Zoho credentials
echo 2. Create .zip archive of the entire project
echo 3. Upload to Zoho using their file manager
echo 4. On Zoho server, run: bash zoho-deploy.sh
echo.
echo For detailed instructions, see: ZOHO_DEPLOYMENT_GUIDE.md
echo.

pause
