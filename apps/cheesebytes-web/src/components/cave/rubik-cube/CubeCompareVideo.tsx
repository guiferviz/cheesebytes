import React from "react";

import { defineVideoVisual } from "@guiferviz/cheese-bytes-video/actions";
import { useVideoVisual } from "@guiferviz/cheese-bytes-video/react";

import RubikCube from "./RubikCube";
import { CheeseSlideContainer } from "../shared";

const THREE_BY_THREE_STATES = 43_252_003_274_489_856_000n;
const TWO_BY_TWO_STATES = 3_674_160n;

type CubeCompareVideoState = {
  motion: number;
  reveal: number;
};

export const cubeCompareVideoDefinition =
  defineVideoVisual<CubeCompareVideoState>()({
    type: "rubik-cube-compare",
    actions: {
      move: {
        timing: "animated",
        label: "Move cubes",
        apply: (state, _params, { progress }) => ({
          ...state,
          motion: progress,
        }),
      },
      reveal2x2: {
        timing: "animated",
        label: "Reveal 2x2",
        apply: (state, _params, { progress }) => ({
          ...state,
          reveal: progress,
        }),
      },
    },
  });

const initialState: CubeCompareVideoState = {
  motion: 0,
  reveal: 0,
};

function formatNumber(n: bigint): string {
  return n.toLocaleString("en-US");
}

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

function interpolatedStateCount(progress: number) {
  const from = Number(THREE_BY_THREE_STATES);
  const to = Number(TWO_BY_TWO_STATES);
  const eased = easeOutCubic(progress);
  const logCurrent =
    Math.log10(from) + (Math.log10(to) - Math.log10(from)) * eased;
  return BigInt(Math.max(1, Math.round(Math.pow(10, logCurrent))));
}

export function CubeCompareVideo() {
  const { ref, state } = useVideoVisual(
    cubeCompareVideoDefinition,
    initialState,
  );

  const wobble = Math.sin(state.motion * Math.PI * 8) * 2.5;
  const revealOpacity = Math.min(1, state.reveal * 3);
  const blurProgress = Math.max(0, (state.reveal - 0.6) / 0.4);
  const displayNumber =
    state.reveal >= 1
      ? TWO_BY_TWO_STATES
      : interpolatedStateCount(state.reveal);

  return (
    <div ref={ref} className="h-full w-full">
      <CheeseSlideContainer>
        <div
          className="flex h-full w-full items-center justify-center"
          style={{ zoom: 1.4 }}
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "240px 1fr",
              gridTemplateRows: "auto auto",
              gap: "16px 32px",
              alignItems: "center",
            }}
          >
            <div
              className="flex items-center justify-center overflow-hidden rounded-xl"
              style={{ transform: `rotate(${wobble}deg)` }}
            >
              <RubikCube
                width={240}
                height={220}
                size={3}
                initialShowHelp={false}
              />
            </div>

            <div className="flex flex-col items-start gap-1">
              <span className="font-mono text-xs uppercase tracking-widest text-gray-400 opacity-70">
                3×3×3 configurations
              </span>
              <span className="font-mono text-3xl font-bold text-amber-200/90 tabular-nums">
                {formatNumber(THREE_BY_THREE_STATES)}
              </span>
            </div>

            <div
              className="flex items-center justify-center overflow-hidden rounded-xl"
              style={{
                opacity: revealOpacity,
                transform: `rotate(${-wobble}deg) scale(${0.94 + 0.06 * revealOpacity})`,
              }}
            >
              <RubikCube
                width={240}
                height={220}
                size={2}
                initialShowHelp={false}
              />
            </div>

            <div
              className="flex flex-col items-start gap-1"
              style={{ opacity: revealOpacity }}
            >
              <span className="font-mono text-xs uppercase tracking-widest text-gray-400 opacity-70">
                2×2×2 configurations
              </span>
              <span
                className="font-mono text-3xl font-bold text-cyan-200/90 tabular-nums"
                style={{ filter: `blur(${blurProgress * 12}px)` }}
              >
                {formatNumber(displayNumber)}
              </span>
            </div>
          </div>
        </div>
      </CheeseSlideContainer>
    </div>
  );
}
