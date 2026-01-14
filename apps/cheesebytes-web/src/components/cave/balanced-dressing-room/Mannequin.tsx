import React from 'react';

interface MannequinProps {
  width?: number;
  height?: number;
}

export const Mannequin: React.FC<MannequinProps> = ({ 
  width = 100, 
  height = 280 
}) => {
  const cx = width / 2;
  
  return (
    <g className="mannequin">
      {/* Head - simple circle */}
      <circle
        cx={cx}
        cy={28}
        r={20}
        fill="#d4c4b0"
        stroke="#a89888"
        strokeWidth={2}
      />
      
      {/* Neck */}
      <rect
        x={cx - 7}
        y={46}
        width={14}
        height={18}
        fill="#d4c4b0"
        stroke="#a89888"
        strokeWidth={1.5}
      />
      
      {/* Torso - rounded top trapezoid */}
      <path
        d={`
          M ${cx - 32} 64
          Q ${cx} 58 ${cx + 32} 64
          L ${cx + 28} 165
          L ${cx - 28} 165
          Z
        `}
        fill="#d4c4b0"
        stroke="#a89888"
        strokeWidth={2}
      />
      
      {/* Stand pole */}
      <rect
        x={cx - 4}
        y={165}
        width={8}
        height={85}
        fill="#8b7355"
        stroke="#5c4d3d"
        strokeWidth={1}
      />
      
      {/* Base */}
      <ellipse
        cx={cx}
        cy={height - 18}
        rx={38}
        ry={11}
        fill="#8b7355"
        stroke="#5c4d3d"
        strokeWidth={2}
      />
    </g>
  );
};

export default Mannequin;
