import { describe, expect, it } from "vitest";
import {
  arrivalFade,
  clusterPoint,
  ringPoint,
  ringPairPose,
  pairPose,
  survivorPoint,
  resetRingPose,
  introItems,
  gentleFloat,
  arrivalRotation,
  mergeChoreography,
  clusterChoreography,
  closingChoreography,
} from "./presentation";
import { CLUSTER_PARTS } from "./definition";

describe("majority choreography", () => {
  it("keeps the extended closing float subtle, smooth and moving throughout the silence", () => {
    const options = {
      verticalAmplitude: 2,
      rotationAmplitude: 0.4,
      verticalPeriod: 9,
      rotationPeriod: 11,
    };
    const samples = Array.from({ length: 720 }, (_, i) =>
      gentleFloat(296 + i / 30, options),
    );
    for (let i = 0; i < samples.length; i++) {
      expect(Math.abs(samples[i].offsetY)).toBeLessThanOrEqual(2);
      expect(Math.abs(samples[i].rotate)).toBeLessThanOrEqual(0.4);
      if (i > 0) {
        expect(
          Math.abs(samples[i].offsetY - samples[i - 1].offsetY),
        ).toBeLessThan(0.05);
        expect(
          Math.abs(samples[i].rotate - samples[i - 1].rotate),
        ).toBeLessThan(0.008);
      }
    }
    for (const start of [0, 360]) {
      const positions = samples.slice(start, start + 360).map((p) => p.offsetY);
      expect(Math.max(...positions) - Math.min(...positions)).toBeGreaterThan(
        3.9,
      );
    }
  });
  it("recalls the opening without a hard stop and holds the final pair after the words", () => {
    const marks = { remember: 3, counter: 7, end: 12 };
    const epsilon = 1e-5;
    const left =
      (closingChoreography(3, marks).travelTime -
        closingChoreography(3 - epsilon, marks).travelTime) /
      epsilon;
    const right =
      (closingChoreography(3 + epsilon, marks).travelTime -
        closingChoreography(3, marks).travelTime) /
      epsilon;
    expect(left).toBeCloseTo(right, 4);
    expect(closingChoreography(3, marks).recall).toBe(0);
    expect(closingChoreography(5, marks).recall).toBe(1);
    expect(closingChoreography(6.99, marks).counter).toBe(0);
    expect(closingChoreography(8, marks).counter).toBe(1);
    expect(closingChoreography(12, marks).brand).toBe(0);
    expect(closingChoreography(14, marks)).toMatchObject({
      recall: 1,
      counter: 1,
      brand: 1,
    });
  });
  it("gives cluster summaries and the combined candidate separate readable holds", () => {
    const marks = { three: 5, combine: 8, counts: 13, total: 16 };
    for (const time of [6, 7, 7.99])
      expect(clusterChoreography(time, marks)).toMatchObject({
        collapse: 1,
        move: 0,
        cancel: 0,
      });
    expect(clusterChoreography(9.5, marks)).toMatchObject({
      move: 1,
      cancel: 0,
    });
    for (const time of [11, 12, 12.99])
      expect(clusterChoreography(time, marks)).toMatchObject({
        cancel: 1,
        settle: 1,
        broadcast: 0,
      });
    expect(clusterChoreography(14.8, marks)).toMatchObject({
      broadcast: 1,
      counts: 1,
      total: 0,
    });
    expect(clusterChoreography(17, marks).total).toBe(1);
  });
  it("finishes the actual subtraction before showing a clearly separate matching case", () => {
    const marks = {
      different: 5,
      cancel: 9,
      same: 14,
      add: 18,
      sum: 20,
    };
    expect(mergeChoreography(0, marks)).toMatchObject({
      actual: 1,
      matching: 0,
      expand: 0,
    });
    expect(mergeChoreography(13, marks)).toMatchObject({
      survivor: 1,
      actual: 1,
      matching: 0,
    });
    expect(mergeChoreography(19, marks)).toMatchObject({
      actual: 0,
      matching: 1,
      addition: 0,
    });
    expect(mergeChoreography(22, marks)).toMatchObject({
      actual: 0,
      matching: 1,
      addition: 1,
    });
    expect(mergeChoreography(25, marks)).toMatchObject({
      actual: 0,
      matching: 1,
      addition: 1,
    });
    for (let t = 0; t <= 30; t += 0.05) {
      const state = mergeChoreography(t, marks);
      expect(state.actual + state.matching).toBeCloseTo(1);
      if (t < marks.same) expect(state.matching).toBe(0);
    }
  });
  it("keeps the emblem gently floating throughout the title instead of stopping after entry", () => {
    const samples = Array.from({ length: 600 }, (_, i) =>
      gentleFloat(148 + i / 30),
    );
    for (const pose of samples) {
      expect(Math.abs(pose.rotate)).toBeLessThanOrEqual(1.5);
      expect(Math.abs(pose.offsetY)).toBeLessThanOrEqual(6);
    }
    for (const start of [0, 90, 180, 270, 360, 450]) {
      const window = samples.slice(start, start + 60);
      expect(
        Math.max(...window.map((p) => p.offsetY)) -
          Math.min(...window.map((p) => p.offsetY)),
      ).toBeGreaterThan(1);
    }
  });
  it("preserves rotation when a queued triangle becomes the next arrival", () => {
    const boundary = 124.2;
    const before = arrivalRotation(boundary - 1e-5, 3, 0);
    const after = arrivalRotation(boundary + 1e-5, 3, 1e-5);
    expect(Math.abs(after - before)).toBeLessThan(0.001);
    for (let frame = 0; frame <= 120; frame++) {
      const time = 124 + frame / 120;
      const q = frame / 120;
      expect(Math.abs(arrivalRotation(time, 3, q))).toBeLessThanOrEqual(2);
      expect(arrivalRotation(time, 3, 1)).toBeCloseTo(
        gentleFloat(time).rotate,
        12,
      );
    }
  });
  it("fades after the actual arrival, including a held zero and reverse seeking", () => {
    const progressAt = (time: number) =>
      time < 2 ? 3 : time < 3 ? 3 + (time - 2) ** 2 : 4;
    expect(arrivalFade(2.999, 3, progressAt)).toBe(0);
    expect(arrivalFade(3, 4, progressAt)).toBeCloseTo(1, 4);
    expect(arrivalFade(3.3, 4, progressAt)).toBeCloseTo(0.5, 4);
    expect(arrivalFade(3.61, 4, progressAt)).toBe(0);
    expect(arrivalFade(3.3, 4, progressAt)).toBeCloseTo(0.5, 4);
    expect(arrivalFade(0, 0, () => 0)).toBe(0);
  });

  it("cancels inside the ring without crossing waiting shapes or hiding either member", () => {
    for (const pairs of [
      [
        [0, 1],
        [4, 2],
        [5, 3],
        [6, 7],
      ],
      [
        [1, 2],
        [0, 3],
        [4, 7],
      ],
    ]) {
      const removed = new Set<number>();
      for (const pair of pairs) {
        for (let frame = 0; frame <= 240; frame++) {
          const poses = pair.map((i) => ringPairPose(i, pair, frame / 240));
          const apart = (
            a: { x: number; y: number },
            b: { x: number; y: number },
          ) => Math.abs(a.x - b.x) >= 84 || Math.abs(a.y - b.y) >= 84;
          expect(
            apart(poses[0], poses[1]),
            `pair ${pair} overlaps at ${frame}`,
          ).toBe(true);
          for (const pose of poses)
            for (let j = 0; j < 10; j++) {
              if (pair.includes(j) || removed.has(j) || pose.opacity === 0)
                continue;
              expect(
                apart(pose, ringPoint(j)),
                `pair ${pair} hits ${j} at ${frame}`,
              ).toBe(true);
            }
        }
        pair.forEach((i) => removed.add(i));
      }
    }
  });
  it("holds both members still and visible before their synchronized fade", () => {
    const pair = [0, 1];
    for (const q of [0.5, 0.55, 0.64, 0.8, 1]) {
      const a = ringPairPose(0, pair, q),
        b = ringPairPose(1, pair, q);
      expect(a.x).toBe(740);
      expect(b.x).toBe(860);
      expect(a.y).toBe(450);
      expect(b.y).toBe(450);
      expect(a.opacity).toBe(b.opacity);
    }
    expect(ringPairPose(0, pair, 0.64).opacity).toBe(1);
    expect(ringPairPose(0, pair, 1).opacity).toBe(0);
  });
  it("keeps vertical pairs in their own columns without overlapping", () => {
    for (let column = 0; column < 4; column++)
      for (let frame = 0; frame <= 120; frame++) {
        const x = 475 + column * 130;
        const a = pairPose(x, 350, x, 396, frame / 120);
        const b = pairPose(x, 550, x, 504, frame / 120);
        expect(a.x).toBe(x);
        expect(b.x).toBe(x);
        expect(b.y - a.y).toBeGreaterThanOrEqual(108);
        expect(a.opacity).toBe(b.opacity);
      }
  });
  it("preserves the survivors at the scene boundary and restores the others gradually", () => {
    for (const index of [8, 9]) {
      expect(resetRingPose(index, 0)).toEqual({
        ...survivorPoint(index),
        opacity: 1,
      });
      expect(resetRingPose(index, 1.1)).toEqual({
        ...ringPoint(index),
        opacity: 1,
      });
      expect(resetRingPose(index, 0.5).opacity).toBe(1);
    }
    expect(resetRingPose(0, 0).opacity).toBe(0);
    expect(resetRingPose(0, 0.7).opacity).toBeGreaterThan(0);
    expect(resetRingPose(0, 1.1).opacity).toBe(1);
  });
  it("keeps velocity continuous at the start and stop of each cancellation", () => {
    const epsilon = 1e-5;
    for (const t of [0, 0.5]) {
      const pose = (q: number) => ringPairPose(0, [0, 1], q);
      for (const axis of ["x", "y"] as const) {
        const left = (pose(t)[axis] - pose(t - epsilon)[axis]) / epsilon;
        const right = (pose(t + epsilon)[axis] - pose(t)[axis]) / epsilon;
        expect(Math.abs(left - right)).toBeLessThan(0.2);
      }
    }
  });
  it("changes the visible leader through incoming runs, without changing existing identities", () => {
    const visible = (time: number) =>
      introItems(time, 1).filter((s) => s.x >= 0 && s.x <= 1600);
    const count = (time: number, kind: string) =>
      visible(time).filter((s) => s.kind === kind).length;
    expect(count(0, "square")).toBeGreaterThan(count(0, "circle"));
    expect(count(10, "circle")).toBeGreaterThan(count(10, "square"));
    const early = introItems(6, 1),
      late = introItems(6.1, 1);
    for (const item of early) {
      const next = late.find((s) => s.index === item.index);
      if (!next) continue;
      expect(next.kind).toBe(item.kind);
      expect(next.x - item.x).toBeCloseTo(-23);
    }
    expect(introItems(6, 1)).toEqual(early);
  });
  it("makes the gap between machines larger than any gap within a machine", () => {
    const groups = CLUSTER_PARTS.map((values, i) =>
      values.map((_, j) => clusterPoint(i, j, values.length)),
    );
    let within = 0,
      between = Infinity;
    for (let i = 0; i < groups.length; i++)
      for (const a of groups[i]) {
        for (const b of groups[i])
          within = Math.max(within, Math.hypot(a.x - b.x, a.y - b.y));
        for (let j = i + 1; j < groups.length; j++)
          for (const b of groups[j])
            between = Math.min(between, Math.hypot(a.x - b.x, a.y - b.y));
      }
    expect(between - 72).toBeGreaterThan(within);
  });
});
