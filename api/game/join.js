// Vercel serverless function for player join
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
    console.log('=== JOIN HANDLER START ===');
    console.log('Adding player to game state...');
    console.log('Player details:', { playerId, name: name.trim(), emoji });
    
    // Get the game ID BEFORE adding player (to verify it's correct)
    const gameIdBefore = await gameState.ensureGame();
    console.log('Game ID before adding player:', gameIdBefore);
    
    const player = await gameState.addPlayer(playerId, name.trim(), emoji);
    
    if (!player) {
      console.error('❌ ERROR: addPlayer returned null/undefined!');
      return res.status(500).json({ error: 'Failed to add player to game' });
    }
    
    console.log(`✅ Player joined: ${player.name} (${player.emoji})`);
    console.log(`Game ID after adding player: ${gameState.gameId}`);
    
    // Verify player was saved to database by querying directly
    const directDbCheck = await db.getPlayers(gameState.gameId);
    console.log(`Direct DB check: Found ${directDbCheck.length} players in game ${gameState.gameId}`);
    console.log('Direct DB players:', directDbCheck.map(p => ({ id: p.id, name: p.name })));
    
    const playerInDb = directDbCheck.find(p => p.id === playerId);
    if (!playerInDb) {
      console.error('❌ CRITICAL: Player NOT found in database after addPlayer!');
      console.error('Expected playerId:', playerId);
      console.error('Players in DB:', directDbCheck.map(p => p.id));
    } else {
      console.log('✅ Verified: Player found in database');
    }
    
    // Small delay to ensure database transaction is committed
    await new Promise(resolve => setTimeout(resolve, 200));
    
    // Force refresh and get state - this should now include the new player
    const state = await gameState.getState();
    console.log('Current game state after join:', {
      gameId: gameState.gameId,
      playersCount: state.players?.length || 0,
      players: state.players?.map(p => ({ id: p.id, name: p.name, emoji: p.emoji }))
    });
    
    // Verify the player is in the state
    const playerInState = state.players?.find(p => p.id === playerId);
    if (!playerInState) {
      console.error('❌ WARNING: Player not found in state after join!');
      console.error('Expected playerId:', playerId);
      console.error('Players in state:', state.players?.map(p => p.id) || []);
      console.error('State gameId:', gameState.gameId);
      
      // Try one more time with a longer delay
      await new Promise(resolve => setTimeout(resolve, 300));
      const retryState = await gameState.getState();
      console.log('Retry state players:', retryState.players?.length || 0);
      if (retryState.players && retryState.players.length > 0) {
        console.log('✅ Retry successful, updating state');
        state.players = retryState.players;
        state.phase = retryState.phase;
        state.hostId = retryState.hostId;
        state.currentTurnIndex = retryState.currentTurnIndex;
      }
    } else {
      console.log('✅ Verified: Player found in state');
    }
    
    console.log('=== JOIN HANDLER END ===');
    
    // Verify state has players before broadcasting
    if (!state.players || state.players.length === 0) {
      console.error('❌ CRITICAL: State has no players after join! Re-fetching...');
      // Try one more time with a longer delay
      await new Promise(resolve => setTimeout(resolve, 200));
      const retryState = await gameState.getState();
      if (retryState.players && retryState.players.length > 0) {
        console.log('✅ Retry successful, state now has players');
        state.players = retryState.players;
        state.phase = retryState.phase;
        state.hostId = retryState.hostId;
        state.currentTurnIndex = retryState.currentTurnIndex;
      } else {
        console.error('❌ Retry failed, state still has no players');
      }
    }
    
    // Broadcast to all clients via Pusher
    console.log('Broadcasting player-joined event via Pusher...');
    console.log('Pusher event payload:', {
      player: {
        id: player.id,
        name: player.name,
        emoji: player.emoji
      },
      gameState: {
        playersCount: state.players?.length || 0,
        players: state.players?.map(p => ({ id: p.id, name: p.name, emoji: p.emoji })) || [],
        phase: state.phase,
        hostId: state.hostId
      }
    });
    
    try {
      const pusherResult = await pusher.trigger('game-channel', 'player-joined', {
        player: {
          id: player.id,
          name: player.name,
          emoji: player.emoji,
          gifts: player.gifts || [],
          isConnected: true
        },
        gameState: {
          players: state.players || [],
          gifts: state.gifts || [],
          currentTurnIndex: state.currentTurnIndex || 0,
          phase: state.phase || 'lobby',
          hostId: state.hostId || null
        }
      });
      console.log('✅ Pusher event broadcasted successfully');
      console.log('Pusher trigger result:', pusherResult);
    } catch (pusherError) {
      console.error('❌ Pusher broadcast error:', pusherError);
      console.error('Pusher error details:', {
        message: pusherError.message,
        stack: pusherError.stack
      });
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

