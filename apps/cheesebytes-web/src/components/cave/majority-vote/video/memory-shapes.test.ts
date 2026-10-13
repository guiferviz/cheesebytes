import { describe, expect, it } from "vitest";
import { createMemoryShapes } from "./memory-shapes";

type Point = [number, number];
const cross = (a: Point, b: Point, c: Point) =>
  (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
const onSegment = (a: Point, b: Point, c: Point) =>
  Math.abs(cross(a, b, c)) < 1e-10 &&
  c[0] >= Math.min(a[0], b[0]) &&
  c[0] <= Math.max(a[0], b[0]) &&
  c[1] >= Math.min(a[1], b[1]) &&
  c[1] <= Math.max(a[1], b[1]);
function intersects(a: Point, b: Point, c: Point, d: Point) {
  return (
    (cross(a, b, c) * cross(a, b, d) < 0 &&
      cross(c, d, a) * cross(c, d, b) < 0) ||
    onSegment(a, b, c) ||
    onSegment(a, b, d) ||
    onSegment(c, d, a) ||
    onSegment(c, d, b)
  );
}
const vertices = (points: string) =>
  points.split(" ").map((point) => point.split(",").map(Number) as Point);

describe("seeded memory polygons", () => {
  it("reproduces a seed and changes geometry when the seed changes", () => {
    expect(createMemoryShapes(42)).toEqual(createMemoryShapes(42));
    expect(createMemoryShapes(43)).not.toEqual(createMemoryShapes(42));
  });

  it("never intersects nonadjacent edges, including the closing edge", () => {
    const intersections: {
      seed: number;
      points: Point[];
      i: number;
      j: number;
    }[] = [];
    for (const seed of [
      0,
      1,
      42,
      123,
      314,
      4294967295,
      ...Array.from({ length: 32 }, (_, i) => i * 7919),
    ]) {
      for (const shape of createMemoryShapes(seed)) {
        const points = vertices(shape.points);
        const n = points.length;
        for (let i = 0; i < n; i++) {
          for (let j = i + 1; j < n; j++) {
            if (j === i + 1 || (i === 0 && j === n - 1)) continue;
            if (
              intersects(
                points[i],
                points[(i + 1) % n],
                points[j],
                points[(j + 1) % n],
              )
            )
              intersections.push({ seed, points, i, j });
          }
        }
      }
    }
    expect(intersections).toEqual([]);
  });

  it("mixes stars, locally indented shapes and fuller contours", () => {
    const shapes = createMemoryShapes(42);
    const concave = shapes.filter((shape) => {
      const p = vertices(shape.points);
      const turns = p.map((a, i) =>
        cross(a, p[(i + 1) % p.length], p[(i + 2) % p.length]),
      );
      return turns.some((t) => t < 0) && turns.some((t) => t > 0);
    });
    expect(concave.length).toBeGreaterThan(shapes.length / 2);
    expect(concave.length).toBeLessThan(shapes.length);
    const locallyIndented = shapes.filter((shape) => {
      const p = vertices(shape.points);
      const dents = p.filter(
        (a, i) => cross(a, p[(i + 1) % p.length], p[(i + 2) % p.length]) < 0,
      ).length;
      return dents === 1 || dents === 2;
    });
    expect(locallyIndented.length).toBeGreaterThan(shapes.length / 5);
    expect(new Set(shapes.map((s) => s.points)).size).toBe(shapes.length);
  });
});
