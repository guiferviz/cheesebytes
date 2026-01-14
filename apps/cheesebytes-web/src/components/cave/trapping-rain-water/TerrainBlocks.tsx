import React from 'react';
import { COLORS } from './types';

interface BlockProps {
  x: number;
  y: number;
  width: number;
  height: number;
  isAnimating?: boolean;
}

// A single terrain block with nice styling
export const Block: React.FC<BlockProps> = ({
  x,
  y,
  width,
  height,
  isAnimating = false,
}) => {
  const highlightHeight = Math.min(4, height * 0.15);
  
  return (
    <g 
      className="terrain-block"
      style={{
        animation: isAnimating ? 'blockGrow 0.3s ease-out forwards' : undefined,
        transformOrigin: `${x + width/2}px ${y + height}px`,
      }}
    >
      {/* Main block */}
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        rx={4}
        fill={COLORS.block.fill}
        stroke={COLORS.block.stroke}
        strokeWidth={1.5}
      />
      
      {/* Top highlight for 3D effect */}
      {height > 8 && (
        <rect
          x={x + 2}
          y={y + 2}
          width={width - 4}
          height={highlightHeight}
          rx={2}
          fill={COLORS.block.highlight}
          opacity={0.6}
        />
      )}
    </g>
  );
};

interface TerrainColumnProps {
  x: number;
  baseY: number;
  blockWidth: number;
  blockHeight: number;
  stackHeight: number; // Number of blocks
  isAnimating?: boolean;
  delay?: number;
}

// A column of stacked blocks
export const TerrainColumn: React.FC<TerrainColumnProps> = ({
  x,
  baseY,
  blockWidth,
  blockHeight,
  stackHeight,
  isAnimating = false,
  delay = 0,
}) => {
  if (stackHeight === 0) return null;
  
  const totalHeight = stackHeight * blockHeight;
  const y = baseY - totalHeight;
  
  return (
    <g
      style={{
        animation: isAnimating 
          ? `blockGrow 0.4s ease-out ${delay}ms forwards` 
          : undefined,
        transformOrigin: `${x + blockWidth/2}px ${baseY}px`,
      }}
    >
      <Block
        x={x}
        y={y}
        width={blockWidth}
        height={totalHeight}
      />
      
      {/* Horizontal lines to show individual blocks */}
      {Array.from({ length: stackHeight - 1 }).map((_, i) => (
        <line
          key={i}
          x1={x + 2}
          y1={baseY - (i + 1) * blockHeight}
          x2={x + blockWidth - 2}
          y2={baseY - (i + 1) * blockHeight}
          stroke={COLORS.block.stroke}
          strokeWidth={0.5}
          opacity={0.4}
        />
      ))}
    </g>
  );
};

export default TerrainColumn;
