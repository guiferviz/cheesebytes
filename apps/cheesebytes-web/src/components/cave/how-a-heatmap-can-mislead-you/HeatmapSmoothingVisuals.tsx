import { useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties } from "react";

import type { VimCommand } from "../../../utils/vim-mode";
import {
  fullscreenInnerStyle,
  fullscreenRootStyle,
  useFullscreen,
} from "../shared/useFullscreen";

import { HeatmapCanvas } from "./HeatmapCanvas";
import {
  DEFAULT_HEATMAP_PALETTE,
  buildSquareMatrix,
  clamp,
  getMaxCellValue,
  getSquareCellPolygon,
  matrixToSquareCellValues,
} from "./heatmap-core";
import {
  useHeatmapArticlePoints,
  useHeatmapPointState,
} from "./heatmap-article";
import type { Origin, Point } from "./types";
import { useScopedVimMode } from "./useScopedVimMode";

const FILTER_ORIGIN: Origin = { x: 10, y: 4 };
const FILTER_CELL_SIZE = 48;
const FILTER_ORIENTATION = 0;
const GAUSSIAN_KERNEL = [
  [1, 2, 1],
  [2, 4, 2],
  [1, 2, 1],
] as const;
const CONTINUOUS_SCALE_MIN = 18;
const CONTINUOUS_SCALE_MAX = 96;
const CONTINUOUS_SCALE_STEP = 2;
const CONTINUOUS_SCALE_DEFAULT = 42;
const CONTINUOUS_HEATMAP_MIN_RASTER_SCALE = 0.38;
const CONTINUOUS_HEATMAP_TARGET_LONG_SIDE = 360;
const MARKER_MIN_DISTANCE_RATIO = 0.25;

function fullscreenCanvasStyle(
  isFullscreen: boolean,
  dimensions: { width: number; height: number },
  size = "min(40vw, 78vh, 820px)",
): CSSProperties | undefined {
  if (!isFullscreen) {
    return undefined;
  }

  const isLandscape = dimensions.width >= dimensions.height;
  const ratio = isLandscape
    ? dimensions.height / dimensions.width
    : dimensions.width / dimensions.height;

  return {
    width: isLandscape ? size : `calc(${size} * ${ratio.toFixed(4)})`,
    height: isLandscape ? `calc(${size} * ${ratio.toFixed(4)})` : size,
  };
}

function buildGaussianPreviewMatrix(matrix: number[][]) {
  const rows = matrix.length;
  const columns = matrix[0]?.length ?? 0;

  return matrix.map((row, rowIndex) =>
    row.map((_, columnIndex) => {
      let acc = 0;
      let weight = 0;

      for (let kernelRow = -1; kernelRow <= 1; kernelRow += 1) {
        for (let kernelColumn = -1; kernelColumn <= 1; kernelColumn += 1) {
          const sourceRow = rowIndex + kernelRow;
          const sourceColumn = columnIndex + kernelColumn;
          if (
            sourceRow >= 0 &&
            sourceRow < rows &&
            sourceColumn >= 0 &&
            sourceColumn < columns
          ) {
            const kernelWeight =
              GAUSSIAN_KERNEL[kernelRow + 1][kernelColumn + 1];
            acc += matrix[sourceRow][sourceColumn] * kernelWeight;
            weight += kernelWeight;
          }
        }
      }

      return weight ? acc / weight : 0;
    }),
  );
}

function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.replace("#", "");
  const full =
    clean.length === 3
      ? clean
          .split("")
          .map((digit) => digit + digit)
          .join("")
      : clean;

  return [0, 2, 4].map((index) =>
    Number.parseInt(full.slice(index, index + 2), 16),
  ) as [number, number, number];
}

const PALETTE_RGB = DEFAULT_HEATMAP_PALETTE.map(hexToRgb);

function interpolatePalette(value: number): [number, number, number] {
  const bounded = clamp(value, 0, 1);
  const scaled = bounded * (PALETTE_RGB.length - 1);
  const leftIndex = Math.floor(scaled);
  const rightIndex = Math.min(PALETTE_RGB.length - 1, leftIndex + 1);
  const blend = scaled - leftIndex;
  const left = PALETTE_RGB[leftIndex];
  const right = PALETTE_RGB[rightIndex];

  return [0, 1, 2].map((channel) =>
    Math.round(left[channel] + (right[channel] - left[channel]) * blend),
  ) as [number, number, number];
}

