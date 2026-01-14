import React, { useState } from "react";

// Constantes de layout
const BUILDING_WIDTH = 1024;
const BUILDING_HEIGHT = 1536;
// Imágenes fijas (las coordenadas están calibradas para estas imágenes específicas)
const BUILDING_IMAGE = "/cave/aqui-no-hay-quien-duerma/empty-building.jpg";
const WINDOW_IMAGE = "/cave/aqui-no-hay-quien-duerma/window.png";
// Ratios para hacer los offsets proporcionales al número de ventanas
const WINDOWS_TOP_OFFSET_RATIO = 0.2;    // 20% de la altura
const WINDOWS_BOTTOM_OFFSET_RATIO = 0.15; // 15% de la altura
const WINDOWS_LEFT_OFFSET_RATIO = 0.15;   // 15% del ancho
const WINDOWS_RIGHT_OFFSET_RATIO = 0.15;  // 15% del ancho
const WINDOW_GAP_X = 0;
const WINDOW_GAP_Y = 0;
// Dimensiones naturales de la ventana (ajusta según tu imagen)
const NATURAL_WINDOW_WIDTH = 200;
const NATURAL_WINDOW_HEIGHT = 250;
// Dimensiones naturales de la luz dentro de la ventana
const NATURAL_LIGHT_WIDTH = 125;
const NATURAL_LIGHT_HEIGHT = 125;
const NATURAL_LIGHT_OFFSET_X = 35;
const NATURAL_LIGHT_OFFSET_Y = 60;
const LIGHT_COLOR_ON = "#ffe066"; // amarillo bombilla
const LIGHT_COLOR_OFF = "#33404a"; // azul noche

interface BuildingLightsProps {
  rows: number;
  cols: number;
}

function getRandomLights(rows: number, cols: number): number[][] {
  // Usar una semilla fija para evitar hydration mismatch
  const seed = rows * cols * 42; // semilla determinística
  let random = seed;
  
  const seededRandom = (): number => {
    random = (random * 9301 + 49297) % 233280;
    return random / 233280;
  };
  
  return Array.from({ length: rows }, () =>
    Array.from({ length: cols }, () => (seededRandom() > 0.5 ? 1 : 0))
  );
}

