import React, { useState, useEffect } from "react";
import { ElementTileSVG, elementsData } from "./PeriodicTable";
import { CheeseTickIcon, CheeseCrossIcon } from "../../icons/CheeseIcons";

// Crear un map para búsqueda rápida por símbolo
const elementMap = Object.fromEntries(
  elementsData.map((e) => [e.symbol.toUpperCase(), e]),
);

interface AnalyzedChar {
  char: string;
  isElement: boolean;
  elementInfo: (typeof elementsData)[0] | undefined;
}

interface ArrayVisualizerProps {
  initialText?: string;
  showInput?: boolean;
}

// ── CSS keyframes (inyectadas una sola vez) ─────────────────────────────────
const STYLE_ID = "elemental-single-char-anims";
function ensureStyles() {
  if (typeof document === "undefined") return;
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.textContent = `
    @keyframes eschar-drop {
      0%   { opacity: 0; }
      100% { opacity: 1; }
    }
    @keyframes eschar-color {
      0%   { opacity: 0; }
      100% { opacity: 1; }
    }
    @keyframes eschar-tile {
      0%   { opacity: 0; }
      100% { opacity: 1; }
    }
    @keyframes eschar-fade-up {
      0%   { opacity: 0; transform: translateY(10px); }
      100% { opacity: 1; transform: translateY(0); }
    }
  `;
  document.head.appendChild(style);
}

