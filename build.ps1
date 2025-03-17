# Arrêter le script si une erreur survient
$ErrorActionPreference = "Stop"

Write-Host "=== Starting build process ===" -ForegroundColor Cyan

# Build Next.js app
Write-Host "Building Next.js app..." -ForegroundColor Green
Set-Location -Path frontend
npm install
npm run build

Write-Host "=== Preparing static files ===" -ForegroundColor Cyan
# Clean and create static directory
if (Test-Path -Path "../backend/static") {
    Write-Host "Removing old static directory..." -ForegroundColor Yellow
    Remove-Item -Recurse -Force ../backend/static
}

Write-Host "Creating new static directory..." -ForegroundColor Green
New-Item -ItemType Directory -Force -Path ../backend/static | Out-Null

# Copy the exported Next.js app to Flask static directory
Write-Host "Copying files to static directory..." -ForegroundColor Green
Copy-Item -Recurse -Force out/* ../backend/static/

# Verify the copy
Write-Host "=== Verifying static files ===" -ForegroundColor Cyan
if (-not (Test-Path -Path "../backend/static/index.html")) {
    Write-Host "ERROR: index.html not found in static directory!" -ForegroundColor Red
    exit 1
}

Write-Host "Contents of static directory:" -ForegroundColor Green
Get-ChildItem -Path ../backend/static | Format-Table Name, Length, LastWriteTime

Write-Host "=== Build complete ===" -ForegroundColor Cyan