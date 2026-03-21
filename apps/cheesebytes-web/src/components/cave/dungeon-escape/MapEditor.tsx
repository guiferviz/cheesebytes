/**
 * MapEditor.tsx
 *
 * Interactive map editor for designing dungeon layouts.
 * - Click to toggle walls / place start / place end.
 * - Width/height selectors.
 * - Generate DFS maze (perfect + opened extra passages).
 * - Fill all walls / clear all.
 * - Copy map as RAW_MAP string.
 */

import React, { useRef, useEffect, useState, useCallback } from "react";
import {
  DUNGEON_COLORS,
  WALLS as DEFAULT_WALLS,
  START as DEFAULT_START,
  EXIT as DEFAULT_EXIT,
  MAP_ROWS as DEFAULT_ROWS,
  MAP_COLS as DEFAULT_COLS,
} from "./types";

// ── Types ───────────────────────────────────────────────────────────────────

type ClickMode = "wall" | "start" | "end";

interface Pos {
  r: number;
  c: number;
}

function posKey(r: number, c: number) {
  return `${r},${c}`;
}

// ── DFS maze generation ─────────────────────────────────────────────────────

/**
 * Generate a maze using randomised DFS (recursive-backtracker) on a grid
 * where *odd* cells are passages and *even* cells are walls.
 *
 * The algorithm produces a perfect maze first (a single spanning tree),
 * then randomly opens `extraOpenPercent`% of the remaining inner walls so
 * that there are usually multiple routes between any two points.
 *
 * `preserveWalls` — set of posKeys that must stay as walls.
 */
function generateDFSMaze(
  rows: number,
  cols: number,
  preserveWalls: Set<string>,
  extraOpenPercent: number,
): Set<string> {
  // Start with everything as wall
  const walls = new Set<string>();
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      walls.add(posKey(r, c));
    }
  }

  // Carve passages on odd-indexed interior cells via DFS
  const visited = new Set<string>();
  const stack: Pos[] = [];

  // Pick the first available odd cell
  const startR = 1;
  const startC = 1;
  visited.add(posKey(startR, startC));
  if (!preserveWalls.has(posKey(startR, startC))) {
    walls.delete(posKey(startR, startC));
  }
  stack.push({ r: startR, c: startC });

  const directions: [number, number][] = [
    [-2, 0],
    [2, 0],
    [0, -2],
    [0, 2],
  ];

  function shuffle<T>(arr: T[]) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
  }

  while (stack.length > 0) {
    const cur = stack[stack.length - 1];
    const neighbors: { nr: number; nc: number; wr: number; wc: number }[] = [];

    const shuffled = [...directions];
    shuffle(shuffled);
    for (const [dr, dc] of shuffled) {
      const nr = cur.r + dr;
      const nc = cur.c + dc;
      if (nr > 0 && nr < rows - 1 && nc > 0 && nc < cols - 1) {
        if (!visited.has(posKey(nr, nc))) {
          neighbors.push({ nr, nc, wr: cur.r + dr / 2, wc: cur.c + dc / 2 });
        }
      }
    }

    if (neighbors.length === 0) {
      stack.pop();
      continue;
    }

    const { nr, nc, wr, wc } = neighbors[0];
    visited.add(posKey(nr, nc));

    // Carve passage cell and the wall between
    if (!preserveWalls.has(posKey(wr, wc))) walls.delete(posKey(wr, wc));
    if (!preserveWalls.has(posKey(nr, nc))) walls.delete(posKey(nr, nc));

    stack.push({ r: nr, c: nc });
  }

  // Open extra passages to create multiple routes
  const innerWalls: string[] = [];
  for (let r = 1; r < rows - 1; r++) {
    for (let c = 1; c < cols - 1; c++) {
      const k = posKey(r, c);
      if (walls.has(k) && !preserveWalls.has(k)) {
        // Only open walls that connect two non-wall cells
        const adjFloors = [
          [r - 1, c],
          [r + 1, c],
          [r, c - 1],
          [r, c + 1],
        ].filter(([ar, ac]) => !walls.has(posKey(ar, ac)));
        if (adjFloors.length >= 2) {
          innerWalls.push(k);
        }
      }
    }
  }
  shuffle(innerWalls);
  const toOpen = Math.floor(innerWalls.length * (extraOpenPercent / 100));
  for (let i = 0; i < toOpen; i++) {
    walls.delete(innerWalls[i]);
  }

  return walls;
}

// ── Component ───────────────────────────────────────────────────────────────

