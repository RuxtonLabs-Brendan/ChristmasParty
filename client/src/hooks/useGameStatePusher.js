import { useState, useEffect } from 'react';
import { GAME_PHASES } from '../../../shared/types.js';
import { usePusher } from './usePusher.js';

const API_BASE = import.meta.env.PROD 
  ? '/api/game'
  : 'http://localhost:3001/api/game';

export function useGameStatePusher() {
  const { channel, connected, playerId } = usePusher();
  const [gameState, setGameState] = useState({
    players: [],
    gifts: [],
    currentTurnIndex: 0,
    phase: GAME_PHASES.LOBBY,
    hostId: null
  });

  // Fetch initial game state
  useEffect(() => {
    const fetchState = async () => {
      try {
        const response = await fetch(`${API_BASE}/state`);
        if (response.ok) {
          const state = await response.json();
          setGameState(state);
        }
      } catch (error) {
        console.error('Error fetching initial game state:', error);
      }
    };
    fetchState();
  }, []);

  // Listen to Pusher events
  useEffect(() => {
    if (!channel) return;

    const handlePlayerJoined = (data) => {
      console.log('Received player-joined event:', data);
      setGameState(data.gameState);
    };

    const handleGameStarted = (data) => {
      console.log('Received game-started event:', data);
      setGameState(data.gameState);
    };

    const handleGiftOpened = (data) => {
      console.log('Received gift-opened event:', data);
      setGameState(data.gameState);
    };

    const handleGiftStolen = (data) => {
      console.log('Received gift-stolen event:', data);
      setGameState(data.gameState);
    };

    const handlePlayerLeft = (data) => {
      console.log('Received player-left event:', data);
      setGameState(data.gameState);
    };

    channel.bind('player-joined', handlePlayerJoined);
    channel.bind('game-started', handleGameStarted);
    channel.bind('gift-opened', handleGiftOpened);
    channel.bind('gift-stolen', handleGiftStolen);
    channel.bind('player-left', handlePlayerLeft);

    return () => {
      channel.unbind('player-joined', handlePlayerJoined);
      channel.unbind('game-started', handleGameStarted);
      channel.unbind('gift-opened', handleGiftOpened);
      channel.unbind('gift-stolen', handleGiftStolen);
      channel.unbind('player-left', handlePlayerLeft);
    };
  }, [channel]);

  const joinGame = async (name, emoji) => {
    try {
      const response = await fetch(`${API_BASE}/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, emoji, playerId })
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to join game');
      }
      
      const data = await response.json();
      setGameState(data.gameState);
    } catch (error) {
      console.error('Error joining game:', error);
      throw error;
    }
  };

  const startGame = async () => {
    try {
      const response = await fetch(`${API_BASE}/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerId })
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to start game');
      }
    } catch (error) {
      console.error('Error starting game:', error);
      throw error;
    }
  };

  const openGift = async (giftId) => {
    try {
      const response = await fetch(`${API_BASE}/open-gift`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ giftId, playerId })
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to open gift');
      }
    } catch (error) {
      console.error('Error opening gift:', error);
      throw error;
    }
  };

  const stealGift = async (giftId) => {
    try {
      const response = await fetch(`${API_BASE}/steal-gift`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ giftId, playerId })
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to steal gift');
      }
    } catch (error) {
      console.error('Error stealing gift:', error);
      throw error;
    }
  };

  const isCurrentPlayer = () => {
    if (gameState.players.length === 0) return false;
    const currentPlayer = gameState.players[gameState.currentTurnIndex % gameState.players.length];
    return currentPlayer?.id === playerId;
  };

  const isHost = () => {
    return gameState.hostId === playerId;
  };

  return {
    gameState,
    joinGame,
    startGame,
    openGift,
    stealGift,
    isCurrentPlayer,
    isHost,
    currentPlayerId: playerId,
    connected
  };
}

