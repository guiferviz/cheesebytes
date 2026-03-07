/**
 * CornerInvariant.tsx
 *
 * Interactive visualisation of the corner-orientation invariant of the 2×2×2
 * Rubik's Cube.  Shows a 3D cube (reusing the existing RubikCube component)
 * alongside a panel of the 8 corners (drawn as SVG isometric cubes), their
 * orientations, and the proof that the sum mod 3 is always preserved under
 * legal moves.
 *
 * State is kept in sync with the 3D cube via `onStateChange`, so both button
 * clicks and keyboard-driven moves update the orientation display.
 */
import React, { useRef, useState, useCallback, useEffect } from "react";
import RubikCube, { type RubikCubeHandle } from "./RubikCube";
import {
  CORNER_NAMES,
  CORNER_FACETS,
  FACE_SOLVED_COLOR,
  indexToStickerString,
  stickerStringToOrientations,
} from "./cubeModel";
import { CheeseSlideContainer } from "../shared";
import { CheeseTickIcon, CheeseCrossIcon } from "../../icons/CheeseIcons";

// ── Types ─────────────────────────────────────────────────────────────────────

interface CornerInvariantProps {
  width?: number;
  height?: number;
}

// ── Quarter-turn face moves available via buttons ─────────────────────────────

const FACE_MOVES: { label: string; face: string; cw: boolean }[] = [
  { label: "R", face: "R", cw: true },
  { label: "R'", face: "R", cw: false },
  { label: "U", face: "U", cw: true },
  { label: "U'", face: "U", cw: false },
  { label: "F", face: "F", cw: true },
  { label: "F'", face: "F", cw: false },
];

// ── SVG isometric corner cube with animated rotation ─────────────────────────
//
// 3 rhombus faces arranged in a regular hexagon (isometric projection).
// The orientation twist is expressed as a CSS `rotate()` of the whole <g>
// around the center vertex (where all 3 faces meet), animated via transition.
// 120° per twist step → faces cycle Top→Right→Left→Top.

function isUDColor(c: string): boolean {
  return c === FACE_SOLVED_COLOR.U || c === FACE_SOLVED_COLOR.D;
}

const HEX_R = 20;
const HEX_HW = (HEX_R * Math.sqrt(3)) / 2; // ≈17.32
const HEX_V: [number, number][] = [
  [0, -HEX_R], // v0 top
  [HEX_HW, -HEX_R / 2], // v1 top-right
  [HEX_HW, HEX_R / 2], // v2 bottom-right
  [0, HEX_R], // v3 bottom
  [-HEX_HW, HEX_R / 2], // v4 bottom-left
  [-HEX_HW, -HEX_R / 2], // v5 top-left
];

const polyPts = (vs: [number, number][]) =>
  vs.map((p) => p.join(",")).join(" ");

const FACE_TOP_PTS = polyPts([[0, 0], HEX_V[5], HEX_V[0], HEX_V[1]]);
const FACE_RIGHT_PTS = polyPts([[0, 0], HEX_V[1], HEX_V[2], HEX_V[3]]);
const FACE_LEFT_PTS = polyPts([[0, 0], HEX_V[3], HEX_V[4], HEX_V[5]]);
const HEX_OUTLINE_PTS = polyPts(HEX_V);

const PAD = 2;
const VB_W = 2 * HEX_HW + 2 * PAD;
const VB_H = 2 * HEX_R + 2 * PAD;

const IsoCorner: React.FC<{
  baseColors: [string, string, string]; // [UD, CW, CCW] at twist=0
  rotAngle: number; // cumulative rotation (degrees)
  size?: number;
}> = ({ baseColors, rotAngle, size = 40 }) => {
  const [udColor, cwColor, ccwColor] = baseColors;

  return (
    <svg
      width={size}
      height={(size * VB_H) / VB_W}
      viewBox={`${-HEX_HW - PAD} ${-HEX_R - PAD} ${VB_W} ${VB_H}`}
      style={{ display: "block", overflow: "visible" }}
    >
      <g
        style={{
          transform: `rotate(${rotAngle}deg)`,
          transformOrigin: "0px 0px",
          transition: "transform 0.4s ease-in-out",
        }}
      >
        {/* Face fills */}
        <polygon
          points={FACE_TOP_PTS}
          fill={udColor}
          opacity={isUDColor(udColor) ? 1 : 0.35}
        />
        <polygon
          points={FACE_RIGHT_PTS}
          fill={cwColor}
          opacity={isUDColor(cwColor) ? 1 : 0.35}
        />
        <polygon
          points={FACE_LEFT_PTS}
          fill={ccwColor}
          opacity={isUDColor(ccwColor) ? 1 : 0.35}
        />

        {/* Hex outline */}
        <polygon
          points={HEX_OUTLINE_PTS}
          fill="none"
          stroke="rgba(128,128,128,0.3)"
          strokeWidth="0.8"
          strokeLinejoin="round"
        />

        {/* Internal ridges from center to shared vertices */}
        {[HEX_V[1], HEX_V[3], HEX_V[5]].map(([x, y], i) => (
          <line
            key={i}
            x1={0}
            y1={0}
            x2={x}
            y2={y}
            stroke="rgba(128,128,128,0.22)"
            strokeWidth="0.6"
          />
        ))}
      </g>
    </svg>
  );
};

