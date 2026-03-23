/**
 * Scene4_Comparison.tsx
 *
 * Side-by-side: BFS flood fill vs DFS flood fill.
 * Both run simultaneously on the same grid.
 */

import React, { useState, useRef, useCallback, useEffect } from "react";
import { IslandRenderer } from "./IslandRenderer";
import { MAP_ROWS, MAP_COLS, LAND } from "./types";
import type { FloodStep } from "./types";
import { collectSteps } from "./algorithms";
import { floodFillBFS, floodFillDFS } from "./algorithms";
import { useSlideActive } from "./useSlideActive";
import { CheeseSlideContainer } from "../shared";

const SPEED = 35;
const DELAY = 500;

export const Comparison: React.FC = () => {
  const [stepIdx, setStepIdx] = useState(0);
  const [bfsSteps, setBfsSteps] = useState<FloodStep[]>([]);
  const [dfsSteps, setDfsSteps] = useState<FloodStep[]>([]);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cancelRef = useRef(false);

  const start = useCallback(() => {
    cancelRef.current = true;
    if (timerRef.current) clearTimeout(timerRef.current);

    const bs = collectSteps(floodFillBFS(LAND, MAP_ROWS, MAP_COLS));
    const ds = collectSteps(floodFillDFS(LAND, MAP_ROWS, MAP_COLS));
    setBfsSteps(bs);
    setDfsSteps(ds);
    setStepIdx(0);
    cancelRef.current = false;

    const maxLen = Math.max(bs.length, ds.length);
    let idx = 0;

    const tick = () => {
      if (cancelRef.current) return;
      idx++;
      setStepIdx(idx);
      if (idx < maxLen) {
        timerRef.current = setTimeout(tick, SPEED);
      }
    };

    timerRef.current = setTimeout(tick, DELAY);
  }, []);

  const containerRef = useSlideActive(start);

  useEffect(() => {
    return () => {
      cancelRef.current = true;
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const bStep = bfsSteps[Math.min(stepIdx, bfsSteps.length - 1)];
  const dStep = dfsSteps[Math.min(stepIdx, dfsSteps.length - 1)];

  return (
    <CheeseSlideContainer>
      <div ref={containerRef} style={{ width: "100%" }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 16,
            zoom: 1.3,
          }}
        >
          {/* BFS side */}
          <div>
            <div
              style={{
                textAlign: "center",
                fontSize: 18,
                fontWeight: 900,
                color: "#3b82f6",
                marginBottom: 6,
              }}
            >
              BFS flood fill
            </div>
            {bStep && (
              <IslandRenderer
                width={500}
                height={356}
                rows={MAP_ROWS}
                cols={MAP_COLS}
                land={LAND}
                islandMap={bStep.islandMap}
                frontier={bStep.frontier}
                cursor={bStep.cursor}
                scanned={bStep.scanned}
                activeIslandIndex={bStep.islandIndex}
                islandCount={bStep.islandIndex}
              />
            )}
          </div>

          {/* DFS side */}
          <div>
            <div
              style={{
                textAlign: "center",
                fontSize: 18,
                fontWeight: 900,
                color: "#f59e0b",
                marginBottom: 6,
              }}
            >
              DFS flood fill
            </div>
            {dStep && (
              <IslandRenderer
                width={500}
                height={356}
                rows={MAP_ROWS}
                cols={MAP_COLS}
                land={LAND}
                islandMap={dStep.islandMap}
                frontier={dStep.frontier}
                cursor={dStep.cursor}
                scanned={dStep.scanned}
                activeIslandIndex={dStep.islandIndex}
                islandCount={dStep.islandIndex}
              />
            )}
          </div>
        </div>
      </div>
    </CheeseSlideContainer>
  );
};
