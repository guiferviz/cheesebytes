import React from 'react';
import type { GarmentType, GarmentItem } from './types';
import { GARMENT_SYMBOLS } from './types';

interface GarmentLayerProps {
  garment: GarmentItem;
  index: number;
  totalLayers: number;
  isAnimatingIn?: boolean;
  isAnimatingOut?: boolean;
  isShaking?: boolean;
  isHighlighted?: boolean;
  showParentheses?: boolean;
  scale?: number;
}

// SVG paths for different garment shapes
const getGarmentPath = (type: GarmentType, width: number, height: number): string => {
  const w = width;
  const h = height;
  
  switch (type) {
    case 'T': // T-shirt: classic rounded shape
      return `
        M ${w * 0.35} ${h * 0.08}
        Q ${w * 0.5} ${h * 0.14} ${w * 0.65} ${h * 0.08}
        L ${w * 0.85} ${h * 0.08}
        Q ${w * 0.92} ${h * 0.10} ${w * 0.95} ${h * 0.18}
        L ${w * 1.0} ${h * 0.38}
        Q ${w * 0.95} ${h * 0.42} ${w * 0.78} ${h * 0.38}
        L ${w * 0.78} ${h * 0.95}
        L ${w * 0.22} ${h * 0.95}
        L ${w * 0.22} ${h * 0.38}
        Q ${w * 0.05} ${h * 0.42} ${w * 0.0} ${h * 0.38}
        L ${w * 0.05} ${h * 0.18}
        Q ${w * 0.08} ${h * 0.10} ${w * 0.15} ${h * 0.08}
        Z
      `;
    case 'H': // Hoodie: U shape with hood bump and longer sleeves
      return `
        M ${w * 0.15} ${h * 0.1}
        Q ${w * 0.35} ${h * 0.0} ${w * 0.5} ${h * 0.0}
        Q ${w * 0.65} ${h * 0.0} ${w * 0.85} ${h * 0.1}
        L ${w * 0.85} ${h * 0.3}
        L ${w * 1.0} ${h * 0.35}
        L ${w * 1.0} ${h * 0.55}
        L ${w * 0.8} ${h * 0.55}
        L ${w * 0.8} ${h * 0.95}
        L ${w * 0.2} ${h * 0.95}
        L ${w * 0.2} ${h * 0.55}
        L ${w * 0.0} ${h * 0.55}
        L ${w * 0.0} ${h * 0.35}
        L ${w * 0.15} ${h * 0.3}
        Z
      `;
    case 'J': // Jacket: open front with collar
      return `
        M ${w * 0.2} ${h * 0.08}
        L ${w * 0.35} ${h * 0.15}
        L ${w * 0.35} ${h * 0.05}
        Q ${w * 0.5} ${h * 0.1} ${w * 0.65} ${h * 0.05}
        L ${w * 0.65} ${h * 0.15}
        L ${w * 0.8} ${h * 0.08}
        L ${w * 0.85} ${h * 0.25}
        L ${w * 1.0} ${h * 0.3}
        L ${w * 1.0} ${h * 0.6}
        L ${w * 0.82} ${h * 0.6}
        L ${w * 0.82} ${h * 0.95}
        L ${w * 0.55} ${h * 0.95}
        L ${w * 0.55} ${h * 0.25}
        L ${w * 0.45} ${h * 0.25}
        L ${w * 0.45} ${h * 0.95}
        L ${w * 0.18} ${h * 0.95}
        L ${w * 0.18} ${h * 0.6}
        L ${w * 0.0} ${h * 0.6}
        L ${w * 0.0} ${h * 0.3}
        L ${w * 0.15} ${h * 0.25}
        Z
      `;
  }
};

export const GarmentLayer: React.FC<GarmentLayerProps> = ({
  garment,
  index,
  totalLayers,
  isAnimatingIn = false,
  isAnimatingOut = false,
  isShaking = false,
  isHighlighted = false,
  showParentheses = false,
  scale = 1,
}) => {
  const width = 120 * scale;
  const height = 140 * scale;
  const offsetY = index * 8 * scale; // Stack offset
  
  const symbol = showParentheses 
    ? GARMENT_SYMBOLS[garment.type].open 
    : GARMENT_SYMBOLS[garment.type].label;
  
  // Animation classes
  const getAnimationStyle = (): React.CSSProperties => {
    const base: React.CSSProperties = {
      transition: 'all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)',
      transformOrigin: 'center center',
    };
    
    if (isAnimatingIn) {
      return {
        ...base,
        animation: 'garmentDropIn 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) forwards',
      };
    }
    
    if (isAnimatingOut) {
      return {
        ...base,
        animation: 'garmentFlyOut 0.4s ease-in forwards',
      };
    }
    
    if (isShaking) {
      return {
        ...base,
        animation: 'garmentShake 0.5s ease-in-out',
      };
    }
    
    return base;
  };
  
  return (
    <g 
      style={getAnimationStyle()}
      className={isHighlighted ? 'garment-highlighted' : ''}
    >
      {/* Garment shape */}
      <path
        d={getGarmentPath(garment.type, width, height)}
        fill={garment.color}
        stroke={isHighlighted ? '#ef4444' : '#374151'}
        strokeWidth={isHighlighted ? 3 : 1.5}
        filter={isHighlighted ? 'url(#redGlow)' : undefined}
      />
      
      {/* Label badge */}
      <g transform={`translate(${width * 0.08}, ${height * 0.2})`}>
        <rect
          x={0}
          y={0}
          width={24 * scale}
          height={18 * scale}
          rx={3}
          fill="#ffffff"
          stroke="#374151"
          strokeWidth={1}
        />
        <text
          x={12 * scale}
          y={13 * scale}
          textAnchor="middle"
          fontSize={12 * scale}
          fontFamily="monospace"
          fontWeight="bold"
          fill="#374151"
        >
          {symbol}
        </text>
      </g>
    </g>
  );
};

export default GarmentLayer;
