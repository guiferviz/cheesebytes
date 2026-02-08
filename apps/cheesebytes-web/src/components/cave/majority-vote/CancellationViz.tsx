import React, {
  useState,
  useMemo,
  useCallback,
  useEffect,
  useRef,
} from "react";
import { SHAPES, ShapeSVG } from "./MajorityVote";
import type { Shape } from "./MajorityVote";
import { CheeseCard } from "../shared/CheeseUI";

// ===========================================
// TYPES
// ===========================================

interface Pair {
  a: { shape: Shape; originalIdx: number };
  b: { shape: Shape; originalIdx: number };
}

// ===========================================
// HELPERS
// ===========================================

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

function computeCancellations(seq: Shape[]) {
  // Greedily pair up distinct elements
  const items = seq.map((shape, i) => ({
    shape,
    originalIdx: i,
    cancelled: false,
  }));

  const pairs: Pair[] = [];
  const survivors: { shape: Shape; originalIdx: number }[] = [];

  // Simple greedy: scan for the first uncancelled item of a different type
  const remaining = [...items];

  while (remaining.length > 0) {
    const a = remaining.shift()!;
    const partnerIdx = remaining.findIndex(
      (b) => b.shape.type !== a.shape.type,
    );
    if (partnerIdx >= 0) {
      const b = remaining.splice(partnerIdx, 1)[0];
      pairs.push({
        a: { shape: a.shape, originalIdx: a.originalIdx },
        b: { shape: b.shape, originalIdx: b.originalIdx },
      });
    } else {
      survivors.push({ shape: a.shape, originalIdx: a.originalIdx });
    }
  }

  return { pairs, survivors };
}

// ===========================================
// COMPONENT
// ===========================================

