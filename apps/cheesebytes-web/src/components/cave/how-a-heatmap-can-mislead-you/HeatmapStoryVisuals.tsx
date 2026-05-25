import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties, PointerEvent as ReactPointerEvent } from "react";

import type { VimCommand, VimModeAPI } from "../../../utils/vim-mode";
import {
  fullscreenInnerStyle,
  fullscreenRootStyle,
  useFullscreen,
} from "../shared/useFullscreen";

import { HeatmapCanvas } from "./HeatmapCanvas";
import {
  DEFAULT_HEATMAP_CANVAS_HEIGHT,
  DEFAULT_HEATMAP_CANVAS_WIDTH,
  DEFAULT_HEATMAP_POINT_COUNT,
  DEFAULT_HEATMAP_POINT_DISTRIBUTION,
  DEFAULT_HEATMAP_POINT_SEED,
  HEATMAP_CANVAS_DIMENSION_STEP,
  HEATMAP_POINT_COUNT_MAX,
  HEATMAP_POINT_COUNT_MIN,
  HEATMAP_POINT_COUNT_STEP,
  incrementHeatmapCanvasDimension,
  incrementHeatmapPointCount,
  setHeatmapPointState,
  setHeatmapSeed,
  useHeatmapArticlePoints,
  useHeatmapPointState,
} from "./heatmap-article";
import {
  colorForValue,
  DEFAULT_HEATMAP_PALETTE,
  nudgeOrigin,
  getGridCellValues,
  getMaxCellValue,
  getSquareCellPolygon,
  getTriangleCellPolygon,
  getHexCellPolygon,
  getPostcodeCells,
} from "./heatmap-core";
import { HeatmapHudButton } from "./shared";
import type {
  GridType,
  Origin,
  Point,
  HeatmapSettings,
  PostcodeSubdivisionLevel,
} from "./types";
import { useScopedVimMode } from "./useScopedVimMode";

function getPolygonCentroid(polygon: Point[]): Point {
  let x = 0,
    y = 0;
  for (const p of polygon) {
    x += p.x;
    y += p.y;
  }
  return { x: x / polygon.length, y: y / polygon.length };
}

function getCenterForCell(
  key: string,
  settings: HeatmapSettings,
): Point | null {
  if (settings.gridType === "postcode") {
    const cells = getPostcodeCells(settings);
    const cell = cells.find((candidate) => candidate.key === key);
    return cell ? getPolygonCentroid(cell.polygon) : null;
  }

  const [firstCoord, secondCoord] = key.split(",");
  const x = Number(firstCoord);
  const y = Number(secondCoord);

  if (!Number.isFinite(x) || !Number.isFinite(y)) {
    return null;
  }

  if (settings.gridType === "square") {
    const polygon = getSquareCellPolygon(x, y, settings);
    return getPolygonCentroid(polygon);
  }
  if (settings.gridType === "triangle") {
    const polygon = getTriangleCellPolygon(x, y, settings);
    return getPolygonCentroid(polygon);
  }

  const polygon = getHexCellPolygon(x, y, settings);
  return getPolygonCentroid(polygon);

  return null;
}

interface PartitionStroke {
  id: number;
  points: Point[];
}

interface PartitionRegionOverlay {
  id: number;
  centroid: Point;
  cells: Array<{ col: number; row: number }>;
  fill: string;
  fillOpacity: number;
  pixelCount: number;
  pointCount: number;
}

interface PartitionLayout {
  cellSize: number;
  cols: number;
  rows: number;
  regions: PartitionRegionOverlay[];
}

const PARTITION_POINT_STEP = 4;
const PARTITION_RASTER_CELL_SIZE = 2;
const PARTITION_MIN_SPAN = 10;
const PARTITION_SNAP_DISTANCE = 14;
const PARTITION_STROKE_COLOR = "rgba(250, 204, 21, 0.96)";
const PARTITION_STROKE_WIDTH = 5;

function distanceSquared(left: Point, right: Point) {
  const deltaX = left.x - right.x;
  const deltaY = left.y - right.y;
  return deltaX * deltaX + deltaY * deltaY;
}

function appendPartitionPoint(points: Point[], nextPoint: Point) {
  if (points.length === 0) {
    return [nextPoint];
  }

  const lastPoint = points[points.length - 1];
  if (
    distanceSquared(lastPoint, nextPoint) <
    PARTITION_POINT_STEP * PARTITION_POINT_STEP
  ) {
    return points;
  }

  return [...points, nextPoint];
}

function polylinePath(points: Point[]) {
  if (points.length === 0) {
    return "";
  }

  const [firstPoint, ...rest] = points;
  return [
    `M ${firstPoint.x.toFixed(1)} ${firstPoint.y.toFixed(1)}`,
    ...rest.map((point) => `L ${point.x.toFixed(1)} ${point.y.toFixed(1)}`),
  ]
    .join(" ")
    .trim();
}

function projectPointToSegment(point: Point, start: Point, end: Point): Point {
  const deltaX = end.x - start.x;
  const deltaY = end.y - start.y;
  const lengthSquared = deltaX * deltaX + deltaY * deltaY;

  if (lengthSquared === 0) {
    return start;
  }

  const t = Math.max(
    0,
    Math.min(
      1,
      ((point.x - start.x) * deltaX + (point.y - start.y) * deltaY) /
        lengthSquared,
    ),
  );

  return {
    x: start.x + deltaX * t,
    y: start.y + deltaY * t,
  };
}

