import React, { useState, useEffect, useMemo } from "react";
import { ShapeSVG } from "./MajorityVote";
import { CheeseCard } from "../shared/CheeseUI";
import { ARTICLE_SEQUENCE, SHAPES } from "./MajorityVoteConstants";
import type { Shape } from "./MajorityVoteConstants";

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
  const [partitionSize, setPartitionSize] = useState(4);
  const [partitions, setPartitions] = useState<Shape[][]>(() => {
    const size = 4;
    const parts: Shape[][] = [];
    for (let i = 0; i < ARTICLE_SEQUENCE.length; i += size) {
      parts.push(ARTICLE_SEQUENCE.slice(i, i + size));
    }
    // Ensure we match numPartitions even if ARTICLE_SEQUENCE runs out or has extra
    // ARTICLE_SEQUENCE is 12, so 3 chunks of 4. Matches defaults perfectly.
    return parts;
  });
  const [isEditing, setIsEditing] = useState(false);
  const isFirstRender = React.useRef(true);

  const generateWithMode = (isMajority: boolean) => {
    let globalMajority: Shape | undefined;
    if (isMajority) {
      globalMajority = SHAPES[Math.floor(Math.random() * SHAPES.length)];
    }

    const parts = Array.from({ length: numPartitions }, () =>
      generatePartition(partitionSize, isMajority, globalMajority),
    );
    setPartitions(parts);
    setIsEditing(false); // Exit edit mode on regenerate
  };

  // Re-run when config changes
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    generateWithMode(false);
  }, [numPartitions, partitionSize]);

  const onRegenerate = (majority: boolean = false) => {
    generateWithMode(majority);
  };

  const toggleEdit = () => setIsEditing((prev) => !prev);

  const cycleShape = (pIdx: number, sIdx: number) => {
    setPartitions((prev) => {
      const newParts = [...prev];
      const part = [...newParts[pIdx]];
      const shape = part[sIdx];
      const nextShape =
        SHAPES[
          (SHAPES.findIndex((s) => s.type === shape.type) + 1) % SHAPES.length
        ];
      part[sIdx] = nextShape;
      newParts[pIdx] = part;
      return newParts;
    });
  };

  const removeShape = (pIdx: number, sIdx: number) => {
    setPartitions((prev) => {
      const newParts = [...prev];
      newParts[pIdx] = newParts[pIdx].filter((_, i) => i !== sIdx);
      return newParts;
    });
  };

  const addShape = (pIdx: number) => {
    setPartitions((prev) => {
      const newParts = [...prev];
      newParts[pIdx] = [
        ...newParts[pIdx],
        SHAPES[Math.floor(Math.random() * SHAPES.length)],
      ];
      return newParts;
    });
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

  return (
    <div className="flex flex-col gap-6 select-none not-prose">
      <CheeseCard variant="default" className="!p-4">
        {/* Controls */}
        <div className="flex flex-wrap items-center gap-4 pb-4 border-b border-stone-100 dark:border-stone-700">
          <label className="flex flex-col gap-1 text-[10px] font-bold text-stone-500 dark:text-stone-400 uppercase">
            Partitions
            <select
              value={numPartitions}
              onChange={(e) => setNumPartitions(Number(e.target.value))}
              className="p-1.5 text-xs border rounded bg-stone-50 border-stone-200 dark:bg-stone-800 dark:border-stone-600 dark:text-stone-200"
            >
              {[2, 3, 4, 5].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1 text-[10px] font-bold text-stone-500 dark:text-stone-400 uppercase">
            Size / Partition
            <div className="flex items-center gap-2">
              <input
                type="range"
                min="4"
                max="20"
                value={partitionSize}
                onChange={(e) => setPartitionSize(Number(e.target.value))}
                className="w-24 accent-amber-500 bg-stone-200 dark:bg-stone-700 rounded-full h-1.5 appearance-none cursor-pointer"
              />
              <span className="font-mono text-xs text-stone-600 dark:text-stone-300 w-4">
                {partitionSize}
              </span>
            </div>
          </label>

          <div className="w-px h-8 bg-stone-200 dark:bg-stone-700 mx-1" />

          <div className="flex items-center gap-2">
            <button
              onClick={() => onRegenerate(false)}
              className="px-3 py-1.5 rounded-lg text-[10px] font-bold bg-white dark:bg-stone-700 border border-stone-200 dark:border-stone-600 text-stone-600 dark:text-stone-300 hover:bg-stone-50 dark:hover:bg-stone-600 hover:border-stone-300 dark:hover:border-stone-500 transition-all shadow-sm"
              title="Generate random sequence (uniform distribution)"
            >
              🎲 Uniform
            </button>
            <button
              onClick={() => onRegenerate(true)}
              className="px-3 py-1.5 rounded-lg text-[10px] font-bold bg-white dark:bg-stone-700 border border-stone-200 dark:border-stone-600 text-stone-600 dark:text-stone-300 hover:bg-stone-50 dark:hover:bg-stone-600 hover:border-stone-300 dark:hover:border-stone-500 transition-all shadow-sm"
              title="Generate sequence with guaranteed majority"
            >
              🎲 Majority
            </button>
          </div>

          <div className="ml-auto">
            <button
              onClick={toggleEdit}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all duration-200 shadow-sm ${
                isEditing
                  ? "bg-stone-800 text-stone-200 dark:bg-stone-200 dark:text-stone-800 ring-2 ring-stone-900/10 dark:ring-stone-100/20"
                  : "bg-stone-100 border border-transparent text-stone-500 hover:bg-stone-200 dark:bg-stone-700 dark:text-stone-400 dark:hover:bg-stone-600"
              }`}
            >
              {isEditing ? (
                <>
                  <svg
                    width="10"
                    height="10"
                    viewBox="0 0 16 16"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <polyline points="2 8 6 12 14 4" />
                  </svg>
                  <span>Done</span>
                </>
              ) : (
                <>
                  <svg
                    width="10"
                    height="10"
                    viewBox="0 0 16 16"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                  >
                    <path d="M11.5 1.5l3 3L5 14H2v-3L11.5 1.5z" />
                  </svg>
                  <span>Manual Edit</span>
                </>
              )}
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
                className="flex flex-col md:flex-row gap-4 p-3 rounded-xl bg-stone-50 border border-stone-100 dark:bg-stone-800/50 dark:border-stone-700/50 transition-colors"
              >
                {/* Partition shapes */}
                <div className="flex flex-col gap-2 flex-1">
                  <span className="text-[10px] font-bold text-stone-400 dark:text-stone-500 uppercase tracking-widest pl-1">
                    Partition {idx + 1}
                  </span>
                  <div className="flex flex-wrap gap-2 items-center">
                    {part.map((s, i) => (
                      <div
                        key={i}
                        onClick={
                          isEditing ? () => cycleShape(idx, i) : undefined
                        }
                        className={`
                                group relative flex items-center justify-center p-1.5 rounded-lg border bg-white dark:bg-stone-900 dark:border-stone-700 shadow-sm transition-all
                                ${isEditing ? "cursor-pointer hover:border-amber-400 hover:scale-110 active:scale-95 z-10" : "border-stone-200"}
                            `}
                      >
                        <ShapeSVG shape={s} size={20} />
                        {isEditing && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              removeShape(idx, i);
                            }}
                            className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-red-500 text-white flex items-center justify-center text-[10px] hover:scale-125 transition-all shadow-sm z-20"
                          >
                            ×
                          </button>
                        )}
                      </div>
                    ))}
                    {isEditing && (
                      <button
                        onClick={() => addShape(idx)}
                        className="w-8 h-8 rounded-lg border-2 border-dashed border-stone-300 dark:border-stone-600 text-stone-400 hover:text-amber-500 hover:border-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/20 flex items-center justify-center transition-all"
                      >
                        +
                      </button>
                    )}
                  </div>
                </div>

                {/* Arrow */}
                <div className="text-stone-300 dark:text-stone-600 hidden md:flex items-center justify-center text-lg">
                  →
                </div>

                {/* Local Result: 2x2 Grid for perfect alignment of labels and content */}
                <div className="grid grid-cols-[auto_auto] gap-x-8 gap-y-1 px-4 py-2 shrink-0">
                  <span className="text-[10px] font-bold text-stone-400 dark:text-stone-500 uppercase tracking-wider text-center">
                    Candidate
                  </span>
                  <span className="text-[10px] font-bold text-stone-400 dark:text-stone-500 uppercase tracking-wider text-center">
                    Strength
                  </span>

                  <div className="flex items-center justify-center min-h-[36px]">
                    {summary.candidate ? (
                      <ShapeSVG shape={summary.candidate} size={26} />
                    ) : (
                      <div className="w-8 h-8 rounded-lg border-2 border-dashed border-stone-300 dark:border-stone-600 flex items-center justify-center">
                        <span className="text-sm text-stone-400 dark:text-stone-600">
                          ?
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-center min-h-[36px]">
                    <span className="text-3xl font-black tabular-nums text-stone-600 dark:text-stone-300 leading-none">
                      {summary.count}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </CheeseCard>

      {/* Merge Result Section */}
      <CheeseCard variant="default" className="!p-5">
        <div className="text-xs font-bold text-stone-500 dark:text-stone-400 uppercase tracking-widest mb-4 text-center">
          Global Merge Result
        </div>

        {/* Candidate + Strength (same style as MajorityVote) */}
        <div className="flex justify-center gap-8 mb-5">
          <div className="flex flex-col items-center gap-1">
            <span className="text-[10px] font-bold text-stone-400 dark:text-stone-500 uppercase tracking-wider">
              Candidate
            </span>
            {finalSummary.candidate ? (
              <ShapeSVG shape={finalSummary.candidate} size={44} />
            ) : (
              <div className="w-11 h-11 rounded-xl border-2 border-dashed border-stone-200 dark:border-stone-600 flex items-center justify-center">
                <span className="text-stone-300 dark:text-stone-600 text-xs italic">
                  ?
                </span>
              </div>
            )}
          </div>
          <div className="flex flex-col items-center gap-1">
            <span className="text-[10px] font-bold text-stone-400 dark:text-stone-500 uppercase tracking-wider">
              Strength
            </span>
            <span className="text-4xl font-black tabular-nums text-stone-600 dark:text-stone-300">
              {finalSummary.count}
            </span>
          </div>
        </div>

        {/* Result analysis (same as MajorityVote finished state) */}
        {(() => {
          const totalN = partitions.flat().length;
          const candidateCount = finalSummary.candidate
            ? partitions
                .flat()
                .filter((s) => s.type === finalSummary.candidate!.type).length
            : 0;
          const minCount = finalSummary.count;
          const maxCount =
            finalSummary.count + Math.floor((totalN - finalSummary.count) / 2);

          if (!finalSummary.candidate) {
            return (
              <div className="text-center text-stone-500 dark:text-stone-400 italic text-sm">
                No candidate survived (total tie)
              </div>
            );
          }

          return (
            <div className="border-t border-stone-100 dark:border-stone-700 pt-4">
              {/* Actual count */}
              <div className="flex items-center justify-center gap-2 py-1 px-3 bg-stone-100 dark:bg-stone-800 rounded-lg text-xs mx-auto w-fit">
                <span className="text-stone-500 dark:text-stone-400 uppercase tracking-wider font-bold">
                  Actual Count:
                </span>
                <span
                  className={`font-mono font-bold text-sm ${
                    candidateCount > totalN / 2
                      ? "text-emerald-600 dark:text-emerald-400"
                      : "text-stone-700 dark:text-stone-300"
                  }`}
                >
                  {candidateCount}
                </span>
                <span className="text-stone-400 dark:text-stone-500">
                  / {totalN}
                </span>
                {candidateCount > totalN / 2 && (
                  <span className="text-emerald-600 dark:text-emerald-400 text-[10px] font-bold">
                    ✓ Majority
                  </span>
                )}
                {candidateCount <= totalN / 2 && (
                  <span className="text-amber-600 dark:text-amber-500 text-[10px] font-bold">
                    Not majority
                  </span>
                )}
              </div>

              {/* Estimated range */}
              <div className="mt-4">
                <div className="text-xs font-bold text-stone-600 dark:text-stone-300 mb-2 text-center">
                  Without a second pass, the true count is bounded:
                </div>
                <div className="flex items-center justify-center gap-4">
                  <div className="flex flex-col items-center">
                    <span className="text-[10px] text-stone-400 uppercase font-bold">
                      Min
                    </span>
                    <span className="text-xl font-mono font-black text-amber-700 dark:text-amber-400">
                      {minCount}
                    </span>
                  </div>
                  <div className="text-stone-300 dark:text-stone-600 text-lg">
                    {"<="} actual {"<="}
                  </div>
                  <div className="flex flex-col items-center">
                    <span className="text-[10px] text-stone-400 dark:text-stone-500 uppercase font-bold">
                      Max
                    </span>
                    <span className="text-xl font-mono font-black text-amber-700 dark:text-amber-400">
                      {maxCount}
                    </span>
                  </div>
                </div>
                <div className="text-[10px] text-stone-400 mt-2 font-mono text-center">
                  count in [{minCount}, {maxCount}] out of {totalN}
                </div>
                <div className="mt-2 mx-auto max-w-xs">
                  <div className="relative h-4 bg-stone-100 dark:bg-stone-800 rounded-full overflow-hidden border border-stone-200 dark:border-stone-700">
                    <div
                      className="absolute inset-y-0 border-l-2 border-dashed border-red-400/50 z-0"
                      style={{ left: "50%" }}
                    />
                    <div
                      className="absolute inset-y-0 bg-amber-400 dark:bg-amber-500 rounded-full z-10"
                      style={{
                        left: `${(minCount / totalN) * 100}%`,
                        width: `${((maxCount - minCount) / totalN) * 100}%`,
                      }}
                    />
                  </div>
                  <div className="relative flex justify-between text-[9px] text-stone-400 mt-0.5">
                    <span>0</span>
                    <span className="absolute left-1/2 -translate-x-1/2 text-red-400 font-bold">
                      N/2
                    </span>
                    <span>N={totalN}</span>
                  </div>
                </div>
              </div>
            </div>
          );
        })()}
      </CheeseCard>
    </div>
  );
};
