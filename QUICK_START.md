# Quick Start - Push to GitHub

Your repository is ready at: **https://github.com/upendra333/EVZIP-SMARO.git**

## Prerequisites

1. **Install Git** (if not installed)
   - Download: https://git-scm.com/download/win
   - Install with default options
   - **Restart your terminal/IDE after installation**

## Quick Setup Commands

After Git is installed, run these commands in your project directory:

### 1. Configure Git (one-time setup)
```bash
git config user.name "Your Name"
git config user.email "your.email@example.com"
```

### 2. Initialize and Connect to GitHub
```bash
# Initialize Git repository
git init

# Add remote repository
git remote add origin https://github.com/upendra333/EVZIP-SMARO.git

# Check status
git status
```

### 3. Commit and Push
```bash
# Stage all files
git add .

# Create initial commit
git commit -m "Initial commit - EVZIP Ops Console"

# Set main branch
git branch -M main

# Push to GitHub
git push -u origin main
```

## Alternative: Use the Setup Script

I've created a PowerShell script (`setup-git.ps1`) that automates most of this:

```powershell
# After Git is installed, run:
.\setup-git.ps1
```

Then follow the prompts and complete the remaining steps.

## Verify

After pushing, check your repository:
- Go to: https://github.com/upendra333/EVZIP-SMARO
- You should see all your files there

## Next Step: Deploy to Vercel

After your code is on GitHub, follow the deployment guide:
- See `DEPLOYMENT_GUIDE.md` for Vercel deployment instructions

---

**Note:** Make sure your `.env` file is NOT committed (it's already in `.gitignore`)

