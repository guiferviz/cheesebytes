import { describe, expect, it } from "vitest";
import {
  summarize,
  merge,
  SEQUENCE,
  ONLINE_SEQUENCE,
  FRIEND_PARTS,
  CLUSTER_PARTS,
  NO_MAJORITY,
  SHARDS,
  type ShapeKind,
} from "./definition";
describe("majority story examples", () => {
  it("keeps the same eleven values when repartitioning the friends into machines", () => {
    expect(CLUSTER_PARTS.flat().sort()).toEqual(FRIEND_PARTS.flat().sort());
    const result = CLUSTER_PARTS.map(summarize).reduce(merge);
    expect(CLUSTER_PARTS.map(summarize)).toEqual([
      { candidate: "square", strength: 1 },
      { candidate: "square", strength: 2 },
      { candidate: "circle", strength: 2 },
    ]);
    expect(result).toEqual({ candidate: "square", strength: 1 });
    expect(
      CLUSTER_PARTS.map((part) => part.filter((v) => v === "square").length),
    ).toEqual([2, 3, 1]);
  });
  it("demonstrates match, mismatch, zero, and replacement in spoken order", () => {
    expect(summarize(ONLINE_SEQUENCE.slice(0, 2))).toEqual({
      candidate: "square",
      strength: 2,
    });
    expect(summarize(ONLINE_SEQUENCE.slice(0, 3)).strength).toBe(1);
    expect(summarize(ONLINE_SEQUENCE.slice(0, 4)).strength).toBe(0);
    expect(summarize(ONLINE_SEQUENCE.slice(0, 5))).toEqual({
      candidate: "triangle",
      strength: 1,
    });
    expect(summarize(ONLINE_SEQUENCE)).toEqual({
      candidate: "square",
      strength: 2,
    });
  });
  it("merges the friend's real chunks and preserves their global majority", () => {
    const summaries = FRIEND_PARTS.map(summarize);
    expect(FRIEND_PARTS.map((part) => part.length)).toEqual([6, 5]);
    expect(summaries).toEqual([
      { candidate: "square", strength: 2 },
      { candidate: "circle", strength: 1 },
    ]);
    expect(merge(summaries[0], summaries[1])).toEqual({
      candidate: "square",
      strength: 1,
    });
    const values = FRIEND_PARTS.flat();
    expect(values.filter((v) => v === "square")).toHaveLength(6);
    expect(values).toHaveLength(11);
  });
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
