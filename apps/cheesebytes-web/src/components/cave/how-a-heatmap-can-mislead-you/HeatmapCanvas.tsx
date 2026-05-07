import { useEffect, useRef, useState } from "react";
import type { CSSProperties, Dispatch, SetStateAction } from "react";

import {
  colorForValue,
  DEFAULT_HEATMAP_PALETTE,
  getGridCellValues,
  getHexCellPolygon,
  getMaxCellValue,
  getPostcodeCells,
  getSquareCellPolygon,
  getSquareVisibleRange,
  getTriangleCellPolygon,
  getVisibleHexCoords,
  getVisibleTriangleCoords,
  hexKey,
  squareKey,
  triangleKey,
  toCanvasSpace,
} from "./heatmap-core";
import type { CellValues, GridType, Origin, Point } from "./types";

interface HeatmapCanvasProps {
  points: Point[];
  canvasSize?: number;
  gridType: GridType;
  cellSize: number;
  orientation: number;
  origin: Origin;
  showPoints?: boolean;
  showAggregation?: boolean;
  showBackdrop?: boolean;
  showOrigin?: boolean;
  showBorder?: boolean;
  interactive?: boolean;
  cellValues?: CellValues;
  pointRadius?: number;
  style?: CSSProperties;
  onOriginChange?: Dispatch<SetStateAction<Origin>>;
}

function drawPolygon(ctx: CanvasRenderingContext2D, polygon: Point[]) {
  ctx.beginPath();
  polygon.forEach((point, index) => {
    if (index === 0) {
      ctx.moveTo(point.x, point.y);
      return;
    }
    ctx.lineTo(point.x, point.y);
  });
  ctx.closePath();
}

function drawCityBackdrop(
  ctx: CanvasRenderingContext2D,
  canvasSize: number,
  isDark: boolean,
) {
  ctx.clearRect(0, 0, canvasSize, canvasSize);
  ctx.fillStyle = isDark ? "#0c1320" : "#fffaf2";
  ctx.fillRect(0, 0, canvasSize, canvasSize);

  ctx.fillStyle = isDark
    ? "rgba(92, 120, 160, 0.08)"
    : "rgba(70, 101, 142, 0.06)";
  ctx.beginPath();
  ctx.moveTo(canvasSize * 0.06, canvasSize * 0.18);
  ctx.bezierCurveTo(
    canvasSize * 0.24,
    canvasSize * 0.08,
    canvasSize * 0.5,
    canvasSize * 0.14,
    canvasSize * 0.92,
    canvasSize * 0.04,
  );
  ctx.lineTo(canvasSize * 0.92, canvasSize * 0.18);
  ctx.bezierCurveTo(
    canvasSize * 0.58,
    canvasSize * 0.28,
    canvasSize * 0.26,
    canvasSize * 0.18,
    canvasSize * 0.08,
    canvasSize * 0.3,
  );
  ctx.closePath();
  ctx.fill();

  const districtFill = isDark
    ? "rgba(255,255,255,0.035)"
    : "rgba(76, 57, 39, 0.035)";
  const districts = [
    [0.12, 0.26, 0.22, 0.16],
    [0.48, 0.22, 0.18, 0.2],
    [0.68, 0.44, 0.18, 0.16],
    [0.26, 0.56, 0.26, 0.18],
    [0.58, 0.68, 0.14, 0.11],
  ];
  ctx.fillStyle = districtFill;
  for (const [x, y, w, h] of districts) {
    ctx.beginPath();
    ctx.roundRect(
      canvasSize * x,
      canvasSize * y,
      canvasSize * w,
      canvasSize * h,
      18,
    );
    ctx.fill();
  }

  ctx.strokeStyle = isDark ? "rgba(226,232,240,0.06)" : "rgba(74,58,42,0.08)";
  ctx.lineWidth = 1;
  const roadOffsets = [0.16, 0.35, 0.54, 0.72];
  for (const offset of roadOffsets) {
    ctx.beginPath();
    ctx.moveTo(canvasSize * 0.08, canvasSize * offset);
    ctx.quadraticCurveTo(
      canvasSize * 0.36,
      canvasSize * (offset - 0.08),
      canvasSize * 0.92,
      canvasSize * (offset + 0.03),
    );
    ctx.stroke();
  }
  for (const offset of [0.2, 0.42, 0.62, 0.82]) {
    ctx.beginPath();
    ctx.moveTo(canvasSize * offset, canvasSize * 0.08);
    ctx.quadraticCurveTo(
      canvasSize * (offset - 0.04),
      canvasSize * 0.42,
      canvasSize * (offset + 0.05),
      canvasSize * 0.92,
    );
    ctx.stroke();
  }
}

function useDarkModeFlag() {
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

  return isDark;
}

function canvasDeltaToGridDelta(
  deltaX: number,
  deltaY: number,
  orientation: number,
): Origin {
  const angle = (-orientation * Math.PI) / 180;
  const sin = Math.sin(angle);
  const cos = Math.cos(angle);

  return {
    x: deltaX * cos - deltaY * sin,
    y: deltaX * sin + deltaY * cos,
  };
}

