import { useState, useEffect } from 'react';
import { getRingPosition } from '../utils/positioning.js';

export default function OpenedGiftsRing({ gifts, players, onGiftClick, isCurrentPlayer, currentPlayerId }) {
  const openedGifts = gifts?.filter(gift => gift.isOpened) || [];
  const [newlyOpenedGifts, setNewlyOpenedGifts] = useState(new Set());
  
  useEffect(() => {
    // Track newly opened gifts for animation
    const currentOpenedIds = new Set(openedGifts.map(g => g.id));
    const newIds = openedGifts
      .filter(g => !newlyOpenedGifts.has(g.id))
      .map(g => g.id);
    
    if (newIds.length > 0) {
      setNewlyOpenedGifts(prev => new Set([...prev, ...newIds]));
      // Remove from newly opened after animation completes
      setTimeout(() => {
        setNewlyOpenedGifts(prev => {
          const updated = new Set(prev);
          newIds.forEach(id => updated.delete(id));
          return updated;
        });
      }, 2000);
    }
  }, [openedGifts]);
  
  if (openedGifts.length === 0) return null;

  const centerX = 500;
  const centerY = 500;
  const radius = 300;

  return (
    <>
      {openedGifts.map((gift, index) => {
        const position = getRingPosition(index, openedGifts.length, radius, centerX, centerY);
        const owner = players?.find(p => p.id === gift.ownerId);
        // Can steal if: current player's turn, gift hasn't been stolen twice, gift has an owner, and it's not your own gift
        const isOwnGift = gift.ownerId === currentPlayerId;
        const canSteal = isCurrentPlayer && gift.stealCount < 2 && gift.ownerId && !isOwnGift;

        return (
          <div
            key={gift.id}
            className={`absolute transition-all duration-200 ${
              canSteal ? 'cursor-pointer hover:scale-110' : ''
            } ${gift.stealCount >= 2 ? 'opacity-75' : ''}`}
            style={{
              left: `${position.x}px`,
              top: `${position.y}px`,
              transform: `translate(-50%, -50%) rotate(${position.rotation}deg)`,
              zIndex: canSteal ? 15 : 12,
              opacity: canSteal ? 1 : 0.7,
              pointerEvents: canSteal ? 'auto' : 'none'
            }}
            onClick={() => canSteal && onGiftClick(gift.id)}
          >
            {/* Product card */}
            <div
              className={`relative border-4 rounded-lg overflow-hidden transition-all duration-500 ${
                gift.stealCount >= 2 
                  ? 'border-green-600 bg-green-50' 
                  : 'border-christmas-gold bg-white'
              } ${newlyOpenedGifts.has(gift.id) ? 'animate-pulse scale-110 shadow-2xl' : ''}`}
              style={{
                width: '120px',
                height: '150px',
                boxShadow: newlyOpenedGifts.has(gift.id) 
                  ? '0 12px 24px rgba(255, 215, 0, 0.6)' 
                  : '0 8px 16px rgba(0,0,0,0.4)',
                transform: 'rotate(-90deg)',
                zIndex: newlyOpenedGifts.has(gift.id) ? 20 : 'auto'
              }}
            >
              {/* Product image - prominently displayed */}
              <div
                className={`w-full h-24 bg-gray-200 flex items-center justify-center overflow-hidden transition-all duration-500 ${
                  newlyOpenedGifts.has(gift.id) ? 'ring-4 ring-christmas-gold' : ''
                }`}
                style={{
                  backgroundImage: gift.product?.image 
                    ? `url(${gift.product.image})` 
                    : 'none',
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                  minHeight: '96px'
                }}
              >
                {gift.product?.image ? (
                  <img
                    src={gift.product.image}
                    alt={gift.product.name || 'Gift'}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.target.style.display = 'none';
                      e.target.parentElement.innerHTML = '<span class="text-4xl">📦</span>';
                    }}
                  />
                ) : (
                  <span className="text-4xl">📦</span>
                )}
                {/* Reveal sparkle effect for newly opened */}
                {newlyOpenedGifts.has(gift.id) && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-3xl animate-bounce">✨</span>
                  </div>
                )}
              </div>

              {/* Product name */}
              <div className="p-2 text-center">
                <div className="font-impact text-xs text-christmas-red line-clamp-2">
                  {gift.product?.name || 'Gift'}
                </div>
              </div>

              {/* Owner badge */}
              {owner && (
                <div className="absolute top-1 right-1 bg-white rounded-full p-1 border-2 border-christmas-gold">
                  <span className="text-lg">{owner.emoji}</span>
                </div>
              )}

              {/* Steal counter */}
              <div className="absolute bottom-1 left-1/2 transform -translate-x-1/2 text-xs font-impact text-christmas-red">
                {gift.stealCount > 0 && `Stolen ${gift.stealCount}x`}
              </div>

              {/* Lock icon if max steals */}
              {gift.stealCount >= 2 && (
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-3xl">
                  🔒
                </div>
              )}
            </div>

            {/* Shadow */}
            <div
              className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 rounded-lg"
              style={{
                width: '140px',
                height: '170px',
                background: 'radial-gradient(ellipse, rgba(0,0,0,0.3) 0%, transparent 70%)',
                filter: 'blur(20px)',
                transform: 'translate(-50%, -50%) translateZ(-15px)',
                zIndex: -1
              }}
            />
          </div>
        );
      })}
    </>
  );
}

