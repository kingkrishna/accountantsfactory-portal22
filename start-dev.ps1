# Start backend and open portal (development)
# Run from project root: .\start-dev.ps1

Set-Location $PSScriptRoot\api

Write-Host "Starting backend on http://localhost:3000 ..." -ForegroundColor Cyan
Write-Host "Portal login: http://localhost:3000/portal/login.html (or http://localhost:3000/)" -ForegroundColor Green
Write-Host "Opening browser in 4 seconds..." -ForegroundColor Gray
Start-Job -ScriptBlock { Start-Sleep -Seconds 4; Start-Process "http://localhost:3000/" } | Out-Null

npm run dev
