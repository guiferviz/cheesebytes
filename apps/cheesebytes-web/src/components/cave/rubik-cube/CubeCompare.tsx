/**
 * CubeCompare.tsx
 *
 * Slide hook component: shows a 3×3 cube with its state count on top,
 * and (via Reveal.js fragment) a 2×2 cube below whose counter rapidly
 * drops from the 3×3 value down to the real 2×2 value, then blurs out.
 *
 * Resets every time the parent <section> becomes the active slide.
 */
import React, { useState, useEffect, useRef, useCallback } from "react";
import RubikCube, { type RubikCubeHandle } from "./RubikCube";
import { CheeseSlideContainer } from "../shared";

// ── Tunable constants ────────────────────────────────────────────────────────

/** Milliseconds between auto-rotation moves on both cubes. */
const MOVE_INTERVAL_MS = 100;

const THREE_BY_THREE_STATES = 43_252_003_274_489_856_000n;
const TWO_BY_TWO_STATES = 3_674_160n;
const ANIM_DURATION_MS = 3000;

function formatNumber(n: bigint): string {
  return n.toLocaleString("en-US");
}

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

// ── Component ────────────────────────────────────────────────────────────────

export const CubeCompare: React.FC = () => {
  const cube3Ref = useRef<RubikCubeHandle>(null);
  const cube2Ref = useRef<RubikCubeHandle>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const fragmentRef = useRef<HTMLDivElement>(null);

  const [show2x2, setShow2x2] = useState(false);
  const [displayNumber, setDisplayNumber] = useState(
    formatNumber(THREE_BY_THREE_STATES),
  );
  const [blurAmount, setBlurAmount] = useState(0);
  const animRaf = useRef<number | null>(null);

  // ── Reset when the parent <section> becomes the current slide ──────────
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    let sectionEl: HTMLElement | null = el;
    while (sectionEl && sectionEl.tagName !== "SECTION") {
      sectionEl = sectionEl.parentElement;
    }
    if (!sectionEl) return;

    function reset() {
      if (animRaf.current) cancelAnimationFrame(animRaf.current);
      animRaf.current = null;
      setShow2x2(false);
      setDisplayNumber(formatNumber(THREE_BY_THREE_STATES));
      setBlurAmount(0);
    }

    const obs = new MutationObserver(() => {
      // Reveal.js sets .present on the active section
      if (sectionEl!.classList.contains("present")) reset();
    });
    obs.observe(sectionEl, { attributes: true, attributeFilter: ["class"] });
    return () => obs.disconnect();
  }, []);

  // ── Detect fragment visibility for 2×2 row ────────────────────────────
  useEffect(() => {
    const frag = fragmentRef.current;
    if (!frag) return;

    const check = () => {
      if (frag.classList.contains("visible") && !show2x2) {
        setShow2x2(true);
      }
    };
    check();
    const obs = new MutationObserver(check);
    obs.observe(frag, { attributes: true, attributeFilter: ["class"] });
    return () => obs.disconnect();
  }, [show2x2]);

  // ── Countdown animation ────────────────────────────────────────────────
  const startCountdown = useCallback(() => {
    if (animRaf.current) return;

    const start = performance.now();
    const from = Number(THREE_BY_THREE_STATES);
    const to = Number(TWO_BY_TWO_STATES);

    function tick(now: number) {
      const elapsed = now - start;
      const t = Math.min(1, elapsed / ANIM_DURATION_MS);
      const eased = easeOutCubic(t);

      const logFrom = Math.log10(from);
      const logTo = Math.log10(to);
      const logCurrent = logFrom + (logTo - logFrom) * eased;
      const current = BigInt(Math.round(Math.pow(10, logCurrent)));

      setDisplayNumber(formatNumber(current > 0n ? current : 1n));

      const blurStart = 0.6;
      const blurProgress = Math.max(0, (t - blurStart) / (1 - blurStart));
      setBlurAmount(blurProgress * 12);

      if (t < 1) {
        animRaf.current = requestAnimationFrame(tick);
      } else {
        setDisplayNumber(formatNumber(TWO_BY_TWO_STATES));
        setBlurAmount(12);
        animRaf.current = null;
      }
    }

    animRaf.current = requestAnimationFrame(tick);
  }, []);

  useEffect(() => {
    if (show2x2) {
      const timer = setTimeout(startCountdown, 400);
      return () => clearTimeout(timer);
    }
  }, [show2x2, startCountdown]);

  // ── Auto-rotation (random scramble) ─────────────────────────────────
  useEffect(() => {
    const faces3 = ["R", "U", "F", "L", "D", "B"];
    const faces2 = ["R", "U", "F", "L"];
    let last3 = "";
    let last2 = "";

    const pickRandom = (faces: string[], last: string) => {
      const pool = faces.filter((f) => f !== last);
      return pool[Math.floor(Math.random() * pool.length)];
    };

    const iv3 = setInterval(() => {
      const face = pickRandom(faces3, last3);
      last3 = face;
      cube3Ref.current?.applyMove(face, Math.random() < 0.5);
    }, MOVE_INTERVAL_MS);
    const iv2 = setInterval(() => {
      if (show2x2) {
        const face = pickRandom(faces2, last2);
        last2 = face;
        cube2Ref.current?.applyMove(face, Math.random() < 0.5);
      }
    }, MOVE_INTERVAL_MS);
    return () => {
      clearInterval(iv3);
      clearInterval(iv2);
    };
  }, [show2x2]);

  return (
    <CheeseSlideContainer>
      <div
        ref={containerRef}
        className="flex h-full w-full items-center justify-center"
        style={{
          zoom: 1.4,
        }}
      >
        {/* 2-column, 2-row grid — columns never shift */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "240px 1fr",
            gridTemplateRows: "auto auto",
            gap: "16px 32px",
            alignItems: "center",
          }}
        >
          {/* Row 1, Col 1: 3×3 cube */}
          <div className="flex items-center justify-center overflow-hidden rounded-xl">
            <RubikCube
              ref={cube3Ref}
              width={240}
              height={220}
              size={3}
              initialShowHelp={false}
            />
          </div>

          {/* Row 1, Col 2: 3×3 number */}
          <div className="flex flex-col items-start gap-1">
            <span className="font-mono text-xs uppercase tracking-widest text-gray-400 opacity-70">
              3×3×3 configurations
            </span>
            <span className="font-mono text-3xl font-bold text-amber-200/90 tabular-nums">
              {formatNumber(THREE_BY_THREE_STATES)}
            </span>
          </div>

          {/* Row 2: 2×2 — appears on fragment */}
          <div
            ref={fragmentRef}
            className="fragment"
            style={{ display: "contents" }}
          >
            {/* Row 2, Col 1: 2×2 cube */}
            <div className="flex items-center justify-center overflow-hidden rounded-xl">
              <RubikCube
                ref={cube2Ref}
                width={240}
                height={220}
                size={2}
                initialShowHelp={false}
              />
            </div>

            {/* Row 2, Col 2: 2×2 number */}
            <div className="flex flex-col items-start gap-1">
              <span className="font-mono text-xs uppercase tracking-widest text-gray-400 opacity-70">
                2×2×2 configurations
              </span>
              <span
                className="font-mono text-3xl font-bold text-cyan-200/90 tabular-nums"
                style={{
                  filter: `blur(${blurAmount}px)`,
                  transition: "filter 0.15s ease",
                }}
              >
                {displayNumber}
              </span>
            </div>
          </div>
        </div>
      </div>
    </CheeseSlideContainer>
  );
};