const BuildingLights: React.FC<BuildingLightsProps> = ({
  rows,
  cols,
}) => {
  const [lights, setLights] = useState<number[][]>(() => getRandomLights(rows, cols));

  // Calcula offsets dinámicos basados en ratios
  const WINDOWS_TOP_OFFSET = BUILDING_HEIGHT * WINDOWS_TOP_OFFSET_RATIO;
  const WINDOWS_BOTTOM_OFFSET = BUILDING_HEIGHT * WINDOWS_BOTTOM_OFFSET_RATIO;
  const WINDOWS_LEFT_OFFSET = BUILDING_WIDTH * WINDOWS_LEFT_OFFSET_RATIO;
  const WINDOWS_RIGHT_OFFSET = BUILDING_WIDTH * WINDOWS_RIGHT_OFFSET_RATIO;

  // Calcula el área disponible para ventanas
  const availableWidth = BUILDING_WIDTH - WINDOWS_LEFT_OFFSET - WINDOWS_RIGHT_OFFSET;
  const availableHeight = BUILDING_HEIGHT - WINDOWS_TOP_OFFSET - WINDOWS_BOTTOM_OFFSET;
  
  const windowWidth = (availableWidth - (cols - 1) * WINDOW_GAP_X) / cols;
  
  // Para el cálculo de windowHeight, distinguir entre modo bandas y distribución uniforme
  let windowHeight: number;
  if (rows <= 3) {
    // En modo bandas, usar el tamaño natural escalado horizontalmente
    windowHeight = NATURAL_WINDOW_HEIGHT * (windowWidth / NATURAL_WINDOW_WIDTH);
  } else {
    // En distribución uniforme, dividir la altura disponible
    windowHeight = (availableHeight - (rows - 1) * WINDOW_GAP_Y) / rows;
  }
  
  // Calcula la escala para ajustar la ventana natural al espacio disponible
  const scaleX = windowWidth / NATURAL_WINDOW_WIDTH;
  const scaleY = windowHeight / NATURAL_WINDOW_HEIGHT;
  const scale = Math.min(scaleX, scaleY); // Usa la escala menor para mantener aspecto

  // Calcula las dimensiones reales después de la escala
  const actualWindowWidth = NATURAL_WINDOW_WIDTH * scale;
  const actualWindowHeight = NATURAL_WINDOW_HEIGHT * scale;

  // Centrado horizontal usando las dimensiones reales
  const totalActualWindowsWidth = cols * actualWindowWidth + (cols - 1) * WINDOW_GAP_X;
  const startX = WINDOWS_LEFT_OFFSET + (availableWidth - totalActualWindowsWidth) / 2;
  
  // Posicionamiento vertical - centrar en bandas divisorias o distribuir uniformemente
  let startY: number;
  
  if (rows <= 3) {
    // Para pocas filas, dividir la altura disponible en bandas y centrar las ventanas en cada banda
    const bandHeight = availableHeight / rows;
    startY = WINDOWS_TOP_OFFSET;
  } else {
    // Para muchas filas, distribuir uniformemente
    const totalWindowsHeight = rows * windowHeight + (rows - 1) * WINDOW_GAP_Y;
    startY = WINDOWS_TOP_OFFSET + (availableHeight - totalWindowsHeight) / 2;
  }

  function toggleLight(r: number, c: number): void {
    setLights((prev) => {
      const next = prev.map((row) => [...row]);
      
      const toggle = (i: number, j: number): void => {
        if (i >= 0 && i < rows && j >= 0 && j < cols) {
          next[i][j] = next[i][j] === 1 ? 0 : 1;
        }
      };
      
      toggle(r, c);
      toggle(r - 1, c);
      toggle(r + 1, c);
      toggle(r, c - 1);
      toggle(r, c + 1);
      
      return next;
    });
  }

  return (
    <svg
      viewBox={`0 0 ${BUILDING_WIDTH} ${BUILDING_HEIGHT}`}
      className="w-full h-full object-contain"
    >
      <image
        href={BUILDING_IMAGE}
        x={0}
        y={0}
        width={BUILDING_WIDTH}
        height={BUILDING_HEIGHT}
        preserveAspectRatio="none"
      />
      {Array.from({ length: rows }).map((_, r) =>
        Array.from({ length: cols }).map((_, c) => {
          const x = startX + c * (actualWindowWidth + WINDOW_GAP_X);
          
          // Calcular Y según el modo (bandas vs distribución uniforme)
          let y: number;
          if (rows <= 3) {
            // Modo bandas: centrar cada ventana en su banda
            const bandHeight = availableHeight / rows;
            y = WINDOWS_TOP_OFFSET + r * bandHeight + (bandHeight - windowHeight) / 2;
          } else {
            // Modo distribución uniforme
            y = startY + r * (windowHeight + WINDOW_GAP_Y);
          }
          
          return (
            <g
              key={`w-${r}-${c}`}
              style={{ cursor: "pointer" }}
              onClick={() => toggleLight(r, c)}
              transform={`translate(${x}, ${y}) scale(${scale})`}
            >
              <rect
                x={NATURAL_LIGHT_OFFSET_X}
                y={NATURAL_LIGHT_OFFSET_Y}
                width={NATURAL_LIGHT_WIDTH}
                height={NATURAL_LIGHT_HEIGHT}
                fill={lights[r][c] ? LIGHT_COLOR_ON : LIGHT_COLOR_OFF}
                style={{
                  filter: lights[r][c]
                    ? "drop-shadow(0 0 16px #ffe066) drop-shadow(0 0 4px #fff)"
                    : "drop-shadow(0 0 8px #0d1335)",
                  transition: "fill 0.2s, filter 0.2s",
                }}
              />
              <image
                href={WINDOW_IMAGE}
                x={0}
                y={0}
                width={NATURAL_WINDOW_WIDTH}
                height={NATURAL_WINDOW_HEIGHT}
                style={{ pointerEvents: "none" }}
              />
            </g>
          );
        })
      )}
    </svg>
  );
};

export default BuildingLights;
