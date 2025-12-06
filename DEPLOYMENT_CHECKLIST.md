# Production Deployment Checklist

## ✅ Neon Database Setup

- [x] Database connection configured in `server/db/index.js`
- [x] Schema auto-initialization on server startup
- [x] Connection error handling
- [x] Fallback to in-memory mode if DATABASE_URL not set
- [x] All database functions have null checks

## ✅ Server Configuration

- [x] Database initialization on startup (`initDatabase()`)
- [x] Static file serving for production builds
- [x] API routes properly ordered (before static files)
- [x] Socket.io CORS configured
- [x] Environment variable support (PORT, NODE_ENV, DATABASE_URL)

## ✅ Client Configuration

- [x] Production build script (`npm run build`)
- [x] Socket.io uses relative URLs in production
- [x] Admin API uses relative URLs in production
- [x] Vite configured for production

## Required Environment Variables

Set these in your production environment:

```bash
DATABASE_URL=postgresql://username:password@hostname/database?sslmode=require
NODE_ENV=production
PORT=3001  # Optional, defaults to 3001
```

## Deployment Steps

1. **Build the client:**
   ```bash
   npm run build
   ```

2. **Set environment variables** in your hosting platform

3. **Start the server:**
   ```bash
   npm start
   ```

## Platform-Specific Notes

### Vercel
- Set `DATABASE_URL` in Environment Variables
- Build Command: `npm run build`
- Output Directory: `client/dist`
- Install Command: `npm install` (runs automatically)

### Railway
- Set `DATABASE_URL` in Variables tab
- Start Command: `npm start`
- Build Command: `npm run build` (optional, can build on deploy)

### Render
- Set `DATABASE_URL` in Environment section
- Build Command: `npm run build`
- Start Command: `npm start`

## Verification

After deployment, check:
- ✅ Server starts without errors
- ✅ Database connection message appears in logs
- ✅ Static files load (check browser console)
- ✅ Socket.io connects (check connection status in UI)
- ✅ Admin portal accessible
- ✅ Game state persists across refreshes

## Troubleshooting

- **"Database not configured"**: Set `DATABASE_URL` environment variable
- **Connection errors**: Verify Neon connection string format
- **502 errors**: Check server logs for database connection issues
- **Static files 404**: Ensure `npm run build` completed successfully

