import React from 'react';
import { COLORS } from './types';

interface WaterBlockProps {
  x: number;
  y: number;
  width: number;
  height: number;
  isAnimating?: boolean;
  delay?: number;
}

// A single water block with gradient and optional wave
export const WaterBlock: React.FC<WaterBlockProps> = ({
  x,
  y,
  width,
  height,
  isAnimating = false,
  delay = 0,
}) => {
  if (height <= 0) return null;
  
  const gradientId = `waterGradient-${x}-${y}`;
  
  return (
    <g
      className="water-block"
      style={{
        animation: isAnimating 
          ? `waterFill 0.5s ease-out ${delay}ms forwards` 
          : undefined,
        transformOrigin: `${x + width/2}px ${y + height}px`,
      }}
    >
      <defs>
        <linearGradient id={gradientId} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor={COLORS.water.fillLight} />
          <stop offset="100%" stopColor={COLORS.water.fill} />
        </linearGradient>
      </defs>
      
      {/* Main water rectangle */}
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        rx={2}
        fill={`url(#${gradientId})`}
        opacity={0.85}
      />
      
      {/* Surface wave line */}
      {height > 5 && (
        <path
          d={`M ${x + 2} ${y + 2} 
              Q ${x + width * 0.25} ${y} ${x + width * 0.5} ${y + 2}
              Q ${x + width * 0.75} ${y + 4} ${x + width - 2} ${y + 2}`}
          fill="none"
          stroke={COLORS.water.fillLight}
          strokeWidth={1.5}
          opacity={0.7}
        />
      )}
    </g>
  );
};

interface WaterColumnProps {
  x: number;
  baseY: number;
  blockWidth: number;
  blockHeight: number;
  waterUnits: number;
  terrainHeight: number;
  isAnimating?: boolean;
  delay?: number;
}

// Water sitting on top of terrain
export const WaterColumn: React.FC<WaterColumnProps> = ({
  x,
  baseY,
  blockWidth,
  blockHeight,
  waterUnits,
  terrainHeight,
  isAnimating = false,
  delay = 0,
}) => {
  if (waterUnits <= 0) return null;
  
  const terrainTop = baseY - terrainHeight * blockHeight;
  const waterHeight = waterUnits * blockHeight;
  const waterY = terrainTop - waterHeight;
  
  return (
    <WaterBlock
      x={x}
      y={waterY}
      width={blockWidth}
      height={waterHeight}
      isAnimating={isAnimating}
      delay={delay}
    />
  );
};

export default WaterColumn;
