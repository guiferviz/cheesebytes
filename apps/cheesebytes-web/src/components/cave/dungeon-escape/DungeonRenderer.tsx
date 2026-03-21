/**
 * DungeonRenderer.tsx
 *
 * Canvas-based dungeon grid renderer with viewport (zoom) support.
 * Rendering style copied from PathfindingGrid — same colors, same draw
 * order, same snapped-cell approach.  Fixed dimensions (no ResizeObserver)
 * so Reveal.js handles the scaling correctly.
 */

import React, { useRef, useEffect } from "react";
import type { Pos, Viewport } from "./types";
import {
  posKey,
  WALLS,
  START,
  EXIT,
  DUNGEON_COLORS,
  FULL_VIEWPORT,
} from "./types";

export interface PathOverlay {
  cells: Pos[];
  color: string;
  /** Draw a connected line instead of filled cells. */
  line?: boolean;
  lineWidth?: number;
}

export interface DungeonRendererProps {
  width?: number;
  height?: number;
  viewport?: Viewport;
  explored?: Set<string>;
  frontier?: Set<string>;
  currentPath?: Pos[];
  paths?: PathOverlay[];
  showExit?: boolean;
  showStart?: boolean;
  exploredColor?: string;
  frontierColor?: string;
  loopDangerCells?: Set<string>;
  label?: string;
  className?: string;
}

