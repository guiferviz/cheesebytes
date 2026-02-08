import React, { useState, useEffect, useMemo } from "react";
import { SHAPES, ShapeSVG } from "./MajorityVote";
import type { Shape } from "./MajorityVote";
import { CheeseButton, CheeseCard } from "../shared/CheeseUI";

// ===========================================
// TYPES
// ===========================================

type Summary = {
  candidate: Shape | null;
  count: number;
};

// ===========================================
// HELPERS
// ===========================================

function generatePartition(
  size: number,
  forceMajority: boolean,
  majorityShape?: Shape,
): Shape[] {
  const seq: Shape[] = [];

  if (forceMajority && majorityShape) {
    // Fill ~60% with majority shape
    const majCount = Math.floor(size * 0.6) + 1;
    for (let i = 0; i < majCount; i++) {
      seq.push(majorityShape);
    }
    // Fill rest randomly with other shapes
    const others = SHAPES.filter((s) => s.type !== majorityShape.type);
    for (let i = majCount; i < size; i++) {
      seq.push(others[Math.floor(Math.random() * others.length)]);
    }
    // Shuffle
    for (let i = seq.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [seq[i], seq[j]] = [seq[j], seq[i]];
    }
  } else {
    // Uniform random
    for (let i = 0; i < size; i++) {
      seq.push(SHAPES[Math.floor(Math.random() * SHAPES.length)]);
    }
  }
  return seq;
}

function processPartition(shapes: Shape[]): Summary {
  let candidate: Shape | null = null;
  let count = 0;

  for (const s of shapes) {
    if (count === 0) {
      candidate = s;
      count = 1;
    } else if (candidate?.type === s.type) {
      count++;
    } else {
      count--;
    }
  }
  // Return candidate even if count is 0, as long as it was set
  return { candidate, count };
}

function mergeSummaries(s1: Summary, s2: Summary): Summary {
  if (!s1.candidate) return s2;
  if (!s2.candidate) return s1;

  if (s1.candidate.type === s2.candidate.type) {
    return { candidate: s1.candidate, count: s1.count + s2.count };
  } else {
    // Conflict
    if (s1.count > s2.count) {
      return { candidate: s1.candidate, count: s1.count - s2.count };
    } else if (s2.count > s1.count) {
      return { candidate: s2.candidate, count: s2.count - s1.count };
    } else {
      return { candidate: null, count: 0 };
    }
  }
}

// ===========================================
// COMPONENT
// ===========================================

