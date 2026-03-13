/**
 * EncodingShowcase.tsx
 *
 * Slide component: Rubik's Cube on the left, cycling code encodings on the
 * right with glitch/blur transitions.  Pure presentational — the snippets
 * don't need to match real logic.
 */
import React, { useState, useEffect, useRef } from "react";
import RubikCube, { type RubikCubeHandle } from "./RubikCube";
import { CheeseSlideContainer } from "../shared";

// ── Encoding snippets (Python-ish) ──────────────────────────────────────────

const ENCODINGS: { label: string; code: string }[] = [
  {
    label: "string",
    code: `state = "BBBBRRRRYYYYOOOOWWWWGGGG"`,
  },
  {
    label: "list",
    code: `state = [0, 0, 0, 0, 1, 1, 1, 1,
         2, 2, 2, 2, 3, 3, 3, 3,
         4, 4, 4, 4, 5, 5, 5, 5]`,
  },
  {
    label: "dict",
    code: `state = {
    "U": ["B", "B", "B", "B"],
    "R": ["R", "R", "R", "R"],
    "F": ["Y", "Y", "Y", "Y"],
    "L": ["O", "O", "O", "O"],
    "B": ["W", "W", "W", "W"],
    "D": ["G", "G", "G", "G"],
}`,
  },
  {
    label: "tuple",
    code: `state = (
    (0, 0, 0, 0),  # U
    (1, 1, 1, 1),  # R
    (2, 2, 2, 2),  # F
    (3, 3, 3, 3),  # L
    (4, 4, 4, 4),  # B
    (5, 5, 5, 5),  # D
)`,
  },
  {
    label: "bytes",
    code: `state = b"\\x00\\x00\\x00\\x00"
        b"\\x01\\x01\\x01\\x01"
        b"\\x02\\x02\\x02\\x02"
        b"\\x03\\x03\\x03\\x03"
        b"\\x04\\x04\\x04\\x04"
        b"\\x05\\x05\\x05\\x05"`,
  },
  {
    label: "int",
    code: `state = 42_391_158`,
  },
];

const DISPLAY_MS = 2400;
const GLITCH_MS = 350;

// ── Component ────────────────────────────────────────────────────────────────

interface EncodingShowcaseProps {
  width?: number;
  height?: number;
}

export const EncodingShowcase: React.FC<EncodingShowcaseProps> = ({
  width = 1080,
  height = 600,
}) => {
  const cubeRef = useRef<RubikCubeHandle>(null);
  const [idx, setIdx] = useState(0);
  const [glitching, setGlitching] = useState(false);

  // Auto-rotate moves on the cube for visual interest
  const moves = useRef(["R", "U", "F", "R", "U", "F"]);
  const moveIdx = useRef(0);
  useEffect(() => {
    const iv = setInterval(() => {
      const m = moves.current[moveIdx.current % moves.current.length];
      cubeRef.current?.applyMove(m, true);
      moveIdx.current++;
    }, 1800);
    return () => clearInterval(iv);
  }, []);

  // Cycle through encodings
  useEffect(() => {
    const iv = setInterval(() => {
      setGlitching(true);
      setTimeout(() => {
        setIdx((i) => (i + 1) % ENCODINGS.length);
        setGlitching(false);
      }, GLITCH_MS);
    }, DISPLAY_MS);
    return () => clearInterval(iv);
  }, []);

  const encoding = ENCODINGS[idx];

  return (
    <CheeseSlideContainer>
      <div className="flex h-full w-full items-center justify-center gap-6 px-4">
        {/* Left: Cube */}
        <div className="shrink-0 rounded-xl overflow-hidden">
          <RubikCube
            ref={cubeRef}
            width={Math.round(width * 0.42)}
            height={height}
            size={2}
            initialShowHelp={false}
          />
        </div>

        {/* Arrow */}
        <div className="flex flex-col items-center gap-1 text-gray-400 select-none">
          <svg
            width="64"
            height="64"
            viewBox="0 0 64 64"
            fill="none"
            className="opacity-60"
          >
            <path
              d="M8 32 H48 M40 22 L52 32 L40 42"
              stroke="currentColor"
              strokeWidth="3.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <span className="font-mono text-[11px] tracking-widest uppercase opacity-50">
            encode
          </span>
        </div>

        {/* Right: Code block with glitch */}
        <div className="relative min-w-[340px] max-w-[480px] flex-1">
          {/* Label chip */}
          <div className="mb-2 flex items-center gap-2">
            <span
              className="inline-block rounded-full bg-gray-700/60 px-3 py-0.5
                font-mono text-[11px] uppercase tracking-widest text-gray-300
                transition-opacity duration-200"
              style={{ opacity: glitching ? 0 : 1 }}
            >
              {encoding.label}
            </span>
          </div>

          {/* Code */}
          <div
            className="relative overflow-hidden rounded-lg border border-gray-700/50
              bg-gray-900/80 px-5 py-4 font-mono text-[15px] leading-relaxed
              text-emerald-300 shadow-lg backdrop-blur-sm"
            style={{
              minHeight: 180,
              transition: glitching
                ? "none"
                : "filter 0.25s ease, transform 0.25s ease",
              filter: glitching
                ? "blur(6px) brightness(1.3) saturate(0.3)"
                : "blur(0) brightness(1) saturate(1)",
              transform: glitching
                ? `translate(${Math.random() * 4 - 2}px, ${Math.random() * 4 - 2}px) scale(0.98)`
                : "translate(0,0) scale(1)",
            }}
          >
            <pre className="m-0 whitespace-pre-wrap break-all text-left">
              {encoding.code}
            </pre>

            {/* Scanline overlay during glitch */}
            {glitching && (
              <div
                className="pointer-events-none absolute inset-0"
                style={{
                  background:
                    "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,255,128,0.04) 2px, rgba(0,255,128,0.04) 4px)",
                }}
              />
            )}
          </div>

          {/* Question mark / undecided indicator */}
          <div
            className="mt-3 text-[35px] text-center font-mono text-xs tracking-wide text-gray-500
              transition-opacity duration-300"
            style={{ opacity: glitching ? 0 : 0.7 }}
          >
            ?
          </div>
        </div>
      </div>
    </CheeseSlideContainer>
  );
};
