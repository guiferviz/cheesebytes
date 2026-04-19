/**
 * article-store.ts
 *
 * Lightweight module-level store for the map used across an article.
 * The map editor publishes changes here; downstream components subscribe
 * via useArticleMap().
 *
 * Works across Astro islands because it's a plain module singleton —
 * not React context.
 */
import { useSyncExternalStore } from "react";
import { parseRawMap } from "./parse-map";
import { toPythonCode } from "./parse-map";
import type { MineMapState } from "./types";
import { mediumMap } from "./maps";

// ── Store ────────────────────────────────────────────────────────

let currentMapState: MineMapState = parseRawMap(mediumMap);
let currentGrid: string[] = mediumMap;
let currentPython: string = toPythonCode(mediumMap);

const listeners = new Set<() => void>();
function emit() {
  listeners.forEach((l) => l());
}

// ── Public API ───────────────────────────────────────────────────

export function useArticleMap(): MineMapState {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => currentMapState,
  );
}

export function useArticleGrid(): string[] {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => currentGrid,
  );
}

export function getArticleGrid(): string[] {
  return currentGrid;
}

export function getArticleMapPython(): string {
  return currentPython;
}

export function setArticleMap(rawLines: string[]): void {
  currentGrid = rawLines;
  currentMapState = parseRawMap(rawLines);
  currentPython = toPythonCode(rawLines);
  emit();
}

export const ARTICLE_DEFAULT_MAP = mediumMap;
