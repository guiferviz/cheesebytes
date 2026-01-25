import React from "react";
import type { GarmentType } from "./types";

interface GarmentIconProps {
  type: GarmentType;
  color?: string;
  size?: number;
  showLabel?: boolean;
  label?: string;
}

// Standalone SVG icons for garments (for use in slides, legends, etc.)
export const GarmentIcon: React.FC<GarmentIconProps> = ({
  type,
  color = "#93c5fd",
  size = 80,
  showLabel = true,
  label,
}) => {
  const width = size;
  const height = size;

  const displayLabel = label ?? type;

  const getPath = (): string => {
    switch (type) {
      case "T": // T-shirt - classic rounded shape with short sleeves
        return `
          M ${width * 0.35} ${height * 0.08}
          Q ${width * 0.5} ${height * 0.14} ${width * 0.65} ${height * 0.08}
          L ${width * 0.85} ${height * 0.08}
          Q ${width * 0.92} ${height * 0.1} ${width * 0.95} ${height * 0.18}
          L ${width * 1.0} ${height * 0.38}
          Q ${width * 0.95} ${height * 0.42} ${width * 0.78} ${height * 0.38}
          L ${width * 0.78} ${height * 0.92}
          L ${width * 0.22} ${height * 0.92}
          L ${width * 0.22} ${height * 0.38}
          Q ${width * 0.05} ${height * 0.42} ${width * 0.0} ${height * 0.38}
          L ${width * 0.05} ${height * 0.18}
          Q ${width * 0.08} ${height * 0.1} ${width * 0.15} ${height * 0.08}
          Z
        `;
      case "S": // Sweater - long sleeves, crew neck
        return `
          M ${width * 0.35} ${height * 0.06}
          Q ${width * 0.5} ${height * 0.12} ${width * 0.65} ${height * 0.06}
          L ${width * 0.82} ${height * 0.06}
          Q ${width * 0.88} ${height * 0.08} ${width * 0.9} ${height * 0.14}
          L ${width * 1.02} ${height * 0.52}
          Q ${width * 0.98} ${height * 0.56} ${width * 0.8} ${height * 0.52}
          L ${width * 0.8} ${height * 0.92}
          L ${width * 0.2} ${height * 0.92}
          L ${width * 0.2} ${height * 0.52}
          Q ${width * 0.02} ${height * 0.56} ${width * -0.02} ${height * 0.52}
          L ${width * 0.1} ${height * 0.14}
          Q ${width * 0.12} ${height * 0.08} ${width * 0.18} ${height * 0.06}
          Z
        `;
      case "J": // Jacket - open front with collar
        return `
          M ${width * 0.2} ${height * 0.05}
          L ${width * 0.35} ${height * 0.12}
          L ${width * 0.35} ${height * 0.02}
          Q ${width * 0.5} ${height * 0.07} ${width * 0.65} ${height * 0.02}
          L ${width * 0.65} ${height * 0.12}
          L ${width * 0.8} ${height * 0.05}
          L ${width * 0.88} ${height * 0.22}
          L ${width * 1.02} ${height * 0.27}
          L ${width * 1.02} ${height * 0.55}
          L ${width * 0.82} ${height * 0.55}
          L ${width * 0.82} ${height * 0.92}
          L ${width * 0.55} ${height * 0.92}
          L ${width * 0.55} ${height * 0.22}
          L ${width * 0.45} ${height * 0.22}
          L ${width * 0.45} ${height * 0.92}
          L ${width * 0.18} ${height * 0.92}
          L ${width * 0.18} ${height * 0.55}
          L ${width * -0.02} ${height * 0.55}
          L ${width * -0.02} ${height * 0.27}
          L ${width * 0.12} ${height * 0.22}
          Z
        `;
    }
  };

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className="garment-icon"
    >
      <path d={getPath()} fill={color} stroke="#4b5563" strokeWidth={2} />

      {showLabel && (
        <g transform={`translate(${width * 0.08}, ${height * 0.18})`}>
          <rect
            x={0}
            y={0}
            width={Math.max(18, width * 0.22)}
            height={Math.max(14, width * 0.17)}
            rx={3}
            fill="#ffffff"
            stroke="#4b5563"
            strokeWidth={1}
          />
          <text
            x={Math.max(9, width * 0.11)}
            y={Math.max(11, width * 0.13)}
            textAnchor="middle"
            fontSize={Math.max(9, width * 0.12)}
            fontFamily="monospace"
            fontWeight="bold"
            fill="#374151"
          >
            {displayLabel}
          </text>
        </g>
      )}
    </svg>
  );
};

// Default colors for each garment type (for display)
export const DEFAULT_GARMENT_COLORS: Record<GarmentType, string> = {
  T: "#86efac", // Green
  S: "#c4b5fd", // Purple
  J: "#fed7aa", // Peach
};

export default GarmentIcon;
