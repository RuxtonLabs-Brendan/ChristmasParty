// Vercel serverless function to start the game
import { initDatabase } from '../../server/db/index.js';
import gameState from '../../server/gameState.js';
import { generateGifts } from '../../server/giftGenerator.js';
import { GAME_PHASES } from '../../shared/types.js';
import Pusher from 'pusher';

const pusher = new Pusher({
  appId: process.env.PUSHER_APP_ID,
  key: process.env.PUSHER_KEY,
  secret: process.env.PUSHER_SECRET,
  cluster: process.env.PUSHER_CLUSTER || 'us3',
  useTLS: true
});

let dbInitPromise = null;
async function ensureDb() {
  if (!dbInitPromise) {
    dbInitPromise = (async () => {
      try {
        await initDatabase();
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
    await ensureDb();

    const { playerId } = req.body || {};
    if (!playerId) {
      return res.status(400).json({ error: 'playerId is required' });
    }

    const state = await gameState.getState();
    
    if (state.hostId !== playerId) {
      return res.status(403).json({ error: 'Only the host can start the game' });
    }

    if (state.phase !== GAME_PHASES.LOBBY) {
      return res.status(400).json({ error: 'Game already started' });
    }

    if (state.players.length < 2) {
      return res.status(400).json({ error: 'Need at least 2 players to start' });
    }

    const gifts = await generateGifts(state.players.length);
    const started = await gameState.startGame(gifts);

    if (started) {
      console.log('Game started!');
      const updatedState = await gameState.getState();
      
      await pusher.trigger('game-channel', 'game-started', {
        gifts,
        gameState: updatedState
      });

      return res.status(200).json({ success: true, gameState: updatedState });
    } else {
      return res.status(500).json({ error: 'Failed to start game' });
    }
  } catch (error) {
    console.error('Error starting game:', error);
    return res.status(500).json({ error: error.message || 'Failed to start game' });
  }
}

