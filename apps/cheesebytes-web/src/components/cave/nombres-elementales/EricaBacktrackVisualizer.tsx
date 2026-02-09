import React, { useState, useEffect, useRef, useCallback } from "react";
import { elementsData, categoryColors } from "./PeriodicTable";
import type { ElementData } from "./PeriodicTable";

// ── Reveal.js global type ───────────────────────────────────────────────────
interface RevealApi {
  on: (event: string, cb: () => void) => void;
  off: (event: string, cb: () => void) => void;
}
const getReveal = (): RevealApi | null =>
  (typeof window !== "undefined" &&
    (window as unknown as { Reveal?: RevealApi }).Reveal) ||
  null;

// ── Lookup ──────────────────────────────────────────────────────────────────
const elementBySymbol: Record<string, ElementData> = Object.fromEntries(
  elementsData.map((e) => [e.symbol, e]),
);

// ── Types ───────────────────────────────────────────────────────────────────
type TileState = "neutral" | "active" | "active2" | "consumed" | "rejected";

interface TileData {
  char: string;
  state: TileState;
}

type CardKind = "success" | "failure";

interface SymbolCard {
  symbol: string;
  elementName: string | null;
  kind: CardKind;
  visible: boolean;
}

interface ForkOption {
  symbol: string;
  elementName: string;
  tried: boolean; // true = already tried (red X)
  correct: boolean; // true = the working path (green check)
}

interface AnimationState {
  tiles: TileData[];
  cursor: { start: number; len: number } | null;
  card: SymbolCard | null;
  fork: ForkOption[] | null;
  finalSuccess: boolean;
  /** label shown under the tape during backtrack */
  statusLabel: string | null;
}

// ── Animation Script ────────────────────────────────────────────────────────
// Each step is a partial AnimationState update + duration in ms.
interface ScriptStep {
  apply: (prev: AnimationState) => AnimationState;
  durationMs: number;
}

const LETTERS = ["E", "R", "I", "C", "A"];

function makeTiles(chars: string[], states?: TileState[]): TileData[] {
  return chars.map((char, i) => ({
    char,
    state: states?.[i] ?? "neutral",
  }));
}

