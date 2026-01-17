/**
 * Sprite Sheet: 4 columns × 2 rows, 128x128 pixels each
 *
 * Row 0: [ground-left] [ground] [ground-right] [block-gray]
 * Row 1: [water-full] [water-surface-1] [water-surface-2] [block-brown]
 */

export const SPRITE_SIZE = 128;
export const DEFAULT_SPRITE_SHEET = "/cave/trapping-rain-water/sprites.png";

export const SPRITE_SHEET_COLS = 4;

// Indices (0-based, row-major)
export const SPRITES = {
  GROUND_LEFT: 0,
  GROUND: 1,
  GROUND_RIGHT: 2,
  BLOCK_GRAY: 3,
  WATER_FULL: 4,
  WATER_SURFACE_1: 5,
  WATER_SURFACE_2: 6,
  BLOCK_BROWN: 7,
} as const;

export type SpriteKey = keyof typeof SPRITES;

// Water animation frames
export const WATER_SURFACE_FRAMES = [
  SPRITES.WATER_SURFACE_1,
  SPRITES.WATER_SURFACE_2,
] as const;
