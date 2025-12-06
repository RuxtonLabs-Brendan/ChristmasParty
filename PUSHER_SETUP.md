# Pusher Setup Guide for Vercel

## Why Pusher?

Pusher provides WebSocket connections as a service, which works perfectly with Vercel serverless functions. This allows us to stay on Vercel while having real-time multiplayer functionality.

## Setup Steps

### 1. Create Pusher Channels App (Free)

1. Go to https://dashboard.pusher.com
2. Sign up for free account (if needed)
3. Click **"Create app"**
4. Choose **"Channels"** (NOT Beams - Beams is for push notifications)
5. Fill in:
   - App name: "Enlighten Christmas Party"
   - Cluster: Choose closest region (e.g., "us-east-1", "us-west-1", "eu")
   - Front-end: React
   - Back-end: Node.js
6. Click "Create app"
7. Go to **"App Keys"** tab
8. Copy your credentials:
   - **App ID** (a number)
   - **Key** (public key - string)
   - **Secret** (keep this private!)
   - **Cluster** (the region you chose)

### 2. Add Environment Variables to Vercel

Go to your Vercel project → Settings → Environment Variables → Add:

**For Serverless Functions (Server-side):**
```
PUSHER_APP_ID=your_app_id_here
PUSHER_KEY=your_key_here
PUSHER_SECRET=your_secret_here
PUSHER_CLUSTER=us2
```

**For Client (Build-time):**
```
VITE_PUSHER_KEY=your_key_here
VITE_PUSHER_CLUSTER=us2
```

### 3. Install Dependencies

The dependencies are already added to `package.json`:
- `pusher` (server)
- `pusher-js` (client)

Run:
```bash
npm install
cd client && npm install
```

### 4. Deploy

1. Commit and push your changes
2. Vercel will automatically deploy
3. The Pusher integration will work!

## How It Works

1. **Client Actions** → REST API (Vercel serverless) → Updates database
2. **Server** → Pusher → Broadcasts to all clients
3. **All Clients** → Receive real-time updates via Pusher

## Free Tier Limits

- **200,000 messages/day** (plenty for a party game!)
- **100 concurrent connections** (enough for 100 players)
- **Unlimited channels**

## Testing

1. Open your app in two browser windows
2. Join as two different players
3. You should see each other in the lobby in real-time!

## Troubleshooting

- **"PUSHER_KEY not set"**: Make sure `VITE_PUSHER_KEY` is set in Vercel
- **Connection errors**: Check your Pusher cluster matches in both env vars
- **Not seeing updates**: Check browser console for Pusher connection status

