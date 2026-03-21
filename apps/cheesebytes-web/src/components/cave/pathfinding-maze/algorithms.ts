import type { Cell, AlgorithmType, SearchStep } from "./types";
import { cellKey } from "./types";

const DIRS: [number, number][] = [
  [-1, 0],
  [1, 0],
  [0, -1],
  [0, 1],
];

function neighbors(
  cell: Cell,
  rows: number,
  cols: number,
  walls: Set<string>,
): Cell[] {
  const result: Cell[] = [];
  for (const [dr, dc] of DIRS) {
    const nr = cell.row + dr;
    const nc = cell.col + dc;
    if (
      nr >= 0 &&
      nr < rows &&
      nc >= 0 &&
      nc < cols &&
      !walls.has(cellKey(nr, nc))
    ) {
      result.push({ row: nr, col: nc });
    }
  }
  return result;
}

function reconstructPath(
  cameFrom: Map<string, string>,
  endKey: string,
): Cell[] {
  const path: Cell[] = [];
  let current: string | undefined = endKey;
  while (current !== undefined) {
    const [r, c] = current.split(",").map(Number);
    path.unshift({ row: r, col: c });
    current = cameFrom.get(current);
  }
  return path;
}

function manhattan(a: Cell, b: Cell): number {
  return Math.abs(a.row - b.row) + Math.abs(a.col - b.col);
}

// ======================
// BFS
// ======================
function* bfs(
  start: Cell,
  end: Cell,
  rows: number,
  cols: number,
  walls: Set<string>,
): Generator<SearchStep> {
  const startK = cellKey(start.row, start.col);
  const endK = cellKey(end.row, end.col);
  const explored = new Set<string>();
  const cameFrom = new Map<string, string>();
  const queue: string[] = [startK];
  const inQueue = new Set<string>([startK]);

  while (queue.length > 0) {
    const frontier = new Set(queue);

    const nextQueue: string[] = [];
    const batchSize = queue.length;

    for (let i = 0; i < batchSize; i++) {
      const currentKey = queue[i];
      if (explored.has(currentKey)) continue;
      explored.add(currentKey);

      if (currentKey === endK) {
        const path = reconstructPath(cameFrom, endK);
        yield { explored: new Set(explored), frontier: new Set(), path };
        return;
      }

      const curPath = reconstructPath(cameFrom, currentKey);
      yield {
        explored: new Set(explored),
        frontier,
        path: null,
        currentPath: curPath,
      };

      const [cr, cc] = currentKey.split(",").map(Number);
      for (const nb of neighbors({ row: cr, col: cc }, rows, cols, walls)) {
        const nk = cellKey(nb.row, nb.col);
        if (!explored.has(nk) && !inQueue.has(nk)) {
          inQueue.add(nk);
          cameFrom.set(nk, currentKey);
          nextQueue.push(nk);
        }
      }
    }

    queue.length = 0;
    queue.push(...nextQueue);
  }

  yield { explored: new Set(explored), frontier: new Set(), path: null };
}

// ======================
// DFS
// ======================
function* dfs(
  start: Cell,
  end: Cell,
  rows: number,
  cols: number,
  walls: Set<string>,
): Generator<SearchStep> {
  const startK = cellKey(start.row, start.col);
  const endK = cellKey(end.row, end.col);
  const explored = new Set<string>();
  const cameFrom = new Map<string, string>();
  const stack: string[] = [startK];

  while (stack.length > 0) {
    const currentKey = stack.pop()!;
    if (explored.has(currentKey)) continue;
    explored.add(currentKey);

    const curPath = reconstructPath(cameFrom, currentKey);
    const frontier = new Set(stack.slice(-Math.min(stack.length, 50)));
    yield {
      explored: new Set(explored),
      frontier,
      path: null,
      currentPath: curPath,
    };

    if (currentKey === endK) {
      const path = reconstructPath(cameFrom, endK);
      yield { explored: new Set(explored), frontier: new Set(), path };
      return;
    }

    const [cr, cc] = currentKey.split(",").map(Number);
    for (const nb of neighbors({ row: cr, col: cc }, rows, cols, walls)) {
      const nk = cellKey(nb.row, nb.col);
      if (!explored.has(nk)) {
        cameFrom.set(nk, currentKey);
        stack.push(nk);
      }
    }
  }

  yield { explored: new Set(explored), frontier: new Set(), path: null };
}

