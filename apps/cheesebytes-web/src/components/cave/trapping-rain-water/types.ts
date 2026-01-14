// Types for the Trapping Rain Water animation

export interface TerrainConfig {
  heights: number[];
  blockWidth?: number;
  blockHeight?: number;
  gap?: number;
}

export type PointerSide = "L" | "R";

export interface PointerState {
  left: number;
  right: number;
  leftMax: number;
  rightMax: number;
  waterTotal: number;
  waterPerColumn: number[];
  activeSide: PointerSide | null;
}

export type AnimationStep =
  | { type: "INIT" }
  | { type: "MOVE_POINTER"; side: PointerSide; to: number }
  | { type: "UPDATE_MAX"; side: PointerSide; value: number }
  | { type: "FILL_WATER"; column: number; amount: number }
  | { type: "HIGHLIGHT_COLUMN"; column: number }
  | { type: "SHOW_RESULT" };

export interface StepLog {
  step: number;
  description: string;
  waterAdded?: number;
}

// Color palette
export const COLORS = {
  block: {
    fill: "#8b7355",
    stroke: "#5c4d3d",
    highlight: "#a89070",
  },
  water: {
    fill: "#60a5fa",
    fillLight: "#93c5fd",
    stroke: "#3b82f6",
  },
  pointer: {
    left: "#22c55e",
    right: "#f59e0b",
  },
  sky: {
    top: "#f0f9ff",
    bottom: "#bae6fd",
  },
  mountain: {
    far: "#cbd5e1",
    near: "#94a3b8",
  },
};

// Default terrain for demos
export const DEFAULT_HEIGHTS = [0, 1, 0, 2, 1, 0, 1, 3, 2, 1, 2, 1];