export function HeatmapCanvas({
  points,
  canvasSize = 320,
  gridType,
  cellSize,
  orientation,
  origin,
  showPoints = true,
  showAggregation = true,
  showBackdrop = true,
  showOrigin = true,
  showBorder = true,
  interactive = false,
  cellValues,
  pointRadius = 2.6,
  style,
  onOriginChange,
}: HeatmapCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const dragRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    pixelsToCanvasX: number;
    pixelsToCanvasY: number;
    origin: Origin;
  } | null>(null);
  const [displaySize, setDisplaySize] = useState(() => ({
    width: canvasSize,
    height: canvasSize,
  }));
  const isDark = useDarkModeFlag();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }

    const updateDisplaySize = () => {
      const bounds = canvas.getBoundingClientRect();
      const width = bounds.width || canvasSize;
      const height = bounds.height || canvasSize;

      setDisplaySize((current) => {
        if (
          Math.abs(current.width - width) < 0.5 &&
          Math.abs(current.height - height) < 0.5
        ) {
          return current;
        }

        return { width, height };
      });
    };

    updateDisplaySize();

    if (typeof ResizeObserver === "undefined") {
      window.addEventListener("resize", updateDisplaySize);
      return () => window.removeEventListener("resize", updateDisplaySize);
    }

    const observer = new ResizeObserver(updateDisplaySize);
    observer.observe(canvas);
    window.addEventListener("resize", updateDisplaySize);

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", updateDisplaySize);
    };
  }, [canvasSize]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !interactive || !onOriginChange || gridType !== "postcode") {
      return;
    }

    const handleWheel = (event: WheelEvent) => {
      event.preventDefault();
      const scale = 0.9;
      onOriginChange((current) => ({
        x: current.x - event.deltaX * scale,
        y: current.y - event.deltaY * scale,
      }));
    };

    canvas.addEventListener("wheel", handleWheel, { passive: false });
    return () => canvas.removeEventListener("wheel", handleWheel);
  }, [gridType, interactive, onOriginChange]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }

    const ratio = window.devicePixelRatio || 1;
    const bufferWidth = Math.max(1, Math.round(displaySize.width * ratio));
    const bufferHeight = Math.max(1, Math.round(displaySize.height * ratio));
    canvas.width = bufferWidth;
    canvas.height = bufferHeight;

    const ctx = canvas.getContext("2d");
    if (!ctx) {
      return;
    }

    ctx.setTransform(
      bufferWidth / canvasSize,
      0,
      0,
      bufferHeight / canvasSize,
      0,
      0,
    );
    ctx.lineJoin = "round";
    ctx.lineCap = "round";

    if (showBackdrop) {
      drawCityBackdrop(ctx, canvasSize, isDark);
    } else {
      ctx.clearRect(0, 0, canvasSize, canvasSize);
    }

    const settings = {
      gridType,
      cellSize,
      orientation,
      origin,
      canvasSize,
    };
    const values = cellValues ?? getGridCellValues(points, settings);
    const maxValue = getMaxCellValue(values);
    const emptyFill = isDark
      ? "rgba(255,255,255,0.015)"
      : "rgba(43,34,24,0.025)";
    const stroke = isDark ? "rgba(226,232,240,0.1)" : "rgba(63,48,32,0.12)";
    const postcodeStroke = isDark
      ? "rgba(233,240,249,0.2)"
      : "rgba(46,54,62,0.22)";

    if (showAggregation) {
      if (gridType === "square") {
        const range = getSquareVisibleRange(settings);
        for (let iy = range.iyMin; iy <= range.iyMax; iy += 1) {
          for (let ix = range.ixMin; ix <= range.ixMax; ix += 1) {
            const value = values.get(squareKey(ix, iy)) ?? 0;
            const polygon = getSquareCellPolygon(ix, iy, settings);
            drawPolygon(ctx, polygon);
            ctx.fillStyle =
              value > 0
                ? colorForValue(value, maxValue, DEFAULT_HEATMAP_PALETTE)
                : emptyFill;
            ctx.globalAlpha =
              value > 0 ? 0.18 + 0.76 * (value / Math.max(maxValue, 1)) : 1;
            ctx.fill();
            ctx.globalAlpha = 1;
            ctx.strokeStyle = stroke;
            ctx.lineWidth = 1;
            ctx.stroke();
          }
        }
      } else if (gridType === "triangle") {
        for (const { ix, iy } of getVisibleTriangleCoords(settings)) {
          const value = values.get(triangleKey(ix, iy)) ?? 0;
          const polygon = getTriangleCellPolygon(ix, iy, settings);
          drawPolygon(ctx, polygon);
          ctx.fillStyle =
            value > 0
              ? colorForValue(value, maxValue, DEFAULT_HEATMAP_PALETTE)
              : emptyFill;
          ctx.globalAlpha =
            value > 0 ? 0.18 + 0.76 * (value / Math.max(maxValue, 1)) : 1;
          ctx.fill();
          ctx.globalAlpha = 1;
          ctx.strokeStyle = stroke;
          ctx.lineWidth = 1;
          ctx.stroke();
        }
      } else if (gridType === "postcode") {
        for (const cell of getPostcodeCells(settings)) {
          const value = values.get(cell.key) ?? 0;
          drawPolygon(ctx, cell.polygon);
          ctx.fillStyle =
            value > 0
              ? colorForValue(value, maxValue, DEFAULT_HEATMAP_PALETTE)
              : emptyFill;
          ctx.globalAlpha =
            value > 0 ? 0.18 + 0.76 * (value / Math.max(maxValue, 1)) : 1;
          ctx.fill();
          ctx.globalAlpha = 1;
          ctx.strokeStyle = postcodeStroke;
          ctx.lineWidth = 0.95;
          ctx.stroke();
        }
      } else {
        for (const { q, r } of getVisibleHexCoords(settings)) {
          const value = values.get(hexKey(q, r)) ?? 0;
          const polygon = getHexCellPolygon(q, r, settings);
          drawPolygon(ctx, polygon);
          ctx.fillStyle =
            value > 0
              ? colorForValue(value, maxValue, DEFAULT_HEATMAP_PALETTE)
              : emptyFill;
          ctx.globalAlpha =
            value > 0 ? 0.18 + 0.76 * (value / Math.max(maxValue, 1)) : 1;
          ctx.fill();
          ctx.globalAlpha = 1;
          ctx.strokeStyle = stroke;
          ctx.lineWidth = 1;
          ctx.stroke();
        }
      }
    }

    if (showPoints) {
      ctx.fillStyle = isDark ? "rgba(248,250,252,0.88)" : "rgba(40,31,22,0.78)";
      points.forEach((point) => {
        ctx.beginPath();
        ctx.arc(point.x, point.y, pointRadius, 0, Math.PI * 2);
        ctx.fill();
      });
    }

    if (showOrigin) {
      const transformedOrigin = toCanvasSpace(origin, canvasSize, orientation);
      ctx.beginPath();
      ctx.arc(transformedOrigin.x, transformedOrigin.y, 4.2, 0, Math.PI * 2);
      ctx.fillStyle = isDark ? "rgba(255,157,92,0.95)" : "rgba(185,93,30,0.88)";
      ctx.fill();
      ctx.beginPath();
      ctx.arc(transformedOrigin.x, transformedOrigin.y, 8.5, 0, Math.PI * 2);
      ctx.strokeStyle = isDark
        ? "rgba(255,157,92,0.34)"
        : "rgba(185,93,30,0.28)";
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }

    if (showBorder) {
      ctx.strokeStyle = isDark
        ? "rgba(255,255,255,0.1)"
        : "rgba(60,46,31,0.12)";
      ctx.lineWidth = 1;
      ctx.strokeRect(0.5, 0.5, canvasSize - 1, canvasSize - 1);
    }
  }, [
    canvasSize,
    cellSize,
    cellValues,
    displaySize.height,
    displaySize.width,
    gridType,
    isDark,
    orientation,
    origin,
    pointRadius,
    points,
    showAggregation,
    showBackdrop,
    showBorder,
    showOrigin,
    showPoints,
  ]);

  return (
    <canvas
      ref={canvasRef}
      width={canvasSize}
      height={canvasSize}
      style={{
        width: canvasSize,
        height: canvasSize,
        borderRadius: showBorder || showBackdrop ? 20 : 0,
        display: "block",
        cursor: interactive
          ? dragRef.current
            ? "grabbing"
            : "grab"
          : "default",
        touchAction: "none",
        ...style,
      }}
      onPointerDown={(event) => {
        if (!interactive || !onOriginChange) {
          return;
        }
        const bounds = event.currentTarget.getBoundingClientRect();
        dragRef.current = {
          pointerId: event.pointerId,
          startX: event.clientX,
          startY: event.clientY,
          pixelsToCanvasX: bounds.width > 0 ? canvasSize / bounds.width : 1,
          pixelsToCanvasY: bounds.height > 0 ? canvasSize / bounds.height : 1,
          origin,
        };
        event.currentTarget.setPointerCapture(event.pointerId);
      }}
      onPointerMove={(event) => {
        if (!interactive || !onOriginChange || !dragRef.current) {
          return;
        }
        const deltaX =
          (event.clientX - dragRef.current.startX) *
          dragRef.current.pixelsToCanvasX;
        const deltaY =
          (event.clientY - dragRef.current.startY) *
          dragRef.current.pixelsToCanvasY;
        const gridDelta = canvasDeltaToGridDelta(deltaX, deltaY, orientation);
        onOriginChange({
          x: dragRef.current.origin.x + gridDelta.x,
          y: dragRef.current.origin.y + gridDelta.y,
        });
      }}
      onPointerUp={(event) => {
        if (dragRef.current?.pointerId === event.pointerId) {
          dragRef.current = null;
          event.currentTarget.releasePointerCapture(event.pointerId);
        }
      }}
      onPointerCancel={() => {
        dragRef.current = null;
      }}
    />
  );
}
