/**
 * Scene6_BFSLocal.tsx
 *
 * BFS in the zoomed-in crossroads region.
 * Shows the wave / ripple expanding layer by layer.
 */

import React, { useCallback } from "react";
import { DungeonRenderer } from "./DungeonRenderer";
import { CROSSROADS_VIEWPORT, START, EXIT, DUNGEON_COLORS } from "./types";
import { bfs } from "./algorithms";
import { useSlideActive } from "./useSlideActive";
import { useSearchAnimation } from "./useSearchAnimation";
import { CheeseSlideContainer } from "../shared";

export const BFSLocal: React.FC<{
  speed?: number;
  delay?: number;
}> = ({ speed = 200, delay = 500 }) => {
  const { state, play, reset } = useSearchAnimation(speed);

  const start = useCallback(() => {
    reset();
    const gen = bfs(START, EXIT, 0);
    play(gen, delay);
  }, [play, reset, delay]);

  const containerRef = useSlideActive(start);

  return (
    <CheeseSlideContainer>
      <div ref={containerRef} style={{ width: "100%" }}>
        <DungeonRenderer
          width={1080}
          height={720}
          viewport={CROSSROADS_VIEWPORT}
          explored={state.explored}
          frontier={state.frontier}
          currentPath={state.currentPath}
          exploredColor={DUNGEON_COLORS.explored}
          frontierColor={DUNGEON_COLORS.frontier}
          showStart={true}
          showExit={false}
        />
      </div>
    </CheeseSlideContainer>
  );
};
