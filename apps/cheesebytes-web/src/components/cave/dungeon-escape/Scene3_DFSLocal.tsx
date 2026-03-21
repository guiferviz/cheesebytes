/**
 * Scene3_DFSLocal.tsx
 *
 * Depth-first search in the zoomed-in crossroads region.
 * Shows one path pushing forward, ignoring branches.
 */

import React, { useCallback, useState, useRef } from "react";
import { DungeonRenderer } from "./DungeonRenderer";
import { START, EXIT, DUNGEON_COLORS, CROSSROADS_VIEWPORT } from "./types";
import { dfs } from "./algorithms";
import type { DirName } from "./algorithms";
import { PriorityLegend } from "./PriorityLegend";
import { useSlideActive } from "./useSlideActive";
import { useSearchAnimation } from "./useSearchAnimation";
import { CheeseSlideContainer } from "../shared";

const DEFAULT_DIRS: DirName[] = ["up", "right", "down", "left"];

export const DFSLocal: React.FC<{
  speed?: number;
  delay?: number;
  dirs?: DirName[];
}> = ({ speed = 200, delay = 500, dirs: initialDirs = DEFAULT_DIRS }) => {
  const [dirs, setDirs] = useState<DirName[]>(initialDirs);
  const { state, play, reset } = useSearchAnimation(speed);
  const dirsRef = useRef(dirs);
  dirsRef.current = dirs;

  const runAnimation = useCallback(() => {
    reset();
    const gen = dfs(START, EXIT, 25, dirsRef.current);
    play(gen, delay);
  }, [play, reset, delay]);

  const containerRef = useSlideActive(runAnimation);

  const handleReorder = useCallback(
    (newDirs: DirName[]) => {
      setDirs(newDirs);
      dirsRef.current = newDirs;
      reset();
      const gen = dfs(START, EXIT, 25, newDirs);
      play(gen, delay);
    },
    [play, reset, delay],
  );

  return (
    <CheeseSlideContainer>
      <div
        ref={containerRef}
        style={{ position: "relative", width: "100%", height: 720 }}
      >
        <DungeonRenderer
          width={1080}
          height={720}
          viewport={CROSSROADS_VIEWPORT}
          explored={state.explored}
          currentPath={state.currentPath}
          exploredColor={DUNGEON_COLORS.explored}
          showStart={true}
          showExit={false}
        />
        <div
          style={{
            position: "absolute",
            right: 12,
            top: "50%",
            transform: "translateY(-50%)",
          }}
        >
          <PriorityLegend dirs={dirs} onChange={handleReorder} />
        </div>
      </div>
    </CheeseSlideContainer>
  );
};
