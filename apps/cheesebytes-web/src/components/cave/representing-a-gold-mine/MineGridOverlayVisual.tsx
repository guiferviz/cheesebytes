import React, { useMemo, useRef, useState } from "react";
import {
  parseRawMap,
  MineMapViewer,
  MineGridOverlay,
} from "../../pathfinding-gold-mine";
import {
  useFullscreen,
  fullscreenRootStyle,
  fullscreenInnerStyle,
} from "../shared/useFullscreen";
import type { Pos } from "../../pathfinding-gold-mine";

export interface MineGridOverlayVisualProps {
  rawMap: string[];
  maxWidth?: number;
}

export const MineGridOverlayVisual: React.FC<MineGridOverlayVisualProps> = ({
  rawMap,
  maxWidth = 600,
}) => {
  const rootRef = useRef<HTMLDivElement>(null);
  const mapState = useMemo(() => parseRawMap(rawMap), [rawMap]);
  const [hover, setHover] = useState<Pos | null>(null);
  const { isFullscreen, toggleFullscreen } = useFullscreen(rootRef);

  return (
    <div
      ref={rootRef}
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "f" && !e.metaKey && !e.ctrlKey) {
          e.preventDefault();
          toggleFullscreen();
        }
      }}
      style={{ ...fullscreenRootStyle(isFullscreen), outline: "none" }}
    >
      <div
        style={{
          ...fullscreenInnerStyle(isFullscreen, maxWidth),
          margin: "2rem auto",
          userSelect: "none",
        }}
      >
        <MineMapViewer
          mapState={mapState}
          maxWidth={isFullscreen ? undefined : maxWidth}
        >
          <MineGridOverlay
            rows={mapState.rows}
            cols={mapState.cols}
            hover={hover}
            onHover={setHover}
          />
        </MineMapViewer>
      </div>
    </div>
  );
};
