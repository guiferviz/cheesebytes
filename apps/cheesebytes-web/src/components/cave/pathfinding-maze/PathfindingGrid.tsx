import React, { useRef, useEffect, useState, useCallback } from "react";
import type { Cell, AlgorithmType, SearchStep } from "./types";
import { cellKey, ALGORITHM_LABELS, CELL_COLORS } from "./types";
import { runAlgorithm, generateWalls } from "./algorithms";

interface PathfindingGridProps {
  rows?: number;
  cols?: number;
  wallPercent?: number;
  defaultAlgorithm?: AlgorithmType;
  /** Milliseconds between animation frames. */
  speed?: number;
}

type InteractionMode = "wall" | "start" | "end";

export const PathfindingGrid: React.FC<PathfindingGridProps> = ({
  rows: initRows = 30,
  cols: initCols = 40,
  wallPercent: initWallPercent = 25,
  defaultAlgorithm = "bfs",
  speed: initSpeed = 30,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasWrapperRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cancelledRef = useRef(false);
  const speedRef = useRef(initSpeed);

  const [rows] = useState(initRows);
  const [cols] = useState(initCols);
  const [canvasWidth, setCanvasWidth] = useState(0);
  const [wallPercent, setWallPercent] = useState(initWallPercent);
  const [algorithm, setAlgorithm] = useState<AlgorithmType>(defaultAlgorithm);
  const [speed, setSpeed] = useState(initSpeed);

  const [start, setStart] = useState<Cell>({ row: 1, col: 1 });
  const [end, setEnd] = useState<Cell>({
    row: initRows - 2,
    col: initCols - 2,
  });
  const [walls, setWalls] = useState<Set<string>>(() =>
    generateWalls(initRows, initCols, initWallPercent, { row: 1, col: 1 }, { row: initRows - 2, col: initCols - 2 }),
  );

  const [explored, setExplored] = useState<Set<string>>(new Set());
  const [frontier, setFrontier] = useState<Set<string>>(new Set());
  const [path, setPath] = useState<Cell[] | null>(null);
  const [currentPath, setCurrentPath] = useState<Cell[]>([]);
  const [running, setRunning] = useState(false);
  const [done, setDone] = useState(false);
  const [mode, setMode] = useState<InteractionMode>("wall");
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawAction, setDrawAction] = useState<"add" | "remove">("add");

  const [stats, setStats] = useState<{ explored: number; pathLen: number } | null>(null);

  // Compute cellSize to fill canvas wrapper width exactly
  useEffect(() => {
    const wrapper = canvasWrapperRef.current;
    if (!wrapper) return;
    const update = () => {
      setCanvasWidth(wrapper.clientWidth);
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(wrapper);
    return () => observer.disconnect();
  }, []);

  // Derived: exact fractional cell size fills the width perfectly
  const cellSize = canvasWidth > 0 ? canvasWidth / cols : 16;
  const canvasHeight = Math.round(cellSize * rows);

  // Draw canvas (crisp rendering with devicePixelRatio)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || canvasWidth === 0) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const w = canvasWidth;
    const h = canvasHeight;

    // Snap helpers (defined locally to avoid dep issues)
    const cx = (c: number) => Math.round(c * cellSize);
    const ry = (r: number) => Math.round(r * cellSize);

    // Set actual pixel size (scaled for retina)
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    // Set display size via CSS
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.imageSmoothingEnabled = false;

    // Helper to draw a snapped cell rect
    const fillCell = (r: number, c: number) => {
      const x = cx(c);
      const y = ry(r);
      ctx.fillRect(x, y, cx(c + 1) - x, ry(r + 1) - y);
    };

    // Clear
    ctx.fillStyle = CELL_COLORS.empty;
    ctx.fillRect(0, 0, w, h);

    // Explored
    ctx.fillStyle = CELL_COLORS.explored;
    for (const key of explored) {
      const [r, c] = key.split(",").map(Number);
      fillCell(r, c);
    }

    // Frontier
    ctx.fillStyle = CELL_COLORS.frontier;
    for (const key of frontier) {
      const [r, c] = key.split(",").map(Number);
      fillCell(r, c);
    }

    // Current path being explored
    if (currentPath.length > 0 && !path) {
      ctx.fillStyle = CELL_COLORS.currentPath;
      for (const cell of currentPath) {
        fillCell(cell.row, cell.col);
      }
      // Current cell (last in currentPath) in distinct color
      const cur = currentPath[currentPath.length - 1];
      ctx.fillStyle = CELL_COLORS.currentCell;
      fillCell(cur.row, cur.col);
    }

    // Final path
    if (path) {
      ctx.fillStyle = CELL_COLORS.path;
      for (const cell of path) {
        fillCell(cell.row, cell.col);
      }
    }

    // Walls
    ctx.fillStyle = CELL_COLORS.wall;
    for (const key of walls) {
      const [r, c] = key.split(",").map(Number);
      fillCell(r, c);
    }

    // Start
    ctx.fillStyle = CELL_COLORS.start;
    fillCell(start.row, start.col);

    // End
    ctx.fillStyle = CELL_COLORS.end;
    fillCell(end.row, end.col);

    // Grid lines (snapped to pixel boundaries)
    if (cellSize >= 8) {
      ctx.strokeStyle = CELL_COLORS.gridLine;
      ctx.lineWidth = 1;
      for (let r = 0; r <= rows; r++) {
        const y = ry(r) + 0.5;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
      }
      for (let c = 0; c <= cols; c++) {
        const x = cx(c) + 0.5;
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, h);
        ctx.stroke();
      }
    }
  }, [rows, cols, cellSize, canvasWidth, canvasHeight, walls, start, end, explored, frontier, path, currentPath]);

  // Map canvas coords to cell
  const canvasToCell = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>): Cell | null => {
      const canvas = canvasRef.current;
      if (!canvas) return null;
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const scaleX = canvas.width / (window.devicePixelRatio || 1) / rect.width;
      const scaleY = canvas.height / (window.devicePixelRatio || 1) / rect.height;
      const col = Math.floor((x * scaleX) / cellSize);
      const row = Math.floor((y * scaleY) / cellSize);
      if (row < 0 || row >= rows || col < 0 || col >= cols) return null;
      return { row, col };
    },
    [rows, cols, cellSize],
  );

  const handleMouseDown = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const cell = canvasToCell(e);
      if (!cell || running) return;

      const k = cellKey(cell.row, cell.col);
      const startK = cellKey(start.row, start.col);
      const endK = cellKey(end.row, end.col);

      if (mode === "start") {
        if (k !== endK && !walls.has(k)) setStart(cell);
        return;
      }
      if (mode === "end") {
        if (k !== startK && !walls.has(k)) setEnd(cell);
        return;
      }

      // Wall mode
      if (k === startK || k === endK) return;
      setIsDrawing(true);
      const action = walls.has(k) ? "remove" : "add";
      setDrawAction(action);
      setWalls((prev) => {
        const next = new Set(prev);
        if (action === "add") next.add(k); else next.delete(k);
        return next;
      });
      // Clear search results when editing
      clearSearch();
    },
    [canvasToCell, mode, running, start, end, walls],
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (!isDrawing || running || mode !== "wall") return;
      const cell = canvasToCell(e);
      if (!cell) return;
      const k = cellKey(cell.row, cell.col);
      const startK = cellKey(start.row, start.col);
      const endK = cellKey(end.row, end.col);
      if (k === startK || k === endK) return;

      setWalls((prev) => {
        const next = new Set(prev);
        if (drawAction === "add") next.add(k); else next.delete(k);
        return next;
      });
    },
    [isDrawing, running, mode, canvasToCell, start, end, drawAction],
  );

  const handleMouseUp = useCallback(() => {
    setIsDrawing(false);
  }, []);

  const clearSearch = useCallback(() => {
    cancelledRef.current = true;
    setExplored(new Set());
    setFrontier(new Set());
    setPath(null);
    setCurrentPath([]);
    setDone(false);
    setStats(null);
    setRunning(false);
    if (timerRef.current) clearTimeout(timerRef.current);
  }, []);

  const handleStop = useCallback(() => {
    cancelledRef.current = true;
    setRunning(false);
    if (timerRef.current) clearTimeout(timerRef.current);
  }, []);

  const handleRun = useCallback(() => {
    clearSearch();
    cancelledRef.current = false;
    setRunning(true);

    const gen = runAlgorithm(algorithm, start, end, rows, cols, walls);

    const step = () => {
      if (cancelledRef.current) return;
      const result = gen.next();
      if (result.done) {
        setRunning(false);
        setDone(true);
        return;
      }
      const s: SearchStep = result.value;
      setExplored(s.explored);
      setFrontier(s.frontier);
      setCurrentPath(s.currentPath ?? []);
      if (s.path) {
        setPath(s.path);
        setCurrentPath([]);
        setStats({ explored: s.explored.size, pathLen: s.path.length });
        setRunning(false);
        setDone(true);
        return;
      }
      timerRef.current = setTimeout(step, speedRef.current);
    };

    step();
  }, [algorithm, start, end, rows, cols, walls, clearSearch]);

  const handleReset = useCallback(() => {
    clearSearch();
    setRunning(false);
    setWalls(generateWalls(rows, cols, wallPercent, start, end));
  }, [clearSearch, rows, cols, wallPercent, start, end]);

  const handleClearWalls = useCallback(() => {
    clearSearch();
    setWalls(new Set());
  }, [clearSearch]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cancelledRef.current = true;
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const btnBase =
    "px-3 py-1.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed";
  const btnPrimary = `${btnBase} bg-amber-500 hover:bg-amber-600 text-white`;
  const btnSecondary = `${btnBase} bg-stone-200 hover:bg-stone-300 text-stone-700 dark:bg-stone-700 dark:hover:bg-stone-600 dark:text-stone-200`;
  const btnActive = (active: boolean) =>
    active
      ? `${btnBase} bg-amber-400 text-white ring-2 ring-amber-600`
      : btnSecondary;

  return (
    <div
      ref={containerRef}
      className="flex flex-col gap-4 p-4 bg-gradient-to-b from-amber-50/80 to-orange-50/60 dark:from-stone-900/90 dark:to-stone-950/90 rounded-2xl select-none"
    >
      {/* Controls row 1: Algorithm + speed */}
      <div className="flex flex-wrap items-center gap-3">
        <label className="text-sm font-medium text-stone-600 dark:text-stone-400">
          Algorithm:
        </label>
        <select
          value={algorithm}
          onChange={(e) => {
            clearSearch();
            setAlgorithm(e.target.value as AlgorithmType);
          }}
          disabled={running}
          className="px-2 py-1 rounded-lg text-sm bg-white dark:bg-stone-800 border border-stone-300 dark:border-stone-600 text-stone-700 dark:text-stone-200"
        >
          {Object.entries(ALGORITHM_LABELS).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>

        <label className="text-sm font-medium text-stone-600 dark:text-stone-400 ml-2">
          Speed:
        </label>
        <input
          type="range"
          min={1}
          max={200}
          value={201 - speed}
          onChange={(e) => {
            const v = 201 - Number(e.target.value);
            setSpeed(v);
            speedRef.current = v;
          }}
          className="w-24"
        />
        <span className="text-xs text-stone-500 dark:text-stone-400 w-12">
          {speed}ms
        </span>
      </div>

      {/* Controls row 2: Mode + actions */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm font-medium text-stone-600 dark:text-stone-400 mr-1">
          Click mode:
        </span>
        <button
          className={btnActive(mode === "wall")}
          onClick={() => setMode("wall")}
        >
          🧱 Walls
        </button>
        <button
          className={btnActive(mode === "start")}
          onClick={() => setMode("start")}
        >
          🟢 Start
        </button>
        <button
          className={btnActive(mode === "end")}
          onClick={() => setMode("end")}
        >
          🔴 End
        </button>

        <div className="w-px h-6 bg-stone-300 dark:bg-stone-600 mx-1" />

        <button className={btnPrimary} onClick={handleRun} disabled={running}>
          ▶ Run
        </button>
        <button
          className={`${btnBase} bg-rose-500 hover:bg-rose-600 text-white`}
          onClick={handleStop}
          disabled={!running}
        >
          ■ Stop
        </button>
        <button
          className={btnSecondary}
          onClick={clearSearch}
        >
          Clear Search
        </button>
        <button
          className={btnSecondary}
          onClick={handleReset}
          disabled={running}
        >
          New Maze
        </button>
        <button
          className={btnSecondary}
          onClick={handleClearWalls}
          disabled={running}
        >
          Clear Walls
        </button>
      </div>

      {/* Wall density slider */}
      <div className="flex items-center gap-2">
        <label className="text-sm font-medium text-stone-600 dark:text-stone-400">
          Wall density:
        </label>
        <input
          type="range"
          min={0}
          max={50}
          value={wallPercent}
          onChange={(e) => setWallPercent(Number(e.target.value))}
          disabled={running}
          className="w-32"
        />
        <span className="text-xs text-stone-500 dark:text-stone-400">
          {wallPercent}%
        </span>
      </div>

      {/* Canvas */}
      <div
        ref={canvasWrapperRef}
        className="overflow-hidden rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900"
      >
        <canvas
          ref={canvasRef}
          style={{
            display: "block",
            cursor:
              mode === "start"
                ? "crosshair"
                : mode === "end"
                  ? "crosshair"
                  : "pointer",
          }}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        />
      </div>

      {/* Legend + Stats */}
      <div className="flex flex-wrap items-center gap-4 text-xs text-stone-600 dark:text-stone-400">
        <Legend color={CELL_COLORS.start} label="Start" />
        <Legend color={CELL_COLORS.end} label="End" />
        <Legend color={CELL_COLORS.wall} label="Wall" />
        <Legend color={CELL_COLORS.explored} label="Explored" />
        <Legend color={CELL_COLORS.frontier} label="Frontier" />
        <Legend color={CELL_COLORS.currentPath} label="Current Path" />
        <Legend color={CELL_COLORS.currentCell} label="Current Cell" />
        <Legend color={CELL_COLORS.path} label="Path" />

        {stats && (
          <span className="ml-auto font-medium">
            Explored: {stats.explored} cells · Path length: {stats.pathLen}
          </span>
        )}
        {done && !path && (
          <span className="ml-auto font-medium text-red-500">
            No path found!
          </span>
        )}
      </div>
    </div>
  );
};

const Legend: React.FC<{ color: string; label: string }> = ({
  color,
  label,
}) => (
  <span className="flex items-center gap-1">
    <span
      className="inline-block w-3 h-3 rounded-sm border border-stone-300"
      style={{ backgroundColor: color }}
    />
    {label}
  </span>
);
