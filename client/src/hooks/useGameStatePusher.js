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

  // Fetch initial game state and set up polling as fallback
  useEffect(() => {
    const fetchState = async () => {
      try {
        console.log('🔄 Fetching game state...');
        const response = await fetch(`${API_BASE}/state`);
        if (response.ok) {
          const state = await response.json();
          console.log('✅ Game state received:', {
            playersCount: state.players?.length || 0,
            players: state.players,
            phase: state.phase
          });
          setGameState(state);
        } else {
          console.error('❌ Failed to fetch state:', response.status);
        }
      } catch (error) {
        console.error('❌ Error fetching game state:', error);
      }
    };
    
    // Fetch immediately
    fetchState();
    
    // Poll for state updates every 10 seconds as a fallback (in case Pusher events are missed)
    // Reduced frequency since real-time should come from Pusher
    const pollInterval = setInterval(() => {
      console.log('🔄 Polling for game state update (fallback)...');
      fetchState();
    }, 10000);
    
    return () => {
      console.log('🧹 Cleaning up polling interval');
      clearInterval(pollInterval);
    };
  }, []);

  // Listen to Pusher events
  useEffect(() => {
    if (!channel) {
      console.log('⏳ Waiting for Pusher channel...');
      return;
    }

    console.log('📡 Setting up Pusher event listeners...');

    const handlePlayerJoined = (data) => {
      console.log('🎉 Received player-joined event:', data);
      console.log('New game state:', data.gameState);
      console.log('Players in new state:', data.gameState?.players);
      if (data.gameState) {
        console.log(`✅ Updating game state with ${data.gameState.players?.length || 0} players`);
        setGameState(data.gameState);
      } else {
        console.warn('⚠️ player-joined event missing gameState, fetching fresh state...');
        // If gameState is missing, fetch it immediately
        fetch(`${API_BASE}/state`)
          .then(res => res.json())
          .then(state => {
            console.log('✅ Fetched fresh state after player-joined event:', state);
            setGameState(state);
          })
          .catch(err => console.error('Error fetching state after player-joined:', err));
      }
    };

    const handleGameStarted = (data) => {
      console.log('🎮 Received game-started event:', data);
      if (data.gameState) {
        setGameState(data.gameState);
      }
    };

    const handleGiftOpened = (data) => {
      console.log('🎁 Received gift-opened event:', data);
      if (data.gameState) {
        setGameState(data.gameState);
      }
    };

    const handleGiftStolen = (data) => {
      console.log('🔄 Received gift-stolen event:', data);
      if (data.gameState) {
        setGameState(data.gameState);
      }
    };

    const handlePlayerLeft = (data) => {
      console.log('👋 Received player-left event:', data);
      if (data.gameState) {
        setGameState(data.gameState);
      }
    };

    // Bind all events
    channel.bind('player-joined', handlePlayerJoined);
    channel.bind('game-started', handleGameStarted);
    channel.bind('gift-opened', handleGiftOpened);
    channel.bind('gift-stolen', handleGiftStolen);
    channel.bind('player-left', handlePlayerLeft);
    
    console.log('✅ Pusher event listeners bound');

    return () => {
      console.log('🧹 Cleaning up Pusher event listeners');
      channel.unbind('player-joined', handlePlayerJoined);
      channel.unbind('game-started', handleGameStarted);
      channel.unbind('gift-opened', handleGiftOpened);
      channel.unbind('gift-stolen', handleGiftStolen);
      channel.unbind('player-left', handlePlayerLeft);
    };
  }, [channel]);

  const joinGame = async (name, emoji) => {
    try {
      console.log('Joining game:', { name, emoji, playerId });
      console.log('API_BASE:', API_BASE);
      
      const response = await fetch(`${API_BASE}/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, emoji, playerId })
      });
      
      console.log('Join response status:', response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Join error response:', errorText);
        let error;
        try {
          error = JSON.parse(errorText);
        } catch {
          error = { error: errorText || 'Failed to join game' };
        }
        throw new Error(error.error || 'Failed to join game');
      }
      
      const data = await response.json();
      console.log('Join successful, received data:', data);
      console.log('Game state from join:', data.gameState);
      if (data.gameState) {
        setGameState(data.gameState);
      }
    } catch (error) {
      console.error('❌ Error joining game:', error);
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

