/**
 * Scene2_Crossroads.tsx
 *
 * Zooms into the crossroads near the start. Shows the branching choices.
 * Optionally shows direction-priority labels (Up → Right → Down → Left).
 */

import React, { useState } from "react";
import { DungeonRenderer } from "./DungeonRenderer";
import { CROSSROADS_VIEWPORT } from "./types";
import { useSlideActive } from "./useSlideActive";
import { CheeseSlideContainer } from "../shared";

export const Crossroads: React.FC = () => {
  const [visible, setVisible] = useState(false);

  const containerRef = useSlideActive(() => {
    setVisible(false);
    requestAnimationFrame(() => {
      requestAnimationFrame(() => setVisible(true));
    });
  });

  return (
    <CheeseSlideContainer>
      <div
        ref={containerRef}
        style={{
          opacity: visible ? 1 : 0,
          transition: "opacity 0.8s ease-in",
          width: "100%",
        }}
      >
        <DungeonRenderer
          width={1080}
          height={720}
          viewport={CROSSROADS_VIEWPORT}
          showStart={true}
          showExit={false}
        />
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            gap: 24,
            marginTop: 12,
            fontFamily: "monospace",
            fontSize: 16,
            color: "#999",
          }}
        >
          <span>
            Priority: <strong style={{ color: "#333" }}>↑ Up</strong>
          </span>
          <span>→ Right</span>
          <span>↓ Down</span>
          <span>← Left</span>
        </div>
      </div>
    </CheeseSlideContainer>
  );
};
