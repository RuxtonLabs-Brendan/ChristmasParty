import { useState, useEffect } from 'react';
import { useSocket } from './hooks/useSocket';
import { useGameState } from './hooks/useGameState';
import { GAME_PHASES } from '../../shared/types.js';
import Lobby from './components/Lobby';
import GameBoard from './components/GameBoard';
import ChristmasTree from './components/ChristmasTree';
import WrappedGifts from './components/WrappedGifts';
import PlayerSeats from './components/PlayerSeats';
import OpenedGiftsRing from './components/OpenedGiftsRing';
import GameUI from './components/GameUI';
import AdminPortal from './components/AdminPortal';

function App() {
  const { socket, connected } = useSocket();
  const { gameState, joinGame, startGame, openGift, stealGift, isCurrentPlayer, isHost, currentPlayerId } = useGameState(socket);
  const [hasJoined, setHasJoined] = useState(false);
  const [openingGiftId, setOpeningGiftId] = useState(null);
  const [stealingGiftId, setStealingGiftId] = useState(null);
  const [showAdmin, setShowAdmin] = useState(false);

  useEffect(() => {
    if (!socket) return;

    const handleGiftOpened = ({ gift }) => {
      setOpeningGiftId(gift.id);
      setTimeout(() => setOpeningGiftId(null), 2000);
    };

    const handleGiftStolen = ({ gift }) => {
      setStealingGiftId(gift.id);
      setTimeout(() => setStealingGiftId(null), 2000);
    };

    socket.on('gift-opened', handleGiftOpened);
    socket.on('gift-stolen', handleGiftStolen);

    return () => {
      socket.off('gift-opened', handleGiftOpened);
      socket.off('gift-stolen', handleGiftStolen);
    };
  }, [socket]);

  const handleJoin = (name, emoji) => {
    joinGame(name, emoji);
    setHasJoined(true);
  };

  const handleGiftClick = (giftId) => {
    const gift = gameState.gifts?.find(g => g.id === giftId);
    if (!gift) return;

    if (!gift.isOpened) {
      // Open wrapped gift
      openGift(giftId);
    } else {
      // Steal opened gift
      stealGift(giftId);
    }
  };

  if (!hasJoined) {
    return (
      <>
        <Lobby
          onJoin={handleJoin}
          isHost={gameState.hostId === socket?.id}
          playerCount={gameState.players.length}
          onOpenAdmin={() => setShowAdmin(true)}
        />
        {showAdmin && (
          <AdminPortal 
            onClose={() => setShowAdmin(false)} 
            socket={socket}
            startGame={startGame}
            gameState={gameState}
          />
        )}
      </>
    );
  }

  return (
    <div className="w-screen h-screen overflow-hidden" style={{ width: '100vw', height: '100vh' }}>
      <GameUI
        gameState={gameState}
        connected={connected}
        isHost={isHost()}
        onStartGame={startGame}
        onOpenAdmin={() => setShowAdmin(true)}
      />
      
      {showAdmin && (
        <AdminPortal 
          onClose={() => setShowAdmin(false)} 
          socket={socket}
          startGame={startGame}
          gameState={gameState}
        />
      )}
      
      <GameBoard>
        <ChristmasTree />
        
        <WrappedGifts
          gifts={gameState.gifts}
          onGiftClick={handleGiftClick}
          isCurrentPlayer={isCurrentPlayer()}
        />
        
        <OpenedGiftsRing
          gifts={gameState.gifts}
          players={gameState.players}
          onGiftClick={handleGiftClick}
          isCurrentPlayer={isCurrentPlayer()}
        />
        
        <PlayerSeats
          players={gameState.players}
          currentTurnIndex={gameState.currentTurnIndex}
          currentPlayerId={currentPlayerId}
        />
      </GameBoard>
    </div>
  );
}

export default App;

