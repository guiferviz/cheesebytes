import { useEffect, useRef, useState } from "react";
import type {
  CanvasHTMLAttributes,
  CSSProperties,
  Dispatch,
  RefObject,
  SetStateAction,
} from "react";

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

export type HeatmapCanvasLayer =
  | "backdrop"
  | "aggregation"
  | "points"
  | "origin"
  | "border";

export const HEATMAP_CANVAS_LAYER_ORDER: readonly HeatmapCanvasLayer[] = [
  "backdrop",
  "aggregation",
  "points",
  "origin",
  "border",
];

export type HeatmapCanvasLayerAttributes = Omit<
  CanvasHTMLAttributes<HTMLCanvasElement>,
  "children" | "height" | "width"
> & {
  [attribute: `data-${string}`]: string | number | undefined;
};

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
  layerAttributes?: Partial<
    Record<HeatmapCanvasLayer, HeatmapCanvasLayerAttributes>
  >;
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

function prepareLayer(
  canvas: HTMLCanvasElement | null,
  displayWidth: number,
  displayHeight: number,
  logicalWidth: number,
  logicalHeight: number,
) {
  if (!canvas) return null;

  const ratio = window.devicePixelRatio || 1;
  const bufferWidth = Math.max(1, Math.round(displayWidth * ratio));
  const bufferHeight = Math.max(1, Math.round(displayHeight * ratio));
  canvas.width = bufferWidth;
  canvas.height = bufferHeight;

  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  ctx.setTransform(
    bufferWidth / logicalWidth,
    0,
    0,
    bufferHeight / logicalHeight,
    0,
    0,
  );
  ctx.clearRect(0, 0, logicalWidth, logicalHeight);
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  ctx.globalAlpha = 1;
  ctx.setLineDash([]);
  return ctx;
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
  layerAttributes,
  onOriginChange,
}: HeatmapCanvasProps) {
  const logicalWidth = canvasWidth ?? canvasSize;
  const logicalHeight = canvasHeight ?? canvasSize;
  const rootRef = useRef<HTMLDivElement>(null);
  const backdropRef = useRef<HTMLCanvasElement>(null);
  const aggregationRef = useRef<HTMLCanvasElement>(null);
  const pointsRef = useRef<HTMLCanvasElement>(null);
  const originRef = useRef<HTMLCanvasElement>(null);
  const borderRef = useRef<HTMLCanvasElement>(null);
  const layerRefs: Record<
    HeatmapCanvasLayer,
    RefObject<HTMLCanvasElement>
  > = {
    backdrop: backdropRef,
    aggregation: aggregationRef,
    points: pointsRef,
    origin: originRef,
    border: borderRef,
  };
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
    const root = rootRef.current;
    if (!root) return;

    const updateDisplaySize = () => {
      const bounds = root.getBoundingClientRect();
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
    observer.observe(root);
    window.addEventListener("resize", updateDisplaySize);

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", updateDisplaySize);
    };
  }, [logicalHeight, logicalWidth]);

  useEffect(() => {
    const root = rootRef.current;
    if (!root || !interactive || !onOriginChange || gridType !== "postcode") {
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

    root.addEventListener("wheel", handleWheel, { passive: false });
    return () => root.removeEventListener("wheel", handleWheel);
  }, [gridType, interactive, onOriginChange]);

  useEffect(() => {
    const backdrop = prepareLayer(
      backdropRef.current,
      displaySize.width,
      displaySize.height,
      logicalWidth,
      logicalHeight,
    );
    const aggregation = prepareLayer(
      aggregationRef.current,
      displaySize.width,
      displaySize.height,
      logicalWidth,
      logicalHeight,
    );
    const pointLayer = prepareLayer(
      pointsRef.current,
      displaySize.width,
      displaySize.height,
      logicalWidth,
      logicalHeight,
    );
    const originLayer = prepareLayer(
      originRef.current,
      displaySize.width,
      displaySize.height,
      logicalWidth,
      logicalHeight,
    );
    const borderLayer = prepareLayer(
      borderRef.current,
      displaySize.width,
      displaySize.height,
      logicalWidth,
      logicalHeight,
    );

    if (
      !backdrop ||
      !aggregation ||
      !pointLayer ||
      !originLayer ||
      !borderLayer
    ) {
      return;
    }

    if (showBackdrop) {
      drawCityBackdrop(backdrop, logicalWidth, logicalHeight, isDark);
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
            drawPolygon(aggregation, polygon);
            aggregation.fillStyle =
              value > 0
                ? colorForValue(value, maxValue, DEFAULT_HEATMAP_PALETTE)
                : emptyFill;
            aggregation.globalAlpha =
              value > 0 ? 0.18 + 0.76 * (value / Math.max(maxValue, 1)) : 1;
            aggregation.fill();
            aggregation.globalAlpha = 1;
            aggregation.strokeStyle = stroke;
            aggregation.lineWidth = 1;
            aggregation.stroke();
          }
        }
      } else if (gridType === "triangle") {
        for (const { ix, iy } of getVisibleTriangleCoords(settings)) {
          const value = values.get(triangleKey(ix, iy)) ?? 0;
          const polygon = getTriangleCellPolygon(ix, iy, settings);
          drawPolygon(aggregation, polygon);
          aggregation.fillStyle =
            value > 0
              ? colorForValue(value, maxValue, DEFAULT_HEATMAP_PALETTE)
              : emptyFill;
          aggregation.globalAlpha =
            value > 0 ? 0.18 + 0.76 * (value / Math.max(maxValue, 1)) : 1;
          aggregation.fill();
          aggregation.globalAlpha = 1;
          aggregation.strokeStyle = stroke;
          aggregation.lineWidth = 1;
          aggregation.stroke();
        }
      } else if (gridType === "postcode") {
        const postcodeCells =
          postcodeLayout?.cells ?? getPostcodeCells(settings);
        for (const cell of postcodeCells) {
          const value = values.get(cell.key) ?? 0;
          drawPolygon(aggregation, cell.polygon);
          aggregation.fillStyle =
            value > 0
              ? colorForValue(value, maxValue, DEFAULT_HEATMAP_PALETTE)
              : emptyFill;
          aggregation.globalAlpha =
            value > 0 ? 0.18 + 0.76 * (value / Math.max(maxValue, 1)) : 1;
          aggregation.fill();
          aggregation.globalAlpha = 1;
        }

        if (postcodeSubdivisionLevel === 0 || !postcodeLayout) {
          aggregation.strokeStyle = postcodeStroke;
          aggregation.lineWidth = 0.95;
          for (const cell of postcodeCells) {
            drawPolygon(aggregation, cell.polygon);
            aggregation.stroke();
          }
        } else {
          aggregation.save();
          aggregation.strokeStyle = postcodeStroke;
          aggregation.lineWidth = 1.05;
          aggregation.setLineDash([]);
          for (const cell of postcodeLayout.baseCells) {
            drawPolygon(aggregation, cell.polygon);
            aggregation.stroke();
          }

          for (const line of postcodeLayout.divisionLines) {
            aggregation.beginPath();
            line.points.forEach((point, index) => {
              if (index === 0) {
                aggregation.moveTo(point.x, point.y);
                return;
              }
              aggregation.lineTo(point.x, point.y);
            });
            if (line.level === 1) {
              aggregation.setLineDash([8, 6]);
              aggregation.lineWidth = 1.15;
            } else {
              aggregation.setLineDash([1.2, 6]);
              aggregation.lineWidth = 1.9;
            }
            aggregation.stroke();
          }
          aggregation.restore();
        }
      } else {
        for (const { q, r } of getVisibleHexCoords(settings)) {
          const value = values.get(hexKey(q, r)) ?? 0;
          const polygon = getHexCellPolygon(q, r, settings);
          drawPolygon(aggregation, polygon);
          aggregation.fillStyle =
            value > 0
              ? colorForValue(value, maxValue, DEFAULT_HEATMAP_PALETTE)
              : emptyFill;
          aggregation.globalAlpha =
            value > 0 ? 0.18 + 0.76 * (value / Math.max(maxValue, 1)) : 1;
          aggregation.fill();
          aggregation.globalAlpha = 1;
          aggregation.strokeStyle = stroke;
          aggregation.lineWidth = 1;
          aggregation.stroke();
        }
      }
    }

    if (showPoints) {
      pointLayer.fillStyle = isDark
        ? "rgba(248,250,252,0.88)"
        : "rgba(40,31,22,0.78)";
      points.forEach((point) => {
        pointLayer.beginPath();
        pointLayer.arc(point.x, point.y, pointRadius, 0, Math.PI * 2);
        pointLayer.fill();
      });
    }

    if (showOrigin) {
      const transformedOrigin = toCanvasSpace(
        origin,
        logicalWidth,
        orientation,
        logicalHeight,
      );
      originLayer.beginPath();
      originLayer.arc(
        transformedOrigin.x,
        transformedOrigin.y,
        4.2,
        0,
        Math.PI * 2,
      );
      originLayer.fillStyle = isDark
        ? "rgba(255,157,92,0.95)"
        : "rgba(185,93,30,0.88)";
      originLayer.fill();
      originLayer.beginPath();
      originLayer.arc(
        transformedOrigin.x,
        transformedOrigin.y,
        8.5,
        0,
        Math.PI * 2,
      );
      originLayer.strokeStyle = isDark
        ? "rgba(255,157,92,0.34)"
        : "rgba(185,93,30,0.28)";
      originLayer.lineWidth = 1.5;
      originLayer.stroke();
    }

    if (showBorder) {
      borderLayer.strokeStyle = isDark
        ? "rgba(255,255,255,0.1)"
        : "rgba(60,46,31,0.12)";
      borderLayer.lineWidth = 1;
      borderLayer.strokeRect(
        0.5,
        0.5,
        logicalWidth - 1,
        logicalHeight - 1,
      );
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
    <div
      ref={rootRef}
      style={{
        width: logicalWidth,
        height: logicalHeight,
        borderRadius: showBorder || showBackdrop ? 20 : 0,
        cursor: interactive
          ? dragRef.current
            ? "grabbing"
            : "grab"
          : "default",
        display: "block",
        overflow: "hidden",
        position: "relative",
        touchAction: "none",
        ...style,
      }}
      onPointerDown={(event) => {
        if (!interactive || !onOriginChange) return;

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
        if (!interactive || !onOriginChange || !dragRef.current) return;

        const deltaX =
          (event.clientX - dragRef.current.startX) *
          dragRef.current.pixelsToCanvasX;
        const deltaY =
          (event.clientY - dragRef.current.startY) *
          dragRef.current.pixelsToCanvasY;
        const gridDelta = canvasDeltaToGridDelta(
          deltaX,
          deltaY,
          orientation,
        );
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
    >
      {HEATMAP_CANVAS_LAYER_ORDER.map((layer) => {
        const attributes = layerAttributes?.[layer] ?? {};
        const { style: layerStyle, ...rest } = attributes;

        return (
          <canvas
            {...rest}
            key={layer}
            ref={layerRefs[layer]}
            aria-hidden="true"
            data-heatmap-layer={layer}
            width={logicalWidth}
            height={logicalHeight}
            style={{
              display: "block",
              height: "100%",
              inset: 0,
              pointerEvents: "none",
              position: "absolute",
              width: "100%",
              ...layerStyle,
            }}
          />
        );
      })}
    </div>
  );
}