const ArrayVisualizer: React.FC<ArrayVisualizerProps> = ({
  initialText = "Whisky",
  showInput = true,
}) => {
  const [text, setText] = useState<string>(initialText);
  const effectiveText = showInput ? text : initialText;
  const [debouncedText, setDebouncedText] = useState<string>(effectiveText);

  const TILE_SIZE = 95;
  const GAP = 16;
  const TOTAL_CELL_WIDTH = TILE_SIZE + GAP;

  // Inyectar estilos al montar
  useEffect(() => ensureStyles(), []);

  useEffect(() => {
    if (!showInput) {
      setDebouncedText(effectiveText);
      return;
    }
    const handler = setTimeout(() => setDebouncedText(text), 500);
    return () => clearTimeout(handler);
  }, [text, effectiveText, showInput]);

  const analyzedText: AnalyzedChar[] = debouncedText.split("").map((char) => ({
    char,
    isElement: !!elementMap[char.toUpperCase()],
    elementInfo: elementMap[char.toUpperCase()],
  }));

  const canBeFormed =
    debouncedText.length > 0 && analyzedText.every((item) => item.isElement);

  const svgContainerWidth = debouncedText.length * TOTAL_CELL_WIDTH;

  // Timing de la animación secuencial (solo en modo interactivo)
  const STAGGER = 0.12; // segundos entre cada letra
  const DROP_DUR = 0.45;
  // Para cada char: cuándo arranca su "drop" y cuándo arranca su "análisis"
  const charDelay = (i: number) => i * STAGGER;
  const analysisDelay = (i: number) => charDelay(i) + DROP_DUR;
  const tileDelay = (i: number) => analysisDelay(i);
  const totalAnimTime =
    analyzedText.length > 0 ? analysisDelay(analyzedText.length - 1) + 0.5 : 0;

  const charRectHeight = 95;
  const elementTileHeight = 110;
  const tileGap = 15;
  const hasAnyElement = analyzedText.some((t) => t.isElement);
  const svgContainerHeight = hasAnyElement
    ? charRectHeight + tileGap + elementTileHeight
    : charRectHeight;

  return (
    <div className="not-prose">
      {showInput && (
        <div className="mb-12 text-center">
          <input
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            className="text-4xl text-center p-4 rounded-xl border-2 outline-none transition-colors bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 focus:border-amber-500 dark:focus:border-amber-400"
            placeholder="Write a name..."
          />
        </div>
      )}

      <div className="w-full flex justify-center">
        <div style={{ maxWidth: `${svgContainerWidth}px`, width: "100%" }}>
          {/* key = debouncedText fuerza un remount completo del SVG,
              arrancando todas las animaciones CSS desde cero */}
          <svg
            key={debouncedText}
            viewBox={`0 0 ${svgContainerWidth} ${svgContainerHeight}`}
            style={{ height: svgContainerHeight, width: "100%" }}
            className="h-auto overflow-visible"
          >
            {analyzedText.map(({ char, isElement, elementInfo }, index) => {
              const x = index * TOTAL_CELL_WIDTH;
              const animate = showInput;

              // Colores finales
              const finalColor = isElement ? "#4ade80" : "#f87171";
              const fillColor = !animate ? finalColor : "#4c566a";
              const statusOpacity = !animate ? 1 : 0;

              return (
                <g key={`${char}-${index}`}>
                  {/* ── Contenedor del carácter ── */}
                  {/* <g> externo: posición SVG. <g> interno: animación CSS */}
                  <g transform={`translate(${x}, 0)`}>
                    <g
                      style={
                        animate
                          ? {
                              opacity: 0,
                              animation: `eschar-drop ${DROP_DUR}s ease-out ${charDelay(index)}s forwards`,
                            }
                          : undefined
                      }
                    >
                      {/* Rect base (gris) */}
                      <rect
                        width={TILE_SIZE}
                        height={charRectHeight}
                        rx="8"
                        ry="8"
                        fill={fillColor}
                        stroke="rgba(0,0,0,0.2)"
                        strokeWidth="2"
                      />
                      {/* Rect de color superpuesto (se anima la opacidad) */}
                      {animate && (
                        <rect
                          width={TILE_SIZE}
                          height={charRectHeight}
                          rx="8"
                          ry="8"
                          fill={finalColor}
                          stroke="rgba(0,0,0,0.2)"
                          strokeWidth="2"
                          style={{
                            opacity: 0,
                            animation: `eschar-color 0.4s ease ${analysisDelay(index)}s forwards`,
                          }}
                        />
                      )}
                      <text
                        x={TILE_SIZE / 2}
                        y={charRectHeight / 2}
                        dominantBaseline="middle"
                        textAnchor="middle"
                        className="text-4xl font-bold"
                        fill="white"
                      >
                        {char}
                      </text>
                      {/* Icono de estado (check / cross) */}
                      <g
                        transform={`translate(${TILE_SIZE - 20}, ${charRectHeight - 20}) scale(0.8)`}
                      >
                        <g
                          style={
                            animate
                              ? {
                                  opacity: 0,
                                  animation: `eschar-color 0.4s ease ${analysisDelay(index)}s forwards`,
                                }
                              : { opacity: statusOpacity }
                          }
                        >
                          {isElement ? (
                            <path
                              d="M1 5L5 9L13 1"
                              stroke="white"
                              strokeWidth="2.5"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              fill="none"
                            />
                          ) : (
                            <path
                              d="M1 1L9 9M9 1L1 9"
                              stroke="white"
                              strokeWidth="2.5"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              fill="none"
                            />
                          )}
                        </g>
                      </g>
                    </g>
                  </g>

                  {/* ── Tile del elemento ── */}
                  {isElement && elementInfo && (
                    <g
                      transform={`translate(${x}, ${charRectHeight + tileGap})`}
                    >
                      <g
                        style={
                          animate
                            ? {
                                opacity: 0,
                                animation: `eschar-tile 0.5s ease-out ${tileDelay(index)}s forwards`,
                              }
                            : undefined
                        }
                      >
                        <ElementTileSVG element={elementInfo} />
                      </g>
                    </g>
                  )}
                </g>
              );
            })}
          </svg>
        </div>
      </div>

      {debouncedText.length > 0 && showInput && (
        <div
          key={debouncedText}
          className="conclusion-text flex flex-col items-center justify-center mt-8"
          style={{
            opacity: 0,
            animation: `eschar-fade-up 0.5s ease ${totalAnimTime}s forwards`,
          }}
        >
          {canBeFormed ? (
            <>
              <CheeseTickIcon className="w-24 h-24 mb-2" />
              <p className="text-xl font-bold text-green-600 dark:text-green-400">
                Elemental Name!
              </p>
            </>
          ) : (
            <>
              <CheeseCrossIcon className="w-24 h-24 mb-2" />
              <p className="text-xl font-bold text-red-600 dark:text-red-400">
                Not an Elemental Name
              </p>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default ArrayVisualizer;
