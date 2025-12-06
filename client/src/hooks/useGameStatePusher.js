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
        console.log('State API response status:', response.status);
        console.log('State API response headers:', Object.fromEntries(response.headers.entries()));
        
        if (response.ok) {
          const responseText = await response.text();
          console.log('State API raw response:', responseText);
          
          let state;
          try {
            state = JSON.parse(responseText);
          } catch (parseError) {
            console.error('❌ Failed to parse state response:', parseError);
            console.error('Response text:', responseText);
            return;
          }
          
          console.log('✅ Game state received:', {
            playersCount: state.players?.length || 0,
            players: state.players,
            phase: state.phase,
            hostId: state.hostId,
            fullState: state
          });
          console.log('✅ Players array:', state.players);
          console.log('✅ Players array type:', Array.isArray(state.players));
          console.log('✅ Players array length:', state.players?.length);
          if (state.players && state.players.length > 0) {
            console.log('✅ Player details:', state.players.map(p => ({ id: p.id, name: p.name, emoji: p.emoji })));
          } else {
            console.warn('⚠️ WARNING: State API returned 0 players!');
            console.warn('Full state object:', JSON.stringify(state, null, 2));
          }
          setGameState(state);
        } else {
          const errorText = await response.text();
          console.error('❌ Failed to fetch state:', response.status, errorText);
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

  // Handle browser close/unload - remove player from game
  useEffect(() => {
    if (!playerId) return; // Don't set up listeners if no playerId yet

    const handleBeforeUnload = (event) => {
      // Use fetch with keepalive - more reliable than sendBeacon for JSON
      // keepalive ensures the request continues even after page unloads
      try {
        fetch(`${API_BASE}/leave`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ playerId }),
          keepalive: true // Critical: allows request to complete after page unloads
        }).catch(err => {
          // Silently fail - page is closing anyway
          console.log('Leave request sent (may complete after page closes)');
        });
        console.log('✅ Sent leave request via fetch (keepalive)');
      } catch (error) {
        console.error('Error sending leave request:', error);
        // Fallback: try sendBeacon
        if (navigator.sendBeacon) {
          try {
            const blob = new Blob([JSON.stringify({ playerId })], { type: 'application/json' });
            navigator.sendBeacon(`${API_BASE}/leave`, blob);
            console.log('✅ Sent leave request via sendBeacon (fallback)');
          } catch (beaconError) {
            console.error('Error with sendBeacon fallback:', beaconError);
          }
        }
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('pagehide', handleBeforeUnload); // Also handle pagehide for mobile

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('pagehide', handleBeforeUnload);
      
      // Also try to leave when component unmounts (e.g., navigation away)
      // Use fetch with keepalive for component unmount
      fetch(`${API_BASE}/leave`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerId }),
        keepalive: true
      }).catch(err => {
        // Silently fail - component is unmounting anyway
        console.log('Leave request on unmount (may have failed):', err.message);
      });
    };
  }, [playerId]);

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

    const handleGameReset = (data) => {
      console.log('🔄 Received game-reset event:', data);
      if (data.gameState) {
        console.log('Game reset - updating state:', data.gameState);
        setGameState(data.gameState);
        // If player was in game, they should see the lobby again
        // The hasJoined state will be handled by the App component
      }
    };

    // Bind all events
    channel.bind('player-joined', handlePlayerJoined);
    channel.bind('game-started', handleGameStarted);
    channel.bind('gift-opened', handleGiftOpened);
    channel.bind('gift-stolen', handleGiftStolen);
    channel.bind('player-left', handlePlayerLeft);
    channel.bind('game-reset', handleGameReset);
    
    console.log('✅ Pusher event listeners bound');

    return () => {
      console.log('🧹 Cleaning up Pusher event listeners');
      channel.unbind('player-joined', handlePlayerJoined);
      channel.unbind('game-started', handleGameStarted);
      channel.unbind('gift-opened', handleGiftOpened);
      channel.unbind('gift-stolen', handleGiftStolen);
      channel.unbind('player-left', handlePlayerLeft);
      channel.unbind('game-reset', handleGameReset);
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
      console.log('Opening gift:', giftId);
      const response = await fetch(`${API_BASE}/open-gift`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ giftId, playerId })
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        let error;
        try {
          error = JSON.parse(errorText);
        } catch {
          error = { error: errorText || 'Failed to open gift' };
        }
        console.error('Open gift error response:', error);
        throw new Error(error.error || 'Failed to open gift');
      }
      
      const data = await response.json();
      console.log('Open gift success:', data);
      
      // Update state if provided
      if (data.gameState) {
        setGameState(data.gameState);
      }
    } catch (error) {
      console.error('Error opening gift:', error);
      // Don't throw - let Pusher event handle the update
      // This prevents the app from crashing
    }
  };

  const stealGift = async (giftId) => {
    try {
      console.log('Stealing gift:', giftId);
      const response = await fetch(`${API_BASE}/steal-gift`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ giftId, playerId })
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        let error;
        try {
          error = JSON.parse(errorText);
        } catch {
          error = { error: errorText || 'Failed to steal gift' };
        }
        console.error('Steal gift error response:', error);
        throw new Error(error.error || 'Failed to steal gift');
      }
      
      const data = await response.json();
      console.log('Steal gift success:', data);
      
      // Update state if provided
      if (data.gameState) {
        setGameState(data.gameState);
      }
    } catch (error) {
      console.error('Error stealing gift:', error);
      // Don't throw - let Pusher event handle the update
      // This prevents the app from crashing
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

