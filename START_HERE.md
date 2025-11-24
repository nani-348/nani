# 👋 START HERE

Welcome to your macOS Simulator! This is your complete setup guide.

## 🎯 What is This?

This is a fully functional macOS-style desktop simulator with AI-powered apps built using React, TypeScript, and Google's Gemini AI.

## ⚡ Quick Start (Choose Your Path)

### 🏃 I Want to Run It NOW (5 minutes)

1. **Get an API key** (free): https://aistudio.google.com/app/apikey

2. **Add it to `.env.local`**:
   ```bash
   # Open .env.local and replace with your key:
   API_KEY=your_actual_key_here
   ```

3. **Run it**:
   ```bash
   npm run dev
   ```

4. **Open**: http://localhost:5173

**Done!** 🎉

---

### 🌐 I Want to Deploy to GitHub (10 minutes)

1. **Do the Quick Start above first** ☝️

2. **Create a GitHub repo**: https://github.com/new

3. **Push your code**:
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
   git push -u origin main
   ```

4. **Add API key secret**:
   - Go to repo Settings → Secrets and variables → Actions
   - New repository secret: `GEMINI_API_KEY` = your key

5. **Enable Pages**:
   - Settings → Pages → Source: GitHub Actions

6. **Wait 3 minutes** → Your site is live! 🚀

**URL**: `https://YOUR_USERNAME.github.io/YOUR_REPO/`

---

## 📚 Detailed Deployment Guide

### Prerequisites
- Node.js 18+ installed
- Git installed
- GitHub account
- Gemini API key

### Step-by-Step Deployment

#### 1. Prepare Your Repository
```bash
# Initialize git if not already done
git init

# Add all files
git add .

# Commit your changes
git commit -m "Initial commit: macOS Simulator"

# Create main branch
git branch -M main

# Add your GitHub repository as remote
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git

# Push to GitHub
git push -u origin main
```

#### 2. Configure GitHub Secrets
1. Go to your GitHub repository
2. Click **Settings** tab
3. In the left sidebar: **Secrets and variables** → **Actions**
4. Click **New repository secret**
5. Name: `GEMINI_API_KEY`
6. Value: Paste your actual Gemini API key
7. Click **Add secret**

#### 3. Enable GitHub Pages
1. Still in Settings, click **Pages** in the left sidebar
2. Under "Build and deployment":
   - Source: Select **GitHub Actions**
3. The workflow will automatically run

#### 4. Monitor Deployment
1. Go to the **Actions** tab
2. Watch the workflow run (takes 2-5 minutes)
3. Once complete, your site is live!

### Troubleshooting

**Build fails?**
- Check that `GEMINI_API_KEY` secret is set correctly
- Verify the secret name matches exactly
- Re-run the workflow from Actions tab

**404 error on deployed site?**
- Wait 5 minutes for DNS propagation
- Clear browser cache
- Check that Pages source is "GitHub Actions"

**API features don't work?**
- Verify API key is valid at https://aistudio.google.com/
- Check browser console for errors (F12)
- Monitor API usage limits

---

## 🎮 What Can I Do With This?

Once running, you can:

- 📊 Generate PowerPoint presentations with AI
- 📝 Write documents with AI assistance
- 📈 Create spreadsheets with AI-generated data
- 🎥 Generate videos from images
- 🎨 Edit images with AI
- 💼 Create portfolios from resumes
- 🗣️ Use voice assistant
- 🌐 Browse the web
- 📁 Manage files
- ⌨️ Create keyboard shortcuts
- And more!

---

## ❓ Common Questions

**Q: Do I need to pay for anything?**
A: No! Gemini API has a free tier. Just sign up at https://aistudio.google.com/

**Q: Can I use this without deploying?**
A: Yes! Just run `npm run dev` and use it locally.

**Q: Is my API key safe?**
A: Yes! It's in `.env.local` which is not committed to git. For deployment, use GitHub Secrets.

**Q: Can I customize it?**
A: Absolutely! Modify the code however you like.

**Q: Does it work on mobile?**
A: Yes! The app is fully responsive.

---

## 🆘 Something Not Working?

### App won't start?
```bash
# Try this:
rm -rf node_modules
npm install
npm run dev
```

### API features not working?
- Check your API key is correct in `.env.local`
- Verify it's active at https://aistudio.google.com/

### Build fails?
```bash
# Check for errors:
npm run build
```

### Still stuck?
- Check the documentation files
- Look at GitHub Actions logs (for deployment)
- Open browser console (F12) for errors

---

## ✅ Quick Checklist

Before you start:

- [ ] Node.js 18+ installed
- [ ] Got Gemini API key
- [ ] Added key to `.env.local`
- [ ] Ran `npm install` (already done)

To deploy:

- [ ] GitHub account created
- [ ] New repo created
- [ ] Code pushed to GitHub
- [ ] API key added as secret
- [ ] GitHub Pages enabled

---

## 🎯 Your Next Steps

1. **Right now**: Add your API key to `.env.local`
2. **In 2 minutes**: Run `npm run dev` and explore
3. **In 10 minutes**: Deploy to GitHub Pages
4. **Later**: Customize and make it your own!

---

## 💡 Pro Tips

- Use `Cmd/Ctrl + ↓` to see all windows (Exposé)
- Try the PowerPoint app first - it's impressive!
- Drag files from File Manager to desktop
- Create shortcuts for your favorite apps
- Works great on mobile too!

---

## 🎉 Ready?

**Pick your path above and let's go!**

Need the complete guide? → **[GET_STARTED.md](GET_STARTED.md)**

---

**Happy coding! 🚀**
