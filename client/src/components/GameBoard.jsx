export default function GameBoard({ children }) {
  return (
    <div className="relative w-full h-full flex items-center justify-center">
      {/* Wood table surface */}
      <div className="absolute inset-0 wood-texture" />
      
      {/* Optional red table runner */}
      <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-64 h-full bg-gradient-to-b from-christmas-red to-transparent opacity-20" />
      
      {/* Game board mat */}
      <div 
        className="relative felt-texture rounded-full shadow-3d-strong border-amber-900"
        style={{
          width: '1000px',
          height: '1000px',
          borderWidth: '16px',
          borderStyle: 'solid',
          transform: 'rotateX(20deg)',
          transformStyle: 'preserve-3d'
        }}
      >
        {/* Board shadow cast on table */}
        <div 
          className="absolute inset-0 rounded-full"
          style={{
            filter: 'blur(30px)',
            background: 'radial-gradient(circle, rgba(0,0,0,0.4) 0%, transparent 70%)',
            transform: 'translateZ(-50px)',
            top: '20px',
            left: '20px',
            width: 'calc(100% - 40px)',
            height: 'calc(100% - 40px)'
          }}
        />
        
        {/* Content */}
        <div className="relative w-full h-full">
          {children}
        </div>
      </div>
    </div>
  );
}

