/**
 * Scene6_UnionFind.tsx
 *
 * Row-by-row scan using a group counter + merges (Union-Find style).
 * No DFS/BFS — just assign groups and merge when two groups meet.
 * Only needs O(min(R,C)) memory.
 */

import React, { useState, useRef, useCallback, useEffect } from "react";
import { IslandRenderer } from "./IslandRenderer";
import { MAP_ROWS, MAP_COLS, LAND } from "./types";
import type { UnionFindStep } from "./types";
import { unionFindScan } from "./algorithms";
import { useSlideActive } from "./useSlideActive";
import { CheeseSlideContainer } from "../shared";

const SPEED = 40;
const DELAY = 400;

export const UnionFind: React.FC = () => {
  const [step, setStep] = useState<UnionFindStep | null>(null);
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

    const gen = unionFindScan(LAND, MAP_ROWS, MAP_COLS);

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

  const actionLabel = (action: UnionFindStep["action"]) => {
    switch (action) {
      case "new-group":
        return "New group";
      case "join-left":
        return "← Join left";
      case "join-top":
        return "↑ Join top";
      case "join-both":
        return "← ↑ Same group";
      case "merge":
        return "Merge!";
      default:
        return "";
    }
  };

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
          frontier={step?.highlight}
          cursor={step?.cursor}
          scanned={step?.scanned}
          islandCount={step?.islandCount ?? 0}
        />

        {/* Action badge */}
        {step && step.action !== "scan" && step.action !== "done" && (
          <div
            style={{
              position: "absolute",
              top: 12,
              left: 12,
              background:
                step.action === "merge"
                  ? "rgba(239,68,68,0.85)"
                  : step.action === "new-group"
                    ? "rgba(16,185,129,0.85)"
                    : "rgba(59,130,246,0.85)",
              color: "#fff",
              padding: "4px 12px",
              borderRadius: 6,
              fontSize: 16,
              fontWeight: 700,
              fontFamily: "system-ui, sans-serif",
              letterSpacing: "0.02em",
            }}
          >
            {actionLabel(step.action)}
          </div>
        )}

        {/* Memory badge */}
        <div
          style={{
            position: "absolute",
            bottom: 12,
            left: 12,
            background: "rgba(0,0,0,0.6)",
            color: "#94a3b8",
            padding: "4px 10px",
            borderRadius: 6,
            fontSize: 13,
            fontFamily: "monospace",
          }}
        >
          Memory: O(min(R, C)) = O({Math.min(MAP_ROWS, MAP_COLS)})
        </div>
      </div>
    </CheeseSlideContainer>
  );
};
