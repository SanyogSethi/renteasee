# RentEase Deployment Guide

## 🚀 Deployment Options for Small Load (10-20 requests)

### **Recommended Stack:**
- **Frontend**: Vercel (Free tier, best for React)
- **Backend**: Railway or Render (Free/low-cost tiers)
- **Database**: MongoDB Atlas (Free tier - 512MB)
- **File Storage**: Railway/Render (included) or Cloudinary (free tier)

---

## 📋 Pre-Deployment Checklist

### 1. **MongoDB Atlas Setup (FREE)**

**Why Cloud MongoDB?**
- Local MongoDB won't work on production servers
- MongoDB Atlas free tier provides reliable cloud database
- Automatic backups and scaling

**Steps:**
1. Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas/register)
2. Create a free account
3. Create a new cluster (Free M0 tier)
4. Create a database user (remember username/password)
5. Whitelist IP address: `0.0.0.0/0` (allows all IPs - for production)
6. Get connection string: `mongodb+srv://username:password@cluster.mongodb.net/rentease?retryWrites=true&w=majority`

---

## 🎯 Option 1: Railway Deployment (Recommended - Easiest)

### **Backend on Railway:**

1. **Install Railway CLI:**
   ```bash
   npm install -g @railway/cli
   railway login
   ```

2. **Initialize Railway:**
   ```bash
   cd /Users/sanyog/Labs/SE_Rebuild
   railway init
   ```

3. **Set Environment Variables in Railway Dashboard:**
   - `MONGODB_URI`: Your MongoDB Atlas connection string
   - `JWT_SECRET`: Random secret string (use: `openssl rand -base64 32`)
   - `CLIENT_URL`: Your frontend URL (will be set after deploying frontend)
   - `PORT`: Railway auto-sets this, but you can use `5050`

4. **Deploy:**
   ```bash
   railway up
   ```

### **Frontend on Vercel:**

1. **Install Vercel CLI:**
   ```bash
   npm install -g vercel
   ```

2. **Go to client directory:**
   ```bash
   cd client
   ```

3. **Deploy:**
   ```bash
   vercel --prod
   ```

4. **Set Environment Variable in Vercel Dashboard:**
   - `VITE_API_URL`: Your Railway backend URL (e.g., `https://your-app.railway.app/api`)

5. **Update Railway `CLIENT_URL`** with your Vercel URL

---

## 🎯 Option 2: Render Deployment

### **Backend on Render:**

1. Go to [Render](https://render.com)
2. Create account (free tier available)
3. Click "New +" → "Web Service"
4. Connect your GitHub repository
5. Settings:
   - **Name**: rentease-backend
   - **Root Directory**: (leave empty)
   - **Environment**: Node
   - **Build Command**: `npm install`
   - **Start Command**: `node server/index.js`
   - **Environment Variables**:
     - `MONGODB_URI`: Your MongoDB Atlas connection string
     - `JWT_SECRET`: Random secret string
     - `CLIENT_URL`: Your frontend URL
     - `PORT`: `5050`

6. Deploy

### **Frontend on Render:**

1. Click "New +" → "Static Site"
2. Connect GitHub repository
3. Settings:
   - **Root Directory**: `client`
   - **Build Command**: `npm install && npm run build`
   - **Publish Directory**: `dist`
4. Set environment variables if needed
5. Deploy

---

## 🔧 Required Code Changes

### 1. **Update API Base URL**

The API URL is already configured in `client/src/utils/api.js` to use `VITE_API_URL` environment variable.

### 2. **Create Environment Files**

**Backend `.env` (for Railway/Render):**
```
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/rentease
JWT_SECRET=your-secret-key-here
CLIENT_URL=https://your-frontend.vercel.app
PORT=5050
```

**Frontend `client/.env.production`:**
```
VITE_API_URL=https://your-backend.railway.app/api
```

### 3. **Update Image URLs**

Check all image references use environment-aware URLs in your code.

---

## 📁 File Structure for Deployment

```
SE_Rebuild/
├── server/
│   ├── index.js
│   ├── routes/
│   ├── models/
│   └── ...
├── client/
│   ├── src/
│   ├── package.json
│   ├── vite.config.js
│   └── .env.production
├── uploads/          # Make sure this is created
├── package.json
└── Procfile
```

---

## ✅ Post-Deployment Steps

1. **Test all endpoints**
2. **Create admin user** (if needed)
3. **Set up domain** (optional):
   - Railway: Add custom domain in settings
   - Vercel: Add custom domain in project settings

---

## 💰 Cost Estimate

- **MongoDB Atlas**: FREE (512MB, sufficient for small load)
- **Railway**: FREE tier (500 hours/month) or $5/month
- **Vercel**: FREE (perfect for small projects)
- **Total**: $0-5/month

---

## 🆘 Troubleshooting

### Common Issues:

1. **MongoDB Connection Error:**
   - Check IP whitelist includes `0.0.0.0/0`
   - Verify connection string format
   - Check username/password

2. **CORS Errors:**
   - Ensure `CLIENT_URL` matches frontend URL exactly
   - Check backend CORS settings

3. **File Upload Issues:**
   - Ensure `uploads/` directory exists on server
   - Check file permissions
   - Consider using Cloudinary for file storage

4. **Socket.io Connection Issues:**
   - Ensure Socket.io CORS settings match frontend URL
   - Check WebSocket support on hosting platform

---

## 📝 Environment Variables Summary

### Backend (.env):
```
MONGODB_URI=mongodb+srv://...
JWT_SECRET=your-secret-key
CLIENT_URL=https://your-frontend.vercel.app
PORT=5050
```

### Frontend (Vite):
Create `client/.env.production`:
```
VITE_API_URL=https://your-backend.railway.app/api
```

---

## 🎉 You're Ready to Deploy!

Start with **Railway + Vercel + MongoDB Atlas** for the easiest setup.