export const CancellationViz: React.FC = () => {
  const [length, setLength] = useState(16);
  const [sequence, setSequence] = useState<Shape[]>(() =>
    generateSequence(16, true),
  );
  const [step, setStep] = useState(0); // 0 = initial, 1 = paired, 2 = cancelled
  const [isAnimating, setIsAnimating] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const animRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [hoveredPairIndex, setHoveredPairIndex] = useState<number | null>(null);

  const { pairs, survivors } = useMemo(
    () => computeCancellations(sequence),
    [sequence],
  );

  const regenerate = useCallback(
    (majority: boolean) => {
      const seq = generateSequence(length, majority);
      setSequence(seq);
      setStep(0);
      setIsEditing(false);
      setIsAnimating(false);
      if (animRef.current) clearTimeout(animRef.current);
    },
    [length],
  );

  const handleSizeChange = useCallback((newSize: number) => {
    setLength(newSize);
    setStep(0);
    setIsAnimating(false);
    if (animRef.current) clearTimeout(animRef.current);
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
  }, []);

  const toggleEdit = useCallback(() => {
    setIsEditing((prev) => !prev);
    setStep(0); // Reset animation when editing
    setIsAnimating(false);
    if (animRef.current) clearTimeout(animRef.current);
  }, []);

  const removeShape = useCallback((idx: number) => {
    setSequence((prev) => prev.filter((_, i) => i !== idx));
    setStep(0);
  }, []);

  const cycleShape = useCallback((idx: number) => {
    setSequence((prev) => {
      const next = [...prev];
      const ci = SHAPES.findIndex((s) => s.type === next[idx].type);
      next[idx] = SHAPES[(ci + 1) % SHAPES.length];
      return next;
    });
    setStep(0);
  }, []);

  const animate = useCallback(() => {
    setIsAnimating(true);
    setStep(1);
    animRef.current = setTimeout(() => {
      setStep(2);
      setIsAnimating(false);
    }, 1200);
  }, []);

  // Update length state if sequence length changes due to editing
  useEffect(() => {
    setLength(sequence.length);
  }, [sequence.length]);

  // Build lookup: which original indices are in which pair?
  const pairMap = useMemo(() => {
    const m = new Map<number, number>(); // originalIdx -> pairIndex
    pairs.forEach((p, pi) => {
      m.set(p.a.originalIdx, pi);
      m.set(p.b.originalIdx, pi);
    });
    return m;
  }, [pairs]);

  const survivorSet = useMemo(
    () => new Set(survivors.map((s) => s.originalIdx)),
    [survivors],
  );

  // Color palette for pair highlighting
  const pairColors = [
    "border-red-300 bg-red-50 dark:border-red-700 dark:bg-red-900/30",
    "border-blue-300 bg-blue-50 dark:border-blue-700 dark:bg-blue-900/30",
    "border-purple-300 bg-purple-50 dark:border-purple-700 dark:bg-purple-900/30",
    "border-teal-300 bg-teal-50 dark:border-teal-700 dark:bg-teal-900/30",
    "border-pink-300 bg-pink-50 dark:border-pink-700 dark:bg-pink-900/30",
    "border-indigo-300 bg-indigo-50 dark:border-indigo-700 dark:bg-indigo-900/30",
    "border-cyan-300 bg-cyan-50 dark:border-cyan-700 dark:bg-cyan-900/30",
    "border-orange-300 bg-orange-50 dark:border-orange-700 dark:bg-orange-900/30",
    "border-lime-300 bg-lime-50 dark:border-lime-700 dark:bg-lime-900/30",
    "border-fuchsia-300 bg-fuchsia-50 dark:border-fuchsia-700 dark:bg-fuchsia-900/30",
  ];

  return (
    <div className="flex flex-col gap-4 select-none">
      <CheeseCard variant="default" className="!p-4">
        {/* Toolbar: Size, Buttons, Edit */}
        {step === 0 && (
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
                value={length}
                onChange={(e) => handleSizeChange(Number(e.target.value))}
                className="w-24 h-1.5 bg-stone-200 dark:bg-stone-600 rounded-full appearance-none cursor-pointer accent-amber-500"
              />
              <span className="text-[10px] font-mono font-bold text-stone-500 dark:text-stone-400 w-5 text-right">
                {length}
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
                className="px-3 py-1.5 rounded-lg text-[10px] font-bold bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/40 hover:border-amber-300 dark:hover:border-amber-700 transition-all shadow-sm"
                title="Generate sequence with guaranteed majority"
              >
                🎲 Majority
              </button>
            </div>

            {/* Edit Button */}
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
        )}

        <div className="text-xs font-bold text-stone-500 dark:text-stone-400 uppercase tracking-wider mb-3">
          Sequence ({sequence.length} elements)
        </div>

        {/* Original sequence with pair highlighting */}
        <div className="flex flex-wrap gap-2 justify-center mb-4">
          {sequence.map((shape, idx) => {
            const pi = pairMap.get(idx);
            const isSurvivor = survivorSet.has(idx);
            const isPaired = pi !== undefined;
            const showPair = step >= 1 && isPaired;
            const cancelled = step >= 2 && isPaired;
            const isHovered = pi !== undefined && pi === hoveredPairIndex;

            return (
              <div
                key={idx}
                onClick={isEditing ? () => cycleShape(idx) : undefined}
                className={`
                  group relative flex items-center justify-center
                  w-10 h-10 rounded-xl border-2
                  transition-all duration-300
                  ${
                    isEditing
                      ? "cursor-pointer hover:scale-110 hover:shadow-lg active:scale-95"
                      : ""
                  }
                  ${
                    isHovered
                      ? "scale-125 z-20 shadow-xl ring-2 ring-offset-2 ring-amber-400 dark:ring-amber-500"
                      : ""
                  }
                  ${
                    showPair
                      ? `${pairColors[pi! % pairColors.length]} ${
                          cancelled ? "" : "scale-100"
                        }`
                      : isSurvivor && step >= 1
                        ? "border-amber-400 bg-amber-50 dark:border-amber-500 dark:bg-amber-900/40 shadow-md shadow-amber-200/30 dark:shadow-amber-900/30 scale-110"
                        : "border-stone-200 bg-white dark:border-stone-700 dark:bg-stone-800"
                  }
                  ${
                    cancelled && !isHovered
                      ? "scale-90 opacity-90 grayscale-[0.3]"
                      : ""
                  }
                `}
              >
                <ShapeSVG shape={shape} size={22} className="" />
                {isEditing && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      removeShape(idx);
                    }}
                    className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-red-500 text-white flex items-center justify-center text-[10px] hover:scale-125 transition-all shadow-sm z-20"
                  >
                    ×
                  </button>
                )}
                {/* Removed the strikethrough logic here */}
              </div>
            );
          })}

          {isEditing && (
            <button
              onClick={() => {
                setSequence((prev) => [
                  ...prev,
                  SHAPES[Math.floor(Math.random() * SHAPES.length)],
                ]);
              }}
              className="w-10 h-10 rounded-xl border-2 border-dashed border-stone-300 dark:border-stone-700 flex items-center justify-center text-stone-400 hover:bg-stone-50 dark:hover:bg-stone-800 hover:border-amber-400 transition-all"
            >
              +
            </button>
          )}
        </div>

        {/* Pair matchups */}
        {step >= 1 && pairs.length > 0 && (
          <div className="mt-3 pt-3 border-t border-stone-100 dark:border-stone-700">
            <div className="text-xs font-bold text-stone-500 dark:text-stone-400 uppercase tracking-wider mb-2">
              Cancelling Pairs ({pairs.length})
              <span className="ml-2 normal-case font-normal text-[10px] text-amber-600 dark:text-amber-500 bg-amber-50 dark:bg-amber-900/30 px-2 py-0.5 rounded-full border border-amber-100 dark:border-amber-800">
                Note: In each cancelled pair, at most one item can be the
                majority candidate.
              </span>
            </div>
            <div className="flex flex-wrap gap-2 justify-center">
              {pairs.map((pair, pi) => (
                <div
                  key={pi}
                  onMouseEnter={() => setHoveredPairIndex(pi)}
                  onMouseLeave={() => setHoveredPairIndex(null)}
                  className={`
                    relative flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border-2 cursor-pointer
                    transition-all duration-300 hover:scale-110 hover:shadow-md hover:z-10
                    ${
                      step >= 2
                        ? `${pairColors[pi % pairColors.length]} opacity-80`
                        : `${pairColors[pi % pairColors.length]}`
                    }
                  `}
                >
                  <ShapeSVG shape={pair.a.shape} size={20} />
                  <span className="text-stone-400 dark:text-stone-500 text-xs font-bold">
                    ⚔
                  </span>
                  <ShapeSVG shape={pair.b.shape} size={20} />
                  {/* Removed the red line strike-through */}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Survivors */}
        {step >= 2 && (
          <div className="mt-4 pt-3 border-t-2 border-dashed border-amber-200 dark:border-amber-800">
            <div className="text-xs font-bold text-amber-600 dark:text-amber-500 uppercase tracking-wider mb-2">
              🏆 Survivors ({survivors.length})
            </div>
            <div className="flex flex-wrap gap-2 justify-center">
              {survivors.map((s, i) => (
                <div
                  key={i}
                  className="flex items-center justify-center w-10 h-10 rounded-xl border-2 border-amber-400 bg-amber-50 dark:border-amber-600 dark:bg-amber-900/40 shadow-sm"
                  style={{ animation: "shapePop 0.3s ease-out forwards" }}
                >
                  <ShapeSVG shape={s.shape} size={22} />
                </div>
              ))}
            </div>
            <div className="text-center text-sm text-stone-600 dark:text-stone-300 mt-3">
              {survivors.length > 0 ? (
                <>
                  All {survivors.length} survivors are{" "}
                  <strong className="text-amber-700 dark:text-amber-400">
                    {survivors[0].shape.label}
                  </strong>
                  . With {sequence.length} elements and {pairs.length}{" "}
                  cancellations, the majority cannot be defeated.
                </>
              ) : (
                "No survivors — no majority exists."
              )}
            </div>
          </div>
        )}
      </CheeseCard>

      {/* Action Button */}
      {step === 0 && !isEditing && (
        <div className="flex justify-center">
          <button
            onClick={animate}
            disabled={isAnimating}
            className="px-5 py-2 rounded-xl text-sm font-bold bg-amber-500 text-white hover:bg-amber-600 dark:bg-amber-600 dark:hover:bg-amber-500 shadow-md hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            ⚔ Show Cancellations
          </button>
        </div>
      )}
      {step >= 2 && (
        <div className="flex justify-center">
          <button
            onClick={() => {
              setStep(0);
            }}
            className="px-4 py-1.5 rounded-lg text-xs font-bold bg-stone-100 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-stone-700 transition-all"
          >
            ↺ Reset
          </button>
        </div>
      )}
    </div>
  );
};