function buildScript(): ScriptStep[] {
  const steps: ScriptStep[] = [];

  // Helper to push a step
  const step = (
    durationMs: number,
    apply: (prev: AnimationState) => AnimationState,
  ) => {
    steps.push({ durationMs, apply });
  };

  // ── INITIAL STATE ─────────────────────────────────────────────────────────
  // All 5 tiles neutral, no cursor, no card
  step(1000, () => ({
    tiles: makeTiles(LETTERS),
    cursor: null,
    card: null,
    fork: null,
    finalSuccess: false,
    statusLabel: null,
  }));

  // ── STEP 1: Try "E" (1-letter) → fail ─────────────────────────────────
  // Highlight E
  step(800, (prev) => ({
    ...prev,
    tiles: makeTiles(LETTERS, [
      "active",
      "neutral",
      "neutral",
      "neutral",
      "neutral",
    ]),
    cursor: { start: 0, len: 1 },
    card: null,
  }));
  // Show failure card
  step(1400, (prev) => ({
    ...prev,
    card: { symbol: "E", elementName: null, kind: "failure", visible: true },
  }));
  // Mark rejected briefly
  step(800, (prev) => ({
    ...prev,
    tiles: makeTiles(LETTERS, [
      "rejected",
      "neutral",
      "neutral",
      "neutral",
      "neutral",
    ]),
    card: null,
  }));
  // Reset to neutral
  step(600, (prev) => ({
    ...prev,
    tiles: makeTiles(LETTERS),
    cursor: null,
  }));

  // ── STEP 2: Try "Er" (2-letter) → success → consume ───────────────────
  // Highlight E,R
  step(800, (prev) => ({
    ...prev,
    tiles: makeTiles(LETTERS, [
      "active",
      "active2",
      "neutral",
      "neutral",
      "neutral",
    ]),
    cursor: { start: 0, len: 2 },
    card: null,
  }));
  // Show success card
  step(1400, (prev) => ({
    ...prev,
    card: {
      symbol: "Er",
      elementName: "Erbium",
      kind: "success",
      visible: true,
    },
  }));
  // Consume E,R → tape becomes [I][C][A]
  step(800, (prev) => ({
    ...prev,
    tiles: makeTiles(LETTERS, [
      "consumed",
      "consumed",
      "neutral",
      "neutral",
      "neutral",
    ]),
    cursor: null,
    card: null,
  }));

  // ── STEP 3: Try "I" (1-letter) → success → consume ────────────────────
  // Highlight I
  step(800, (prev) => ({
    ...prev,
    tiles: makeTiles(LETTERS, [
      "consumed",
      "consumed",
      "active",
      "neutral",
      "neutral",
    ]),
    cursor: { start: 2, len: 1 },
  }));
  // Show success card
  step(1400, (prev) => ({
    ...prev,
    card: {
      symbol: "I",
      elementName: "Iodine",
      kind: "success",
      visible: true,
    },
  }));
  // Consume I → tape becomes [C][A]
  step(800, (prev) => ({
    ...prev,
    tiles: makeTiles(LETTERS, [
      "consumed",
      "consumed",
      "consumed",
      "neutral",
      "neutral",
    ]),
    cursor: null,
    card: null,
  }));

  // ── STEP 4: Try "C" (1-letter) → success → consume ────────────────────
  // Highlight C
  step(800, (prev) => ({
    ...prev,
    tiles: makeTiles(LETTERS, [
      "consumed",
      "consumed",
      "consumed",
      "active",
      "neutral",
    ]),
    cursor: { start: 3, len: 1 },
  }));
  // Show success card
  step(1400, (prev) => ({
    ...prev,
    card: {
      symbol: "C",
      elementName: "Carbon",
      kind: "success",
      visible: true,
    },
  }));
  // Consume C → tape becomes [A]
  step(800, (prev) => ({
    ...prev,
    tiles: makeTiles(LETTERS, [
      "consumed",
      "consumed",
      "consumed",
      "consumed",
      "neutral",
    ]),
    cursor: null,
    card: null,
  }));

  // ── STEP 5: Try "A" (1-letter) → fail ─────────────────────────────────
  // Highlight A
  step(800, (prev) => ({
    ...prev,
    tiles: makeTiles(LETTERS, [
      "consumed",
      "consumed",
      "consumed",
      "consumed",
      "active",
    ]),
    cursor: { start: 4, len: 1 },
  }));
  // Show failure card
  step(1600, (prev) => ({
    ...prev,
    tiles: makeTiles(LETTERS, [
      "consumed",
      "consumed",
      "consumed",
      "consumed",
      "rejected",
    ]),
    card: { symbol: "A", elementName: null, kind: "failure", visible: true },
  }));
  // Pause — dead end
  step(1600, (prev) => ({
    ...prev,
    card: null,
    cursor: null,
    statusLabel: "Dead end!",
  }));

  // ── STEP 6: Backtrack → restore [C][A] ────────────────────────────────
  // Restore C and A to neutral, show rewind
  step(1000, (prev) => ({
    ...prev,
    tiles: makeTiles(LETTERS, [
      "consumed",
      "consumed",
      "consumed",
      "neutral",
      "neutral",
    ]),
    cursor: null,
    statusLabel: "Backtrack to last choice...",
    fork: null,
  }));
  // Show fork overlay: C (tried) vs Ca (correct)
  step(800, (prev) => ({
    ...prev,
    cursor: { start: 3, len: 2 },
    tiles: makeTiles(LETTERS, [
      "consumed",
      "consumed",
      "consumed",
      "active",
      "active2",
    ]),
    statusLabel: null,
    fork: [
      { symbol: "C", elementName: "Carbon", tried: true, correct: false },
      { symbol: "Ca", elementName: "Calcium", tried: false, correct: true },
    ],
  }));
  // Hold the fork
  step(3000, (prev) => prev);

  // ── STEP 7: Take "Ca" → success → consume ─────────────────────────────
  // Dismiss fork, show Ca success
  step(1000, (prev) => ({
    ...prev,
    fork: null,
    card: {
      symbol: "Ca",
      elementName: "Calcium",
      kind: "success",
      visible: true,
    },
  }));
  // Consume C,A → tape empty
  step(1000, (prev) => ({
    ...prev,
    tiles: makeTiles(LETTERS, [
      "consumed",
      "consumed",
      "consumed",
      "consumed",
      "consumed",
    ]),
    cursor: null,
    card: null,
  }));
  // Show final success
  step(200, (prev) => ({
    ...prev,
    finalSuccess: true,
    statusLabel: null,
  }));

  return steps;
}

