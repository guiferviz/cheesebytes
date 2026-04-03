import React, { useCallback, useEffect, useRef, useState } from "react";
import { MAP_COLS, MAP_ROWS, posKey } from "../dungeon-escape/types";
import { CheeseSlideContainer } from "../shared";
import {
  buildGridFromGreedyMap,
  resetGreedyMineMap,
  updateGreedyMineMap,
  useGreedyMineMap,
} from "./map-state";

type ClickMode = "wall" | "start" | "exit";

interface Pos {
  r: number;
  c: number;
}

const ATLAS_SRC = "/tiles/terrain_atlas.png";
const ATLAS_COLS = 32;
const TS = 32;

const COLORS = {
  void: "#05070a",
  panelText: "#fff7e6",
  panelMuted: "#d7c7a7",
  panelDim: "#bca98c",
  grid: "rgba(255,255,255,0.08)",
  border: "rgba(255,255,255,0.14)",
  start: "#4caf50",
  exit: "#f44336",
} as const;

function tIdx(row: number, col: number): number {
  return row * ATLAS_COLS + col;
}

function isWallAt(walls: Set<string>, r: number, c: number): boolean {
  if (r < 0 || r >= MAP_ROWS || c < 0 || c >= MAP_COLS) return true;
  return walls.has(posKey(r, c));
}

function tileTL(walls: Set<string>, r: number, c: number): number {
  const wN = isWallAt(walls, r - 1, c);
  const wW = isWallAt(walls, r, c - 1);
  if (wN && wW) return tIdx(2, 18);
  if (wN) return tIdx(2, 19);
  if (wW) return tIdx(3, 18);
  if (isWallAt(walls, r - 1, c - 1)) return tIdx(1, 20);
  return tIdx(3, 19);
}

function tileTR(walls: Set<string>, r: number, c: number): number {
  const wN = isWallAt(walls, r - 1, c);
  const wE = isWallAt(walls, r, c + 1);
  if (wN && wE) return tIdx(2, 20);
  if (wN) return tIdx(2, 19);
  if (wE) return tIdx(3, 20);
  if (isWallAt(walls, r - 1, c + 1)) return tIdx(1, 19);
  return tIdx(3, 19);
}

function tileBL(walls: Set<string>, r: number, c: number): number {
  const wS = isWallAt(walls, r + 1, c);
  const wW = isWallAt(walls, r, c - 1);
  if (wS && wW) return tIdx(4, 18);
  if (wS) return tIdx(4, 19);
  if (wW) return tIdx(3, 18);
  if (isWallAt(walls, r + 1, c - 1)) return tIdx(0, 20);
  return tIdx(3, 19);
}

function tileBR(walls: Set<string>, r: number, c: number): number {
  const wS = isWallAt(walls, r + 1, c);
  const wE = isWallAt(walls, r, c + 1);
  if (wS && wE) return tIdx(4, 20);
  if (wS) return tIdx(4, 19);
  if (wE) return tIdx(3, 20);
  if (isWallAt(walls, r + 1, c + 1)) return tIdx(0, 19);
  return tIdx(3, 19);
}

function borderWalls(rows: number, cols: number): Set<string> {
  const walls = new Set<string>();
  for (let r = 0; r < rows; r += 1) {
    for (let c = 0; c < cols; c += 1) {
      if (r === 0 || r === rows - 1 || c === 0 || c === cols - 1) {
        walls.add(posKey(r, c));
      }
    }
  }
  return walls;
}

