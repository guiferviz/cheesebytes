// ── Cell & map types ────────────────────────────────────────────────────────

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

/** Step emitted by a search generator. */
export interface SearchStep {
  explored: Set<string>;
  frontier: Set<string>;
  /** Current active path (DFS) or current layer cells (BFS). */
  currentPath: Pos[];
  /** Final path from start → exit (only on last step). */
  path: Pos[] | null;
  /** Stack size for DFS or queue/frontier size for BFS. */
  memorySize: number;
}

// ── Color palette ───────────────────────────────────────────────────────────

/**
 * Color palette — matches the PathfindingGrid style from pathfinding-maze.
 * Same roles, same values.
 */
export const DUNGEON_COLORS = {
  empty: "#FEFEFE",
  wall: "#383838",
  start: "#4CAF50",
  end: "#F44336",
  explored: "#AED6F1",
  frontier: "#FFD93D",
  path: "#FFA500",
  currentPath: "#82E0AA",
  currentCell: "#E74C3C",
  gridLine: "#E0E0E0",
} as const;

// ── Handcrafted dungeon map ─────────────────────────────────────────────────
// 21 cols × 15 rows.  '#' = wall, '.' = floor, 'S' = start, 'E' = exit.
//
// Design goals:
//  - Clear crossroads near start (row 2, col 3).
//  - Long misleading corridor going UP then RIGHT (DFS trap).
//  - Short route going RIGHT then DOWN to exit.
//  - Enough side passages for BFS frontier to look meaningful.
//  - A small loop region (rows 8-10, cols 7-10) for the visited-nodes scene.

const RAW_MAP = [
  "###############################",
  "#.#.................#.#.......#",
  "#.###.#####.###.###.#.#.##.##.#",
  "#...#...#...#.#.......#.#...#.#",
  "###.#####.###.#########.#.###.#",
  "#.......#...#.....#...........#",
  "#.#####.###.#.###.#.##.####.###",
  "#.....#.....#.#.....#.....#...#",
  "#.#.###.#####.#######.###.###.#",
  "#.#.#...#....S....#...#.#.....#",
  "#.#.#.###.###.###.#.###.#####.#",
  "#.#.........#.#.#.#.......#...#",
  "#.#######.###.#.#.###.#.###.###",
  "#.#.......#.......#...#.......#",
  "#.###.###.#.###.###.###########",
  "#.....#...#...#...#...#...#...#",
  "#######.###.#.###.#.#.#.#...#.#",
  "#.......#...#.#...#.#...#...#.#",
  "#.#########.#.#.###.#######.#.#",
  "#.....#.....#.#.#.......#...#.#",
  "#####.###.#.#.#.#####.#.#.###.#",
  "#.....#...#...#.......#...#.#.#",
  "#.#####.###.#####.#.#######.#.#",
  "#...#...#...#.....#.....#...###",
  "###.#.###.###.#.###.###.#.#.#.#",
  "#...#.#...#...#.#...#.....#.#.#",
  "#.###...###.###.#.###.###.#.#.#",
  "#.....#...#...#.#.#...#...#...#",
  "###.###.#.#####.#.#####.#######",
  "#.......#.......#............E#",
  "###############################",
];

export const MAP_ROWS = RAW_MAP.length;
export const MAP_COLS = RAW_MAP[0].length;

/** Set of wall position keys. */
export const WALLS = new Set<string>();
export let START: Pos = { r: 0, c: 0 };
export let EXIT: Pos = { r: 0, c: 0 };

for (let r = 0; r < MAP_ROWS; r++) {
  for (let c = 0; c < MAP_COLS; c++) {
    const ch = RAW_MAP[r][c];
    if (ch === "#") WALLS.add(posKey(r, c));
    else if (ch === "S") START = { r, c };
    else if (ch === "E") EXIT = { r, c };
  }
}

/** Rectangular viewport for camera zoom. */
export interface Viewport {
  r0: number;
  c0: number;
  r1: number;
  c1: number;
}

/** Full map viewport. */
export const FULL_VIEWPORT: Viewport = {
  r0: 0,
  c0: 0,
  r1: MAP_ROWS,
  c1: MAP_COLS,
};

export const CROSSROADS_MARGIN = 7;
export const CROSSROADS_VIEWPORT: Viewport = {
  r0: Math.max(0, START.r - CROSSROADS_MARGIN),
  c0: Math.max(0, START.c - CROSSROADS_MARGIN),
  r1: Math.min(MAP_ROWS, START.r + CROSSROADS_MARGIN + 1),
  c1: Math.min(MAP_COLS, START.c + CROSSROADS_MARGIN + 1),
};

export const DFS_VIEWPORT: Viewport = {
  r0: Math.max(0, START.r - 5),
  c0: Math.max(0, START.c - 3),
  r1: Math.min(MAP_ROWS, START.r + 2),
  c1: Math.min(MAP_COLS, START.c + 4),
};

/** Loop region viewport (for visited-nodes scene). */
export const LOOP_VIEWPORT: Viewport = {
  r0: 6,
  c0: 5,
  r1: 13,
  c1: 14,
};
