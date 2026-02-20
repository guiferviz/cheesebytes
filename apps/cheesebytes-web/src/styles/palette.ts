/**
 * CheesBytes brand color palette.
 *
 * These colors are extracted from the pixel-art cheese logo.
 * Use these everywhere you need brand colors so the whole
 * presentation stays visually consistent.
 */

/** CSS hex strings — use in CSS, canvas fillStyle, Tailwind arbitrary values, etc. */
export const CB = {
  white: "#fefefe",
  yellow: "#fce501",
  lightYellow: "#fcf870",
  orange: "#feab02",
  redOrange: "#fe7601",
  darkOrange: "#d24805",
  brown: "#933209",
  black: "#000000",
} as const;

/**
 * Same colors as Phaser-compatible 0xRRGGBB integers.
 * Use these with Phaser's `fillStyle`, `lineStyle`, etc.
 */
export const CB_HEX = {
  white: 0xfefefe,
  yellow: 0xfce501,
  lightYellow: 0xfcf870,
  orange: 0xfeab02,
  redOrange: 0xfe7601,
  darkOrange: 0xd24805,
  brown: 0x933209,
  black: 0x000000,
} as const;

/** Ordered array of the logo's six main colors (handy for random picks). */
export const CB_PALETTE: string[] = [
  CB.yellow,
  CB.orange,
  CB.brown,
  CB.redOrange,
  CB.lightYellow,
  CB.darkOrange,
];
