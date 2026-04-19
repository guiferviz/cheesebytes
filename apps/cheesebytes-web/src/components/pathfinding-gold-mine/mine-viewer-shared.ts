/**
 * mine-viewer-shared.ts
 *
 * Visual constants and tilemap helpers shared by all Phaser-based mine
 * viewers across the pathfinding series.
 */
import type { MineMapState } from "./types";
import { posKey } from "./types";

// ── Atlas & tile constants ──────────────────────────────────────────────────

export const ATLAS_SRC = "/tiles/terrain_atlas.png";
export const TS = 32;
const ATLAS_COLS = 32;
export const GRID_LINE_COLOR = "rgba(255,255,255,0.18)";
export const GRID_HOVER_FILL = "rgba(246, 189, 96, 0.18)";
export const GRID_HOVER_OUTLINE = "inset 0 0 0 2px rgba(246,189,96,0.5)";

export const GOLD_SPECKS = [
  { dx: -7, dy: -4, radius: 2.1, color: 0xffd166, alpha: 0.95 },
  { dx: 5, dy: 6, radius: 1.8, color: 0xf4a261, alpha: 0.85 },
  { dx: 1, dy: -8, radius: 1.5, color: 0xffe29a, alpha: 0.9 },
] as const;

// ── Wall helpers ────────────────────────────────────────────────────────────

function isWall(mapState: MineMapState, r: number, c: number): boolean {
  if (r < 0 || r >= mapState.rows || c < 0 || c >= mapState.cols) return true;
  return mapState.walls.has(posKey(r, c));
}

// ── Auto-tile index computation ─────────────────────────────────────────────

function tileIndex(row: number, col: number): number {
  return row * ATLAS_COLS + col;
}

function tileTL(m: MineMapState, r: number, c: number): number {
  const wN = isWall(m, r - 1, c);
  const wW = isWall(m, r, c - 1);
  if (wN && wW) return tileIndex(2, 18);
  if (wN) return tileIndex(2, 19);
  if (wW) return tileIndex(3, 18);
  if (isWall(m, r - 1, c - 1)) return tileIndex(1, 20);
  return tileIndex(3, 19);
}

function tileTR(m: MineMapState, r: number, c: number): number {
  const wN = isWall(m, r - 1, c);
  const wE = isWall(m, r, c + 1);
  if (wN && wE) return tileIndex(2, 20);
  if (wN) return tileIndex(2, 19);
  if (wE) return tileIndex(3, 20);
  if (isWall(m, r - 1, c + 1)) return tileIndex(1, 19);
  return tileIndex(3, 19);
}

function tileBL(m: MineMapState, r: number, c: number): number {
  const wS = isWall(m, r + 1, c);
  const wW = isWall(m, r, c - 1);
  if (wS && wW) return tileIndex(4, 18);
  if (wS) return tileIndex(4, 19);
  if (wW) return tileIndex(3, 18);
  if (isWall(m, r + 1, c - 1)) return tileIndex(0, 20);
  return tileIndex(3, 19);
}

function tileBR(m: MineMapState, r: number, c: number): number {
  const wS = isWall(m, r + 1, c);
  const wE = isWall(m, r, c + 1);
  if (wS && wE) return tileIndex(4, 20);
  if (wS) return tileIndex(4, 19);
  if (wE) return tileIndex(3, 20);
  if (isWall(m, r + 1, c + 1)) return tileIndex(0, 19);
  return tileIndex(3, 19);
}

export function buildTilemapData(mapState: MineMapState): number[][] {
  const data: number[][] = [];
  for (let r = 0; r < mapState.rows; r += 1) {
    const topRow: number[] = [];
    const bottomRow: number[] = [];
    for (let c = 0; c < mapState.cols; c += 1) {
      if (mapState.walls.has(posKey(r, c))) {
        topRow.push(-1, -1);
        bottomRow.push(-1, -1);
      } else {
        topRow.push(tileTL(mapState, r, c), tileTR(mapState, r, c));
        bottomRow.push(tileBL(mapState, r, c), tileBR(mapState, r, c));
      }
    }
    data.push(topRow);
    data.push(bottomRow);
  }
  return data;
}

// ── Pixel helpers ───────────────────────────────────────────────────────────

export function cellCenterX(c: number): number {
  return c * 2 * TS + TS;
}

export function cellCenterY(r: number): number {
  return r * 2 * TS + TS;
}
