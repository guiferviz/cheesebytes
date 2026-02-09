import React, { useState, useEffect, useRef, useCallback } from "react";
import { elementsData, categoryColors } from "./PeriodicTable";
import type { ElementData } from "./PeriodicTable";

// ── Reveal.js global type ───────────────────────────────────────────────────────
interface RevealApi {
  on: (event: string, cb: () => void) => void;
  off: (event: string, cb: () => void) => void;
}
const getReveal = (): RevealApi | null =>
  (typeof window !== "undefined" &&
    (window as unknown as { Reveal?: RevealApi }).Reveal) ||
  null;

// ── Lookup ──────────────────────────────────────────────────────────────────────
const elementBySymbol: Record<string, ElementData> = Object.fromEntries(
  elementsData.map((e) => [e.symbol, e]),
);

// A curated pool of symbols used during the spinning animation.
const SPIN_POOL = elementsData
  .filter((e) => e.number <= 36)
  .map((e) => e.symbol);

// ── Types ───────────────────────────────────────────────────────────────────────
export interface ElementToken {
  symbol: string; // e.g. "Li", "Am"
}

type ReelState = "idle" | "spinning" | "settled-success" | "settled-fail";

interface ReelData {
  token: ElementToken | null;
  state: ReelState;
  /** Current symbol shown in the viewport while spinning */
  displaySymbol: string;
}

export interface ElementSlotMachineProps {
  /** The name to display in the bar, e.g. "Liam" */
  name: string;
  /**
   * Ordered tokens that map to the reels.
   * `{ symbol: "Li" }` → success reel.
   * `null` → fail reel (shows ✕).
   */
  tokens: (ElementToken | null)[];
  /** Play on mount or when Reveal makes the slide visible (default: "revealVisible") */
  playOn?: "mount" | "revealVisible";
  /** Total spin time per reel in ms (default 900) */
  spinDurationMs?: number;
  /** Stagger between reel stops in ms (default 350) */
  staggerMs?: number;
  /** Show a typing effect on the name bar (default true) */
  typing?: boolean;
  /** Callback when the entire animation has finished */
  onDone?: () => void;
}

// ── Tile sub-components (HTML/CSS, no SVG) ──────────────────────────────────────

const TILE_SIZE = 120; // px

/** Success tile – mirrors ElementTileSVG style but in HTML */
const SuccessTile: React.FC<{ element: ElementData }> = ({ element }) => {
  const color = categoryColors[element.category] || "#D1C4E9";
  return (
    <div
      className="flex flex-col items-center justify-center rounded-2xl border-[3px] select-none"
      style={{
        width: TILE_SIZE,
        height: TILE_SIZE,
        backgroundColor: color,
        borderColor: "rgba(0,0,0,0.15)",
      }}
    >
      <span className="text-[11px] font-bold text-slate-600 self-start pl-2 pt-1 leading-none">
        {element.number}
      </span>
      <span className="text-4xl font-bold text-slate-800 -mt-1">
        {element.symbol}
      </span>
      <span className="text-[11px] text-slate-600 leading-tight">
        {element.nameEn}
      </span>
    </div>
  );
};

/** Fail tile – same dimensions, neutral/red */
const FailTile: React.FC = () => (
  <div
    className="flex items-center justify-center rounded-2xl border-[3px] select-none"
    style={{
      width: TILE_SIZE,
      height: TILE_SIZE,
      backgroundColor: "#fee2e2",
      borderColor: "#fca5a5",
    }}
  >
    <span className="text-5xl font-bold text-red-400">✕</span>
  </div>
);

/** Spinning tile – neutral look with a rapidly-cycling symbol */
const SpinTile: React.FC<{ symbol: string }> = ({ symbol }) => (
  <div
    className="flex items-center justify-center rounded-2xl border-[3px] select-none"
    style={{
      width: TILE_SIZE,
      height: TILE_SIZE,
      backgroundColor: "#f1f5f9",
      borderColor: "#cbd5e1",
    }}
  >
    <span
      className="text-4xl font-bold text-slate-400"
      style={{ filter: "blur(2px)" }}
    >
      {symbol}
    </span>
  </div>
);

/** Idle tile – blank placeholder */
const IdleTile: React.FC = () => (
  <div
    className="rounded-2xl border-[3px] border-dashed select-none"
    style={{
      width: TILE_SIZE,
      height: TILE_SIZE,
      backgroundColor: "transparent",
      borderColor: "#94a3b8",
    }}
  />
);

// ── Main component ──────────────────────────────────────────────────────────────