function snapPointToExistingEdge(
  point: Point,
  canvasWidth: number,
  canvasHeight: number,
  strokes: PartitionStroke[],
): Point {
  const clampedPoint = {
    x: Math.max(0, Math.min(canvasWidth, point.x)),
    y: Math.max(0, Math.min(canvasHeight, point.y)),
  };

  const candidates: Array<{ distance: number; point: Point }> = [
    { distance: clampedPoint.x, point: { x: 0, y: clampedPoint.y } },
    {
      distance: Math.abs(canvasWidth - clampedPoint.x),
      point: { x: canvasWidth, y: clampedPoint.y },
    },
    { distance: clampedPoint.y, point: { x: clampedPoint.x, y: 0 } },
    {
      distance: Math.abs(canvasHeight - clampedPoint.y),
      point: { x: clampedPoint.x, y: canvasHeight },
    },
  ];

  for (const stroke of strokes) {
    for (let index = 1; index < stroke.points.length; index += 1) {
      const snappedPoint = projectPointToSegment(
        clampedPoint,
        stroke.points[index - 1],
        stroke.points[index],
      );
      candidates.push({
        distance: Math.sqrt(distanceSquared(clampedPoint, snappedPoint)),
        point: snappedPoint,
      });
    }
  }

  const closest = candidates.reduce((best, candidate) =>
    candidate.distance < best.distance ? candidate : best,
  );

  return closest.distance <= PARTITION_SNAP_DISTANCE
    ? closest.point
    : clampedPoint;
}

function clientPointToCanvasPoint(
  element: SVGSVGElement,
  clientX: number,
  clientY: number,
  canvasWidth: number,
  canvasHeight: number,
): Point {
  const bounds = element.getBoundingClientRect();
  const pixelsToCanvasX = bounds.width > 0 ? canvasWidth / bounds.width : 1;
  const pixelsToCanvasY = bounds.height > 0 ? canvasHeight / bounds.height : 1;

  return {
    x: Math.max(
      0,
      Math.min(canvasWidth, (clientX - bounds.left) * pixelsToCanvasX),
    ),
    y: Math.max(
      0,
      Math.min(canvasHeight, (clientY - bounds.top) * pixelsToCanvasY),
    ),
  };
}

function findRegionIdNearCell(
  regionIds: Int32Array,
  cols: number,
  rows: number,
  startCol: number,
  startRow: number,
) {
  const indexFor = (col: number, row: number) => row * cols + col;
  const initialIndex = indexFor(startCol, startRow);
  if (regionIds[initialIndex] >= 0) {
    return regionIds[initialIndex];
  }

  for (let radius = 1; radius <= 3; radius += 1) {
    for (let row = startRow - radius; row <= startRow + radius; row += 1) {
      for (let col = startCol - radius; col <= startCol + radius; col += 1) {
        if (
          col < 0 ||
          row < 0 ||
          col >= cols ||
          row >= rows ||
          (Math.abs(col - startCol) !== radius &&
            Math.abs(row - startRow) !== radius)
        ) {
          continue;
        }

        const regionId = regionIds[indexFor(col, row)];
        if (regionId >= 0) {
          return regionId;
        }
      }
    }
  }

  return -1;
}

function buildPartitionLayout(
  strokes: PartitionStroke[],
  points: Point[],
  canvasWidth: number,
  canvasHeight: number,
): PartitionLayout {
  const cellSize = PARTITION_RASTER_CELL_SIZE;
  const cols = Math.max(1, Math.ceil(canvasWidth / cellSize));
  const rows = Math.max(1, Math.ceil(canvasHeight / cellSize));

  if (strokes.length === 0 || typeof document === "undefined") {
    return { cellSize, cols, rows, regions: [] };
  }

  const raster = document.createElement("canvas");
  raster.width = cols;
  raster.height = rows;

  const ctx = raster.getContext("2d");
  if (!ctx) {
    return { cellSize, cols, rows, regions: [] };
  }

  const scaleX = cols / canvasWidth;
  const scaleY = rows / canvasHeight;
  ctx.clearRect(0, 0, cols, rows);
  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = Math.max(1, 3 / cellSize);
  ctx.lineJoin = "round";
  ctx.lineCap = "round";

  for (const stroke of strokes) {
    ctx.beginPath();
    stroke.points.forEach((point, index) => {
      const x = point.x * scaleX;
      const y = point.y * scaleY;
      if (index === 0) {
        ctx.moveTo(x, y);
        return;
      }
      ctx.lineTo(x, y);
    });
    ctx.stroke();
  }

  const imageData = ctx.getImageData(0, 0, cols, rows).data;
  const blocked = new Uint8Array(cols * rows);
  for (let index = 0; index < cols * rows; index += 1) {
    blocked[index] = imageData[index * 4 + 3] > 0 ? 1 : 0;
  }

  const regionIds = new Int32Array(cols * rows).fill(-1);
  const regions: Array<{
    id: number;
    centroid: Point;
    cells: Array<{ col: number; row: number }>;
    pixelCount: number;
  }> = [];
  const queue: Array<{ col: number; row: number }> = [];
  const indexFor = (col: number, row: number) => row * cols + col;

  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      const originIndex = indexFor(col, row);
      if (blocked[originIndex] || regionIds[originIndex] >= 0) {
        continue;
      }

      const regionId = regions.length;
      let queueIndex = 0;
      let sumX = 0;
      let sumY = 0;
      const cells: Array<{ col: number; row: number }> = [];

      queue.length = 0;
      queue.push({ col, row });
      regionIds[originIndex] = regionId;

      while (queueIndex < queue.length) {
        const current = queue[queueIndex];
        queueIndex += 1;

        cells.push(current);
        sumX += Math.min(canvasWidth, current.col * cellSize + cellSize / 2);
        sumY += Math.min(canvasHeight, current.row * cellSize + cellSize / 2);

        for (const [deltaCol, deltaRow] of [
          [1, 0],
          [-1, 0],
          [0, 1],
          [0, -1],
        ] as const) {
          const nextCol = current.col + deltaCol;
          const nextRow = current.row + deltaRow;
          if (
            nextCol < 0 ||
            nextRow < 0 ||
            nextCol >= cols ||
            nextRow >= rows
          ) {
            continue;
          }

          const nextIndex = indexFor(nextCol, nextRow);
          if (blocked[nextIndex] || regionIds[nextIndex] >= 0) {
            continue;
          }

          regionIds[nextIndex] = regionId;
          queue.push({ col: nextCol, row: nextRow });
        }
      }

      regions.push({
        id: regionId,
        centroid: {
          x: sumX / cells.length,
          y: sumY / cells.length,
        },
        cells,
        pixelCount: cells.length,
      });
    }
  }

  const pointCounts = new Array(regions.length).fill(0);
  for (const point of points) {
    const col = Math.max(0, Math.min(cols - 1, Math.floor(point.x / cellSize)));
    const row = Math.max(0, Math.min(rows - 1, Math.floor(point.y / cellSize)));
    const regionId = findRegionIdNearCell(regionIds, cols, rows, col, row);
    if (regionId >= 0) {
      pointCounts[regionId] += 1;
    }
  }

  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      const cellIndex = indexFor(col, row);
      if (!blocked[cellIndex]) {
        continue;
      }

      const regionId = findRegionIdNearCell(regionIds, cols, rows, col, row);
      if (regionId < 0) {
        continue;
      }

      regions[regionId].cells.push({ col, row });
      regions[regionId].pixelCount += 1;
    }
  }

  const maxPointCount = Math.max(0, ...pointCounts);

  return {
    cellSize,
    cols,
    rows,
    regions: regions.map((region) => {
      const pointCount = pointCounts[region.id] ?? 0;
      return {
        ...region,
        pointCount,
        fill: colorForValue(pointCount, maxPointCount, DEFAULT_HEATMAP_PALETTE),
        fillOpacity:
          pointCount > 0
            ? 0.18 + 0.76 * (pointCount / Math.max(maxPointCount, 1))
            : 0,
      };
    }),
  };
}

