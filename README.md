# White Elephant Board Game

A real-time multiplayer White Elephant game with a physical board game aesthetic, built with React, Tailwind CSS, Node.js, and Socket.io.

## Features

- **3D Board Game View**: Top-down perspective of a Christmas board game on a hardwood table
- **Real-Time Multiplayer**: Synchronized gameplay across multiple browsers using Socket.io
- **Physical Game Elements**:
  - 3D Christmas tree with twinkling lights and ornaments
  - Wrapped gift boxes with unique patterns (dots, stripes, snowflakes, plaid)
  - Player tokens arranged around the board
  - Opened gifts displayed in a ring formation
- **Game Mechanics**:
  - Turn-based gameplay
  - Open wrapped gifts or steal opened gifts
  - Maximum 2 steals per gift (then locks)
  - Host-controlled game start

## Setup

### Prerequisites

- Node.js (v16 or higher)
- npm or yarn
- Neon database account (free tier available at https://neon.tech)

### Database Setup

1. **Create a Neon Database**:
   - Sign up at https://neon.tech (free tier available)
   - Create a new project
   - Copy your connection string from the dashboard

2. **Configure Environment Variables**:
   - In the `server` directory, create a `.env` file:
   ```bash
   cd server
   ```
   - Create `.env` file with your Neon connection string:
   ```
   DATABASE_URL=postgresql://username:password@hostname/database?sslmode=require
   PORT=3001
   ```
   - Replace the `DATABASE_URL` with your actual Neon connection string

### Installation

1. Install root dependencies:
```bash
npm install
```

2. Install server dependencies:
```bash
cd server
npm install
cd ..
```

3. Install client dependencies:
```bash
cd client
npm install
cd ..
```

### Running the Application

From the root directory, run:
```bash
npm run dev
```

This will start:
- Backend server on `http://localhost:3001`
- Frontend dev server on `http://localhost:3000`

Open `http://localhost:3000` in your browser to play.

### Running Separately

**Backend only:**
```bash
npm run server
```

**Frontend only:**
```bash
npm run client
```

## How to Play

1. **Join the Game**: Enter your name and choose a Christmas emoji
2. **Wait for Players**: At least 2 players needed to start
3. **Host Starts**: The first player (host) clicks "START GAME"
4. **Take Turns**: 
   - Click a wrapped gift to open it
   - Click an opened gift to steal it (max 2 steals)
5. **Win**: Collect the best gifts!

## Project Structure

```
ChristmasParty/
├── client/          # React frontend
│   ├── src/
│   │   ├── components/  # React components
│   │   ├── hooks/       # Custom React hooks
│   │   └── utils/       # Utility functions
├── server/          # Node.js backend
│   ├── db/              # Database module
│   │   ├── index.js     # Database operations
│   │   └── schema.sql   # Database schema
│   ├── server.js        # Express + Socket.io server
│   ├── gameState.js     # Game state management
│   ├── socketHandlers.js # Socket event handlers
│   ├── giftGenerator.js  # Gift generation logic
│   └── adminRoutes.js   # Admin API routes
└── shared/          # Shared types and constants
```

## Technologies

- **Frontend**: React, Vite, Tailwind CSS
- **Backend**: Node.js, Express, Socket.io
- **Database**: Neon (Serverless Postgres)
- **Styling**: Tailwind CSS with custom 3D transforms and animations

## Database

The application uses Neon (serverless Postgres) for persistent storage. The database schema is automatically initialized when the server starts. The database stores:

- Game sessions and state
- Players and their connections
- Gifts and ownership
- Admin-managed gift products

The database connection string is configured via the `DATABASE_URL` environment variable in `server/.env`.

## Notes

- Desktop-only experience (fixed viewport size)
- Amazon product images are placeholder URLs - replace with actual product images in production
- Game state persists in Neon database across sessions and server restarts
- Supports multiple concurrent game sessions (each gets its own game ID)