// ── Component Props ─────────────────────────────────────────────────────────
interface EricaBacktrackVisualizerProps {
  playOn?: "mount" | "revealVisible";
}

// ── Sub-components ──────────────────────────────────────────────────────────

const TILE_W = 110;
const TILE_H = 110;

const LetterTile: React.FC<{ data: TileData }> = ({ data }) => {
  const { char, state } = data;

  const baseClasses =
    "flex items-center justify-center font-mono font-bold text-5xl rounded-2xl border-3 select-none transition-all duration-500";

  let stateClasses = "";
  let style: React.CSSProperties = { width: TILE_W, height: TILE_H };

  switch (state) {
    case "neutral":
      stateClasses = "border-slate-500 bg-slate-800/60 text-slate-200";
      break;
    case "active":
      stateClasses =
        "border-amber-400 bg-amber-500/20 text-amber-300 shadow-[0_0_16px_rgba(251,191,36,0.35)]";
      break;
    case "active2":
      stateClasses =
        "border-amber-400 bg-amber-500/20 text-amber-300 shadow-[0_0_16px_rgba(251,191,36,0.35)]";
      break;
    case "consumed":
      stateClasses =
        "border-transparent bg-transparent text-transparent pointer-events-none";
      style = {
        ...style,
        width: 0,
        padding: 0,
        margin: 0,
        borderWidth: 0,
        overflow: "hidden",
      };
      break;
    case "rejected":
      stateClasses = "border-red-500/60 bg-red-900/30 text-red-400/60";
      break;
  }

  return (
    <div className={`${baseClasses} ${stateClasses}`} style={style}>
      {state !== "consumed" && char}
      {state === "rejected" && (
        <span className="absolute text-xs text-red-400 -bottom-0 -right-0 opacity-60">
          ✕
        </span>
      )}
    </div>
  );
};

/** Renders an element tile as SVG matching the project-wide ElementTileSVG style */
const ElementTileCard: React.FC<{
  element: ElementData;
  size?: number;
  opacity?: number;
}> = ({ element, size = 95, opacity = 1 }) => {
  const color = categoryColors[element.category] || "#D1C4E9";
  const cx = size / 2;
  return (
    <svg
      viewBox={`0 0 ${size} ${size}`}
      width={size}
      height={size}
      style={{ opacity, flexShrink: 0 }}
    >
      <rect
        width={size}
        height={size}
        rx="12"
        ry="12"
        fill={color}
        stroke="rgba(0,0,0,0.15)"
        strokeWidth="3"
      />
      <text x="8" y="20" className="text-sm font-bold" fill="#4a5568">
        {element.number}
      </text>
      <text
        x={cx}
        y={cx + 10}
        textAnchor="middle"
        className="text-4xl font-bold"
        fill="#2d3748"
      >
        {element.symbol}
      </text>
      <text
        x={cx}
        y={cx + 32}
        textAnchor="middle"
        className="text-xs"
        fill="#4a5568"
      >
        {element.nameEn}
      </text>
    </svg>
  );
};

const CardOverlay: React.FC<{ card: SymbolCard }> = ({ card }) => {
  const isSuccess = card.kind === "success";
  const element = card.symbol
    ? elementBySymbol[
        card.symbol.charAt(0).toUpperCase() + card.symbol.slice(1).toLowerCase()
      ]
    : null;

  return (
    <div
      className={`
        flex items-center gap-5 px-6 py-4 rounded-2xl border-2 font-bold
        transition-all duration-200
        ${
          isSuccess
            ? "border-green-500/60 bg-green-900/50 text-green-300"
            : "border-red-500/60 bg-red-900/50 text-red-300"
        }
      `}
      style={{
        animation: "ebt-card-pop 0.3s ease-out both",
      }}
    >
      {/* Element tile (full style, matching the periodic table) */}
      {element && <ElementTileCard element={element} size={95} />}

      <div className="flex flex-col gap-1">
        <span className="text-lg tracking-wide">
          {card.symbol} → {card.elementName ?? "Not a symbol"}
        </span>
      </div>

      {/* Icon */}
      <span className="text-xl ml-2">
        {isSuccess ? (
          <svg viewBox="0 0 24 24" className="w-8 h-8" fill="none">
            <path
              d="M5 13l4 4L19 7"
              stroke="currentColor"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" className="w-8 h-8" fill="none">
            <path
              d="M6 6l12 12M18 6L6 18"
              stroke="currentColor"
              strokeWidth="3"
              strokeLinecap="round"
            />
          </svg>
        )}
      </span>
    </div>
  );
};

