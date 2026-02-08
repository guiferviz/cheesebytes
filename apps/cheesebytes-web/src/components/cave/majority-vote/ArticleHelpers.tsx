import React, { useMemo } from "react";
import { ShapeSVG } from "./MajorityVote";
import { ARTICLE_SEQUENCE } from "./MajorityVoteConstants";
import type { Shape } from "./MajorityVoteConstants";

export { ARTICLE_SEQUENCE };
export type { Shape };

// ===========================================
// PairList — displays hardcoded cancellation pairs
// ===========================================

export const PairList: React.FC<{
  pairs: [Shape | null, Shape | null][];
}> = ({ pairs }) => {
  return (
    <div className="flex flex-col gap-2 items-center py-3 not-prose">
      {pairs.map(([left, right], i) => (
        <div
          key={i}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800/50 w-fit"
        >
          <div className="flex items-center justify-center w-7 h-7">
            <ShapeSVG shape={left} size={18} />
          </div>
          <span className="text-stone-300 dark:text-stone-600 text-[10px] font-bold">
            ×
          </span>
          <div className="flex items-center justify-center w-7 h-7">
            <ShapeSVG shape={right} size={18} />
          </div>
        </div>
      ))}
    </div>
  );
};

// ===========================================
// SurvivorList — displays leftover shapes
// ===========================================

export const SurvivorList: React.FC<{
  survivors: (Shape | null)[];
  /** Optional message below the shapes */
  message?: string;
}> = ({ survivors, message }) => {
  return (
    <div className="not-prose py-3">
      {survivors.length > 0 ? (
        <div className="flex flex-wrap gap-2 justify-center">
          {survivors.map((shape, i) => (
            <div
              key={i}
              className="flex items-center justify-center w-9 h-9 rounded-lg border-2 border-amber-400 bg-amber-50 dark:border-amber-500 dark:bg-amber-900/40 shadow-sm"
            >
              <ShapeSVG shape={shape} size={20} />
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center text-sm text-stone-400 dark:text-stone-500 italic">
          Nothing left — perfect cancellation.
        </div>
      )}
      {message && (
        <div className="text-center text-sm text-stone-600 dark:text-stone-300 mt-2">
          {message}
        </div>
      )}
    </div>
  );
};

// ===========================================
// InlineSequence — shows a row of shapes
// ===========================================

export const InlineSequence: React.FC<{
  sequence?: (Shape | null)[];
  size?: number;
}> = ({ sequence = ARTICLE_SEQUENCE, size = 24 }) => {
  return (
    <div className="flex flex-wrap gap-1.5 justify-center py-3 px-2 rounded-xl not-prose">
      {sequence.map((shape, i) => (
        <div
          key={i}
          className="flex items-center justify-center w-9 h-9 rounded-lg border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 shadow-sm"
        >
          <ShapeSVG shape={shape} size={size} />
        </div>
      ))}
    </div>
  );
};

// ===========================================
// NaiveCounter — dict-style counter display
// ===========================================

export const NaiveCounter: React.FC<{
  sequence?: Shape[];
}> = ({ sequence = ARTICLE_SEQUENCE }) => {
  const counts = useMemo(() => {
    const map = new Map<string, { shape: Shape; count: number }>();
    for (const s of sequence) {
      const entry = map.get(s.type);
      if (entry) {
        entry.count++;
      } else {
        map.set(s.type, { shape: s, count: 0 + 1 });
      }
    }
    return Array.from(map.values()).sort((a, b) => b.count - a.count);
  }, [sequence]);

  const total = sequence.length;
  const winner = counts[0];
  const isMajority = winner && winner.count > total / 2;

  return (
    <div className="not-prose rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800/50 overflow-hidden max-w-sm mx-auto">
      {/* Header styled like a Python dict */}
      <div className="px-4 py-2 border-stone-200 dark:border-stone-700">
        <span className="font-mono text-xs text-stone-500 dark:text-stone-400">
          counter = {"{ "}
        </span>
      </div>

      <div className="pl-5 space-y-1.5">
        {counts.map(({ shape, count }) => (
          <div
            key={shape.type}
            className="flex items-center gap-3 font-mono text-sm"
          >
            <span className="text-stone-400 dark:text-stone-500 w-4 text-right">
              {"  "}
            </span>
            <ShapeSVG shape={shape} size={18} />
            <span className="text-stone-500 dark:text-stone-400">:</span>
            <span
              className={`font-bold tabular-nums ${
                count > total / 2
                  ? "text-emerald-600 dark:text-emerald-400"
                  : "text-stone-700 dark:text-stone-300"
              }`}
            >
              {count}
            </span>
            {count > total / 2 && (
              <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase">
                &gt; {total}/2 ✓
              </span>
            )}
          </div>
        ))}
      </div>

      <div className="px-4 py-2 border-stone-200 dark:border-stone-700">
        <span className="font-mono text-xs text-stone-500 dark:text-stone-400">
          {"}  "}
          <span className="text-stone-400">
            # {total} elements, {counts.length} unique keys
          </span>
        </span>
      </div>

      {isMajority && (
        <div className="px-4 py-2 bg-emerald-50 dark:bg-emerald-900/20 border-t border-stone-200 dark:border-stone-700 text-center">
          <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400">
            Majority found: {winner.shape.label} ({winner.count}/{total})
          </span>
        </div>
      )}
    </div>
  );
};
