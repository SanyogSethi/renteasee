# 🔧 Production Configuration Checklist for Render

## ✅ Server Configuration (server/index.js)
- [x] CORS properly configured with `CLIENT_URL`
- [x] Socket.io CORS configured
- [x] MongoDB URI required in production (no localhost fallback)
- [x] Server listens on `0.0.0.0` (required for Render)
- [x] Environment detection (production vs development)
- [x] Error handling for missing env vars

## ✅ Frontend Configuration
- [x] `api.js` uses `VITE_API_URL` environment variable
- [x] `imageUtils.js` uses `VITE_API_URL` for production
- [x] Socket.io connects using `getApiBaseUrl()` utility

## ✅ Environment Variables Required

### Render Backend Environment Variables:
```
MONGODB_URI=mongodb+srv://rentease_user:2HUMVFlUaBkjcCUo@cluster0.pwawsrk.mongodb.net/rentease?appName=Cluster0
CLIENT_URL=https://rente-omega.vercel.app
JWT_SECRET=your-secret-key-here
PORT=5050 (auto-set by Render, but can be explicit)
NODE_ENV=production (optional, Render sets this)
```

### Vercel Frontend Environment Variables:
```
VITE_API_URL=https://rentease-backend-c8wm.onrender.com/api
```

## ✅ No Localhost Fallbacks in Production

All localhost references are now:
- Fallbacks ONLY in development mode
- Required environment variables in production
- Proper error handling if missing

## ✅ File Upload Configuration
- [x] Upload directories created on server startup
- [x] All routes ensure directories exist before multer uses them
- [x] Paths are relative and work on Render's filesystem

## 🚀 Deployment Checklist

### Before Deploying to Render:
1. ✅ Set all environment variables in Render dashboard
2. ✅ Verify `MONGODB_URI` is correct
3. ✅ Verify `CLIENT_URL` matches your Vercel URL
4. ✅ Verify `JWT_SECRET` is set (use a strong random string)

### After Deploying:
1. ✅ Check Render logs for "✅ MongoDB Connected"
2. ✅ Check Render logs for "✅ Running in PRODUCTION mode"
3. ✅ Test API endpoint: `https://rentease-backend-c8wm.onrender.com/api/properties`
4. ✅ Test frontend connects to backend
5. ✅ Test Socket.io connection (notifications)

## 🔍 Testing Production Config

### Test Backend:
```bash
curl https://rentease-backend-c8wm.onrender.com/api/properties
```

### Test Frontend:
1. Open: `https://rente-omega.vercel.app`
2. Check browser console for errors
3. Try logging in
4. Check Network tab for API calls

## ⚠️ Important Notes

1. **Render's Filesystem is Ephemeral**: Uploaded files will be lost on restart. For production, consider cloud storage (AWS S3, Cloudinary).

2. **Environment Variables**: Never commit `.env` files. All sensitive data should be in Render/Vercel environment variables.

3. **CORS**: Must match exactly - trailing slashes matter!

4. **Port Binding**: Server must listen on `0.0.0.0`, not `localhost` (Render requirement).

## ✅ All Fixed!
Everything is now configured for Render production! 🎉

