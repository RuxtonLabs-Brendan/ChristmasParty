export default function GameUI({ gameState, connected, isHost, onStartGame, onOpenAdmin }) {
  const currentPlayer = gameState.players[gameState.currentTurnIndex % gameState.players.length];
  const isPlaying = gameState.phase === 'playing';
  const isLobby = gameState.phase === 'lobby';

  return (
    <div className="fixed top-0 left-0 right-0 z-50 pointer-events-none">
      {/* Connection status */}
      <div className={`text-center py-2 font-impact text-lg ${
        connected ? 'bg-green-600 text-white' : 'bg-red-600 text-white'
      }`}>
        {connected ? '🟢 CONNECTED' : '🔴 DISCONNECTED'}
      </div>

      {/* Turn banner */}
      {isPlaying && currentPlayer && (
        <div className="bg-gradient-to-r from-christmas-red via-christmas-gold to-christmas-red py-4 border-y-8 border-white shadow-3d-strong">
          <div className="text-center">
            <div className="text-4xl font-impact text-christmas-red drop-shadow-lg">
              {currentPlayer.emoji} {currentPlayer.name.toUpperCase()}'S TURN!
            </div>
            <div className="text-xl font-impact text-white mt-2">
              Choose a wrapped gift OR steal an opened gift!
            </div>
          </div>
        </div>
      )}

      {/* Host start button */}
      {isLobby && isHost && gameState.players.length >= 2 && (
        <div className="absolute top-20 left-1/2 transform -translate-x-1/2 pointer-events-auto">
          <button
            onClick={onStartGame}
            className="bg-christmas-gold text-christmas-red font-impact text-2xl px-8 py-4 rounded-lg border-8 border-white hover:bg-yellow-300 transition shadow-3d-strong"
          >
            START GAME
          </button>
        </div>
      )}

      {/* Lobby waiting message */}
      {isLobby && !isHost && (
        <div className="absolute top-20 left-1/2 transform -translate-x-1/2 bg-white bg-opacity-90 px-6 py-3 rounded-lg border-4 border-christmas-gold">
          <div className="text-center font-impact text-christmas-red text-xl">
            Waiting for host to start...
          </div>
        </div>
      )}

      {/* Game ended */}
      {gameState.phase === 'ended' && (
        <div className="bg-gradient-to-r from-christmas-green via-christmas-gold to-christmas-green py-4 border-y-8 border-white shadow-3d-strong">
          <div className="text-center">
            <div className="text-4xl font-impact text-christmas-red drop-shadow-lg">
              🎉 GAME OVER! 🎉
            </div>
          </div>
        </div>
      )}

      {/* Admin Portal Button - Always visible in top right */}
      <div className="absolute top-4 right-4 pointer-events-auto">
        <button
          onClick={onOpenAdmin}
          className="bg-christmas-red text-christmas-gold font-impact text-lg px-4 py-2 rounded-lg border-4 border-christmas-gold hover:bg-red-800 transition shadow-lg"
          title="Admin Portal - Manage Gifts"
        >
          🎁 ADMIN
        </button>
      </div>
    </div>
  );
}

