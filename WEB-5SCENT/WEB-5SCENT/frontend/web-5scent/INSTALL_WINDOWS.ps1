# Windows PowerShell Installation Script for Next.js 16
# Run this script in PowerShell: .\INSTALL_WINDOWS.ps1

Write-Host "🧹 Cleaning previous installation..." -ForegroundColor Yellow

# Remove node_modules
if (Test-Path "node_modules") {
    Remove-Item -Recurse -Force "node_modules"
    Write-Host "✓ Removed node_modules" -ForegroundColor Green
}

# Remove package-lock.json
if (Test-Path "package-lock.json") {
    Remove-Item -Force "package-lock.json"
    Write-Host "✓ Removed package-lock.json" -ForegroundColor Green
}

# Remove .next build folder
if (Test-Path ".next") {
    Remove-Item -Recurse -Force ".next"
    Write-Host "✓ Removed .next" -ForegroundColor Green
}

Write-Host "`n📦 Installing dependencies..." -ForegroundColor Yellow
npm install --legacy-peer-deps

if ($LASTEXITCODE -eq 0) {
    Write-Host "`n✅ Installation complete!" -ForegroundColor Green
    Write-Host "`n📋 Verifying versions..." -ForegroundColor Yellow
    npm list next react react-dom --depth=0
    
    Write-Host "`n🚀 You can now run: npm run dev" -ForegroundColor Cyan
} else {
    Write-Host "`n❌ Installation failed. Please check the errors above." -ForegroundColor Red
}


