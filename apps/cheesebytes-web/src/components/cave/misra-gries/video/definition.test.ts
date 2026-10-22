import { describe, it, expect } from "vitest";
import { KINDS, STREAM, trace } from "./definition";
describe("Misra–Gries narrative data", () => {
  it("preserves the same canonical stream in both summaries", () => {
    expect(trace(STREAM, 2).at(-1)).toMatchObject({
      counts: { square: 4, circle: 2 },
      removed: 3,
    });
    expect(trace(STREAM, 3).at(-1)).toMatchObject({
      counts: { square: 6, circle: 4, triangle: 1 },
      removed: 1,
    });
    expect(STREAM.filter((k) => k === "square")).toHaveLength(7);
  });
  it("subtracts one from populated counters without erasing the survivors", () => {
    const frames = trace(STREAM, 2);
    expect(frames[5].counts).toEqual({ square: 3, circle: 2 });
    expect(frames[6]).toMatchObject({
      counts: { square: 2, circle: 1 },
      removed: 1,
      event: "cancel",
    });
    expect(
      frames
        .filter((frame) => frame.event === "cancel")
        .every((frame) => Object.keys(frame.counts).length > 0),
    ).toBe(true);
    const runLengths = STREAM.reduce<number[]>((runs, kind, i) => {
      if (kind === STREAM[i - 1]) runs[runs.length - 1]++;
      else runs.push(1);
      return runs;
    }, []);
    expect(Math.max(...runLengths)).toBeLessThanOrEqual(2);
  });
  it("bounds exact frequencies and preserves mass for every short stream", () => {
    for (let length = 0; length <= 5; length++)
      for (let code = 0; code < 4 ** length; code++) {
        const values = Array.from(
          { length },
          (_, i) => KINDS[Math.floor(code / 4 ** i) % 4],
        );
        for (const capacity of [1, 2, 3]) {
          const result = trace(values, capacity).at(-1)!;
          expect(
            Object.values(result.counts).reduce((a, b) => a + b, 0) +
              (capacity + 1) * result.removed,
          ).toBe(length);
          for (const kind of KINDS) {
            const frequency = values.filter((k) => k === kind).length,
              count = result.counts[kind] ?? 0;
            expect(count).toBeLessThanOrEqual(frequency);
            expect(frequency).toBeLessThanOrEqual(count + result.removed);
            if (frequency > length / (capacity + 1))
              expect(count).toBeGreaterThan(0);
          }
        }
      }
  });
});
