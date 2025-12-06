// Vercel serverless function for player leaving
import { initDatabase } from '../../server/db/index.js';
import * as db from '../../server/db/index.js';
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
    console.log('=== LEAVE HANDLER START ===');
    await ensureDb();

    // Parse request body
    let playerId;
    if (req.body) {
      // Vercel may parse JSON automatically, or it might be a string
      if (typeof req.body === 'string') {
        try {
          const parsed = JSON.parse(req.body);
          playerId = parsed.playerId;
        } catch (parseError) {
          console.error('Error parsing body as JSON:', parseError);
          // Try to extract playerId from string directly
          const match = req.body.match(/"playerId"\s*:\s*"([^"]+)"/);
          if (match) {
            playerId = match[1];
          }
        }
      } else if (typeof req.body === 'object') {
        playerId = req.body.playerId;
      }
    }
    
    console.log('Leave request body:', { playerId, bodyType: typeof req.body, body: req.body });

    if (!playerId) {
      console.error('Missing playerId');
      return res.status(400).json({ error: 'playerId is required' });
    }

    // Get current state to check phase
    const state = await gameState.getState();
    console.log('Current game phase:', state.phase);

    // Remove player from game
    console.log('Removing player from game state...');
    await gameState.removePlayer(playerId);
    console.log(`✅ Player ${playerId} removed`);

    // Get updated state
    const updatedState = await gameState.getState();
    console.log('Updated game state after leave:', {
      playersCount: updatedState.players?.length || 0,
      players: updatedState.players?.map(p => ({ id: p.id, name: p.name })) || []
    });

    // Broadcast to all clients via Pusher
    console.log('Broadcasting player-left event via Pusher...');
    try {
      await pusher.trigger('game-channel', 'player-left', {
        playerId,
        gameState: updatedState
      });
      console.log('✅ Pusher event broadcasted successfully');
    } catch (pusherError) {
      console.error('❌ Pusher broadcast error:', pusherError);
      // Still return success, but log the error
    }

    return res.status(200).json({
      success: true,
      gameState: updatedState
    });
  } catch (error) {
    console.error('❌ Error in leave handler:', error);
    console.error('Error stack:', error.stack);
    return res.status(500).json({ error: error.message || 'Failed to leave game' });
  }
}

