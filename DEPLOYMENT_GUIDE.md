# Deployment Guide - Git & Vercel

## Prerequisites

1. **Install Git** (if not already installed)
   - Download from: https://git-scm.com/download/win
   - Run installer with default options
   - Restart terminal/IDE after installation

2. **GitHub Account**
   - Create at: https://github.com/signup

3. **Vercel Account**
   - Will be created during deployment (uses GitHub login)

---

## Step 1: Initialize Git Repository

After Git is installed, run these commands in your project directory:

```bash
# Initialize Git repository
git init

# Configure Git (replace with your name and email)
git config user.name "Your Name"
git config user.email "your.email@example.com"

# Check status
git status
```

---

## Step 2: Create .env.example (Template)

Create a `.env.example` file with:
```
VITE_SUPABASE_URL=your_supabase_url_here
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key_here
```

**Note:** Your actual `.env` file is already in `.gitignore` and won't be committed.

---

## Step 3: Initial Commit

```bash
# Add all files
git add .

# Create initial commit
git commit -m "Initial commit - EVZIP Ops Console"

# Verify .env files are NOT included (should not appear in git status)
git status
```

---

## Step 4: Create GitHub Repository

1. Go to https://github.com/new
2. Repository name: `evzip-ops-console` (or your preferred name)
3. Description: "EVZIP Bookings Management System"
4. Choose Public or Private
5. **DO NOT** initialize with README, .gitignore, or license
6. Click "Create repository"

---

## Step 5: Push to GitHub

After creating the repository, GitHub will show you commands. Use these:

```bash
# Add remote (replace YOUR_USERNAME with your GitHub username)
git remote add origin https://github.com/YOUR_USERNAME/evzip-ops-console.git

# Rename branch to main (if needed)
git branch -M main

# Push to GitHub
git push -u origin main
```

---

## Step 6: Deploy to Vercel

### Option A: Via Vercel Dashboard (Recommended)

1. Go to https://vercel.com
2. Click "Sign Up" → Choose "Continue with GitHub"
3. Authorize Vercel to access your GitHub account
4. Click "Add New Project"
5. Import your repository (`evzip-ops-console`)
6. Configure project:
   - **Framework Preset:** Vite (should auto-detect)
   - **Root Directory:** `./` (default)
   - **Build Command:** `npm run build` (auto-detected)
   - **Output Directory:** `dist` (auto-detected)
   - **Install Command:** `npm install` (auto-detected)

7. **Add Environment Variables:**
   - Click "Environment Variables"
   - Add:
     - **Name:** `VITE_SUPABASE_URL`
       **Value:** Your actual Supabase URL
       **Environments:** Select all (Production, Preview, Development)
     - **Name:** `VITE_SUPABASE_ANON_KEY`
       **Value:** Your actual Supabase Anon Key
       **Environments:** Select all (Production, Preview, Development)

8. Click "Deploy"

### Option B: Via Vercel CLI

```bash
# Install Vercel CLI globally
npm i -g vercel

# Login to Vercel
vercel login

# Deploy (from project directory)
vercel

# Follow prompts, then add environment variables:
vercel env add VITE_SUPABASE_URL
vercel env add VITE_SUPABASE_ANON_KEY

# Deploy to production
vercel --prod
```

---

## Step 7: Configure Vercel for React Router

Create `vercel.json` in project root:

```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "devCommand": "npm run dev",
  "installCommand": "npm install",
  "framework": "vite",
  "rewrites": [
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ]
}
```

Then commit and push:
```bash
git add vercel.json
git commit -m "Add Vercel configuration"
git push
```

Vercel will automatically redeploy.

---

## Step 8: Get Your Deployment URL

After deployment, Vercel provides:
- **Production URL:** `https://your-project-name.vercel.app`
- **Preview URLs:** For each pull request

---

## Important Notes

### Environment Variables
- Must be added in Vercel Dashboard → Project → Settings → Environment Variables
- After adding/changing env vars, **redeploy** the project
- Variables starting with `VITE_` are available at build time

### Automatic Deployments
- Every push to `main` branch → **Production deployment**
- Every pull request → **Preview deployment**
- You can also trigger manual deployments from dashboard

### Database Configuration
- Ensure Supabase allows requests from your Vercel domain
- Check Supabase Dashboard → Settings → API → CORS settings
- Add your Vercel domain to allowed origins if needed

### Custom Domain (Optional)
1. Go to Vercel Dashboard → Project → Settings → Domains
2. Add your custom domain
3. Follow DNS configuration instructions

---

## Troubleshooting

### Build Fails
- Check build logs in Vercel dashboard
- Ensure all dependencies are in `package.json`
- Check for TypeScript errors: `npm run build` locally

### Environment Variables Not Working
- Ensure variables start with `VITE_`
- Redeploy after adding/changing variables
- Check variable names match exactly (case-sensitive)

### Routing Issues (404 on refresh)
- Ensure `vercel.json` has the rewrite rule
- Check that `outputDirectory` is set to `dist`

### CORS Errors
- Update Supabase CORS settings
- Add Vercel domain to allowed origins in Supabase dashboard

---

## Quick Checklist

- [ ] Git installed and configured
- [ ] Git repository initialized (`git init`)
- [ ] Code committed (`git commit`)
- [ ] GitHub repository created
- [ ] Code pushed to GitHub (`git push`)
- [ ] Vercel account created (via GitHub)
- [ ] Project imported from GitHub
- [ ] Environment variables added in Vercel
- [ ] Build settings configured (Vite)
- [ ] `vercel.json` created (for routing)
- [ ] Deployed successfully
- [ ] Tested live URL

---

## Next Steps After Deployment

1. **Test the live application**
   - Verify all features work
   - Check environment variables are loaded correctly

2. **Set up custom domain** (optional)
   - Add domain in Vercel dashboard
   - Configure DNS records

3. **Monitor deployments**
   - Check Vercel dashboard for deployment status
   - Review build logs if issues occur

4. **Set up branch protection** (optional)
   - Protect `main` branch in GitHub
   - Require pull request reviews before merging

---

## Support

If you encounter issues:
1. Check Vercel deployment logs
2. Check browser console for errors
3. Verify environment variables are set correctly
4. Ensure Supabase CORS settings allow your domain

