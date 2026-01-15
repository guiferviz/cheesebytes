/**
 * Sprite Sheet Configuration for Trapping Rain Water
 *
 * Expected sprite sheet layout (each sprite is SPRITE_SIZE x SPRITE_SIZE pixels):
 *
 * Row 0: Terrain blocks
 *   [0,0] - Dirt block (interior)
 *   [1,0] - Dirt block with grass top
 *   [2,0] - Dirt block left edge
 *   [3,0] - Dirt block right edge
 *   [4,0] - Dirt block top (no grass)
 *
 * Row 1: Water blocks
 *   [0,1] - Water block (full)
 *   [1,1] - Water surface (with waves/foam)
 *   [2,1] - Water left edge
 *   [3,1] - Water right edge
 *
 * Row 2: Background/decorative
 *   [0,2] - Sky/empty
 *   [1,2] - Cloud left
 *   [2,2] - Cloud middle
 *   [3,2] - Cloud right
 *   [4,2] - Mountain/hill
 *
 * Row 3: Ground/platform
 *   [0,3] - Ground top with grass
 *   [1,3] - Ground interior
 *   [2,3] - Ground left edge with grass
 *   [3,3] - Ground right edge with grass
 *
 * Row 4: Effects/UI
 *   [0,4] - Rain drop
 *   [1,4] - Splash effect
 *   [2,4] - Pointer arrow left (green)
 *   [3,4] - Pointer arrow right (amber)
 */

export const SPRITE_SIZE = 32; // Each sprite is 32x32 pixels

// Sprite positions in the sheet [column, row]
export const SPRITES = {
  // Terrain
  DIRT: [0, 0] as [number, number],
  DIRT_GRASS_TOP: [1, 0] as [number, number],
  DIRT_LEFT: [2, 0] as [number, number],
  DIRT_RIGHT: [3, 0] as [number, number],
  DIRT_TOP: [4, 0] as [number, number],

  // Water
  WATER_FULL: [0, 1] as [number, number],
  WATER_SURFACE: [1, 1] as [number, number],
  WATER_LEFT: [2, 1] as [number, number],
  WATER_RIGHT: [3, 1] as [number, number],

  // Background
  SKY: [0, 2] as [number, number],
  CLOUD_LEFT: [1, 2] as [number, number],
  CLOUD_MIDDLE: [2, 2] as [number, number],
  CLOUD_RIGHT: [3, 2] as [number, number],
  MOUNTAIN: [4, 2] as [number, number],

  // Ground platform
  GROUND_TOP: [0, 3] as [number, number],
  GROUND_INTERIOR: [1, 3] as [number, number],
  GROUND_LEFT: [2, 3] as [number, number],
  GROUND_RIGHT: [3, 3] as [number, number],

  // Effects
  RAIN_DROP: [0, 4] as [number, number],
  SPLASH: [1, 4] as [number, number],
  POINTER_LEFT: [2, 4] as [number, number],
  POINTER_RIGHT: [3, 4] as [number, number],
} as const;

export type SpriteKey = keyof typeof SPRITES;

// Default sprite sheet path (user should replace with their own)
export const DEFAULT_SPRITE_SHEET = "/sprites/trapping-water-sprites.png";

// Alternative: use a placeholder/fallback sprite sheet with CSS colors
export const FALLBACK_COLORS = {
  DIRT: "#8B4513",
  DIRT_GRASS_TOP: "#228B22",
  WATER: "#4A90D9",
  WATER_SURFACE: "#87CEEB",
  SKY: "#87CEEB",
  GROUND: "#2D5016",
  RAIN: "#ADD8E6",
};

/**
 * Configuration for the sprite world rendering
 */
export interface SpriteWorldConfig {
  /** Path to the sprite sheet image */
  spriteSheet: string;
  /** Size of each sprite in pixels */
  spriteSize: number;
  /** Scale factor for rendering (1 = original size, 2 = double, etc.) */
  scale: number;
  /** Gap between columns in pixels (after scaling) */
  columnGap: number;
  /** Whether to use pixel-perfect rendering (no anti-aliasing) */
  pixelPerfect: boolean;
  /** Show debug grid overlay */
  debugGrid: boolean;
}

export const DEFAULT_CONFIG: SpriteWorldConfig = {
  spriteSheet: DEFAULT_SPRITE_SHEET,
  spriteSize: SPRITE_SIZE,
  scale: 1.5,
  columnGap: 0,
  pixelPerfect: true,
  debugGrid: false,
};

/**
 * Calculate the source rectangle for a sprite in the sheet
 */
export function getSpriteRect(spriteKey: SpriteKey): {
  x: number;
  y: number;
  width: number;
  height: number;
} {
  const [col, row] = SPRITES[spriteKey];
  return {
    x: col * SPRITE_SIZE,
    y: row * SPRITE_SIZE,
    width: SPRITE_SIZE,
    height: SPRITE_SIZE,
  };
}

/**
 * Generate CSS background-position for a sprite
 */
export function getSpriteCSSPosition(
  spriteKey: SpriteKey,
  scale: number = 1
): string {
  const [col, row] = SPRITES[spriteKey];
  return `-${col * SPRITE_SIZE * scale}px -${row * SPRITE_SIZE * scale}px`;
}
