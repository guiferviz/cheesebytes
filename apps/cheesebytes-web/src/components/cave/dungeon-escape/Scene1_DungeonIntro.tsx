/**
 * Scene1_DungeonIntro.tsx
 *
 * Introduces the dungeon — full map fades in with start and exit markers.
 * Minimal animation: just reveals the setting.
 */

import React, { useState } from "react";
import { DungeonRenderer } from "./DungeonRenderer";
import { FULL_VIEWPORT } from "./types";
import { useSlideActive } from "./useSlideActive";
import { CheeseSlideContainer } from "../shared";

export const DungeonIntro: React.FC = () => {
  const [opacity, setOpacity] = useState(0);

  const containerRef = useSlideActive(() => {
    setOpacity(0);
    requestAnimationFrame(() => {
      requestAnimationFrame(() => setOpacity(1));
    });
  });

  return (
    <CheeseSlideContainer>
      <div
        ref={containerRef}
        style={{
          opacity,
          transition: "opacity 1.2s ease-in",
        }}
      >
        <DungeonRenderer
          width={1080}
          height={720}
          viewport={FULL_VIEWPORT}
          showStart={true}
          showExit={true}
        />
      </div>
    </CheeseSlideContainer>
  );
};
