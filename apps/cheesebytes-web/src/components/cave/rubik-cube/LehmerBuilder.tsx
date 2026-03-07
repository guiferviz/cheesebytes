import React, { useState } from "react";
import { FACE_COLORS, textColor } from "./lehmerColors";
import { toLehmer, lehmerToIndex, factorial } from "./lehmerMath";
import { CheeseSlideContainer } from "../shared";

// ── Types ──────────────────────────────────────────────────────────────────────

interface LehmerBuilderProps {
  initialN?: number;
  showNSelector?: boolean;
}

// ── Component ──────────────────────────────────────────────────────────────────

export const LehmerBuilder: React.FC<LehmerBuilderProps> = ({
  initialN = 4,
  showNSelector = true,
}) => {
  const [nString, setNString] = useState<string>(initialN.toString());
  const [n, setN_] = useState(Math.max(1, Math.min(9, initialN)));
  const [choices, setChoices] = useState<(number | null)[]>(() =>
    Array(Math.max(1, Math.min(9, initialN))).fill(null),
  );
  const [hoveredRow, setHoveredRow] = useState<number | null>(null);

  const setN = (newN: number) => {
    setN_(newN);
    setChoices(Array(newN).fill(null));
  };

  // ── Derived data ─────────────────────────────────────────────────────────────

  const activeRow = choices.findIndex((c) => c === null);
  const isComplete = activeRow === -1;
  const filledCount = isComplete ? n : activeRow;

  /** Pool of remaining values at step i. */
  function poolAtStep(step: number): number[] {
    const used = new Set<number>();
    for (let k = 0; k < step; k++) {
      if (choices[k] !== null) used.add(choices[k]!);
    }
    return Array.from({ length: n }, (_, i) => i).filter((v) => !used.has(v));
  }

  const partialPerm = choices.filter((c): c is number => c !== null);

  /** Lehmer digit i = index of choices[i] within the pool at step i. */
  const partialLehmer: (number | null)[] = Array(n).fill(null);
  for (let i = 0; i < filledCount; i++) {
    const pool = poolAtStep(i);
    partialLehmer[i] = pool.indexOf(choices[i]!);
  }

  const partialIndex = (() => {
    let sum = 0;
    for (let i = 0; i < filledCount; i++) {
      sum += (partialLehmer[i] ?? 0) * factorial(n - 1 - i);
    }
    return sum;
  })();

  const fullLehmer = isComplete ? toLehmer(partialPerm) : null;
  const fullIndex = fullLehmer !== null ? lehmerToIndex(fullLehmer) : null;

  // ── Handlers ─────────────────────────────────────────────────────────────────

  const handlePick = (row: number, value: number) => {
    setChoices((prev) => {
      const next = [...prev];
      next[row] = value;
      return next;
    });
    // The mouse is still over this row after clicking, so show tooltip immediately
    setHoveredRow(row);
  };

  const handleUndo = () => {
    setChoices((prev) => {
      const next = [...prev];
      const lastFilled = isComplete ? n - 1 : activeRow - 1;
      if (lastFilled >= 0) next[lastFilled] = null;
      return next;
    });
  };

  const handleReset = () => setChoices(Array(n).fill(null));

  // ── Layout constants ─────────────────────────────────────────────────────────

  const cell = Math.max(24, Math.min(52, 300 / n));
  const gap = Math.max(2, Math.min(6, 30 / n));
  const lcCell = Math.max(32, Math.min(48, 280 / n));
  const lcFont = Math.max(16, Math.min(22, lcCell * 0.48));

  // ── Render helpers ───────────────────────────────────────────────────────────

  /** Whether row i is highlighted via hover (only completed rows). */
  const isHighlighted = (i: number) =>
    hoveredRow !== null && hoveredRow === i && partialLehmer[i] !== null;

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <CheeseSlideContainer>
      <div className="relative flex h-full w-full max-w-4xl flex-col items-center justify-center gap-5 px-2 py-2">
        {/* ── N selector ── */}
        {showNSelector && (
          <div className="flex items-center justify-center gap-3 shrink-0 font-mono text-base text-gray-500 dark:text-gray-400">
            <span className="text-gray-500 dark:text-gray-500">n =</span>
            <input
              type="text"
              value={nString}
              onChange={(e) => {
                const val = e.target.value.replace(/[^0-9]/g, "");
                setNString(val);
                const num = parseInt(val, 10);
                if (!isNaN(num) && num >= 1 && num <= 9) setN(num);
              }}
              onBlur={() => setNString(n.toString())}
              className="w-12 h-10 rounded-md border-2 border-gray-300 bg-gray-100 text-center font-mono text-lg font-bold outline-none transition-colors focus:border-orange-500 dark:border-gray-600 dark:bg-gray-800"
              style={{ color: "#e07830" }}
            />
            <button
              onClick={handleUndo}
              disabled={filledCount === 0}
              className="ml-4 px-3 py-1.5 rounded-md font-mono text-sm border border-gray-300 bg-gray-100 text-gray-700 transition-colors disabled:opacity-30 disabled:cursor-not-allowed hover:border-orange-500 hover:text-orange-500 dark:border-gray-600 dark:bg-gray-800/50 dark:text-gray-300 dark:hover:text-orange-400"
            >
              ↩ Undo
            </button>
            <button
              onClick={handleReset}
              disabled={filledCount === 0}
              className="px-3 py-1.5 rounded-md font-mono text-sm border border-gray-300 bg-gray-100 text-gray-700 transition-colors disabled:opacity-30 disabled:cursor-not-allowed hover:border-orange-500 hover:text-orange-500 dark:border-gray-600 dark:bg-gray-800/50 dark:text-gray-300 dark:hover:text-orange-400"
            >
              ✕ Reset
            </button>
          </div>
        )}

        {/* ═══════════════ SECTION 1: PERMUTATION ═══════════════ */}
        <div className="flex flex-col items-center w-full shrink-0">
          <span className="font-mono text-[10px] text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-1">
            Permutation
          </span>

          <div
            className="mx-auto flex flex-col items-stretch max-w-full"
            style={{
              gap: Math.max(1, Math.min(4, 20 / n)),
              width: "fit-content",
            }}
          >
            {Array.from({ length: n }, (_, row) => {
              const chosen = choices[row];
              const isActive =
                !isComplete && row === (activeRow === -1 ? n : activeRow);
              const isFuture = chosen === null && !isActive;
              const pool = poolAtStep(row);
              const lehmerDigit = partialLehmer[row];
              const rowCompleted = lehmerDigit !== null && !isActive;

              return (
                <div
                  key={row}
                  className="flex items-center shrink-0 relative"
                  style={{ gap: gap + 2, height: cell + 6 }}
                  onMouseEnter={() => setHoveredRow(row)}
                  onMouseLeave={() => setHoveredRow(null)}
                >
                  {/* Row label */}
                  <span
                    className="font-mono text-xs font-bold shrink-0 text-right"
                    style={{
                      width: 38,
                      paddingRight: 6,
                      color: isActive
                        ? "#e07830"
                        : chosen !== null
                          ? "#888"
                          : "#555",
                    }}
                  >
                    p[{row}]
                  </span>

                  {isFuture ? (
                    <div
                      className="flex items-center justify-center font-mono shrink-0 text-gray-400 dark:text-gray-600"
                      style={{
                        width: cell,
                        height: cell,
                        borderRadius: 8,
                        border: "1.5px dashed",
                        borderColor: "rgba(150,150,150,0.3)",
                        fontSize: cell * 0.3,
                      }}
                    >
                      ?
                    </div>
                  ) : (
                    <>
                      <div
                        className="relative flex items-center"
                        style={{ gap }}
                      >
                        {pool.map((v) => {
                          const isPicked = chosen === v;
                          const c = FACE_COLORS[v];
                          const isClickable = isActive;

                          return isClickable ? (
                            <button
                              key={v}
                              onClick={() => handlePick(row, v)}
                              className="flex items-center justify-center font-mono font-bold shrink-0 cursor-pointer transition-all hover:scale-110 hover:shadow-lg"
                              style={{
                                width: cell,
                                height: cell,
                                borderRadius: 8,
                                background: c.hex,
                                border: "2px solid rgba(0,0,0,0.15)",
                                boxShadow:
                                  "inset 0 1px 0 rgba(255,255,255,0.15), 0 2px 4px rgba(0,0,0,0.2)",
                                fontSize: cell * 0.38,
                                color: textColor(c.hex),
                              }}
                            >
                              {v}
                            </button>
                          ) : (
                            <div
                              key={v}
                              className="flex items-center justify-center font-mono font-bold shrink-0 transition-all"
                              style={{
                                width: cell,
                                height: cell,
                                borderRadius: 8,
                                background: c.hex,
                                border: isPicked
                                  ? "2.5px solid #e07830"
                                  : "2px solid rgba(0,0,0,0.1)",
                                boxShadow: isPicked
                                  ? "0 0 8px 2px rgba(224,120,48,0.5)"
                                  : "none",
                                fontSize: cell * 0.38,
                                color: textColor(c.hex),
                                opacity: isPicked ? 1 : 0.35,
                                transform: isPicked ? "scale(1.1)" : "none",
                              }}
                            >
                              {v}
                            </div>
                          );
                        })}

                        {/* Hover tooltip — shows only when cursor is over a completed row */}
                        {rowCompleted && hoveredRow === row && (
                          <span
                            className="absolute font-mono flex items-center gap-1.5 text-orange-600 dark:text-orange-400 whitespace-nowrap pointer-events-none"
                            style={{
                              fontSize: Math.max(11, cell * 0.26),
                              left: "100%",
                              marginLeft: 8,
                              top: "50%",
                              transform: "translateY(-50%)",
                            }}
                          >
                            <span className="opacity-60">→</span>
                            <span className="font-bold">
                              picked {choices[row]} at index{" "}
                              <span
                                className="inline-flex items-center justify-center rounded"
                                style={{
                                  minWidth: 18,
                                  padding: "0 4px",
                                  background: "rgba(224,120,48,0.18)",
                                  border: "1px solid rgba(224,120,48,0.4)",
                                }}
                              >
                                {lehmerDigit}
                              </span>
                            </span>
                          </span>
                        )}
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* ═══════════════ SECTION 2: LEHMER CODE ═══════════════ */}
        <div className="flex flex-col items-center gap-1.5 shrink-0">
          <span className="font-mono text-[10px] text-gray-400 dark:text-gray-500 uppercase tracking-widest">
            Lehmer code
          </span>
          <div className="flex items-center" style={{ gap: gap + 2 }}>
            {Array.from({ length: n }, (_, i) => {
              const val = partialLehmer[i];
              const filled = val !== null;
              const hl = isHighlighted(i);
              return (
                <div
                  key={`lc-${i}`}
                  className="flex items-center justify-center font-mono font-bold shrink-0 transition-all"
                  style={{
                    width: lcCell,
                    height: lcCell * 0.7,
                    borderRadius: 8,
                    background: hl
                      ? "rgba(224,120,48,0.3)"
                      : filled
                        ? "rgba(224,120,48,0.12)"
                        : "rgba(150,150,150,0.06)",
                    border: hl
                      ? "2.5px solid #e07830"
                      : filled
                        ? "2px solid rgba(224,120,48,0.4)"
                        : "1.5px dashed rgba(150,150,150,0.25)",
                    boxShadow: hl
                      ? "0 0 10px 2px rgba(224,120,48,0.45)"
                      : "none",
                    fontSize: lcFont,
                    color: filled ? "#e07830" : "#999",
                    transform: hl ? "scale(1.15)" : "none",
                  }}
                >
                  {filled ? val : "–"}
                </div>
              );
            })}
          </div>
        </div>

        {/* ═══════════════ SECTION 3: INDEX ═══════════════ */}
        <div className="flex flex-col items-center gap-1.5 shrink-0">
          <span className="font-mono text-[10px] text-gray-400 dark:text-gray-500 uppercase tracking-widest">
            Index
          </span>
          <div
            className="flex justify-center gap-1.5 items-center flex-wrap font-mono text-gray-500 dark:text-gray-400"
            style={{ fontSize: Math.max(13, lcFont * 0.75) }}
          >
            {Array.from({ length: n }, (_, i) => {
              const val = partialLehmer[i];
              const filled = val !== null;
              const factVal = n - 1 - i;
              const isLast = i === n - 1;
              const hl = isHighlighted(i);
              return (
                <React.Fragment key={`fact-${i}`}>
                  <span
                    className="whitespace-nowrap rounded-md px-1.5 py-0.5 transition-all"
                    style={{
                      opacity: filled ? 1 : 0.3,
                      background: hl ? "rgba(224,120,48,0.25)" : "transparent",
                      border: hl
                        ? "1.5px solid rgba(224,120,48,0.5)"
                        : "1.5px solid transparent",
                      boxShadow: hl
                        ? "0 0 12px 3px rgba(224,120,48,0.4)"
                        : "none",
                      transform: hl ? "scale(1.18)" : "none",
                    }}
                  >
                    <span
                      className="font-bold"
                      style={{ color: filled ? "#e07830" : "#888" }}
                    >
                      {filled ? val : "?"}
                    </span>
                    <span className="text-gray-400 dark:text-gray-600">×</span>
                    <span className="text-gray-600 dark:text-gray-300">
                      {factVal}!
                    </span>
                  </span>
                  {!isLast && (
                    <span className="text-gray-400 dark:text-gray-600">+</span>
                  )}
                </React.Fragment>
              );
            })}
            <span className="text-gray-400 dark:text-gray-600 mx-1">=</span>
            <span
              className="font-bold rounded-lg border px-3 py-0.5 transition-all"
              style={{
                fontSize: Math.max(15, lcFont),
                background: isComplete
                  ? "rgba(224,120,48,0.22)"
                  : "rgba(255,255,255,0.04)",
                borderColor: isComplete
                  ? "rgba(224,120,48,0.5)"
                  : "rgba(150,150,150,0.2)",
                color: isComplete ? undefined : "#888",
              }}
            >
              <span
                className={isComplete ? "text-gray-900 dark:text-white" : ""}
              >
                {isComplete ? fullIndex : partialIndex}
              </span>
            </span>
          </div>
        </div>
      </div>
    </CheeseSlideContainer>
  );
};
