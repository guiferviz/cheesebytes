import { describe, expect, it } from "vitest";
import { STREAM, trace } from "./definition";
import { cancellationPose, smooth, transferPose } from "./motion";
describe("Misra–Gries motion continuity", () => {
  it("keeps surviving candidates in their physical slot after cancellation", () => {
    for (const capacity of [2, 3]) {
      const states = trace(STREAM, capacity);
      for (let n = 1; n < states.length; n++) {
        const before = states[n - 1],
          after = states[n];
        for (const [i, kind] of before.slots.entries())
          if (kind && after.counts[kind]) expect(after.slots[i]).toBe(kind);
        expect(after.slots.filter(Boolean).sort()).toEqual(
          Object.keys(after.counts).sort(),
        );
      }
    }
  });
  it("lands arrivals at their counter and converges every cancellation actor", () => {
    expect(transferPose(212, 615, 0)).toMatchObject({
      x: 212,
      y: 190,
      size: 50,
      opacity: 1,
    });
    expect(transferPose(212, 615, 1)).toMatchObject({
      x: 615,
      y: 445,
      size: 88,
      opacity: 0,
    });
    for (const [x, y] of [
      [615, 445],
      [985, 445],
      [800, 190],
    ]) {
      expect(cancellationPose(x, y, 0)).toEqual({ x, y, opacity: 1 });
      expect(cancellationPose(x, y, 0.78)).toMatchObject({ x: 800, y: 330 });
      expect(cancellationPose(x, y, 1).opacity).toBe(0);
    }
  });
  it("has no position or opacity jump at collision and fade boundaries", () => {
    for (const edge of [0.67, 0.68, 0.78, 0.83, 0.9, 0.92]) {
      for (const pose of [
        (p: number) => transferPose(212, 985, p),
        (p: number) => cancellationPose(615, 445, p),
      ]) {
        const a = pose(edge - 1e-5),
          b = pose(edge + 1e-5);
        expect(Math.abs(a.x - b.x)).toBeLessThan(0.05);
        expect(Math.abs(a.y - b.y)).toBeLessThan(0.05);
        expect(Math.abs(a.opacity - b.opacity)).toBeLessThan(0.001);
      }
    }
    expect((smooth(0.001) - smooth(0)) / 0.001).toBeLessThan(0.001);
    expect((smooth(1) - smooth(0.999)) / 0.001).toBeLessThan(0.001);
  });
});
