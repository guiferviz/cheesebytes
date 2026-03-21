import type { Pos, SearchStep } from "./types";
import { posKey, WALLS, MAP_ROWS, MAP_COLS } from "./types";

// Direction priority: Up, Right, Down, Left
// DFS uses this order (push in reverse so pop gives Up first).
const DEFAULT_DIRS: [number, number][] = [
  [-1, 0], // Up
  [0, 1], // Right
  [1, 0], // Down
  [0, -1], // Left
];

export type DirName = "up" | "right" | "down" | "left";

export const DIR_VECTORS: Record<DirName, [number, number]> = {
  up: [-1, 0],
  right: [0, 1],
  down: [1, 0],
  left: [0, -1],
};

export const DIR_ARROWS: Record<DirName, string> = {
  up: "↑",
  right: "→",
  down: "↓",
  left: "←",
};

function neighborsWithDirs(pos: Pos, dirs: [number, number][]): Pos[] {
  const result: Pos[] = [];
  for (const [dr, dc] of dirs) {
    const nr = pos.r + dr;
    const nc = pos.c + dc;
    if (
      nr >= 0 &&
      nr < MAP_ROWS &&
      nc >= 0 &&
      nc < MAP_COLS &&
      !WALLS.has(posKey(nr, nc))
    ) {
      result.push({ r: nr, c: nc });
    }
  }
  return result;
}

function neighbors(pos: Pos): Pos[] {
  return neighborsWithDirs(pos, DEFAULT_DIRS);
}

function reconstructPath(cameFrom: Map<string, string>, endKey: string): Pos[] {
  const path: Pos[] = [];
  let current: string | undefined = endKey;
  while (current !== undefined) {
    const [r, c] = current.split(",").map(Number);
    path.unshift({ r, c });
    current = cameFrom.get(current);
  }
  return path;
}

// ── BFS ──────────────────────────────────────────────────────────────────────

export function* bfs(
  start: Pos,
  end: Pos,
  /** Stop after N steps (0 = unlimited). */
  maxSteps = 0,
): Generator<SearchStep> {
  const startK = posKey(start.r, start.c);
  const endK = posKey(end.r, end.c);
  const explored = new Set<string>();
  const cameFrom = new Map<string, string>();
  let queue: string[] = [startK];
  const inQueue = new Set<string>([startK]);
  let steps = 0;

  while (queue.length > 0) {
    const nextQueue: string[] = [];
    // Live frontier: starts as current layer, shrinks as nodes are processed,
    // grows as new neighbors are discovered.
    const liveFrontier = new Set(queue);

    for (const currentKey of queue) {
      if (explored.has(currentKey)) continue;
      explored.add(currentKey);
      liveFrontier.delete(currentKey);
      steps++;

      if (currentKey === endK) {
        const path = reconstructPath(cameFrom, endK);
        yield {
          explored: new Set(explored),
          frontier: new Set(),
          currentPath: path,
          path,
          memorySize: explored.size + nextQueue.length,
        };
        return;
      }

      const pos = parseKeyLocal(currentKey);
      for (const nb of neighbors(pos)) {
        const nk = posKey(nb.r, nb.c);
        if (!explored.has(nk) && !inQueue.has(nk)) {
          inQueue.add(nk);
          cameFrom.set(nk, currentKey);
          nextQueue.push(nk);
          liveFrontier.add(nk);
        }
      }

      yield {
        explored: new Set(explored),
        frontier: new Set(liveFrontier),
        currentPath: reconstructPath(cameFrom, currentKey),
        path: null,
        memorySize: explored.size + liveFrontier.size,
      };

      if (maxSteps > 0 && steps >= maxSteps) return;
    }

    queue = nextQueue;
  }

  yield {
    explored: new Set(explored),
    frontier: new Set(),
    currentPath: [],
    path: null,
    memorySize: explored.size,
  };
}

// ── DFS ──────────────────────────────────────────────────────────────────────

export function* dfs(
  start: Pos,
  end: Pos,
  maxSteps = 0,
  dirOrder?: DirName[],
): Generator<SearchStep> {
  const dirs = dirOrder ? dirOrder.map((d) => DIR_VECTORS[d]) : DEFAULT_DIRS;
  const startK = posKey(start.r, start.c);
  const endK = posKey(end.r, end.c);
  const explored = new Set<string>();
  const cameFrom = new Map<string, string>();
  // Push neighbors in reverse order so the first direction (Up) is popped first.
  const stack: string[] = [startK];
  let steps = 0;

  while (stack.length > 0) {
    const currentKey = stack.pop()!;
    if (explored.has(currentKey)) continue;
    explored.add(currentKey);
    steps++;

    const curPath = reconstructPath(cameFrom, currentKey);

    if (currentKey === endK) {
      yield {
        explored: new Set(explored),
        frontier: new Set(stack),
        currentPath: curPath,
        path: curPath,
        memorySize: explored.size + stack.length,
      };
      return;
    }

    yield {
      explored: new Set(explored),
      frontier: new Set(stack.slice(-20)),
      currentPath: curPath,
      path: null,
      memorySize: explored.size + stack.length,
    };

    if (maxSteps > 0 && steps >= maxSteps) return;

    const pos = parseKeyLocal(currentKey);
    const nbs = neighborsWithDirs(pos, dirs);
    // Push in reverse so the first direction is popped first.
    for (let i = nbs.length - 1; i >= 0; i--) {
      const nk = posKey(nbs[i].r, nbs[i].c);
      if (!explored.has(nk)) {
        cameFrom.set(nk, currentKey);
        stack.push(nk);
      }
    }
  }

  yield {
    explored: new Set(explored),
    frontier: new Set(),
    currentPath: [],
    path: null,
    memorySize: explored.size,
  };
}

function parseKeyLocal(key: string): Pos {
  const [r, c] = key.split(",").map(Number);
  return { r, c };
}

// ── Convenience: run to completion (collect all steps) ──────────────────────

export function collectSteps(gen: Generator<SearchStep>): SearchStep[] {
  const steps: SearchStep[] = [];
  for (const step of gen) {
    steps.push(step);
  }
  return steps;
}