function generateDFSMaze(
  rows: number,
  cols: number,
  preserveWalls: Set<string>,
  extraOpenPercent: number,
): Set<string> {
  const walls = new Set<string>();
  for (let r = 0; r < rows; r += 1) {
    for (let c = 0; c < cols; c += 1) {
      walls.add(posKey(r, c));
    }
  }

  const visited = new Set<string>();
  const stack: Pos[] = [];
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

  function shuffle<T>(items: T[]) {
    for (let i = items.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [items[i], items[j]] = [items[j], items[i]];
    }
  }

  while (stack.length > 0) {
    const current = stack[stack.length - 1];
    const neighbors: { nr: number; nc: number; wr: number; wc: number }[] = [];
    const shuffled = [...directions];
    shuffle(shuffled);

    for (const [dr, dc] of shuffled) {
      const nr = current.r + dr;
      const nc = current.c + dc;
      if (nr > 0 && nr < rows - 1 && nc > 0 && nc < cols - 1) {
        if (!visited.has(posKey(nr, nc))) {
          neighbors.push({
            nr,
            nc,
            wr: current.r + dr / 2,
            wc: current.c + dc / 2,
          });
        }
      }
    }

    if (neighbors.length === 0) {
      stack.pop();
      continue;
    }

    const { nr, nc, wr, wc } = neighbors[0];
    visited.add(posKey(nr, nc));
    if (!preserveWalls.has(posKey(wr, wc))) walls.delete(posKey(wr, wc));
    if (!preserveWalls.has(posKey(nr, nc))) walls.delete(posKey(nr, nc));
    stack.push({ r: nr, c: nc });
  }

  const innerWalls: string[] = [];
  for (let r = 1; r < rows - 1; r += 1) {
    for (let c = 1; c < cols - 1; c += 1) {
      const key = posKey(r, c);
      if (!walls.has(key) || preserveWalls.has(key)) continue;
      const adjFloors = [
        [r - 1, c],
        [r + 1, c],
        [r, c - 1],
        [r, c + 1],
      ].filter(([ar, ac]) => !walls.has(posKey(ar, ac)));
      if (adjFloors.length >= 2) innerWalls.push(key);
    }
  }

  for (let i = innerWalls.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [innerWalls[i], innerWalls[j]] = [innerWalls[j], innerWalls[i]];
  }

  const toOpen = Math.floor(innerWalls.length * (extraOpenPercent / 100));
  for (let i = 0; i < toOpen; i += 1) {
    walls.delete(innerWalls[i]);
  }

  return walls;
}

