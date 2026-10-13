export const DEFAULT_MEMORY_SEED = 42;

/**
 * Simple radial polygons: angular order and gaps below π keep each edge in
 * its own wedge, so edges cannot cross. Local dents and varying inner radii
 * mix mostly full contours, hybrid shapes and softer stars.
 * Stable geometry and soft colours; seeking never consumes random state.
 */
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
    const profile = random();
    const star = profile < 0.2;
    const hybrid = profile >= 0.2 && profile < 0.65;
    const vertices = star
      ? (4 + Math.floor(random() * 4)) * 2
      : hybrid
        ? 6 + Math.floor(random() * 5)
        : 4 + Math.floor(random() * 6);
    const innerRadius = 0.38 + random() * 0.25;
    const dents = new Set<number>();
    if (hybrid) {
      const first = Math.floor(random() * vertices);
      dents.add(first);
      if (random() < 0.5)
        dents.add(
          (first + 2 + Math.floor(random() * (vertices - 3))) % vertices,
        );
    }
    const verticesXY = Array.from({ length: vertices }, (_, index) => {
      const angle =
        ((index + (random() - 0.5) * 0.55) / vertices) * Math.PI * 2;
      const radius = star
        ? index % 2 === 0
          ? 0.85 + random() * 0.15
          : innerRadius + (random() - 0.5) * 0.08
        : dents.has(index)
          ? 0.42 + random() * 0.22
          : 0.78 + random() * 0.22;
      return [Math.cos(angle) * radius, Math.sin(angle) * radius];
    });
    const hue = hues[Math.floor(random() * hues.length)] + random() * 24 - 12;
    const saturation = 35 + random() * 22;
    const lightness = 62 + random() * 14;
    // Normalise the visible extent after rotation, rather than assigning the
    // same nominal radius to shapes with very different bounding boxes.
    const rotation = random() * Math.PI * 2;
    const rotated = verticesXY.map(([x, y]) => [
      x * Math.cos(rotation) - y * Math.sin(rotation),
      x * Math.sin(rotation) + y * Math.cos(rotation),
    ]);
    const xs = rotated.map(([x]) => x),
      ys = rotated.map(([, y]) => y);
    const left = Math.min(...xs),
      right = Math.max(...xs);
    const top = Math.min(...ys),
      bottom = Math.max(...ys);
    const extent = Math.max(right - left, bottom - top);
    const points = rotated
      .map(
        ([x, y]) =>
          `${(((x - (left + right) / 2) * 2) / extent).toFixed(4)},${(((y - (top + bottom) / 2) * 2) / extent).toFixed(4)}`,
      )
      .join(" ");
    return {
      points,
      colour: `hsl(${hue.toFixed(2)} ${saturation.toFixed(2)}% ${lightness.toFixed(2)}%)`,
      scale: 0.97 + random() * 0.06,
    };
  });
}
