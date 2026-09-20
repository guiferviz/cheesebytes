import {
  defineVideoVisual,
  type VideoActionParamValue,
} from "@guiferviz/cheese-bytes-video/actions";
import type { GridType, Origin } from "../types";

export type HeatmapVideoState = {
  title?: string;
  subtitle?: string;
  origin: Origin;
  showPoints: boolean;
  showAggregation: boolean;
  showWinner: boolean;
  gridType: Extract<GridType, "square" | "hex" | "postcode">;
  cellSize: number;
  question: 0 | 1 | 2;
};

const numberParam = (
  label: string,
  min: number,
  max: number,
  step = 1,
) => ({
  type: "number" as const,
  label,
  min,
  max,
  step,
});

const textParam = (label: string) => ({
  type: "text" as const,
  label,
});

const numberValue = (
  params: Record<string, VideoActionParamValue>,
  key: string,
) => params[key] as number;

const textValue = (
  params: Record<string, VideoActionParamValue>,
  key: string,
) => params[key] as string;

export const heatmapVideoDefinition = defineVideoVisual<HeatmapVideoState>()({
  type: "heatmap",
  targets: ["aggregation"],
  actions: {
    showAggregation: {
      timing: "instant",
      label: "Show aggregation",
      apply: (state) => ({
        ...state,
        showAggregation: true,
      }),
    },
    shiftGrid: {
      timing: "animated",
      label: "Shift grid",
      params: {
        x: numberParam("Grid X", -200, 200),
        y: numberParam("Grid Y", -200, 200),
      },
      apply: (state, params, { progress }) => {
        const targetX = numberValue(params, "x");
        const targetY = numberValue(params, "y");
        return {
          ...state,
          origin: {
            x: state.origin.x + (targetX - state.origin.x) * progress,
            y: state.origin.y + (targetY - state.origin.y) * progress,
          },
        };
      },
    },
    showWinner: {
      timing: "instant",
      label: "Show winner",
      apply: (state) => ({
        ...state,
        showWinner: true,
      }),
    },
    setGridType: {
      timing: "instant",
      label: "Set grid type",
      params: {
        gridType: {
          type: "select",
          label: "Grid type",
          options: [
            { label: "Square", value: "square" },
            { label: "Hexagons", value: "hex" },
            { label: "Postcodes", value: "postcode" },
          ],
        },
      },
      apply: (state, params) => ({
        ...state,
        gridType: params.gridType as HeatmapVideoState["gridType"],
      }),
    },
    setCellSize: {
      timing: "instant",
      label: "Set cell size",
      params: {
        size: numberParam("Cell size", 12, 120),
      },
      apply: (state, params) => ({
        ...state,
        cellSize: numberValue(params, "size"),
      }),
    },
    animateCellSize: {
      timing: "animated",
      label: "Animate cell size",
      params: {
        size: numberParam("Target size", 12, 120),
      },
      apply: (state, params, { progress }) => {
        const target = numberValue(params, "size");
        return {
          ...state,
          cellSize: state.cellSize + (target - state.cellSize) * progress,
        };
      },
    },
    setSubtitle: {
      timing: "instant",
      label: "Set subtitle",
      params: {
        subtitle: textParam("Subtitle"),
      },
      apply: (state, params) => ({
        ...state,
        subtitle: textValue(params, "subtitle"),
      }),
    },
    setQuestion: {
      timing: "instant",
      label: "Set question",
      params: {
        question: {
          type: "select",
          label: "Question",
          options: [
            { label: "None", value: 0 },
            { label: "Map question", value: 1 },
            { label: "Choice question", value: 2 },
          ],
        },
      },
      apply: (state, params) => ({
        ...state,
        question: params.question as HeatmapVideoState["question"],
      }),
    },
  },
});