export const DungeonRenderer: React.FC<DungeonRendererProps> = ({
  width = 1080,
  height = 720,
  viewport = FULL_VIEWPORT,
  explored,
  frontier,
  currentPath,
  paths,
  showExit = true,
  showStart = true,
  exploredColor = DUNGEON_COLORS.explored,
  frontierColor = DUNGEON_COLORS.frontier,
  loopDangerCells,
  label,
  className = "",
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Derive cell size from fixed width/height and viewport
  const vRows = viewport.r1 - viewport.r0;
  const vCols = viewport.c1 - viewport.c0;
  const cellSize = Math.min(width / vCols, height / vRows);
  const canvasWidth = Math.round(cellSize * vCols);
  const canvasHeight = Math.round(cellSize * vRows);

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

    // Snapped cell helpers (same pattern as PathfindingGrid)
    const cx = (c: number) => Math.round((c - viewport.c0) * cellSize);
    const ry = (r: number) => Math.round((r - viewport.r0) * cellSize);
    const fillCell = (r: number, c: number) => {
      const x = cx(c);
      const y = ry(r);
      ctx.fillRect(x, y, cx(c + 1) - cx(c), ry(r + 1) - ry(r));
    };

    // Clear — white background like PathfindingGrid
    ctx.fillStyle = DUNGEON_COLORS.empty;
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    // Explored
    if (explored) {
      ctx.fillStyle = exploredColor;
      for (const k of explored) {
        const { r, c } = parseKeyFast(k);
        if (inView(r, c, viewport)) fillCell(r, c);
      }
    }

    // Frontier
    if (frontier) {
      ctx.fillStyle = frontierColor;
      for (const k of frontier) {
        const { r, c } = parseKeyFast(k);
        if (inView(r, c, viewport)) fillCell(r, c);
      }
    }

    // Loop danger cells
    if (loopDangerCells) {
      ctx.fillStyle = "#FF4444";
      ctx.globalAlpha = 0.5;
      for (const k of loopDangerCells) {
        const { r, c } = parseKeyFast(k);
        if (inView(r, c, viewport)) fillCell(r, c);
      }
      ctx.globalAlpha = 1;
    }

    // Current path being explored
    if (currentPath && currentPath.length > 0) {
      ctx.fillStyle = DUNGEON_COLORS.currentPath;
      for (const p of currentPath) {
        if (inView(p.r, p.c, viewport)) fillCell(p.r, p.c);
      }
      // Current cell (head) in distinct color
      const cur = currentPath[currentPath.length - 1];
      if (inView(cur.r, cur.c, viewport)) {
        ctx.fillStyle = DUNGEON_COLORS.currentCell;
        fillCell(cur.r, cur.c);
      }
    }

    // Path overlays (final paths)
    if (paths) {
      for (const overlay of paths) {
        if (overlay.line && overlay.cells.length > 1) {
          ctx.strokeStyle = overlay.color;
          ctx.lineWidth = overlay.lineWidth ?? 3;
          ctx.lineCap = "round";
          ctx.lineJoin = "round";
          ctx.beginPath();
          const first = overlay.cells[0];
          ctx.moveTo(cx(first.c) + cellSize / 2, ry(first.r) + cellSize / 2);
          for (let i = 1; i < overlay.cells.length; i++) {
            const p = overlay.cells[i];
            ctx.lineTo(cx(p.c) + cellSize / 2, ry(p.r) + cellSize / 2);
          }
          ctx.stroke();
        } else {
          ctx.fillStyle = overlay.color;
          for (const p of overlay.cells) {
            if (inView(p.r, p.c, viewport)) fillCell(p.r, p.c);
          }
        }
      }
    }

    // Walls
    ctx.fillStyle = DUNGEON_COLORS.wall;
    for (let r = viewport.r0; r < viewport.r1; r++) {
      for (let c = viewport.c0; c < viewport.c1; c++) {
        if (WALLS.has(posKey(r, c))) fillCell(r, c);
      }
    }

    // Start
    if (showStart && inView(START.r, START.c, viewport)) {
      ctx.fillStyle = DUNGEON_COLORS.start;
      fillCell(START.r, START.c);
      // "S" label
      ctx.fillStyle = "#FFFFFF";
      ctx.font = `bold ${Math.floor(cellSize * 0.55)}px sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(
        "S",
        cx(START.c) + cellSize / 2,
        ry(START.r) + cellSize / 2 + 1,
      );
    }

    // End / Exit
    if (showExit && inView(EXIT.r, EXIT.c, viewport)) {
      ctx.fillStyle = DUNGEON_COLORS.end;
      fillCell(EXIT.r, EXIT.c);
      // "E" label
      ctx.fillStyle = "#FFFFFF";
      ctx.font = `bold ${Math.floor(cellSize * 0.55)}px sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(
        "E",
        cx(EXIT.c) + cellSize / 2,
        ry(EXIT.r) + cellSize / 2 + 1,
      );
    }

    // Grid lines (snapped to pixel boundaries, same as PathfindingGrid)
    if (cellSize >= 8) {
      ctx.strokeStyle = DUNGEON_COLORS.gridLine;
      ctx.lineWidth = 1;
      for (let r = viewport.r0; r <= viewport.r1; r++) {
        const y = ry(r) + 0.5;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvasWidth, y);
        ctx.stroke();
      }
      for (let c = viewport.c0; c <= viewport.c1; c++) {
        const x = cx(c) + 0.5;
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvasHeight);
        ctx.stroke();
      }
    }

    // Label overlay
    if (label) {
      ctx.fillStyle = "#333";
      ctx.font = `bold ${Math.floor(cellSize * 0.6)}px sans-serif`;
      ctx.textAlign = "left";
      ctx.textBaseline = "top";
      ctx.globalAlpha = 0.6;
      ctx.fillText(label, 8, 8);
      ctx.globalAlpha = 1;
    }
  }, [
    canvasWidth,
    canvasHeight,
    cellSize,
    viewport,
    explored,
    frontier,
    currentPath,
    paths,
    showExit,
    showStart,
    exploredColor,
    frontierColor,
    loopDangerCells,
    label,
  ]);

  return (
    <canvas
      ref={canvasRef}
      className={className}
      style={{ display: "block", margin: "0 auto" }}
    />
  );
};

function parseKeyFast(key: string): { r: number; c: number } {
  const comma = key.indexOf(",");
  return {
    r: parseInt(key.substring(0, comma), 10),
    c: parseInt(key.substring(comma + 1), 10),
  };
}

function inView(r: number, c: number, vp: Viewport): boolean {
  return r >= vp.r0 && r < vp.r1 && c >= vp.c0 && c < vp.c1;
}

export default DungeonRenderer;
