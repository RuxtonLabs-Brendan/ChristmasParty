import { useState, useEffect } from 'react';
import { GAME_PHASES } from '../../../shared/types.js';

export function useGameState(socket) {
  const [gameState, setGameState] = useState({
    players: [],
    gifts: [],
    currentTurnIndex: 0,
    phase: GAME_PHASES.LOBBY,
    hostId: null
  });
  const [currentPlayerId, setCurrentPlayerId] = useState(null);

  useEffect(() => {
    if (!socket) return;

    const handleGameState = (state) => {
      setGameState(state);
    };

    const handlePlayerJoined = ({ gameState: newState }) => {
      setGameState(newState);
    };

    const handleGameStarted = ({ gameState: newState }) => {
      setGameState(newState);
    };

    const handleGiftOpened = ({ gameState: newState }) => {
      setGameState(newState);
    };

    const handleGiftStolen = ({ gameState: newState }) => {
      setGameState(newState);
    };

    const handlePlayerLeft = ({ gameState: newState }) => {
      setGameState(newState);
    };

    const handleError = ({ message }) => {
      console.error('Game error:', message);
      // Could show toast notification here
    };

    socket.on('game-state', handleGameState);
    socket.on('player-joined', handlePlayerJoined);
    socket.on('game-started', handleGameStarted);
    socket.on('gift-opened', handleGiftOpened);
    socket.on('gift-stolen', handleGiftStolen);
    socket.on('player-left', handlePlayerLeft);
    socket.on('error', handleError);

    return () => {
      socket.off('game-state', handleGameState);
      socket.off('player-joined', handlePlayerJoined);
      socket.off('game-started', handleGameStarted);
      socket.off('gift-opened', handleGiftOpened);
      socket.off('gift-stolen', handleGiftStolen);
      socket.off('player-left', handlePlayerLeft);
      socket.off('error', handleError);
    };
  }, [socket]);

  const joinGame = (name, emoji) => {
    if (socket) {
      socket.emit('player-join', { name, emoji });
      setCurrentPlayerId(socket.id);
    }
  };

  const startGame = () => {
    if (socket) {
      socket.emit('start-game');
    }
  };

  const openGift = (giftId) => {
    if (socket) {
      socket.emit('open-gift', { giftId });
    }
  };

  const stealGift = (giftId) => {
    if (socket) {
      socket.emit('steal-gift', { giftId });
    }
  };

  const isCurrentPlayer = () => {
    if (!socket || gameState.players.length === 0) return false;
    const currentPlayer = gameState.players[gameState.currentTurnIndex % gameState.players.length];
    return currentPlayer?.id === socket.id;
  };

  const isHost = () => {
    return socket && gameState.hostId === socket.id;
  };

  return {
    gameState,
    joinGame,
    startGame,
    openGift,
    stealGift,
    isCurrentPlayer,
    isHost,
    currentPlayerId
  };
}

