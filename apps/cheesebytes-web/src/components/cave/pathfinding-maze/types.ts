export type CellType = "empty" | "wall" | "start" | "end";

export type AlgorithmType = "bfs" | "dfs" | "astar" | "idastar";

export interface Cell {
  row: number;
  col: number;
}

export interface SearchStep {
  /** Cells explored so far (cumulative). */
  explored: Set<string>;
  /** Current frontier cells. */
  frontier: Set<string>;
  /** Path from start to end (only on final step). */
  path: Cell[] | null;
  /** Current best path being considered (start → current node). */
  currentPath?: Cell[];
}

export const ALGORITHM_LABELS: Record<AlgorithmType, string> = {
  bfs: "BFS (Breadth-First)",
  dfs: "DFS (Depth-First)",
  astar: "A* (Manhattan)",
  idastar: "IDA* (Iterative Deepening)",
};

export const CELL_COLORS = {
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

export function cellKey(r: number, c: number): string {
  return `${r},${c}`;
}

export function parseKey(key: string): Cell {
  const [r, c] = key.split(",").map(Number);
  return { row: r, col: c };
}