function useDarkModeFlag() {
  const [isDark, setIsDark] = useState(() => {
    if (typeof document === "undefined") {
      return false;
    }
    return document.documentElement.classList.contains("dark");
  });

  useEffect(() => {
    if (typeof document === "undefined") {
      return;
    }

    const update = () => {
      setIsDark(document.documentElement.classList.contains("dark"));
    };

    update();

    const observer = new MutationObserver(update);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });

    document.addEventListener("themeChanged", update as EventListener);

    return () => {
      observer.disconnect();
      document.removeEventListener("themeChanged", update as EventListener);
    };
  }, []);

  return isDark;
}

function VisualLabel({ children }: { children: string }) {
  return (
    <div
      style={{
        fontSize: "0.76rem",
        fontWeight: 800,
        letterSpacing: "0.08em",
        textTransform: "uppercase",
        color: "var(--heatmapviz-muted)",
      }}
    >
      {children}
    </div>
  );
}

function getPolygonCentroid(polygon: Point[]): Point {
  let x = 0;
  let y = 0;

  for (const point of polygon) {
    x += point.x;
    y += point.y;
  }

  return {
    x: x / polygon.length,
    y: y / polygon.length,
  };
}

function getSquareCellCenter(key: string, origin: Origin): Point | null {
  const [firstCoord, secondCoord] = key.split(",");
  const x = Number(firstCoord);
  const y = Number(secondCoord);

  if (!Number.isFinite(x) || !Number.isFinite(y)) {
    return null;
  }

  const polygon = getSquareCellPolygon(x, y, {
    gridType: "square",
    cellSize: FILTER_CELL_SIZE,
    orientation: FILTER_ORIENTATION,
    origin,
    canvasSize: 0,
  });
  return getPolygonCentroid(polygon);
}

function mergeMarkerPoints(
  existing: Point[],
  incoming: Point[],
  minDistance: number,
) {
  const merged = [...existing];
  const minDistanceSq = minDistance * minDistance;

  for (const candidate of incoming) {
    const overlaps = merged.some((point) => {
      const dx = point.x - candidate.x;
      const dy = point.y - candidate.y;
      return dx * dx + dy * dy < minDistanceSq;
    });

    if (!overlaps) {
      merged.push(candidate);
    }
  }

  return merged;
}

function MarkerOverlay({
  active,
  markers,
  canvasWidth,
  canvasHeight,
}: {
  active: boolean;
  markers: Point[];
  canvasWidth: number;
  canvasHeight: number;
}) {
  return (
    <svg
      viewBox={`0 0 ${canvasWidth} ${canvasHeight}`}
      style={{
        position: "absolute",
        inset: 0,
        width: "100%",
        height: "100%",
        pointerEvents: "none",
      }}
    >
      {active
        ? markers.map((marker, index) => (
            <g key={index} transform={`translate(${marker.x}, ${marker.y})`}>
              <path
                d="M0 0 C -8 -10 -12 -16 -12 -22 A 12 12 0 1 1 12 -22 C 12 -16 8 -10 0 0 Z"
                fill="var(--heatmapviz-accent, rgba(239, 68, 68, 0.9))"
                stroke="var(--heatmapviz-panel-bg, #fff)"
                strokeWidth={1.5}
              />
              <circle
                cx={0}
                cy={-22}
                r={4}
                fill="var(--heatmapviz-panel-bg, #fff)"
                stroke="none"
              />
            </g>
          ))
        : null}
    </svg>
  );
}

interface ContinuousHeatmapCanvasProps {
  points: Point[];
  canvasWidth: number;
  canvasHeight: number;
  scale: number;
  showPoints: boolean;
  style?: CSSProperties;
}

