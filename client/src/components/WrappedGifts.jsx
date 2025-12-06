import { useState } from 'react';
import { GIFT_PATTERNS } from '../../../shared/types.js';

const PATTERN_STYLES = {
  dots: {
    backgroundImage: 'radial-gradient(circle, #dc2626 2px, transparent 2px)',
    backgroundSize: '20px 20px',
    backgroundColor: '#ef4444'
  },
  stripes: {
    backgroundImage: 'repeating-linear-gradient(45deg, #dc2626, #dc2626 10px, #ef4444 10px, #ef4444 20px)',
    backgroundColor: '#ef4444'
  },
  snowflakes: {
    backgroundImage: 'radial-gradient(circle at 50% 50%, #ffffff 1px, transparent 1px)',
    backgroundSize: '15px 15px',
    backgroundColor: '#3b82f6'
  },
  plaid: {
    backgroundImage: `
      repeating-linear-gradient(0deg, transparent, transparent 2px, #dc2626 2px, #dc2626 4px),
      repeating-linear-gradient(90deg, transparent, transparent 2px, #dc2626 2px, #dc2626 4px)
    `,
    backgroundColor: '#fef08a'
  }
};

export default function WrappedGifts({ gifts, onGiftClick, isCurrentPlayer }) {
  const [hoveredGift, setHoveredGift] = useState(null);
  const [pressedGift, setPressedGift] = useState(null);

  if (!gifts || gifts.length === 0) return null;

  const wrappedGifts = gifts.filter(gift => !gift.isOpened);
  
  // Show message if it's your turn but no wrapped gifts available
  if (isCurrentPlayer && wrappedGifts.length === 0) {
    return (
      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white bg-opacity-90 px-8 py-4 rounded-lg border-4 border-christmas-gold z-50">
        <div className="text-center font-impact text-christmas-red text-xl">
          No more wrapped gifts! You can only steal opened gifts now.
        </div>
      </div>
    );
  }

  return (
    <>
      {wrappedGifts.map((gift) => {
        const isHovered = hoveredGift === gift.id;
        const isPressed = pressedGift === gift.id;
        const canInteract = isCurrentPlayer && !gift.isOpened;

          return (
            <div
              key={gift.id}
              className="absolute cursor-pointer transition-all duration-200"
              style={{
                left: `${gift.x}px`,
                top: `${gift.y}px`,
                transform: `
                  translate(-50%, -50%)
                  rotateZ(${gift.rotation}deg)
                  rotateX(60deg)
                  ${isHovered && canInteract ? 'translateY(-10px) scale(1.1)' : ''}
                  ${isPressed ? 'translateY(2px) scale(0.95)' : ''}
                `,
                transformStyle: 'preserve-3d',
                opacity: canInteract ? 1 : 0.5,
                pointerEvents: canInteract ? 'auto' : 'none',
                zIndex: isHovered ? 20 : 10
              }}
              onMouseEnter={() => setHoveredGift(gift.id)}
              onMouseLeave={() => setHoveredGift(null)}
              onMouseDown={() => setPressedGift(gift.id)}
              onMouseUp={() => {
                setPressedGift(null);
                if (canInteract) {
                  onGiftClick(gift.id);
                }
              }}
            >
              {/* Gift box - top face */}
              <div
                className="relative border-4 border-amber-900"
                style={{
                  width: '80px',
                  height: '80px',
                  ...PATTERN_STYLES[gift.pattern],
                  transform: 'translateZ(20px)',
                  boxShadow: '0 10px 20px rgba(0,0,0,0.4)'
                }}
              >
                {/* Ribbon cross */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-full h-2 bg-christmas-gold border border-amber-700" />
                </div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-2 h-full bg-christmas-gold border border-amber-700" />
                </div>
                
                {/* Bow */}
                <div className="absolute -top-2 left-1/2 transform -translate-x-1/2 text-2xl">
                  🎀
                </div>
              </div>

              {/* Gift box - side faces (3D depth) */}
              <div
                className="absolute border-4 border-amber-900"
                style={{
                  width: '80px',
                  height: '20px',
                  background: 'linear-gradient(to bottom, rgba(0,0,0,0.3), rgba(0,0,0,0.5))',
                  transform: 'rotateX(-90deg) translateZ(10px)',
                  top: '80px',
                  left: 0
                }}
              />
              <div
                className="absolute border-4 border-amber-900"
                style={{
                  width: '20px',
                  height: '80px',
                  background: 'linear-gradient(to right, rgba(0,0,0,0.3), rgba(0,0,0,0.5))',
                  transform: 'rotateY(90deg) translateZ(10px)',
                  left: '80px',
                  top: 0
                }}
              />

              {/* Shadow cast on board */}
              <div
                className="absolute rounded"
                style={{
                  width: '100px',
                  height: '100px',
                  background: 'radial-gradient(ellipse, rgba(0,0,0,0.4) 0%, transparent 70%)',
                  filter: 'blur(15px)',
                  transform: 'translate(-50%, -50%) translateZ(-30px)',
                  top: '50%',
                  left: '50%'
                }}
              />
            </div>
          );
        })}
    </>
  );
}

