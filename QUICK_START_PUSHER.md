# Quick Start: Pusher Setup (5 minutes)

## Step 1: Create a Channels App

1. Go to https://dashboard.pusher.com
2. Click **"Create app"** 
3. Choose **"Channels"** (NOT Beams - Beams is for push notifications)
4. Fill in:
   - App name: "Enlighten Christmas Party"
   - Cluster: Choose closest to you (e.g., "us-east-1")
   - Front-end: React
   - Back-end: Node.js
5. Click "Create app"

## Step 2: Get Your Credentials

After creating, go to **"App Keys"** tab and copy:
   - **App ID** (a number)
   - **Key** (public key - string)
   - **Secret** (private - keep safe!)
   - **Cluster** (the region you chose, e.g., "us-east-1")

## Step 2: Add to Vercel

Go to Vercel project → Settings → Environment Variables:

**Add these 4 variables:**
```
PUSHER_APP_ID=your_app_id
PUSHER_KEY=your_key
PUSHER_SECRET=your_secret
PUSHER_CLUSTER=us2
```

**Add these 2 for client:**
```
VITE_PUSHER_KEY=your_key
VITE_PUSHER_CLUSTER=us2
```

## Step 3: Install & Deploy

```bash
npm install
cd client && npm install
```

Then commit and push - Vercel will auto-deploy!

## Step 4: Test

1. Open your app in 2 browser windows
2. Join as 2 different players
3. You should see each other in real-time! 🎉

## That's It!

The code is already updated to use Pusher. Just add the environment variables and deploy!

