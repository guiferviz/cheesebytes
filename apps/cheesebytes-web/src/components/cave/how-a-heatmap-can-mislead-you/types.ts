export type GridType = "square" | "triangle" | "hex" | "postcode";

export interface Point {
  x: number;
  y: number;
}

export interface Origin {
  x: number;
  y: number;
}

export interface HeatmapSettings {
  gridType: GridType;
  cellSize: number;
  orientation: number;
  origin: Origin;
  canvasSize: number;
}

export type CellValues = Map<string, number>;
