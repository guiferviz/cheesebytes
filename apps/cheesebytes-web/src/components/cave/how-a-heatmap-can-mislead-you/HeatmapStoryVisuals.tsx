import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties } from "react";

import type { VimCommand, VimModeAPI } from "../../../utils/vim-mode";
import {
  fullscreenInnerStyle,
  fullscreenRootStyle,
  useFullscreen,
} from "../../pathfinding-gold-mine/useFullscreen";

import { HeatmapCanvas } from "./HeatmapCanvas";
import {
  DEFAULT_HEATMAP_CANVAS_HEIGHT,
  DEFAULT_HEATMAP_CANVAS_WIDTH,
  DEFAULT_HEATMAP_POINT_COUNT,
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
import { nudgeOrigin } from "./heatmap-core";
import { HeatmapHudButton } from "./shared";
import type { GridType, Origin } from "./types";
import { useScopedVimMode } from "./useScopedVimMode";

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
    setHeatmapPointState({ pointCount, seed });
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
      normalMaxWidth={Math.max(1140, canvasWidth * 2 + 18)}
    >
      {(isFullscreen) => (
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: isFullscreen ? 28 : 18,
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
  const [cellSize, setCellSize] = useState(48);
  const [orientation, setOrientation] = useState(0);
  const { pointCount, seed, canvasWidth, canvasHeight } =
    useHeatmapPointState();
  const [showPoints, setShowPoints] = useState(true);
  const [showControls, setShowControls] = useState(false);
  const [origin, setOrigin] = useState<Origin>(() => ({ ...STORY_ORIGIN }));
  const controlsVisible = !isFullscreen && showControls;

  const points = useHeatmapArticlePoints();

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

  const commands = useMemo<VimCommand[]>(
    () => [
      {
        key: "f",
        label: "Toggle fullscreen",
        run: toggleFullscreen,
      },
      {
        key: "g",
        label: "Toggle grid shape",
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
        run: () => setCellSize((current) => Math.max(26, current - 4)),
      },
      {
        key: "=",
        label: "Coarser cells",
        run: () => setCellSize((current) => Math.min(72, current + 4)),
      },
      {
        key: "q",
        label: "Rotate left",
        run: () => rotate(-5),
      },
      {
        key: "e",
        label: "Rotate right",
        run: () => rotate(5),
      },
      {
        key: "h",
        label: "Move grid left",
        altKeys: ["LEFT"],
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
    ],
    [toggleFullscreen],
  );
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
                active={gridType === "square"}
                onClick={() => setGridType("square")}
                style={MINIMAL_BUTTON_STYLE}
              >
                Square
              </HeatmapHudButton>
              <HeatmapHudButton
                active={gridType === "triangle"}
                onClick={() => setGridType("triangle")}
                style={MINIMAL_BUTTON_STYLE}
              >
                Triangle
              </HeatmapHudButton>
              <HeatmapHudButton
                active={gridType === "hex"}
                onClick={() => setGridType("hex")}
                style={MINIMAL_BUTTON_STYLE}
              >
                Hex
              </HeatmapHudButton>
              <HeatmapHudButton
                active={gridType === "postcode"}
                onClick={() => setGridType("postcode")}
                style={MINIMAL_BUTTON_STYLE}
              >
                Postcode
              </HeatmapHudButton>
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
            <HeatmapCanvas
              points={points}
              canvasWidth={canvasWidth}
              canvasHeight={canvasHeight}
              gridType={gridType}
              cellSize={cellSize}
              orientation={orientation}
              origin={origin}
              showAggregation={true}
              showBackdrop={false}
              showBorder={false}
              showPoints={showPoints}
              interactive={true}
              onOriginChange={setOrigin}
              style={fullscreenCanvasStyle(
                isFullscreen,
                { width: canvasWidth, height: canvasHeight },
                "calc(min(100vw, 100vh) - 40px)",
              )}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
