# Simple Vercel Environment Variables Setup

## You Just Add All 6 Variables the Same Way!

In Vercel, there's no special "server-side" vs "client-side" section. You just add all environment variables in one place, and Vercel automatically knows which ones to use where based on the variable name.

## Step-by-Step Instructions

1. **Go to your Vercel project**
   - Open https://vercel.com
   - Click on your project

2. **Go to Settings**
   - Click "Settings" in the top menu
   - Click "Environment Variables" in the left sidebar

3. **Add Each Variable One by One**
   - Click "Add New" button
   - Enter the Key and Value
   - Check all three boxes: Production, Preview, Development
   - Click "Save"
   - Repeat for each variable

## Add These 6 Variables:

### Variable 1:
- **Key:** `PUSHER_APP_ID`
- **Value:** `2087585`
- ✅ Check: Production, Preview, Development

### Variable 2:
- **Key:** `PUSHER_KEY`
- **Value:** `84edafca75206bb30dc5`
- ✅ Check: Production, Preview, Development

### Variable 3:
- **Key:** `PUSHER_SECRET`
- **Value:** `f518d4dce2380b2b2749`
- ✅ Check: Production, Preview, Development

### Variable 4:
- **Key:** `PUSHER_CLUSTER`
- **Value:** `us3`
- ✅ Check: Production, Preview, Development

### Variable 5:
- **Key:** `VITE_PUSHER_KEY`
- **Value:** `84edafca75206bb30dc5`
- ✅ Check: Production, Preview, Development

### Variable 6:
- **Key:** `VITE_PUSHER_CLUSTER`
- **Value:** `us3`
- ✅ Check: Production, Preview, Development

## That's It!

After adding all 6 variables:
1. **Redeploy** your project (or push a new commit)
2. The app will automatically use these variables
3. Test with 2 browser windows - players should see each other!

## How It Works

- Variables **without** `VITE_` → Used by serverless functions (API routes)
- Variables **with** `VITE_` → Used by your React app (client)
- Vercel handles this automatically - you don't need to do anything special!

## Visual Guide

When you click "Add New", you'll see:
```
Key: [type here]
Value: [type here]
☐ Production
☐ Preview  
☐ Development
```

Just fill it in and check all three boxes for each variable!

