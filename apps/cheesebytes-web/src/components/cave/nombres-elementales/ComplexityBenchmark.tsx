import React, { useState, useRef, useEffect, useCallback } from "react";
import hljs from "highlight.js";
import pyodideContext from "../../../utils/pyodideContext";

interface DataPoint {
  x: number;
  y: number;
}

interface AlgorithmConfig {
  /** Unique identifier */
  id: string;
  /** Display name in legend */
  name: string;
  /** Line color (hex) */
  color?: string;
  /** Python function code (will be executed to define the function) */
  code: string;
  /** Name of the function to call (must match the def in code) */
  functionName: string;
}

interface AlgorithmState extends AlgorithmConfig {
  data: DataPoint[];
}

interface ComplexityBenchmarkProps {
  /** Title displayed at the top */
  title?: string;
  /** Label for the X axis */
  xAxisLabel?: string;
  /** Label for the Y axis */
  yAxisLabel?: string;
  /** Array of algorithm configurations to benchmark */
  algorithms: AlgorithmConfig[];
  /**
   * Python code that defines a function `create_input(x)` which returns
   * the input to pass to all benchmark functions.
   * Example: `def create_input(x): return "Co" * x`
   */
  inputGenerator: string;
  /** Optional setup code to run before benchmarks (e.g., imports, constants) */
  setupCode?: string;
  /** Starting value of X (default: 1) */
  startX?: number;
  /** Increment of X per iteration (default: 1) */
  stepX?: number;
  /** Maximum value of X (default: 1000) */
  maxXLimit?: number;
}

const DEFAULT_COLORS = [
  "#f59e0b", // amber
  "#22c55e", // green
  "#3b82f6", // blue
  "#ef4444", // red
  "#8b5cf6", // violet
  "#ec4899", // pink
  "#06b6d4", // cyan
  "#f97316", // orange
];

export const ComplexityBenchmark: React.FC<ComplexityBenchmarkProps> = ({
  title = "Algorithm Complexity Comparison",
  xAxisLabel = "Input Size (X)",
  yAxisLabel = "Time (ms)",
  algorithms: algorithmConfigs,
  inputGenerator,
  setupCode = "",
  startX = 1,
  stepX = 1,
  maxXLimit = 1000,
}) => {
  const [isRunning, setIsRunning] = useState(false);
  const [currentX, setCurrentX] = useState(0);
  const [pyodideReady, setPyodideReady] = useState(false);
  const [hoveredAlgorithm, setHoveredAlgorithm] = useState<string | null>(null);
  const [maxY, setMaxY] = useState(10);
  const [maxX, setMaxX] = useState(Math.max(10, startX * 2));
  const runningRef = useRef(false);

  // Assign colors to algorithms if not provided
  const algorithmsWithColors = algorithmConfigs.map((alg, i) => ({
    ...alg,
    color: alg.color || DEFAULT_COLORS[i % DEFAULT_COLORS.length],
  }));

  const [algorithms, setAlgorithms] = useState<AlgorithmState[]>(
    algorithmsWithColors.map((alg) => ({ ...alg, data: [] })),
  );

  // Initialize Pyodide and setup Python environment
  useEffect(() => {
    const initPyodide = async () => {
      try {
        await pyodideContext.init();

        // Run setup code if provided
        if (setupCode) {
          await pyodideContext.run(setupCode);
        }

        // Define input generator function
        await pyodideContext.run(inputGenerator);

        // Define all algorithm functions
        for (const alg of algorithmsWithColors) {
          await pyodideContext.run(alg.code);
        }

        // Create benchmark wrapper for each algorithm
        const benchmarkCode = `
import time

def __benchmark__(func, x):
    input_data = create_input(x)
    start = time.perf_counter()
    func(input_data)
    end = time.perf_counter()
    return (end - start) * 1000  # ms
`;
        await pyodideContext.run(benchmarkCode);

        setPyodideReady(true);
      } catch (err) {
        console.error("Failed to initialize Pyodide:", err);
      }
    };
    initPyodide();
  }, [setupCode, inputGenerator, algorithmsWithColors]);

  const reset = useCallback(() => {
    setAlgorithms((prev) => prev.map((alg) => ({ ...alg, data: [] })));
    setCurrentX(0);
    setMaxY(10);
    setMaxX(Math.max(10, startX * 2));
  }, [startX]);

  const runBenchmark = useCallback(async () => {
    if (!pyodideReady) return;

    runningRef.current = true;
    setIsRunning(true);
    reset();

    let x = startX;

    while (runningRef.current && x <= maxXLimit) {
      try {
        const times: { [id: string]: number } = {};

        // Benchmark each algorithm
        for (const alg of algorithmsWithColors) {
          const time = await pyodideContext.run(
            `__benchmark__(${alg.functionName}, ${x})`,
          );
          times[alg.id] = Number(time);
        }

        // Update algorithm data
        setAlgorithms((prev) => {
          return prev.map((alg) => {
            const time = times[alg.id];
            if (time !== undefined) {
              return { ...alg, data: [...alg.data, { x, y: time }] };
            }
            return alg;
          });
        });

        // Update max Y dynamically
        const maxTime = Math.max(...Object.values(times));
        setMaxY((prev) => Math.max(prev, maxTime * 1.2));

        // Update max X dynamically
        setMaxX((prev) => Math.max(prev, x * 1.2));
        setCurrentX(x);

        x += stepX;

        // Small delay to allow UI updates
        await new Promise((resolve) => setTimeout(resolve, 50));
      } catch (err) {
        console.error("Benchmark error:", err);
        break;
      }
    }

    runningRef.current = false;
    setIsRunning(false);
  }, [pyodideReady, reset, startX, stepX, maxXLimit, algorithmsWithColors]);

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
    if (max <= 0) return [0];
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
      <h2 className="text-2xl font-bold">{title}</h2>

      {/* Controls */}
      <div className="flex items-center gap-4">
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

        {currentX > 0 && (
          <span className="text-sm text-gray-500 dark:text-gray-400">
            X = {currentX}
          </span>
        )}
      </div>

      {/* Legend with hover */}
      <div className="flex flex-wrap gap-6 justify-center relative">
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
              <div className="absolute top-full left-0 mt-2 z-50 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg p-4 shadow-xl min-w-[400px] max-w-[600px]">
                <pre
                  className="hljs text-xs font-mono whitespace-pre overflow-x-auto"
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
          {xAxisLabel}
        </text>
        <text
          x={20}
          y={height / 2}
          textAnchor="middle"
          transform={`rotate(-90, 20, ${height / 2})`}
          className="text-sm fill-gray-600 dark:fill-gray-300"
        >
          {yAxisLabel}
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
          <g key={alg.id}>{renderPath(alg.data, alg.color!)}</g>
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
    </div>
  );
};

export default ComplexityBenchmark;
