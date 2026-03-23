/**
 * Scene3_FullScan.tsx
 *
 * Complete row-by-row scan. Each island gets a different color from the palette.
 * A counter shows the number of discovered islands.
 */

import React, { useState, useRef, useCallback, useEffect } from "react";
import { IslandRenderer } from "./IslandRenderer";
import { MAP_ROWS, MAP_COLS, LAND } from "./types";
import type { FloodStep } from "./types";
import { floodFillBFS } from "./algorithms";
import { useSlideActive } from "./useSlideActive";
import { CheeseSlideContainer } from "../shared";

const SPEED = 40; // ms per step — faster for full scan
const DELAY = 400;

export const FullScan: React.FC = () => {
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

    const tick = () => {
      if (cancelRef.current) return;
      const result = gen.next();
      if (result.done) return;
      setStep(result.value);
      if (result.value.done) return;
      timerRef.current = setTimeout(tick, SPEED);
    };

    timerRef.current = setTimeout(tick, DELAY);
  }, [clearAnim]);

  const containerRef = useSlideActive(start);

  useEffect(() => {
    return () => clearAnim();
  }, [clearAnim]);

  const count = step ? step.islandIndex + (step.done ? 0 : 0) : 0;
  // islandIndex is 0-based and increments after each flood,
  // so the actual count = islandIndex when done, or islandIndex while scanning.

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
          islandCount={count}
        />
      </div>
    </CheeseSlideContainer>
  );
};
