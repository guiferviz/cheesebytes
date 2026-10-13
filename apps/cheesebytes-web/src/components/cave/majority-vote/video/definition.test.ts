import { describe, expect, it } from "vitest";
import {
  summarize,
  merge,
  SEQUENCE,
  NO_MAJORITY,
  SHARDS,
  type ShapeKind,
} from "./definition";
describe("majority story examples", () => {
  it("shows cancellation, zero balance and candidate replacement", () => {
    expect(summarize(SEQUENCE.slice(0, 1))).toEqual({
      candidate: "square",
      strength: 1,
    });
    expect(summarize(SEQUENCE.slice(0, 2)).strength).toBe(0);
    expect(summarize(SEQUENCE.slice(0, 3))).toEqual({
      candidate: "triangle",
      strength: 1,
    });
    expect(summarize(SEQUENCE)).toEqual({ candidate: "square", strength: 2 });
  });
  it("has a surviving candidate without a majority", () => {
    const result = summarize(NO_MAJORITY);
    expect(result).toEqual({ candidate: "square", strength: 1 });
    expect(NO_MAJORITY.filter((k) => k === result.candidate)).toHaveLength(3);
  });
  it("partitions every input once and combines residual weights", () => {
    expect(SHARDS.flat().sort()).toEqual([...SEQUENCE].sort());
    expect(SHARDS.map(summarize)).toEqual([
      { candidate: "square", strength: 2 },
      { candidate: "triangle", strength: 1 },
      { candidate: "square", strength: 1 },
    ]);
    expect(SHARDS.map(summarize).reduce(merge)).toEqual({
      candidate: "square",
      strength: 2,
    });
  });
  it("preserves any strict majority under different shard summaries", () => {
    const kinds: ShapeKind[] = ["square", "circle", "triangle"];
    for (let n = 1; n <= 7; n++)
      for (let mask = 0; mask < 3 ** n; mask++) {
        let code = mask;
        const values = Array.from({ length: n }, () => {
          const value = kinds[code % 3];
          code = Math.floor(code / 3);
          return value;
        });
        const majority = kinds.find(
          (k) => values.filter((v) => v === k).length > n / 2,
        );
        if (!majority) continue;
        expect(summarize(values).candidate).toBe(majority);
        for (let cut = 0; cut <= n; cut++)
          expect(
            merge(summarize(values.slice(0, cut)), summarize(values.slice(cut)))
              .candidate,
          ).toBe(majority);
      }
  });
});
