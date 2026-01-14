import React, { useState, useMemo } from 'react';

// Tipos para las categorías de los elementos, para asegurar consistencia.
type Category =
  | 'no-metal-reactivo'
  | 'gas-noble'
  | 'alcalino'
  | 'alcalinoterreo'
  | 'metaloide'
  | 'metal-post-transicion'
  | 'metal-transicion'
  | 'lantanido'
  | 'actinido'
  | 'desconocido';

// Interface para la estructura de cada elemento químico.
interface ElementData {
  number: number;
  symbol: string;
  name: string;
  category: Category;
  xpos: number;
  ypos: number;
}

// Tipo para el filtro de resaltado.
type HighlightFilter = 'one-letter' | 'two-letters' | null;

// --- DATOS Y COLORES CON TIPADO ---

// Array de elementos con el tipo ElementData aplicado.
const elementsData: ElementData[] = [
    { number: 1, symbol: 'H', name: 'Hidrógeno', category: 'no-metal-reactivo', xpos: 1, ypos: 1 },
    { number: 2, symbol: 'He', name: 'Helio', category: 'gas-noble', xpos: 18, ypos: 1 },
    { number: 3, symbol: 'Li', name: 'Litio', category: 'alcalino', xpos: 1, ypos: 2 },
    { number: 4, symbol: 'Be', name: 'Berilio', category: 'alcalinoterreo', xpos: 2, ypos: 2 },
    { number: 5, symbol: 'B', name: 'Boro', category: 'metaloide', xpos: 13, ypos: 2 },
    { number: 6, symbol: 'C', name: 'Carbono', category: 'no-metal-reactivo', xpos: 14, ypos: 2 },
    { number: 7, symbol: 'N', name: 'Nitrógeno', category: 'no-metal-reactivo', xpos: 15, ypos: 2 },
    { number: 8, symbol: 'O', name: 'Oxígeno', category: 'no-metal-reactivo', xpos: 16, ypos: 2 },
    { number: 9, symbol: 'F', name: 'Flúor', category: 'no-metal-reactivo', xpos: 17, ypos: 2 },
    { number: 10, symbol: 'Ne', name: 'Neón', category: 'gas-noble', xpos: 18, ypos: 2 },
    { number: 11, symbol: 'Na', name: 'Sodio', category: 'alcalino', xpos: 1, ypos: 3 },
    { number: 12, symbol: 'Mg', name: 'Magnesio', category: 'alcalinoterreo', xpos: 2, ypos: 3 },
    { number: 13, symbol: 'Al', name: 'Aluminio', category: 'metal-post-transicion', xpos: 13, ypos: 3 },
    { number: 14, symbol: 'Si', name: 'Silicio', category: 'metaloide', xpos: 14, ypos: 3 },
    { number: 15, symbol: 'P', name: 'Fósforo', category: 'no-metal-reactivo', xpos: 15, ypos: 3 },
    { number: 16, symbol: 'S', name: 'Azufre', category: 'no-metal-reactivo', xpos: 16, ypos: 3 },
    { number: 17, symbol: 'Cl', name: 'Cloro', category: 'no-metal-reactivo', xpos: 17, ypos: 3 },
    { number: 18, symbol: 'Ar', name: 'Argón', category: 'gas-noble', xpos: 18, ypos: 3 },
    { number: 19, symbol: 'K', name: 'Potasio', category: 'alcalino', xpos: 1, ypos: 4 },
    { number: 20, symbol: 'Ca', name: 'Calcio', category: 'alcalinoterreo', xpos: 2, ypos: 4 },
    { number: 21, symbol: 'Sc', name: 'Escandio', category: 'metal-transicion', xpos: 3, ypos: 4 },
    { number: 22, symbol: 'Ti', name: 'Titanio', category: 'metal-transicion', xpos: 4, ypos: 4 },
    { number: 23, symbol: 'V', name: 'Vanadio', category: 'metal-transicion', xpos: 5, ypos: 4 },
    { number: 24, symbol: 'Cr', name: 'Cromo', category: 'metal-transicion', xpos: 6, ypos: 4 },
    { number: 25, symbol: 'Mn', name: 'Manganeso', category: 'metal-transicion', xpos: 7, ypos: 4 },
    { number: 26, symbol: 'Fe', name: 'Hierro', category: 'metal-transicion', xpos: 8, ypos: 4 },
    { number: 27, symbol: 'Co', name: 'Cobalto', category: 'metal-transicion', xpos: 9, ypos: 4 },
    { number: 28, symbol: 'Ni', name: 'Níquel', category: 'metal-transicion', xpos: 10, ypos: 4 },
    { number: 29, symbol: 'Cu', name: 'Cobre', category: 'metal-transicion', xpos: 11, ypos: 4 },
    { number: 30, symbol: 'Zn', name: 'Zinc', category: 'metal-transicion', xpos: 12, ypos: 4 },
    { number: 31, symbol: 'Ga', name: 'Galio', category: 'metal-post-transicion', xpos: 13, ypos: 4 },
    { number: 32, symbol: 'Ge', name: 'Germanio', category: 'metaloide', xpos: 14, ypos: 4 },
    { number: 33, symbol: 'As', name: 'Arsénico', category: 'metaloide', xpos: 15, ypos: 4 },
    { number: 34, symbol: 'Se', name: 'Selenio', category: 'no-metal-reactivo', xpos: 16, ypos: 4 },
    { number: 35, symbol: 'Br', name: 'Bromo', category: 'no-metal-reactivo', xpos: 17, ypos: 4 },
    { number: 36, symbol: 'Kr', name: 'Kriptón', category: 'gas-noble', xpos: 18, ypos: 4 },
    { number: 37, symbol: 'Rb', name: 'Rubidio', category: 'alcalino', xpos: 1, ypos: 5 },
    { number: 38, symbol: 'Sr', name: 'Estroncio', category: 'alcalinoterreo', xpos: 2, ypos: 5 },
    { number: 39, symbol: 'Y', name: 'Itrio', category: 'metal-transicion', xpos: 3, ypos: 5 },
    { number: 40, symbol: 'Zr', name: 'Zirconio', category: 'metal-transicion', xpos: 4, ypos: 5 },
    { number: 41, symbol: 'Nb', name: 'Niobio', category: 'metal-transicion', xpos: 5, ypos: 5 },
    { number: 42, symbol: 'Mo', name: 'Molibdeno', category: 'metal-transicion', xpos: 6, ypos: 5 },
    { number: 43, symbol: 'Tc', name: 'Tecnecio', category: 'metal-transicion', xpos: 7, ypos: 5 },
    { number: 44, symbol: 'Ru', name: 'Rutenio', category: 'metal-transicion', xpos: 8, ypos: 5 },
    { number: 45, symbol: 'Rh', name: 'Rodio', category: 'metal-transicion', xpos: 9, ypos: 5 },
    { number: 46, symbol: 'Pd', name: 'Paladio', category: 'metal-transicion', xpos: 10, ypos: 5 },
    { number: 47, symbol: 'Ag', name: 'Plata', category: 'metal-transicion', xpos: 11, ypos: 5 },
    { number: 48, symbol: 'Cd', name: 'Cadmio', category: 'metal-transicion', xpos: 12, ypos: 5 },
    { number: 49, symbol: 'In', name: 'Indio', category: 'metal-post-transicion', xpos: 13, ypos: 5 },
    { number: 50, symbol: 'Sn', name: 'Estaño', category: 'metal-post-transicion', xpos: 14, ypos: 5 },
    { number: 51, symbol: 'Sb', name: 'Antimonio', category: 'metaloide', xpos: 15, ypos: 5 },
    { number: 52, symbol: 'Te', name: 'Telurio', category: 'metaloide', xpos: 16, ypos: 5 },
    { number: 53, symbol: 'I', name: 'Yodo', category: 'no-metal-reactivo', xpos: 17, ypos: 5 },
    { number: 54, symbol: 'Xe', name: 'Xenón', category: 'gas-noble', xpos: 18, ypos: 5 },
    { number: 55, symbol: 'Cs', name: 'Cesio', category: 'alcalino', xpos: 1, ypos: 6 },
    { number: 56, symbol: 'Ba', name: 'Bario', category: 'alcalinoterreo', xpos: 2, ypos: 6 },
    { number: 57, symbol: 'La', name: 'Lantano', category: 'lantanido', xpos: 4, ypos: 8.5 },
    { number: 72, symbol: 'Hf', name: 'Hafnio', category: 'metal-transicion', xpos: 4, ypos: 6 },
    { number: 73, symbol: 'Ta', name: 'Tantalio', category: 'metal-transicion', xpos: 5, ypos: 6 },
    { number: 74, symbol: 'W', name: 'Wolframio', category: 'metal-transicion', xpos: 6, ypos: 6 },
    { number: 75, symbol: 'Re', name: 'Renio', category: 'metal-transicion', xpos: 7, ypos: 6 },
    { number: 76, symbol: 'Os', name: 'Osmio', category: 'metal-transicion', xpos: 8, ypos: 6 },
    { number: 77, symbol: 'Ir', name: 'Iridio', category: 'metal-transicion', xpos: 9, ypos: 6 },
    { number: 78, symbol: 'Pt', name: 'Platino', category: 'metal-transicion', xpos: 10, ypos: 6 },
    { number: 79, symbol: 'Au', name: 'Oro', category: 'metal-transicion', xpos: 11, ypos: 6 },
    { number: 80, symbol: 'Hg', name: 'Mercurio', category: 'metal-transicion', xpos: 12, ypos: 6 },
    { number: 81, symbol: 'Tl', name: 'Talio', category: 'metal-post-transicion', xpos: 13, ypos: 6 },
    { number: 82, symbol: 'Pb', name: 'Plomo', category: 'metal-post-transicion', xpos: 14, ypos: 6 },
    { number: 83, symbol: 'Bi', name: 'Bismuto', category: 'metal-post-transicion', xpos: 15, ypos: 6 },
    { number: 84, symbol: 'Po', name: 'Polonio', category: 'metaloide', xpos: 16, ypos: 6 },
    { number: 85, symbol: 'At', name: 'Astato', category: 'metaloide', xpos: 17, ypos: 6 },
    { number: 86, symbol: 'Rn', name: 'Radón', category: 'gas-noble', xpos: 18, ypos: 6 },
    { number: 87, symbol: 'Fr', name: 'Francio', category: 'alcalino', xpos: 1, ypos: 7 },
    { number: 88, symbol: 'Ra', name: 'Radio', category: 'alcalinoterreo', xpos: 2, ypos: 7 },
    { number: 89, symbol: 'Ac', name: 'Actinio', category: 'actinido', xpos: 4, ypos: 9.5 },
    { number: 104, symbol: 'Rf', name: 'Rutherfordio', category: 'metal-transicion', xpos: 4, ypos: 7 },
    { number: 105, symbol: 'Db', name: 'Dubnio', category: 'metal-transicion', xpos: 5, ypos: 7 },
    { number: 106, symbol: 'Sg', name: 'Seaborgio', category: 'metal-transicion', xpos: 6, ypos: 7 },
    { number: 107, symbol: 'Bh', name: 'Bohrio', category: 'metal-transicion', xpos: 7, ypos: 7 },
    { number: 108, symbol: 'Hs', name: 'Hasio', category: 'metal-transicion', xpos: 8, ypos: 7 },
    { number: 109, symbol: 'Mt', name: 'Meitnerio', category: 'desconocido', xpos: 9, ypos: 7 },
    { number: 110, symbol: 'Ds', name: 'Darmstatio', category: 'desconocido', xpos: 10, ypos: 7 },
    { number: 111, symbol: 'Rg', name: 'Roentgenio', category: 'desconocido', xpos: 11, ypos: 7 },
    { number: 112, symbol: 'Cn', name: 'Copernicio', category: 'metal-transicion', xpos: 12, ypos: 7 },
    { number: 113, symbol: 'Nh', name: 'Nihonio', category: 'desconocido', xpos: 13, ypos: 7 },
    { number: 114, symbol: 'Fl', name: 'Flerovio', category: 'desconocido', xpos: 14, ypos: 7 },
    { number: 115, symbol: 'Mc', name: 'Moscovio', category: 'desconocido', xpos: 15, ypos: 7 },
    { number: 116, symbol: 'Lv', name: 'Livermorio', category: 'desconocido', xpos: 16, ypos: 7 },
    { number: 117, symbol: 'Ts', name: 'Teneso', category: 'desconocido', xpos: 17, ypos: 7 },
    { number: 118, symbol: 'Og', name: 'Oganesón', category: 'desconocido', xpos: 18, ypos: 7 },
    { number: 58, symbol: 'Ce', name: 'Cerio', category: 'lantanido', xpos: 5, ypos: 8.5 },
    { number: 59, symbol: 'Pr', name: 'Praseodimio', category: 'lantanido', xpos: 6, ypos: 8.5 },
    { number: 60, symbol: 'Nd', name: 'Neodimio', category: 'lantanido', xpos: 7, ypos: 8.5 },
    { number: 61, symbol: 'Pm', name: 'Prometio', category: 'lantanido', xpos: 8, ypos: 8.5 },
    { number: 62, symbol: 'Sm', name: 'Samario', category: 'lantanido', xpos: 9, ypos: 8.5 },
    { number: 63, symbol: 'Eu', name: 'Europio', category: 'lantanido', xpos: 10, ypos: 8.5 },
    { number: 64, symbol: 'Gd', name: 'Gadolinio', category: 'lantanido', xpos: 11, ypos: 8.5 },
    { number: 65, symbol: 'Tb', name: 'Terbio', category: 'lantanido', xpos: 12, ypos: 8.5 },
    { number: 66, symbol: 'Dy', name: 'Disprosio', category: 'lantanido', xpos: 13, ypos: 8.5 },
    { number: 67, symbol: 'Ho', name: 'Holmio', category: 'lantanido', xpos: 14, ypos: 8.5 },
    { number: 68, symbol: 'Er', name: 'Erbio', category: 'lantanido', xpos: 15, ypos: 8.5 },
    { number: 69, symbol: 'Tm', name: 'Tulio', category: 'lantanido', xpos: 16, ypos: 8.5 },
    { number: 70, symbol: 'Yb', name: 'Iterbio', category: 'lantanido', xpos: 17, ypos: 8.5 },
    { number: 71, symbol: 'Lu', name: 'Lutecio', category: 'lantanido', xpos: 18, ypos: 8.5 },
    { number: 90, symbol: 'Th', name: 'Torio', category: 'actinido', xpos: 5, ypos: 9.5 },
    { number: 91, symbol: 'Pa', name: 'Protactinio', category: 'actinido', xpos: 6, ypos: 9.5 },
    { number: 92, symbol: 'U', name: 'Uranio', category: 'actinido', xpos: 7, ypos: 9.5 },
    { number: 93, symbol: 'Np', name: 'Neptunio', category: 'actinido', xpos: 8, ypos: 9.5 },
    { number: 94, symbol: 'Pu', name: 'Plutonio', category: 'actinido', xpos: 9, ypos: 9.5 },
    { number: 95, symbol: 'Am', name: 'Americio', category: 'actinido', xpos: 10, ypos: 9.5 },
    { number: 96, symbol: 'Cm', name: 'Curio', category: 'actinido', xpos: 11, ypos: 9.5 },
    { number: 97, symbol: 'Bk', name: 'Berkelio', category: 'actinido', xpos: 12, ypos: 9.5 },
    { number: 98, symbol: 'Cf', name: 'Californio', category: 'actinido', xpos: 13, ypos: 9.5 },
    { number: 99, symbol: 'Es', name: 'Einstenio', category: 'actinido', xpos: 14, ypos: 9.5 },
    { number: 100, symbol: 'Fm', name: 'Fermio', category: 'actinido', xpos: 15, ypos: 9.5 },
    { number: 101, symbol: 'Md', name: 'Mendelevio', category: 'actinido', xpos: 16, ypos: 9.5 },
    { number: 102, symbol: 'No', name: 'Nobelio', category: 'actinido', xpos: 17, ypos: 9.5 },
    { number: 103, symbol: 'Lr', name: 'Lawrencio', category: 'actinido', xpos: 18, ypos: 9.5 }
];


