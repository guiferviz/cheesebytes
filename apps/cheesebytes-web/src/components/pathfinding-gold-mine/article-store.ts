/**
 * article-store.ts
 *
 * Lightweight module-level store shared across the visuals of one
 * "Pathfinding in the Gold Mine" article page.
 *
 * Stores the current map plus the small Python snippets that downstream
 * visuals build on (find_marker / START / END, and neighbors). When a
 * visual edits any of these, every other visual on the page picks up
 * the change automatically.
 *
 * Works across Astro islands because it's a plain module singleton —
 * not React context.
 */
import { useSyncExternalStore } from "react";
import {
  fromPythonCode,
  parseRawMap,
  toPythonCode,
  validateRawMap,
} from "./parse-map";
import type { MineMapState } from "./types";
import { mediumMap } from "./maps";

export interface ArticleDefaults {
  map: string[];
  markersPython: string;
  neighborsPython?: string;
}

// ── Default Python snippets (kept in sync with the markdown notes) ──

export const DEFAULT_MARKERS_PYTHON = `type Cell = tuple[int, int]

def find_marker(
    grid: list[str], marker: str
) -> Cell:
    for r, row in enumerate(grid):
        for c, ch in enumerate(row):
            if ch == marker:
                return (r, c)
    raise ValueError(
        f"marker {marker!r} not found"
    )

START = find_marker(MINE_MAP, "S")
END = find_marker(MINE_MAP, "E")`;

export const MONSTER_MARKERS_PYTHON = `type Cell = tuple[int, int]

def find_marker(
  grid: list[str], marker: str
) -> Cell:
  for r, row in enumerate(grid):
    for c, ch in enumerate(row):
      if ch == marker:
        return (r, c)
  raise ValueError(
    f"marker {marker!r} not found"
  )

START = find_marker(MINE_MAP, "S")
END = find_marker(MINE_MAP, "E")
MONSTER_START = find_marker(MINE_MAP, "M")`;

export const DEFAULT_NEIGHBORS_PYTHON = `type Move = tuple[int, int]

UP: Move    = (-1,  0)
RIGHT: Move = ( 0,  1)
DOWN: Move  = ( 1,  0)
LEFT: Move  = ( 0, -1)
MOVES: list[Move] = [RIGHT, UP, DOWN, LEFT]

def neighbors(grid: list[str], cell: Cell):
    r, c = cell
    for dr, dc in MOVES:
        nr, nc = r + dr, c + dc
        if grid[nr][nc] != '#':
            yield (nr, nc)`;

// ── Store ────────────────────────────────────────────────────────

let currentMapState: MineMapState = parseRawMap(mediumMap);
let currentGrid: string[] = mediumMap;
let currentPython: string = toPythonCode(mediumMap);
let currentMarkersPython: string = DEFAULT_MARKERS_PYTHON;
let currentNeighborsPython: string = DEFAULT_NEIGHBORS_PYTHON;
let currentPreludeOverride: string | null = null;
let currentPreludeGrid: string[] | null = null;
let currentPreludeMapState: MineMapState | null = null;
let currentPreludePython: string | null = null;

const listeners = new Set<() => void>();
function emit() {
  listeners.forEach((l) => l());
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

function clearPreludeDerivedState() {
  currentPreludeGrid = null;
  currentPreludeMapState = null;
  currentPreludePython = null;
}

function applyArticleDefaults({
  map,
  markersPython,
  neighborsPython = DEFAULT_NEIGHBORS_PYTHON,
}: ArticleDefaults) {
  currentGrid = map;
  currentMapState = parseRawMap(map);
  currentPython = toPythonCode(map);
  currentMarkersPython = markersPython;
  currentNeighborsPython = neighborsPython;
  currentPreludeOverride = null;
  clearPreludeDerivedState();
}

function syncPreludeDerivedState() {
  if (currentPreludeOverride == null) {
    clearPreludeDerivedState();
    return;
  }

  const grid = fromPythonCode(currentPreludeOverride);
  if (!grid) return;

  if (validateRawMap(grid) !== null) return;

  currentPreludeGrid = grid;
  currentPreludeMapState = parseRawMap(grid);
  currentPreludePython = toPythonCode(grid);
}

// ── Map ──────────────────────────────────────────────────────────

export function useArticleMap(): MineMapState {
  return useSyncExternalStore(
    subscribe,
    () => currentPreludeMapState ?? currentMapState,
  );
}

export function useArticleGrid(): string[] {
  return useSyncExternalStore(
    subscribe,
    () => currentPreludeGrid ?? currentGrid,
  );
}

export function getArticleGrid(): string[] {
  return currentPreludeGrid ?? currentGrid;
}

export function getArticleMapPython(): string {
  return currentPreludePython ?? currentPython;
}

export function setArticleMap(rawLines: string[]): void {
  currentGrid = rawLines;
  currentMapState = parseRawMap(rawLines);
  currentPython = toPythonCode(rawLines);
  currentPreludeOverride = null;
  clearPreludeDerivedState();
  emit();
}

// ── Markers (Cell type alias + START / END constants) ────────────

export function useArticleMarkersPython(): string {
  return useSyncExternalStore(subscribe, () => currentMarkersPython);
}

export function getArticleMarkersPython(): string {
  return currentMarkersPython;
}

export function setArticleMarkersPython(code: string): void {
  currentMarkersPython = code;
  currentPreludeOverride = null;
  clearPreludeDerivedState();
  emit();
}

// ── Neighbors (MOVES + neighbors() generator) ────────────────────

export function useArticleNeighborsPython(): string {
  return useSyncExternalStore(subscribe, () => currentNeighborsPython);
}

export function getArticleNeighborsPython(): string {
  return currentNeighborsPython;
}

export function setArticleNeighborsPython(code: string): void {
  currentNeighborsPython = code;
  // Editing any of the three pieces invalidates the unified prelude
  // override — we go back to the auto-concatenated default.
  currentPreludeOverride = null;
  clearPreludeDerivedState();
  emit();
}

// ── Unified prelude (map + markers + neighbors as one editable blob) ──
//
// Some articles expose the shared setup as one collapsible editable Python
// block. The raw override is what Python replays consume verbatim. At the same
// time, we derive the latest valid MINE_MAP from that override so the game and
// all map-based visuals on the page update live while the user edits.

function defaultPrelude(): string {
  return [currentPython, currentMarkersPython, currentNeighborsPython].join(
    "\n\n",
  );
}

export function useArticlePrelude(): string {
  return useSyncExternalStore(
    subscribe,
    () => currentPreludeOverride ?? defaultPrelude(),
  );
}

export function getArticlePrelude(): string {
  return currentPreludeOverride ?? defaultPrelude();
}

export function setArticlePrelude(code: string): void {
  currentPreludeOverride = code;
  syncPreludeDerivedState();
  emit();
}

export function resetArticlePrelude(): void {
  currentPreludeOverride = null;
  clearPreludeDerivedState();
  emit();
}

export function configureArticleDefaults(defaults: ArticleDefaults): void {
  applyArticleDefaults(defaults);
  emit();
}

export function resetArticleDefaults(): void {
  applyArticleDefaults({
    map: mediumMap,
    markersPython: DEFAULT_MARKERS_PYTHON,
    neighborsPython: DEFAULT_NEIGHBORS_PYTHON,
  });
  emit();
}

export const ARTICLE_DEFAULT_MAP = mediumMap;
