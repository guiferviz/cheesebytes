import React from 'react';
import { COLORS } from './types';

interface BackgroundProps {
  width: number;
  height: number;
  showMountains?: boolean;
}

// Beautiful sky gradient background with optional mountains
export const Background: React.FC<BackgroundProps> = ({
  width,
  height,
  showMountains = true,
}) => {
  const groundY = height - 60;
  
  return (
    <g className="background">
      {/* Sky gradient */}
      <defs>
        <linearGradient id="skyGradient" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor={COLORS.sky.top} />
          <stop offset="100%" stopColor={COLORS.sky.bottom} />
        </linearGradient>
      </defs>
      
      <rect
        x={0}
        y={0}
        width={width}
        height={height}
        fill="url(#skyGradient)"
      />
      
      {/* Far mountains */}
      {showMountains && (
        <>
          <path
            d={`
              M 0 ${groundY}
              L ${width * 0.1} ${groundY - 80}
              L ${width * 0.25} ${groundY - 40}
              L ${width * 0.4} ${groundY - 100}
              L ${width * 0.55} ${groundY - 60}
              L ${width * 0.7} ${groundY - 90}
              L ${width * 0.85} ${groundY - 50}
              L ${width} ${groundY - 70}
              L ${width} ${groundY}
              Z
            `}
            fill={COLORS.mountain.far}
            opacity={0.3}
          />
          
          {/* Near mountains */}
          <path
            d={`
              M 0 ${groundY}
              L ${width * 0.15} ${groundY - 50}
              L ${width * 0.3} ${groundY - 20}
              L ${width * 0.5} ${groundY - 70}
              L ${width * 0.65} ${groundY - 35}
              L ${width * 0.8} ${groundY - 55}
              L ${width * 0.95} ${groundY - 25}
              L ${width} ${groundY - 45}
              L ${width} ${groundY}
              Z
            `}
            fill={COLORS.mountain.near}
            opacity={0.25}
          />
        </>
      )}
      
      {/* Ground line */}
      <line
        x1={0}
        y1={groundY}
        x2={width}
        y2={groundY}
        stroke="#78716c"
        strokeWidth={2}
      />
    </g>
  );
};

interface RainDropsProps {
  width: number;
  height: number;
  count?: number;
  isAnimating?: boolean;
}

// Animated rain drops
export const RainDrops: React.FC<RainDropsProps> = ({
  width,
  height,
  count = 30,
  isAnimating = false,
}) => {
  if (!isAnimating) return null;
  
  // Generate deterministic rain positions
  const drops = Array.from({ length: count }).map((_, i) => ({
    x: (width / count) * i + (i * 17) % 20,
    delay: (i * 50) % 500,
    length: 15 + (i * 7) % 10,
  }));
  
  return (
    <g className="rain-drops">
      {drops.map((drop, i) => (
        <line
          key={i}
          x1={drop.x}
          y1={-20}
          x2={drop.x}
          y2={-20 + drop.length}
          stroke="#60a5fa"
          strokeWidth={1.5}
          opacity={0.6}
          style={{
            animation: `rainFall 0.6s linear ${drop.delay}ms infinite`,
          }}
        />
      ))}
    </g>
  );
};

export default Background;
