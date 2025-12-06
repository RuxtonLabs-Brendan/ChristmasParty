import { GAME_PHASES } from '../shared/types.js';
import * as db from './db/index.js';

class GameState {
  constructor() {
    this.gameId = null; // Will be set when first game is created
    this._playersCache = null;
    this._giftsCache = null;
    this._gameCache = null;
  }

  async ensureGame() {
    if (!this.gameId) {
      try {
        // First, try to find an existing game with players
        const existingGame = await db.getLatestGame();
        if (existingGame) {
          console.log(`ensureGame: Found existing game ${existingGame.id}`);
          this.gameId = existingGame.id;
          this._gameCache = existingGame;
        } else {
          // No existing game, create a new one
          console.log('ensureGame: No existing game found, creating new game');
          const game = await db.createGame();
          this.gameId = game.id;
          this._gameCache = game;
        }
      } catch (error) {
        console.error('Database error in ensureGame:', error.message);
        // Fallback to in-memory game ID
        this.gameId = 'in-memory-game';
        this._gameCache = { id: 'in-memory-game', phase: 'lobby', current_turn_index: 0 };
      }
    }
    return this.gameId;
  }

  async refreshCache() {
    if (!this.gameId) {
      console.log('refreshCache: No gameId, skipping refresh');
      return;
    }
    
    try {
      console.log(`refreshCache: Refreshing cache for gameId: ${this.gameId}`);
      const [game, players, gifts] = await Promise.all([
        db.getGame(this.gameId),
        db.getPlayers(this.gameId),
        db.getGifts(this.gameId)
      ]);
      
      console.log(`refreshCache: Fetched ${players?.length || 0} players, ${gifts?.length || 0} gifts`);
      
      this._gameCache = game || this._gameCache;
      this._playersCache = players || [];
      this._giftsCache = gifts || [];
    } catch (error) {
      console.error('Database error in refreshCache:', error.message);
      console.error('Error stack:', error.stack);
      // Keep existing cache if database fails
      this._gameCache = this._gameCache || { id: this.gameId, phase: 'lobby', current_turn_index: 0 };
      this._playersCache = this._playersCache || [];
      this._giftsCache = this._giftsCache || [];
    }
  }

  get players() {
    return this._playersCache || [];
  }

  get gifts() {
    return this._giftsCache || [];
  }

  get currentTurnIndex() {
    return this._gameCache?.current_turn_index || 0;
  }

  get phase() {
    return this._gameCache?.phase || GAME_PHASES.LOBBY;
  }

  get hostId() {
    return this._gameCache?.host_id || null;
  }

  async addPlayer(socketId, name, emoji) {
    const gameId = await this.ensureGame();
    console.log(`addPlayer: Using gameId ${gameId} for player ${name} (${socketId})`);
    
    // Check if this is the first player (becomes host)
    const players = await db.getPlayers(gameId);
    const isFirstPlayer = players.length === 0;
    console.log(`addPlayer: Current players in game: ${players.length}, isFirstPlayer: ${isFirstPlayer}`);
    
    await db.addPlayer(gameId, socketId, name, emoji);
    console.log(`addPlayer: Player saved to database`);
    
    if (isFirstPlayer) {
      await db.updateGame(gameId, { hostId: socketId });
      console.log(`addPlayer: Set ${socketId} as host`);
    }
    
    await this.refreshCache();
    const addedPlayer = this.players.find(p => p.id === socketId);
    console.log(`addPlayer: After refresh, found player:`, addedPlayer ? { id: addedPlayer.id, name: addedPlayer.name } : 'NOT FOUND');
    console.log(`addPlayer: Total players in cache: ${this.players.length}`);
    return addedPlayer;
  }

  async removePlayer(socketId) {
    if (!this.gameId) return;
    
    await db.removePlayer(this.gameId, socketId);
    
    // If host left, assign new host
    if (this.hostId === socketId) {
      const players = await db.getPlayers(this.gameId);
      if (players.length > 0) {
        await db.updateGame(this.gameId, { hostId: players[0].id });
      } else {
        await db.updateGame(this.gameId, { hostId: null });
      }
    }
    
    // Reset game if no players
    const players = await db.getPlayers(this.gameId);
    if (players.length === 0) {
      await this.reset();
    } else {
      await this.refreshCache();
    }
  }

  async setPlayerConnected(socketId, isConnected) {
    if (!this.gameId) return;
    await db.setPlayerConnected(this.gameId, socketId, isConnected);
    await this.refreshCache();
  }

