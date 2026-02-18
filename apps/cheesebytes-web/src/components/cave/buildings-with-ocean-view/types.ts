// Types for the Buildings With Ocean View visualization

export const DEFAULT_HEIGHTS = [4, 2, 3, 1];

export interface SeaViewsProps {
  heights?: number[];
  mode?: "static" | "algorithm";
  showControls?: boolean;
  showEditor?: boolean;
  showViews?: boolean;
  autoPlay?: boolean;
  autoPlayDelay?: number;
  width?: number;
  height?: number;
}

export interface PhaserWorldProps {
  heights: number[];
  width: number;
  height: number;
}

export function parseHeights(input: string): number[] {
  return input
    .split(/[\s,]+/)
    .map((v) => Number.parseInt(v.trim(), 10))
    .filter((n) => Number.isFinite(n) && n >= 0 && n <= 9);
}