export const MapEditor: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [rows, setRows] = useState(DEFAULT_ROWS);
  const [cols, setCols] = useState(DEFAULT_COLS);
  const [mode, setMode] = useState<ClickMode>("wall");
  const [walls, setWalls] = useState<Set<string>>(() => new Set(DEFAULT_WALLS));
  const [start, setStart] = useState<Pos>({
    r: DEFAULT_START.r,
    c: DEFAULT_START.c,
  });
  const [end, setEnd] = useState<Pos>({ r: DEFAULT_EXIT.r, c: DEFAULT_EXIT.c });
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawAction, setDrawAction] = useState<"add" | "remove">("add");
  const [copied, setCopied] = useState(false);
  const [extraOpen, setExtraOpen] = useState(30);

  // Fit canvas within a 1080×560 bounding box (leaves room for controls),
  // choosing the axis that constrains more so it always fits entirely.
  const maxW = 1080;
  const maxH = 560;
  const cellSize = Math.min(maxW / cols, maxH / rows);
  const canvasWidth = Math.round(cellSize * cols);
  const canvasHeight = Math.round(cellSize * rows);

  // When rows/cols change, rebuild border walls + clamp start/end
  const handleResize = useCallback((newRows: number, newCols: number) => {
    setRows(newRows);
    setCols(newCols);
    setWalls(borderWalls(newRows, newCols));
    setStart((s) => ({
      r: Math.min(s.r, newRows - 2),
      c: Math.min(s.c, newCols - 2),
    }));
    setEnd((e) => ({
      r: Math.min(e.r, newRows - 2),
      c: Math.min(e.c, newCols - 2),
    }));
  }, []);

  // ── Draw ────────────────────────────────────────────────────────────────

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = canvasWidth * dpr;
    canvas.height = canvasHeight * dpr;
    canvas.style.width = `${canvasWidth}px`;
    canvas.style.height = `${canvasHeight}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.imageSmoothingEnabled = false;

    const cx = (c: number) => Math.round(c * cellSize);
    const ry = (r: number) => Math.round(r * cellSize);
    const fillCell = (r: number, c: number) => {
      const x = cx(c);
      const y = ry(r);
      ctx.fillRect(x, y, cx(c + 1) - x, ry(r + 1) - y);
    };

    // Background
    ctx.fillStyle = DUNGEON_COLORS.empty;
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    // Walls
    ctx.fillStyle = DUNGEON_COLORS.wall;
    for (const k of walls) {
      const comma = k.indexOf(",");
      const r = parseInt(k.substring(0, comma), 10);
      const c = parseInt(k.substring(comma + 1), 10);
      fillCell(r, c);
    }

    // Start
    ctx.fillStyle = DUNGEON_COLORS.start;
    fillCell(start.r, start.c);
    ctx.fillStyle = "#FFFFFF";
    ctx.font = `bold ${Math.floor(cellSize * 0.55)}px sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(
      "S",
      cx(start.c) + cellSize / 2,
      ry(start.r) + cellSize / 2 + 1,
    );

    // End
    ctx.fillStyle = DUNGEON_COLORS.end;
    fillCell(end.r, end.c);
    ctx.fillStyle = "#FFFFFF";
    ctx.fillText("E", cx(end.c) + cellSize / 2, ry(end.r) + cellSize / 2 + 1);

    // Grid lines
    if (cellSize >= 8) {
      ctx.strokeStyle = DUNGEON_COLORS.gridLine;
      ctx.lineWidth = 1;
      for (let r = 0; r <= rows; r++) {
        const y = ry(r) + 0.5;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvasWidth, y);
        ctx.stroke();
      }
      for (let c = 0; c <= cols; c++) {
        const x = cx(c) + 0.5;
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvasHeight);
        ctx.stroke();
      }
    }
  }, [canvasWidth, canvasHeight, cellSize, rows, cols, walls, start, end]);

  // ── Click → cell ────────────────────────────────────────────────────────

  const canvasToCell = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>): Pos | null => {
      const canvas = canvasRef.current;
      if (!canvas) return null;
      const rect = canvas.getBoundingClientRect();
      const scaleX = canvasWidth / rect.width;
      const scaleY = canvasHeight / rect.height;
      const x = (e.clientX - rect.left) * scaleX;
      const y = (e.clientY - rect.top) * scaleY;
      const c = Math.floor(x / cellSize);
      const r = Math.floor(y / cellSize);
      if (r < 0 || r >= rows || c < 0 || c >= cols) return null;
      return { r, c };
    },
    [rows, cols, cellSize, canvasWidth, canvasHeight],
  );

  const isBorder = (r: number, c: number) =>
    r === 0 || r === rows - 1 || c === 0 || c === cols - 1;

  const handleMouseDown = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const cell = canvasToCell(e);
      if (!cell) return;
      if (isBorder(cell.r, cell.c)) return; // border always wall

      const k = posKey(cell.r, cell.c);

      if (mode === "start") {
        if (!walls.has(k) && !(cell.r === end.r && cell.c === end.c)) {
          setStart(cell);
        }
        return;
      }
      if (mode === "end") {
        if (!walls.has(k) && !(cell.r === start.r && cell.c === start.c)) {
          setEnd(cell);
        }
        return;
      }

      // Wall mode - toggle
      const sK = posKey(start.r, start.c);
      const eK = posKey(end.r, end.c);
      if (k === sK || k === eK) return;

      setIsDrawing(true);
      const action = walls.has(k) ? "remove" : "add";
      setDrawAction(action);
      setWalls((prev) => {
        const next = new Set(prev);
        if (action === "add") next.add(k);
        else next.delete(k);
        return next;
      });
    },
    [canvasToCell, mode, walls, start, end, rows, cols],
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (!isDrawing || mode !== "wall") return;
      const cell = canvasToCell(e);
      if (!cell || isBorder(cell.r, cell.c)) return;
      const k = posKey(cell.r, cell.c);
      if (k === posKey(start.r, start.c) || k === posKey(end.r, end.c)) return;
      setWalls((prev) => {
        const next = new Set(prev);
        if (drawAction === "add") next.add(k);
        else next.delete(k);
        return next;
      });
    },
    [isDrawing, mode, canvasToCell, start, end, drawAction, rows, cols],
  );

  const handleMouseUp = useCallback(() => setIsDrawing(false), []);

  // ── Actions ─────────────────────────────────────────────────────────────

  const handleFillWalls = useCallback(() => {
    const w = new Set<string>();
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (
          !(r === start.r && c === start.c) &&
          !(r === end.r && c === end.c)
        ) {
          w.add(posKey(r, c));
        }
      }
    }
    setWalls(w);
  }, [rows, cols, start, end]);

  const handleClearInner = useCallback(() => {
    setWalls(borderWalls(rows, cols));
  }, [rows, cols]);

  const handleGenerateMaze = useCallback(() => {
    // Preserve border + any user-placed walls that are on the border
    const preserve = borderWalls(rows, cols);
    const generated = generateDFSMaze(rows, cols, preserve, extraOpen);
    // Make sure start and end are not walls
    generated.delete(posKey(start.r, start.c));
    generated.delete(posKey(end.r, end.c));
    setWalls(generated);
  }, [rows, cols, start, end, extraOpen]);

  const handleCopyMap = useCallback(() => {
    const lines: string[] = [];
    for (let r = 0; r < rows; r++) {
      let line = "";
      for (let c = 0; c < cols; c++) {
        if (r === start.r && c === start.c) line += "S";
        else if (r === end.r && c === end.c) line += "E";
        else if (walls.has(posKey(r, c))) line += "#";
        else line += ".";
      }
      lines.push(`  "${line}",`);
    }
    const output = `const RAW_MAP = [\n${lines.join("\n")}\n];`;
    navigator.clipboard.writeText(output);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [rows, cols, walls, start, end]);

  // ── Render ──────────────────────────────────────────────────────────────

  const btnBase =
    "px-3 py-1.5 rounded-lg text-sm font-medium transition-colors cursor-pointer";
  const btnPrimary = `${btnBase} bg-amber-500 hover:bg-amber-600 text-white`;
  const btnSecondary = `${btnBase} bg-stone-200 hover:bg-stone-300 text-stone-700`;
  const btnActive = (active: boolean) =>
    active
      ? `${btnBase} bg-amber-400 text-white ring-2 ring-amber-600`
      : btnSecondary;

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 10,
        width: "100%",
        padding: 16,
        boxSizing: "border-box",
        fontFamily: "system-ui, sans-serif",
        fontSize: 14,
        color: "#333",
        background: "#f9f7f4",
        borderRadius: 12,
      }}
    >
      {/* Row 1: Dimensions */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        <label style={{ fontWeight: 600 }}>
          Rows:
          <input
            type="number"
            min={5}
            max={51}
            step={2}
            value={rows}
            onChange={(e) => {
              let v = parseInt(e.target.value, 10);
              if (v % 2 === 0) v++; // odd for maze gen
              handleResize(Math.max(5, Math.min(51, v)), cols);
            }}
            style={{
              marginLeft: 6,
              width: 56,
              padding: "2px 6px",
              borderRadius: 6,
              border: "1px solid #ccc",
            }}
          />
        </label>
        <label style={{ fontWeight: 600 }}>
          Cols:
          <input
            type="number"
            min={5}
            max={81}
            step={2}
            value={cols}
            onChange={(e) => {
              let v = parseInt(e.target.value, 10);
              if (v % 2 === 0) v++; // odd for maze gen
              handleResize(rows, Math.max(5, Math.min(81, v)));
            }}
            style={{
              marginLeft: 6,
              width: 56,
              padding: "2px 6px",
              borderRadius: 6,
              border: "1px solid #ccc",
            }}
          />
        </label>

        <span style={{ color: "#999", fontSize: 12 }}>
          {rows}×{cols} ({rows * cols} cells)
        </span>
      </div>

      {/* Row 2: Click mode + actions */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          flexWrap: "wrap",
        }}
      >
        <span style={{ fontWeight: 600, marginRight: 4 }}>Click:</span>
        <button
          className={btnActive(mode === "wall")}
          onClick={() => setMode("wall")}
        >
          Wall
        </button>
        <button
          className={btnActive(mode === "start")}
          onClick={() => setMode("start")}
        >
          Start
        </button>
        <button
          className={btnActive(mode === "end")}
          onClick={() => setMode("end")}
        >
          End
        </button>

        <span
          style={{ width: 1, height: 20, background: "#ccc", margin: "0 4px" }}
        />

        <button className={btnSecondary} onClick={handleFillWalls}>
          Fill Walls
        </button>
        <button className={btnSecondary} onClick={handleClearInner}>
          Clear Inner
        </button>
      </div>

      {/* Row 3: Maze generation */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          flexWrap: "wrap",
        }}
      >
        <button className={btnPrimary} onClick={handleGenerateMaze}>
          Generate Maze (DFS)
        </button>
        <label style={{ fontSize: 12, color: "#666" }}>
          Extra openings:
          <input
            type="range"
            min={0}
            max={80}
            value={extraOpen}
            onChange={(e) => setExtraOpen(Number(e.target.value))}
            style={{ width: 80, marginLeft: 6, verticalAlign: "middle" }}
          />
          <span style={{ marginLeft: 4 }}>{extraOpen}%</span>
        </label>

        <span
          style={{ width: 1, height: 20, background: "#ccc", margin: "0 4px" }}
        />

        <button
          className={`${btnBase} ${copied ? "bg-green-500 text-white" : "bg-blue-500 hover:bg-blue-600 text-white"}`}
          onClick={handleCopyMap}
        >
          {copied ? "Copied!" : "Copy RAW_MAP"}
        </button>
      </div>

      {/* Canvas */}
      <canvas
        ref={canvasRef}
        style={{
          display: "block",
          margin: "0 auto",
          cursor: mode === "wall" ? "pointer" : "crosshair",
          borderRadius: 8,
          border: "1px solid #e0e0e0",
        }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      />

      {/* Legend */}
      <div
        style={{
          display: "flex",
          gap: 16,
          fontSize: 12,
          color: "#666",
          justifyContent: "center",
        }}
      >
        <LegendItem color={DUNGEON_COLORS.wall} label="Wall" />
        <LegendItem color={DUNGEON_COLORS.empty} label="Floor" border />
        <LegendItem color={DUNGEON_COLORS.start} label="Start (S)" />
        <LegendItem color={DUNGEON_COLORS.end} label="End (E)" />
      </div>
    </div>
  );
};

function LegendItem({
  color,
  label,
  border,
}: {
  color: string;
  label: string;
  border?: boolean;
}) {
  return (
    <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
      <span
        style={{
          display: "inline-block",
          width: 12,
          height: 12,
          borderRadius: 2,
          backgroundColor: color,
          border: border ? "1px solid #ccc" : undefined,
        }}
      />
      {label}
    </span>
  );
}

/** Build a set containing only the border wall positions. */
function borderWalls(rows: number, cols: number): Set<string> {
  const w = new Set<string>();
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (r === 0 || r === rows - 1 || c === 0 || c === cols - 1) {
        w.add(posKey(r, c));
      }
    }
  }
  return w;
}

export default MapEditor;
