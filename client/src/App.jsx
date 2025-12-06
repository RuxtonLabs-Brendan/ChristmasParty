import { useState, useEffect } from 'react';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { useGameStatePusher } from './hooks/useGameStatePusher';
import { GAME_PHASES } from '../../shared/types.js';
import Lobby from './components/Lobby';
import GameBoard from './components/GameBoard';
import ChristmasTree from './components/ChristmasTree';
import WrappedGifts from './components/WrappedGifts';
import PlayerSeats from './components/PlayerSeats';
import OpenedGiftsRing from './components/OpenedGiftsRing';
import GameUI from './components/GameUI';
import AdminPage from './pages/AdminPage';

function GameApp() {
  const { gameState, joinGame, startGame, openGift, stealGift, isCurrentPlayer, isHost, currentPlayerId, connected } = useGameStatePusher();
  const navigate = useNavigate();
  
  // Debug logging
  useEffect(() => {
    console.log('App - gameState updated:', gameState);
    console.log('App - players count:', gameState.players?.length);
    console.log('App - players array:', gameState.players);
  }, [gameState]);
  
  const [hasJoined, setHasJoined] = useState(false);
  const [openingGiftId, setOpeningGiftId] = useState(null);
  const [stealingGiftId, setStealingGiftId] = useState(null);

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
    try {
      const gift = gameState.gifts?.find(g => g.id === giftId);
      if (!gift) {
        console.warn('Gift not found:', giftId);
        return;
      }

      if (!gift.isOpened) {
        // Open wrapped gift
        console.log('Opening wrapped gift:', giftId);
        openGift(giftId).catch(error => {
          console.error('Error in handleGiftClick (open):', error);
          // Error is already logged in openGift, just prevent crash
        });
      } else {
        // Steal opened gift
        console.log('Stealing opened gift:', giftId);
        stealGift(giftId).catch(error => {
          console.error('Error in handleGiftClick (steal):', error);
          // Error is already logged in stealGift, just prevent crash
        });
      }
    } catch (error) {
      console.error('Error in handleGiftClick:', error);
      // Prevent app crash
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
          onOpenAdmin={() => navigate('/admin')}
        />
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
        onOpenAdmin={() => navigate('/admin')}
      />
      
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

function App() {
  return (
    <Routes>
      <Route path="/admin" element={<AdminPage />} />
      <Route path="*" element={<GameApp />} />
    </Routes>
  );
}

export default App;

