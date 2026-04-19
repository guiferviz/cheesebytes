// ── Cell & position types shared across the Gold Mine pathfinding series ─────

export interface Pos {
  r: number;
  c: number;
}

export function posKey(r: number, c: number): string {
  return `${r},${c}`;
}

export function parseKey(key: string): Pos {
  const [r, c] = key.split(",").map(Number);
  return { r, c };
}

// ── Map state ───────────────────────────────────────────────────────────────

export interface MineMapState {
  rows: number;
  cols: number;
  walls: Set<string>;
  start: Pos;
  exit: Pos;
  /** Bump to force re-renders after in-place mutations. */
  version: number;
}

// ── Characters used in raw text maps ────────────────────────────────────────

export const WALL_CHAR = "#";
export const PATH_CHAR = ".";
export const START_CHAR = "S";
export const EXIT_CHAR = "E";
