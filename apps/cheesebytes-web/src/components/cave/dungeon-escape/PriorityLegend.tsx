import React, { useState, useRef, useCallback, useEffect } from "react";
import { DIR_ARROWS } from "./algorithms";
import type { DirName } from "./algorithms";

interface Props {
  dirs: DirName[];
  onChange?: (newDirs: DirName[]) => void;
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
  const [draggedDir, setDraggedDir] = useState<DirName | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const slotsTopRef = useRef(0);

  useEffect(() => setVisual(dirs), [dirs]);

  const slotOf = (d: DirName) => visual.indexOf(d);

  const captureOrigin = useCallback(() => {
    if (!containerRef.current) return;
    const firstSlot =
      containerRef.current.querySelector<HTMLElement>("[data-slot]");
    if (firstSlot) {
      slotsTopRef.current = firstSlot.getBoundingClientRect().top;
    }
  }, []);

  const indexFromY = useCallback((clientY: number) => {
    const relY = clientY - slotsTopRef.current;
    const idx = Math.round(relY / SLOT_HEIGHT);
    return Math.max(0, Math.min(ALL_DIRS.length - 1, idx));
  }, []);

  const reorder = useCallback((dragged: DirName, targetIdx: number) => {
    setVisual((prev) => {
      const without = prev.filter((d) => d !== dragged);
      without.splice(targetIdx, 0, dragged);
      return without;
    });
  }, []);

  const handlePointerDown = useCallback(
    (e: React.PointerEvent, dir: DirName) => {
      e.preventDefault();
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
      captureOrigin();
      setDraggedDir(dir);
    },
    [captureOrigin],
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (draggedDir === null) return;
      const target = indexFromY(e.clientY);
      reorder(draggedDir, target);
    },
    [draggedDir, indexFromY, reorder],
  );

  const handlePointerUp = useCallback(
    (e: React.PointerEvent) => {
      if (draggedDir === null) return;
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
      const finalOrder = [...visual];
      setDraggedDir(null);
      if (finalOrder.some((d, i) => d !== dirs[i])) {
        onChange?.(finalOrder);
      }
    },
    [draggedDir, visual, dirs, onChange],
  );

  return (
    <div
      ref={containerRef}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
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
          const isDragging = draggedDir === d;

          return (
            <div
              key={d}
              style={{
                position: "absolute",
                left: 0,
                top: 0,
                width: "100%",
                transform: `translateY(${slot * SLOT_HEIGHT}px)`,
                transition: isDragging ? "none" : "transform 150ms ease",
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
                  "transition-shadow duration-150",
                  isDragging
                    ? "border-blue-400 dark:border-blue-500 scale-110 shadow-lg shadow-blue-500/20"
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
