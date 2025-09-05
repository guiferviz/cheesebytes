import React, { useState, useEffect, useLayoutEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { ElementTileSVG, elementsData, categoryColors } from './PeriodicTable';

// Crear un map para búsqueda rápida por símbolo
const elementMap = Object.fromEntries(elementsData.map(e => [e.symbol.toUpperCase(), e]));

/**
 * @param {Object} props
 * @param {string=} props.initialText
 * @param {boolean=} props.showInput
 */
const ArrayVisualizer = ({
  initialText = 'Whisky',
  showInput = true,
} = {}) => {
  // Si es interactivo, usa estado; si no, usa solo la prop
  const [text, setText] = useState(initialText);
  const effectiveText = showInput ? text : initialText;
  const [debouncedText, setDebouncedText] = useState(effectiveText);
  const containerRef = useRef(null);

  const TILE_SIZE = 95;
  const GAP = 16;
  const TOTAL_CELL_WIDTH = TILE_SIZE + GAP;

  useEffect(() => {
    if (!showInput) {
      setDebouncedText(effectiveText);
      return;
    }
    const handler = setTimeout(() => setDebouncedText(text), 500);
    return () => clearTimeout(handler);
  }, [text, effectiveText, showInput]);

  const analyzedText = debouncedText.split('').map(char => ({
    char,
    isElement: !!elementMap[char.toUpperCase()],
    elementInfo: elementMap[char.toUpperCase()],
  }));

  const canBeFormed = debouncedText.length > 0 && analyzedText.every(item => item.isElement);

  const svgContainerWidth = debouncedText.length * TOTAL_CELL_WIDTH;

  // Animaciones solo si están habilitadas y showInput está activo
  useLayoutEffect(() => {
    if (!showInput) return;
    const ctx = gsap.context(() => {
      const tl = gsap.timeline();
      const charContainers = gsap.utils.toArray('.char-container');
      const charRects = gsap.utils.toArray('.char-rect');
      const statusIcons = gsap.utils.toArray('.status-icon');
      const conclusionText = document.querySelector('.conclusion-text');

      tl.from(charContainers, {
        opacity: 0,
        y: -30,
        scale: 0.8,
        transformOrigin: '50% 50%', // Crecer desde el centro
        duration: 0.5,
        ease: 'back.out(1.7)',
        stagger: { amount: 0.8, from: 'start' },
      });

      analyzedText.forEach((item, index) => {
        const charRect = charRects[index];
        const statusIcon = statusIcons[index];
        const color = item.isElement ? '#4ade80' : '#f87171';
        const analysisTl = gsap.timeline();
        analysisTl.to(charRect, {
          attr: { fill: color },
          duration: 0.4
        })
        .to(statusIcon, {
          opacity: 1,
          duration: 0.4
        }, "<");

        if (item.isElement) {
          const elementTile = gsap.utils.toArray(`.element-tile[data-index="${index}"]`)[0];
          if (elementTile) {
            tl.from(elementTile, {
              opacity: 0,
              scale: 0.5,
              transformOrigin: '50% 50%', // Crecer desde el centro
              duration: 0.5,
              ease: 'back.out(1.4)'
            })
              .add(analysisTl, "<");
          }
        } else {
          tl.add(analysisTl);
        }
      });

      if (conclusionText) {
        tl.fromTo(conclusionText, { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.5 });
      }
    }, containerRef);
    return () => ctx.revert();
  }, [debouncedText, analyzedText, showInput]);

  const charRectHeight = 80;
  const elementTileHeight = 110; // Aproximado del ElementTileSVG
  const tileGap = 15;
  const hasAnyElement = analyzedText.some(t => t.isElement);
  const svgContainerHeight = hasAnyElement
    ? charRectHeight + tileGap + elementTileHeight
    : charRectHeight;

  return (
    <div>
      <div>
        {showInput && (
          <div className="mb-8 text-center">
            <p className="text-gray-400 text-sm sm:text-base">Escribe para ver qué letras son elementos químicos.</p>
            <input
              type="text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              className="bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg px-4 py-2 text-lg w-full max-w-xs focus:ring-2 focus:ring-sky-500 focus:outline-none text-slate-900 dark:text-slate-100"
              placeholder="Escribe algo..."
            />
          </div>
        )}

        <div ref={containerRef} className="w-full flex justify-center">
          <div style={{ maxWidth: `${svgContainerWidth}px`, width: '100%' }}>
            <svg
              viewBox={`0 0 ${svgContainerWidth} ${svgContainerHeight}`}
              style={{ height: svgContainerHeight, width: '100%' }}
              className="h-auto overflow-visible"
            >
              {analyzedText.map(({ char, isElement, elementInfo }, index) => {
                const x = index * TOTAL_CELL_WIDTH;
                const charRectHeight = 95;
                // Declarativo: si no hay input, siempre color y opacidad finales
                const fillColor = !showInput ? (isElement ? '#4ade80' : '#f87171') : '#4c566a';
                const statusOpacity = !showInput ? 1 : 0;
                return (
                  <g key={`${char}-${index}`}>
                    <g className="char-container" transform={`translate(${x}, 0)`}>
                      <rect
                        className="char-rect"
                        width={TILE_SIZE}
                        height={charRectHeight}
                        rx="8"
                        ry="8"
                        fill={fillColor}
                        stroke="rgba(0,0,0,0.2)"
                        strokeWidth="2"
                      />
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
                      <g className="status-icon" opacity={statusOpacity} transform={`translate(${TILE_SIZE - 20}, ${charRectHeight - 20}) scale(0.8)`}>
                        {isElement ? (
                          <path d="M1 5L5 9L13 1" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                        ) : (
                          <path d="M1 1L9 9M9 1L1 9" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                        )}
                      </g>
                    </g>
                    {isElement && elementInfo && (
                      <g className="element-tile" data-index={index} transform={`translate(${x}, ${charRectHeight + tileGap})`}>
                        <ElementTileSVG element={elementInfo} />
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
            className="conclusion-text text-center max-w-lg mx-auto"
            style={showInput ? { opacity: 1, transform: 'none', transition: 'none' } : {}}
          >
            {canBeFormed ? (
              <p className="p-3 rounded-lg text-green-700 dark:text-green-300 bg-green-100 dark:bg-green-800/60 font-semibold">¡Sí! ¡Es Elemental!</p>
            ) : (
              <p className="p-3 rounded-lg text-red-700 dark:text-red-300 bg-red-100 dark:bg-red-800/60 font-semibold">No, no es Elemental.</p>
            )}
          </div>)}
      </div>
    </div>
  );
};

export default ArrayVisualizer;