const EXPLORER_GRIDS: readonly GridType[] = [
  "square",
  "triangle",
  "hex",
  "postcode",
];

const STORY_CANVAS_SIZE = DEFAULT_HEATMAP_CANVAS_WIDTH;
const STORY_ORIGIN: Origin = { x: 0, y: 4 };
const STORY_SHIFTED_ORIGIN: Origin = { x: 40, y: 35 };
const SEED_DIGIT_KEYS = [
  "1",
  "2",
  "3",
  "4",
  "5",
  "6",
  "7",
  "8",
  "9",
  "0",
] as const;

const MINIMAL_BUTTON_STYLE = {
  borderRadius: 0,
  border: "1px solid var(--heatmapviz-panel-edge)",
  boxShadow: "none",
} as const;
const CONTROLS_BUTTON_STYLE = {
  ...MINIMAL_BUTTON_STYLE,
  marginLeft: 12,
  borderStyle: "dashed",
  background: "var(--heatmapviz-accent-soft)",
  color: "var(--heatmapviz-accent)",
} as const;

function fullscreenCanvasStyle(
  isFullscreen: boolean,
  dimensions: { width: number; height: number },
  size = "min(86vmin, 980px)",
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

function getVimMode(): VimModeAPI | null {
  if (typeof window === "undefined") {
    return null;
  }
  return (window as Window & { vimMode?: VimModeAPI }).vimMode ?? null;
}

function pushSeedDigitPending(
  applySeed: (nextSeed: number) => void,
  seedText: string,
) {
  const vimMode = getVimMode();
  if (!vimMode) {
    return;
  }

  vimMode.pushPending({
    id: "heatmap-point-cloud-seed",
    label: seedText ? `Seed ${seedText}` : "Seed",
    inherit: false,
    timeout: 1600,
    commands: SEED_DIGIT_KEYS.map((digit) => {
      const nextSeedText = `${seedText}${digit}`.replace(/^0+(?=\d)/, "");
      const nextSeed = Number(nextSeedText);
      return {
        key: digit,
        label: `Seed ${nextSeed}`,
        run: () => {
          applySeed(nextSeed);
          pushSeedDigitPending(applySeed, nextSeedText);
        },
      };
    }),
  });
}

function StaticVisualShell({
  title,
  children,
  modeId,
  normalMaxWidth = 980,
}: {
  title: string;
  children: React.ReactNode | ((isFullscreen: boolean) => React.ReactNode);
  modeId: string;
  normalMaxWidth?: number;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const { isFullscreen, toggleFullscreen } = useFullscreen(rootRef);
  const commands = useMemo<VimCommand[]>(
    () => [
      {
        key: "f",
        label: "Toggle fullscreen",
        run: toggleFullscreen,
      },
    ],
    [toggleFullscreen],
  );
  useScopedVimMode({
    rootRef,
    modeId,
    label: title,
    commands,
  });

  return (
    <div
      ref={rootRef}
      aria-label={title}
      style={{
        ...fullscreenRootStyle(isFullscreen),
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "transparent",
        outline: "none",
      }}
    >
      <div
        style={{
          ...fullscreenInnerStyle(isFullscreen, normalMaxWidth),
          display: "flex",
          justifyContent: "center",
        }}
      >
        {typeof children === "function" ? children(isFullscreen) : children}
      </div>
    </div>
  );
}

interface HeatmapPointCloudVisualProps {
  seed?: number;
  pointCount?: number;
}

export function HeatmapPointCloudVisual({
  seed = DEFAULT_HEATMAP_POINT_SEED,
  pointCount = DEFAULT_HEATMAP_POINT_COUNT,
}: HeatmapPointCloudVisualProps = {}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const { isFullscreen, toggleFullscreen } = useFullscreen(rootRef);
  const { canvasWidth, canvasHeight } = useHeatmapPointState();

  useEffect(() => {
    setHeatmapPointState({
      pointCount,
      seed,
      pointDistribution: DEFAULT_HEATMAP_POINT_DISTRIBUTION,
    });
  }, [pointCount, seed]);

  const points = useHeatmapArticlePoints();

  const startSeedCommand = useCallback(() => {
    pushSeedDigitPending(setHeatmapSeed, "");
  }, []);
  const resetPointCloud = useCallback(() => {
    setHeatmapPointState({
      pointCount,
      seed,
      canvasWidth: DEFAULT_HEATMAP_CANVAS_WIDTH,
      canvasHeight: DEFAULT_HEATMAP_CANVAS_HEIGHT,
      pointDistribution: DEFAULT_HEATMAP_POINT_DISTRIBUTION,
    });
  }, [pointCount, seed]);
  const pointCloudCanvasStyle = useMemo<CSSProperties>(() => {
    return (
      fullscreenCanvasStyle(
        isFullscreen,
        { width: canvasWidth, height: canvasHeight },
        "min(82vmin, 900px)",
      ) ?? {}
    );
  }, [canvasHeight, canvasWidth, isFullscreen]);

  const commands = useMemo<VimCommand[]>(
    () => [
      {
        key: "f",
        label: "Toggle fullscreen",
        run: toggleFullscreen,
      },
      {
        key: "s",
        label: "Set seed",
        run: startSeedCommand,
      },
      {
        key: "0",
        label: "Uniform random points",
        run: () => setHeatmapPointState({ pointDistribution: "uniform" }),
      },
      {
        key: "1",
        label: "Single hotspot",
        run: () =>
          setHeatmapPointState({ pointDistribution: "single-hotspot" }),
      },
      {
        key: "2",
        label: "Two hotspots",
        run: () =>
          setHeatmapPointState({ pointDistribution: "double-hotspot" }),
      },
      {
        key: "-",
        label: "Fewer points",
        run: () => incrementHeatmapPointCount(-HEATMAP_POINT_COUNT_STEP),
      },
      {
        key: "=",
        label: "More points",
        run: () => incrementHeatmapPointCount(HEATMAP_POINT_COUNT_STEP),
      },
      {
        key: "arrowup",
        label: "Increase height",
        run: () =>
          incrementHeatmapCanvasDimension(
            "canvasHeight",
            HEATMAP_CANVAS_DIMENSION_STEP,
          ),
      },
      {
        key: "arrowdown",
        label: "Decrease height",
        run: () =>
          incrementHeatmapCanvasDimension(
            "canvasHeight",
            -HEATMAP_CANVAS_DIMENSION_STEP,
          ),
      },
      {
        key: "arrowright",
        label: "Increase width",
        run: () =>
          incrementHeatmapCanvasDimension(
            "canvasWidth",
            HEATMAP_CANVAS_DIMENSION_STEP,
          ),
      },
      {
        key: "arrowleft",
        label: "Decrease width",
        run: () =>
          incrementHeatmapCanvasDimension(
            "canvasWidth",
            -HEATMAP_CANVAS_DIMENSION_STEP,
          ),
      },
      {
        key: "d",
        label: "Reset defaults",
        run: resetPointCloud,
      },
    ],
    [resetPointCloud, startSeedCommand, toggleFullscreen],
  );

  useScopedVimMode({
    rootRef,
    modeId: "heatmap-point-cloud",
    label: "Point Cloud",
    commands,
  });

  return (
    <div
      ref={rootRef}
      aria-label="Point cloud visualization"
      style={{
        ...fullscreenRootStyle(isFullscreen),
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: isFullscreen ? "transparent" : undefined,
        outline: "none",
      }}
    >
      <div
        style={{
          ...fullscreenInnerStyle(
            isFullscreen,
            Math.max(STORY_CANVAS_SIZE, canvasWidth),
          ),
          display: "flex",
          justifyContent: "center",
        }}
      >
        <HeatmapCanvas
          points={points}
          canvasWidth={canvasWidth}
          canvasHeight={canvasHeight}
          gridType="square"
          cellSize={48}
          orientation={0}
          origin={STORY_ORIGIN}
          showAggregation={false}
          showBackdrop={false}
          showBorder={false}
          showOrigin={false}
          showPoints={true}
          style={pointCloudCanvasStyle}
        />
      </div>
    </div>
  );
}

export function HeatmapAggregationVisual() {
  const { canvasWidth, canvasHeight } = useHeatmapPointState();
  const points = useHeatmapArticlePoints();

  return (
    <StaticVisualShell
      title="A grid turns dots into a choropleth story"
      modeId="heatmap-aggregation"
    >
      {(isFullscreen) => (
        <HeatmapCanvas
          points={points}
          canvasWidth={canvasWidth}
          canvasHeight={canvasHeight}
          gridType="square"
          cellSize={48}
          orientation={0}
          origin={STORY_ORIGIN}
          showAggregation={true}
          showBackdrop={false}
          showBorder={false}
          showOrigin={false}
          showPoints={true}
          style={fullscreenCanvasStyle(isFullscreen, {
            width: canvasWidth,
            height: canvasHeight,
          })}
        />
      )}
    </StaticVisualShell>
  );
}

export function HeatmapShiftComparisonVisual() {
  const { canvasWidth, canvasHeight } = useHeatmapPointState();
  const points = useHeatmapArticlePoints();

  return (
    <StaticVisualShell
      title="Move the grid and the hot spots move with it"
      modeId="heatmap-shift-comparison"
      normalMaxWidth={Math.max(1280, canvasWidth * 2 + 64)}
    >
      {(isFullscreen) => (
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: isFullscreen ? 80 : 80,
            justifyContent: "center",
          }}
        >
          {[
            { label: "Grid A", origin: STORY_ORIGIN },
            { label: "Grid B", origin: STORY_SHIFTED_ORIGIN },
          ].map(({ label, origin }) => (
            <div
              key={label}
              style={{
                display: "grid",
                justifyItems: "center",
              }}
              aria-label={label}
            >
              <HeatmapCanvas
                points={points}
                canvasWidth={canvasWidth}
                canvasHeight={canvasHeight}
                gridType="square"
                cellSize={48}
                orientation={0}
                origin={origin}
                showAggregation={true}
                showBackdrop={false}
                showBorder={false}
                showOrigin={false}
                showPoints={true}
                style={fullscreenCanvasStyle(
                  isFullscreen,
                  { width: canvasWidth, height: canvasHeight },
                  "min(42vw, 78vh, 720px)",
                )}
              />
            </div>
          ))}
        </div>
      )}
    </StaticVisualShell>
  );
}