// Objeto de colores con un tipado estricto.
const categoryColors: Record<Category, string> = {
  'alcalino': '#d08770',
  'alcalinoterreo': '#ebcb8b',
  'lantanido': '#b48ead',
  'actinido': '#a3be8c',
  'metal-transicion': '#88c0d0',
  'metal-post-transicion': '#81a1c1',
  'metaloide': '#8fbcbb',
  'no-metal-reactivo': '#ca7d84',
  'gas-noble': '#5e81ac',
  'desconocido': '#b0968d',
};

// --- PROPS PARA LA TABLA PERIÓDICA ---
interface PeriodicTableSVGProps {
  highlightFilter: 'one-letter' | 'two-letters' | null;
}

// --- COMPONENTE DE LA TABLA PERIÓDICA (SVG) ---
const PeriodicTableSVG: React.FC<PeriodicTableSVGProps> = ({ highlightFilter }) => {
  const [activeElement, setActiveElement] = useState<number | null>(null);

  const viewBoxWidth = 18 * 100;
  const viewBoxHeight = 10 * 100;

  const activeElementData = activeElement ? elementsData.find(el => el.number === activeElement) : null;

  return (
    <svg
        className="w-full h-auto overflow-visible"
        viewBox={`-5 -5 ${viewBoxWidth} ${viewBoxHeight}`}
    >
      {elementsData
        .filter(el => el.number !== activeElement)
        .map(el => {
            let isMuted = false;
            if (highlightFilter === 'one-letter' && el.symbol.length !== 1) isMuted = true;
            if (highlightFilter === 'two-letters' && el.symbol.length !== 2) isMuted = true;
            const TILE_SIZE = 95;
            const TILE_MARGIN = 5;
            const TOTAL_SIZE = TILE_SIZE + TILE_MARGIN;
            const x = (el.xpos - 1) * TOTAL_SIZE;
            const y = (el.ypos - 1) * TOTAL_SIZE;
            const isActive = activeElement === el.number;
            const handlePointerEnter = () => !isMuted && setActiveElement(el.number);
            const handlePointerLeave = () => setActiveElement(null);
            return (
              <g
                key={el.number}
                transform={`translate(${x}, ${y})`}
                style={{
                  transition: 'opacity 0.3s ease-in-out, filter 0.3s ease-in-out',
                  opacity: isMuted ? 0.2 : 1,
                  filter: isMuted ? 'blur(1px)' : 'blur(0)',
                  zIndex: isActive ? 100 : 1,
                  position: 'relative',
                }}
                onMouseEnter={handlePointerEnter}
                onMouseLeave={handlePointerLeave}
                onTouchStart={handlePointerEnter}
                onTouchEnd={handlePointerLeave}
              >
                <g
                  style={{
                    transform: isActive ? 'scale(2)' : 'scale(1)',
                    transformOrigin: `${TILE_SIZE / 2}px ${TILE_SIZE / 2}px`,
                    transition: 'transform 0.15s ease-in-out',
                  }}
                >
                  <ElementTileSVG element={el} />
                </g>
              </g>
            );
        })}
      {activeElementData && (() => {
        const TILE_SIZE = 95;
        const TILE_MARGIN = 5;
        const TOTAL_SIZE = TILE_SIZE + TILE_MARGIN;
        const x = (activeElementData.xpos - 1) * TOTAL_SIZE;
        const y = (activeElementData.ypos - 1) * TOTAL_SIZE;
        // Handlers para el grupo ampliado
        const handlePointerEnter = () => setActiveElement(activeElementData.number);
        const handlePointerLeave = () => setActiveElement(null);
        return (
          <g
            key={activeElementData.number}
            transform={`translate(${x}, ${y})`}
            style={{ zIndex: 100, position: 'relative' }}
            onMouseEnter={handlePointerEnter}
            onMouseLeave={handlePointerLeave}
            onTouchStart={handlePointerEnter}
            onTouchEnd={handlePointerLeave}
          >
            <g
              style={{
                transform: 'scale(2)',
                transformOrigin: `${TILE_SIZE / 2}px ${TILE_SIZE / 2}px`,
                transition: 'transform 0.15s ease-in-out',
              }}
            >
              <ElementTileSVG element={activeElementData} />
            </g>
          </g>
        );
      })()}
    </svg>
  );
};


