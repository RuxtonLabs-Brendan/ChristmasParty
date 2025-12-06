# Production Setup Guide

## Neon Database Setup

The app uses **Neon PostgreSQL** for persistent game state and admin gift management.

### Required Environment Variables:

1. **DATABASE_URL** (Required for production)
   - Get your connection string from: https://console.neon.tech/
   - Format: `postgresql://username:password@hostname/database?sslmode=require`
   - Example: `postgresql://user:pass@ep-cool-darkness-123456.us-east-2.aws.neon.tech/neondb?sslmode=require`

2. **NODE_ENV** (Optional, defaults to development)
   - Set to `production` for production builds

3. **PORT** (Optional, defaults to 3001)
   - Server port number

### Database Initialization:

The server automatically:
- ✅ Connects to Neon database on startup
- ✅ Initializes schema (tables, indexes, triggers)
- ✅ Handles connection errors gracefully
- ✅ Falls back to in-memory mode if DATABASE_URL is not set

### To Deploy:

1. **Build the client:**
   ```bash
   npm run build
   ```

2. **Set environment variables:**
   ```bash
   export DATABASE_URL="your-neon-connection-string"
   export NODE_ENV="production"
   export PORT=3001
   ```

3. **Start the server:**
   ```bash
   npm start
   ```

### For Vercel/Railway/Render Deployment:

1. **Set environment variables in your platform:**
   - `DATABASE_URL` - Your Neon connection string
   - `NODE_ENV=production`
   - `PORT` - (usually auto-set by platform)

2. **Build settings:**
   - Build command: `npm run build`
   - Start command: `npm start`
   - Output directory: `client/dist` (for static hosting)

### Database Features:

With Neon database enabled:
- ✅ Persistent game state across server restarts
- ✅ Admin gifts persist in database
- ✅ Multiple server instances share state
- ✅ Player data persists
- ✅ Gift history tracked

### Fallback Mode (No Database):

If `DATABASE_URL` is not set:
- ⚠️ Game state is in-memory only (lost on restart)
- ⚠️ Admin gifts stored in memory
- ⚠️ Multiple instances don't share state
- ✅ App still functions for testing

### Troubleshooting:

- **"Database not configured"**: Set `DATABASE_URL` environment variable
- **Connection errors**: Verify your Neon connection string is correct
- **Schema errors**: Database will auto-initialize on first run
- **502 errors**: Check database connection and server logs
- **Static files not loading**: Ensure `npm run build` completed successfully