function ContinuousHeatmapCanvas({
  points,
  canvasWidth,
  canvasHeight,
  scale,
  showPoints,
  style,
}: ContinuousHeatmapCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const heatmapBufferRef = useRef<HTMLCanvasElement | null>(null);
  const [displaySize, setDisplaySize] = useState(() => ({
    width: canvasWidth,
    height: canvasHeight,
  }));
  const isDark = useDarkModeFlag();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }

    const updateDisplaySize = () => {
      const bounds = canvas.getBoundingClientRect();
      const width = bounds.width || canvasWidth;
      const height = bounds.height || canvasHeight;

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
  }, [canvasHeight, canvasWidth]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }

    const context = canvas.getContext("2d");
    if (!context) {
      return;
    }

    const ratio = window.devicePixelRatio || 1;
    const bufferWidth = Math.max(1, Math.round(displaySize.width * ratio));
    const bufferHeight = Math.max(1, Math.round(displaySize.height * ratio));
    canvas.width = bufferWidth;
    canvas.height = bufferHeight;
    context.setTransform(1, 0, 0, 1, 0, 0);

    const scaleX = bufferWidth / canvasWidth;
    const scaleY = bufferHeight / canvasHeight;
    const pointRenderScale = Math.min(scaleX, scaleY);
    const rasterScale = clamp(
      CONTINUOUS_HEATMAP_TARGET_LONG_SIDE / Math.max(bufferWidth, bufferHeight),
      CONTINUOUS_HEATMAP_MIN_RASTER_SCALE,
      1,
    );
    const heatmapWidth = Math.max(1, Math.round(bufferWidth * rasterScale));
    const heatmapHeight = Math.max(1, Math.round(bufferHeight * rasterScale));
    const heatmapScaleX = heatmapWidth / canvasWidth;
    const heatmapScaleY = heatmapHeight / canvasHeight;
    const heatmapRenderScale = Math.min(heatmapScaleX, heatmapScaleY);

    const heatmapBuffer =
      heatmapBufferRef.current ?? document.createElement("canvas");
    heatmapBufferRef.current = heatmapBuffer;
    heatmapBuffer.width = heatmapWidth;
    heatmapBuffer.height = heatmapHeight;
    const heatmapContext = heatmapBuffer.getContext("2d");
    if (!heatmapContext) {
      return;
    }

    context.clearRect(0, 0, bufferWidth, bufferHeight);
    heatmapContext.setTransform(1, 0, 0, 1, 0, 0);
    heatmapContext.clearRect(0, 0, heatmapWidth, heatmapHeight);

    const sigma = Math.max(scale * 0.42 * heatmapRenderScale, 1);
    const radius = Math.max(scale * 2.35 * heatmapRenderScale, 8);
    const density = new Float32Array(heatmapWidth * heatmapHeight);
    let maxDensity = 0;

    for (const point of points) {
      const renderX = point.x * heatmapScaleX;
      const renderY = point.y * heatmapScaleY;
      const minX = Math.max(0, Math.floor(renderX - radius));
      const maxX = Math.min(heatmapWidth - 1, Math.ceil(renderX + radius));
      const minY = Math.max(0, Math.floor(renderY - radius));
      const maxY = Math.min(heatmapHeight - 1, Math.ceil(renderY + radius));

      for (let y = minY; y <= maxY; y += 1) {
        for (let x = minX; x <= maxX; x += 1) {
          const dx = x - renderX;
          const dy = y - renderY;
          const distanceSquared = dx * dx + dy * dy;
          const weight = Math.exp(-distanceSquared / (2 * sigma * sigma));
          const index = y * heatmapWidth + x;
          density[index] += weight;
          if (density[index] > maxDensity) {
            maxDensity = density[index];
          }
        }
      }
    }

    const image = heatmapContext.createImageData(heatmapWidth, heatmapHeight);
    for (let index = 0; index < density.length; index += 1) {
      const normalized = maxDensity > 0 ? density[index] / maxDensity : 0;
      const alpha = Math.pow(normalized, 0.82);
      const pixelIndex = index * 4;

      if (alpha < 0.012) {
        image.data[pixelIndex + 3] = 0;
        continue;
      }

      const [red, green, blue] = interpolatePalette(alpha);
      image.data[pixelIndex] = red;
      image.data[pixelIndex + 1] = green;
      image.data[pixelIndex + 2] = blue;
      image.data[pixelIndex + 3] = Math.round(alpha * 255 * 0.94);
    }

    heatmapContext.putImageData(image, 0, 0);
    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = "medium";
    context.drawImage(
      heatmapBuffer,
      0,
      0,
      heatmapWidth,
      heatmapHeight,
      0,
      0,
      bufferWidth,
      bufferHeight,
    );

    if (showPoints) {
      context.save();
      context.fillStyle = isDark
        ? "rgba(248, 250, 252, 0.88)"
        : "rgba(40, 31, 22, 0.78)";

      for (const point of points) {
        context.beginPath();
        context.arc(
          point.x * scaleX,
          point.y * scaleY,
          2.6 * pointRenderScale,
          0,
          Math.PI * 2,
        );
        context.fill();
      }

      context.restore();
    }
  }, [
    canvasHeight,
    canvasWidth,
    displaySize.height,
    displaySize.width,
    isDark,
    points,
    scale,
    showPoints,
  ]);

  return (
    <canvas
      ref={canvasRef}
      width={canvasWidth}
      height={canvasHeight}
      style={{
        width: canvasWidth,
        height: canvasHeight,
        display: "block",
        ...style,
      }}
    />
  );
}