const ForkOverlay: React.FC<{ options: ForkOption[] }> = ({ options }) => (
  <div
    className="flex flex-col gap-3"
    style={{ animation: "ebt-fork-in 0.4s ease-out both" }}
  >
    {options.map((opt, i) => {
      const element =
        elementBySymbol[
          opt.symbol.charAt(0).toUpperCase() + opt.symbol.slice(1).toLowerCase()
        ];

      return (
        <div
          key={opt.symbol}
          className={`
            flex items-center gap-4 px-4 py-2 rounded-2xl border-2 font-bold
            transition-all duration-200
            ${
              opt.tried
                ? "border-red-500/40 bg-red-950/40 text-red-400/70"
                : "border-green-400 bg-green-900/50 text-green-300 shadow-[0_0_14px_rgba(34,197,94,0.25)]"
            }
          `}
          style={{
            animation: `ebt-fork-row 0.35s ease-out ${i * 0.15}s both`,
          }}
        >
          {/* Element tile (full style) */}
          {element && (
            <ElementTileCard
              element={element}
              size={80}
              opacity={opt.tried ? 0.4 : 1}
            />
          )}

          <div className="flex flex-col gap-0.5">
            <span className="text-lg tracking-wide">
              {opt.symbol} → {opt.elementName}
            </span>
            <span className="text-sm font-normal opacity-70">
              {opt.tried ? "Leads to dead end" : "Completes the name"}
            </span>
          </div>

          {/* Icon */}
          <span className="ml-auto text-lg">
            {opt.tried ? (
              <svg viewBox="0 0 24 24" className="w-7 h-7" fill="none">
                <path
                  d="M6 6l12 12M18 6L6 18"
                  stroke="currentColor"
                  strokeWidth="3"
                  strokeLinecap="round"
                />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" className="w-7 h-7" fill="none">
                <path
                  d="M5 13l4 4L19 7"
                  stroke="currentColor"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            )}
          </span>
        </div>
      );
    })}
  </div>
);

const FinalCheckmark: React.FC = () => (
  <div
    className="flex flex-col items-center gap-2"
    style={{ animation: "ebt-success-pop 0.5s ease-out both" }}
  >
    <svg
      viewBox="0 0 96 96"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="w-20 h-20"
    >
      <rect
        x="4"
        y="4"
        width="88"
        height="88"
        rx="18"
        className="fill-green-900/40"
      />
      <path
        d="M28 50 L42 64 L68 32"
        className="stroke-green-400"
        strokeWidth="10"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
    <span className="text-green-400 text-xl font-bold tracking-wider uppercase">
      Elemental!
    </span>
  </div>
);

// ── Main Component ──────────────────────────────────────────────────────────

