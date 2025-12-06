# Add Pusher Credentials to Vercel

## Your Pusher Credentials

You have:
- App ID: `2087585`
- Key: `84edafca75206bb30dc5`
- Secret: `f518d4dce2380b2b2749`
- Cluster: `us3`

## Step-by-Step: Add to Vercel

**Important:** In Vercel, you add ALL variables the same way! There's no separate "server-side" vs "client-side" section. Just add all 6 variables in the same place.

1. **Go to your Vercel project dashboard**
   - Open https://vercel.com
   - Click on your project

2. **Go to Settings → Environment Variables**
   - Click "Settings" in the top menu
   - Click "Environment Variables" in the left sidebar

3. **Click "Add New" and add each variable:**
   - Enter the Key and Value
   - **Check all three boxes:** Production, Preview, Development
   - Click "Save"
   - Repeat for each variable below

### Add These 6 Environment Variables:

**Variable 1:**
- Key: `PUSHER_APP_ID`
- Value: `2087585`
- ✅ Check: Production, Preview, Development

**Variable 2:**
- Key: `PUSHER_KEY`
- Value: `84edafca75206bb30dc5`
- ✅ Check: Production, Preview, Development

**Variable 3:**
- Key: `PUSHER_SECRET`
- Value: `f518d4dce2380b2b2749`
- ✅ Check: Production, Preview, Development

**Variable 4:**
- Key: `PUSHER_CLUSTER`
- Value: `us3`
- ✅ Check: Production, Preview, Development

**Variable 5:**
- Key: `VITE_PUSHER_KEY`
- Value: `84edafca75206bb30dc5`
- ✅ Check: Production, Preview, Development

**Variable 6:**
- Key: `VITE_PUSHER_CLUSTER`
- Value: `us3`
- ✅ Check: Production, Preview, Development

**Note:** Variables starting with `VITE_` are automatically available to your React app. Variables without `VITE_` are only for serverless functions. Vercel handles this automatically!

## After Adding Variables

1. **Redeploy** your Vercel project (or push a new commit)
2. The environment variables will be available to your app
3. Test with 2 browser windows - players should see each other!

## Security Note

✅ These credentials are now in Vercel (secure)
❌ Never commit these to Git
✅ The code is already set up to use these variables

## Quick Test

After redeploying:
1. Open your app in 2 browser windows
2. Join as 2 different players
3. You should see each other in the lobby in real-time! 🎉

