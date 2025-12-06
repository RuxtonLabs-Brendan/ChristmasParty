# Vercel Deployment Guide

## Important Note About Socket.io

⚠️ **Vercel serverless functions do NOT support Socket.io** because Socket.io requires persistent WebSocket connections, and Vercel functions are stateless.

## Two Deployment Options:

### Option 1: Static Frontend Only (Current Setup)
- Frontend deploys to Vercel ✅
- Backend/Socket.io must run on a separate service (Railway, Render, etc.)

### Option 2: Full Stack on Railway/Render
- Deploy both frontend and backend together
- Socket.io will work properly
- Recommended for this app

## Current Vercel Setup (Static Files Only)

The `vercel.json` is configured to:
- Build the React app (`npm run build`)
- Serve static files from `client/dist`
- Handle SPA routing (all routes → index.html)

## To Deploy Frontend to Vercel:

1. **Connect your repo to Vercel**
2. **Set build settings:**
   - Build Command: `npm run build`
   - Output Directory: `client/dist`
   - Install Command: `npm install` (runs automatically)

3. **Deploy** - Vercel will build and deploy automatically

## For Full Stack (Recommended):

Deploy to **Railway** or **Render** instead:

### Railway:
1. Connect GitHub repo
2. Set `DATABASE_URL` environment variable
3. Set start command: `npm start`
4. Railway will auto-detect and deploy

### Render:
1. Create new Web Service
2. Connect GitHub repo
3. Set:
   - Build Command: `npm run build`
   - Start Command: `npm start`
   - Environment: `Node`
4. Add `DATABASE_URL` environment variable
5. Deploy

## Why Socket.io Doesn't Work on Vercel:

- Vercel uses serverless functions (stateless)
- Socket.io needs persistent connections
- WebSocket connections can't be maintained across function invocations

## Solution:

Use Railway or Render for the full stack deployment where Socket.io will work properly.

