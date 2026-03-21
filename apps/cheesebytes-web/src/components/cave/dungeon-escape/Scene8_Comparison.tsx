/**
 * Scene8_Comparison.tsx
 *
 * Side-by-side comparison: DFS vs BFS on the same dungeon.
 * Both run simultaneously; DFS path and BFS path shown together at the end.
 */

import React, { useState, useCallback, useRef, useEffect } from "react";
import { DungeonRenderer } from "./DungeonRenderer";
import type { PathOverlay } from "./DungeonRenderer";
import { FULL_VIEWPORT, START, EXIT, DUNGEON_COLORS } from "./types";
import { bfs, dfs, collectSteps } from "./algorithms";
import { useSlideActive } from "./useSlideActive";
import { CheeseSlideContainer } from "../shared";
import type { SearchStep } from "./types";

export const Comparison: React.FC = () => {
  const [stepIdx, setStepIdx] = useState(0);
  const [dfsSteps, setDfsSteps] = useState<SearchStep[]>([]);
  const [bfsSteps, setBfsSteps] = useState<SearchStep[]>([]);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cancelRef = useRef(false);

  const start = useCallback(() => {
    cancelRef.current = true;
    if (timerRef.current) clearTimeout(timerRef.current);

    const ds = collectSteps(dfs(START, EXIT));
    const bs = collectSteps(bfs(START, EXIT));
    setDfsSteps(ds);
    setBfsSteps(bs);
    setStepIdx(0);

    cancelRef.current = false;
    const maxLen = Math.max(ds.length, bs.length);

    let idx = 0;
    const tick = () => {
      if (cancelRef.current) return;
      idx++;
      setStepIdx(idx);
      if (idx < maxLen) {
        timerRef.current = setTimeout(tick, 30);
      }
    };
    timerRef.current = setTimeout(tick, 600);
  }, []);

  const containerRef = useSlideActive(start);

  useEffect(() => {
    return () => {
      cancelRef.current = true;
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const dStep = dfsSteps[Math.min(stepIdx, dfsSteps.length - 1)];
  const bStep = bfsSteps[Math.min(stepIdx, bfsSteps.length - 1)];

  const dfsPathOverlays: PathOverlay[] = [];
  const bfsPathOverlays: PathOverlay[] = [];

  if (dStep?.path) {
    dfsPathOverlays.push({
      cells: dStep.path,
      color: DUNGEON_COLORS.path,
      line: true,
      lineWidth: 4,
    });
  }
  if (bStep?.path) {
    bfsPathOverlays.push({
      cells: bStep.path,
      color: DUNGEON_COLORS.path,
      line: true,
      lineWidth: 4,
    });
  }

  return (
    <CheeseSlideContainer>
      <div ref={containerRef} style={{ width: "100%" }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 12,
            zoom: 1.4,
          }}
        >
          {/* DFS side */}
          <div>
            <div
              style={{
                textAlign: "center",
                fontSize: 20,
                fontWeight: 900,
                color: "#f59e0b",
                marginBottom: 7,
              }}
            >
              DFS
            </div>
            <DungeonRenderer
              width={520}
              height={360}
              viewport={FULL_VIEWPORT}
              explored={dStep?.explored}
              currentPath={dStep?.path ? [] : dStep?.currentPath}
              paths={dfsPathOverlays}
              exploredColor={DUNGEON_COLORS.explored}
              showStart={true}
              showExit={true}
            />
            <div
              style={{
                textAlign: "center",
                fontSize: 14,
                color: "#999",
                marginTop: 7,
              }}
            >
              Path: {dStep?.path ? dStep.path.length : "—"} &nbsp;|&nbsp;
              Explored: {dStep?.explored.size ?? 0}
            </div>
          </div>

          {/* BFS side */}
          <div>
            <div
              style={{
                textAlign: "center",
                fontSize: 20,
                fontWeight: 900,
                color: "#3b82f6",
                marginBottom: 7,
              }}
            >
              BFS
            </div>
            <DungeonRenderer
              width={520}
              height={360}
              viewport={FULL_VIEWPORT}
              explored={bStep?.explored}
              frontier={bStep?.frontier}
              currentPath={bStep?.path ? [] : bStep?.currentPath}
              paths={bfsPathOverlays}
              exploredColor={DUNGEON_COLORS.explored}
              frontierColor={DUNGEON_COLORS.frontier}
              showStart={true}
              showExit={true}
            />
            <div
              style={{
                textAlign: "center",
                fontSize: 14,
                color: "#999",
                marginTop: 7,
              }}
            >
              Path: {bStep?.path ? bStep.path.length : "—"} &nbsp;|&nbsp;
              Explored: {bStep?.explored.size ?? 0}
            </div>
          </div>
        </div>
      </div>
    </CheeseSlideContainer>
  );
};
