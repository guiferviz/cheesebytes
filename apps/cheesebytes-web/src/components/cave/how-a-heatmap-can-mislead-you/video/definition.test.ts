import { describe, expect, it } from "vitest";

import { HEATMAP_CANVAS_LAYER_ORDER } from "../HeatmapCanvas";
import {
  compileVideoActions,
  evaluateVideoVisual,
  type VideoActionSource,
} from "@guiferviz/cheese-bytes-video/actions";
import {
  heatmapVideoDefinition,
  type HeatmapVideoState,
} from "./definition";

const firstInitial: HeatmapVideoState = {
  origin: { x: 11, y: 21 },
  showPoints: true,
  showAggregation: true,
  showWinner: false,
  gridType: "square",
  cellSize: 48,
  question: 0,
};

const sections = [
  {
    id: "one",
    marks: {
      "move-grid": 15.18,
      "show-winner": 18.74,
    },
  },
];

const actionSources: VideoActionSource[] = [
  {
    id: "shift-grid",
    sectionId: "one",
    visualId: "heatmap",
    name: "shiftGrid",
    from: "move-grid",
    to: "show-winner",
    ease: "power2.inOut",
    params: { x: 39, y: 36 },
    order: 0,
  },
  {
    id: "show-winner",
    sectionId: "one",
    visualId: "heatmap",
    name: "showWinner",
    at: "show-winner",
    ease: "linear",
    params: {},
    order: 1,
  },
];

const firstActions = compileVideoActions(
  actionSources,
  sections,
  new Map([["one", new Set(["heatmap"])]]),
).get("one")!;

describe("heatmap declarative video actions", () => {
  it("exposes transition targets and capability timing contracts", () => {
    expect(heatmapVideoDefinition.targets).toContain("aggregation");
    expect(heatmapVideoDefinition.targets).not.toContain("grid");
    expect(heatmapVideoDefinition.actions.showWinner.timing).toBe("instant");
    expect(heatmapVideoDefinition.actions.shiftGrid.timing).toBe("animated");
  });

  it("keeps aggregation below points in the shared canvas composition", () => {
    expect(HEATMAP_CANVAS_LAYER_ORDER).toEqual([
      "backdrop",
      "aggregation",
      "points",
      "origin",
      "border",
    ]);
    expect(
      HEATMAP_CANVAS_LAYER_ORDER.indexOf("aggregation"),
    ).toBeLessThan(HEATMAP_CANVAS_LAYER_ORDER.indexOf("points"));
  });

  it("keeps visual state independent from presentation transitions", () => {
    expect(
      evaluateVideoVisual(
        firstInitial,
        firstActions,
        "heatmap",
        heatmapVideoDefinition,
        0,
      ),
    ).toEqual(firstInitial);

    expect(
      evaluateVideoVisual(
        firstInitial,
        firstActions,
        "heatmap",
        heatmapVideoDefinition,
        18.74,
      ),
    ).toMatchObject({
      showAggregation: true,
      showWinner: true,
      origin: { x: 39, y: 36 },
    });
  });

  it("lets editor overrides change action state immediately", () => {
    const overrides = new Map([["shift-grid", { x: 40, y: 8 }]]);

    expect(
      evaluateVideoVisual(
        firstInitial,
        firstActions,
        "heatmap",
        heatmapVideoDefinition,
        18.74,
        overrides,
      ),
    ).toMatchObject({
      origin: { x: 40, y: 8 },
      showWinner: true,
    });
  });
});
