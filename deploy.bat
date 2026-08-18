@echo off
REM One-shot deploy: login if needed, then push both frontend + backend.
REM Run this from a normal cmd/PowerShell window (not a piped shell).

cd /d "%~dp0"

echo.
echo ============================================================
echo  AccountantsFactory - Zoho Catalyst Deploy
echo ============================================================
echo.

REM Step 1: verify we are authed; if not, login interactively
catalyst whoami >nul 2>&1
if errorlevel 1 (
  echo [1/3] Not logged in. Opening browser for Zoho sign-in...
  echo       Answer Y to telemetry, then accept the browser prompt.
  echo.
  catalyst login
  if errorlevel 1 (
    echo.
    echo X  Login failed. Bailing.
    exit /b 1
  )
) else (
  echo [1/3] Already logged in as:
  catalyst whoami
)

echo.

REM Step 2: verify we can see the project (catches stale refresh tokens)
echo [2/3] Verifying project access...
catalyst project:list >nul 2>&1
if errorlevel 1 (
  echo.
  echo X  Refresh token is stale. Forcing a fresh login...
  echo    (You'll need to accept the browser prompt again.)
  echo.
  del "%APPDATA%\zcatalyst-cli-nodejs\Config\zcatalyst-cli.json" 2>nul
  catalyst login
  if errorlevel 1 (
    echo X  Re-login failed. Bailing.
    exit /b 1
  )
)
echo     OK.
echo.

REM Step 3: deploy frontend first (safer), then backend
echo [3/3] Deploying frontend (web/)...
call catalyst deploy --only client
if errorlevel 1 (
  echo X  Frontend deploy failed.
  exit /b 1
)
echo.

echo     Deploying backend (api/)...
call catalyst deploy --only appsail
if errorlevel 1 (
  echo X  Backend deploy failed.
  exit /b 1
)

echo.
echo ============================================================
echo  Deploy complete.  Visit:
echo  https://accountantsfactory1-60063314772.development.catalystserverless.in
echo ============================================================
