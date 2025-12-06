// Vercel serverless function for player join
import { initDatabase } from '../../server/db/index.js';
import gameState from '../../server/gameState.js';
import Pusher from 'pusher';

// Initialize Pusher
const pusher = new Pusher({
  appId: process.env.PUSHER_APP_ID,
  key: process.env.PUSHER_KEY,
  secret: process.env.PUSHER_SECRET,
  cluster: process.env.PUSHER_CLUSTER || 'us3',
  useTLS: true
});

// Initialize database on cold start
let dbInitPromise = null;
async function ensureDb() {
  if (!dbInitPromise) {
    dbInitPromise = (async () => {
      try {
        await initDatabase();
        console.log('Database initialized for serverless function');
      } catch (error) {
        console.error('Database initialization error:', error);
      }
    })();
  }
  await dbInitPromise;
}

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Content-Type', 'application/json');

  if (req.method === 'OPTIONS') {
    return res.status(200).json({});
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.log('Join handler called');
    console.log('Pusher config check:', {
      hasAppId: !!process.env.PUSHER_APP_ID,
      hasKey: !!process.env.PUSHER_KEY,
      hasSecret: !!process.env.PUSHER_SECRET,
      cluster: process.env.PUSHER_CLUSTER
    });

    await ensureDb();

    const { name, emoji, playerId } = req.body || {};
    console.log('Join request body:', { name, emoji, playerId });
    
    if (!name || !name.trim() || !emoji || !playerId) {
      console.error('Missing required fields:', { name: !!name, emoji: !!emoji, playerId: !!playerId });
      return res.status(400).json({ error: 'Name, emoji, and playerId are required' });
    }

    // Add player using playerId instead of socket.id
    console.log('Adding player to game state...');
    const player = await gameState.addPlayer(playerId, name.trim(), emoji);
    console.log(`✅ Player joined: ${player.name} (${player.emoji})`);
    console.log(`Game ID after adding player: ${gameState.gameId}`);
    
    // Force refresh and get state
    const state = await gameState.getState();
    console.log('Current game state after join:', {
      gameId: gameState.gameId,
      playersCount: state.players?.length || 0,
      players: state.players?.map(p => ({ id: p.id, name: p.name, emoji: p.emoji }))
    });
    
    // Broadcast to all clients via Pusher
    console.log('Broadcasting player-joined event via Pusher...');
    try {
      await pusher.trigger('game-channel', 'player-joined', {
        player: {
          id: player.id,
          name: player.name,
          emoji: player.emoji,
          gifts: player.gifts || [],
          isConnected: true
        },
        gameState: state
      });
      console.log('✅ Pusher event broadcasted successfully');
    } catch (pusherError) {
      console.error('❌ Pusher broadcast error:', pusherError);
      // Still return success, but log the error
    }

    return res.status(200).json({ 
      success: true, 
      player,
      gameState: state 
    });
  } catch (error) {
    console.error('❌ Error in join handler:', error);
    console.error('Error stack:', error.stack);
    return res.status(500).json({ error: error.message || 'Failed to join game' });
  }
}

