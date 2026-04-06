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

// ── Store ────────────────────────────────────────────────────────

let currentMapState: GreedyMineMapState = parseRawMap(mediumMap);
let currentGrid: string[] = mediumMap;
let currentPython: string = toPython(mediumMap);

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

/** Called by the map editor when the user changes the map. */
export function setArticleMap(rawLines: string[]): void {
  currentGrid = rawLines;
  currentMapState = parseRawMap(rawLines);
  currentPython = toPython(rawLines);
  emit();
}

/** The initial / default map strings. */
export const ARTICLE_MAP = mediumMap;
