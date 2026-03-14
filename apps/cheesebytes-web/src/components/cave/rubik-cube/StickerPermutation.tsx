/**
 * StickerPermutation.tsx
 *
 * Permutation diagram: before row → arrows → after row.
 *
 * - Hover 1 s over a sticker row → interactive tooltip with 3D cube; keyboard
 *   moves on that cube update the corresponding row state.
 * - Click the arrow zone (or placeholder) to pick a move from a dropdown.
 * - Initially no move is shown; on dropdown selection arrows + after row appear.
 */

import React, {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import RubikCube, { type RubikCubeHandle } from "./RubikCube";
import { CheeseSlideContainer } from "../shared";

// ── Permutation tables (2×2, 24 stickers) ────────────────────────────────────

const MOVES_24: Record<string, number[]> = {
  R: [
    0, 9, 2, 11, 4, 5, 6, 7, 8, 21, 10, 23, 14, 12, 15, 13, 3, 17, 1, 19, 20,
    18, 22, 16,
  ],
  D: [
    0, 1, 2, 3, 4, 5, 18, 19, 8, 9, 6, 7, 12, 13, 10, 11, 16, 17, 14, 15, 22,
    20, 23, 21,
  ],
  B: [
    13, 15, 2, 3, 1, 5, 0, 7, 8, 9, 10, 11, 12, 23, 14, 22, 18, 16, 19, 17, 20,
    21, 4, 6,
  ],
  F: [
    0, 1, 7, 5, 4, 20, 6, 21, 10, 8, 11, 9, 2, 13, 3, 15, 16, 17, 18, 19, 14,
    12, 22, 23,
  ],
  U: [
    2, 0, 3, 1, 8, 9, 6, 7, 12, 13, 10, 11, 16, 17, 14, 15, 4, 5, 18, 19, 20,
    21, 22, 23,
  ],
  L: [
    19, 1, 17, 3, 6, 4, 7, 5, 0, 9, 2, 11, 12, 13, 14, 15, 16, 22, 18, 20, 8,
    21, 10, 23,
  ],
};

function invertPerm(p: number[]): number[] {
  const inv = new Array(p.length);
  for (let i = 0; i < p.length; i++) inv[p[i]] = i;
  return inv;
}

// Inverses
for (const k of ["R", "D", "B", "F", "U", "L"]) {
  MOVES_24[k + "'"] = invertPerm(MOVES_24[k]);
}

// Doubles: P²[j] = P[P[j]]
for (const k of ["R", "D", "B", "F", "U", "L"]) {
  const p = MOVES_24[k];
  MOVES_24[k + "2"] = Array.from({ length: p.length }, (_, j) => p[p[j]]);
}

// ── Palette ───────────────────────────────────────────────────────────────────

const CHAR_HEX: Record<string, string> = {
  B: "#4a7fd4",
  G: "#48a860",
  Y: "#e8c832",
  W: "#d8d8d0",
  O: "#c8541a",
  R: "#d44040",
};

const SOLVED = "BBBBRRRRYYYYOOOOWWWWGGGG";

const MOVE_ORDER = [
  "R",
  "R'",
  "R2",
  "L",
  "L'",
  "L2",
  "U",
  "U'",
  "U2",
  "D",
  "D'",
  "D2",
  "F",
  "F'",
  "F2",
  "B",
  "B'",
  "B2",
];

// ── Component ─────────────────────────────────────────────────────────────────

export interface StickerPermutationHandle {
  applyMove: (face: string, cw: boolean) => void;
}

interface Props {
  visibleStickers?: number;
}

const StickerPermutation = forwardRef<StickerPermutationHandle, Props>(
  function StickerPermutation({ visibleStickers: initialVisible = 24 }, ref) {
    const tooltipCubeRef = useRef<RubikCubeHandle>(null);

    // Source of truth: "before" row = currentState, after = move(currentState).
    const [currentState, setCurrentState] = useState(SOLVED);
    const [displayedMove, setDisplayedMove] = useState<string | null>(null);
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const [settingsOpen, setSettingsOpen] = useState(false);
    const [visibleStickers, setVisibleStickers] = useState(initialVisible);
    const settingsRef = useRef<HTMLDivElement>(null);

    // Tooltip state
    const [tooltipVisible, setTooltipVisible] = useState(false);
    const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
    const tooltipRowRef = useRef<"before" | "after">("before");
    const hoverTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Stable refs for use in callbacks
    const displayedMoveRef = useRef(displayedMove);
    displayedMoveRef.current = displayedMove;
    const currentStateRef = useRef(currentState);
    currentStateRef.current = currentState;

    // ── Move handlers ────────────────────────────────────────────────────

    const doMove = useCallback((face: string, cw: boolean) => {
      const notation = cw ? face : face + "'";
      const p = MOVES_24[notation];
      if (!p) return;
      setCurrentState((prev) => p.map((i) => prev[i]).join(""));
      setDisplayedMove(notation);
    }, []);

    useImperativeHandle(ref, () => ({ applyMove: doMove }), [doMove]);

    const selectMove = useCallback((notation: string) => {
      setDisplayedMove(notation);
      setDropdownOpen(false);
      setTooltipVisible(false);
    }, []);

    // Tooltip cube keyboard move → update the row it belongs to
    const handleTooltipMove = useCallback(
      (face: string, cw: boolean, double: boolean) => {
        const notation = double ? face + "2" : cw ? face : face + "'";
        const p = MOVES_24[notation];
        if (!p) return;

        const move = displayedMoveRef.current;
        if (tooltipRowRef.current === "before" || !move) {
          // P applied to before → currentState' = P(currentState)
          setCurrentState((prev) => p.map((i) => prev[i]).join(""));
        } else {
          // P applied to after: after' = P(M(cs)), cs' = invM(P(M(cs)))
          const mPerm = MOVES_24[move]!;
          const invM = invertPerm(mPerm);
          setCurrentState((prev) => {
            const afterArr = mPerm.map((i) => prev[i]);
            const afterNew = p.map((i) => afterArr[i]);
            return invM.map((i) => afterNew[i]).join("");
          });
        }
      },
      [],
    );

    // ── Derived ──────────────────────────────────────────────────────────

    const perm = displayedMove ? MOVES_24[displayedMove] : null;
    const before = currentState;
    const after = perm
      ? perm.map((i) => currentState[i]).join("")
      : currentState;

    // ── SVG layout ───────────────────────────────────────────────────────

    const n = Math.min(visibleStickers, 24);
    const showEllipsis = n < 24;
    const cellW = 40;
    const cellH = 48;
    const gap = 6;
    const idxH = 14;
    const mainArrowH = 70;
    const ddArrowH = 50;
    const labelW = 70;
    const xOf = (i: number) => labelW + i * (cellW + gap);
    // Content-based viewBox width (actual stickers + optional ellipsis)
    const lastElemEnd = showEllipsis ? xOf(n) + cellW : xOf(n - 1) + cellW;
    const svgW = lastElemEnd + 20;
    // Full 24-sticker width (used to compute display ratio)
    const fullSvgW = labelW + 24 * cellW + 23 * gap + 20;
    // Display at proportional width, but at least 55% so few stickers aren't tiny
    const displayPct = Math.max(svgW / fullSvgW, 0.45) * 100;

    // ── Tooltip helpers ──────────────────────────────────────────────────

    const clearTimers = useCallback(() => {
      if (hoverTimerRef.current) {
        clearTimeout(hoverTimerRef.current);
        hoverTimerRef.current = null;
      }
      if (hideTimerRef.current) {
        clearTimeout(hideTimerRef.current);
        hideTimerRef.current = null;
      }
    }, []);

    useEffect(() => () => clearTimers(), [clearTimers]);

    const computeRowState = useCallback((row: "before" | "after") => {
      const cs = currentStateRef.current;
      const m = displayedMoveRef.current;
      if (row === "before" || !m) return cs;
      return MOVES_24[m].map((i) => cs[i]).join("");
    }, []);

    const showTooltipAt = useCallback(
      (x: number, y: number, row: "before" | "after") => {
        tooltipRowRef.current = row;
        setTooltipPos({ x, y });
        setTooltipVisible(true);
        tooltipCubeRef.current?.applyState(computeRowState(row));
      },
      [computeRowState],
    );

    const startShowTimer = useCallback(
      (x: number, y: number, row: "before" | "after") => {
        if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
        hoverTimerRef.current = setTimeout(() => {
          showTooltipAt(x, y, row);
        }, 1000);
      },
      [showTooltipAt],
    );

    const handleRowMouseEnter = useCallback(
      (e: React.MouseEvent, row: "before" | "after") => {
        if (hideTimerRef.current) {
          clearTimeout(hideTimerRef.current);
          hideTimerRef.current = null;
        }
        if (tooltipVisible && tooltipRowRef.current === row) return;
        startShowTimer(e.clientX, e.clientY, row);
      },
      [tooltipVisible, startShowTimer],
    );

    const handleRowMouseMove = useCallback(
      (e: React.MouseEvent, row: "before" | "after") => {
        if (tooltipVisible) return;
        startShowTimer(e.clientX, e.clientY, row);
      },
      [tooltipVisible, startShowTimer],
    );

    const handleRowMouseLeave = useCallback(() => {
      if (hoverTimerRef.current) {
        clearTimeout(hoverTimerRef.current);
        hoverTimerRef.current = null;
      }
      hideTimerRef.current = setTimeout(() => setTooltipVisible(false), 300);
    }, []);

    const handleTooltipMouseEnter = useCallback(() => {
      if (hideTimerRef.current) {
        clearTimeout(hideTimerRef.current);
        hideTimerRef.current = null;
      }
    }, []);

    const handleTooltipMouseLeave = useCallback(() => {
      setTooltipVisible(false);
    }, []);

    // ── Close dropdown / settings on outside click ─────────────────────

    const ddContainerRef = useRef<HTMLDivElement>(null);
    useEffect(() => {
      if (!dropdownOpen && !settingsOpen) return;
      const handler = (e: MouseEvent) => {
        const t = e.target as Node;
        if (
          dropdownOpen &&
          ddContainerRef.current &&
          !ddContainerRef.current.contains(t)
        )
          setDropdownOpen(false);
        if (
          settingsOpen &&
          settingsRef.current &&
          !settingsRef.current.contains(t)
        )
          setSettingsOpen(false);
      };
      document.addEventListener("mousedown", handler);
      return () => document.removeEventListener("mousedown", handler);
    }, [dropdownOpen, settingsOpen]);

    // ── SVG helpers ──────────────────────────────────────────────────────

    const renderStickerRow = (
      state: string,
      idxAbove: boolean,
      idxBelow: boolean,
    ) => {
      const padTop = idxAbove ? idxH + 2 : 4;
      const padBot = idxBelow ? idxH + 4 : 4;
      const h = padTop + cellH + padBot;
      return (
        <svg
          viewBox={`0 0 ${svgW} ${h}`}
          className="block"
          style={{ width: `${displayPct}%` }}
        >
          {Array.from({ length: n }).map((_, i) => {
            const ch = state[i];
            const x = xOf(i);
            return (
              <g key={i}>
                {idxAbove && (
                  <text
                    x={x + cellW / 2}
                    y={padTop - 3}
                    textAnchor="middle"
                    className="fill-gray-500 text-[10px] font-mono"
                  >
                    {i}
                  </text>
                )}
                <rect
                  x={x}
                  y={padTop}
                  width={cellW}
                  height={cellH}
                  rx={4}
                  fill={CHAR_HEX[ch] ?? "#555"}
                  opacity={0.85}
                />
                <text
                  x={x + cellW / 2}
                  y={padTop + cellH / 2 + 5}
                  textAnchor="middle"
                  className="fill-white text-[15px] font-bold font-mono"
                  style={{ textShadow: "0 1px 2px rgba(0,0,0,0.5)" }}
                >
                  {ch}
                </text>
                {idxBelow && (
                  <text
                    x={x + cellW / 2}
                    y={padTop + cellH + 12}
                    textAnchor="middle"
                    className="fill-gray-500 text-[10px] font-mono"
                  >
                    {i}
                  </text>
                )}
              </g>
            );
          })}
          {showEllipsis && (
            <text
              x={xOf(n) + cellW / 2}
              y={padTop + cellH / 2 + 5}
              textAnchor="middle"
              className="fill-gray-500 text-[18px] font-bold"
            >
              …
            </text>
          )}
        </svg>
      );
    };

    const renderArrows = (
      moveName: string,
      movePerm: number[],
      h: number,
      idSuffix: string,
    ) => {
      const mid = `sp-ah-${idSuffix}`;
      return (
        <svg
          viewBox={`0 0 ${svgW} ${h}`}
          className="block"
          style={{ width: `${displayPct}%` }}
        >
          <defs>
            <marker
              id={mid}
              markerWidth="7"
              markerHeight="5"
              refX="6"
              refY="2.5"
              orient="auto"
            >
              <path d="M0,0 L7,2.5 L0,5 Z" fill="#9ca3af" />
            </marker>
          </defs>
          <text
            x={labelW / 2}
            y={h / 2 + 5}
            textAnchor="middle"
            className="fill-gray-300 text-[13px] font-bold font-mono"
          >
            {moveName}
          </text>
          {Array.from({ length: n }).map((_, src) => {
            const dst = movePerm.indexOf(src);
            if (src >= n && dst >= n) return null;
            if (src === dst) return null;
            const x1 = src < n ? xOf(src) + cellW / 2 : xOf(n) + cellW / 2;
            const x2 = dst < n ? xOf(dst) + cellW / 2 : xOf(n) + cellW / 2;
            return (
              <line
                key={src}
                x1={x1}
                y1={4}
                x2={x2}
                y2={h - 6}
                stroke="#9ca3af"
                strokeWidth={1.8}
                markerEnd={`url(#${mid})`}
                opacity={0.65}
              />
            );
          })}
        </svg>
      );
    };

    // ── Render ────────────────────────────────────────────────────────────

    return (
      <CheeseSlideContainer>
        <div
          className="relative flex h-full w-full flex-col items-center justify-center gap-0"
          style={{ minWidth: 1080, minHeight: 720 }}
        >
          {/* ── Settings gear (top-right) ─────────────────── */}
          <div ref={settingsRef} className="absolute right-2 top-2 z-30">
            <button
              onClick={() => setSettingsOpen((o) => !o)}
              title="Sticker settings"
              className="rounded-md border border-gray-600 px-2 py-1 text-base leading-none text-gray-400 backdrop-blur-md transition hover:text-gray-200"
              style={{
                background: settingsOpen
                  ? "rgba(80,80,80,0.7)"
                  : "rgba(30,30,30,0.7)",
              }}
            >
              ⚙
            </button>
            {settingsOpen && (
              <div className="absolute right-0 top-9 min-w-[200px] rounded-lg border border-gray-700 bg-gray-900/95 p-3 text-xs text-gray-400 shadow-lg backdrop-blur-sm">
                <label className="flex items-center justify-between gap-3">
                  <span>Stickers</span>
                  <span className="font-mono text-gray-300">
                    {visibleStickers}
                  </span>
                </label>
                <input
                  type="range"
                  min={1}
                  max={24}
                  value={visibleStickers}
                  onChange={(e) => setVisibleStickers(Number(e.target.value))}
                  className="mt-1.5 w-full accent-blue-500"
                />
              </div>
            )}
          </div>

          <div className="w-full">
            {/* Top sticker row (before / current state) */}
            <div
              onMouseEnter={(e) => handleRowMouseEnter(e, "before")}
              onMouseMove={(e) => handleRowMouseMove(e, "before")}
              onMouseLeave={handleRowMouseLeave}
            >
              {renderStickerRow(before, true, false)}
            </div>

            {/* Arrow zone / placeholder — always clickable */}
            <div className="relative" ref={ddContainerRef}>
              <div
                className="cursor-pointer rounded transition hover:bg-white/5"
                onClick={() => setDropdownOpen((o) => !o)}
              >
                {perm ? (
                  renderArrows(displayedMove!, perm, mainArrowH, "main")
                ) : (
                  <div className="flex items-center justify-center py-4">
                    <span className="select-none font-mono text-sm text-gray-500">
                      ▾ Select a move
                    </span>
                  </div>
                )}
              </div>

              {dropdownOpen && (
                <div className="absolute left-0 right-0 z-50 max-h-[300px] overflow-y-auto rounded-lg border border-gray-700 bg-gray-900/95 backdrop-blur-sm">
                  {MOVE_ORDER.map((m) => (
                    <div
                      key={m}
                      className={`cursor-pointer border-b border-gray-800/60 transition hover:bg-gray-600/50 ${
                        m === displayedMove ? "bg-gray-600/40" : ""
                      }`}
                      onClick={() => selectMove(m)}
                    >
                      {renderArrows(
                        m,
                        MOVES_24[m],
                        ddArrowH,
                        `dd-${m.replace("'", "p")}`,
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Bottom sticker row (after) */}
            {perm && (
              <div
                onMouseEnter={(e) => handleRowMouseEnter(e, "after")}
                onMouseMove={(e) => handleRowMouseMove(e, "after")}
                onMouseLeave={handleRowMouseLeave}
              >
                {renderStickerRow(after, false, true)}
              </div>
            )}
          </div>
        </div>

        {/* Interactive tooltip cube (portal to body) */}
        {createPortal(
          <div
            className="fixed z-[9999] rounded-xl border border-gray-600 bg-gray-900/90 p-1 shadow-xl"
            style={{
              left: tooltipPos.x + 16,
              top: tooltipPos.y > 200 ? tooltipPos.y - 320 : tooltipPos.y + 20,
              opacity: tooltipVisible ? 1 : 0,
              visibility: tooltipVisible ? "visible" : "hidden",
              pointerEvents: tooltipVisible ? "auto" : "none",
              transition: "opacity 0.15s ease",
            }}
            onMouseEnter={handleTooltipMouseEnter}
            onMouseLeave={handleTooltipMouseLeave}
          >
            <RubikCube
              ref={tooltipCubeRef}
              width={320}
              height={300}
              size={2}
              showStateEditor={false}
              initialShowHelp={false}
              onMove={handleTooltipMove}
            />
          </div>,
          document.body,
        )}
      </CheeseSlideContainer>
    );
  },
);

export default StickerPermutation;
