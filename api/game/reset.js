// Vercel serverless function to reset the game (admin only)
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
    console.log('=== RESET HANDLER START ===');
    await ensureDb();

    const { password } = req.body || {};
    
    // Verify admin password
    if (password !== 'merrychristmas') {
      console.error('Invalid password for reset');
      return res.status(403).json({ error: 'Invalid admin password' });
    }

    console.log('Resetting game session...');
    
    // Reset the game (removes all players, gifts, resets to lobby)
    await gameState.reset();
    
    // Get the fresh state after reset
    const resetState = await gameState.getState();
    console.log('Game reset complete. New state:', {
      playersCount: resetState.players?.length || 0,
      phase: resetState.phase
    });

    // Broadcast reset to all clients via Pusher
    console.log('Broadcasting game-reset event via Pusher...');
    try {
      await pusher.trigger('game-channel', 'game-reset', {
        gameState: resetState,
        message: 'Game session has been reset by admin. All players have been removed.'
      });
      console.log('✅ Pusher reset event broadcasted successfully');
    } catch (pusherError) {
      console.error('❌ Pusher broadcast error:', pusherError);
      // Still return success, but log the error
    }

    console.log('=== RESET HANDLER END ===');
    return res.status(200).json({
      success: true,
      message: 'Game session reset successfully',
      gameState: resetState
    });
  } catch (error) {
    console.error('❌ Error in reset handler:', error);
    console.error('Error stack:', error.stack);
    return res.status(500).json({ error: error.message || 'Failed to reset game' });
  }
}

