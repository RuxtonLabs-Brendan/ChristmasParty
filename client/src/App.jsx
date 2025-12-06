import { useState, useEffect } from 'react';
import { useGameStatePusher } from './hooks/useGameStatePusher';
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
  const { gameState, joinGame, startGame, openGift, stealGift, isCurrentPlayer, isHost, currentPlayerId, connected } = useGameStatePusher();
  
  // Debug logging
  useEffect(() => {
    console.log('App - gameState updated:', gameState);
    console.log('App - players count:', gameState.players?.length);
    console.log('App - players array:', gameState.players);
  }, [gameState]);
  const [hasJoined, setHasJoined] = useState(false);
  const [openingGiftId, setOpeningGiftId] = useState(null);
  const [stealingGiftId, setStealingGiftId] = useState(null);
  const [showAdmin, setShowAdmin] = useState(false);

  // Handle gift animations (handled by Pusher events in useGameStatePusher)
  useEffect(() => {
    // These will be triggered by gameState updates from Pusher
    // We can add animation logic here if needed
  }, [gameState]);

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
          isHost={gameState.hostId === currentPlayerId}
          playerCount={gameState.players?.length || 0}
          players={gameState.players || []}
          onOpenAdmin={() => setShowAdmin(true)}
        />
        {showAdmin && (
          <AdminPortal 
            onClose={() => setShowAdmin(false)} 
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

