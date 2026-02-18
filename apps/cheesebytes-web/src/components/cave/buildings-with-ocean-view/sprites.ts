/**
 * Sprite definitions for buildings from sprite-building.png
 *
 * The spritesheet is a single column: balcony on top, window in the middle, door at the bottom.
 *   - Balcony: (0, 0)   → 256 × 100
 *   - Window:  (0, 100)  → 256 × 160
 *   - Door:    (0, 260)  → 256 × 252
 */

export const BG_PATH = "/cave/sea-views/beach-backgroud.png";
export const SHEET_PATH = "/cave/sea-views/sprite-building.png";

export const BG_KEY = "sea-views-bg";
export const BUILDINGS_KEY = "sea-views-buildings";

export interface SpriteRegion {
  x: number;
  y: number;
  w: number;
  h: number;
  frame: string;
}

export const SPRITES = {
  balcony: { x: 0, y: 0, w: 256, h: 100, frame: "balcony" } as SpriteRegion,
  window: { x: 0, y: 100, w: 256, h: 160, frame: "window" } as SpriteRegion,
  door: { x: 0, y: 260, w: 256, h: 252, frame: "door" } as SpriteRegion,
};
