# Debugging Guide: Players Not Showing

## Step 1: Check Browser Console

Open your browser console (F12) and look for these messages:

### ✅ Good Signs:
- `"usePusher: Initializing..."`
- `"PUSHER_KEY: Set"`
- `"✅ Connected to Pusher channel: game-channel"`
- `"✅ Pusher connection established"`
- `"📡 Setting up Pusher event listeners..."`
- `"✅ Pusher event listeners bound"`

### ❌ Bad Signs:
- `"PUSHER_KEY: NOT SET"` → Environment variable not loaded
- `"❌ Pusher subscription error"` → Connection failed
- `"❌ Pusher connection error"` → Can't connect to Pusher

## Step 2: Test Player Join

1. Open console (F12)
2. Click "JOIN GAME"
3. Look for these messages:

### Should See:
- `"Joining game: {name, emoji, playerId}"`
- `"Join response status: 200"`
- `"Join successful, received data: {...}"`
- `"🎉 Received player-joined event: {...}"`

### If You See Errors:
- `"Join response status: 400"` → Missing name/emoji/playerId
- `"Join response status: 500"` → Server error (check Vercel logs)
- `"❌ Error joining game"` → Network or API error

## Step 3: Check Vercel Function Logs

1. Go to Vercel dashboard
2. Click on your project
3. Go to "Functions" tab
4. Click on a recent `/api/game/join` request
5. Check the logs for:
   - `"Join handler called"`
   - `"✅ Player joined: ..."`
   - `"✅ Pusher event broadcasted successfully"`

### If You See:
- `"Pusher config check: {hasAppId: false}"` → Environment variables not set
- `"❌ Pusher broadcast error"` → Pusher credentials wrong

## Step 4: Verify Environment Variables

1. Go to Vercel → Settings → Environment Variables
2. Verify all 6 variables are there:
   - `PUSHER_APP_ID`
   - `PUSHER_KEY`
   - `PUSHER_SECRET`
   - `PUSHER_CLUSTER`
   - `VITE_PUSHER_KEY`
   - `VITE_PUSHER_CLUSTER`
3. Make sure they're checked for Production, Preview, and Development

## Step 5: Test with Two Windows

1. Open your app in Window 1
2. Open your app in Window 2 (or incognito)
3. Join as Player 1 in Window 1
4. Check console in Window 1 - should see join success
5. Join as Player 2 in Window 2
6. Check console in Window 2 - should see join success
7. **Check Window 1 console** - should see `"🎉 Received player-joined event"` when Player 2 joins

## Common Issues

### Issue 1: "PUSHER_KEY not set"
**Fix:** Make sure `VITE_PUSHER_KEY` is set in Vercel and redeploy

### Issue 2: Players join but don't see each other
**Check:**
- Are both windows showing "✅ Connected to Pusher channel"?
- When Player 2 joins, does Player 1's console show "🎉 Received player-joined event"?
- If not, Pusher events aren't being received

### Issue 3: API returns 500 error
**Check Vercel function logs:**
- Look for database errors
- Look for Pusher initialization errors
- Verify `DATABASE_URL` is set if using Neon

### Issue 4: Events broadcast but not received
**Possible causes:**
- Channel not subscribed yet when event is sent
- Wrong channel name
- Pusher cluster mismatch

## Quick Test

Run this in browser console after joining:
```javascript
// Check if Pusher is connected
console.log('Pusher connected:', window.pusher?.connection?.state === 'connected');

// Check channel subscription
console.log('Channel subscribed:', window.channel?.subscribed);
```

## Still Not Working?

Share these from your browser console:
1. All messages starting with "usePusher"
2. All messages starting with "Joining game"
3. All messages starting with "Received player-joined"
4. Any error messages (red text)

