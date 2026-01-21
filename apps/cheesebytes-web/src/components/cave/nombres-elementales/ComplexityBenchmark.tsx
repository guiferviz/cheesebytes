import React, { useState, useRef, useEffect, useCallback } from "react";
import hljs from "highlight.js";
import pyodideContext from "../../../utils/pyodideContext";

interface DataPoint {
  x: number;
  y: number;
}

interface Algorithm {
  id: string;
  name: string;
  color: string;
  code: string;
  data: DataPoint[];
}

const ELEMENTS_CODE = `
ELEMENTS = {
    'H','He',
    'Li','Be','B','C','N','O','F','Ne',
    'Na','Mg','Al','Si','P','S','Cl','Ar',
    'K','Ca','Sc','Ti','V','Cr','Mn','Fe','Co','Ni','Cu','Zn','Ga','Ge','As','Se','Br','Kr',
    'Rb','Sr','Y','Zr','Nb','Mo','Tc','Ru','Rh','Pd','Ag','Cd','In','Sn','Sb','Te','I','Xe',
    'Cs','Ba','La','Ce','Pr','Nd','Pm','Sm','Eu','Gd','Tb','Dy','Ho','Er','Tm','Yb','Lu',
    'Hf','Ta','W','Re','Os','Ir','Pt','Au','Hg','Tl','Pb','Bi','Po','At','Rn',
    'Fr','Ra','Ac','Th','Pa','U','Np','Pu','Am','Cm','Bk','Cf','Es','Fm','Md','No','Lr',
    'Rf','Db','Sg','Bh','Hs','Mt','Ds','Rg','Cn','Fl','Lv','Ts','Og'
}
`;

const SLICING_CODE = `def slicing(name: str) -> int:
    steps = 0
    while name:
        name = name[1:]  # copia un string casi tan grande como el anterior
        steps += 1
    return steps`;

const COUNTING_CODE = `def counting(name: str) -> int:
    steps = 0
    for char in name:
        steps += 1
    return steps`;

const BENCHMARK_CODE = `
import time

def benchmark_slicing(pattern, x):
    name = pattern * x
    start = time.perf_counter()
    slicing(name)
    end = time.perf_counter()
    return (end - start) * 1000  # ms

def benchmark_counting(pattern, x):
    name = pattern * x
    start = time.perf_counter()
    counting(name)
    end = time.perf_counter()
    return (end - start) * 1000  # ms
`;

