import { useMemo, useSyncExternalStore } from "react";

import { generateUniformStoryPoints } from "./heatmap-core";
import type { Point } from "./types";

export const DEFAULT_HEATMAP_POINT_SEED = 124;
export const DEFAULT_HEATMAP_POINT_COUNT = 40;
export const DEFAULT_HEATMAP_CANVAS_WIDTH = 340;
export const DEFAULT_HEATMAP_CANVAS_HEIGHT = 340;
export const HEATMAP_POINT_COUNT_STEP = 1;
export const HEATMAP_POINT_COUNT_MIN = 10;
export const HEATMAP_POINT_COUNT_MAX = 320;
export const HEATMAP_CANVAS_DIMENSION_STEP = 24;
export const HEATMAP_CANVAS_DIMENSION_MIN = 220;
export const HEATMAP_CANVAS_DIMENSION_MAX = 560;

interface HeatmapPointState {
  seed: number;
  pointCount: number;
  canvasWidth: number;
  canvasHeight: number;
}

let currentPointState: HeatmapPointState = {
  seed: DEFAULT_HEATMAP_POINT_SEED,
  pointCount: DEFAULT_HEATMAP_POINT_COUNT,
  canvasWidth: DEFAULT_HEATMAP_CANVAS_WIDTH,
  canvasHeight: DEFAULT_HEATMAP_CANVAS_HEIGHT,
};

const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((listener) => listener());
}

function normalizePointState(state: HeatmapPointState): HeatmapPointState {
  return {
    seed: Number.isFinite(state.seed)
      ? Math.max(0, Math.trunc(state.seed))
      : DEFAULT_HEATMAP_POINT_SEED,
    pointCount: Math.min(
      HEATMAP_POINT_COUNT_MAX,
      Math.max(HEATMAP_POINT_COUNT_MIN, Math.trunc(state.pointCount)),
    ),
    canvasWidth: Math.min(
      HEATMAP_CANVAS_DIMENSION_MAX,
      Math.max(HEATMAP_CANVAS_DIMENSION_MIN, Math.trunc(state.canvasWidth)),
    ),
    canvasHeight: Math.min(
      HEATMAP_CANVAS_DIMENSION_MAX,
      Math.max(HEATMAP_CANVAS_DIMENSION_MIN, Math.trunc(state.canvasHeight)),
    ),
  };
}

export function getHeatmapPointState(): HeatmapPointState {
  return currentPointState;
}

export function setHeatmapPointState(
  update:
    | Partial<HeatmapPointState>
    | ((current: HeatmapPointState) => Partial<HeatmapPointState>),
) {
  const patch =
    typeof update === "function" ? update(currentPointState) : update;
  const nextState = normalizePointState({
    ...currentPointState,
    ...patch,
  });

  if (
    nextState.seed === currentPointState.seed &&
    nextState.pointCount === currentPointState.pointCount &&
    nextState.canvasWidth === currentPointState.canvasWidth &&
    nextState.canvasHeight === currentPointState.canvasHeight
  ) {
    return;
  }

  currentPointState = nextState;
  emit();
}

export function setHeatmapSeed(seed: number) {
  setHeatmapPointState({ seed });
}

export function incrementHeatmapPointCount(delta: number) {
  setHeatmapPointState((current) => ({
    pointCount: current.pointCount + delta,
  }));
}

export function incrementHeatmapCanvasDimension(
  axis: "canvasWidth" | "canvasHeight",
  delta: number,
) {
  setHeatmapPointState((current) => ({
    [axis]: current[axis] + delta,
  }));
}

export function useHeatmapPointState(): HeatmapPointState {
  return useSyncExternalStore(
    (callback) => {
      listeners.add(callback);
      return () => listeners.delete(callback);
    },
    getHeatmapPointState,
    getHeatmapPointState,
  );
}

export function useHeatmapArticlePoints(padding = 10): Point[] {
  const { seed, pointCount, canvasWidth, canvasHeight } =
    useHeatmapPointState();
  const reservedPoints = useMemo(
    () =>
      generateUniformStoryPoints(
        HEATMAP_POINT_COUNT_MAX,
        canvasWidth,
        seed,
        padding,
        HEATMAP_POINT_COUNT_MAX,
        canvasHeight,
      ),
    [canvasHeight, canvasWidth, padding, seed],
  );

  return useMemo(
    () => reservedPoints.slice(0, pointCount),
    [pointCount, reservedPoints],
  );
}
