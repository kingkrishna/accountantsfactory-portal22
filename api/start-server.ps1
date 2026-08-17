# PowerShell script to start backend server

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Starting AccountantsFactory Backend Server" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check if .env exists
if (-not (Test-Path .env)) {
    Write-Host "[ERROR] .env file not found!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Please create .env file first:" -ForegroundColor Yellow
    Write-Host "1. Copy .env.template to .env" -ForegroundColor Yellow
    Write-Host "2. Update the values in .env file" -ForegroundColor Yellow
    Write-Host ""
    Read-Host "Press Enter to exit"
    exit 1
}

# Check if node_modules exists
if (-not (Test-Path node_modules)) {
    Write-Host "[INFO] Installing dependencies..." -ForegroundColor Yellow
    npm install
    Write-Host ""
}

Write-Host "[INFO] Starting server..." -ForegroundColor Green
Write-Host "[INFO] Server will run on http://localhost:3000" -ForegroundColor Green
Write-Host "[INFO] Press Ctrl+C to stop the server" -ForegroundColor Yellow
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

npm run dev