export const MajorityVoteMerged: React.FC = () => {
  const [numPartitions, setNumPartitions] = useState(3);
  const [partitionSize, setPartitionSize] = useState(8);
  const [partitions, setPartitions] = useState<Shape[][]>([]);

  // Initial load
  useEffect(() => {
    onRegenerate(false);
  }, []); // Run once on mount

  // Effect to handle size/num changes without changing mode?
  // Ideally, when sliders move, we just want to re-shuffle in Uniform mode?
  // Or keep previous mode? Let's just default to Uniform when config changes for now to be simple
  // or better: onRegenerate is called manually.
  // When numPartitions or partitionSize changes, we should probably just re-run with current settings.
  // But we don't store current "mode". Let's just create a `regenerate(mode)` function.

  const generateWithMode = (isMajority: boolean) => {
    let globalMajority: Shape | undefined;
    if (isMajority) {
      globalMajority = SHAPES[Math.floor(Math.random() * SHAPES.length)];
    }

    const parts = Array.from({ length: numPartitions }, () =>
      generatePartition(partitionSize, isMajority, globalMajority),
    );
    setPartitions(parts);
  };

  // Re-run when config changes (default to uniform to avoid confusion)
  useEffect(() => {
    generateWithMode(false);
  }, [numPartitions, partitionSize]);

  const onRegenerate = (majority: boolean = false) => {
    generateWithMode(majority);
  };

  // Compute local results
  const localSummaries = useMemo(() => {
    return partitions.map(processPartition);
  }, [partitions]);

  // Compute global result by merging
  const finalSummary = useMemo(() => {
    if (localSummaries.length === 0) return { candidate: null, count: 0 };
    return localSummaries.reduce((acc, curr) => mergeSummaries(acc, curr), {
      candidate: null,
      count: 0,
    });
  }, [localSummaries]);

  // Check true count to verify
  const trueWinner = useMemo(() => {
    const flat = partitions.flat();
    const counts = new Map<string, number>();
    for (const s of flat) {
      counts.set(s.type, (counts.get(s.type) || 0) + 1);
    }
    let winner: string | null = null;
    for (const [type, count] of counts.entries()) {
      if (count > flat.length / 2) {
        winner = type;
      }
    }
    return winner ? SHAPES.find((s) => s.type === winner) : null;
  }, [partitions]);

  return (
    <div className="flex flex-col gap-6">
      <CheeseCard variant="default" className="!p-4">
        {/* Controls */}
        <div className="flex flex-wrap items-end gap-4 pb-4 border-b border-stone-100 dark:border-stone-700">
          <label className="flex flex-col gap-1 text-xs font-bold text-stone-500 dark:text-stone-400 uppercase">
            Partitions
            <select
              value={numPartitions}
              onChange={(e) => setNumPartitions(Number(e.target.value))}
              className="p-1 border rounded bg-stone-50 border-stone-200 dark:bg-stone-800 dark:border-stone-600 dark:text-stone-200"
            >
              {[2, 3, 4, 5].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1 text-xs font-bold text-stone-500 dark:text-stone-400 uppercase">
            Size / Partition
            <div className="flex items-center gap-2">
              <input
                type="range"
                min="4"
                max="20"
                value={partitionSize}
                onChange={(e) => setPartitionSize(Number(e.target.value))}
                className="w-24 accent-amber-500 bg-stone-200 dark:bg-stone-700 rounded-lg h-2 appearance-none cursor-pointer"
              />
              <span className="font-mono text-stone-600 dark:text-stone-300">
                {partitionSize}
              </span>
            </div>
          </label>

          <div className="flex items-center gap-2 pb-1">
            <button
              onClick={() => onRegenerate(false)}
              className="px-3 py-1.5 rounded-lg text-[10px] font-bold bg-white dark:bg-stone-700 border border-stone-200 dark:border-stone-600 text-stone-600 dark:text-stone-300 hover:bg-stone-50 dark:hover:bg-stone-600 hover:border-stone-300 dark:hover:border-stone-500 transition-all shadow-sm"
              title="Generate random sequence (uniform distribution)"
            >
              🎲 Uniform
            </button>
            <button
              onClick={() => onRegenerate(true)}
              className="px-3 py-1.5 rounded-lg text-[10px] font-bold bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/40 hover:border-amber-300 dark:hover:border-amber-700 transition-all shadow-sm"
              title="Generate sequence with guaranteed majority"
            >
              🎲 Majority
            </button>
          </div>
        </div>

        {/* Partitions Grid */}
        <div className="flex flex-col gap-4 mt-4">
          {partitions.map((part, idx) => {
            const summary = localSummaries[idx];
            return (
              <div
                key={idx}
                className="flex flex-col md:flex-row md:items-center gap-4 p-2 rounded-lg bg-stone-50 border border-stone-100 dark:bg-stone-800 dark:border-stone-700"
              >
                {/* Partition shapes */}
                <div className="flex flex-wrap gap-1 flex-1">
                  <span className="text-xs font-mono text-stone-400 dark:text-stone-500 w-6 shrink-0 pt-2">
                    P{idx + 1}
                  </span>
                  {part.map((s, i) => (
                    <div
                      key={i}
                      className="bg-white p-1 rounded shadow-sm border border-stone-100 dark:bg-stone-900 dark:border-stone-700"
                    >
                      <ShapeSVG shape={s} size={20} />
                    </div>
                  ))}
                </div>

                {/* Arrow */}
                <div className="text-stone-300 dark:text-stone-600 hidden md:block">
                  ➔
                </div>

                {/* Local Result */}
                <div className="flex items-center gap-3 w-32 shrink-0 bg-white p-2 rounded border border-stone-200 dark:bg-stone-900 dark:border-stone-700">
                  <div className="text-[10px] uppercase font-bold text-stone-400 dark:text-stone-500">
                    Local
                  </div>
                  {summary.candidate ? (
                    <>
                      <ShapeSVG shape={summary.candidate} size={24} />
                      <span className="font-mono font-bold text-lg text-stone-700 dark:text-stone-300">
                        x{summary.count}
                      </span>
                    </>
                  ) : (
                    <span className="text-xs text-stone-400 dark:text-stone-500 italic">
                      None
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </CheeseCard>

      {/* Merge Result Section */}
      <CheeseCard
        variant="highlight"
        className="!p-6 dark:!bg-stone-900 dark:!border-stone-700"
      >
        <div className="flex flex-col items-center gap-4">
          <div className="text-xs font-bold text-stone-500 dark:text-stone-400 uppercase tracking-widest">
            Global Merge Result
          </div>

          <div className="flex flex-wrap gap-8 items-center justify-center w-full">
            {/* Algorithm Result */}
            <div
              className={`
                    flex flex-col items-center p-4 rounded-xl border-2 transition-all min-w-[200px]
                    ${
                      finalSummary.candidate
                        ? "border-amber-400 bg-amber-50 dark:border-amber-600 dark:bg-amber-900/30"
                        : "border-stone-200 bg-white dark:border-stone-700 dark:bg-stone-800"
                    }
                `}
            >
              <div className="text-xs text-amber-600 dark:text-amber-500 font-bold mb-2 uppercase tracking-wide">
                Boyer-Moore Candidate
              </div>
              <div className="flex items-center gap-3">
                {finalSummary.candidate ? (
                  <>
                    <ShapeSVG shape={finalSummary.candidate} size={40} />
                    <span className="text-2xl font-bold font-mono text-amber-800 dark:text-amber-200">
                      (Strength: {finalSummary.count})
                    </span>
                  </>
                ) : (
                  <span className="text-stone-400 dark:text-stone-500 italic">
                    No Candidate
                  </span>
                )}
              </div>
            </div>

            {/* Verification */}
            <div
              className={`
                    flex flex-col items-center p-4 rounded-xl border-2 transition-all min-w-[200px]
                    ${
                      trueWinner
                        ? "border-green-400 bg-green-50 dark:border-green-600 dark:bg-green-900/30"
                        : "border-stone-200 bg-white dark:border-stone-700 dark:bg-stone-800"
                    }
                `}
            >
              <div className="text-xs text-green-600 dark:text-green-500 font-bold mb-2 uppercase tracking-wide">
                Actual Majority ({">"}50%)
              </div>
              <div className="flex items-center gap-3">
                {trueWinner ? (
                  <>
                    <ShapeSVG shape={trueWinner} size={40} />
                    <span className="text-xl font-bold text-green-800 dark:text-green-200">
                      Exists!
                    </span>
                  </>
                ) : (
                  <span className="text-stone-400 dark:text-stone-500 italic font-mono">
                    None Exists
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="text-center text-sm text-stone-500 dark:text-stone-400 max-w-lg mt-2">
            {finalSummary.candidate && !trueWinner && (
              <span className="text-amber-600 dark:text-amber-500 font-bold">
                Warning: A candidate was found, but it is NOT a true majority (
                {">"}50%). The second pass is required to verify!
              </span>
            )}
            {finalSummary.candidate &&
              trueWinner &&
              finalSummary.candidate.type !== trueWinner.type && (
                <span className="text-red-600 dark:text-red-400 font-bold">
                  Error: Algorithm found wrong candidate? (Should not happen for{" "}
                  {">"}50%)
                </span>
              )}
            {finalSummary.candidate &&
              trueWinner &&
              finalSummary.candidate.type === trueWinner.type && (
                <span className="text-green-600 dark:text-green-400 font-bold">
                  Success: The algorithm correctly identified the potential
                  majority candidate.
                </span>
              )}
          </div>
        </div>
      </CheeseCard>
    </div>
  );
};