// ── Component ─────────────────────────────────────────────────────────────────

export const CornerInvariant: React.FC<CornerInvariantProps> = ({
  width = 420,
  height = 340,
}) => {
  const cubeRef = useRef<RubikCubeHandle>(null);

  // Orientations for all 8 corners (read directly from sticker string)
  const [ori8, setOri8] = useState<number[]>([0, 0, 0, 0, 0, 0, 0, 0]);
  const [moveCount, setMoveCount] = useState(0);

  // Base (untwisted) colours – always the *home* piece for each slot.
  // We never permute the cubes; only the orientation (rotation) changes.
  const baseCornerColors: [string, string, string][] = [];
  for (let slot = 0; slot < 8; slot++) {
    baseCornerColors.push(
      CORNER_FACETS[slot].map(([f]) => FACE_SOLVED_COLOR[f]) as [
        string,
        string,
        string,
      ],
    );
  }

  const sum = ori8.reduce((a, b) => a + b, 0);
  const mod3 = sum % 3;

  // ── Cumulative rotation angles (shortest-path 120° steps) ─────────────────

  const prevOriRef = useRef<number[]>([0, 0, 0, 0, 0, 0, 0, 0]);
  const rotAnglesRef = useRef<number[]>(new Array(8).fill(0));
  const [rotAngles, setRotAngles] = useState<number[]>(new Array(8).fill(0));

  useEffect(() => {
    const curr = ori8;
    const prev = prevOriRef.current;
    let changed = false;
    const newAngles = [...rotAnglesRef.current];
    for (let i = 0; i < 8; i++) {
      if (curr[i] !== prev[i]) {
        // delta ∈ {0,1,2}; treat 2 as −1 for shortest path
        let delta = (curr[i] - prev[i] + 3) % 3;
        if (delta === 2) delta = -1;
        newAngles[i] += delta * 120; // +120° per CW twist step
        changed = true;
      }
    }
    prevOriRef.current = curr;
    if (changed) {
      rotAnglesRef.current = newAngles;
      setRotAngles(newAngles);
    }
  }, [ori8]);

  // ── Handlers ────────────────────────────────────────────────────────────────

  /** Trigger a face move on the 3D cube; state updates via onStateChange. */
  const handleMove = useCallback((face: string, cw: boolean) => {
    cubeRef.current?.applyMove(face, cw);
  }, []);

  /** Sync orientations when the 3D cube changes (buttons OR keyboard). */
  const handleStateChange = useCallback((stateString: string) => {
    const newOri = stickerStringToOrientations(stateString);
    setOri8((prev) => {
      const changed = prev.some((v, i) => v !== newOri[i]);
      if (changed) setMoveCount((c) => c + 1);
      return changed ? newOri : prev;
    });
  }, []);

  const handleReset = useCallback(() => {
    setOri8([0, 0, 0, 0, 0, 0, 0, 0]);
    setMoveCount(0);
    cubeRef.current?.applyState(indexToStickerString(0));
  }, []);

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <CheeseSlideContainer>
      <div className="relative flex h-full w-full max-w-5xl flex-col items-center justify-center gap-3 px-2 py-1">
        {/* ── TOP: Cube + move buttons side by side ── */}
        <div className="flex items-center justify-center gap-4 shrink-0">
          {/* 3D Cube */}
          <div className="shrink-0 rounded-xl overflow-hidden">
            <RubikCube
              ref={cubeRef}
              width={width}
              height={height}
              size={2}
              initialShowHelp={false}
              onStateChange={handleStateChange}
            />
          </div>

          {/* Move buttons */}
          <div className="flex flex-col items-center gap-2">
            <span className="font-mono text-[10px] text-gray-400 dark:text-gray-500 uppercase tracking-widest">
              Moves
            </span>
            <div className="grid grid-cols-2 gap-1.5">
              {FACE_MOVES.map((m) => (
                <button
                  key={m.label}
                  onClick={() => handleMove(m.face, m.cw)}
                  className="w-11 h-9 rounded-md font-mono text-sm font-bold
                    border border-gray-300 bg-gray-100 text-gray-700
                    hover:border-orange-400 hover:text-orange-600
                    dark:border-gray-600 dark:bg-gray-800/50 dark:text-gray-300
                    dark:hover:border-orange-500 dark:hover:text-orange-400
                    transition-all active:scale-95"
                >
                  {m.label}
                </button>
              ))}
            </div>
            <button
              onClick={handleReset}
              className="mt-1 px-3 h-7 rounded-md font-mono text-[11px]
                border border-gray-300 bg-gray-100 text-gray-500
                hover:border-orange-400 hover:text-orange-600
                dark:border-gray-600 dark:bg-gray-800/50 dark:text-gray-500
                dark:hover:border-orange-500 dark:hover:text-orange-400
                transition-all active:scale-95"
            >
              Reset
            </button>
            {moveCount > 0 && (
              <span className="font-mono text-[10px] text-gray-400 dark:text-gray-600">
                {moveCount} move{moveCount !== 1 ? "s" : ""}
              </span>
            )}
          </div>
        </div>

        {/* ── MIDDLE: 8 corner pieces as isometric cubes ── */}
        <div className="flex flex-col items-center gap-1 shrink-0 w-full">
          <span className="font-mono text-[10px] text-gray-400 dark:text-gray-500 uppercase tracking-widest">
            Corner orientations
          </span>
          <div className="flex items-end justify-center gap-5 flex-wrap">
            {ori8.map((twist, slot) => (
              <div key={slot} className="flex flex-col items-center gap-2">
                {/* SVG isometric corner — rotates on orientation change */}
                <IsoCorner
                  baseColors={baseCornerColors[slot]}
                  rotAngle={rotAngles[slot]}
                  size={42}
                />

                {/* Orientation value */}
                <span
                  className="font-mono text-sm font-bold rounded-md px-1.5 py-0 transition-all
                    text-gray-500 dark:text-gray-400
                    bg-gray-400/[0.07] dark:bg-gray-400/[0.06]"
                >
                  {twist}
                </span>

                {/* Corner label */}
                <span className="font-mono text-[8px] text-gray-400 dark:text-gray-600">
                  {CORNER_NAMES[slot]}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* ── BOTTOM: Single-line invariant ── */}
        <div
          className="flex items-center gap-1.5 font-mono text-sm shrink-0
            rounded-xl px-4 py-1.5 transition-all"
          style={{
            background:
              mod3 === 0 ? "rgba(0,200,80,0.08)" : "rgba(200,60,60,0.08)",
            border:
              mod3 === 0
                ? "1.5px solid rgba(0,200,80,0.3)"
                : "1.5px solid rgba(200,60,60,0.3)",
          }}
        >
          {ori8.map((v, i) => (
            <React.Fragment key={i}>
              {i > 0 && (
                <span className="text-gray-400 dark:text-gray-600 text-xs">
                  +
                </span>
              )}
              <span className="font-bold transition-all text-gray-500 dark:text-gray-400">
                {v}
              </span>
            </React.Fragment>
          ))}
          <span className="text-gray-400 dark:text-gray-600 text-xs mx-0.5">
            =
          </span>
          <span className="font-bold text-gray-700 dark:text-gray-200">
            {sum}
          </span>
          <span className="text-gray-400 dark:text-gray-500 text-xs ml-3 mr-1">
            mod 3 ={" "}
            <span
              className="font-bold text-sm"
              style={{
                color:
                  mod3 === 0 ? "rgba(0,200,80,0.9)" : "rgba(200,60,60,0.9)",
              }}
            >
              {mod3}
            </span>
          </span>
          {mod3 === 0 ? (
            <CheeseTickIcon className="w-6 h-6" />
          ) : (
            <CheeseCrossIcon className="w-6 h-6" />
          )}
        </div>
      </div>
    </CheeseSlideContainer>
  );
};
