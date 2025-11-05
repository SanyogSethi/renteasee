# 🚀 Step-by-Step Deployment Guide for RentEase

## ✅ Prerequisites (Already Done!)
- ✅ MongoDB Atlas configured
- ✅ Connection string saved in `.env`
- ✅ Code ready for deployment

---

## 🎯 PART 1: Deploy Backend to Railway

### Step 1: Create Railway Account
1. Go to: https://railway.app
2. Click **"Login"** → **"Sign Up with GitHub"** (recommended)
   - This connects your GitHub account
   - Makes deployment easier

### Step 2: Create New Project
1. After logging in, click **"New Project"**
2. Select **"Deploy from GitHub repo"**
3. **If your code is on GitHub:**
   - Select your repository: `SE_Rebuild` (or your repo name)
   - Railway will auto-detect Node.js
4. **If your code is NOT on GitHub yet:**
   - Option A: Push to GitHub first (recommended)
     ```bash
     git init
     git add .
     git commit -m "Initial commit"
     git remote add origin YOUR_GITHUB_REPO_URL
     git push -u origin main
     ```
   - Option B: Use Railway CLI (see alternative below)

### Step 3: Configure Railway Settings
Once your project is created:

1. **Click on your project** → **Settings**
2. **Root Directory:** Leave empty (project root is fine)
3. **Build Command:** `npm install`
4. **Start Command:** `node server/index.js`

### Step 4: Add Environment Variables
In Railway dashboard:

1. Go to your project → **Variables** tab
2. Click **"New Variable"** and add these one by one:

   **Variable 1:**
   - Name: `MONGODB_URI`
   - Value: `mongodb+srv://rentease_user:2HUMVFlUaBkjcCUo@cluster0.pwawsrk.mongodb.net/rentease?appName=Cluster0`
   - Click **"Add"**

   **Variable 2:**
   - Name: `JWT_SECRET`
   - Value: (Generate one: run `openssl rand -base64 32` in terminal)
   - Click **"Add"**

   **Variable 3:**
   - Name: `PORT`
   - Value: `5050`
   - Click **"Add"**

   **Variable 4:**
   - Name: `CLIENT_URL`
   - Value: `http://localhost:5173` (we'll update this after deploying frontend)
   - Click **"Add"**

### Step 5: Deploy
1. Railway will automatically deploy when you push to GitHub
2. OR click **"Deploy"** button in Railway dashboard
3. Wait for build to complete (2-3 minutes)
4. Once deployed, Railway will give you a URL like: `https://your-app.railway.app`

### Step 6: Get Your Backend URL
1. Go to your project → **Settings** → **Networking**
2. Copy your **Public Domain** (e.g., `https://rentease-backend.railway.app`)
3. **Save this URL** - you'll need it for frontend!

---

## 🎯 PART 2: Deploy Frontend to Vercel

### Step 1: Create Vercel Account
1. Go to: https://vercel.com
2. Click **"Sign Up"** → **"Continue with GitHub"**
3. Authorize Vercel to access your GitHub

### Step 2: Create New Project
1. Click **"Add New"** → **"Project"**
2. Import your GitHub repository: `SE_Rebuild`
3. **Configure Project:**
   - **Framework Preset:** Vite (should auto-detect)
   - **Root Directory:** `client` (IMPORTANT!)
   - **Build Command:** `npm run build` (should auto-fill)
   - **Output Directory:** `dist` (should auto-fill)
   - **Install Command:** `npm install`

### Step 3: Add Environment Variable
Before deploying, add environment variable:

1. In Vercel project settings → **Environment Variables**
2. Click **"Add New"**
3. **Name:** `VITE_API_URL`
4. **Value:** `https://your-backend.railway.app/api` (replace with your Railway URL)
5. **Environment:** Production, Preview, Development (select all)
6. Click **"Save"**

### Step 4: Deploy
1. Click **"Deploy"**
2. Wait for build (1-2 minutes)
3. Vercel will give you a URL like: `https://rentease.vercel.app`

### Step 5: Get Your Frontend URL
1. Copy your Vercel URL (e.g., `https://rentease.vercel.app`)
2. **Save this URL**

---

## 🔄 PART 3: Update Backend with Frontend URL

### Step 1: Update Railway Environment Variables
1. Go back to Railway dashboard
2. Your project → **Variables** tab
3. Find `CLIENT_URL` variable
4. Click **"Edit"**
5. Change value to your Vercel URL: `https://rentease.vercel.app`
6. Click **"Save"**
7. Railway will automatically redeploy with new settings

---

## ✅ PART 4: Test Your Deployment

### Test Backend:
```bash
curl https://your-backend.railway.app/api/properties
```
Should return properties (or empty array if no properties)

### Test Frontend:
1. Open your Vercel URL in browser
2. Try logging in/registering
3. Check if API calls work

---

## 🎉 You're Live!

Your app should now be accessible at:
- **Frontend:** `https://rentease.vercel.app`
- **Backend:** `https://your-backend.railway.app`

---

## 🔧 Alternative: Railway CLI (If Not Using GitHub)

If you prefer using Railway CLI:

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login
railway login

# Initialize project
railway init

# Add environment variables
railway variables set MONGODB_URI="mongodb+srv://rentease_user:2HUMVFlUaBkjcCUo@cluster0.pwawsrk.mongodb.net/rentease?appName=Cluster0"
railway variables set JWT_SECRET="your-secret-key"
railway variables set PORT="5050"
railway variables set CLIENT_URL="your-frontend-url"

# Deploy
railway up
```

---

## 📝 Quick Checklist

- [ ] Railway account created
- [ ] Backend deployed to Railway
- [ ] Environment variables added to Railway
- [ ] Backend URL copied
- [ ] Vercel account created
- [ ] Frontend deployed to Vercel
- [ ] `VITE_API_URL` set in Vercel
- [ ] Frontend URL copied
- [ ] `CLIENT_URL` updated in Railway
- [ ] Tested both frontend and backend

---

## 🆘 Troubleshooting

**Backend not connecting to MongoDB:**
- Check `MONGODB_URI` in Railway variables
- Verify Network Access in MongoDB Atlas allows `0.0.0.0/0`

**Frontend can't reach backend:**
- Check `VITE_API_URL` in Vercel (should end with `/api`)
- Verify CORS settings in backend

**Build fails:**
- Check Railway/Vercel logs for errors
- Ensure all dependencies are in `package.json`

---

**Ready? Start with Step 1: Create Railway Account!** 🚀

