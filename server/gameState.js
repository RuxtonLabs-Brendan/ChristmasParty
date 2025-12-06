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
    
    // Check if this is the first player (becomes host)
    const players = await db.getPlayers(gameId);
    const isFirstPlayer = players.length === 0;
    
    await db.addPlayer(gameId, socketId, name, emoji);
    
    if (isFirstPlayer) {
      await db.updateGame(gameId, { hostId: socketId });
    }
    
    await this.refreshCache();
    return this.players.find(p => p.id === socketId);
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
    // Always ensure game exists and refresh cache
    await this.ensureGame();
    await this.refreshCache();
    
    const state = {
      players: this.players || [],
      gifts: this.gifts || [],
      currentTurnIndex: this.currentTurnIndex || 0,
      phase: this.phase || GAME_PHASES.LOBBY,
      hostId: this.hostId || null
    };
    
    console.log('getState() returning:', {
      playersCount: state.players.length,
      players: state.players.map(p => ({ id: p.id, name: p.name, emoji: p.emoji })),
      phase: state.phase,
      hostId: state.hostId,
      gameId: this.gameId
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
