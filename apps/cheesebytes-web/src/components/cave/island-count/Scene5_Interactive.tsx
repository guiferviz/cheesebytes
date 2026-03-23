/**
 * Scene5_Interactive.tsx
 *
 * Interactive: user can click land cells to toggle them,
 * then press a "Count" button to run the flood-fill scan.
 */

import React, { useState, useRef, useCallback, useEffect } from "react";
import { IslandRenderer } from "./IslandRenderer";
import { MAP_ROWS, MAP_COLS, LAND, posKey } from "./types";
import type { FloodStep } from "./types";
import { floodFillBFS } from "./algorithms";
import { useSlideActive } from "./useSlideActive";
import { CheeseSlideContainer } from "../shared";

const SPEED = 30;

export const Interactive: React.FC = () => {
  const [land, setLand] = useState(() => new Set(LAND));
  const [step, setStep] = useState<FloodStep | null>(null);
  const [running, setRunning] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cancelRef = useRef(false);

  const canvasWidth = 840;
  const canvasHeight = 600;
  const cellW = canvasWidth / MAP_COLS;
  const cellH = canvasHeight / MAP_ROWS;

  const clearAnim = useCallback(() => {
    cancelRef.current = true;
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = null;
    setRunning(false);
  }, []);

  const containerRef = useSlideActive(() => {
    clearAnim();
    setStep(null);
    setLand(new Set(LAND));
  });

  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (running) return;
      const rect = e.currentTarget.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const c = Math.floor(x / cellW);
      const r = Math.floor(y / cellH);
      if (r < 0 || r >= MAP_ROWS || c < 0 || c >= MAP_COLS) return;

      const key = posKey(r, c);
      setLand((prev) => {
        const next = new Set(prev);
        if (next.has(key)) next.delete(key);
        else next.add(key);
        return next;
      });
      setStep(null);
    },
    [running, cellW, cellH],
  );

  const runScan = useCallback(() => {
    clearAnim();
    setStep(null);
    cancelRef.current = false;
    setRunning(true);

    const gen = floodFillBFS(land, MAP_ROWS, MAP_COLS);

    const tick = () => {
      if (cancelRef.current) return;
      const result = gen.next();
      if (result.done) {
        setRunning(false);
        return;
      }
      setStep(result.value);
      if (result.value.done) {
        setRunning(false);
        return;
      }
      timerRef.current = setTimeout(tick, SPEED);
    };

    tick();
  }, [land, clearAnim]);

  const reset = useCallback(() => {
    clearAnim();
    setStep(null);
    setLand(new Set(LAND));
  }, [clearAnim]);

  useEffect(() => {
    return () => clearAnim();
  }, [clearAnim]);

  const count = step?.done ? step.islandIndex : undefined;

  return (
    <CheeseSlideContainer>
      <div ref={containerRef} style={{ position: "relative" }}>
        <div onClick={(e) => e.stopPropagation()}>
          <IslandRenderer
            width={canvasWidth}
            height={canvasHeight}
            rows={MAP_ROWS}
            cols={MAP_COLS}
            land={land}
            islandMap={step?.islandMap}
            frontier={step?.frontier}
            cursor={step?.cursor}
            scanned={step?.scanned}
            activeIslandIndex={step?.islandIndex}
            islandCount={count}
            className="cursor-pointer"
          />
          {/* Invisible overlay for click handling (canvas doesn't forward well) */}
          <canvas
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: canvasWidth,
              height: canvasHeight,
              opacity: 0,
              cursor: running ? "default" : "pointer",
            }}
            width={canvasWidth}
            height={canvasHeight}
            onClick={handleClick}
          />
        </div>

        <div
          style={{
            display: "flex",
            gap: 12,
            marginTop: 12,
            justifyContent: "center",
          }}
        >
          <button
            onClick={runScan}
            disabled={running}
            style={{
              padding: "8px 24px",
              borderRadius: 8,
              background: running ? "#555" : "#3b82f6",
              color: "#fff",
              fontWeight: 700,
              fontSize: 16,
              border: "none",
              cursor: running ? "default" : "pointer",
            }}
          >
            Count Islands
          </button>
          <button
            onClick={reset}
            style={{
              padding: "8px 24px",
              borderRadius: 8,
              background: "#374151",
              color: "#fff",
              fontWeight: 700,
              fontSize: 16,
              border: "none",
              cursor: "pointer",
            }}
          >
            Reset
          </button>
        </div>
      </div>
    </CheeseSlideContainer>
  );
};
