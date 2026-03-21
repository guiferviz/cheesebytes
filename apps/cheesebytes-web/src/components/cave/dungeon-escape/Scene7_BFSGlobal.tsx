/**
 * Scene7_BFSGlobal.tsx
 *
 * Full dungeon BFS. Wave expands through the whole dungeon,
 * then highlights the shortest path.
 */

import React, { useCallback } from "react";
import { DungeonRenderer } from "./DungeonRenderer";
import type { PathOverlay } from "./DungeonRenderer";
import { FULL_VIEWPORT, START, EXIT, DUNGEON_COLORS } from "./types";
import { bfs } from "./algorithms";
import { useSlideActive } from "./useSlideActive";
import { useSearchAnimation } from "./useSearchAnimation";
import { CheeseSlideContainer } from "../shared";

export const BFSGlobal: React.FC = () => {
  const { state, play, reset } = useSearchAnimation(40);

  const start = useCallback(() => {
    reset();
    const gen = bfs(START, EXIT);
    play(gen);
  }, [play, reset]);

  const containerRef = useSlideActive(start);

  const pathOverlays: PathOverlay[] = [];
  if (state.path) {
    pathOverlays.push({
      cells: state.path,
      color: DUNGEON_COLORS.path,
      line: true,
      lineWidth: 4,
    });
  }

  return (
    <CheeseSlideContainer>
      <div ref={containerRef} style={{ width: "100%" }}>
        <DungeonRenderer
          width={1080}
          height={720}
          viewport={FULL_VIEWPORT}
          explored={state.explored}
          frontier={state.frontier}
          currentPath={state.done ? [] : state.currentPath}
          exploredColor={DUNGEON_COLORS.explored}
          frontierColor={DUNGEON_COLORS.frontier}
          showStart={true}
          showExit={true}
        />
      </div>
    </CheeseSlideContainer>
  );
};
