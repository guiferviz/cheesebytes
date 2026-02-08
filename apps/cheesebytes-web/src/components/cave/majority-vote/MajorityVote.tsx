import React, { useState, useCallback, useRef, useEffect } from "react";
import { CheeseControlBar, CheeseCard } from "../shared/CheeseUI";
import { CHEESE_ANIMATIONS } from "../shared/theme";
import { ARTICLE_SEQUENCE, SHAPES } from "./MajorityVoteConstants";
import type { Shape } from "./MajorityVoteConstants";

export { SHAPES };
export type { Shape };

// ===========================================
// TYPES & EXPORTS
// ===========================================

export const ShapeSVG: React.FC<{
  shape: Shape | null;
  size?: number;
  className?: string;
}> = ({ shape, size = 28, className = "" }) => {
  const half = size / 2;

  if (!shape) {
    return (
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className={className}
      >
        <rect
          x={1.5}
          y={1.5}
          width={size - 3}
          height={size - 3}
          rx={4}
          fill="none"
          stroke="#d6d3d1"
          strokeWidth="2"
          strokeDasharray="3 3"
        />
        <text
          x="50%"
          y="55%"
          textAnchor="middle"
          dominantBaseline="middle"
          fontSize={size * 0.6}
          fontWeight="bold"
          fill="#d6d3d1"
        >
          ?
        </text>
      </svg>
    );
  }

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      className={className}
    >
      {shape.type === "circle" && (
        <circle cx={half} cy={half} r={half - 2} fill={shape.color} />
      )}
      {shape.type === "square" && (
        <rect
          x={2}
          y={2}
          width={size - 4}
          height={size - 4}
          rx={3}
          fill={shape.color}
        />
      )}
      {shape.type === "triangle" && (
        <polygon
          points={`${half},2 ${size - 2},${size - 2} 2,${size - 2}`}
          fill={shape.color}
        />
      )}
      {shape.type === "diamond" && (
        <polygon
          points={`${half},2 ${size - 2},${half} ${half},${size - 2} 2,${half}`}
          fill={shape.color}
        />
      )}
    </svg>
  );
};

function generateSequence(length: number, forceMajority: boolean): Shape[] {
  const seq: Shape[] = [];
  const majorityShape = SHAPES[Math.floor(Math.random() * SHAPES.length)];
  for (let i = 0; i < length; i++) {
    if (forceMajority && Math.random() < 0.6) {
      seq.push(majorityShape);
    } else {
      seq.push(SHAPES[Math.floor(Math.random() * SHAPES.length)]);
    }
  }
  return seq;
}

function isSameShape(a: Shape | null, b: Shape | null): boolean {
  if (!a || !b) return false;
  return a.type === b.type;
}

// ===========================================
// MAIN COMPONENT
// ===========================================

interface MajorityVoteProps {
  initialMajority?: boolean;
}