const ElementSlotMachine: React.FC<ElementSlotMachineProps> = ({
  name,
  tokens,
  playOn = "revealVisible",
  spinDurationMs = 900,
  staggerMs = 350,
  typing = true,
  onDone,
}) => {
  // ── State ──
  const [phase, setPhase] = useState<
    "waiting" | "typing" | "spinning" | "done"
  >("waiting");
  const [typedChars, setTypedChars] = useState(0);
  const [reels, setReels] = useState<ReelData[]>(() =>
    tokens.map((t) => ({
      token: t,
      state: "idle" as ReelState,
      displaySymbol: SPIN_POOL[Math.floor(Math.random() * SPIN_POOL.length)],
    })),
  );
  const [shaking, setShaking] = useState(false);
  const hasPlayed = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // ── Determine outcome ──
  const isSuccess = tokens.every((t) => t !== null);

  // ── Actions ──
  const reset = useCallback(() => {
    setPhase("waiting");
    setTypedChars(0);
    setReels((prev) =>
      prev.map((r) => ({
        ...r,
        state: "idle",
      })),
    );
    setShaking(false);
    hasPlayed.current = false;
  }, []);

  const play = useCallback(() => {
    if (hasPlayed.current) return;
    hasPlayed.current = true;

    if (typing) {
      setPhase("typing");
    } else {
      setPhase("spinning");
    }
  }, [typing]);

  // Mount-based trigger
  useEffect(() => {
    if (playOn === "mount") {
      // Small delay so the component is visible before animation starts
      const t = setTimeout(play, 200);
      return () => clearTimeout(t);
    }
  }, [playOn, play]);

  // Reveal.js-based trigger
  useEffect(() => {
    if (playOn !== "revealVisible") return;

    const handleSlideChanged = () => {
      if (!containerRef.current) return;
      // Check if this component is inside the currently-active slide
      const activeSlide = document.querySelector(".reveal .present");
      if (activeSlide && activeSlide.contains(containerRef.current)) {
        // Reset and play whenever the slide becomes active
        reset();
        setTimeout(play, 100);
      }
    };

    // Also try on mount in case the slide is already visible
    const initialCheck = setTimeout(handleSlideChanged, 300);

    // Listen to Reveal events
    const reveal = getReveal();
    if (reveal) {
      reveal.on("slidechanged", handleSlideChanged);
      reveal.on("fragmentshown", handleSlideChanged);
    }

    return () => {
      clearTimeout(initialCheck);
      const r = getReveal();
      if (r) {
        r.off("slidechanged", handleSlideChanged);
        r.off("fragmentshown", handleSlideChanged);
      }
    };
  }, [playOn, play, reset]);

  // ── Typing phase ──
  useEffect(() => {
    if (phase !== "typing") return;
    if (typedChars >= name.length) {
      // Typing done → start spinning after a short pause
      const t = setTimeout(() => setPhase("spinning"), 300);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => setTypedChars((c) => c + 1), 80);
    return () => clearTimeout(t);
  }, [phase, typedChars, name.length]);

  // ── Spinning phase: cycle display symbols ──
  useEffect(() => {
    if (phase !== "spinning") return;

    // Initialise all reels to spinning
    setReels((prev) =>
      prev.map((r) => (r.state === "idle" ? { ...r, state: "spinning" } : r)),
    );

    // Rapid symbol cycling
    const interval = setInterval(() => {
      setReels((prev) =>
        prev.map((r) =>
          r.state === "spinning"
            ? {
                ...r,
                displaySymbol:
                  SPIN_POOL[Math.floor(Math.random() * SPIN_POOL.length)],
              }
            : r,
        ),
      );
    }, 60);

    // Staggered stops
    const timeouts: ReturnType<typeof setTimeout>[] = [];
    tokens.forEach((token, idx) => {
      const delay = spinDurationMs + idx * staggerMs;
      const t = setTimeout(() => {
        setReels((prev) => {
          const next = [...prev];
          next[idx] = {
            ...next[idx],
            state: token ? "settled-success" : "settled-fail",
          };
          return next;
        });
      }, delay);
      timeouts.push(t);
    });

    // After all reels settle → done
    const totalTime = spinDurationMs + (tokens.length - 1) * staggerMs + 100;
    const doneTimeout = setTimeout(() => {
      clearInterval(interval);
      setPhase("done");
    }, totalTime);
    timeouts.push(doneTimeout);

    return () => {
      clearInterval(interval);
      timeouts.forEach(clearTimeout);
    };
  }, [phase, tokens, spinDurationMs, staggerMs]);

  // ── Done phase: shake on fail, call onDone ──
  useEffect(() => {
    if (phase !== "done") return;
    if (!isSuccess) {
      setShaking(true);
      const t = setTimeout(() => setShaking(false), 500);
      return () => clearTimeout(t);
    }
    onDone?.();
  }, [phase, isSuccess, onDone]);

  // Fire onDone after shake finishes
  useEffect(() => {
    if (phase === "done" && !isSuccess && !shaking) {
      onDone?.();
    }
  }, [phase, isSuccess, shaking, onDone]);

  // ── Render helpers ──
  const displayName =
    phase === "waiting"
      ? ""
      : phase === "typing"
        ? name.slice(0, typedChars)
        : name;

  const showBadge = phase === "done";

  const renderReel = (reel: ReelData, idx: number) => {
    switch (reel.state) {
      case "idle":
        return <IdleTile key={idx} />;
      case "spinning":
        return <SpinTile key={idx} symbol={reel.displaySymbol} />;
      case "settled-success": {
        const el = reel.token ? elementBySymbol[reel.token.symbol] : null;
        return el ? (
          <SuccessTile key={idx} element={el} />
        ) : (
          <FailTile key={idx} />
        );
      }
      case "settled-fail":
        return <FailTile key={idx} />;
    }
  };

  return (
    <div
      ref={containerRef}
      className="flex flex-col items-center justify-center gap-8 select-none"
      style={{ fontFamily: "inherit" }}
    >
      {/* ── CSS (scoped via unique class) ── */}
      <style>{`
        @keyframes slot-shake {
          0%, 100% { transform: translateX(0); }
          20% { transform: translateX(-6px); }
          40% { transform: translateX(6px); }
          60% { transform: translateX(-4px); }
          80% { transform: translateX(4px); }
        }
        .slot-shaking {
          animation: slot-shake 0.4s ease-in-out;
        }
        @keyframes slot-glow-green {
          0% { box-shadow: 0 0 0 0 rgba(34,197,94,0); }
          50% { box-shadow: 0 0 20px 6px rgba(34,197,94,0.35); }
          100% { box-shadow: 0 0 0 0 rgba(34,197,94,0); }
        }
        .slot-glow-pass {
          animation: slot-glow-green 1s ease-out;
        }
        @keyframes slot-cursor-blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0; }
        }
        .slot-cursor {
          animation: slot-cursor-blink 0.6s step-end infinite;
        }
        @keyframes slot-badge-pop {
          0% { transform: scale(0); opacity: 0; }
          60% { transform: scale(1.15); opacity: 1; }
          100% { transform: scale(1); opacity: 1; }
        }
        .slot-badge-enter {
          animation: slot-badge-pop 0.35s ease-out both;
        }
        @keyframes slot-reel-pop {
          0% { transform: scale(0.85); opacity: 0.6; }
          50% { transform: scale(1.06); }
          100% { transform: scale(1); opacity: 1; }
        }
        .slot-reel-settle {
          animation: slot-reel-pop 0.3s ease-out both;
        }
      `}</style>

      {/* ── Name Bar ── */}
      <div
        className={`
          relative flex items-center justify-center rounded-xl border-2 px-8 py-3
          transition-colors duration-300
          ${phase === "done" && isSuccess ? "border-green-400 slot-glow-pass" : ""}
          ${phase === "done" && !isSuccess ? "border-red-400" : ""}
          ${phase !== "done" ? "border-slate-500" : ""}
        `}
        style={{
          minWidth: `${Math.max(name.length * 1.2, 4)}em`,
          minHeight: "2.6em",
          backgroundColor: "rgba(15,23,42,0.6)",
        }}
      >
        <span
          className="text-4xl font-mono font-bold tracking-[0.25em] uppercase"
          style={{
            color: phase === "done" && !isSuccess ? "#f87171" : "#e2e8f0",
          }}
        >
          {displayName}
        </span>

        {/* Blinking cursor while typing */}
        {phase === "typing" && (
          <span className="slot-cursor text-4xl font-mono font-bold text-sky-400 ml-[1px]">
            |
          </span>
        )}

        {/* Badge */}
        {showBadge && (
          <span
            className={`
              slot-badge-enter absolute -right-3 -top-3 px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider
              ${isSuccess ? "bg-green-500 text-white" : "bg-red-500 text-white"}
            `}
          >
            {isSuccess ? "Pass" : "Fail"}
          </span>
        )}
      </div>

      {/* ── Reels Row ── */}
      <div
        className={`flex items-center gap-4 ${shaking ? "slot-shaking" : ""}`}
      >
        {reels.map((reel, idx) => (
          <div
            key={idx}
            className={
              reel.state === "settled-success" || reel.state === "settled-fail"
                ? "slot-reel-settle"
                : ""
            }
          >
            {renderReel(reel, idx)}
          </div>
        ))}
      </div>
    </div>
  );
};

export default ElementSlotMachine;
