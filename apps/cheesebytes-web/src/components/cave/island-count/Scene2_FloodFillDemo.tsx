/**
 * Scene2_FloodFillDemo.tsx
 *
 * Demonstrates flood fill on a single island.
 * When the slide activates, BFS flood fill animates from the first land cell
 * of island #0, coloring it step by step.
 */

import React, { useState, useRef, useCallback, useEffect } from "react";
import { IslandRenderer } from "./IslandRenderer";
import { MAP_ROWS, MAP_COLS, LAND } from "./types";
import type { FloodStep } from "./types";
import { floodFillBFS } from "./algorithms";
import { useSlideActive } from "./useSlideActive";
import { CheeseSlideContainer } from "../shared";

const SPEED = 80; // ms per step
const DELAY = 600; // ms before starting

export const FloodFillDemo: React.FC = () => {
  const [step, setStep] = useState<FloodStep | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cancelRef = useRef(false);

  const clearAnim = useCallback(() => {
    cancelRef.current = true;
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = null;
  }, []);

  const start = useCallback(() => {
    clearAnim();
    setStep(null);
    cancelRef.current = false;

    const gen = floodFillBFS(LAND, MAP_ROWS, MAP_COLS);

    // We'll only animate until the first island is fully flooded
    const tick = () => {
      if (cancelRef.current) return;
      const result = gen.next();
      if (result.done) return;
      const s = result.value;
      setStep(s);

      // Stop after first island is complete (islandIndex increments to 1)
      if (s.islandIndex >= 1 && s.frontier.size === 0) return;

      timerRef.current = setTimeout(tick, SPEED);
    };

    timerRef.current = setTimeout(tick, DELAY);
  }, [clearAnim]);

  const containerRef = useSlideActive(start);

  useEffect(() => {
    return () => clearAnim();
  }, [clearAnim]);

  return (
    <CheeseSlideContainer>
      <div ref={containerRef} style={{ position: "relative" }}>
        <IslandRenderer
          width={840}
          height={600}
          rows={MAP_ROWS}
          cols={MAP_COLS}
          land={LAND}
          islandMap={step?.islandMap}
          frontier={step?.frontier}
          cursor={step?.cursor}
          scanned={step?.scanned}
          activeIslandIndex={step?.islandIndex}
        />
        <div
          style={{
            position: "absolute",
            top: 16,
            left: 16,
            background: "rgba(0,0,0,0.6)",
            color: "#fff",
            padding: "6px 14px",
            borderRadius: 8,
            fontSize: 18,
            fontWeight: 700,
          }}
        >
          Flood fill (BFS)
        </div>
      </div>
    </CheeseSlideContainer>
  );
};
