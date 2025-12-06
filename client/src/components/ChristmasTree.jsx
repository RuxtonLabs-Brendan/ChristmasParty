import { useState, useEffect } from 'react';

export default function ChristmasTree() {
  const [twinklingLights, setTwinklingLights] = useState([]);

  useEffect(() => {
    // Generate random twinkling lights
    const lights = [];
    for (let i = 0; i < 20; i++) {
      lights.push({
        id: i,
        x: Math.random() * 100,
        y: Math.random() * 100,
        delay: Math.random() * 2,
        duration: 1 + Math.random() * 2
      });
    }
    setTwinklingLights(lights);
  }, []);

  return (
    <div 
      className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2"
      style={{
        width: '280px',
        height: '280px',
        transform: 'translate(-50%, -50%) translateZ(0)'
      }}
    >
      {/* Tree shadow on board */}
      <div 
        className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 rounded-full"
        style={{
          width: '200px',
          height: '200px',
          background: 'radial-gradient(circle, rgba(0,0,0,0.5) 0%, transparent 70%)',
          filter: 'blur(20px)',
          transform: 'translate(-50%, -50%) translateZ(-10px)',
          top: '60%'
        }}
      />

      {/* Tree layers (concentric circles getting larger) */}
      {[0, 1, 2, 3, 4].map((layer) => {
        const size = 60 + layer * 30;
        const offset = (4 - layer) * 15;
        return (
          <div
            key={layer}
            className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 rounded-full border-4 border-green-800"
            style={{
              width: `${size}px`,
              height: `${size}px`,
              background: `radial-gradient(circle, #166534 0%, #14532d 50%, #052e16 100%)`,
              top: `${50 - offset}%`,
              zIndex: 5 - layer,
              boxShadow: 'inset 0 0 20px rgba(0,0,0,0.3)'
            }}
          />
        );
      })}

      {/* Star on top */}
      <div
        className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-5xl animate-twinkle"
        style={{
          top: '20%',
          zIndex: 10,
          filter: 'drop-shadow(0 0 10px rgba(255, 255, 0, 0.8))'
        }}
      >
        ⭐
      </div>

      {/* Ornaments scattered on layers */}
      {[0, 1, 2, 3, 4].map((layer) => {
        const angle = (layer * 72) % 360;
        const radius = 30 + layer * 15;
        const x = 50 + radius * Math.cos((angle * Math.PI) / 180);
        const y = 50 + radius * Math.sin((angle * Math.PI) / 180);
        
        return (
          <div
            key={`ornament-${layer}`}
            className="absolute text-2xl"
            style={{
              left: `${x}%`,
              top: `${y}%`,
              transform: 'translate(-50%, -50%)',
              zIndex: 6
            }}
          >
            {['🔴', '🔵', '🟡'][layer % 3]}
          </div>
        );
      })}

      {/* Twinkling lights */}
      {twinklingLights.map((light) => (
        <div
          key={light.id}
          className="absolute w-2 h-2 bg-yellow-300 rounded-full animate-twinkle"
          style={{
            left: `${light.x}%`,
            top: `${light.y}%`,
            animationDelay: `${light.delay}s`,
            animationDuration: `${light.duration}s`,
            boxShadow: '0 0 10px rgba(255, 255, 0, 0.8)',
            zIndex: 7
          }}
        />
      ))}
    </div>
  );
}

