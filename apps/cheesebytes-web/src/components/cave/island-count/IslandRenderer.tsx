import React, { useRef, useEffect } from "react";
import type { Pos } from "./types";
import { ISLAND_COLORS, ISLAND_PALETTE } from "./types";

export interface IslandRendererProps {
  width?: number;
  height?: number;
  rows: number;
  cols: number;
  land: Set<string>;
  /** Map from cell key → island index (colored). */
  islandMap?: Map<string, number>;
  /** Cells currently being flooded (highlight). */
  frontier?: Set<string>;
  /** Current cell being evaluated by the scanner. */
  cursor?: Pos | null;
  /** Cells the scanner has already passed over. */
  scanned?: Set<string>;
  /** Index of the island currently being flooded (cells of this island stay vivid). */
  activeIslandIndex?: number;
  /** Island count to display. */
  islandCount?: number;
  className?: string;
}

export const IslandRenderer: React.FC<IslandRendererProps> = ({
  width = 1080,
  height = 720,
  rows,
  cols,
  land,
  islandMap,
  frontier,
  cursor,
  scanned,
  activeIslandIndex,
  islandCount,
  className,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const cellW = width / cols;
    const cellH = height / rows;

    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.imageSmoothingEnabled = false;

    const cx = (c: number) => Math.round(c * cellW);
    const ry = (r: number) => Math.round(r * cellH);

    const fillCell = (r: number, c: number) => {
      const x = cx(c);
      const y = ry(r);
      ctx.fillRect(x, y, cx(c + 1) - x, ry(r + 1) - y);
    };

    // Background: water
    ctx.fillStyle = ISLAND_COLORS.water;
    ctx.fillRect(0, 0, width, height);

    // Land cells (unvisited)
    ctx.fillStyle = ISLAND_COLORS.land;
    for (const key of land) {
      if (islandMap?.has(key)) continue;
      const [r, c] = key.split(",").map(Number);
      fillCell(r, c);
    }

    // Visited cells colored by island
    if (islandMap) {
      for (const [key, idx] of islandMap) {
        ctx.fillStyle = ISLAND_PALETTE[idx % ISLAND_PALETTE.length];
        const [r, c] = key.split(",").map(Number);
        fillCell(r, c);
      }
    }

    // Frontier cells (brighter)
    if (frontier) {
      ctx.fillStyle = "rgba(255,255,255,0.45)";
      for (const key of frontier) {
        const [r, c] = key.split(",").map(Number);
        fillCell(r, c);
      }
    }

    // Grid lines
    if (cellW >= 8) {
      ctx.strokeStyle = ISLAND_COLORS.gridLine;
      ctx.lineWidth = 1;
      for (let r = 0; r <= rows; r++) {
        const y = ry(r) + 0.5;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }
      for (let c = 0; c <= cols; c++) {
        const x = cx(c) + 0.5;
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }
    }

    // Scanned cells overlay (darkening on already-checked cells)
    if (scanned && scanned.size > 0) {
      ctx.fillStyle = "rgba(0,0,0,0.25)";
      for (const key of scanned) {
        if (frontier?.has(key)) continue;
        // Skip cells of the island currently being flooded
        if (
          activeIslandIndex !== undefined &&
          islandMap?.has(key) &&
          islandMap.get(key) === activeIslandIndex
        )
          continue;
        const [r, c] = key.split(",").map(Number);
        fillCell(r, c);
      }
    }

    // Current cell highlight (white ring)
    if (cursor) {
      const x = cx(cursor.c);
      const y = ry(cursor.r);
      const w = cx(cursor.c + 1) - x;
      const h = ry(cursor.r + 1) - y;
      ctx.strokeStyle = "#fff";
      ctx.lineWidth = 2.5;
      ctx.strokeRect(x + 1.5, y + 1.5, w - 3, h - 3);
    }

    // Island count overlay
    if (islandCount !== undefined) {
      ctx.fillStyle = "rgba(0,0,0,0.6)";
      ctx.fillRect(width - 120, 10, 110, 36);
      ctx.fillStyle = "#fff";
      ctx.font = "bold 20px system-ui, sans-serif";
      ctx.textAlign = "right";
      ctx.textBaseline = "middle";
      ctx.fillText(`Islands: ${islandCount}`, width - 20, 28);
    }
  }, [
    width,
    height,
    rows,
    cols,
    land,
    islandMap,
    frontier,
    cursor,
    scanned,
    activeIslandIndex,
    islandCount,
  ]);

  return (
    <canvas
      ref={canvasRef}
      className={className}
      style={{ display: "block", borderRadius: 8 }}
    />
  );
};
