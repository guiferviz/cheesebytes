import React, { useCallback, useState } from "react";
import { posKey } from "../dungeon-escape/types";
import {
  GRID_HOVER_FILL,
  GRID_HOVER_OUTLINE,
  GRID_LINE_COLOR,
} from "./gold-mine-viewer-shared";
import type { GridOverlayPos } from "./gold-mine-viewer-shared";

interface GoldMineGridOverlayProps {
  rows: number;
  cols: number;
  hover: GridOverlayPos | null;
  onHover: (pos: GridOverlayPos | null) => void;
  onClick?: (pos: GridOverlayPos) => void;
  onDrag?: (pos: GridOverlayPos) => void;
  onDragEnd?: () => void;
  cursor?: string;
  selected?: GridOverlayPos | null;
  highlightedKeys?: Set<string>;
  selectedFill?: string;
  selectedOutline?: string;
  highlightedFill?: string;
  highlightedOutline?: string;
}

export const GoldMineGridOverlay: React.FC<GoldMineGridOverlayProps> = ({
  rows,
  cols,
  hover,
  onHover,
  onClick,
  onDrag,
  onDragEnd,
  cursor,
  selected = null,
  highlightedKeys = new Set<string>(),
  selectedFill = "rgba(76, 175, 80, 0.35)",
  selectedOutline = "inset 0 0 0 2px rgba(76,175,80,0.7)",
  highlightedFill = "rgba(246, 189, 96, 0.35)",
  highlightedOutline = "inset 0 0 0 2px rgba(246,189,96,0.5)",
}) => {
  const [dragging, setDragging] = useState(false);

  const cellFromEvent = useCallback(
    (e: React.MouseEvent<HTMLDivElement>): GridOverlayPos | null => {
      const rect = e.currentTarget.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const c = Math.floor((x / rect.width) * cols);
      const r = Math.floor((y / rect.height) * rows);
      if (r < 0 || r >= rows || c < 0 || c >= cols) return null;
      return { r, c };
    },
    [rows, cols],
  );

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        zIndex: 10,
        cursor: cursor ?? "crosshair",
      }}
      onMouseMove={(e) => {
        const cell = cellFromEvent(e);
        onHover(cell);
        if (dragging && cell && onDrag) onDrag(cell);
      }}
      onMouseDown={(e) => {
        const cell = cellFromEvent(e);
        if (cell) {
          onClick?.(cell);
          if (onDrag) setDragging(true);
        }
      }}
      onMouseUp={() => {
        setDragging(false);
        onDragEnd?.();
      }}
      onMouseLeave={() => {
        onHover(null);
        setDragging(false);
        onDragEnd?.();
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "grid",
          gridTemplateColumns: `repeat(${cols}, 1fr)`,
          gridTemplateRows: `repeat(${rows}, 1fr)`,
          pointerEvents: "none",
        }}
      >
        {Array.from({ length: rows * cols }, (_, i) => {
          const r = Math.floor(i / cols);
          const c = i % cols;
          const key = posKey(r, c);
          const isHovered = hover?.r === r && hover?.c === c;
          const isSelected = selected?.r === r && selected?.c === c;
          const isHighlighted = highlightedKeys.has(key);

          let background: string | undefined;
          let boxShadow: string | undefined;
          if (isSelected) {
            background = selectedFill;
            boxShadow = selectedOutline;
          } else if (isHighlighted) {
            background = highlightedFill;
            boxShadow = highlightedOutline;
          } else if (isHovered) {
            background = GRID_HOVER_FILL;
            boxShadow = GRID_HOVER_OUTLINE;
          }

          return (
            <div
              key={i}
              style={{
                borderRight:
                  c < cols - 1 ? `1px solid ${GRID_LINE_COLOR}` : undefined,
                borderBottom:
                  r < rows - 1 ? `1px solid ${GRID_LINE_COLOR}` : undefined,
                background,
                boxShadow,
              }}
            />
          );
        })}
      </div>

      {hover && (
        <div
          style={{
            position: "absolute",
            left: `${((hover.c + 0.5) / cols) * 100}%`,
            top: `${((hover.r + 0.5) / rows) * 100}%`,
            transform: "translate(-50%, -140%)",
            pointerEvents: "none",
            background: "rgba(8,10,14,0.88)",
            color: "#f6bd60",
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 13,
            fontWeight: 700,
            padding: "3px 10px",
            borderRadius: 6,
            border: "1px solid rgba(246,189,96,0.3)",
            whiteSpace: "nowrap",
          }}
        >
          ({hover.r}, {hover.c})
        </div>
      )}
    </div>
  );
};
