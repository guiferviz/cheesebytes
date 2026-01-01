import React, { useState, useEffect, useRef, useCallback } from 'react';

// --- Constantes y datos de elementos (fuera del componente para evitar re-creación) ---
const ELEMENT_SYMBOLS = new Set([
    'H', 'He', 'Li', 'Be', 'B', 'C', 'N', 'O', 'F', 'Ne', 'Na', 'Mg', 'Al', 'Si', 'P', 'S', 'Cl', 'Ar', 'K', 'Ca', 'Sc',
    'Ti', 'V', 'Cr', 'Mn', 'Fe', 'Co', 'Ni', 'Cu', 'Zn', 'Ga', 'Ge', 'As', 'Se', 'Br', 'Kr', 'Rb', 'Sr', 'Y', 'Zr', 'Nb',
    'Mo', 'Tc', 'Ru', 'Rh', 'Pd', 'Ag', 'Cd', 'In', 'Sn', 'Sb', 'Te', 'I', 'Xe', 'Cs', 'Ba', 'La', 'Ce', 'Pr', 'Nd', 'Pm',
    'Sm', 'Eu', 'Gd', 'Tb', 'Dy', 'Ho', 'Er', 'Tm', 'Yb', 'Lu', 'Hf', 'Ta', 'W', 'Re', 'Os', 'Ir', 'Pt', 'Au', 'Hg', 'Tl',
    'Pb', 'Bi', 'Po', 'At', 'Rn', 'Fr', 'Ra', 'Ac', 'Th', 'Pa', 'U', 'Np', 'Pu', 'Am', 'Cm', 'Bk', 'Cf', 'Es', 'Fm', 'Md',
    'No', 'Lr', 'Rf', 'Db', 'Sg', 'Bh', 'Hs', 'Mt', 'Ds', 'Rg', 'Cn', 'Nh', 'Fl', 'Mc', 'Lv', 'Ts', 'Og'
]);