export const MajorityVote: React.FC<MajorityVoteProps> = ({
  initialMajority = true,
}) => {
  const [sequence, setSequence] = useState<Shape[]>(() => ARTICLE_SEQUENCE);
  const [currentIndex, setCurrentIndex] = useState(-1);
  const [candidate, setCandidate] = useState<Shape | null>(null);
  const [count, setCount] = useState(0);
  const [isFinished, setIsFinished] = useState(false);

  const [isPlaying, setIsPlaying] = useState(false);
  const playIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [desiredSize, setDesiredSize] = useState(12);

  const resetAlgorithmState = useCallback(() => {
    setCurrentIndex(-1);
    setCandidate(null);
    setCount(0);
    setIsFinished(false);
    setIsPlaying(false);
    if (playIntervalRef.current) {
      clearInterval(playIntervalRef.current);
      playIntervalRef.current = null;
    }
  }, []);

  const regenerate = useCallback(
    (majority: boolean) => {
      const newSeq = generateSequence(desiredSize, majority);
      setSequence(newSeq);
      resetAlgorithmState();
    },
    [desiredSize, resetAlgorithmState],
  );

  const toggleEdit = useCallback(() => {
    setIsEditing((prev) => {
      if (!prev) resetAlgorithmState();
      return !prev;
    });
  }, [resetAlgorithmState]);

  const removeShape = useCallback((idx: number) => {
    setSequence((prev) => prev.filter((_, i) => i !== idx));
  }, []);

  const cycleShape = useCallback((idx: number) => {
    setSequence((prev) => {
      const next = [...prev];
      const ci = SHAPES.findIndex((s) => s.type === next[idx].type);
      next[idx] = SHAPES[(ci + 1) % SHAPES.length];
      return next;
    });
  }, []);

  const handleSizeChange = useCallback(
    (newSize: number) => {
      setDesiredSize(newSize);
      resetAlgorithmState();
      setSequence((prev) => {
        if (newSize > prev.length) {
          const extra: Shape[] = [];
          for (let i = 0; i < newSize - prev.length; i++) {
            extra.push(SHAPES[Math.floor(Math.random() * SHAPES.length)]);
          }
          return [...prev, ...extra];
        } else if (newSize < prev.length) {
          return prev.slice(0, newSize);
        }
        return prev;
      });
    },
    [resetAlgorithmState],
  );

  const step = useCallback(() => {
    if (isFinished) return;
    const nextIdx = currentIndex + 1;
    if (nextIdx >= sequence.length) {
      setIsFinished(true);
      setIsPlaying(false);
      if (playIntervalRef.current) {
        clearInterval(playIntervalRef.current);
        playIntervalRef.current = null;
      }
      return;
    }
    setCurrentIndex(nextIdx);
    const current = sequence[nextIdx];
    if (count === 0) {
      setCandidate(current);
      setCount(1);
    } else if (isSameShape(candidate, current)) {
      setCount((c) => c + 1);
    } else {
      setCount((c) => c - 1);
    }
  }, [currentIndex, sequence, count, candidate, isFinished]);

  useEffect(() => {
    if (isPlaying && !isFinished) {
      playIntervalRef.current = setInterval(() => step(), 700);
      return () => {
        if (playIntervalRef.current) clearInterval(playIntervalRef.current);
      };
    }
  }, [isPlaying, isFinished, step]);

  const togglePlay = useCallback(() => {
    if (isFinished) return;
    setIsPlaying((p) => !p);
  }, [isFinished]);

  useEffect(() => {
    setDesiredSize(sequence.length);
  }, [sequence.length]);

  return (
    <>
      <style>{CHEESE_ANIMATIONS}</style>
      <style>{`
        @keyframes shapePop {
          0% { transform: scale(0.5); opacity: 0; }
          70% { transform: scale(1.1); }
          100% { transform: scale(1); opacity: 1; }
        }
        .anim-pop { animation: shapePop 0.3s ease-out forwards; }
      `}</style>

      <div className="flex flex-col gap-10 select-none not-prose">
        {/* ===== INPUT SEQUENCE ===== */}
        <CheeseCard variant="default" className="!p-4">
          {/* Inputs Toolbar: Always visible when not playing (to allow setup) */}
          {!isPlaying && (
            <div className="flex flex-wrap items-center gap-3 mb-4 p-2.5 rounded-xl bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700">
              {/* Size Slider */}
              <div className="flex items-center gap-2 px-2">
                <label className="text-[10px] font-bold text-stone-400 dark:text-stone-500 uppercase">
                  Size
                </label>
                <input
                  type="range"
                  min="3"
                  max="50"
                  value={desiredSize}
                  onChange={(e) => handleSizeChange(Number(e.target.value))}
                  className="w-24 h-1.5 bg-stone-200 dark:bg-stone-600 rounded-full appearance-none cursor-pointer accent-amber-500"
                />
                <span className="text-[10px] font-mono font-bold text-stone-500 dark:text-stone-400 w-5 text-right">
                  {desiredSize}
                </span>
              </div>

              <div className="w-px h-6 bg-stone-200 dark:bg-stone-700 mx-1" />

              {/* Random Buttons */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => regenerate(false)}
                  className="px-3 py-1.5 rounded-lg text-[10px] font-bold bg-white dark:bg-stone-700 border border-stone-200 dark:border-stone-600 text-stone-600 dark:text-stone-300 hover:bg-stone-50 dark:hover:bg-stone-600 hover:border-stone-300 dark:hover:border-stone-500 transition-all shadow-sm"
                  title="Generate random sequence (uniform distribution)"
                >
                  🎲 Uniform
                </button>
                <button
                  onClick={() => regenerate(true)}
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
                  title={isEditing ? "Finish editing" : "Manually edit items"}
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
          )}

          {/* Header (when playing, just show title) */}
          {isPlaying && (
            <div className="flex items-center gap-2 mb-3">
              <div className="text-xs font-bold text-stone-500 dark:text-stone-400 uppercase tracking-wider">
                Input Sequence
                <span className="ml-1 text-stone-400 dark:text-stone-500 normal-case font-normal">
                  ({currentIndex + 1} / {sequence.length})
                </span>
              </div>
            </div>
          )}

          {/* Shape items */}
          <div className="flex flex-wrap gap-2 justify-center">
            {sequence.map((shape, idx) => {
              if (isEditing) {
                return (
                  <div
                    key={`edit-${idx}`}
                    className="relative flex items-center justify-center w-10 h-10 rounded-xl border-2 border-stone-200 dark:border-stone-600 bg-white dark:bg-stone-800 group cursor-pointer hover:border-amber-300 dark:hover:border-amber-500 transition-all"
                    onClick={() => cycleShape(idx)}
                    title="Click to change shape"
                  >
                    <ShapeSVG shape={shape} size={22} />
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        removeShape(idx);
                      }}
                      className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-red-400 hover:bg-red-500 text-white rounded-full flex items-center justify-center shadow-sm opacity-0 group-hover:opacity-100 transition-opacity"
                      title="Remove"
                    >
                      <svg
                        width="8"
                        height="8"
                        viewBox="0 0 12 12"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                      >
                        <line x1="3" y1="3" x2="9" y2="9" />
                        <line x1="9" y1="3" x2="3" y2="9" />
                      </svg>
                    </button>
                  </div>
                );
              }

              const isProcessed =
                idx < currentIndex || (isFinished && idx <= currentIndex);
              const isCurrent = !isFinished && idx === currentIndex;
              const isPending = idx > currentIndex;
              return (
                <div
                  key={`run-${idx}`}
                  className={`relative flex items-center justify-center w-10 h-10 rounded-xl border-2 transition-all duration-300 ${
                    isCurrent
                      ? "border-amber-400 bg-amber-50 dark:bg-amber-900/30 shadow-md scale-110 z-10"
                      : ""
                  } ${isProcessed ? "border-stone-200 dark:border-stone-700 bg-stone-100 dark:bg-stone-800 opacity-40 scale-90" : ""} ${
                    isPending
                      ? "border-stone-200 dark:border-stone-600 bg-white dark:bg-stone-800"
                      : ""
                  }`}
                >
                  <ShapeSVG shape={shape} size={22} />
                  {isCurrent && (
                    <div className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-amber-400 rounded-full flex items-center justify-center shadow-sm">
                      <svg
                        width="8"
                        height="8"
                        viewBox="0 0 16 16"
                        fill="white"
                      >
                        <circle cx="8" cy="8" r="3" />
                      </svg>
                    </div>
                  )}
                  {isProcessed && (
                    <div className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-emerald-400 dark:bg-emerald-600 rounded-full flex items-center justify-center">
                      <svg
                        width="7"
                        height="7"
                        viewBox="0 0 16 16"
                        fill="none"
                        stroke="white"
                        strokeWidth="3"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <polyline points="3 8 6.5 12 13 4" />
                      </svg>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </CheeseCard>

        {/* ===== STATE: Candidate & Strength (two separate centered divs) ===== */}
        <div className="flex justify-center gap-6">
          <div className="flex flex-col items-center gap-1">
            <span className="text-[10px] font-bold text-stone-400 dark:text-stone-500 uppercase tracking-wider">
              Candidate
            </span>
            {candidate ? (
              <div className="anim-pop">
                <ShapeSVG shape={candidate} size={34} />
              </div>
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
              {count}
            </span>
          </div>
        </div>

        {/* ===== CONTROLS ===== */}
        <div className="flex flex-col items-center gap-2">
          <CheeseControlBar
            onReset={() => resetAlgorithmState()}
            onStep={step}
            onPlayPause={togglePlay}
            isPlaying={isPlaying}
            isComplete={isFinished}
            canStep={!isPlaying && !isEditing}
            stepLabel="Next"
            resetLabel="Restart"
            size="md"
          />
        </div>

        {/* ===== RESULT ===== */}
        {isFinished && (
          <CheeseCard variant="default">
            {candidate ? (
              <>
                {/* Actual count */}
                <div className="flex items-center justify-center gap-2 py-1 px-3 bg-stone-100 dark:bg-stone-800 rounded-lg text-xs mx-auto w-fit">
                  <span className="text-stone-500 dark:text-stone-400 uppercase tracking-wider font-bold">
                    Actual Count:
                  </span>
                  <span
                    className={`font-mono font-bold text-sm ${
                      sequence.filter((s) => s.type === candidate.type).length >
                      sequence.length / 2
                        ? "text-emerald-600 dark:text-emerald-400"
                        : "text-stone-700 dark:text-stone-300"
                    }`}
                  >
                    {sequence.filter((s) => s.type === candidate.type).length}
                  </span>
                  <span className="text-stone-400 dark:text-stone-500">
                    / {sequence.length}
                  </span>
                  {sequence.filter((s) => s.type === candidate.type).length >
                  sequence.length / 2 ? (
                    <span className="text-emerald-600 dark:text-emerald-400 text-[10px] font-bold">
                      ✓ Majority
                    </span>
                  ) : (
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
                        {count}
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
                        {count + Math.floor((sequence.length - count) / 2)}
                      </span>
                    </div>
                  </div>
                  <div className="text-[10px] text-stone-400 mt-2 font-mono text-center">
                    count in [{count},{" "}
                    {count + Math.floor((sequence.length - count) / 2)}] out of{" "}
                    {sequence.length}
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
                          left: `${(count / sequence.length) * 100}%`,
                          width: `${(Math.floor((sequence.length - count) / 2) / sequence.length) * 100}%`,
                        }}
                      />
                    </div>
                    <div className="relative flex justify-between text-[9px] text-stone-400 mt-0.5">
                      <span>0</span>
                      <span className="absolute left-1/2 -translate-x-1/2 text-red-400 font-bold">
                        N/2
                      </span>
                      <span>N={sequence.length}</span>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div className="text-center text-stone-500 dark:text-stone-400 italic text-sm">
                No candidate survived (total tie)
              </div>
            )}
          </CheeseCard>
        )}
      </div>
    </>
  );
};
