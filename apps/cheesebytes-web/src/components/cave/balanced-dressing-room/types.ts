// Types for the Balanced Dressing Room animation

export type GarmentType = "T" | "S" | "J"; // T-shirt, Sweater, Jacket

export type ActionType = "PUT" | "TAKE_OFF";

export interface Action {
  type: ActionType;
  garment: GarmentType;
  color?: string;
}

export interface GarmentItem {
  id: string;
  type: GarmentType;
  color: string;
}

export type DisplayMode = "counter" | "stack" | "both";

export interface ProbadorConfig {
  actions: Action[];
  displayMode: DisplayMode;
  showTypeCounters?: boolean;
  autoPlay?: boolean;
  autoPlayDelay?: number;
  showParentheses?: boolean; // For the final reveal
}

// Color palettes for each garment type
export const GARMENT_COLORS: Record<GarmentType, string[]> = {
  T: ["#86efac", "#fde047", "#93c5fd", "#f9a8d4", "#fdba74"], // Green, Yellow, Blue, Pink, Orange
  S: ["#c4b5fd", "#a5f3fc", "#fca5a5", "#d9f99d", "#e9d5ff"], // Purple, Cyan, Red, Lime, Lavender
  J: ["#fed7aa", "#99f6e4", "#fecaca", "#bfdbfe", "#fbcfe8"], // Peach, Teal, Salmon, Sky, Rose
};

// Labels that can morph to parentheses
export const GARMENT_SYMBOLS: Record<
  GarmentType,
  { label: string; open: string; close: string }
> = {
  T: { label: "T", open: "(", close: ")" },
  S: { label: "S", open: "[", close: "]" },
  J: { label: "J", open: "{", close: "}" },
};

export const GARMENT_NAMES: Record<GarmentType, string> = {
  T: "T-Shirt",
  S: "Sweater",
  J: "Jacket",
};
