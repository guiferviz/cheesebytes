export type GridType = "square" | "triangle" | "hex" | "postcode";
export type PostcodeSubdivisionLevel = 0 | 1 | 2;

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
  canvasWidth?: number;
  canvasHeight?: number;
  postcodeSubdivisionLevel?: PostcodeSubdivisionLevel;
}

export type CellValues = Map<string, number>;
