# Neon Database Setup Guide

This guide will help you set up a Neon database for the White Elephant game.

## Step 1: Create a Neon Account

1. Go to https://neon.tech
2. Sign up for a free account (no credit card required for free tier)
3. Create a new project

## Step 2: Get Your Connection String

1. In your Neon dashboard, go to your project
2. Click on "Connection Details" or "Connection String"
3. Copy the connection string (it will look like):
   ```
   postgresql://username:password@hostname.neon.tech/database?sslmode=require
   ```

## Step 3: Configure Environment Variables

1. In the `server` directory, create a `.env` file:
   ```bash
   cd server
   touch .env  # On Windows: type nul > .env
   ```

2. Add your connection string to the `.env` file:
   ```
   DATABASE_URL=postgresql://username:password@hostname.neon.tech/database?sslmode=require
   PORT=3001
   ```

   **Important**: Replace the example connection string with your actual Neon connection string.

## Step 4: Start the Server

The database schema will be automatically created when you start the server:

```bash
npm run dev
```

You should see:
```
Connected to Neon database
Database schema initialized
Server running on port 3001
```

## Troubleshooting

### "DATABASE_URL environment variable is not set"
- Make sure you created a `.env` file in the `server` directory
- Verify the `.env` file contains `DATABASE_URL=...`
- Check that you're running the server from the correct directory

### Connection errors
- Verify your connection string is correct
- Check that your Neon project is active (not paused)
- Ensure `sslmode=require` is included in your connection string

### Schema initialization errors
- The schema will only be created once. If you see errors about tables already existing, that's normal - the schema is already set up.
- If you need to reset the database, you can drop and recreate your Neon project, or manually drop tables through the Neon SQL editor.

## Database Schema

The application creates the following tables:
- `games` - Game sessions
- `players` - Players in games
- `gifts` - Gifts for each game
- `player_gifts` - Junction table for player-gift ownership
- `admin_gifts` - Admin-managed gift products (persists across games)

All tables are automatically created when the server starts.

