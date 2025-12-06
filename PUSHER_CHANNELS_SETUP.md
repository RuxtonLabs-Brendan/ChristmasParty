# Pusher Channels Setup Guide

## Step 1: Create a Channels App

1. Go to https://dashboard.pusher.com
2. Click **"Create app"** (or "Channels apps" if you see that)
3. Choose **"Channels"** (NOT Beams)
4. Fill in:
   - **App name**: "Enlighten Christmas Party" (or any name)
   - **Cluster**: Choose closest to you (e.g., "us-east-1", "us-west-1", "eu")
   - **Front-end tech**: React
   - **Back-end tech**: Node.js
5. Click **"Create app"**

## Step 2: Get Your Credentials

After creating the app, you'll see the **"App Keys"** tab. You need these 4 values:

1. **App ID** - A number like `1234567`
2. **Key** - A string like `a1b2c3d4e5f6g7h8i9j0`
3. **Secret** - A long string (keep this private!)
4. **Cluster** - The region you chose (e.g., `us-east-1`)

## Step 3: Add to Vercel Environment Variables

Go to your Vercel project → **Settings** → **Environment Variables** → **Add**:

### For Serverless Functions (Server-side):
```
PUSHER_APP_ID=your_app_id_here
PUSHER_KEY=your_key_here
PUSHER_SECRET=your_secret_here
PUSHER_CLUSTER=your_cluster_here
```

### For Client (Build-time):
```
VITE_PUSHER_KEY=your_key_here
VITE_PUSHER_CLUSTER=your_cluster_here
```

**Important**: 
- Use the **same Key** for both `PUSHER_KEY` and `VITE_PUSHER_KEY`
- Use the **same Cluster** for both `PUSHER_CLUSTER` and `VITE_PUSHER_CLUSTER`
- The Secret is **only** for server-side (never expose it to the client!)

## Step 4: Enable Client Events (Optional but Recommended)

1. In Pusher dashboard, go to your app
2. Click **"App Settings"**
3. Under **"Client Events"**, enable it
4. This allows clients to trigger events (we're using REST API, but good to have)

## Step 5: Deploy

1. Commit and push your code
2. Vercel will automatically deploy
3. Test with 2 browser windows - players should see each other!

## Free Tier Limits

- ✅ **200,000 messages/day** (plenty for a party game!)
- ✅ **100 concurrent connections** (100 players at once!)
- ✅ **Unlimited channels**
- ✅ **No credit card required**

## Troubleshooting

- **"PUSHER_KEY not set"**: Make sure `VITE_PUSHER_KEY` is set in Vercel
- **Connection errors**: Check cluster matches in both env vars
- **Not seeing updates**: Check browser console for Pusher connection status

## Next Steps

After setting up the environment variables:
1. Redeploy on Vercel (or it will auto-deploy on next push)
2. Open your app in 2 browser windows
3. Join as 2 different players
4. You should see each other in the lobby in real-time! 🎉

