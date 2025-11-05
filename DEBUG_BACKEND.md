# 🔧 Troubleshooting Backend Connection Issues

## Current Issue
"Failed to save property" error when trying to edit/update properties.

## Quick Checks

### 1. Check Backend Status on Render
1. Go to **Render Dashboard**: https://dashboard.render.com
2. Click on your service: `rentease-backend`
3. Check **"Status"** - should be "Live" ✅
4. Check **"Last Deploy"** - should be recent
5. Click **"Logs"** tab to see any errors

### 2. Test Backend Endpoint Directly
Open in browser:
```
https://rentease-backend-c8wm.onrender.com/api/properties
```
**Expected:** Should return JSON array (even if empty `[]`)

If you get an error:
- ❌ "Cannot GET /api" - Normal (no route at `/api`)
- ❌ "Not Found" - Backend not running
- ❌ Connection timeout - Network/firewall issue

### 3. Check Browser Console
1. Open DevTools (F12)
2. Go to **Network** tab
3. Try editing property again
4. Look for the failed request:
   - **Name:** `properties/[id]` (PUT request)
   - **Status:** Should show error code (401, 403, 500, etc.)
   - **Response:** Click to see error message

### 4. Common Issues & Fixes

#### Issue A: "Network Error" or "Failed to fetch"
**Cause:** Frontend can't reach backend
**Fix:**
- Check `VITE_API_URL` in Vercel = `https://rentease-backend-c8wm.onrender.com/api`
- Verify Render backend is running
- Check Render logs for errors

#### Issue B: "401 Unauthorized"
**Cause:** Not logged in or token expired
**Fix:**
- Log out and log back in
- Clear browser cache/localStorage
- Check if token is being sent in request headers

#### Issue C: "403 Forbidden"
**Cause:** User doesn't own the property
**Fix:**
- Make sure you're logged in as the owner
- Verify property ownership in database

#### Issue D: "500 Internal Server Error"
**Cause:** Backend code error
**Fix:**
- Check Render logs (most important!)
- Look for error messages in logs
- Common causes:
  - MongoDB connection issue
  - Missing environment variable
  - Code error in property update route

#### Issue E: "CORS Error"
**Cause:** CORS not configured correctly
**Fix:**
- Check Render `CLIENT_URL` = `https://rente-omega.vercel.app`
- Verify CORS middleware in `server/index.js`

---

## Debug Steps

### Step 1: Check Render Logs
1. Render Dashboard → Your service → **Logs** tab
2. Try editing property again
3. Look for errors in real-time logs
4. Common errors:
   - `MongoDB connection error`
   - `Property not found`
   - `Cannot read property 'owner' of null`
   - `JWT_SECRET not defined`

### Step 2: Test Backend Manually
Use curl or Postman:
```bash
curl -X GET https://rentease-backend-c8wm.onrender.com/api/properties \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Step 3: Check Environment Variables
In Render Dashboard → Environment tab, verify:
- ✅ `MONGODB_URI` is set
- ✅ `JWT_SECRET` is set
- ✅ `CLIENT_URL` = `https://rente-omega.vercel.app`
- ✅ `PORT` (optional, Render sets this automatically)

---

## Quick Fixes

### Fix 1: Restart Render Backend
1. Render Dashboard → Your service
2. Click **"Manual Deploy"** → **"Clear build cache & deploy"**
3. Wait for redeploy (2-3 minutes)

### Fix 2: Clear Browser Cache
1. Open DevTools (F12)
2. Right-click refresh button → **"Empty Cache and Hard Reload"**
3. Or clear localStorage:
   ```javascript
   localStorage.clear()
   ```

### Fix 3: Re-login
1. Log out
2. Clear browser cache
3. Log back in with test account:
   - `owner@rentease.com` / `owner123`

---

## Check Backend Logs Now

**Most Important:** Check Render logs to see the actual error!

1. Go to: https://dashboard.render.com
2. Click on `rentease-backend`
3. Click **"Logs"** tab
4. Try editing property again
5. Copy the error message and share it

The logs will show exactly what's failing! 🔍

