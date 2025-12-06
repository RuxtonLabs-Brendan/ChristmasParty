// Debug endpoint to check database state
import { initDatabase } from '../../server/db/index.js';
import * as db from '../../server/db/index.js';

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
    
    // Get pool directly - we need to access it from the module
    // Since pool is not exported, we'll use getLatestGame and getAnyGame
    const latestGame = await db.getLatestGame();
    const anyGame = await db.getAnyGame();
    
    const debugInfo = {
      latestGame: latestGame ? {
        id: latestGame.id,
        phase: latestGame.phase,
        created_at: latestGame.created_at,
        host_id: latestGame.host_id,
        players: await db.getPlayers(latestGame.id)
      } : null,
      anyGame: anyGame ? {
        id: anyGame.id,
        phase: anyGame.phase,
        created_at: anyGame.created_at,
        host_id: anyGame.host_id,
        players: await db.getPlayers(anyGame.id)
      } : null
    };
    
    return res.status(200).json(debugInfo);
  } catch (error) {
    console.error('Debug endpoint error:', error);
    return res.status(500).json({ error: error.message || 'Failed to get debug info', stack: error.stack });
  }
}

