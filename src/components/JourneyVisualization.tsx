import React from 'react';

interface JourneyVisualizationProps {
  focusTimeMinutes?: number;
  totalMinutes?: number;
  className?: string;
}

export function JourneyVisualization({ 
  focusTimeMinutes = 30, 
  totalMinutes = 60,
  className = ""
}: JourneyVisualizationProps) {
  // Calculate progress percentage (0-100)
  const progress = Math.min(100, Math.max(0, (focusTimeMinutes / totalMinutes) * 100));
  
  // Define the sailing path as SVG coordinates (left beach to right lighthouse)
  const pathCommands = "M 20,75 Q 35,65 50,60 Q 65,55 80,25";
  
  // Calculate ship position along the path (starts center-left, about 1/3 along route)
  const shipPosition = {
    // Follows the curved path from left beach to right lighthouse
    x: 20 + (progress / 100) * 60,
    y: 75 - (progress / 100) * 50 + Math.sin((progress / 100) * Math.PI) * 8
  };

  // Wake trail clip path - follows the curved sailing path behind the ship
  const wakeClipPath = `polygon(
    20% 75%, 
    ${20 + (progress / 100) * 60}% ${75 - (progress / 100) * 50}%, 
    ${20 + (progress / 100) * 60}% 100%, 
    20% 100%
  )`;

  return (
    <div className={`relative w-full h-full ${className}`}>
      {/* Background map */}
      <img
        src="/summary_panel_design/map.png"
        alt="Journey map"
        className="w-full h-full object-cover rounded-2xl"
      />
      
      {/* SVG overlay for path definition */}
      <svg 
        className="absolute inset-0 w-full h-full"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
      >
        {/* Dotted sailing path */}
        <path
          d={pathCommands}
          stroke="rgba(255, 255, 255, 0.6)"
          strokeWidth="0.5"
          strokeDasharray="2,2"
          fill="none"
          className="drop-shadow-sm"
        />
        
        {/* Completed path (solid white) */}
        <path
          d={pathCommands}
          stroke="rgba(255, 255, 255, 0.9)"
          strokeWidth="0.8"
          fill="none"
          strokeDasharray="2,2"
          strokeDashoffset={`${200 - (progress * 2)}`}
          style={{
            strokeDasharray: `${progress * 2}, 200`
          }}
          className="drop-shadow-md"
        />
      </svg>

      {/* Wake trail texture - positioned behind ship */}
      <div 
        className="absolute inset-0 w-full h-full"
        style={{
          clipPath: wakeClipPath
        }}
      >
        <img
          src="/summary_panel_design/water.png"
          alt="Wake trail"
          className="w-full h-full object-cover opacity-60 mix-blend-overlay"
          style={{
            transform: `scale(1.1) rotate(${(progress / 100) * 20 - 10}deg)`,
            transformOrigin: '20% 75%',
          }}
        />
      </div>

      {/* Ship - positioned along the path */}
      <div
        className="absolute z-10 transform -translate-x-1/2 -translate-y-1/2 transition-all duration-1000 ease-out"
        style={{
          left: `${shipPosition.x}%`,
          top: `${shipPosition.y}%`,
          transform: `translate(-50%, -50%) rotate(${(progress / 100) * 30 + 10}deg) scale(${0.9 + (progress / 100) * 0.3})`
        }}
      >
        <img
          src="/summary_panel_design/ship.png"
          alt="Journey progress ship"
          className="w-8 h-8 md:w-12 md:h-12 drop-shadow-lg"
        />
      </div>

      {/* Start marker - positioned on left beach area */}
      <div className="absolute bottom-6 left-8 transform -translate-x-1/2 translate-y-1/4 z-10">
        <img
          src="/summary_panel_design/start.png"
          alt="Journey start"
          className="w-16 h-12 md:w-20 md:h-16 drop-shadow-md opacity-90"
        />
      </div>

      {/* End marker - positioned near lighthouse on right peninsula */}
      <div className="absolute top-6 right-6 transform translate-x-1/4 -translate-y-1/2 z-10">
        <img
          src="/summary_panel_design/1 hour.png"
          alt="Journey destination"
          className="w-16 h-12 md:w-20 md:h-16 drop-shadow-md opacity-90"
        />
      </div>

      {/* Progress indicator overlay */}
      <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 z-20">
        <div className="bg-black/30 backdrop-blur-sm rounded-full px-3 py-1 border border-white/20">
          <span className="text-white/90 text-sm font-inter">
            {Math.round(progress)}% complete
          </span>
        </div>
      </div>
    </div>
  );
} 