/**
 * Scene1_DungeonIntro.tsx
 *
 * Introduces the dungeon — full map fades in with start and exit markers.
 * Two large labels ("DFS" / "BFS") sit at the absolute edges of the viewport.
 * Hovering a label runs that algorithm live on the dungeon; leaving resets.
 */

import React, { useState, useRef, useCallback, useEffect } from "react";
import { DungeonRenderer } from "./DungeonRenderer";
import { FULL_VIEWPORT, START, EXIT } from "./types";
import type { SearchStep } from "./types";
import { bfs, dfs } from "./algorithms";
import { useSlideActive } from "./useSlideActive";
import { CheeseSlideContainer } from "../shared";

type ActiveAlgo = "dfs" | "bfs" | null;

const STEP_INTERVAL = 25; // ms between animation frames

export const DungeonIntro: React.FC = () => {
  const [opacity, setOpacity] = useState(0);
  const [active, setActive] = useState<ActiveAlgo>(null);
  const [searchState, setSearchState] = useState<SearchStep | null>(null);

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cancelledRef = useRef(false);
  const activeRef = useRef<ActiveAlgo>(null);

  const containerRef = useSlideActive(() => {
    setOpacity(0);
    clearAnimation();
    requestAnimationFrame(() => {
      requestAnimationFrame(() => setOpacity(1));
    });
  });

  const clearAnimation = useCallback(() => {
    cancelledRef.current = true;
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = null;
    setSearchState(null);
    setActive(null);
    activeRef.current = null;
  }, []);

  const startAlgo = useCallback((algo: ActiveAlgo) => {
    if (!algo) return;
    // Prevent re-entry if already running this algo
    if (activeRef.current === algo) return;

    // Clear any existing animation
    cancelledRef.current = true;
    if (timerRef.current) clearTimeout(timerRef.current);

    cancelledRef.current = false;
    setActive(algo);
    activeRef.current = algo;

    const gen = algo === "bfs" ? bfs(START, EXIT, 0) : dfs(START, EXIT, 0);

    const step = () => {
      if (cancelledRef.current) return;
      const result = gen.next();
      if (result.done) return;
      setSearchState(result.value);
      if (result.value.path) return; // found exit, stop
      timerRef.current = setTimeout(step, STEP_INTERVAL);
    };

    step();
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cancelledRef.current = true;
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  return (
    <CheeseSlideContainer>
      <div
        ref={containerRef}
        style={{
          opacity,
          transition: "opacity 1.2s ease-in",
          position: "relative",
        }}
      >
        <DungeonRenderer
          width={1080}
          height={720}
          viewport={FULL_VIEWPORT}
          showStart={true}
          showExit={true}
          explored={searchState?.explored}
          frontier={searchState?.frontier}
          currentPath={searchState?.currentPath ?? undefined}
          paths={
            searchState?.path
              ? [{ cells: searchState.path, color: "#22c55e" }]
              : undefined
          }
        />

        {/* DFS label — left edge of viewport */}
        <div
          onPointerEnter={() => startAlgo("dfs")}
          onPointerLeave={clearAnimation}
          style={{
            position: "fixed",
            left: 0,
            top: "50%",
            transform: "translateY(-50%)",
            zIndex: 50,
          }}
          className={[
            "flex items-center justify-center",
            "px-4 py-3",
            "rounded-xl",
            "text-6xl font-black tracking-widest",
            "transition-all duration-300",
            active === "dfs"
              ? "bg-amber-500 text-white shadow-lg shadow-amber-500/30 scale-105"
              : "bg-transparent text-amber-500",
          ].join(" ")}
        >
          DFS
        </div>

        {/* BFS label — right edge of viewport */}
        <div
          onPointerEnter={() => startAlgo("bfs")}
          onPointerLeave={clearAnimation}
          style={{
            position: "fixed",
            right: 0,
            top: "50%",
            transform: "translateY(-50%)",
            zIndex: 50,
          }}
          className={[
            "flex items-center justify-center",
            "px-4 py-3",
            "rounded-xl",
            "text-6xl font-black tracking-widest",
            "transition-all duration-300",
            active === "bfs"
              ? "bg-blue-500 text-white shadow-lg shadow-blue-500/30 scale-105"
              : "bg-transparent text-blue-500",
          ].join(" ")}
        >
          BFS
        </div>
      </div>
    </CheeseSlideContainer>
  );
};
