import React, { useState } from "react";
import { FACE_COLORS, textColor } from "./lehmerColors";
import { factorial, indexToLehmer, lehmerToPerm } from "./lehmerMath";
import { CheeseSlideContainer } from "../shared";

// ── Types ──────────────────────────────────────────────────────────────────────

interface LehmerDecoderProps {
  initialN?: number;
  showNSelector?: boolean;
}

// ── Component ──────────────────────────────────────────────────────────────────

export const LehmerDecoder: React.FC<LehmerDecoderProps> = ({
  initialN = 4,
  showNSelector = true,
}) => {
  const [nString, setNString] = useState<string>(initialN.toString());
  const [n, setN_] = useState(Math.max(1, Math.min(9, initialN)));
  const [index, setIndex] = useState(0);
  const [hoveredRow, setHoveredRow] = useState<number | null>(null);

  const maxIndex = factorial(n) - 1;

  const setN = (newN: number) => {
    setN_(newN);
    setIndex(0);
  };

  // Clamp index to valid range
  const safeIndex = Math.max(0, Math.min(index, maxIndex));

  // ── Derived data ─────────────────────────────────────────────────────────────

  const lehmer = indexToLehmer(safeIndex, n);
  const perm = lehmerToPerm(lehmer);

  /** For each step i, compute the pool before picking and the picked value. */
  const decodeSteps: { pool: number[]; digit: number; picked: number }[] = [];
  {
    const pool = Array.from({ length: n }, (_, i) => i);
    for (let i = 0; i < n; i++) {
      const digit = lehmer[i];
      const safeDig = Math.min(digit, pool.length - 1);
      decodeSteps.push({
        pool: [...pool],
        digit: safeDig,
        picked: pool[safeDig],
      });
      pool.splice(safeDig, 1);
    }
  }

  // ── Layout constants (matching LehmerBuilder) ────────────────────────────────

  const cell = Math.max(24, Math.min(52, 300 / n));
  const gap = Math.max(2, Math.min(6, 30 / n));
  const lcCell = Math.max(32, Math.min(48, 280 / n));
  const lcFont = Math.max(16, Math.min(22, lcCell * 0.48));

  // ── Render helpers ───────────────────────────────────────────────────────────

  const isHighlighted = (i: number) => hoveredRow !== null && hoveredRow === i;

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
          </div>
        )}

        {/* ═══════════════ SECTION 1: INDEX ═══════════════ */}
        <div className="flex flex-col items-center gap-2 shrink-0 w-full max-w-md">
          <span className="font-mono text-[10px] text-gray-400 dark:text-gray-500 uppercase tracking-widest">
            Index
          </span>
          <div className="flex items-center gap-3 w-full">
            <span className="font-mono text-xs text-gray-500 dark:text-gray-600">
              0
            </span>
            <input
              type="range"
              min={0}
              max={maxIndex}
              value={safeIndex}
              onChange={(e) => setIndex(parseInt(e.target.value, 10))}
              className="flex-1 accent-orange-500 h-2 rounded-lg cursor-pointer"
            />
            <span className="font-mono text-xs text-gray-500 dark:text-gray-600">
              {maxIndex}
            </span>
          </div>
          <span
            className="font-mono text-2xl font-bold"
            style={{ color: "#e07830" }}
          >
            {safeIndex}
          </span>
        </div>

        {/* ═══════════════ SECTION 2: FACTORIADIC ═══════════════ */}
        <div
          className="flex justify-center gap-1.5 items-center flex-wrap font-mono text-gray-500 dark:text-gray-400 shrink-0"
          style={{ fontSize: Math.max(13, lcFont * 0.75) }}
        >
          {lehmer.map((digit, i) => {
            const factVal = n - 1 - i;
            const isLast = i === n - 1;
            const hl = isHighlighted(i);
            return (
              <React.Fragment key={`fact-${i}`}>
                <span
                  className="whitespace-nowrap rounded-md px-1.5 py-0.5 transition-all"
                  style={{
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
                  <span className="font-bold" style={{ color: "#e07830" }}>
                    {digit}
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
            className="font-bold text-gray-900 dark:text-white rounded-lg border px-3 py-0.5 transition-all"
            style={{
              fontSize: Math.max(15, lcFont),
              background: "rgba(224,120,48,0.22)",
              borderColor: "rgba(224,120,48,0.5)",
            }}
          >
            {safeIndex}
          </span>
        </div>

        {/* ═══════════════ SECTION 3: LEHMER CODE ═══════════════ */}
        <div className="flex flex-col items-center gap-1.5 shrink-0">
          <span className="font-mono text-[10px] text-gray-400 dark:text-gray-500 uppercase tracking-widest">
            Lehmer code
          </span>
          <div className="flex items-center" style={{ gap: gap + 2 }}>
            {lehmer.map((digit, i) => {
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
                      : "rgba(224,120,48,0.12)",
                    border: hl
                      ? "2.5px solid #e07830"
                      : "2px solid rgba(224,120,48,0.4)",
                    boxShadow: hl
                      ? "0 0 10px 2px rgba(224,120,48,0.45)"
                      : "none",
                    fontSize: lcFont,
                    color: "#e07830",
                    transform: hl ? "scale(1.15)" : "none",
                  }}
                >
                  {digit}
                </div>
              );
            })}
          </div>
        </div>

        {/* ═══════════════ SECTION 4: DECODE STEPS ═══════════════ */}
        <div className="flex flex-col items-center w-full shrink-0">
          <span className="font-mono text-[10px] text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-1">
            Decode (pool → pick)
          </span>
          <div
            className="flex flex-col items-stretch w-full"
            style={{ gap: Math.max(1, Math.min(4, 20 / n)) }}
          >
            {decodeSteps.map((step, i) => {
              const hl = isHighlighted(i);
              return (
                <div
                  key={`step-${i}`}
                  className="flex items-center shrink-0"
                  style={{ gap: gap + 2, height: cell + 6 }}
                  onMouseEnter={() => setHoveredRow(i)}
                  onMouseLeave={() => setHoveredRow(null)}
                >
                  {/* Row label */}
                  <span
                    className="font-mono text-xs font-bold shrink-0 text-right"
                    style={{ width: 32, color: "#888" }}
                  >
                    p[{i}]
                  </span>

                  {/* Pool with highlight */}
                  <div className="flex items-center" style={{ gap }}>
                    {step.pool.map((v, j) => {
                      const isPicked = j === step.digit;
                      const c = FACE_COLORS[v];
                      return (
                        <div
                          key={`pool-${i}-${j}`}
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
                  </div>

                  {/* Hover tooltip */}
                  {hl && (
                    <span
                      className="font-mono shrink-0 flex items-center gap-1.5 text-orange-600 dark:text-orange-400 transition-opacity"
                      style={{
                        fontSize: Math.max(11, cell * 0.26),
                        marginLeft: 6,
                      }}
                    >
                      <span className="opacity-60">→</span>
                      <span className="font-bold">
                        index{" "}
                        <span
                          className="inline-flex items-center justify-center rounded"
                          style={{
                            minWidth: 18,
                            padding: "0 4px",
                            background: "rgba(224,120,48,0.18)",
                            border: "1px solid rgba(224,120,48,0.4)",
                          }}
                        >
                          {step.digit}
                        </span>{" "}
                        → picked {step.picked}
                      </span>
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* ═══════════════ SECTION 5: RESULT PERMUTATION ═══════════════ */}
        <div className="flex flex-col items-center gap-1.5 shrink-0">
          <span className="font-mono text-[10px] text-gray-400 dark:text-gray-500 uppercase tracking-widest">
            Permutation
          </span>
          <div className="flex items-center" style={{ gap: gap + 2 }}>
            {perm.map((v, i) => {
              const c = FACE_COLORS[v];
              return (
                <div
                  key={`perm-${i}`}
                  className="flex items-center justify-center font-mono font-bold shrink-0"
                  style={{
                    width: lcCell,
                    height: lcCell,
                    borderRadius: 8,
                    background: c.hex,
                    border: "2px solid rgba(0,0,0,0.15)",
                    boxShadow:
                      "inset 0 1px 0 rgba(255,255,255,0.15), 0 2px 4px rgba(0,0,0,0.2)",
                    fontSize: lcCell * 0.38,
                    color: textColor(c.hex),
                  }}
                >
                  {v}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </CheeseSlideContainer>
  );
};
