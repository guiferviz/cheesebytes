import { describe, expect, it } from "vitest";
import { STREAM, trace } from "./definition";
import { traceFrame, spreadPose, possiblePose, type Actor } from "./motion";

// Squares also need corner clearance: center distance alone misses overlaps.
const clearance = (a: Actor, b: Actor) =>
  Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y)) - (a.size + b.size) / 2;
describe("Misra–Gries visible geometry", () => {
  it("keeps surviving identities in their physical slots", () => {
    for (const capacity of [2, 3]) {
      const states = trace(STREAM, capacity);
      for (let n = 1; n < states.length; n++)
        for (const [i, kind] of states[n - 1].slots.entries())
          if (kind && states[n].counts[kind])
            expect(states[n].slots[i]).toBe(kind);
    }
  });
  it("keeps all readable shapes separate through every arrival and cancellation", () => {
    let worst = { gap: Infinity, at: 0, capacity: 0, pair: "" };
    for (const capacity of [2, 3])
      for (let frame = 0; frame <= 15 * 120; frame++) {
        const p = frame / 120,
          actors = traceFrame(p, capacity).actors.filter(
            (a) => a.opacity > 0.15,
          );
        for (let i = 0; i < actors.length; i++)
          for (let j = i + 1; j < actors.length; j++) {
            const gap = clearance(actors[i], actors[j]);
            if (gap < worst.gap)
              worst = {
                gap,
                at: p,
                capacity,
                pair: actors[i].id + " / " + actors[j].id,
              };
          }
      }
    expect(worst.gap, JSON.stringify(worst)).toBeGreaterThanOrEqual(3);
  });
  it("hands each arrival into its pile without a duplicate or position jump", () => {
    for (const capacity of [2, 3])
      for (let n = 1; n <= 15; n++) {
        const before = traceFrame(n - 1e-7, capacity),
          after = traceFrame(n, capacity);
        const visible = (actors: Actor[]) =>
          actors.filter(
            (a) => a.role !== "stream" && a.y > 190.01 && a.opacity > 0.99,
          );
        const a = visible(before.actors),
          b = visible(after.actors);
        expect(a.length).toBe(b.length);
        for (const actor of a)
          expect(
            b.some(
              (next) =>
                next.kind === actor.kind &&
                Math.hypot(next.x - actor.x, next.y - actor.y) < 0.01 &&
                Math.abs(next.size - actor.size) < 0.01,
            ),
          ).toBe(true);
        expect(before.summary.counts).toEqual(after.summary.counts);
      }
  });
  it("spreads four survivors without crossing their neighbors", () => {
    for (let frame = 0; frame <= 120; frame++) {
      const actors = Array.from(
        { length: 4 },
        (_, i) =>
          ({
            id: String(i),
            kind: "square",
            role: "pile",
            opacity: 1,
            ...spreadPose(i, frame / 120),
          }) as Actor,
      );
      for (let i = 0; i < 4; i++)
        for (let j = i + 1; j < 4; j++)
          expect(clearance(actors[i], actors[j])).toBeGreaterThanOrEqual(3);
    }
  });
  it("keeps possible deleted copies clear of the four surviving squares", () => {
    for (let frame = 0; frame <= 120; frame++) {
      const fixed = [470, 580, 690, 800].map((x) => ({ x, y: 310, size: 78 }));
      const moving = Array.from({ length: 3 }, (_, i) => ({
        ...possiblePose(i, frame / 120),
        size: 78,
      }));
      const actors = [...fixed, ...moving] as Actor[];
      for (let i = 0; i < actors.length; i++)
        for (let j = i + 1; j < actors.length; j++)
          expect(clearance(actors[i], actors[j])).toBeGreaterThanOrEqual(3);
    }
  });
});