// ======================
// A*
// ======================
function* astar(
  start: Cell,
  end: Cell,
  rows: number,
  cols: number,
  walls: Set<string>,
): Generator<SearchStep> {
  const startK = cellKey(start.row, start.col);
  const endK = cellKey(end.row, end.col);
  const explored = new Set<string>();
  const cameFrom = new Map<string, string>();
  const gScore = new Map<string, number>();
  gScore.set(startK, 0);

  const open: { key: string; f: number }[] = [
    { key: startK, f: manhattan(start, end) },
  ];

  while (open.length > 0) {
    // Pick lowest f
    let bestIdx = 0;
    for (let i = 1; i < open.length; i++) {
      if (open[i].f < open[bestIdx].f) bestIdx = i;
    }
    const current = open[bestIdx];
    open.splice(bestIdx, 1);

    if (explored.has(current.key)) continue;
    explored.add(current.key);

    const curPath = reconstructPath(cameFrom, current.key);

    // Show frontier as non-explored open entries
    const frontierKeys = new Set<string>();
    for (const o of open) {
      if (!explored.has(o.key)) frontierKeys.add(o.key);
    }
    yield {
      explored: new Set(explored),
      frontier: frontierKeys,
      path: null,
      currentPath: curPath,
    };

    if (current.key === endK) {
      const path = reconstructPath(cameFrom, endK);
      yield { explored: new Set(explored), frontier: new Set(), path };
      return;
    }

    const [cr, cc] = current.key.split(",").map(Number);
    const currentG = gScore.get(current.key) ?? Infinity;

    for (const nb of neighbors({ row: cr, col: cc }, rows, cols, walls)) {
      const nk = cellKey(nb.row, nb.col);
      if (explored.has(nk)) continue;

      const tentativeG = currentG + 1;
      if (tentativeG < (gScore.get(nk) ?? Infinity)) {
        cameFrom.set(nk, current.key);
        gScore.set(nk, tentativeG);
        const f = tentativeG + manhattan(nb, end);
        open.push({ key: nk, f });
      }
    }
  }

  yield { explored: new Set(explored), frontier: new Set(), path: null };
}

// ======================
// IDA*
// ======================
function* idastar(
  start: Cell,
  end: Cell,
  rows: number,
  cols: number,
  walls: Set<string>,
): Generator<SearchStep> {
  const startK = cellKey(start.row, start.col);
  const endK = cellKey(end.row, end.col);
  const explored = new Set<string>();
  let bound = manhattan(start, end);

  const pathStack: string[] = [startK];
  const onPath = new Set<string>([startK]);
  let stepCounter = 0;
  const MAX_TOTAL_STEPS = 2_000_000;
  let aborted = false;

  // Transposition table: best g-cost seen for each node in this iteration.
  // If we reach a node with g >= transTable[node], we can prune (we already
  // explored it via a shorter or equal path, so this branch can't improve).
  let transTable = new Map<string, number>();

  function pathToCells(): Cell[] {
    return pathStack.map((k) => {
      const [r, c] = k.split(",").map(Number);
      return { row: r, col: c };
    });
  }

  function* search(
    g: number,
    currentBound: number,
  ): Generator<SearchStep, number, void> {
    if (aborted) return Infinity;

    const currentKey = pathStack[pathStack.length - 1];
    const [cr, cc] = currentKey.split(",").map(Number);
    const f = g + manhattan({ row: cr, col: cc }, end);

    if (f > currentBound) return f;

    // Transposition pruning: skip if we've reached this node at equal or
    // lower cost during this iteration (a shorter path already explored it).
    const prevG = transTable.get(currentKey);
    if (prevG !== undefined && g >= prevG) return Infinity;
    transTable.set(currentKey, g);

    explored.add(currentKey);
    stepCounter++;

    if (stepCounter > MAX_TOTAL_STEPS) {
      aborted = true;
      return Infinity;
    }

    yield {
      explored: new Set(explored),
      frontier: new Set([currentKey]),
      path: null,
      currentPath: pathToCells(),
    };

    if (currentKey === endK) {
      const result = pathToCells();
      yield { explored: new Set(explored), frontier: new Set(), path: result };
      return -1;
    }

    let min = Infinity;
    for (const nb of neighbors({ row: cr, col: cc }, rows, cols, walls)) {
      const nk = cellKey(nb.row, nb.col);
      if (onPath.has(nk)) continue;

      pathStack.push(nk);
      onPath.add(nk);
      const t = yield* search(g + 1, currentBound);
      if (t === -1) return -1;
      if (aborted) return Infinity;
      if (t < min) min = t;
      pathStack.pop();
      onPath.delete(nk);
    }

    return min;
  }

  for (let iteration = 0; iteration < 200; iteration++) {
    transTable = new Map();
    const t = yield* search(0, bound);
    if (t === -1) return;
    if (t === Infinity || aborted) break;
    bound = t;
    yield {
      explored: new Set(explored),
      frontier: new Set(),
      path: null,
    };
    explored.clear();
  }

  yield { explored: new Set(explored), frontier: new Set(), path: null };
}

