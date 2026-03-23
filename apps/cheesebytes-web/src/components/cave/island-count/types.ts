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

/** Step emitted by flood-fill generators. */
export interface FloodStep {
  /** Cells visited so far across all islands. */
  visited: Set<string>;
  /** Currently active flood frontier. */
  frontier: Set<string>;
  /** Island index being flooded (0-based). */
  islandIndex: number;
  /** Map from cell key → island index for already-completed islands. */
  islandMap: Map<string, number>;
  /** True when scan is complete. */
  done: boolean;
  /** Current scan cursor position (row, col). */
  cursor: Pos | null;
  /** Cells the scanner has already passed over (water or already-visited land). */
  scanned: Set<string>;
}

export const ISLAND_COLORS = {
  water: "#3b82f6",
  land: "#f59e0b",
  gridLine: "rgba(255,255,255,0.08)",
} as const;

/** Palette for coloring discovered islands. */
export const ISLAND_PALETTE = [
  "#f97316", // orange
  "#10b981", // emerald
  "#8b5cf6", // violet
  "#ec4899", // pink
  "#06b6d4", // cyan
  "#ef4444", // red
  "#84cc16", // lime
  "#a855f7", // purple
  "#14b8a6", // teal
  "#f43f5e", // rose
];

// ── Handcrafted island map ──────────────────────────────────────────────────
// 15 rows × 21 cols. '~' = water, '#' = land.
// 5 distinct islands of various shapes.

const RAW_MAP = [
  "~~~~~~~~~~~~~~~~~~~~~",
  "~###~~~~~~~~~~##~~#~~",
  "~##~~~~~~~~~~~##~~~~~",
  "~#~~~~~~~~~~~~~~~~~~~",
  "~~~~~~~~~~~~~~~~~~~~~",
  "~~~~~~~~####~~~~~~~~~",
  "~~~~~~~~####~~~~~~~~~",
  "~~~~~~~~####~~~~~~~~~",
  "~~~~~~~~~~~~~~~~~~~~~",
  "~~~~~~~~~~~~~~~~~~~~~",
  "~~#~~~~~~~~~~####~~~~",
  "~~##~~~~~~~~~####~~~~",
  "~~##~~~~~~~~~####~~~~",
  "~~~#~~~~~~~~~~~~~~~~~",
  "~~~~~~~~~~~~~~~~~~~~~",
];

export const MAP_ROWS = RAW_MAP.length;
export const MAP_COLS = RAW_MAP[0].length;

export const LAND = new Set<string>();

for (let r = 0; r < MAP_ROWS; r++) {
  for (let c = 0; c < MAP_COLS; c++) {
    if (RAW_MAP[r][c] === "#") LAND.add(posKey(r, c));
  }
}