const EricaBacktrackVisualizer: React.FC<EricaBacktrackVisualizerProps> = ({
  playOn = "revealVisible",
}) => {
  const script = useRef(buildScript());
  const containerRef = useRef<HTMLDivElement>(null);
  const hasPlayed = useRef(false);
  const timeoutsRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  const initialState: AnimationState = {
    tiles: makeTiles(LETTERS),
    cursor: null,
    card: null,
    fork: null,
    finalSuccess: false,
    statusLabel: null,
  };

  const [state, setState] = useState<AnimationState>(initialState);

  const cleanup = useCallback(() => {
    timeoutsRef.current.forEach(clearTimeout);
    timeoutsRef.current = [];
  }, []);

  const reset = useCallback(() => {
    cleanup();
    setState({
      tiles: makeTiles(LETTERS),
      cursor: null,
      card: null,
      fork: null,
      finalSuccess: false,
      statusLabel: null,
    });
    hasPlayed.current = false;
  }, [cleanup]);

  const play = useCallback(() => {
    if (hasPlayed.current) return;
    hasPlayed.current = true;

    let cumulativeDelay = 0;
    const steps = script.current;

    steps.forEach((s) => {
      const t = setTimeout(() => {
        setState((prev) => s.apply(prev));
      }, cumulativeDelay);
      timeoutsRef.current.push(t);
      cumulativeDelay += s.durationMs;
    });

    // Mark done after all steps complete
    const endT = setTimeout(() => {}, cumulativeDelay);
    timeoutsRef.current.push(endT);
  }, []);

  // ── Triggers ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (playOn === "mount") {
      const t = setTimeout(play, 300);
      return () => clearTimeout(t);
    }
  }, [playOn, play]);

  useEffect(() => {
    if (playOn !== "revealVisible") return;

    const handleSlideChanged = () => {
      if (!containerRef.current) return;
      const activeSlide = document.querySelector(".reveal .present");
      if (activeSlide && activeSlide.contains(containerRef.current)) {
        reset();
        setTimeout(play, 200);
      }
    };

    const initialCheck = setTimeout(handleSlideChanged, 400);

    const reveal = getReveal();
    if (reveal) {
      reveal.on("slidechanged", handleSlideChanged);
      reveal.on("fragmentshown", handleSlideChanged);
    }

    return () => {
      clearTimeout(initialCheck);
      cleanup();
      const r = getReveal();
      if (r) {
        r.off("slidechanged", handleSlideChanged);
        r.off("fragmentshown", handleSlideChanged);
      }
    };
  }, [playOn, play, reset, cleanup]);

  // Cleanup on unmount
  useEffect(() => cleanup, [cleanup]);

  // ── Render ────────────────────────────────────────────────────────────────
  const visibleTiles = state.tiles;

  // How many tiles are still visible (not consumed)?
  const activeTileCount = visibleTiles.filter(
    (t) => t.state !== "consumed",
  ).length;

  return (
    <div
      ref={containerRef}
      className="flex flex-col items-center justify-center gap-6 select-none not-prose font-mono"
      style={{ minHeight: "22em" }}
    >
      {/* ── Injected keyframes ── */}
      <style>{`
        @keyframes ebt-card-pop {
          0%   { opacity: 0; transform: translateY(8px) scale(0.92); }
          100% { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes ebt-fork-in {
          0%   { opacity: 0; transform: translateY(6px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        @keyframes ebt-fork-row {
          0%   { opacity: 0; transform: translateX(-10px); }
          100% { opacity: 1; transform: translateX(0); }
        }
        @keyframes ebt-success-pop {
          0%   { opacity: 0; transform: scale(0.6); }
          60%  { transform: scale(1.12); }
          100% { opacity: 1; transform: scale(1); }
        }
        @keyframes ebt-label-in {
          0%   { opacity: 0; transform: translateY(4px); }
          100% { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      {/* ── Title ── */}
      <h1 className="text-3xl font-bold dark:text-gray-100 text-gray-800">
        Greedy Approach
      </h1>

      {/* ── Letter Tape ── */}
      <div className="relative flex items-center justify-center gap-4">
        {visibleTiles
          .filter((t) => t.state !== "consumed")
          .map((tile, i) => (
            <LetterTile key={`${tile.char}-${i}`} data={tile} />
          ))}
        {/* Empty-tape placeholder */}
        {activeTileCount === 0 && (
          <div
            className="text-slate-600 text-lg italic"
            style={{ minWidth: 120, textAlign: "center" }}
          >
            (empty)
          </div>
        )}
      </div>

      {/* ── Symbol Card / Status / Fork — single slot to avoid stacking gaps ── */}
      <div
        className="flex flex-col items-center gap-3"
        style={{ minHeight: 110 }}
      >
        {state.card?.visible && <CardOverlay card={state.card} />}

        {state.statusLabel && (
          <div
            className="text-amber-400 text-base font-bold tracking-wide"
            style={{ animation: "ebt-label-in 0.3s ease-out both" }}
            key={state.statusLabel}
          >
            {state.statusLabel}
          </div>
        )}

        {state.fork && <ForkOverlay options={state.fork} />}
      </div>

      {/* ── Final Success ── */}
      {state.finalSuccess && <FinalCheckmark />}
    </div>
  );
};

export default EricaBacktrackVisualizer;