export function HeatmapGaussianPythonVisual() {
  const rootRef = useRef<HTMLDivElement>(null);
  const { isFullscreen, toggleFullscreen } = useFullscreen(rootRef);
  const [showPoints, setShowPoints] = useState(true);
  const [trackingActive, setTrackingActive] = useState(false);
  const [rawMarkers, setRawMarkers] = useState<Point[]>([]);
  const [smoothedMarkers, setSmoothedMarkers] = useState<Point[]>([]);
  const [origin, setOrigin] = useState(FILTER_ORIGIN);
  const { canvasWidth, canvasHeight } = useHeatmapPointState();
  const points = useHeatmapArticlePoints();
  const { matrix, range } = useMemo(
    () =>
      buildSquareMatrix(points, {
        gridType: "square",
        cellSize: FILTER_CELL_SIZE,
        orientation: FILTER_ORIENTATION,
        origin,
        canvasSize: canvasWidth,
        canvasWidth,
        canvasHeight,
      }),
    [canvasHeight, canvasWidth, origin, points],
  );

  const rawCellValues = useMemo(
    () => matrixToSquareCellValues(matrix, range),
    [matrix, range],
  );
  const smoothedCellValues = useMemo(
    () => matrixToSquareCellValues(buildGaussianPreviewMatrix(matrix), range),
    [matrix, range],
  );

  useEffect(() => {
    if (!trackingActive) {
      return;
    }

    const collectMarkers = (values: Map<string, number>) => {
      const maxValue = getMaxCellValue(values);
      if (maxValue === 0) {
        return [] as Point[];
      }

      const markers: Point[] = [];
      for (const [key, value] of values.entries()) {
        if (value !== maxValue) {
          continue;
        }

        const center = getSquareCellCenter(key, origin);
        if (center) {
          markers.push(center);
        }
      }

      return markers;
    };

    const minDistance = FILTER_CELL_SIZE * MARKER_MIN_DISTANCE_RATIO;
    setRawMarkers((current) =>
      mergeMarkerPoints(current, collectMarkers(rawCellValues), minDistance),
    );
    setSmoothedMarkers((current) =>
      mergeMarkerPoints(
        current,
        collectMarkers(smoothedCellValues),
        minDistance,
      ),
    );
  }, [origin, rawCellValues, smoothedCellValues, trackingActive]);

  const commands = useMemo<VimCommand[]>(
    () => [
      {
        key: "f",
        label: "Toggle fullscreen",
        run: toggleFullscreen,
      },
      {
        key: "m",
        label: "Toggle MAUP Tracking",
        run: () => {
          setTrackingActive((current) => {
            setRawMarkers([]);
            setSmoothedMarkers([]);
            return !current;
          });
        },
      },
      {
        key: "p",
        label: "Toggle point overlay",
        run: () => setShowPoints((current) => !current),
      },
      {
        key: "d",
        label: "Reset grid alignment",
        run: () => setOrigin(FILTER_ORIGIN),
      },
    ],
    [toggleFullscreen],
  );

  useScopedVimMode({
    rootRef,
    modeId: "heatmap-smoothing-grid",
    label: "Grid Smoothing",
    commands,
  });

  return (
    <div
      ref={rootRef}
      style={{
        ...fullscreenRootStyle(isFullscreen),
        background: "transparent",
        outline: "none",
      }}
    >
      <div style={fullscreenInnerStyle(isFullscreen, 1140)}>
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 18,
            alignItems: "start",
            justifyContent: "center",
            width: "100%",
          }}
        >
          <div style={{ display: "grid", gap: 8, justifyItems: "center" }}>
            <VisualLabel>Raw Aggregation</VisualLabel>
            <div
              style={{
                position: "relative",
                width: canvasWidth,
                height: canvasHeight,
                ...fullscreenCanvasStyle(
                  isFullscreen,
                  { width: canvasWidth, height: canvasHeight },
                  "min(38vw, 76vh, 560px)",
                ),
              }}
            >
              <HeatmapCanvas
                points={points}
                canvasWidth={canvasWidth}
                canvasHeight={canvasHeight}
                gridType="square"
                cellSize={FILTER_CELL_SIZE}
                orientation={FILTER_ORIENTATION}
                origin={origin}
                interactive={true}
                showAggregation={true}
                showBackdrop={false}
                showBorder={false}
                showOrigin={false}
                showPoints={showPoints}
                cellValues={rawCellValues}
                onOriginChange={setOrigin}
                style={{ width: "100%", height: "100%" }}
              />
              <MarkerOverlay
                active={trackingActive}
                markers={rawMarkers}
                canvasWidth={canvasWidth}
                canvasHeight={canvasHeight}
              />
            </div>
          </div>

          <div style={{ display: "grid", gap: 8, justifyItems: "center" }}>
            <VisualLabel>Neighbor-Smoothed Grid</VisualLabel>
            <div
              style={{
                position: "relative",
                width: canvasWidth,
                height: canvasHeight,
                ...fullscreenCanvasStyle(
                  isFullscreen,
                  { width: canvasWidth, height: canvasHeight },
                  "min(38vw, 76vh, 560px)",
                ),
              }}
            >
              <HeatmapCanvas
                points={points}
                canvasWidth={canvasWidth}
                canvasHeight={canvasHeight}
                gridType="square"
                cellSize={FILTER_CELL_SIZE}
                orientation={FILTER_ORIENTATION}
                origin={origin}
                interactive={true}
                showAggregation={true}
                showBackdrop={false}
                showBorder={false}
                showOrigin={false}
                showPoints={showPoints}
                cellValues={smoothedCellValues}
                onOriginChange={setOrigin}
                style={{ width: "100%", height: "100%" }}
              />
              <MarkerOverlay
                active={trackingActive}
                markers={smoothedMarkers}
                canvasWidth={canvasWidth}
                canvasHeight={canvasHeight}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function HeatmapContinuousScaleVisual() {
  const rootRef = useRef<HTMLDivElement>(null);
  const { isFullscreen, toggleFullscreen } = useFullscreen(rootRef);
  const [showPoints, setShowPoints] = useState(true);
  const [scale, setScale] = useState(CONTINUOUS_SCALE_DEFAULT);
  const { canvasWidth, canvasHeight } = useHeatmapPointState();
  const points = useHeatmapArticlePoints();
  const continuousCanvasStyle = useMemo(
    () =>
      fullscreenCanvasStyle(
        isFullscreen,
        { width: canvasWidth, height: canvasHeight },
        "min(84vmin, 980px)",
      ) ?? {
        width: canvasWidth,
        height: canvasHeight,
      },
    [canvasHeight, canvasWidth, isFullscreen],
  );

  const commands = useMemo<VimCommand[]>(
    () => [
      {
        key: "f",
        label: "Toggle fullscreen",
        run: toggleFullscreen,
      },
      {
        key: "p",
        label: "Toggle point overlay",
        run: () => setShowPoints((current) => !current),
      },
      {
        key: "-",
        label: "Narrower scale",
        run: () =>
          setScale((current) =>
            clamp(
              current - CONTINUOUS_SCALE_STEP,
              CONTINUOUS_SCALE_MIN,
              CONTINUOUS_SCALE_MAX,
            ),
          ),
      },
      {
        key: "=",
        label: "Wider scale",
        run: () =>
          setScale((current) =>
            clamp(
              current + CONTINUOUS_SCALE_STEP,
              CONTINUOUS_SCALE_MIN,
              CONTINUOUS_SCALE_MAX,
            ),
          ),
      },
      {
        key: "d",
        label: "Reset scale",
        run: () => setScale(CONTINUOUS_SCALE_DEFAULT),
      },
    ],
    [toggleFullscreen],
  );

  useScopedVimMode({
    rootRef,
    modeId: "heatmap-continuous-scale",
    label: "Continuous Heatmap",
    commands,
  });

  return (
    <div
      ref={rootRef}
      style={{
        ...fullscreenRootStyle(isFullscreen),
        background: "transparent",
        outline: "none",
      }}
    >
      <div style={fullscreenInnerStyle(isFullscreen, 860)}>
        <div
          style={{
            display: "grid",
            gap: 12,
            justifyItems: "center",
            width: "100%",
          }}
        >
          <div
            style={{
              display: "grid",
              gap: 12,
              width: continuousCanvasStyle.width ?? canvasWidth,
            }}
          >
            <label
              style={{
                display: "grid",
                gap: 6,
                width: "100%",
              }}
            >
              <span>Scale / bandwidth: {scale}px</span>
              <input
                type="range"
                min={CONTINUOUS_SCALE_MIN}
                max={CONTINUOUS_SCALE_MAX}
                step={CONTINUOUS_SCALE_STEP}
                value={scale}
                onChange={(event) => setScale(Number(event.target.value))}
              />
            </label>

            <div style={{ display: "grid", gap: 8, justifyItems: "center" }}>
              <ContinuousHeatmapCanvas
                points={points}
                canvasWidth={canvasWidth}
                canvasHeight={canvasHeight}
                scale={scale}
                showPoints={showPoints}
                style={continuousCanvasStyle}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
