# Deploy Backend to Railway (For Socket.io Support)

## Why Railway?

Vercel doesn't support Socket.io (requires persistent WebSocket connections). Railway supports full Node.js apps with Socket.io.

## Quick Setup (5 minutes)

### Step 1: Create Railway Account
1. Go to https://railway.app
2. Sign up with GitHub
3. Click "New Project"
4. Select "Deploy from GitHub repo"

### Step 2: Connect Your Repository
1. Select your Christmas Party repository
2. Railway will auto-detect it's a Node.js project

### Step 3: Configure Settings
1. **Root Directory**: Leave as `/` (root)
2. **Build Command**: `npm install` (or leave empty, Railway auto-detects)
3. **Start Command**: `npm start`
4. **Watch Paths**: Leave empty

### Step 4: Set Environment Variables
Click on your project → Variables tab → Add:

```
DATABASE_URL=your_neon_connection_string_here
NODE_ENV=production
PORT=3001
```

### Step 5: Deploy
1. Railway will automatically start deploying
2. Wait for "Deploy successful"
3. Click on your service → Settings → Generate Domain
4. Copy the domain (e.g., `your-app.up.railway.app`)

### Step 6: Update Frontend (Vercel)
1. Go to your Vercel project settings
2. Add Environment Variable:
   ```
   VITE_BACKEND_URL=https://your-app.up.railway.app
   ```
3. Redeploy your Vercel frontend

## Alternative: Render.com

If you prefer Render:

1. Go to https://render.com
2. New → Web Service
3. Connect GitHub repo
4. Settings:
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Environment**: Node
5. Add `DATABASE_URL` environment variable
6. Deploy

## Testing

After deployment:
1. Check Railway logs to ensure server started
2. Test Socket.io connection in browser console
3. Verify players can join and see each other

## Cost

- **Railway**: Free tier includes $5/month credit (usually enough for small apps)
- **Render**: Free tier available (may sleep after inactivity)