  async startGame(gifts) {
    if (this.phase !== GAME_PHASES.LOBBY) return false;
    if (this.players.length < 2) return false;
    
    const gameId = await this.ensureGame();
    await db.addGifts(gameId, gifts);
    await db.updateGame(gameId, {
      phase: GAME_PHASES.PLAYING,
      currentTurnIndex: 0
    });
    
    await this.refreshCache();
    return true;
  }

  getCurrentPlayer() {
    if (this.players.length === 0) return null;
    return this.players[this.currentTurnIndex % this.players.length];
  }

  async openGift(giftId) {
    const currentPlayer = this.getCurrentPlayer();
    if (!currentPlayer) return null;
    
    const gameId = await this.ensureGame();
    const gift = await db.openGift(gameId, giftId, currentPlayer.id);
    
    if (gift) {
      await this.nextTurn();
      await this.refreshCache();
    }
    
    return gift;
  }

  async stealGift(giftId) {
    const currentPlayer = this.getCurrentPlayer();
    if (!currentPlayer) return null;
    
    const gameId = await this.ensureGame();
    const gift = await db.stealGift(gameId, giftId, currentPlayer.id);
    
    if (gift) {
      await this.nextTurn();
      await this.refreshCache();
    }
    
    return gift;
  }

  async nextTurn() {
    const gameId = await this.ensureGame();
    const newIndex = this.currentTurnIndex + 1;
    
    // Check if game is over
    await this.refreshCache();
    const allOpened = this.gifts.every(g => g.isOpened);
    const totalTurns = this.players.length + this.gifts.length;
    
    const updates = { currentTurnIndex: newIndex };
    if (allOpened && newIndex >= totalTurns) {
      updates.phase = GAME_PHASES.ENDED;
    }
    
    await db.updateGame(gameId, updates);
    await this.refreshCache();
  }

  async getState() {
    // In serverless, we can't rely on instance state, so always query fresh
    console.log('getState: Starting fresh query...');
    
    // Find the latest game with players
    const latestGame = await db.getLatestGame();
    
    if (!latestGame) {
      console.log('getState: No game found with players, checking all games...');
      // Try to find ANY game, even without players (might be a new game)
      // We need to import pool or use a helper function
      try {
        // Use a direct query through db module if available
        const anyGame = await db.getAnyGame();
        if (anyGame) {
          console.log(`getState: Found game ${anyGame.id} without players yet`);
          const players = await db.getPlayers(anyGame.id);
          return {
            players: players || [],
            gifts: [],
            currentTurnIndex: anyGame.current_turn_index || 0,
            phase: anyGame.phase || GAME_PHASES.LOBBY,
            hostId: anyGame.host_id || null
          };
        }
      } catch (err) {
        console.error('getState: Error checking all games:', err);
      }
      
      console.log('getState: No game found, returning empty state');
      return {
        players: [],
        gifts: [],
        currentTurnIndex: 0,
        phase: GAME_PHASES.LOBBY,
        hostId: null
      };
    }
    
    console.log(`getState: Found game ${latestGame.id}, fetching players and gifts...`);
    this.gameId = latestGame.id;
    this._gameCache = latestGame;
    
    // Fetch players and gifts directly from database
    const [players, gifts] = await Promise.all([
      db.getPlayers(latestGame.id),
      db.getGifts(latestGame.id)
    ]);
    
    console.log(`getState: Fetched ${players?.length || 0} players, ${gifts?.length || 0} gifts`);
    
    this._playersCache = players || [];
    this._giftsCache = gifts || [];
    
    const state = {
      players: this._playersCache,
      gifts: this._giftsCache,
      currentTurnIndex: latestGame.current_turn_index || 0,
      phase: latestGame.phase || GAME_PHASES.LOBBY,
      hostId: latestGame.host_id || null
    };
    
    console.log('getState() returning:', {
      gameId: latestGame.id,
      playersCount: state.players.length,
      players: state.players.map(p => ({ id: p.id, name: p.name, emoji: p.emoji })),
      phase: state.phase,
      hostId: state.hostId
    });
    
    return state;
  }

  async addAdminGift(product) {
    return await db.addAdminGift(product.name, product.image);
  }

  async getAdminGifts() {
    return await db.getAdminGifts();
  }

  async updateAdminGift(giftId, product) {
    return await db.updateAdminGift(giftId, product.name, product.image);
  }

  async deleteAdminGift(giftId) {
    await db.deleteAdminGift(giftId);
  }

  async clearAdminGifts() {
    await db.clearAdminGifts();
  }

  async reset() {
    if (!this.gameId) return;
    
    await db.resetGame(this.gameId);
    // Create a new game for the next session
    const newGame = await db.createGame();
    this.gameId = newGame.id;
    await this.refreshCache();
  }
}

export default new GameState();
