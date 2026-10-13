export const DEFAULT_MEMORY_SEED = 42;

/** Stable geometry and soft colours; seeking never consumes random state. */
export function createMemoryShapes(seed: number, count = 356) {
  let state = seed >>> 0;
  const random = () => {
    state += 0x6d2b79f5;
    let value = Math.imul(state ^ (state >>> 15), state | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
  const hues = [5, 207, 125, 35, 175, 265];
  return Array.from({ length: count }, () => {
    const vertices = 4 + Math.floor(random() * 6);
    const points = Array.from({ length: vertices }, (_, index) => {
      const angle =
        ((index + (random() - 0.5) * 0.55) / vertices) * Math.PI * 2;
      const radius = 0.65 + random() * 0.35;
      return `${(Math.cos(angle) * radius).toFixed(4)},${(Math.sin(angle) * radius).toFixed(4)}`;
    }).join(" ");
    const hue = hues[Math.floor(random() * hues.length)] + random() * 24 - 12;
    const saturation = 35 + random() * 22;
    const lightness = 62 + random() * 14;
    return {
      points,
      colour: `hsl(${hue.toFixed(2)} ${saturation.toFixed(2)}% ${lightness.toFixed(2)}%)`,
      rotation: random() * 360,
      scale: 0.85 + random() * 0.3,
    };
  });
}
