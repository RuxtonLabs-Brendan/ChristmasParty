import express from 'express';
import gameState from './gameState.js';
import { generateGifts } from './giftGenerator.js';
import { GAME_PHASES } from '../shared/types.js';

const router = express.Router();

// Get current game state
router.get('/state', async (req, res) => {
  try {
    const state = await gameState.getState();
    res.json(state);
  } catch (error) {
    console.error('Error getting game state:', error);
    res.status(500).json({ error: error.message || 'Failed to get game state' });
  }
});

// Join game
router.post('/join', async (req, res) => {
  try {
    const { name, emoji, playerId } = req.body;
    
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Name is required' });
    }
    
    if (!playerId) {
      return res.status(400).json({ error: 'playerId is required' });
    }

    const state = await gameState.getState();
    
    // If no game exists, create one
    if (!state.gameId) {
      await gameState.ensureGame();
    }
    
    // Add player
    await gameState.addPlayer(playerId, name.trim(), emoji || '🎄');
    
    const updatedState = await gameState.getState();
    res.json({ success: true, gameState: updatedState });
  } catch (error) {
    console.error('Error joining game:', error);
    res.status(500).json({ error: error.message || 'Failed to join game' });
  }
});

// Start game
router.post('/start', async (req, res) => {
  try {
    const { playerId } = req.body;
    
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
      res.json({ success: true, gameState: updatedState });
    } else {
      res.status(500).json({ error: 'Failed to start game' });
    }
  } catch (error) {
    console.error('Error starting game:', error);
    res.status(500).json({ error: error.message || 'Failed to start game' });
  }
});

// Open gift
router.post('/open-gift', async (req, res) => {
  try {
    const { giftId, playerId } = req.body;
    
    if (!giftId) {
      return res.status(400).json({ error: 'giftId is required' });
    }
    
    if (!playerId) {
      return res.status(400).json({ error: 'playerId is required' });
    }

    const state = await gameState.getState();
    
    if (state.phase !== GAME_PHASES.PLAYING) {
      return res.status(400).json({ error: 'Game is not in playing phase' });
    }

    const currentPlayer = gameState.getCurrentPlayer();
    if (currentPlayer?.id !== playerId) {
      return res.status(403).json({ error: 'Not your turn' });
    }

    const gift = await gameState.openGift(giftId);
    
    if (!gift) {
      return res.status(400).json({ error: 'Gift not found or already opened' });
    }

    const updatedState = await gameState.getState();
    res.json({ success: true, gift, gameState: updatedState });
  } catch (error) {
    console.error('Error opening gift:', error);
    res.status(500).json({ error: error.message || 'Failed to open gift' });
  }
});

// Steal gift
router.post('/steal-gift', async (req, res) => {
  try {
    const { giftId, playerId } = req.body;
    
    if (!giftId) {
      return res.status(400).json({ error: 'giftId is required' });
    }
    
    if (!playerId) {
      return res.status(400).json({ error: 'playerId is required' });
    }

    const state = await gameState.getState();
    
    if (state.phase !== GAME_PHASES.PLAYING) {
      return res.status(400).json({ error: 'Game is not in playing phase' });
    }

    const currentPlayer = gameState.getCurrentPlayer();
    if (currentPlayer?.id !== playerId) {
      return res.status(403).json({ error: 'Not your turn' });
    }

    const gift = await gameState.stealGift(giftId);
    
    if (!gift) {
      return res.status(400).json({ error: 'Cannot steal this gift' });
    }

    const updatedState = await gameState.getState();
    res.json({ success: true, gift, gameState: updatedState });
  } catch (error) {
    console.error('Error stealing gift:', error);
    res.status(500).json({ error: error.message || 'Failed to steal gift' });
  }
});

export default router;

