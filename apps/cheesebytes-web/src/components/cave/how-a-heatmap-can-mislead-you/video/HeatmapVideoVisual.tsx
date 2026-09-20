import { useMemo } from "react";

import { useVideoVisual } from "@guiferviz/cheese-bytes-video/react";
import { HeatmapCanvas } from "../HeatmapCanvas";
import {
  DEFAULT_HEATMAP_CANVAS_HEIGHT,
  DEFAULT_HEATMAP_CANVAS_WIDTH,
  DEFAULT_HEATMAP_POINT_COUNT,
  DEFAULT_HEATMAP_POINT_SEED,
  HEATMAP_POINT_COUNT_MAX,
} from "../heatmap-article";
import {
  generateUniformStoryPoints,
  getGridCellValues,
  getHexCellPolygon,
  getPostcodeCells,
  getSquareCellPolygon,
} from "../heatmap-core";
import {
  heatmapVideoDefinition,
  type HeatmapVideoState,
} from "./definition";

export { heatmapVideoDefinition } from "./definition";

const CANVAS_WIDTH = DEFAULT_HEATMAP_CANVAS_WIDTH;
const CANVAS_HEIGHT = DEFAULT_HEATMAP_CANVAS_HEIGHT;

export function HeatmapVideoVisual({
  label,
  initial,
}: {
  label?: string;
  initial: HeatmapVideoState;
}) {
  const { ref: videoRef, state } = useVideoVisual(
    heatmapVideoDefinition,
    initial,
  );
  const points = useMemo(
    () =>
      generateUniformStoryPoints(
        HEATMAP_POINT_COUNT_MAX,
        CANVAS_WIDTH,
        DEFAULT_HEATMAP_POINT_SEED,
        10,
        HEATMAP_POINT_COUNT_MAX,
        CANVAS_HEIGHT,
      ).slice(0, DEFAULT_HEATMAP_POINT_COUNT),
    [],
  );

  const settings = {
    gridType: state.gridType,
    cellSize: state.cellSize,
    orientation: 0,
    origin: state.origin,
    canvasSize: CANVAS_WIDTH,
    canvasWidth: CANVAS_WIDTH,
    canvasHeight: CANVAS_HEIGHT,
  };
  const values = getGridCellValues(points, settings);
  const maximum = Math.max(0, ...values.values());
  const winners = [...values]
    .filter(([, value]) => value === maximum && value > 0)
    .map(([key]) => {
      if (state.gridType === "postcode") {
        return getPostcodeCells(settings).find((cell) => cell.key === key)?.polygon ?? [];
      }
      const [x, y] = key.split(",").map(Number);
      return state.gridType === "hex"
        ? getHexCellPolygon(x, y, settings)
        : getSquareCellPolygon(x, y, settings);
    })
    .filter((polygon) => polygon.length > 0);

  return (
    <main
      ref={videoRef}
      style={{
        alignItems: "center",
        background: "#000",
        boxSizing: "border-box",
        color: "#f8fafc",
        display: "grid",
        fontFamily: "'IosevkaTermSlab Nerd Font Mono', monospace",
        gap: label || state.title || state.subtitle ? 24 : 0,
        gridTemplateRows:
          label || state.title || state.subtitle
            ? "auto minmax(0, 1fr)"
            : "minmax(0, 1fr)",
        height: "100%",
        overflow: "hidden",
        padding: "28px 72px",
        width: "100%",
      }}
    >
      {(label || state.title || state.subtitle) && (
        <header style={{ textAlign: "center" }}>
          {label && (
            <div
              style={{
                color: "#fbbf24",
                fontSize: 18,
                fontWeight: 700,
                letterSpacing: 2,
              }}
            >
              HOW A HEATMAP CAN MISLEAD YOU · {label}
            </div>
          )}
          {state.title && (
            <h1 style={{ fontSize: 40, lineHeight: 1.1, margin: "10px 0" }}>
              {state.title}
            </h1>
          )}
          {state.subtitle && (
            <p style={{ color: "#cbd5e1", fontSize: 24, margin: 0 }}>
              {state.subtitle}
            </p>
          )}
        </header>
      )}

      <div
        style={{
          alignItems: "center",
          display: "flex",
          gap: 70,
          justifyContent: "center",
          minHeight: 0,
        }}
      >
        <div
          style={{
            aspectRatio: "1",
            flexShrink: 0,
            minHeight: 0,
            position: "relative",
            width: "min(76vh, 100%)",
          }}
        >
          <HeatmapCanvas
            points={points}
            canvasWidth={CANVAS_WIDTH}
            canvasHeight={CANVAS_HEIGHT}
            gridType={state.gridType}
            cellSize={state.cellSize}
            orientation={0}
            origin={state.origin}
            showAggregation={state.showAggregation}
            showBackdrop={false}
            showBorder={false}
            showOrigin={false}
            showPoints={state.showPoints}
            layerAttributes={{
              aggregation: {
                "data-video-target": "aggregation",
              },
            }}
            style={{
              background: "#000",
              borderRadius: 28,
              height: "100%",
              width: "100%",
            }}
          />
          {state.showWinner && (
            <svg
              viewBox={"0 0 " + CANVAS_WIDTH + " " + CANVAS_HEIGHT}
              aria-label="Highest count cells including ties"
              style={{
                height: "100%",
                inset: 0,
                pointerEvents: "none",
                position: "absolute",
                width: "100%",
              }}
            >
              {winners.map((polygon, index) => (
                <polygon
                  key={index}
                  points={polygon.map((point) => point.x + "," + point.y).join(" ")}
                  fill="none"
                  stroke="#fbbf24"
                  strokeWidth="2"
                />
              ))}
            </svg>
          )}
        </div>

        {state.question > 0 && (
          <div style={{ flex: 1, fontSize: 54, lineHeight: 1.35, maxWidth: 800 }}>
            <p style={{ margin: "0 0 54px" }}>what does the map say?</p>
            <p
              style={{
                color: "#fbbf24",
                margin: 0,
                visibility: state.question === 2 ? "visible" : "hidden",
              }}
            >
              what did we make the map say?
            </p>
          </div>
        )}
      </div>
    </main>
  );
}
