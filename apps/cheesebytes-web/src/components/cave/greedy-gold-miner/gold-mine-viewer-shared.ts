import type { Pos } from "../dungeon-escape/types";
import { posKey } from "../dungeon-escape/types";
import type { GreedyMineMapState } from "./map-state";

export const ATLAS_SRC = "/tiles/terrain_atlas.png";
export const TS = 32;
const ATLAS_COLS = 32;

function isWall(mapState: GreedyMineMapState, r: number, c: number): boolean {
  if (r < 0 || r >= mapState.rows || c < 0 || c >= mapState.cols) return true;
  return mapState.walls.has(posKey(r, c));
}

function tileIndex(row: number, col: number): number {
  return row * ATLAS_COLS + col;
}

function tileTL(mapState: GreedyMineMapState, r: number, c: number): number {
  const wN = isWall(mapState, r - 1, c);
  const wW = isWall(mapState, r, c - 1);
  if (wN && wW) return tileIndex(2, 18);
  if (wN) return tileIndex(2, 19);
  if (wW) return tileIndex(3, 18);
  if (isWall(mapState, r - 1, c - 1)) return tileIndex(1, 20);
  return tileIndex(3, 19);
}

function tileTR(mapState: GreedyMineMapState, r: number, c: number): number {
  const wN = isWall(mapState, r - 1, c);
  const wE = isWall(mapState, r, c + 1);
  if (wN && wE) return tileIndex(2, 20);
  if (wN) return tileIndex(2, 19);
  if (wE) return tileIndex(3, 20);
  if (isWall(mapState, r - 1, c + 1)) return tileIndex(1, 19);
  return tileIndex(3, 19);
}

function tileBL(mapState: GreedyMineMapState, r: number, c: number): number {
  const wS = isWall(mapState, r + 1, c);
  const wW = isWall(mapState, r, c - 1);
  if (wS && wW) return tileIndex(4, 18);
  if (wS) return tileIndex(4, 19);
  if (wW) return tileIndex(3, 18);
  if (isWall(mapState, r + 1, c - 1)) return tileIndex(0, 20);
  return tileIndex(3, 19);
}

function tileBR(mapState: GreedyMineMapState, r: number, c: number): number {
  const wS = isWall(mapState, r + 1, c);
  const wE = isWall(mapState, r, c + 1);
  if (wS && wE) return tileIndex(4, 20);
  if (wS) return tileIndex(4, 19);
  if (wE) return tileIndex(3, 20);
  if (isWall(mapState, r + 1, c + 1)) return tileIndex(0, 19);
  return tileIndex(3, 19);
}

export function buildTilemapData(mapState: GreedyMineMapState): number[][] {
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

export function cellCenterX(c: number): number {
  return c * 2 * TS + TS;
}

export function cellCenterY(r: number): number {
  return r * 2 * TS + TS;
}

function comparePaths(a: Pos[], b: Pos[]): number {
  if (a.length !== b.length) return a.length - b.length;
  for (let i = 0; i < Math.min(a.length, b.length); i += 1) {
    if (a[i].r !== b[i].r) return a[i].r - b[i].r;
    if (a[i].c !== b[i].c) return a[i].c - b[i].c;
  }
  return 0;
}

export function enumerateEscapePaths(mapState: GreedyMineMapState): Pos[][] {
  const paths: Pos[][] = [];
  const visited = new Set<string>();
  const directions: Array<[number, number]> = [
    [0, 1],
    [-1, 0],
    [1, 0],
    [0, -1],
  ];

  const walk = (path: Pos[]) => {
    const current = path[path.length - 1];
    const currentKey = posKey(current.r, current.c);
    if (current.r === mapState.exit.r && current.c === mapState.exit.c) {
      paths.push(path.map((cell) => ({ ...cell })));
      return;
    }

    visited.add(currentKey);
    for (const [dr, dc] of directions) {
      const next = { r: current.r + dr, c: current.c + dc };
      const nextKey = posKey(next.r, next.c);
      if (isWall(mapState, next.r, next.c) || visited.has(nextKey)) continue;
      path.push(next);
      walk(path);
      path.pop();
    }
    visited.delete(currentKey);
  };

  walk([{ ...mapState.start }]);
  return paths.sort(comparePaths);
}