// --- Componente principal ---
function DPWordBreakViz() {
    const [word, setWord] = useState('Erica');
    const [debouncedWord, setDebouncedWord] = useState(word);
    const [steps, setSteps] = useState([]);
    const [hoveredStep, setHoveredStep] = useState(null);
    const [tooltipContent, setTooltipContent] = useState({ text: '', x: 0, y: 0, visible: false });

    // --- Lógica de Programación Dinámica ---
    const generateSteps = useCallback((s) => {
        if (!s) {
            setSteps([]);
            return;
        }

        const n = s.length;
        const dp = Array(n + 1).fill(false);
        dp[0] = true;
        const newSteps = [];

        newSteps.push({
            explanation: `Inicializamos 'dp' de tamaño n+1 (${n + 1}). dp[0] es 'true', porque una cadena vacía siempre se puede formar.`,
            dpState: [...dp],
            highlights: { dp: [0], word: [] }
        });

        for (let i = 1; i <= n; i++) {
            newSteps.push({
                explanation: `--- Intentando validar dp[${i}] (hasta el carácter '${s[i-1]}') ---`,
                dpState: [...dp],
                highlights: { dp: [i], word: [i-1] },
                isHeader: true
            });

            // Check 1: Mirar 1 paso atrás
            const sub1 = s.substring(i - 1, i);
            const subSymbol1 = sub1.charAt(0).toUpperCase() + sub1.slice(1);
            if (dp[i - 1] && ELEMENT_SYMBOLS.has(subSymbol1)) {
                if(!dp[i]) dp[i] = true;
                newSteps.push({
                    explanation: `Mirando 1 paso atrás: dp[${i-1}] es 'true' Y '${subSymbol1}' es un elemento. ¡ÉXITO! Se valida dp[${i}].`,
                    dpState: [...dp],
                    highlights: { dp: [i, i-1], word: [i-1] }
                });
            } else {
                 if (!dp[i - 1]) {
                    newSteps.push({
                        explanation: `Mirando 1 paso atrás: No se valida porque dp[${i-1}] es 'false'. No se puede construir desde un punto inalcanzable.`,
                        dpState: [...dp],
                        highlights: { dp: [i, i - 1], word: [i - 1] }
                    });
                } else {
                    newSteps.push({
                        explanation: `Mirando 1 paso atrás: Aunque dp[${i-1}] es 'true', no se valida porque '${subSymbol1}' NO es un elemento.`,
                        dpState: [...dp],
                        highlights: { dp: [i, i - 1], word: [i - 1] }
                    });
                }
            }

            // Check 2: Mirar 2 pasos atrás (si es posible)
            if (i === 1) {
                newSteps.push({
                    explanation: `No se comprueban 2 pasos atrás porque no hay suficientes caracteres.`,
                    dpState: [...dp],
                    highlights: { dp: [i], word: [i-1] }
                });
            }
            if (i >= 2) {
                const sub2 = s.substring(i - 2, i);
                const subSymbol2 = sub2.charAt(0).toUpperCase() + sub2.slice(1);
                 if (dp[i - 2] && ELEMENT_SYMBOLS.has(subSymbol2)) {
                    if(!dp[i]) dp[i] = true;
                    newSteps.push({
                        explanation: `Mirando 2 pasos atrás: dp[${i-2}] es 'true' Y '${subSymbol2}' es un elemento. ¡ÉXITO! Se valida dp[${i}].`,
                        dpState: [...dp],
                        highlights: { dp: [i, i-2], word: [i-2, i-1] }
                    });
                } else {
                    if (!dp[i - 2]) {
                        newSteps.push({
                            explanation: `Mirando 2 pasos atrás: No se valida porque dp[${i-2}] es 'false'. No se puede construir desde un punto inalcanzable.`,
                            dpState: [...dp],
                            highlights: { dp: [i, i - 2], word: [i - 2, i - 1] }
                        });
                    } else {
                        newSteps.push({
                            explanation: `Mirando 2 pasos atrás: Aunque dp[${i-2}] es 'true', no se valida porque '${subSymbol2}' NO es un elemento.`,
                            dpState: [...dp],
                            highlights: { dp: [i, i - 2], word: [i - 2, i - 1] }
                        });
                    }
                }
            }
            
            if (!dp[i]) {
                newSteps.push({
                    explanation: `Tras las comprobaciones, no se encontró ninguna forma de validar dp[${i}]. Se queda como 'false'.`,
                    dpState: [...dp],
                    highlights: { dp: [i], word: [] }
                });
            }
        }
        
        newSteps.push({
            explanation: `--- Algoritmo finalizado ---`,
            dpState: [...dp],
            highlights: { dp: [], word: [] },
            isHeader: true
        });

        if (dp[n]) {
            newSteps.push({
                explanation: `El resultado final es dp[${n}] = true. La palabra se puede segmentar.`,
                dpState: [...dp],
                highlights: { dp: [n], word: [] }
            });
        } else {
             newSteps.push({
                explanation: `El resultado final es dp[${n}] = false. La palabra no se puede segmentar.`,
                dpState: [...dp],
                highlights: { dp: [n], word: [] }
            });
        }

        setSteps(newSteps);
    }, []);

    // --- Efectos de React ---
    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedWord(word);
        }, 300);
        return () => clearTimeout(handler);
    }, [word]);

    useEffect(() => {
        generateSteps(debouncedWord);
    }, [debouncedWord, generateSteps]);

    // --- Handlers de Tooltip ---
    const handleMouseOver = (event, text) => {
        setTooltipContent({ text, x: event.pageX, y: event.pageY, visible: true });
    };
    const handleMouseMove = (event) => {
        setTooltipContent(prev => ({ ...prev, x: event.pageX, y: event.pageY }));
    };
    const handleMouseOut = () => {
        setTooltipContent(prev => ({ ...prev, visible: false }));
    };
    
    // --- Renderizado ---
    const finalDpState = steps.length > 0 ? steps[steps.length - 1].dpState : [];
    const displayDpState = hoveredStep ? hoveredStep.dpState : finalDpState;
    const highlights = hoveredStep ? hoveredStep.highlights : { dp: [], word: [] };

    return (
        <div className="w-full max-w-4xl mx-auto text-center">
            <p className="text-slate-500 dark:text-slate-400 mb-6">
                Escribe una palabra para ver cómo un algoritmo de Programación Dinámica la procesa paso a paso.
            </p>

            {tooltipContent.visible && (
                <div 
                    style={{ left: `${tooltipContent.x + 15}px`, top: `${tooltipContent.y - 10}px` }}
                    className="fixed z-50 px-3 py-2 text-sm font-semibold text-white bg-slate-800 rounded-md shadow-lg"
                >
                    {tooltipContent.text}
                </div>
            )}

            <div className="flex justify-center items-center gap-2 mb-8">
                <input
                    type="text"
                    value={word}
                    onChange={(e) => setWord(e.target.value)}
                    className="bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg px-4 py-2 text-lg w-full max-w-xs focus:ring-2 focus:ring-sky-500 focus:outline-none text-slate-900 dark:text-slate-100"
                    placeholder="Escribe una palabra..."
                />
            </div>
            
            {/* Visualización de Arrays */}
            <div className="bg-slate-100 dark:bg-slate-800 p-6 rounded-lg">
                <div className="inline-block mx-auto text-left space-y-8">
                    <div className="flex items-center">
                        <p 
                            className="font-mono text-sm text-slate-500 dark:text-slate-400 w-12 text-right pr-2 cursor-help"
                            onMouseOver={(e) => handleMouseOver(e, "El array 's' representa la palabra de entrada, carácter por carácter.")}
                            onMouseMove={handleMouseMove}
                            onMouseOut={handleMouseOut}
                        >s</p>
                        <div className="flex justify-start gap-1">
                            {/* Spacer to align s[0] with dp[1] */}
                            <div className="w-12 h-12 shrink-0" /> 
                            {word.split('').map((char, index) => (
                                <div key={index} className={`relative w-12 h-12 flex items-center justify-center font-mono text-xl border rounded-md transition-colors ${highlights.word.includes(index) ? 'bg-sky-200 dark:bg-sky-700 border-sky-400' : 'bg-white dark:bg-slate-700 border-slate-200 dark:border-slate-600'}`}>
                                    {char}
                                    <span className="absolute -bottom-5 text-xs text-slate-400">{index}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                     <div className="flex items-center">
                        <p 
                            className="font-mono text-sm text-slate-500 dark:text-slate-400 w-12 text-right pr-2 cursor-help"
                            onMouseOver={(e) => handleMouseOver(e, "El array 'dp' indica si la subcadena hasta esa posición se puede segmentar. dp[i] es true si s[0..i-1] es segmentable.")}
                            onMouseMove={handleMouseMove}
                            onMouseOut={handleMouseOut}
                        >dp</p>
                        <div className="flex justify-start gap-1">
                             {displayDpState.map((val, index) => (
                                 <div key={index} className={`relative w-12 h-12 flex items-center justify-center font-mono text-xl border rounded-md transition-colors ${highlights.dp.includes(index) ? 'ring-2 ring-sky-400 ring-offset-2 ring-offset-slate-100 dark:ring-offset-slate-800' : ''} ${val ? 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 border-green-300 dark:border-green-700' : 'bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300 border-red-300 dark:border-red-700'}`}>
                                     {val ? 'T' : 'F'}
                                    <span className="absolute -bottom-5 text-xs text-slate-400">{index}</span>
                                </div>
                             ))}
                             {/* Placeholder para los elementos aún no calculados */}
                             {Array.from({length: (word.length + 1) - displayDpState.length}).map((_, index) => (
                                 <div key={index} className="relative w-12 h-12 flex items-center justify-center font-mono text-xl border-2 border-dashed rounded-md bg-slate-200 dark:bg-slate-700 border-slate-300 dark:border-slate-600">
                                     <span className="absolute -bottom-5 text-xs text-slate-400">{displayDpState.length + index}</span>
                                 </div>
                             ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* Tabla de Pasos */}
            <div className="w-full text-left text-sm">
                 <div className="overflow-auto max-h-[40vh] rounded-lg">
                    <table className="min-w-full">
                        <thead className="sticky top-0 bg-slate-100 dark:bg-slate-800">
                            <tr>
                                <th className="p-2 w-16 text-center font-semibold">Paso</th>
                                <th className="p-2 font-semibold">Explicación</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white dark:bg-slate-900">
                            {steps.map((step, index) => (
                                <tr 
                                    key={index}
                                    onMouseOver={() => setHoveredStep(step)}
                                    onMouseOut={() => setHoveredStep(null)}
                                    className={`transition-colors hover:bg-sky-100 dark:hover:bg-sky-900/50 ${step.isHeader ? 'bg-slate-50 dark:bg-slate-800' : ''}`}
                                >
                                    <td className={`p-2 text-center font-mono text-slate-500 dark:text-slate-400 ${step.isHeader ? 'font-bold' : ''}`}>{!step.isHeader && index + 1}</td>
                                    <td className={`p-2 font-mono text-slate-700 dark:text-slate-300 ${step.isHeader ? 'font-bold text-slate-500 dark:text-slate-400' : ''}`}>{step.explanation}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                 </div>
            </div>

        </div>
    );
}

export default DPWordBreakViz;
