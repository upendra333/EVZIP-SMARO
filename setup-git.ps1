# Git Setup Script for EVZIP Ops Console
# Run this script after installing Git from https://git-scm.com/download/win

Write-Host "=== EVZIP Ops Console - Git Setup ===" -ForegroundColor Cyan
Write-Host ""

# Check if Git is installed
try {
    $gitVersion = git --version
    Write-Host "✓ Git is installed: $gitVersion" -ForegroundColor Green
} catch {
    Write-Host "✗ Git is not installed!" -ForegroundColor Red
    Write-Host "Please install Git from: https://git-scm.com/download/win" -ForegroundColor Yellow
    Write-Host "After installation, restart your terminal and run this script again." -ForegroundColor Yellow
    exit 1
}

Write-Host ""
Write-Host "Step 1: Initializing Git repository..." -ForegroundColor Cyan

# Initialize Git repository
if (Test-Path .git) {
    Write-Host "✓ Git repository already initialized" -ForegroundColor Green
} else {
    git init
    Write-Host "✓ Git repository initialized" -ForegroundColor Green
}

Write-Host ""
Write-Host "Step 2: Checking Git configuration..." -ForegroundColor Cyan

# Check if user name and email are configured
$userName = git config user.name
$userEmail = git config user.email

if (-not $userName) {
    Write-Host "⚠ Git user.name is not configured" -ForegroundColor Yellow
    Write-Host "Run: git config user.name 'Your Name'" -ForegroundColor Yellow
}

if (-not $userEmail) {
    Write-Host "⚠ Git user.email is not configured" -ForegroundColor Yellow
    Write-Host "Run: git config user.email 'your.email@example.com'" -ForegroundColor Yellow
}

if ($userName -and $userEmail) {
    Write-Host "✓ Git configured: $userName <$userEmail>" -ForegroundColor Green
}

Write-Host ""
Write-Host "Step 3: Adding remote repository..." -ForegroundColor Cyan

# Add remote repository
$remoteUrl = "https://github.com/upendra333/EVZIP-SMARO.git"
$existingRemote = git remote get-url origin 2>$null

if ($existingRemote) {
    Write-Host "✓ Remote 'origin' already exists: $existingRemote" -ForegroundColor Green
    Write-Host "Do you want to update it to: $remoteUrl ? (y/n)" -ForegroundColor Yellow
    $response = Read-Host
    if ($response -eq 'y' -or $response -eq 'Y') {
        git remote set-url origin $remoteUrl
        Write-Host "✓ Remote updated" -ForegroundColor Green
    }
} else {
    git remote add origin $remoteUrl
    Write-Host "✓ Remote 'origin' added: $remoteUrl" -ForegroundColor Green
}

Write-Host ""
Write-Host "Step 4: Checking files to commit..." -ForegroundColor Cyan

# Check git status
git status --short

Write-Host ""
Write-Host "=== Next Steps ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "1. Configure Git (if not already done):" -ForegroundColor Yellow
Write-Host "   git config user.name 'Your Name'" -ForegroundColor White
Write-Host "   git config user.email 'your.email@example.com'" -ForegroundColor White
Write-Host ""
Write-Host "2. Stage all files:" -ForegroundColor Yellow
Write-Host "   git add ." -ForegroundColor White
Write-Host ""
Write-Host "3. Create initial commit:" -ForegroundColor Yellow
Write-Host "   git commit -m 'Initial commit - EVZIP Ops Console'" -ForegroundColor White
Write-Host ""
Write-Host "4. Push to GitHub:" -ForegroundColor Yellow
Write-Host "   git branch -M main" -ForegroundColor White
Write-Host "   git push -u origin main" -ForegroundColor White
Write-Host ""
Write-Host "=== Setup Complete ===" -ForegroundColor Green

