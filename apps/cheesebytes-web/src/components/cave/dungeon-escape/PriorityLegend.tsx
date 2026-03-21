import React, { useState, useRef, useCallback, useEffect } from "react";
import { DIR_ARROWS } from "./algorithms";
import type { DirName } from "./algorithms";

interface Props {
  dirs: DirName[];
  onChange?: (newDirs: DirName[]) => void;
}

interface DragState {
  dir: DirName;
  pointerId: number;
  startY: number;
  originIndex: number;
  offsetY: number;
}

const ALL_DIRS: DirName[] = ["up", "right", "down", "left"];
const SLOT_HEIGHT = 48; // h-10 (40px) + gap (8px)

/**
 * Vertical priority legend with smooth pointer-based drag-to-reorder.
 * Items are rendered in a fixed DOM order and positioned via CSS transforms
 * so reordering animates smoothly instead of jumping.
 */
export const PriorityLegend: React.FC<Props> = ({ dirs, onChange }) => {
  const [visual, setVisual] = useState(dirs);
  const [dragState, setDragState] = useState<DragState | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => setVisual(dirs), [dirs]);

  const slotOf = (d: DirName) => visual.indexOf(d);

  const reorder = useCallback((dragged: DirName, targetIdx: number) => {
    setVisual((prev) => {
      const currentIdx = prev.indexOf(dragged);
      if (currentIdx === targetIdx) return prev;
      const without = prev.filter((d) => d !== dragged);
      without.splice(targetIdx, 0, dragged);
      return without;
    });
  }, []);

  const handlePointerDown = useCallback(
    (e: React.PointerEvent, dir: DirName) => {
      e.preventDefault();
      e.currentTarget.setPointerCapture(e.pointerId);
      setDragState({
        dir,
        pointerId: e.pointerId,
        startY: e.clientY,
        originIndex: visual.indexOf(dir),
        offsetY: 0,
      });
    },
    [visual],
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (dragState === null || e.pointerId !== dragState.pointerId) return;

      const offsetY = e.clientY - dragState.startY;
      const slotsMoved = Math.round(offsetY / SLOT_HEIGHT);
      const target = Math.max(
        0,
        Math.min(ALL_DIRS.length - 1, dragState.originIndex + slotsMoved),
      );

      setDragState((prev) =>
        prev && prev.pointerId === e.pointerId ? { ...prev, offsetY } : prev,
      );
      reorder(dragState.dir, target);
    },
    [dragState, reorder],
  );

  const handlePointerUp = useCallback(
    (e: React.PointerEvent) => {
      if (dragState === null || e.pointerId !== dragState.pointerId) return;
      const target = e.target as HTMLElement;
      if (target.hasPointerCapture(e.pointerId)) {
        target.releasePointerCapture(e.pointerId);
      }
      const finalOrder = [...visual];
      setDragState(null);
      if (finalOrder.some((d, i) => d !== dirs[i])) {
        onChange?.(finalOrder);
      }
    },
    [dragState, visual, dirs, onChange],
  );

  const handlePointerCancel = useCallback(
    (e: React.PointerEvent) => {
      if (dragState === null || e.pointerId !== dragState.pointerId) return;
      const target = e.target as HTMLElement;
      if (target.hasPointerCapture(e.pointerId)) {
        target.releasePointerCapture(e.pointerId);
      }
      setDragState(null);
      setVisual(dirs);
    },
    [dragState, dirs],
  );

  return (
    <div
      ref={containerRef}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerCancel}
      className="flex flex-col items-center select-none"
    >
      <span className="text-xs font-semibold tracking-wide uppercase text-neutral-500 dark:text-neutral-400 mb-2">
        Priority
      </span>
      <div
        data-slot
        style={{
          position: "relative",
          width: 72,
          height: SLOT_HEIGHT * ALL_DIRS.length,
        }}
      >
        {ALL_DIRS.map((d) => {
          const slot = slotOf(d);
          const isDragging = dragState?.dir === d;
          const dragOffsetY = isDragging ? dragState.offsetY : 0;
          const baseY = isDragging
            ? dragState.originIndex * SLOT_HEIGHT
            : slot * SLOT_HEIGHT;

          return (
            <div
              key={d}
              style={{
                position: "absolute",
                left: 0,
                top: 0,
                width: "100%",
                transform: `translate3d(${isDragging ? 6 : 0}px, ${baseY + dragOffsetY}px, 0)`,
                transition: isDragging ? "none" : "transform 220ms ease",
                zIndex: isDragging ? 10 : 1,
              }}
              className="flex items-center gap-1.5"
            >
              <span className="text-xs font-mono text-neutral-400 dark:text-neutral-500 w-4 text-right">
                {slot + 1}.
              </span>
              <div
                onPointerDown={(e) => handlePointerDown(e, d)}
                className={[
                  "flex items-center justify-center w-10 h-10 rounded-lg cursor-grab active:cursor-grabbing",
                  "bg-neutral-100 dark:bg-neutral-800",
                  "border",
                  "transition duration-150",
                  isDragging
                    ? "border-blue-400 dark:border-blue-500 scale-110 shadow-xl shadow-blue-500/25"
                    : "border-transparent hover:bg-neutral-200 dark:hover:bg-neutral-700",
                ].join(" ")}
              >
                <span className="text-2xl leading-none text-neutral-700 dark:text-neutral-200">
                  {DIR_ARROWS[d]}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