export function HeatmapExplorerVisual() {
  const rootRef = useRef<HTMLDivElement>(null);
  const { isFullscreen, toggleFullscreen } = useFullscreen(rootRef);
  const [gridType, setGridType] = useState<GridType>("square");
  const [postcodeSubdivisionLevel, setPostcodeSubdivisionLevel] =
    useState<PostcodeSubdivisionLevel>(0);
  const [cellSize, setCellSize] = useState(48);
  const [orientation, setOrientation] = useState(0);
  const { pointCount, seed, canvasWidth, canvasHeight } =
    useHeatmapPointState();
  const [showPoints, setShowPoints] = useState(true);
  const [showControls, setShowControls] = useState(false);
  const [origin, setOrigin] = useState<Origin>(() => ({ ...STORY_ORIGIN }));
  const [partitionMode, setPartitionMode] = useState(false);
  const [partitionStrokes, setPartitionStrokes] = useState<PartitionStroke[]>(
    [],
  );
  const [draftPartitionPoints, setDraftPartitionPoints] = useState<Point[]>([]);
  const [isPartitionDrawing, setIsPartitionDrawing] = useState(false);
  const controlsVisible = !isFullscreen && showControls;

  const [trackingActive, setTrackingActive] = useState(false);
  const [markers, setMarkers] = useState<Point[]>([]);
  const partitionDraftPointsRef = useRef<Point[]>([]);
  const partitionPointerIdRef = useRef<number | null>(null);
  const nextPartitionStrokeIdRef = useRef(1);

  const points = useHeatmapArticlePoints();

  useEffect(() => {
    partitionDraftPointsRef.current = draftPartitionPoints;
  }, [draftPartitionPoints]);

  const partitionLayout = useMemo(
    () =>
      buildPartitionLayout(partitionStrokes, points, canvasWidth, canvasHeight),
    [canvasHeight, canvasWidth, partitionStrokes, points],
  );

  const resetPartitionDraft = useCallback(() => {
    partitionPointerIdRef.current = null;
    setIsPartitionDrawing(false);
    setDraftPartitionPoints([]);
  }, []);

  const commitPartitionStroke = useCallback(
    (strokePoints: Point[]) => {
      if (strokePoints.length < 2) {
        resetPartitionDraft();
        return;
      }

      const startPoint = snapPointToExistingEdge(
        strokePoints[0],
        canvasWidth,
        canvasHeight,
        partitionStrokes,
      );
      const endPoint = snapPointToExistingEdge(
        strokePoints[strokePoints.length - 1],
        canvasWidth,
        canvasHeight,
        partitionStrokes,
      );

      if (
        distanceSquared(startPoint, endPoint) <
        PARTITION_MIN_SPAN * PARTITION_MIN_SPAN
      ) {
        resetPartitionDraft();
        return;
      }

      const normalizedPoints = [
        startPoint,
        ...strokePoints.slice(1, -1),
        endPoint,
      ].reduce<Point[]>(
        (current, point) => appendPartitionPoint(current, point),
        [],
      );

      if (normalizedPoints.length < 2) {
        resetPartitionDraft();
        return;
      }

      setPartitionStrokes((current) => [
        ...current,
        {
          id: nextPartitionStrokeIdRef.current++,
          points: normalizedPoints,
        },
      ]);
      resetPartitionDraft();
    },
    [canvasHeight, canvasWidth, partitionStrokes, resetPartitionDraft],
  );

  const closePartitionStroke = useCallback(() => {
    commitPartitionStroke(partitionDraftPointsRef.current);
  }, [commitPartitionStroke]);

  const undoPartitionStroke = useCallback(() => {
    if (partitionDraftPointsRef.current.length > 0) {
      resetPartitionDraft();
      return;
    }

    setPartitionStrokes((current) => current.slice(0, -1));
  }, [resetPartitionDraft]);

  const togglePartitionMode = useCallback(() => {
    partitionPointerIdRef.current = null;
    setIsPartitionDrawing(false);
    setDraftPartitionPoints([]);
    setPartitionStrokes([]);
    setPartitionMode((current) => !current);
  }, []);

  const handlePartitionPointerDown = useCallback(
    (event: ReactPointerEvent<SVGSVGElement>) => {
      if (!partitionMode) {
        return;
      }

      event.preventDefault();
      const startPoint = snapPointToExistingEdge(
        clientPointToCanvasPoint(
          event.currentTarget,
          event.clientX,
          event.clientY,
          canvasWidth,
          canvasHeight,
        ),
        canvasWidth,
        canvasHeight,
        partitionStrokes,
      );

      partitionPointerIdRef.current = event.pointerId;
      setIsPartitionDrawing(true);
      setDraftPartitionPoints([startPoint]);
      event.currentTarget.setPointerCapture(event.pointerId);
    },
    [canvasHeight, canvasWidth, partitionMode, partitionStrokes],
  );

  const handlePartitionPointerMove = useCallback(
    (event: ReactPointerEvent<SVGSVGElement>) => {
      if (
        !partitionMode ||
        partitionPointerIdRef.current === null ||
        partitionPointerIdRef.current !== event.pointerId
      ) {
        return;
      }

      event.preventDefault();
      const nextPoint = snapPointToExistingEdge(
        clientPointToCanvasPoint(
          event.currentTarget,
          event.clientX,
          event.clientY,
          canvasWidth,
          canvasHeight,
        ),
        canvasWidth,
        canvasHeight,
        partitionStrokes,
      );
      setDraftPartitionPoints((current) =>
        appendPartitionPoint(current, nextPoint),
      );
    },
    [canvasHeight, canvasWidth, partitionMode, partitionStrokes],
  );

  const handlePartitionPointerUp = useCallback(
    (event: ReactPointerEvent<SVGSVGElement>) => {
      if (partitionPointerIdRef.current !== event.pointerId) {
        return;
      }

      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId);
      }

      partitionPointerIdRef.current = null;
      setIsPartitionDrawing(false);
      commitPartitionStroke(partitionDraftPointsRef.current);
    },
    [commitPartitionStroke],
  );

  const handlePartitionPointerCancel = useCallback(() => {
    resetPartitionDraft();
  }, [resetPartitionDraft]);

  useEffect(() => {
    if (!trackingActive || partitionMode) return;
    const settings: HeatmapSettings = {
      gridType,
      cellSize,
      orientation,
      origin,
      canvasSize: Math.max(canvasWidth, canvasHeight),
      canvasWidth,
      canvasHeight,
      postcodeSubdivisionLevel,
    };
    const values = getGridCellValues(points, settings);
    const maxValue = getMaxCellValue(values);
    if (maxValue === 0) return;

    const newMarkers: Point[] = [];
    for (const [key, value] of values.entries()) {
      if (value === maxValue) {
        const center = getCenterForCell(key, settings);
        if (center) newMarkers.push(center);
      }
    }

    if (newMarkers.length > 0) {
      setMarkers((prev) => {
        const added = [...prev];
        // Porcentaje de solapamiento permitido (0.25 = 25% del tamaño de la celda)
        // Puedes cambiar este valor al porcentaje que prefieras para evitar saturar el mapa.
        const MIN_DISTANCE_RATIO = 0.25;
        const minDistanceSq =
          cellSize * MIN_DISTANCE_RATIO * (cellSize * MIN_DISTANCE_RATIO);

        for (const nm of newMarkers) {
          const isTooClose = added.some((m) => {
            const dx = m.x - nm.x;
            const dy = m.y - nm.y;
            return dx * dx + dy * dy < minDistanceSq;
          });
          if (!isTooClose) {
            added.push(nm);
          }
        }
        return added;
      });
    }
  }, [
    trackingActive,
    gridType,
    cellSize,
    orientation,
    origin,
    canvasWidth,
    canvasHeight,
    points,
    partitionMode,
    postcodeSubdivisionLevel,
  ]);

  const nudge = (dx: number, dy: number) => {
    setOrigin((current) => nudgeOrigin(current, dx, dy));
  };
  const rotate = (delta: number) => {
    setOrientation((current) => Math.min(90, Math.max(-90, current + delta)));
  };

  const cycleGridType = () => {
    setGridType((current) => {
      const currentIndex = EXPLORER_GRIDS.indexOf(current);
      return EXPLORER_GRIDS[(currentIndex + 1) % EXPLORER_GRIDS.length];
    });
  };

  const cyclePostcodeSubdivision = () => {
    if (gridType !== "postcode") {
      return;
    }

    setPostcodeSubdivisionLevel(
      (current) => ((current + 1) % 3) as PostcodeSubdivisionLevel,
    );
  };

  const commands = useMemo<VimCommand[]>(() => {
    const nextCommands: VimCommand[] = [
      {
        key: "f",
        label: "Toggle fullscreen",
        run: toggleFullscreen,
      },
      {
        key: "z",
        label: partitionMode
          ? "Exit custom split mode"
          : "Enter custom split mode",
        run: togglePartitionMode,
      },
      {
        key: "enter",
        label: "Commit current cut",
        hidden: !partitionMode,
        run: closePartitionStroke,
      },
      {
        key: "escape",
        label: "Cancel current cut",
        hidden: !partitionMode,
        run: resetPartitionDraft,
      },
      {
        key: "backspace",
        label: "Undo last cut",
        hidden: !partitionMode,
        run: undoPartitionStroke,
      },
      {
        key: "m",
        label: "Toggle MAUP Tracking",
        hidden: partitionMode,
        run: () => {
          setTrackingActive((prev) => {
            setMarkers([]);
            return !prev;
          });
        },
      },
      {
        key: "g",
        label: "Toggle grid shape",
        hidden: partitionMode,
        run: cycleGridType,
      },
      {
        key: "o",
        label: "Toggle controls",
        run: () => setShowControls((current) => !current),
      },
      {
        key: "r",
        label: "Next dataset seed",
        run: () =>
          setHeatmapPointState((current) => ({
            seed: current.seed + 1,
          })),
      },
      {
        key: "p",
        label: "Toggle point overlay",
        run: () => setShowPoints((current) => !current),
      },
      {
        key: "-",
        label: "Finer cells",
        hidden: partitionMode,
        run: () => setCellSize((current) => Math.max(26, current - 4)),
      },
      {
        key: "=",
        label: "Coarser cells",
        hidden: partitionMode,
        run: () => setCellSize((current) => Math.min(72, current + 4)),
      },
      {
        key: "q",
        label: "Rotate left",
        hidden: partitionMode,
        run: () => rotate(-5),
      },
      {
        key: "e",
        label: "Rotate right",
        hidden: partitionMode,
        run: () => rotate(5),
      },
      {
        key: "h",
        label: "Move grid left",
        altKeys: ["LEFT"],
        hidden: partitionMode,
        run: () => nudge(-12, 0),
      },
      {
        key: "arrowleft",
        label: "Move grid left",
        hidden: true,
        run: () => nudge(-12, 0),
      },
      {
        key: "l",
        label: "Move grid right",
        altKeys: ["RIGHT"],
        hidden: partitionMode,
        run: () => nudge(12, 0),
      },
      {
        key: "arrowright",
        label: "Move grid right",
        hidden: true,
        run: () => nudge(12, 0),
      },
      {
        key: "k",
        label: "Move grid up",
        altKeys: ["UP"],
        hidden: partitionMode,
        run: () => nudge(0, -12),
      },
      {
        key: "arrowup",
        label: "Move grid up",
        hidden: true,
        run: () => nudge(0, -12),
      },
      {
        key: "j",
        hidden: partitionMode,
        label: "Move grid down",
        altKeys: ["DOWN"],
        run: () => nudge(0, 12),
      },
      {
        key: "arrowdown",
        label: "Move grid down",
        hidden: true,
        run: () => nudge(0, 12),
      },
    ];

    if (gridType === "postcode") {
      nextCommands.splice(3, 0, {
        key: "s",
        label: "Cycle postcode subdivisions",
        hidden: partitionMode,
        run: cyclePostcodeSubdivision,
      });
    }

    return nextCommands;
  }, [
    closePartitionStroke,
    gridType,
    partitionMode,
    resetPartitionDraft,
    togglePartitionMode,
    toggleFullscreen,
    undoPartitionStroke,
  ]);

  useScopedVimMode({
    rootRef,
    modeId: "heatmap-explorer",
    label: "MAUP Explorer",
    commands,
  });

  return (
    <div
      ref={rootRef}
      style={{
        ...fullscreenRootStyle(isFullscreen),
        ...(isFullscreen
          ? {
              alignItems: "center",
              boxSizing: "border-box",
              display: "flex",
              height: "100vh",
              justifyContent: "center",
              overflow: "hidden",
              padding: 0,
              width: "100vw",
            }
          : undefined),
        background: "transparent",
        outline: "none",
      }}
    >
      <div
        style={{
          ...fullscreenInnerStyle(isFullscreen, 980),
          ...(isFullscreen
            ? {
                alignItems: "center",
                display: "flex",
                height: "100%",
                justifyContent: "center",
                width: "100%",
              }
            : {
                marginInline: "auto",
                width: "100%",
              }),
        }}
      >
        <div
          style={{
            display: "grid",
            gap: isFullscreen ? 0 : 12,
            height: isFullscreen ? "100%" : undefined,
            justifyItems: "center",
            placeItems: isFullscreen ? "center" : undefined,
            width: isFullscreen ? "100%" : undefined,
          }}
        >
          {!isFullscreen && (
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: 6,
                justifyContent: "center",
              }}
            >
              <HeatmapHudButton
                active={!partitionMode && gridType === "square"}
                disabled={partitionMode}
                onClick={() => setGridType("square")}
                style={MINIMAL_BUTTON_STYLE}
              >
                Square
              </HeatmapHudButton>
              <HeatmapHudButton
                active={!partitionMode && gridType === "triangle"}
                disabled={partitionMode}
                onClick={() => setGridType("triangle")}
                style={MINIMAL_BUTTON_STYLE}
              >
                Triangle
              </HeatmapHudButton>
              <HeatmapHudButton
                active={!partitionMode && gridType === "hex"}
                disabled={partitionMode}
                onClick={() => setGridType("hex")}
                style={MINIMAL_BUTTON_STYLE}
              >
                Hex
              </HeatmapHudButton>
              <HeatmapHudButton
                active={!partitionMode && gridType === "postcode"}
                disabled={partitionMode}
                onClick={() => setGridType("postcode")}
                style={MINIMAL_BUTTON_STYLE}
              >
                Postcode
              </HeatmapHudButton>
              {partitionMode && (
                <HeatmapHudButton active style={MINIMAL_BUTTON_STYLE}>
                  Custom split
                </HeatmapHudButton>
              )}
              {gridType === "postcode" && (
                <HeatmapHudButton
                  active={!partitionMode && postcodeSubdivisionLevel > 0}
                  disabled={partitionMode}
                  onClick={cyclePostcodeSubdivision}
                  style={MINIMAL_BUTTON_STYLE}
                >
                  {postcodeSubdivisionLevel === 0
                    ? "Subdivisions: none"
                    : `Subdivisions: ${postcodeSubdivisionLevel}`}
                </HeatmapHudButton>
              )}
              <HeatmapHudButton
                onClick={() => setShowControls((current) => !current)}
                style={CONTROLS_BUTTON_STYLE}
              >
                Controls
              </HeatmapHudButton>
            </div>
          )}

          {controlsVisible && (
            <div
              style={{
                display: "grid",
                gap: 12,
                gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                width: "min(100%, 760px)",
              }}
            >
              <label style={{ display: "grid", gap: 6 }}>
                <span>
                  {gridType === "postcode" ? "District scale" : "Cell size"}:{" "}
                  {cellSize}px
                </span>
                <input
                  type="range"
                  min={26}
                  max={72}
                  step={2}
                  value={cellSize}
                  onChange={(event) => setCellSize(Number(event.target.value))}
                />
              </label>

              <label style={{ display: "grid", gap: 6 }}>
                <span>Points: {pointCount}</span>
                <input
                  type="range"
                  min={HEATMAP_POINT_COUNT_MIN}
                  max={HEATMAP_POINT_COUNT_MAX}
                  step={HEATMAP_POINT_COUNT_STEP}
                  value={pointCount}
                  onChange={(event) =>
                    setHeatmapPointState({
                      pointCount: Number(event.target.value),
                    })
                  }
                />
              </label>

              <label style={{ display: "grid", gap: 6 }}>
                <span>Rotation: {orientation}°</span>
                <input
                  type="range"
                  min={-90}
                  max={90}
                  step={5}
                  value={orientation}
                  onChange={(event) =>
                    setOrientation(Number(event.target.value))
                  }
                />
              </label>

              <label style={{ display: "grid", gap: 6 }}>
                <span>Seed: {seed}</span>
                <input
                  type="range"
                  min={0}
                  max={999}
                  step={1}
                  value={seed}
                  onChange={(event) =>
                    setHeatmapPointState({ seed: Number(event.target.value) })
                  }
                />
              </label>

              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: 8,
                  gridColumn: "1 / -1",
                  justifyContent: "center",
                }}
              >
                <HeatmapHudButton
                  onClick={() => setShowPoints((current) => !current)}
                  style={MINIMAL_BUTTON_STYLE}
                >
                  {showPoints ? "Hide points" : "Show points"}
                </HeatmapHudButton>
                <HeatmapHudButton
                  onClick={() => setOrigin({ ...STORY_ORIGIN })}
                  style={MINIMAL_BUTTON_STYLE}
                >
                  Reset origin
                </HeatmapHudButton>
              </div>
            </div>
          )}

          <div
            style={{
              display: "grid",
              height: isFullscreen ? "100%" : undefined,
              justifyContent: "center",
              justifyItems: "center",
              placeItems: isFullscreen ? "center" : undefined,
              width: isFullscreen ? "100%" : undefined,
            }}
          >
            <div
              style={{
                position: "relative",
                width: canvasWidth,
                height: canvasHeight,
                ...fullscreenCanvasStyle(
                  isFullscreen,
                  { width: canvasWidth, height: canvasHeight },
                  "calc(min(100vw, 100vh) - 40px)",
                ),
              }}
            >
              <HeatmapCanvas
                points={points}
                canvasWidth={canvasWidth}
                canvasHeight={canvasHeight}
                gridType={gridType}
                cellSize={cellSize}
                orientation={orientation}
                origin={origin}
                postcodeSubdivisionLevel={postcodeSubdivisionLevel}
                showAggregation={!partitionMode}
                showBackdrop={false}
                showBorder={false}
                showPoints={!partitionMode && showPoints}
                interactive={!partitionMode}
                onOriginChange={setOrigin}
                style={{ width: "100%", height: "100%" }}
              />
              <svg
                viewBox={`0 0 ${canvasWidth} ${canvasHeight}`}
                style={{
                  position: "absolute",
                  inset: 0,
                  width: "100%",
                  height: "100%",
                  pointerEvents: partitionMode ? "auto" : "none",
                  cursor: partitionMode ? "crosshair" : "default",
                }}
                onPointerDown={handlePartitionPointerDown}
                onPointerMove={handlePartitionPointerMove}
                onPointerUp={handlePartitionPointerUp}
                onPointerCancel={handlePartitionPointerCancel}
              >
                {partitionMode && partitionLayout.regions.length > 0
                  ? partitionLayout.regions.flatMap((region) =>
                      region.cells.map(({ col, row }) => {
                        const x = col * partitionLayout.cellSize;
                        const y = row * partitionLayout.cellSize;
                        return (
                          <rect
                            key={`${region.id}:${col}:${row}`}
                            x={x}
                            y={y}
                            width={Math.min(
                              partitionLayout.cellSize,
                              canvasWidth - x,
                            )}
                            height={Math.min(
                              partitionLayout.cellSize,
                              canvasHeight - y,
                            )}
                            fill={region.fill}
                            fillOpacity={region.fillOpacity}
                          />
                        );
                      }),
                    )
                  : null}

                {partitionMode && showPoints
                  ? points.map((point, index) => (
                      <circle
                        key={`partition-point-${index}`}
                        cx={point.x}
                        cy={point.y}
                        r={2.6}
                        fill="var(--heatmapviz-ink)"
                        fillOpacity={0.88}
                      />
                    ))
                  : null}

                {partitionMode && partitionStrokes.length > 0 ? (
                  <g>
                    <rect
                      x={1}
                      y={1}
                      width={canvasWidth - 2}
                      height={canvasHeight - 2}
                      fill="none"
                      stroke={PARTITION_STROKE_COLOR}
                      strokeWidth={PARTITION_STROKE_WIDTH}
                    />
                    {partitionStrokes.map((stroke) => (
                      <path
                        key={stroke.id}
                        d={polylinePath(stroke.points)}
                        fill="none"
                        stroke={PARTITION_STROKE_COLOR}
                        strokeWidth={PARTITION_STROKE_WIDTH}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    ))}
                  </g>
                ) : partitionMode ? (
                  <rect
                    x={1}
                    y={1}
                    width={canvasWidth - 2}
                    height={canvasHeight - 2}
                    fill="none"
                    stroke={PARTITION_STROKE_COLOR}
                    strokeWidth={PARTITION_STROKE_WIDTH}
                  />
                ) : null}

                {partitionMode
                  ? partitionLayout.regions.map((region) => {
                      if (region.pixelCount < 12) {
                        return null;
                      }

                      const labelText = `${region.pointCount}`;
                      const labelWidth = Math.max(
                        24,
                        labelText.length * 8 + 12,
                      );
                      return (
                        <g
                          key={`partition-label-${region.id}`}
                          transform={`translate(${region.centroid.x}, ${region.centroid.y})`}
                        >
                          <rect
                            x={-labelWidth / 2}
                            y={-12}
                            width={labelWidth}
                            height={24}
                            rx={12}
                            fill="rgba(15, 23, 42, 0.86)"
                            stroke={PARTITION_STROKE_COLOR}
                            strokeWidth={1.25}
                          />
                          <text
                            textAnchor="middle"
                            dominantBaseline="central"
                            fill="#fef3c7"
                            fontFamily="'IosevkaTermSlab Nerd Font Mono', monospace"
                            fontSize="12"
                            fontWeight="800"
                          >
                            {labelText}
                          </text>
                        </g>
                      );
                    })
                  : null}

                {partitionMode && draftPartitionPoints.length > 0 ? (
                  <g>
                    <path
                      d={polylinePath(draftPartitionPoints)}
                      fill="none"
                      stroke={PARTITION_STROKE_COLOR}
                      strokeWidth={PARTITION_STROKE_WIDTH}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <circle
                      cx={draftPartitionPoints[0].x}
                      cy={draftPartitionPoints[0].y}
                      r={5}
                      fill="rgba(255,255,255,0.08)"
                      stroke={PARTITION_STROKE_COLOR}
                      strokeWidth={2}
                    />
                  </g>
                ) : null}

                {trackingActive && !partitionMode
                  ? markers.map((m, i) => (
                      <g key={i} transform={`translate(${m.x}, ${m.y})`}>
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
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
