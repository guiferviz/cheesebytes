import React, { useCallback, useEffect, useState } from "react";
import { posKey } from "./types";
import type { Pos } from "./types";
import {
  GRID_HOVER_FILL,
  GRID_HOVER_OUTLINE,
  GRID_LINE_COLOR,
} from "./mine-viewer-shared";

export interface MineGridOverlayProps {
  rows: number;
  cols: number;
  hover: Pos | null;
  onHover: (pos: Pos | null) => void;
  onClick?: (pos: Pos) => void;
  onDrag?: (pos: Pos) => void;
  onDragEnd?: () => void;
  cursor?: string;
  selected?: Pos | null;
  highlightedKeys?: Set<string>;
  cellLabels?: Map<string, string>;
  showHoverLabel?: boolean;
  selectedFill?: string;
  selectedOutline?: string;
  highlightedFill?: string;
  highlightedOutline?: string;
}

export const MineGridOverlay: React.FC<MineGridOverlayProps> = ({
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
  cellLabels = new Map<string, string>(),
  showHoverLabel = true,
  selectedFill = "rgba(76, 175, 80, 0.35)",
  selectedOutline = "inset 0 0 0 2px rgba(76,175,80,0.7)",
  highlightedFill = "rgba(246, 189, 96, 0.35)",
  highlightedOutline = "inset 0 0 0 2px rgba(246,189,96,0.5)",
}) => {
  const [dragging, setDragging] = useState(false);
  const [isDark, setIsDark] = useState(
    () =>
      typeof document !== "undefined" &&
      document.documentElement.classList.contains("dark"),
  );

  useEffect(() => {
    const observer = new MutationObserver(() => {
      setIsDark(document.documentElement.classList.contains("dark"));
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });

    return () => observer.disconnect();
  }, []);

  const tooltipBackground = isDark
    ? "rgba(20, 14, 10, 0.85)"
    : "rgba(245, 240, 230, 0.92)";
  const tooltipColor = isDark
    ? "var(--goldmine-hud-accent)"
    : "var(--goldmine-hud-text)";

  const cellFromEvent = useCallback(
    (e: React.MouseEvent<HTMLDivElement>): Pos | null => {
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
          const label = cellLabels.get(key);

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
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                borderRight:
                  c < cols - 1
                    ? `1px solid ${GRID_LINE_COLOR}`
                    : undefined,
                borderBottom:
                  r < rows - 1
                    ? `1px solid ${GRID_LINE_COLOR}`
                    : undefined,
                background,
                boxShadow,
                color:
                  isSelected || isHighlighted ? "#fff5e6" : undefined,
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 11,
                fontWeight: 700,
                textShadow:
                  isSelected || isHighlighted
                    ? "0 1px 2px rgba(0,0,0,0.65)"
                    : undefined,
              }}
            >
              {label ?? null}
            </div>
          );
        })}
      </div>

      {showHoverLabel && hover && (
        <div
          style={{
            position: "absolute",
            left: `${((hover.c + 0.5) / cols) * 100}%`,
            top: `${((hover.r + 0.5) / rows) * 100}%`,
            transform: "translate(-50%, -140%)",
            pointerEvents: "none",
            background: tooltipBackground,
            color: tooltipColor,
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 13,
            fontWeight: 700,
            padding: "3px 10px",
            border: "1px solid var(--goldmine-hud-border)",
            whiteSpace: "nowrap",
          }}
        >
          ({hover.r}, {hover.c})
        </div>
      )}
    </div>
  );
};