export const ComplexityBenchmark: React.FC = () => {
  const [isRunning, setIsRunning] = useState(false);
  const [pattern, setPattern] = useState("Co");
  const [currentX, setCurrentX] = useState(0);
  const [pyodideReady, setPyodideReady] = useState(false);
  const [hoveredAlgorithm, setHoveredAlgorithm] = useState<string | null>(null);
  const [maxY, setMaxY] = useState(10);
  const [maxX, setMaxX] = useState(10);
  const runningRef = useRef(false);

  const [algorithms, setAlgorithms] = useState<Algorithm[]>([
    {
      id: "slicing",
      name: "slicing",
      color: "#f59e0b",
      code: SLICING_CODE,
      data: [],
    },
    {
      id: "counting",
      name: "counting",
      color: "#22c55e",
      code: COUNTING_CODE,
      data: [],
    },
  ]);

  // Initialize Pyodide
  useEffect(() => {
    const initPyodide = async () => {
      try {
        await pyodideContext.init();
        // Setup the Python environment
        await pyodideContext.run(SLICING_CODE);
        await pyodideContext.run(COUNTING_CODE);
        await pyodideContext.run(BENCHMARK_CODE);
        setPyodideReady(true);
      } catch (err) {
        console.error("Failed to initialize Pyodide:", err);
      }
    };
    initPyodide();
  }, []);

  const reset = useCallback(() => {
    setAlgorithms((prev) => prev.map((alg) => ({ ...alg, data: [] })));
    setCurrentX(0);
    setMaxY(10);
    setMaxX(10);
  }, []);

  const runBenchmark = useCallback(async () => {
    if (!pyodideReady) return;

    runningRef.current = true;
    setIsRunning(true);
    reset();

    let x = 1;
    const maxX = 1000000;

    while (runningRef.current && x <= maxX) {
      try {
        // Run slicing benchmark
        const timeSlicing = await pyodideContext.run(
          `benchmark_slicing("${pattern}", ${x})`,
        );

        // Run counting benchmark
        const timeCounting = await pyodideContext.run(
          `benchmark_counting("${pattern}", ${x})`,
        );

        const slicingMs = Number(timeSlicing);
        const countingMs = Number(timeCounting);

        setAlgorithms((prev) => {
          const newAlgs = prev.map((alg) => {
            if (alg.id === "slicing") {
              return { ...alg, data: [...alg.data, { x, y: slicingMs }] };
            } else if (alg.id === "counting") {
              return { ...alg, data: [...alg.data, { x, y: countingMs }] };
            }
            return alg;
          });
          return newAlgs;
        });

        // Update max Y dynamically
        setMaxY((prev) => Math.max(prev, slicingMs * 1.2, countingMs * 1.2));
        // Update max X dynamically
        setMaxX((prev) => Math.max(prev, x * 1.2));
        setCurrentX(x);

        x += 10000;

        // Small delay to allow UI updates
        await new Promise((resolve) => setTimeout(resolve, 50));
      } catch (err) {
        console.error("Benchmark error:", err);
        break;
      }
    }

    runningRef.current = false;
    setIsRunning(false);
  }, [pyodideReady, pattern, reset]);

  const stopBenchmark = useCallback(() => {
    runningRef.current = false;
    setIsRunning(false);
  }, []);

  // Chart dimensions
  const width = 700;
  const height = 400;
  const padding = { top: 40, right: 40, bottom: 60, left: 80 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  // Generate nice axis ticks
  const getAxisTicks = (max: number, count: number = 5) => {
    const step = max / count;
    const magnitude = Math.pow(10, Math.floor(Math.log10(step)));
    const normalizedStep = step / magnitude;
    let niceStep: number;
    if (normalizedStep <= 1) niceStep = magnitude;
    else if (normalizedStep <= 2) niceStep = 2 * magnitude;
    else if (normalizedStep <= 5) niceStep = 5 * magnitude;
    else niceStep = 10 * magnitude;

    const ticks: number[] = [];
    for (let i = 0; i <= max; i += niceStep) {
      ticks.push(Math.round(i * 100) / 100);
    }
    return ticks;
  };

  const xTicks = getAxisTicks(maxX, 5);
  const yTicks = getAxisTicks(maxY, 5);

  const scaleX = (x: number) => padding.left + (x / maxX) * chartWidth;
  const scaleY = (y: number) =>
    padding.top + chartHeight - (y / maxY) * chartHeight;

  const renderPath = (data: DataPoint[], color: string) => {
    if (data.length < 2) return null;
    const pathD = data
      .map((p, i) => `${i === 0 ? "M" : "L"} ${scaleX(p.x)} ${scaleY(p.y)}`)
      .join(" ");
    return (
      <path
        d={pathD}
        fill="none"
        stroke={color}
        strokeWidth={2.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    );
  };

  // Syntax highlighting using highlight.js
  const highlightCode = (code: string) => {
    try {
      return hljs.highlight(code, { language: "python" }).value;
    } catch {
      return code.replace(/</g, "&lt;").replace(/>/g, "&gt;");
    }
  };

  return (
    <div className="flex flex-col items-center gap-6 p-4 text-gray-800 dark:text-white">
      <h2 className="text-2xl font-bold">Algorithm Complexity Comparison</h2>

      {/* Controls */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-600 dark:text-gray-300">
            Pattern:
          </label>
          <input
            type="text"
            value={pattern}
            onChange={(e) => setPattern(e.target.value)}
            disabled={isRunning}
            className="px-3 py-1 rounded bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-gray-800 dark:text-white font-mono w-24 text-center"
            placeholder="Co"
          />
          <span className="text-gray-500 dark:text-gray-400 text-sm">× X</span>
        </div>

        {!isRunning ? (
          <button
            onClick={runBenchmark}
            disabled={!pyodideReady}
            className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 dark:disabled:bg-gray-600 text-white rounded font-semibold flex items-center gap-2 transition-colors"
          >
            <span>▶</span> Play
          </button>
        ) : (
          <button
            onClick={stopBenchmark}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded font-semibold flex items-center gap-2 transition-colors"
          >
            <span>■</span> Stop
          </button>
        )}

        <button
          onClick={reset}
          disabled={isRunning}
          className="px-4 py-2 bg-gray-500 dark:bg-gray-600 hover:bg-gray-600 dark:hover:bg-gray-700 disabled:bg-gray-300 dark:disabled:bg-gray-700 text-white rounded font-semibold transition-colors"
        >
          Reset
        </button>

        {!pyodideReady && (
          <span className="text-amber-500 dark:text-amber-400 text-sm animate-pulse">
            Loading Python...
          </span>
        )}
      </div>

      {/* Legend with hover */}
      <div className="flex gap-8 relative">
        {algorithms.map((alg) => (
          <div
            key={alg.id}
            className="flex text-left items-center gap-2 cursor-pointer relative"
            onMouseEnter={() => setHoveredAlgorithm(alg.id)}
            onMouseLeave={() => setHoveredAlgorithm(null)}
          >
            <div
              className="w-4 h-4 rounded"
              style={{ backgroundColor: alg.color }}
            />
            <span className="text-sm">{alg.name}</span>

            {/* Code tooltip */}
            {hoveredAlgorithm === alg.id && (
              <div className="absolute top-full left-0 mt-2 z-50 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg p-4 shadow-xl min-w-[400px]">
                <pre
                  className="text-xs font-mono whitespace-pre overflow-x-auto text-gray-800 dark:text-gray-200"
                  dangerouslySetInnerHTML={{ __html: highlightCode(alg.code) }}
                />
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Chart */}
      <svg
        width={width}
        height={height}
        className="bg-gray-100/50 dark:bg-gray-900/50 rounded-xl border border-gray-300 dark:border-gray-700"
      >
        {/* Grid lines */}
        {yTicks.map((yVal) => (
          <g key={`grid-y-${yVal}`}>
            <line
              x1={padding.left}
              y1={scaleY(yVal)}
              x2={padding.left + chartWidth}
              y2={scaleY(yVal)}
              stroke="currentColor"
              className="text-gray-300 dark:text-gray-700"
              strokeDasharray="4"
            />
            <text
              x={padding.left - 10}
              y={scaleY(yVal)}
              textAnchor="end"
              alignmentBaseline="middle"
              className="text-xs fill-gray-500 dark:fill-gray-400"
            >
              {yVal >= 1000
                ? `${(yVal / 1000).toFixed(1)}s`
                : `${yVal.toFixed(1)}`}
            </text>
          </g>
        ))}

        {/* X axis labels */}
        {xTicks.map((xVal) => (
          <text
            key={`x-${xVal}`}
            x={scaleX(xVal)}
            y={height - padding.bottom + 20}
            textAnchor="middle"
            className="text-xs fill-gray-500 dark:fill-gray-400"
          >
            {xVal}
          </text>
        ))}

        {/* Axis labels */}
        <text
          x={width / 2}
          y={height - 10}
          textAnchor="middle"
          className="text-sm fill-gray-600 dark:fill-gray-300"
        >
          Repetitions (X)
        </text>
        <text
          x={20}
          y={height / 2}
          textAnchor="middle"
          transform={`rotate(-90, 20, ${height / 2})`}
          className="text-sm fill-gray-600 dark:fill-gray-300"
        >
          Time (ms)
        </text>

        {/* Axes */}
        <line
          x1={padding.left}
          y1={padding.top}
          x2={padding.left}
          y2={padding.top + chartHeight}
          stroke="currentColor"
          className="text-gray-400 dark:text-gray-500"
          strokeWidth={2}
        />
        <line
          x1={padding.left}
          y1={padding.top + chartHeight}
          x2={padding.left + chartWidth}
          y2={padding.top + chartHeight}
          stroke="currentColor"
          className="text-gray-400 dark:text-gray-500"
          strokeWidth={2}
        />

        {/* Data lines */}
        {algorithms.map((alg) => (
          <g key={alg.id}>{renderPath(alg.data, alg.color)}</g>
        ))}

        {/* Current X indicator */}
        {currentX > 0 && (
          <line
            x1={scaleX(currentX)}
            y1={padding.top}
            x2={scaleX(currentX)}
            y2={padding.top + chartHeight}
            stroke="currentColor"
            className="text-gray-400 dark:text-white"
            strokeWidth={1}
            strokeDasharray="4"
            opacity={0.5}
          />
        )}
      </svg>

      {/* Current input display */}
      {currentX > 0 && (
        <div className="text-center text-sm text-gray-600 dark:text-gray-400">
          Current input:{" "}
          <code className="text-amber-600 dark:text-amber-400">{pattern}</code>{" "}
          × {currentX} ={" "}
          <code className="text-amber-600 dark:text-amber-400">
            "{pattern.repeat(Math.min(currentX, 10))}
            {currentX > 10 ? "..." : ""}"
          </code>
          <span className="ml-2">({pattern.length * currentX} chars)</span>
        </div>
      )}
    </div>
  );
};

export default ComplexityBenchmark;
