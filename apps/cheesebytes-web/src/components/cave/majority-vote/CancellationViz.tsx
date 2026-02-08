import React, {
  useState,
  useMemo,
  useCallback,
  useEffect,
  useRef,
} from "react";
import { SHAPES, ShapeSVG } from "./MajorityVote";
import type { Shape } from "./MajorityVote";
import { CheeseCard, CheeseButton } from "../shared/CheeseUI";

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

function generateWithMajority(length: number): Shape[] {
  // Pick a majority shape and give it ~60% presence
  const majority = SHAPES[Math.floor(Math.random() * SHAPES.length)];
  const seq: Shape[] = [];
  const majCount = Math.floor(length * 0.58) + 1; // guarantee > N/2

  for (let i = 0; i < majCount; i++) seq.push(majority);
  for (let i = majCount; i < length; i++) {
    const others = SHAPES.filter((s) => s.type !== majority.type);
    seq.push(others[Math.floor(Math.random() * others.length)]);
  }

  // Shuffle (Fisher-Yates)
  for (let i = seq.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [seq[i], seq[j]] = [seq[j], seq[i]];
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
    generateWithMajority(16),
  );
  const [step, setStep] = useState(0); // 0 = initial, 1 = paired, 2 = cancelled
  const [isAnimating, setIsAnimating] = useState(false);
  const animRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { pairs, survivors } = useMemo(
    () => computeCancellations(sequence),
    [sequence],
  );

  const regenerate = useCallback(() => {
    const seq = generateWithMajority(length);
    setSequence(seq);
    setStep(0);
    setIsAnimating(false);
    if (animRef.current) clearTimeout(animRef.current);
  }, [length]);

  useEffect(() => {
    regenerate();
  }, [length, regenerate]);

  const animate = useCallback(() => {
    setIsAnimating(true);
    setStep(1);
    animRef.current = setTimeout(() => {
      setStep(2);
      setIsAnimating(false);
    }, 1200);
  }, []);

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

            return (
              <div
                key={idx}
                className={`
                  relative flex items-center justify-center
                  w-10 h-10 rounded-xl border-2
                  transition-all duration-700
                  ${
                    cancelled
                      ? "opacity-10 scale-75 border-stone-200 bg-stone-100 dark:border-stone-800 dark:bg-stone-900"
                      : showPair
                        ? `${pairColors[pi! % pairColors.length]} scale-100`
                        : isSurvivor && step >= 1
                          ? "border-amber-400 bg-amber-50 dark:border-amber-500 dark:bg-amber-900/40 shadow-md scale-110"
                          : "border-stone-200 bg-white dark:border-stone-700 dark:bg-stone-800"
                  }
                `}
              >
                <ShapeSVG shape={shape} size={22} />
                {cancelled && (
                  <div className="absolute inset-0 flex items-center justify-center text-red-400 dark:text-red-500 text-xl font-bold">
                    ✕
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Pair matchups */}
        {step >= 1 && pairs.length > 0 && (
          <div className="mt-3 pt-3 border-t border-stone-100 dark:border-stone-700">
            <div className="text-xs font-bold text-stone-500 dark:text-stone-400 uppercase tracking-wider mb-2">
              Cancelling Pairs ({pairs.length})
            </div>
            <div className="flex flex-wrap gap-2 justify-center">
              {pairs.map((pair, pi) => (
                <div
                  key={pi}
                  className={`
                    flex items-center gap-1 px-2 py-1 rounded-lg border-2
                    transition-all duration-500
                    ${
                      step >= 2
                        ? "opacity-30 line-through border-stone-200 bg-stone-50 dark:border-stone-800 dark:bg-stone-900"
                        : `${pairColors[pi % pairColors.length]}`
                    }
                  `}
                >
                  <ShapeSVG shape={pair.a.shape} size={18} />
                  <span className="text-stone-400 dark:text-stone-500 text-xs">
                    ⚔
                  </span>
                  <ShapeSVG shape={pair.b.shape} size={18} />
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

      {/* Controls */}
      <div className="flex flex-col items-center gap-2">
        <div className="flex items-center gap-2 p-2 bg-stone-50 dark:bg-stone-800 rounded-lg border border-stone-200 dark:border-stone-700">
          <label className="text-xs font-bold text-stone-500 dark:text-stone-400 uppercase">
            Size:
          </label>
          <input
            type="range"
            min="8"
            max="40"
            value={length}
            onChange={(e) => setLength(Number(e.target.value))}
            className="w-32 h-2 bg-stone-200 dark:bg-stone-600 rounded-lg appearance-none cursor-pointer accent-amber-500"
          />
          <span className="text-xs font-mono font-bold w-6 text-right text-stone-600 dark:text-stone-300">
            {length}
          </span>
        </div>
        <div className="flex gap-2">
          <CheeseButton
            variant="primary"
            size="sm"
            onClick={animate}
            disabled={isAnimating || step >= 2}
          >
            {step === 0
              ? "⚔ Show Cancellations"
              : step === 1
                ? "Cancelling..."
                : "✓ Done"}
          </CheeseButton>
          <CheeseButton variant="secondary" size="sm" onClick={regenerate}>
            ↺ New Sequence
          </CheeseButton>
        </div>
      </div>
    </div>
  );
};
