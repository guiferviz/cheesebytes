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
  matrixToSquareCellValues,
} from "./heatmap-core";
import {
  useHeatmapArticlePoints,
  useHeatmapPointState,
} from "./heatmap-article";
import {
  HeatmapHudButton,
  HeatmapMetaText,
  HeatmapPanelLabel,
  HeatmapVisualCard,
} from "./shared";
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
const MINIMAL_BUTTON_STYLE = {
  borderRadius: 0,
  border: "1px solid var(--heatmapviz-panel-edge)",
  boxShadow: "none",
} as const;

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
  const isDark = useDarkModeFlag();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }

    const context = canvas.getContext("2d");
    if (!context) {
      return;
    }

    context.clearRect(0, 0, canvasWidth, canvasHeight);
    context.fillStyle = isDark
      ? "rgba(15, 23, 42, 0.2)"
      : "rgba(255, 255, 255, 0.82)";
    context.fillRect(0, 0, canvasWidth, canvasHeight);

    const sigma = Math.max(scale * 0.42, 1);
    const radius = Math.max(scale * 2.35, 8);
    const density = new Float32Array(canvasWidth * canvasHeight);
    let maxDensity = 0;

    for (const point of points) {
      const minX = Math.max(0, Math.floor(point.x - radius));
      const maxX = Math.min(canvasWidth - 1, Math.ceil(point.x + radius));
      const minY = Math.max(0, Math.floor(point.y - radius));
      const maxY = Math.min(canvasHeight - 1, Math.ceil(point.y + radius));

      for (let y = minY; y <= maxY; y += 1) {
        for (let x = minX; x <= maxX; x += 1) {
          const dx = x - point.x;
          const dy = y - point.y;
          const distanceSquared = dx * dx + dy * dy;
          const weight = Math.exp(-distanceSquared / (2 * sigma * sigma));
          const index = y * canvasWidth + x;
          density[index] += weight;
          if (density[index] > maxDensity) {
            maxDensity = density[index];
          }
        }
      }
    }

    const image = context.createImageData(canvasWidth, canvasHeight);
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

    context.putImageData(image, 0, 0);

    if (showPoints) {
      context.save();
      context.fillStyle = isDark
        ? "rgba(241, 245, 249, 0.92)"
        : "rgba(28, 25, 23, 0.72)";
      context.strokeStyle = isDark
        ? "rgba(15, 23, 42, 0.85)"
        : "rgba(255, 255, 255, 0.85)";
      context.lineWidth = 1.2;

      for (const point of points) {
        context.beginPath();
        context.arc(point.x, point.y, 3.2, 0, Math.PI * 2);
        context.fill();
        context.stroke();
      }

      context.restore();
    }
  }, [canvasHeight, canvasWidth, isDark, points, scale, showPoints]);

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
        <HeatmapVisualCard>
          <div style={{ display: "grid", gap: 12 }}>
            <div style={{ display: "grid", gap: 8 }}>
              <HeatmapPanelLabel>Neighbor Smoothing</HeatmapPanelLabel>
              <HeatmapMetaText>
                Drag either map. The left panel shows raw cell counts. The right
                panel replaces each cell with a weighted mix of its neighbors,
                so the current cell still matters most but nearby cells also
                contribute.
              </HeatmapMetaText>
            </div>

            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              <HeatmapHudButton
                onClick={() => setShowPoints((current) => !current)}
                style={MINIMAL_BUTTON_STYLE}
              >
                {showPoints ? "Hide points" : "Show points"}
              </HeatmapHudButton>
              <HeatmapHudButton
                onClick={() => setOrigin(FILTER_ORIGIN)}
                style={MINIMAL_BUTTON_STYLE}
              >
                Reset grid
              </HeatmapHudButton>
            </div>

            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: 18,
                alignItems: "start",
                justifyContent: "center",
              }}
            >
              <div style={{ display: "grid", gap: 8, justifyItems: "center" }}>
                <VisualLabel>Raw Aggregation</VisualLabel>
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
                  style={fullscreenCanvasStyle(
                    isFullscreen,
                    { width: canvasWidth, height: canvasHeight },
                    "min(38vw, 76vh, 560px)",
                  )}
                />
              </div>

              <div style={{ display: "grid", gap: 8, justifyItems: "center" }}>
                <VisualLabel>Neighbor-Smoothed Grid</VisualLabel>
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
                  style={fullscreenCanvasStyle(
                    isFullscreen,
                    { width: canvasWidth, height: canvasHeight },
                    "min(38vw, 76vh, 560px)",
                  )}
                />
              </div>
            </div>
          </div>
        </HeatmapVisualCard>
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
        <HeatmapVisualCard>
          <div style={{ display: "grid", gap: 14 }}>
            <div style={{ display: "grid", gap: 8 }}>
              <HeatmapPanelLabel>Continuous Heatmap</HeatmapPanelLabel>
              <HeatmapMetaText>
                Remove the visible cell borders and the map starts looking more
                continuous, but the analysis still depends on a choice: the
                smoothing scale. Smaller values keep sharp local bumps. Larger
                values merge them into broader regions.
              </HeatmapMetaText>
            </div>

            <div style={{ display: "grid", gap: 8 }}>
              <label style={{ display: "grid", gap: 6 }}>
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

              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                <HeatmapHudButton
                  onClick={() => setShowPoints((current) => !current)}
                  style={MINIMAL_BUTTON_STYLE}
                >
                  {showPoints ? "Hide points" : "Show points"}
                </HeatmapHudButton>
              </div>
            </div>

            <div style={{ display: "grid", gap: 8, justifyItems: "center" }}>
              <ContinuousHeatmapCanvas
                points={points}
                canvasWidth={canvasWidth}
                canvasHeight={canvasHeight}
                scale={scale}
                showPoints={showPoints}
                style={fullscreenCanvasStyle(
                  isFullscreen,
                  { width: canvasWidth, height: canvasHeight },
                  "min(58vw, 78vh, 760px)",
                )}
              />
            </div>
          </div>
        </HeatmapVisualCard>
      </div>
    </div>
  );
}
