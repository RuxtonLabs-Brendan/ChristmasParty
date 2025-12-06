import { getCircularPosition } from '../utils/positioning.js';

export default function PlayerSeats({ players, currentTurnIndex, currentPlayerId }) {
  if (!players || players.length === 0) return null;

  const centerX = 500;
  const centerY = 500;
  const radius = 550;

  return (
    <>
      {players.map((player, index) => {
        const position = getCircularPosition(index, players.length, radius, centerX, centerY);
        const isCurrentPlayer = index === (currentTurnIndex % players.length);
        const isYou = player.id === currentPlayerId;

        return (
          <div
            key={player.id}
            className="absolute"
            style={{
              left: `${position.x}px`,
              top: `${position.y}px`,
              transform: 'translate(-50%, -50%)',
              zIndex: isCurrentPlayer ? 15 : 10
            }}
          >
            {/* Player seat/cushion */}
            <div
              className={`relative rounded-full border-8 transition-all duration-300 ${
                isCurrentPlayer 
                  ? 'border-christmas-gold animate-pulse-glow shadow-3d-strong' 
                  : 'border-amber-800 shadow-3d'
              }`}
              style={{
                width: '120px',
                height: '120px',
                background: isCurrentPlayer 
                  ? 'radial-gradient(circle, rgba(254,240,138,0.8) 0%, rgba(254,240,138,0.4) 100%)'
                  : 'radial-gradient(circle, rgba(139,69,19,0.6) 0%, rgba(101,67,33,0.4) 100%)',
                opacity: player.isConnected ? 1 : 0.5
              }}
            >
              {/* Radial spotlight for current player */}
              {isCurrentPlayer && (
                <div
                  className="absolute inset-0 rounded-full"
                  style={{
                    background: 'radial-gradient(circle, rgba(254,240,138,0.6) 0%, transparent 70%)',
                    filter: 'blur(20px)',
                    animation: 'pulse-glow 2s infinite'
                  }}
                />
              )}

              {/* Player token/emoji */}
              <div
                className={`absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-5xl transition-transform duration-300 ${
                  isCurrentPlayer ? 'animate-bounce' : ''
                }`}
                style={{
                  transform: `translate(-50%, -50%) ${isCurrentPlayer ? 'scale(1.3)' : 'scale(1)'}`,
                  filter: isCurrentPlayer ? 'drop-shadow(0 0 20px rgba(254,240,138,0.8))' : 'none'
                }}
              >
                {player.emoji}
              </div>

              {/* Name plate */}
              <div
                className="absolute top-full left-1/2 transform -translate-x-1/2 mt-2 px-3 py-1 rounded border-4 border-christmas-gold bg-white text-center min-w-max"
                style={{
                  boxShadow: '0 4px 8px rgba(0,0,0,0.3)'
                }}
              >
                <div className="font-impact text-sm text-christmas-red">
                  {player.name}
                  {isYou && ' (YOU)'}
                </div>
              </div>

              {/* Gift pile next to player */}
              {player.gifts && player.gifts.length > 0 && (
                <div
                  className="absolute top-1/2 right-0 transform translate-x-full -translate-y-1/2 flex flex-col items-center"
                  style={{
                    gap: '2px'
                  }}
                >
                  {player.gifts.slice(0, 3).map((giftId, idx) => (
                    <div
                      key={giftId}
                      className="text-2xl"
                      style={{
                        transform: `translateX(${idx * 5}px) translateY(${idx * 5}px)`
                      }}
                    >
                      🎁
                    </div>
                  ))}
                  {player.gifts.length > 3 && (
                    <div className="text-lg font-impact text-christmas-gold">
                      +{player.gifts.length - 3}
                    </div>
                  )}
                </div>
              )}

              {/* Shadow cast on table */}
              <div
                className="absolute top-full left-1/2 transform -translate-x-1/2 rounded-full"
                style={{
                  width: '100px',
                  height: '30px',
                  background: 'radial-gradient(ellipse, rgba(0,0,0,0.4) 0%, transparent 70%)',
                  filter: 'blur(15px)',
                  transform: 'translate(-50%, -50%) translateZ(-20px)',
                  top: 'calc(100% + 20px)'
                }}
              />
            </div>
          </div>
        );
      })}
    </>
  );
}

