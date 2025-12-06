// Vercel serverless function to get current game state
import { initDatabase } from '../../server/db/index.js';
import gameState from '../../server/gameState.js';

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
  res.setHeader('Content-Type', 'application/json');

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    await ensureDb();
    const state = await gameState.getState();
    return res.status(200).json(state);
  } catch (error) {
    console.error('Error getting game state:', error);
    return res.status(500).json({ error: error.message || 'Failed to get game state' });
  }
}

