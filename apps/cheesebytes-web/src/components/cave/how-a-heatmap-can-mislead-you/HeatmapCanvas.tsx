import { useEffect, useRef, useState } from "react";
import type { CSSProperties, Dispatch, SetStateAction } from "react";

import {
  colorForValue,
  DEFAULT_HEATMAP_PALETTE,
  getGridCellValues,
  getHexCellPolygon,
  getMaxCellValue,
  getPostcodeCells,
  getPostcodeLayout,
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
import type {
  CellValues,
  GridType,
  Origin,
  Point,
  PostcodeSubdivisionLevel,
} from "./types";

interface HeatmapCanvasProps {
  points: Point[];
  canvasSize?: number;
  canvasWidth?: number;
  canvasHeight?: number;
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
  postcodeSubdivisionLevel?: PostcodeSubdivisionLevel;
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
  canvasWidth: number,
  canvasHeight: number,
  isDark: boolean,
) {
  ctx.clearRect(0, 0, canvasWidth, canvasHeight);
  ctx.fillStyle = isDark ? "#0c1320" : "#fffaf2";
  ctx.fillRect(0, 0, canvasWidth, canvasHeight);

  ctx.fillStyle = isDark
    ? "rgba(92, 120, 160, 0.08)"
    : "rgba(70, 101, 142, 0.06)";
  ctx.beginPath();
  ctx.moveTo(canvasWidth * 0.06, canvasHeight * 0.18);
  ctx.bezierCurveTo(
    canvasWidth * 0.24,
    canvasHeight * 0.08,
    canvasWidth * 0.5,
    canvasHeight * 0.14,
    canvasWidth * 0.92,
    canvasHeight * 0.04,
  );
  ctx.lineTo(canvasWidth * 0.92, canvasHeight * 0.18);
  ctx.bezierCurveTo(
    canvasWidth * 0.58,
    canvasHeight * 0.28,
    canvasWidth * 0.26,
    canvasHeight * 0.18,
    canvasWidth * 0.08,
    canvasHeight * 0.3,
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
      canvasWidth * x,
      canvasHeight * y,
      canvasWidth * w,
      canvasHeight * h,
      18,
    );
    ctx.fill();
  }

  ctx.strokeStyle = isDark ? "rgba(226,232,240,0.06)" : "rgba(74,58,42,0.08)";
  ctx.lineWidth = 1;
  const roadOffsets = [0.16, 0.35, 0.54, 0.72];
  for (const offset of roadOffsets) {
    ctx.beginPath();
    ctx.moveTo(canvasWidth * 0.08, canvasHeight * offset);
    ctx.quadraticCurveTo(
      canvasWidth * 0.36,
      canvasHeight * (offset - 0.08),
      canvasWidth * 0.92,
      canvasHeight * (offset + 0.03),
    );
    ctx.stroke();
  }
  for (const offset of [0.2, 0.42, 0.62, 0.82]) {
    ctx.beginPath();
    ctx.moveTo(canvasWidth * offset, canvasHeight * 0.08);
    ctx.quadraticCurveTo(
      canvasWidth * (offset - 0.04),
      canvasHeight * 0.42,
      canvasWidth * (offset + 0.05),
      canvasHeight * 0.92,
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
  canvasWidth,
  canvasHeight,
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
  postcodeSubdivisionLevel = 0,
  pointRadius = 2.6,
  style,
  onOriginChange,
}: HeatmapCanvasProps) {
  const logicalWidth = canvasWidth ?? canvasSize;
  const logicalHeight = canvasHeight ?? canvasSize;
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
    width: logicalWidth,
    height: logicalHeight,
  }));
  const isDark = useDarkModeFlag();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }

    const updateDisplaySize = () => {
      const bounds = canvas.getBoundingClientRect();
      const width = bounds.width || logicalWidth;
      const height = bounds.height || logicalHeight;

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
  }, [logicalHeight, logicalWidth]);

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
      bufferWidth / logicalWidth,
      0,
      0,
      bufferHeight / logicalHeight,
      0,
      0,
    );
    ctx.lineJoin = "round";
    ctx.lineCap = "round";

    if (showBackdrop) {
      drawCityBackdrop(ctx, logicalWidth, logicalHeight, isDark);
    } else {
      ctx.clearRect(0, 0, logicalWidth, logicalHeight);
    }

    const settings = {
      gridType,
      cellSize,
      orientation,
      origin,
      canvasSize: logicalWidth,
      canvasWidth: logicalWidth,
      canvasHeight: logicalHeight,
      postcodeSubdivisionLevel,
    };
    const values = cellValues ?? getGridCellValues(points, settings);
    const maxValue = getMaxCellValue(values);
    const postcodeLayout =
      gridType === "postcode" ? getPostcodeLayout(settings) : null;
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
        const postcodeCells =
          postcodeLayout?.cells ?? getPostcodeCells(settings);
        for (const cell of postcodeCells) {
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
        }

        if (postcodeSubdivisionLevel === 0 || !postcodeLayout) {
          ctx.strokeStyle = postcodeStroke;
          ctx.lineWidth = 0.95;
          for (const cell of postcodeCells) {
            drawPolygon(ctx, cell.polygon);
            ctx.stroke();
          }
        } else {
          ctx.save();
          ctx.strokeStyle = postcodeStroke;
          ctx.lineWidth = 1.05;
          ctx.setLineDash([]);
          for (const cell of postcodeLayout.baseCells) {
            drawPolygon(ctx, cell.polygon);
            ctx.stroke();
          }

          for (const line of postcodeLayout.divisionLines) {
            ctx.beginPath();
            ctx.moveTo(line.start.x, line.start.y);
            ctx.lineTo(line.end.x, line.end.y);
            if (line.level === 1) {
              ctx.setLineDash([8, 6]);
              ctx.lineWidth = 1.15;
            } else {
              ctx.setLineDash([1.2, 6]);
              ctx.lineWidth = 1.9;
            }
            ctx.stroke();
          }
          ctx.restore();
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
      const transformedOrigin = toCanvasSpace(
        origin,
        logicalWidth,
        orientation,
        logicalHeight,
      );
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
      ctx.strokeRect(0.5, 0.5, logicalWidth - 1, logicalHeight - 1);
    }
  }, [
    cellSize,
    cellValues,
    displaySize.height,
    displaySize.width,
    gridType,
    isDark,
    logicalHeight,
    logicalWidth,
    orientation,
    origin,
    postcodeSubdivisionLevel,
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
      width={logicalWidth}
      height={logicalHeight}
      style={{
        width: logicalWidth,
        height: logicalHeight,
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
          pixelsToCanvasX: bounds.width > 0 ? logicalWidth / bounds.width : 1,
          pixelsToCanvasY:
            bounds.height > 0 ? logicalHeight / bounds.height : 1,
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
