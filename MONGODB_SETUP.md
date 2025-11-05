# MongoDB Atlas Setup Guide

## Step 1: Create MongoDB Atlas Account

1. Go to: https://www.mongodb.com/cloud/atlas/register
2. Click "Try Free" or "Sign Up"
3. Fill in your details:
   - Email address
   - First name, Last name
   - Password
   - Company name (optional)
4. Click "Create your Atlas account"
5. Verify your email address

## Step 2: Create a Free Cluster

1. After logging in, you'll see the "Deploy a cloud database" page
2. **Select "M0 Free" tier** (it's free forever)
3. **Cloud Provider & Region:**
   - Choose: AWS (recommended)
   - Region: Choose closest to you (e.g., `Mumbai (ap-south-1)` for India)
4. **Cluster Name:** (optional) Keep default or name it `RentEase-Cluster`
5. Click **"Create"** (takes 3-5 minutes)

## Step 3: Create Database User

1. In the Security → Database Access section
2. Click **"Add New Database User"**
3. Choose **"Password"** authentication method
4. **Username:** Create a username (e.g., `rentease_user`)
5. **Password:** 
   - Click "Autogenerate Secure Password" OR create your own
   - **IMPORTANT:** Copy and save this password! You'll need it.
6. **Database User Privileges:** Select "Atlas admin" (or "Read and write to any database")
7. Click **"Add User"**

## Step 4: Configure Network Access (Whitelist IPs)

1. Go to **Security → Network Access**
2. Click **"Add IP Address"**
3. For production deployment, click **"Allow Access from Anywhere"**
   - This adds `0.0.0.0/0` (allows all IPs)
   - **OR** add specific IPs if you prefer
4. Click **"Confirm"**

## Step 5: Get Connection String

1. Go to **"Database"** section (left sidebar)
2. Click **"Connect"** button on your cluster
3. Choose **"Connect your application"**
4. **Driver:** Select "Node.js"
5. **Version:** Select "5.5 or later"
6. Copy the connection string - it looks like:
   ```
   mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
   ```
7. **Replace placeholders:**
   - Replace `<username>` with your database username
   - Replace `<password>` with your database password
   - Add database name: Replace `?` with `/rentease?`
   
   **Final format:**
   ```
   mongodb+srv://rentease_user:your_password@cluster0.xxxxx.mongodb.net/rentease?retryWrites=true&w=majority
   ```

## Step 6: Update Your Environment Variables

After getting your connection string, update your `.env` file:

```env
MONGODB_URI=mongodb+srv://your_username:your_password@cluster0.xxxxx.mongodb.net/rentease?retryWrites=true&w=majority
JWT_SECRET=your-secret-key-here
CLIENT_URL=http://localhost:5173
PORT=5050
```

**For Railway/Render deployment**, you'll add this in the platform's environment variables section.

## Step 7: Test Connection (Optional)

You can test the connection by running your server locally:

```bash
npm run server
```

You should see: `MongoDB Connected` in the console.

## Security Notes

- **Never commit your `.env` file to Git**
- Keep your database password secure
- The free tier gives you:
  - 512 MB storage
  - Shared RAM/CPU
  - Perfect for small projects (10-20 requests)

## Troubleshooting

**Connection timeout:**
- Check Network Access allows your IP (or `0.0.0.0/0`)
- Verify username/password are correct
- Check connection string format

**Authentication failed:**
- Verify username and password (no special characters need URL encoding)
- Check database user privileges

**SSL/TLS errors:**
- MongoDB Atlas requires SSL, which Mongoose handles automatically

## Next Steps

After MongoDB Atlas is set up:
1. ✅ Update your `.env` file with the connection string
2. ✅ Test the connection locally
3. ✅ Deploy backend (Railway/Render)
4. ✅ Add the same `MONGODB_URI` to your deployment platform's environment variables

---

**Ready to deploy?** See `DEPLOYMENT.md` for next steps!

