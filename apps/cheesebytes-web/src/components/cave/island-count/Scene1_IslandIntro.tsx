/**
 * Scene1_IslandIntro.tsx
 *
 * Static grid fades in showing the archipelago.
 * Big "How many islands?" text overlay.
 */

import React, { useState } from "react";
import { IslandRenderer } from "./IslandRenderer";
import { MAP_ROWS, MAP_COLS, LAND } from "./types";
import { useSlideActive } from "./useSlideActive";
import { CheeseSlideContainer } from "../shared";

export const IslandIntro: React.FC = () => {
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
          position: "relative",
        }}
      >
        <IslandRenderer
          width={840}
          height={600}
          rows={MAP_ROWS}
          cols={MAP_COLS}
          land={LAND}
        />
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            pointerEvents: "none",
          }}
        >
          <span
            style={{
              fontSize: 48,
              fontWeight: 900,
              color: "#fff",
              textShadow: "0 2px 16px rgba(0,0,0,0.7)",
              letterSpacing: 2,
            }}
          >
            How many islands?
          </span>
        </div>
      </div>
    </CheeseSlideContainer>
  );
};