export const GreedyGoldMineMapEditor: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const atlasRef = useRef<HTMLImageElement | null>(null);
  const map = useGreedyMineMap();
  const [mode, setMode] = useState<ClickMode>("wall");
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawAction, setDrawAction] = useState<"add" | "remove">("add");
  const [copied, setCopied] = useState(false);
  const [extraOpen, setExtraOpen] = useState(30);
  const [atlasReady, setAtlasReady] = useState(false);

  const maxW = 1080;
  const maxH = 560;
  const cellSize = Math.min(maxW / map.cols, maxH / map.rows);
  const canvasWidth = Math.round(cellSize * map.cols);
  const canvasHeight = Math.round(cellSize * map.rows);

  useEffect(() => {
    const image = new Image();
    image.src = ATLAS_SRC;
    image.onload = () => {
      atlasRef.current = image;
      setAtlasReady(true);
    };
  }, []);

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

    const atlas = atlasRef.current;
    const cellWidth = canvasWidth / map.cols;
    const cellHeight = canvasHeight / map.rows;
    const drawTile = (
      tileIndex: number,
      dx: number,
      dy: number,
      size: number,
    ) => {
      if (!atlas) return;
      const sx = (tileIndex % ATLAS_COLS) * TS;
      const sy = Math.floor(tileIndex / ATLAS_COLS) * TS;
      ctx.drawImage(atlas, sx, sy, TS, TS, dx, dy, size, size);
    };
    const drawFloorCell = (r: number, c: number) => {
      const x = Math.round(c * cellWidth);
      const y = Math.round(r * cellHeight);
      const right = Math.round((c + 1) * cellWidth);
      const bottom = Math.round((r + 1) * cellHeight);
      const width = right - x;
      const height = bottom - y;
      const halfW = Math.ceil(width / 2);
      const halfH = Math.ceil(height / 2);

      if (!atlas) {
        ctx.fillStyle = "#8b6845";
        ctx.fillRect(x, y, width, height);
        return;
      }

      drawTile(tileTL(map.walls, r, c), x, y, halfW);
      drawTile(tileTR(map.walls, r, c), x + halfW, y, width - halfW);
      drawTile(tileBL(map.walls, r, c), x, y + halfH, halfW);
      drawTile(tileBR(map.walls, r, c), x + halfW, y + halfH, width - halfW);
    };

    ctx.fillStyle = COLORS.void;
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    for (let r = 0; r < map.rows; r += 1) {
      for (let c = 0; c < map.cols; c += 1) {
        if (!map.walls.has(posKey(r, c))) {
          drawFloorCell(r, c);
        }
      }
    }

    const cx = (c: number) => Math.round(c * cellWidth);
    const ry = (r: number) => Math.round(r * cellHeight);
    const drawMarker = (cell: Pos, label: string, color: string) => {
      const x = cx(cell.c);
      const y = ry(cell.r);
      const width = Math.round((cell.c + 1) * cellWidth) - x;
      const height = Math.round((cell.r + 1) * cellHeight) - y;
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(
        x + width / 2,
        y + height / 2,
        Math.min(width, height) * 0.24,
        0,
        Math.PI * 2,
      );
      ctx.fill();
      ctx.fillStyle = "#ffffff";
      ctx.font = `bold ${Math.max(10, Math.floor(Math.min(width, height) * 0.4))}px monospace`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(label, x + width / 2, y + height / 2 + 1);
    };

    drawMarker(map.start, "S", COLORS.start);
    drawMarker(map.exit, "E", COLORS.exit);

    ctx.strokeStyle = COLORS.grid;
    ctx.lineWidth = 1;
    for (let r = 0; r <= map.rows; r += 1) {
      const y = Math.round(r * cellHeight) + 0.5;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(canvasWidth, y);
      ctx.stroke();
    }
    for (let c = 0; c <= map.cols; c += 1) {
      const x = Math.round(c * cellWidth) + 0.5;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, canvasHeight);
      ctx.stroke();
    }

    ctx.strokeStyle = COLORS.border;
    ctx.lineWidth = 2;
    ctx.strokeRect(1, 1, canvasWidth - 2, canvasHeight - 2);
  }, [atlasReady, canvasHeight, canvasWidth, map]);

  const isBorder = useCallback(
    (r: number, c: number) =>
      r === 0 || r === map.rows - 1 || c === 0 || c === map.cols - 1,
    [map.cols, map.rows],
  );

  const canvasToCell = useCallback(
    (event: React.MouseEvent<HTMLCanvasElement>): Pos | null => {
      const canvas = canvasRef.current;
      if (!canvas) return null;
      const rect = canvas.getBoundingClientRect();
      const scaleX = canvasWidth / rect.width;
      const scaleY = canvasHeight / rect.height;
      const x = (event.clientX - rect.left) * scaleX;
      const y = (event.clientY - rect.top) * scaleY;
      const c = Math.floor(x / cellSize);
      const r = Math.floor(y / cellSize);
      if (r < 0 || r >= map.rows || c < 0 || c >= map.cols) return null;
      return { r, c };
    },
    [canvasHeight, canvasWidth, cellSize, map.cols, map.rows],
  );

  const paintWallCell = useCallback(
    (cell: Pos, action: "add" | "remove") => {
      if (isBorder(cell.r, cell.c)) return;
      const key = posKey(cell.r, cell.c);
      if (key === posKey(map.start.r, map.start.c)) return;
      if (key === posKey(map.exit.r, map.exit.c)) return;

      updateGreedyMineMap((state) => {
        const walls = new Set(state.walls);
        if (action === "add") walls.add(key);
        else walls.delete(key);
        return { ...state, walls };
      });
    },
    [isBorder, map.exit.c, map.exit.r, map.start.c, map.start.r],
  );

  const handleMouseDown = useCallback(
    (event: React.MouseEvent<HTMLCanvasElement>) => {
      const cell = canvasToCell(event);
      if (!cell || isBorder(cell.r, cell.c)) return;

      if (mode === "start") {
        const key = posKey(cell.r, cell.c);
        if (!map.walls.has(key) && key !== posKey(map.exit.r, map.exit.c)) {
          updateGreedyMineMap((state) => ({ ...state, start: cell }));
        }
        return;
      }

      if (mode === "exit") {
        const key = posKey(cell.r, cell.c);
        if (!map.walls.has(key) && key !== posKey(map.start.r, map.start.c)) {
          updateGreedyMineMap((state) => ({ ...state, exit: cell }));
        }
        return;
      }

      const key = posKey(cell.r, cell.c);
      const action = map.walls.has(key) ? "remove" : "add";
      setIsDrawing(true);
      setDrawAction(action);
      paintWallCell(cell, action);
    },
    [
      canvasToCell,
      isBorder,
      map.exit.c,
      map.exit.r,
      map.start.c,
      map.start.r,
      map.walls,
      mode,
      paintWallCell,
    ],
  );

  const handleMouseMove = useCallback(
    (event: React.MouseEvent<HTMLCanvasElement>) => {
      if (!isDrawing || mode !== "wall") return;
      const cell = canvasToCell(event);
      if (!cell) return;
      paintWallCell(cell, drawAction);
    },
    [canvasToCell, drawAction, isDrawing, mode, paintWallCell],
  );

  const handleCopy = useCallback(async () => {
    const lines = buildGridFromGreedyMap(map).map((line) => `  "${line}",`);
    const rawMap = `const RAW_MAP = [\n${lines.join("\n")}\n];`;
    await navigator.clipboard.writeText(rawMap);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1200);
  }, [map]);

  const handleMouseUp = useCallback(() => setIsDrawing(false), []);

  const handleGenerateMaze = useCallback(() => {
    const preserve = borderWalls(map.rows, map.cols);
    const generated = generateDFSMaze(map.rows, map.cols, preserve, extraOpen);
    generated.delete(posKey(map.start.r, map.start.c));
    generated.delete(posKey(map.exit.r, map.exit.c));
    updateGreedyMineMap((state) => ({ ...state, walls: generated }));
  }, [
    extraOpen,
    map.cols,
    map.exit.c,
    map.exit.r,
    map.rows,
    map.start.c,
    map.start.r,
  ]);

  const handleFillWalls = useCallback(() => {
    const walls = new Set<string>();
    for (let r = 0; r < map.rows; r += 1) {
      for (let c = 0; c < map.cols; c += 1) {
        if (
          !(r === map.start.r && c === map.start.c) &&
          !(r === map.exit.r && c === map.exit.c)
        ) {
          walls.add(posKey(r, c));
        }
      }
    }
    updateGreedyMineMap((state) => ({ ...state, walls }));
  }, [map.cols, map.exit.c, map.exit.r, map.rows, map.start.c, map.start.r]);

  const handleClearInner = useCallback(() => {
    updateGreedyMineMap((state) => ({
      ...state,
      walls: borderWalls(state.rows, state.cols),
    }));
  }, []);

  return (
    <CheeseSlideContainer>
      <div
        style={{
          maxWidth: 1180,
          margin: "0 auto",
          display: "grid",
          gridTemplateColumns: "320px minmax(0, 1fr)",
          gap: 18,
          alignItems: "start",
        }}
      >
        <div
          style={{
            padding: 16,
            borderRadius: 16,
            background: "linear-gradient(180deg, #171312 0%, #0d0f14 100%)",
            border: "1px solid rgba(255,255,255,0.08)",
            color: "#fff7e6",
          }}
        >
          <h3 style={{ margin: "0 0 10px", fontSize: 24 }}>Edit the Mine</h3>
          <p
            style={{
              margin: "0 0 12px",
              color: COLORS.panelMuted,
              lineHeight: 1.4,
            }}
          >
            Changes here affect the playable run and the solver slide when you
            go back.
          </p>

          <div style={{ display: "grid", gap: 8, marginBottom: 12 }}>
            <EditorButton
              label="Toggle walls"
              active={mode === "wall"}
              onClick={() => setMode("wall")}
            />
            <EditorButton
              label="Place start"
              active={mode === "start"}
              onClick={() => setMode("start")}
            />
            <EditorButton
              label="Place exit"
              active={mode === "exit"}
              onClick={() => setMode("exit")}
            />
          </div>

          <div style={{ display: "grid", gap: 8, marginBottom: 12 }}>
            <EditorActionButton label="Fill walls" onClick={handleFillWalls} />
            <EditorActionButton
              label="Clear inner walls"
              onClick={handleClearInner}
            />
            <EditorActionButton
              label="Reset default map"
              onClick={resetGreedyMineMap}
            />
          </div>

          <div
            style={{
              marginBottom: 12,
              padding: 12,
              borderRadius: 12,
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.08)",
            }}
          >
            <div
              style={{
                fontSize: 12,
                textTransform: "uppercase",
                letterSpacing: "0.12em",
                color: "#f6bd60",
                marginBottom: 8,
              }}
            >
              Random Maze
            </div>
            <EditorActionButton
              label="Generate DFS maze"
              onClick={handleGenerateMaze}
            />
            <label
              style={{
                display: "block",
                marginTop: 10,
                fontSize: 12,
                color: COLORS.panelDim,
              }}
            >
              Extra openings: {extraOpen}%
            </label>
            <input
              type="range"
              min={0}
              max={80}
              value={extraOpen}
              onChange={(event) => setExtraOpen(Number(event.target.value))}
              style={{ width: "100%", marginTop: 4 }}
            />
          </div>

          <div style={{ display: "grid", gap: 8, marginBottom: 12 }}>
            <EditorActionButton
              label={copied ? "Copied" : "Copy RAW_MAP"}
              onClick={handleCopy}
            />
          </div>

          <div
            style={{ fontSize: 12, color: COLORS.panelDim, lineHeight: 1.4 }}
          >
            Border cells stay closed so all visuals keep the same framing and
            camera bounds.
          </div>
        </div>

        <div
          style={{
            padding: 14,
            borderRadius: 18,
            background:
              "linear-gradient(180deg, rgba(16,18,24,0.98) 0%, rgba(5,7,10,0.98) 100%)",
            border: "1px solid rgba(255,255,255,0.08)",
            overflow: "hidden",
          }}
        >
          <canvas
            ref={canvasRef}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            style={{
              display: "block",
              margin: "0 auto",
              cursor: mode === "wall" ? "pointer" : "crosshair",
              borderRadius: 10,
              border: "1px solid rgba(255,255,255,0.08)",
              background: COLORS.void,
            }}
          />
        </div>
      </div>
    </CheeseSlideContainer>
  );
};

const EditorButton: React.FC<{
  label: string;
  active: boolean;
  onClick: () => void;
}> = ({ label, active, onClick }) => {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        width: "100%",
        padding: "9px 12px",
        borderRadius: 10,
        border: `1px solid ${active ? "rgba(246,189,96,0.45)" : "rgba(255,255,255,0.08)"}`,
        background: active ? "rgba(246,189,96,0.12)" : "rgba(255,255,255,0.04)",
        color: active ? "#f6bd60" : "#fff7e6",
        fontWeight: 700,
        cursor: "pointer",
      }}
    >
      {label}
    </button>
  );
};

const EditorActionButton: React.FC<{ label: string; onClick: () => void }> = ({
  label,
  onClick,
}) => {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        width: "100%",
        padding: "9px 12px",
        borderRadius: 10,
        border: "1px solid rgba(255,255,255,0.08)",
        background: "rgba(255,255,255,0.05)",
        color: "#fff7e6",
        fontWeight: 600,
        cursor: "pointer",
      }}
    >
      {label}
    </button>
  );
};

export default GreedyGoldMineMapEditor;
