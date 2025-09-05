import React, { useState } from 'react';
import { ElementTileSVG, elementsData } from './PeriodicTable';
import type { ElementData } from './PeriodicTable';

const elementMap: Record<string, ElementData> = Object.fromEntries(elementsData.map(e => [e.symbol.toLowerCase(), e]));

function findAllElementalCombinations(text: string): ElementData[][] {
  const lower = text.toLowerCase();
  const memo: Record<number, ElementData[][]> = {};
  function helper(pos: number): ElementData[][] {
    if (pos === lower.length) return [[]];
    if (memo[pos]) return memo[pos];
    let res: ElementData[][] = [];
    for (let len = 1; len <= 2; len++) {
      const sub = lower.slice(pos, pos + len);
      if (elementMap[sub]) {
        const rest = helper(pos + len);
        for (const r of rest) {
          res.push([{ ...elementMap[sub] }, ...r]);
        }
      }
    }
    memo[pos] = res;
    return res;
  }
  return helper(0);
}

interface ElementalNamesAllPossibilitiesProps {
  initialText?: string;
  showInput?: boolean;
}

const ElementalNamesAllPossibilities: React.FC<ElementalNamesAllPossibilitiesProps> = ({ initialText = 'Snack', showInput = true }) => {
  // Si es interactivo, usa estado; si no, usa solo la prop
  const [text, setText] = useState<string>(initialText);
  const effectiveText = showInput ? text : initialText;
  const combinations = effectiveText && effectiveText.length > 0 ? findAllElementalCombinations(effectiveText) : [];
  const combosToShow = combinations.slice(0, 30);
  
  // Usar dimensiones relativas que se adapten al contenedor
  const numRows = combosToShow.length || 1;
  const maxElements = combosToShow.reduce((max, combo) => Math.max(max, combo.length), 1);
  
  // Dimensiones unitarias para el viewBox (se escalará automáticamente)
  const UNIT_WIDTH = 100;
  const UNIT_GAP = 10;
  const UNIT_TOTAL = UNIT_WIDTH + UNIT_GAP;
  const UNIT_HEIGHT = 120;
  const UNIT_ROW_GAP = 20;
  
  const viewBoxWidth = maxElements * UNIT_TOTAL;
  const viewBoxHeight = numRows * UNIT_HEIGHT + (numRows - 1) * UNIT_ROW_GAP;

  // Centrado horizontal: calcula el offset para cada fila (corrige el ancho real)
  const getRowOffset = (comboLength: number) => {
    if (comboLength === 0) return 0;
    const rowWidth = comboLength * UNIT_WIDTH + (comboLength - 1) * UNIT_GAP;
    return (viewBoxWidth - rowWidth) / 2;
  };

  return (
    <div style={{ 
      width: '100%', 
      height: '100%', // Respetar el tamaño del contenedor padre
      margin: '0 auto', 
      display: 'flex', 
      flexDirection: 'column', 
      alignItems: 'stretch', 
      justifyContent: 'center'
    }}>
      {showInput && (
        <div className="mb-8 text-center" style={{ flexShrink: 0 }}>
          <input
            type="text"
            value={text}
            onChange={e => setText(e.target.value)}
            className="bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg px-4 py-2 text-lg w-full max-w-xs focus:ring-2 focus:ring-sky-500 focus:outline-none text-slate-900 dark:text-slate-100"
            placeholder="Escribe un nombre elemental..."
          />
        </div>
      )}
      <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
        <svg
          width="100%"
          height="100%"
          viewBox={`0 0 ${viewBoxWidth} ${viewBoxHeight}`}
          style={{ 
            display: 'block', 
            background: 'none', 
            flex: 1
          }}
          preserveAspectRatio="xMidYMid meet"
        >
          <g>
            {combosToShow.map((combo, rowIdx) => (
              <g
                key={rowIdx}
                transform={`translate(${getRowOffset(combo.length)}, ${rowIdx * (UNIT_HEIGHT + UNIT_ROW_GAP)})`}
              >
                {combo.map((el, i) => (
                  <ElementTileSVG key={i} element={el} x={i * UNIT_TOTAL} size={UNIT_WIDTH} />
                ))}
              </g>
            ))}
          </g>
        </svg>
        {combinations.length > 30 && (
          <div className="text-sm text-center text-gray-400" style={{ flexShrink: 0, padding: '8px 0' }}>
            Mostrando solo las primeras 30 combinaciones de {combinations.length} posibles.
          </div>
        )}
        {combinations.length === 0 && effectiveText.length > 0 && (
          <div className="text-lg text-center text-red-500" style={{ flexShrink: 0, padding: '8px 0' }}>
            No hay combinaciones posibles.
          </div>
        )}
      </div>
    </div>
  );
};

export default ElementalNamesAllPossibilities;
