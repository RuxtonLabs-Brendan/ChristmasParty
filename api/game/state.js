// Vercel serverless function to get current game state
import { initDatabase } from '../../server/db/index.js';
import * as db from '../../server/db/index.js';
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
    console.log('State API: Fetching game state...');
    
    // First, let's check what's in the database directly
    const latestGame = await db.getLatestGame();
    console.log('State API: Latest game from DB:', latestGame ? { id: latestGame.id, phase: latestGame.phase } : 'null');
    
    if (latestGame) {
      const directPlayers = await db.getPlayers(latestGame.id);
      console.log('State API: Direct DB query found', directPlayers.length, 'players');
      console.log('State API: Direct players:', directPlayers.map(p => ({ id: p.id, name: p.name, emoji: p.emoji })));
    } else {
      console.log('State API: No game found with players in database');
    }
    
    const state = await gameState.getState();
    console.log('State API: getState() returned', state.players?.length || 0, 'players');
    console.log('State API: State players:', state.players?.map(p => ({ id: p.id, name: p.name })) || []);
    
    // If state has no players but DB does, use DB data
    if ((state.players?.length || 0) === 0 && latestGame) {
      const directPlayers = await db.getPlayers(latestGame.id);
      if (directPlayers.length > 0) {
        console.log('State API: WARNING - getState() returned 0 players but DB has', directPlayers.length);
        console.log('State API: Using direct DB query result instead');
        state.players = directPlayers;
        state.phase = latestGame.phase || 'lobby';
        state.currentTurnIndex = latestGame.current_turn_index || 0;
        state.hostId = latestGame.host_id || null;
      }
    }
    
    console.log('State API: Final state being returned:', {
      playersCount: state.players?.length || 0,
      players: state.players?.map(p => ({ id: p.id, name: p.name })) || [],
      phase: state.phase
    });
    
    return res.status(200).json(state);
  } catch (error) {
    console.error('Error getting game state:', error);
    console.error('Error stack:', error.stack);
    return res.status(500).json({ error: error.message || 'Failed to get game state' });
  }
}

