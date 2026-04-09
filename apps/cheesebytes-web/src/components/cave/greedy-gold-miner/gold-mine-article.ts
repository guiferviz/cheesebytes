/**
 * gold-mine-article.ts
 *
 * Lightweight module-level store for the map used across the article.
 * The map editor publishes changes here; downstream components (neighbors,
 * DFS, …) subscribe via `useArticleMap()`.
 *
 * Works across Astro islands because it's a plain module singleton —
 * not React context.
 */
import { useSyncExternalStore } from "react";
import { parseRawMap } from "./gold-mine-viewer-shared";
import type { GreedyMineMapState } from "./gold-mine-viewer-shared";
import { mediumMap } from "./maps";

export const DEFAULT_MARKERS_PYTHON = `type Cell = tuple[int, int]

def find_marker(grid: list[str], marker: str) -> Cell:
    for r, row in enumerate(grid):
        for c, ch in enumerate(row):
            if ch == marker:
                return (r, c)
    raise ValueError(f"marker {marker!r} not found")

START = find_marker(MINE_MAP, "S")
END = find_marker(MINE_MAP, "E")`;

export const DEFAULT_NEIGHBORS_PYTHON = `type Move = tuple[int, int]

UP: Move = (-1, 0)
RIGHT: Move = (0, 1)
DOWN: Move = (1, 0)
LEFT: Move = (0, -1)
MOVES: list[Move] = [RIGHT, UP, DOWN, LEFT]

def neighbors(grid: list[str], cell: Cell):
    r, c = cell
    for dr, dc in MOVES:
        nr, nc = r + dr, c + dc
        if grid[nr][nc] != '#':
            yield (nr, nc)`;

// ── Store ────────────────────────────────────────────────────────

let currentMapState: GreedyMineMapState = parseRawMap(mediumMap);
let currentGrid: string[] = mediumMap;
let currentPython: string = toPython(mediumMap);
let currentMarkersPython: string = DEFAULT_MARKERS_PYTHON;
let currentNeighborsPython: string = DEFAULT_NEIGHBORS_PYTHON;

const listeners = new Set<() => void>();
function emit() {
  listeners.forEach((l) => l());
}

function toPython(lines: string[]): string {
  return `MINE_MAP = [\n${lines.map((l) => `    "${l}",`).join("\n")}\n]`;
}

// ── Public API ───────────────────────────────────────────────────

/** React hook — subscribe to the current article map state. */
export function useArticleMap(): GreedyMineMapState {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => currentMapState,
  );
}

/** Current grid as string[] (readable without React). */
export function getArticleGrid(): string[] {
  return currentGrid;
}

/** Current Python MINE_MAP source (readable without React). */
export function getArticleMapPython(): string {
  return currentPython;
}

/** Current shared Python neighbors() definition. */
export function getArticleNeighborsPython(): string {
  return currentNeighborsPython;
}

/** Current shared Python Cell/find_markers/START/END definition. */
export function getArticleMarkersPython(): string {
  return currentMarkersPython;
}

/** Called by the markers visual when the user edits the shared code. */
export function setArticleMarkersPython(code: string): void {
  currentMarkersPython = code;
  emit();
}

/** Called by the neighbors visual when the user edits the function. */
export function setArticleNeighborsPython(code: string): void {
  currentNeighborsPython = code;
  emit();
}

/** Called by the map editor when the user changes the map. */
export function setArticleMap(rawLines: string[]): void {
  currentGrid = rawLines;
  currentMapState = parseRawMap(rawLines);
  currentPython = toPython(rawLines);
  emit();
}

/** The initial / default map strings. */
export const ARTICLE_MAP = mediumMap;
