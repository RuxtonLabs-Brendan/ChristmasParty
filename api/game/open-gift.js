// Vercel serverless function to open a gift
import { initDatabase } from '../../server/db/index.js';
import gameState from '../../server/gameState.js';
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

    const { giftId, playerId } = req.body || {};
    if (!giftId || !playerId) {
      return res.status(400).json({ error: 'giftId and playerId are required' });
    }

    const state = await gameState.getState();
    const currentPlayer = gameState.getCurrentPlayer();
    
    if (currentPlayer?.id !== playerId) {
      return res.status(403).json({ error: 'Not your turn' });
    }

    if (state.phase !== GAME_PHASES.PLAYING) {
      return res.status(400).json({ error: 'Game not in progress' });
    }

    const gift = await gameState.openGift(giftId);
    
    if (gift) {
      const updatedState = await gameState.getState();
      
      await pusher.trigger('game-channel', 'gift-opened', {
        gift,
        gameState: updatedState
      });

      return res.status(200).json({ success: true, gift, gameState: updatedState });
    } else {
      return res.status(400).json({ error: 'Cannot open that gift' });
    }
  } catch (error) {
    console.error('Error opening gift:', error);
    return res.status(500).json({ error: error.message || 'Failed to open gift' });
  }
}

