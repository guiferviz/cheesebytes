/**
 * Scene5_DFSGlobal.tsx
 *
 * Full dungeon DFS. Zooms out to show DFS committing deep,
 * eventually finding the exit via a long path.
 */

import React, { useCallback, useState, useRef } from "react";
import { DungeonRenderer } from "./DungeonRenderer";
import type { PathOverlay } from "./DungeonRenderer";
import { FULL_VIEWPORT, START, EXIT, DUNGEON_COLORS } from "./types";
import { dfs } from "./algorithms";
import type { DirName } from "./algorithms";
import { PriorityLegend } from "./PriorityLegend";
import { useSlideActive } from "./useSlideActive";
import { useSearchAnimation } from "./useSearchAnimation";
import { CheeseSlideContainer } from "../shared";

const DEFAULT_DIRS: DirName[] = ["up", "right", "down", "left"];

export const DFSGlobal: React.FC<{
  speed?: number;
  delay?: number;
  dirs?: DirName[];
}> = ({ speed = 40, delay = 0, dirs: initialDirs = DEFAULT_DIRS }) => {
  const [dirs, setDirs] = useState<DirName[]>(initialDirs);
  const { state, play, reset } = useSearchAnimation(speed);
  const dirsRef = useRef(dirs);
  dirsRef.current = dirs;

  const runAnimation = useCallback(() => {
    reset();
    const gen = dfs(START, EXIT, 0, dirsRef.current);
    play(gen, delay);
  }, [play, reset, delay]);

  const containerRef = useSlideActive(runAnimation);

  const handleReorder = useCallback(
    (newDirs: DirName[]) => {
      setDirs(newDirs);
      dirsRef.current = newDirs;
      reset();
      const gen = dfs(START, EXIT, 0, newDirs);
      play(gen, delay);
    },
    [play, reset, delay],
  );

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
      <div
        ref={containerRef}
        style={{
          display: "flex",
          width: "100%",
          height: 720,
          alignItems: "center",
        }}
      >
        <div style={{ flex: 1, minWidth: 0 }}>
          <DungeonRenderer
            width={1080}
            height={720}
            viewport={FULL_VIEWPORT}
            explored={state.explored}
            currentPath={state.done ? [] : state.currentPath}
            paths={pathOverlays}
            exploredColor={DUNGEON_COLORS.explored}
            showStart={true}
            showExit={true}
            label="DFS — Full Dungeon"
          />
        </div>
        <div
          style={{
            width: 80,
            flexShrink: 0,
            display: "flex",
            justifyContent: "center",
          }}
        >
          <PriorityLegend dirs={dirs} onChange={handleReorder} />
        </div>
      </div>
    </CheeseSlideContainer>
  );
};
