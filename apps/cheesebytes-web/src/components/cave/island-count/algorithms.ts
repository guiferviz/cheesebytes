import type { Pos, FloodStep } from "./types";
import { posKey, LAND, MAP_ROWS, MAP_COLS } from "./types";

const DIRS: [number, number][] = [
  [-1, 0],
  [1, 0],
  [0, -1],
  [0, 1],
];

function neighbors(p: Pos, rows: number, cols: number, land: Set<string>): Pos[] {
  const result: Pos[] = [];
  for (const [dr, dc] of DIRS) {
    const nr = p.r + dr;
    const nc = p.c + dc;
    if (nr >= 0 && nr < rows && nc >= 0 && nc < cols && land.has(posKey(nr, nc))) {
      result.push({ r: nr, c: nc });
    }
  }
  return result;
}

/**
 * BFS flood fill that scans left-to-right, top-to-bottom.
 * Yields a FloodStep after each cell visit and each cursor advance.
 */
export function* floodFillBFS(
  land: Set<string>,
  rows: number,
  cols: number,
): Generator<FloodStep> {
  const visited = new Set<string>();
  const islandMap = new Map<string, number>();
  const scanned = new Set<string>();
  let islandIndex = 0;

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const key = posKey(r, c);

      // Yield cursor position
      yield {
        visited: new Set(visited),
        frontier: new Set(),
        islandIndex,
        islandMap: new Map(islandMap),
        done: false,
        cursor: { r, c },
        scanned: new Set(scanned),
      };

      scanned.add(key);

      if (!land.has(key) || visited.has(key)) continue;

      // New island found — BFS flood
      const queue: Pos[] = [{ r, c }];
      visited.add(key);
      islandMap.set(key, islandIndex);

      while (queue.length > 0) {
        const cur = queue.shift()!;
        const frontier = new Set<string>();

        for (const nb of neighbors(cur, rows, cols, land)) {
          const nk = posKey(nb.r, nb.c);
          if (visited.has(nk)) continue;
          visited.add(nk);
          islandMap.set(nk, islandIndex);
          queue.push(nb);
          frontier.add(nk);
        }

        yield {
          visited: new Set(visited),
          frontier,
          islandIndex,
          islandMap: new Map(islandMap),
          done: false,
          cursor: { r, c },
          scanned: new Set(scanned),
        };
      }

      islandIndex++;
    }
  }

  yield {
    visited: new Set(visited),
    frontier: new Set(),
    islandIndex,
    islandMap: new Map(islandMap),
    done: true,
    cursor: null,
    scanned: new Set(scanned),
  };
}

/**
 * DFS flood fill — same scan pattern, but floods each island with DFS.
 */
export function* floodFillDFS(
  land: Set<string>,
  rows: number,
  cols: number,
): Generator<FloodStep> {
  const visited = new Set<string>();
  const islandMap = new Map<string, number>();
  const scanned = new Set<string>();
  let islandIndex = 0;

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const key = posKey(r, c);

      yield {
        visited: new Set(visited),
        frontier: new Set(),
        islandIndex,
        islandMap: new Map(islandMap),
        done: false,
        cursor: { r, c },
        scanned: new Set(scanned),
      };

      scanned.add(key);

      if (!land.has(key) || visited.has(key)) continue;

      // DFS flood
      const stack: Pos[] = [{ r, c }];
      visited.add(key);
      islandMap.set(key, islandIndex);

      while (stack.length > 0) {
        const cur = stack.pop()!;

        for (const nb of neighbors(cur, rows, cols, land)) {
          const nk = posKey(nb.r, nb.c);
          if (visited.has(nk)) continue;
          visited.add(nk);
          islandMap.set(nk, islandIndex);
          stack.push(nb);
        }

        yield {
          visited: new Set(visited),
          frontier: new Set(stack.map((p) => posKey(p.r, p.c))),
          islandIndex,
          islandMap: new Map(islandMap),
          done: false,
          cursor: { r, c },
          scanned: new Set(scanned),
        };
      }

      islandIndex++;
    }
  }

  yield {
    visited: new Set(visited),
    frontier: new Set(),
    islandIndex,
    islandMap: new Map(islandMap),
    done: true,
    cursor: null,
    scanned: new Set(scanned),
  };
}

/** Pre-collect all steps from a generator. */
export function collectSteps(gen: Generator<FloodStep>): FloodStep[] {
  const steps: FloodStep[] = [];
  for (const step of gen) {
    steps.push(step);
  }
  return steps;
}

/** Default map flood fill. */
export function defaultFloodBFS() {
  return floodFillBFS(LAND, MAP_ROWS, MAP_COLS);
}

export function defaultFloodDFS() {
  return floodFillDFS(LAND, MAP_ROWS, MAP_COLS);
}