// --- COMPONENTE CONTENEDOR (MANEJA LA LÓGICA) ---
const PeriodicTableContainer: React.FC = () => {
  const [highlightFilter, setHighlightFilter] = useState<HighlightFilter>(null);

  // useMemo calcula los conteos solo una vez.
  const counts = useMemo(() => {
    const oneLetter = elementsData.filter(el => el.symbol.length === 1).length;
    const twoLetters = elementsData.filter(el => el.symbol.length === 2).length;
    return { oneLetter, twoLetters };
  }, []);

  return (
    <div>
      <div>
        <p className="text-center">
          <span>Hay </span>
          <span
            className="font-bold underline decoration-dotted"
            onMouseEnter={() => setHighlightFilter('one-letter')}
            onMouseLeave={() => setHighlightFilter(null)}
            onTouchStart={() => setHighlightFilter('one-letter')}
            onTouchEnd={() => setHighlightFilter(null)}
          >
            {counts.oneLetter} elementos de 1 letra
          </span>
          <span> y </span>
          <span
            className="font-bold underline decoration-dotted"
            onMouseEnter={() => setHighlightFilter('two-letters')}
            onMouseLeave={() => setHighlightFilter(null)}
            onTouchStart={() => setHighlightFilter('two-letters')}
            onTouchEnd={() => setHighlightFilter(null)}
          >
            {counts.twoLetters} elementos de 2 letras
          </span>
          <span> en su símbolo.</span>
        </p>
      </div>
      <PeriodicTableSVG highlightFilter={highlightFilter} />
    </div>
  );
};

// --- COMPONENTE SVG REUTILIZABLE ---
const ElementTileSVG: React.FC<{ element: ElementData; x?: number; size?: number }> = ({ element, x = 0, size = 95 }) => {
  const TILE_SIZE = size;
  const TILE_CENTER = TILE_SIZE / 2;
  const categoryColor = categoryColors[element.category] || '#D1C4E9';
  return (
    <g transform={`translate(${x},0)`}>
      <rect
        width={TILE_SIZE}
        height={TILE_SIZE}
        rx="12"
        ry="12"
        fill={categoryColor}
        stroke="rgba(0,0,0,0.15)"
        strokeWidth="3"
      />
      <text x="8" y="20" className="text-sm font-bold" fill="#4a5568">{element.number}</text>
      <text x={TILE_CENTER} y={TILE_CENTER + 10} textAnchor="middle" className="text-4xl font-bold" fill="#2d3748">{element.symbol}</text>
      <text x={TILE_CENTER} y={TILE_CENTER + 32} textAnchor="middle" className="text-xs" fill="#4a5568">{element.name}</text>
    </g>
  );
};

export default PeriodicTableContainer;
export { elementsData, categoryColors, ElementTileSVG };
export type { ElementData, Category };