// ======================
// Factory
// ======================
export function runAlgorithm(
  algorithm: AlgorithmType,
  start: Cell,
  end: Cell,
  rows: number,
  cols: number,
  walls: Set<string>,
): Generator<SearchStep> {
  switch (algorithm) {
    case "bfs":
      return bfs(start, end, rows, cols, walls);
    case "dfs":
      return dfs(start, end, rows, cols, walls);
    case "astar":
      return astar(start, end, rows, cols, walls);
    case "idastar":
      return idastar(start, end, rows, cols, walls);
  }
}

/** Generate a set of random walls. */
export function generateWalls(
  rows: number,
  cols: number,
  wallPercent: number,
  start: Cell,
  end: Cell,
): Set<string> {
  const walls = new Set<string>();
  const startK = cellKey(start.row, start.col);
  const endK = cellKey(end.row, end.col);

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const k = cellKey(r, c);
      if (k === startK || k === endK) continue;
      if (Math.random() < wallPercent / 100) {
        walls.add(k);
      }
    }
  }
  return walls;
}

// ======================
// Seeded PRNG (mulberry32)
// ======================
function mulberry32(seed: number) {
  let s = seed | 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ======================
// DFS perfect maze generation
// ======================
export function generateMaze(
  rows: number,
  cols: number,
  start: Cell,
  end: Cell,
  seed: number,
  extraOpenPercent = 15,
): Set<string> {
  const rng = mulberry32(seed);

  function shuffle<T>(arr: T[]) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
  }

  // Start with everything as wall
  const walls = new Set<string>();
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      walls.add(cellKey(r, c));
    }
  }

  // Carve passages on odd-indexed interior cells via DFS
  const visited = new Set<string>();
  const stack: Cell[] = [];
  const startR = 1;
  const startC = 1;
  visited.add(cellKey(startR, startC));
  walls.delete(cellKey(startR, startC));
  stack.push({ row: startR, col: startC });

  const directions: [number, number][] = [
    [-2, 0],
    [2, 0],
    [0, -2],
    [0, 2],
  ];

  while (stack.length > 0) {
    const cur = stack[stack.length - 1];
    const nbs: { nr: number; nc: number; wr: number; wc: number }[] = [];

    const shuffled = [...directions];
    shuffle(shuffled);
    for (const [dr, dc] of shuffled) {
      const nr = cur.row + dr;
      const nc = cur.col + dc;
      if (nr > 0 && nr < rows - 1 && nc > 0 && nc < cols - 1) {
        if (!visited.has(cellKey(nr, nc))) {
          nbs.push({ nr, nc, wr: cur.row + dr / 2, wc: cur.col + dc / 2 });
        }
      }
    }

    if (nbs.length === 0) {
      stack.pop();
      continue;
    }

    const { nr, nc, wr, wc } = nbs[0];
    visited.add(cellKey(nr, nc));
    walls.delete(cellKey(wr, wc));
    walls.delete(cellKey(nr, nc));
    stack.push({ row: nr, col: nc });
  }

  // Open extra passages to create multiple routes
  const innerWalls: string[] = [];
  for (let r = 1; r < rows - 1; r++) {
    for (let c = 1; c < cols - 1; c++) {
      const k = cellKey(r, c);
      if (walls.has(k)) {
        const adjFloors = [
          [r - 1, c],
          [r + 1, c],
          [r, c - 1],
          [r, c + 1],
        ].filter(([ar, ac]) => !walls.has(cellKey(ar, ac)));
        if (adjFloors.length >= 2) {
          innerWalls.push(k);
        }
      }
    }
  }
  shuffle(innerWalls);
  const toOpen = Math.floor(innerWalls.length * (extraOpenPercent / 100));
  for (let i = 0; i < toOpen; i++) {
    walls.delete(innerWalls[i]);
  }

  // Ensure start and end cells are open
  walls.delete(cellKey(start.row, start.col));
  walls.delete(cellKey(end.row, end.col));

  return walls;
}
