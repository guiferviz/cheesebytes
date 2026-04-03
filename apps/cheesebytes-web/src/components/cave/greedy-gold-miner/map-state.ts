import { useSyncExternalStore } from "react";
import {
  EXIT as DEFAULT_EXIT,
  MAP_COLS,
  MAP_ROWS,
  posKey,
  START as DEFAULT_START,
  WALLS as DEFAULT_WALLS,
} from "../dungeon-escape/types";

export interface GreedyMapPos {
  r: number;
  c: number;
}

export interface GreedyMineMapState {
  rows: number;
  cols: number;
  walls: Set<string>;
  start: GreedyMapPos;
  exit: GreedyMapPos;
  version: number;
}

function cloneState(state: GreedyMineMapState): GreedyMineMapState {
  return {
    rows: state.rows,
    cols: state.cols,
    walls: new Set(state.walls),
    start: { ...state.start },
    exit: { ...state.exit },
    version: state.version,
  };
}

function createDefaultState(): GreedyMineMapState {
  return {
    rows: MAP_ROWS,
    cols: MAP_COLS,
    walls: new Set(DEFAULT_WALLS),
    start: { ...DEFAULT_START },
    exit: { ...DEFAULT_EXIT },
    version: 0,
  };
}

let currentState: GreedyMineMapState = createDefaultState();
const listeners = new Set<() => void>();

function emitChange() {
  listeners.forEach((listener) => listener());
}

export function subscribeGreedyMineMap(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getGreedyMineMapSnapshot(): GreedyMineMapState {
  return currentState;
}

export function useGreedyMineMap(): GreedyMineMapState {
  return useSyncExternalStore(subscribeGreedyMineMap, getGreedyMineMapSnapshot);
}

export function updateGreedyMineMap(
  updater: (state: GreedyMineMapState) => GreedyMineMapState,
) {
  const next = updater(cloneState(currentState));
  currentState = {
    ...next,
    walls: new Set(next.walls),
    start: { ...next.start },
    exit: { ...next.exit },
    version: currentState.version + 1,
  };
  emitChange();
}

export function resetGreedyMineMap() {
  currentState = createDefaultState();
  emitChange();
}

export function buildGridFromGreedyMap(map: GreedyMineMapState): string[] {
  const grid: string[] = [];
  for (let r = 0; r < map.rows; r += 1) {
    let row = "";
    for (let c = 0; c < map.cols; c += 1) {
      if (r === map.start.r && c === map.start.c) row += "S";
      else if (r === map.exit.r && c === map.exit.c) row += "E";
      else if (map.walls.has(posKey(r, c))) row += "#";
      else row += ".";
    }
    grid.push(row);
  }
  return grid;
}

export function isGreedyMapWall(
  map: GreedyMineMapState,
  r: number,
  c: number,
): boolean {
  if (r < 0 || r >= map.rows || c < 0 || c >= map.cols) return true;
  return map.walls.has(posKey(r, c));
}
