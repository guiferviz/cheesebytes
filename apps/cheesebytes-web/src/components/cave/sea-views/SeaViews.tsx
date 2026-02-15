import React, { useState, useCallback, lazy, Suspense } from "react";
import type { SeaViewsProps } from "./types";
import { DEFAULT_HEIGHTS, parseHeights } from "./types";
import { CheeseSlideContainer } from "../shared";

// Lazy-load PhaserWorld to avoid SSR issues
const PhaserWorld = lazy(() => import("./PhaserWorld"));

// ===========================================
// MAIN COMPONENT
// ===========================================

export const SeaViews: React.FC<SeaViewsProps> = ({
  heights: initialHeights = DEFAULT_HEIGHTS,
  showEditor = false,
  width = 1080,
  height = 560,
}) => {
  const [heights, setHeights] = useState(initialHeights);
  const [heightInput, setHeightInput] = useState(initialHeights.join(", "));

  // Handle height input
  const handleHeightInputChange = useCallback((value: string) => {
    setHeightInput(value);
    const parsed = parseHeights(value);
    if (parsed.length > 0) {
      setHeights(parsed);
    }
  }, []);

  // Render Phaser world
  const renderWorld = () => (
    <Suspense
      fallback={
        <div
          className="flex items-center justify-center rounded-[14px]"
          style={{ width, height, background: "transparent" }}
        >
          <span className="text-gray-400">Loading...</span>
        </div>
      }
    >
      <PhaserWorld
        key={heights.join("-")}
        heights={heights}
        width={width}
        height={height}
      />
    </Suspense>
  );

  return (
    <CheeseSlideContainer>
      {/* Height editor */}
      {showEditor && (
        <div className="flex items-center justify-center gap-3 mb-4">
          <label className="text-sm font-medium text-gray-300">
            heights =
          </label>
          <input
            type="text"
            value={heightInput}
            onChange={(e) => handleHeightInputChange(e.target.value)}
            className="font-mono text-sm bg-gray-800 text-amber-300 border border-gray-600 rounded-lg px-3 py-2 w-80 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent"
            placeholder="4, 2, 3, 1"
          />
          <span className="text-xs text-gray-500">(0-9)</span>
        </div>
      )}

      <div className="flex gap-4 items-start justify-center">
        <div className="flex-shrink-0">
          {renderWorld()}
        </div>
      </div>
    </CheeseSlideContainer>
  );
};

export default SeaViews;
