import { useState } from 'react';
import { CHRISTMAS_EMOJIS } from '../../../shared/types.js';

export default function Lobby({ onJoin, isHost, playerCount, players = [], onOpenAdmin }) {
  // Debug logging
  console.log('Lobby render - playerCount:', playerCount, 'players:', players, 'players.length:', players?.length);
  
  // Ensure playerCount matches actual players array length
  const actualPlayerCount = players?.length || 0;
  const displayCount = Math.max(playerCount, actualPlayerCount);
  const [name, setName] = useState('');
  const [selectedEmoji, setSelectedEmoji] = useState('🎄');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  const handleJoin = () => {
    if (name.trim() && selectedEmoji) {
      onJoin(name.trim(), selectedEmoji);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50">
      <div className="bg-gradient-to-br from-christmas-red to-christmas-green p-8 rounded-lg border-8 border-christmas-gold shadow-3d-strong max-w-md w-full">
        <h1 className="text-4xl font-impact text-christmas-gold text-center mb-6 drop-shadow-lg">
          ENLIGHTEN CHRISTMAS PARTY
        </h1>
        
        <div className="space-y-4">
          <div>
            <label className="block text-christmas-gold text-lg mb-2">Your Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleJoin()}
              className="w-full px-4 py-2 rounded border-4 border-christmas-gold bg-white text-black font-impact text-xl"
              placeholder="Enter your name"
              maxLength={20}
            />
          </div>

          <div>
            <label className="block text-christmas-gold text-lg mb-2">Choose Your Emoji</label>
            <div className="relative">
              <button
                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                className="w-full px-4 py-3 rounded border-4 border-christmas-gold bg-white text-4xl hover:bg-gray-100 transition"
              >
                {selectedEmoji}
              </button>
              
              {showEmojiPicker && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-white border-4 border-christmas-gold rounded p-4 grid grid-cols-5 gap-2 z-10 max-h-64 overflow-y-auto">
                  {CHRISTMAS_EMOJIS.map((emoji, idx) => (
                    <button
                      key={idx}
                      onClick={() => {
                        setSelectedEmoji(emoji);
                        setShowEmojiPicker(false);
                      }}
                      className="text-3xl hover:scale-125 transition-transform p-2"
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <button
            onClick={handleJoin}
            disabled={!name.trim()}
            className="w-full py-3 bg-christmas-gold text-christmas-red font-impact text-2xl rounded border-4 border-white hover:bg-yellow-300 disabled:opacity-50 disabled:cursor-not-allowed transition shadow-lg"
          >
            JOIN GAME
          </button>

          {/* Players Waiting Display */}
          <div className="bg-white bg-opacity-20 rounded-lg border-4 border-christmas-gold p-4">
            <div className="flex items-center justify-center gap-3 mb-3">
              <div className="text-4xl">👥</div>
              <div className="text-center">
                <div className="text-3xl font-impact text-christmas-gold drop-shadow-lg">
                  {displayCount}
                </div>
                <div className="text-lg font-impact text-christmas-gold">
                  {displayCount === 0 
                    ? 'No players yet' 
                    : displayCount === 1 
                    ? 'Player waiting' 
                    : 'Players waiting'}
                </div>
              </div>
            </div>
            
            {/* Player List */}
            {players && players.length > 0 && (
              <div className="mt-3 pt-3 border-t-2 border-christmas-gold border-opacity-30">
                <div className="space-y-2 max-h-32 overflow-y-auto">
                  {players.map((player) => (
                    <div 
                      key={player.id} 
                      className="flex items-center justify-center gap-2 bg-white bg-opacity-30 rounded px-3 py-1"
                    >
                      <span className="text-2xl">{player.emoji}</span>
                      <span className="text-christmas-gold font-impact text-sm">{player.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {/* Status Message */}
            {displayCount > 0 && (
              <div className="mt-3 pt-3 border-t-2 border-christmas-gold border-opacity-30">
                <p className="text-center text-christmas-gold text-sm font-impact">
                  {displayCount < 2 
                    ? '⏳ Waiting for more players to join...' 
                    : '✅ Ready to start! (Host can start the game)'}
                </p>
              </div>
            )}
          </div>

          {/* Admin Portal Button */}
          <button
            onClick={onOpenAdmin}
            className="w-full py-2 bg-christmas-red text-christmas-gold font-impact text-lg rounded border-4 border-christmas-gold hover:bg-red-800 transition shadow-lg mt-4"
          >
            🎁 ADMIN PORTAL
          </button>
        </div>
      </div>
    </div>
  );
}

