import React from "react";

import { defineVideoVisual } from "@guiferviz/cheese-bytes-video/actions";
import { useVideoVisual } from "@guiferviz/cheese-bytes-video/react";

import RubikCube from "./RubikCube";
import { CheeseSlideContainer } from "../shared";

const ENCODINGS = [
  { label: "string", code: 'state = "BBBBRRRRYYYYOOOOWWWWGGGG"' },
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
  { label: "int", code: "state = 42_391_158" },
] as const;

type EncodingVideoState = { progress: number };

export const encodingShowcaseVideoDefinition =
  defineVideoVisual<EncodingVideoState>()({
    type: "rubik-encoding-showcase",
    actions: {
      cycle: {
        timing: "animated",
        label: "Cycle encodings",
        apply: (state, _params, { progress }) => ({ ...state, progress }),
      },
    },
  });

export function EncodingShowcaseVideo({
  width = 1080,
  height = 600,
}: {
  width?: number;
  height?: number;
}) {
  const { ref, state } = useVideoVisual(encodingShowcaseVideoDefinition, {
    progress: 0,
  });

  const scaled = Math.min(ENCODINGS.length - 0.0001, state.progress * ENCODINGS.length);
  const index = Math.floor(scaled);
  const within = scaled - index;
  const glitch = Math.max(0, 1 - Math.abs(within - 0.5) * 8);
  const encoding = ENCODINGS[index] ?? ENCODINGS[0];
  const wobble = Math.sin(state.progress * Math.PI * 10) * 2;

  return (
    <div ref={ref} className="h-full w-full">
      <CheeseSlideContainer>
        <div className="flex h-full w-full items-center justify-center gap-6 px-4">
          <div
            className="shrink-0 overflow-hidden rounded-xl"
            style={{ transform: `rotate(${wobble}deg)` }}
          >
            <RubikCube
              width={Math.round(width * 0.42)}
              height={height}
              size={2}
              initialShowHelp={false}
            />
          </div>

          <div className="flex select-none flex-col items-center gap-1 text-gray-400">
            <svg width="64" height="64" viewBox="0 0 64 64" fill="none" className="opacity-60">
              <path d="M8 32 H48 M40 22 L52 32 L40 42" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span className="font-mono text-[11px] uppercase tracking-widest opacity-50">encode</span>
          </div>

          <div className="relative min-w-[340px] max-w-[480px] flex-1">
            <div className="mb-2 flex items-center gap-2">
              <span
                className="inline-block rounded-full bg-gray-700/60 px-3 py-0.5 font-mono text-[11px] uppercase tracking-widest text-gray-300"
                style={{ opacity: 1 - glitch }}
              >
                {encoding.label}
              </span>
            </div>
            <div
              className="relative overflow-hidden rounded-lg border border-gray-700/50 bg-gray-900/80 px-5 py-4 font-mono text-[15px] leading-relaxed text-emerald-300 shadow-lg backdrop-blur-sm"
              style={{
                minHeight: 180,
                filter: `blur(${glitch * 6}px) brightness(${1 + glitch * 0.3}) saturate(${1 - glitch * 0.7})`,
                transform: `translate(${glitch * 2}px, ${-glitch * 2}px) scale(${1 - glitch * 0.02})`,
              }}
            >
              <pre className="m-0 whitespace-pre-wrap break-all text-left">{encoding.code}</pre>
            </div>
            <div className="mt-3 text-center font-mono text-[35px] text-gray-500" style={{ opacity: 0.7 * (1 - glitch) }}>?</div>
          </div>
        </div>
      </CheeseSlideContainer>
    </div>
  );
}
