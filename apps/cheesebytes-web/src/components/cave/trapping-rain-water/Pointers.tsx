import React from 'react';
import { COLORS } from './types';
import type { PointerSide } from './types';

interface PointerProps {
  x: number;
  y: number;
  side: PointerSide;
  isActive?: boolean;
  label?: string;
}

// Triangle pointer above columns
export const Pointer: React.FC<PointerProps> = ({
  x,
  y,
  side,
  isActive = false,
  label,
}) => {
  const color = side === 'L' ? COLORS.pointer.left : COLORS.pointer.right;
  const size = 12;
  
  return (
    <g 
      className="pointer"
      style={{
        transition: 'transform 0.3s ease-out',
      }}
    >
      {/* Triangle pointing down */}
      <polygon
        points={`
          ${x},${y + size}
          ${x - size},${y}
          ${x + size},${y}
        `}
        fill={color}
        stroke={isActive ? '#ffffff' : 'none'}
        strokeWidth={isActive ? 2 : 0}
        style={{
          filter: isActive ? 'drop-shadow(0 0 4px rgba(0,0,0,0.3))' : undefined,
        }}
      />
      
      {/* Label */}
      <text
        x={x}
        y={y - 8}
        textAnchor="middle"
        fontSize={14}
        fontWeight="bold"
        fontFamily="monospace"
        fill={color}
      >
        {label || side}
      </text>
    </g>
  );
};

interface MaxMarkerProps {
  x: number;
  baseY: number;
  blockHeight: number;
  maxValue: number;
  side: PointerSide;
  isActive?: boolean;
  columnWidth: number;
}

// Horizontal line showing leftMax or rightMax
export const MaxMarker: React.FC<MaxMarkerProps> = ({
  x,
  baseY,
  blockHeight,
  maxValue,
  side,
  isActive = false,
  columnWidth,
}) => {
  const color = side === 'L' ? COLORS.pointer.left : COLORS.pointer.right;
  const y = baseY - maxValue * blockHeight;
  const lineWidth = columnWidth * 0.8;
  const startX = x - lineWidth / 2;
  
  return (
    <g 
      className="max-marker"
      style={{
        transition: 'all 0.3s ease-out',
        opacity: isActive ? 1 : 0.4,
      }}
    >
      {/* Horizontal line */}
      <line
        x1={startX}
        y1={y}
        x2={startX + lineWidth}
        y2={y}
        stroke={color}
        strokeWidth={isActive ? 3 : 2}
        strokeDasharray={isActive ? 'none' : '4,2'}
      />
      
      {/* Value badge */}
      <g transform={`translate(${side === 'L' ? startX - 25 : startX + lineWidth + 5}, ${y - 8})`}>
        <rect
          x={0}
          y={0}
          width={20}
          height={16}
          rx={3}
          fill={color}
          opacity={isActive ? 1 : 0.6}
        />
        <text
          x={10}
          y={12}
          textAnchor="middle"
          fontSize={10}
          fontWeight="bold"
          fontFamily="monospace"
          fill="white"
        >
          {maxValue}
        </text>
      </g>
    </g>
  );
};

export default Pointer;
