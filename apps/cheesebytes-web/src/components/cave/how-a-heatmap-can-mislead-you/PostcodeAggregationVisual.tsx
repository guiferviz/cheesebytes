import { useMemo, useRef, useState } from "react";

import * as d3 from "d3";

import type { VimCommand } from "../../../utils/vim-mode";
import {
  fullscreenInnerStyle,
  fullscreenRootStyle,
  useFullscreen,
} from "../../pathfinding-gold-mine/useFullscreen";

import { DEFAULT_HEATMAP_PALETTE, clamp, colorForValue } from "./heatmap-core";
import {
  HeatmapHudBar,
  HeatmapHudButton,
  HeatmapMetaText,
  HeatmapPanelLabel,
  HeatmapShortcutLabel,
  HeatmapVisualCard,
} from "./shared";
import { useScopedVimMode } from "./useScopedVimMode";

type Point = [number, number];

interface PostcodeCell {
  id: number;
  code: string;
  centroid: Point;
  polygon: Point[];
  score: number;
}

interface TaggedHome {
  point: Point;
  cellId: number;
  code: string;
  score: number;
}

interface HighlightPair {
  left: TaggedHome;
  right: TaggedHome;
  distance: number;
}

const MAP_WIDTH = 320;
const MAP_HEIGHT = 300;
const FIELD_STEP = 16;

function mulberry32(seed: number) {
  let state = seed >>> 0;
  return () => {
    state += 0x6d2b79f5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function hashString(input: string) {
  let hash = 2166136261;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function gaussian(
  x: number,
  y: number,
  centerX: number,
  centerY: number,
  spreadX: number,
  spreadY: number,
  amplitude: number,
) {
  const dx = x - centerX;
  const dy = y - centerY;
  return (
    amplitude *
    Math.exp(
      -(
        (dx * dx) / (2 * spreadX * spreadX) +
        (dy * dy) / (2 * spreadY * spreadY)
      ),
    )
  );
}

function behaviorScore(x: number, y: number) {
  const score =
    0.18 +
    gaussian(x, y, 88, 98, 60, 54, 0.42) +
    gaussian(x, y, 198, 138, 88, 76, 0.36) +
    gaussian(x, y, 256, 224, 62, 52, 0.28) -
    gaussian(x, y, 152, 214, 70, 58, 0.16);

  return clamp(score, 0, 1);
}

function polygonPath(points: Point[]) {
  return (
    points
      .map(
        (point, index) =>
          `${index === 0 ? "M" : "L"} ${point[0].toFixed(1)} ${point[1].toFixed(1)}`,
      )
      .join(" ") + " Z"
  );
}

function linePath(points: Point[]) {
  return points
    .map(
      (point, index) =>
        `${index === 0 ? "M" : "L"} ${point[0].toFixed(1)} ${point[1].toFixed(1)}`,
    )
    .join(" ");
}

function edgeKey(left: Point, right: Point) {
  const ordered = [left, right].sort((first, second) => {
    if (first[0] === second[0]) {
      return first[1] - second[1];
    }
    return first[0] - second[0];
  });

  return `${ordered[0][0].toFixed(2)},${ordered[0][1].toFixed(2)}|${ordered[1][0].toFixed(2)},${ordered[1][1].toFixed(2)}`;
}

function generateOrganicEdge(
  start: Point,
  end: Point,
  key: string,
  maxDepth = 4,
): Point[] {
  const random = mulberry32(hashString(key));

  const recurse = (left: Point, right: Point, depth: number): Point[] => {
    if (depth >= maxDepth) {
      return [left, right];
    }

    const dx = right[0] - left[0];
    const dy = right[1] - left[1];
    const distance = Math.hypot(dx, dy);
    if (distance < 7) {
      return [left, right];
    }

    const midX = (left[0] + right[0]) / 2;
    const midY = (left[1] + right[1]) / 2;
    const normalX = -dy / distance;
    const normalY = dx / distance;
    const magnitude = ((random() - 0.5) * distance * 0.22) / (depth + 0.8);
    const midpoint: Point = [
      midX + normalX * magnitude,
      midY + normalY * magnitude,
    ];

    const firstHalf = recurse(left, midpoint, depth + 1);
    const secondHalf = recurse(midpoint, right, depth + 1);
    return [...firstHalf.slice(0, -1), ...secondHalf];
  };

  return recurse(start, end, 0);
}

function generateSeedPoints(seed: number, count: number) {
  const random = mulberry32(seed);
  return Array.from(
    { length: count },
    () =>
      [
        28 + random() * (MAP_WIDTH - 56),
        28 + random() * (MAP_HEIGHT - 56),
      ] as Point,
  );
}

function relaxPoints(points: Point[], iterations: number) {
  let current = points;

  for (let iteration = 0; iteration < iterations; iteration += 1) {
    const voronoi = d3.Delaunay.from(current).voronoi([
      12,
      12,
      MAP_WIDTH - 12,
      MAP_HEIGHT - 12,
    ]);
    current = current.map((point, index) => {
      const polygon = voronoi.cellPolygon(index) as Point[] | null;
      if (!polygon) {
        return point;
      }
      const [centerX, centerY] = d3.polygonCentroid(polygon);
      return [centerX, centerY] as Point;
    });
  }

  return current;
}

function buildFieldTiles() {
  const tiles: Array<{ x: number; y: number; score: number }> = [];

  for (let y = 10; y < MAP_HEIGHT - 10; y += FIELD_STEP) {
    for (let x = 10; x < MAP_WIDTH - 10; x += FIELD_STEP) {
      tiles.push({
        x,
        y,
        score: behaviorScore(x + FIELD_STEP / 2, y + FIELD_STEP / 2),
      });
    }
  }

  return tiles;
}

function pointCell(cells: PostcodeCell[], point: Point) {
  return cells.find((cell) => d3.polygonContains(cell.polygon, point)) ?? null;
}

function generateHomes() {
  const random = mulberry32(911);
  return Array.from(
    { length: 72 },
    () =>
      [
        22 + random() * (MAP_WIDTH - 44),
        22 + random() * (MAP_HEIGHT - 44),
      ] as Point,
  );
}

function pickHighlightPair(homes: TaggedHome[]): HighlightPair | null {
  let bestPair: HighlightPair | null = null;
  let bestScore = Number.POSITIVE_INFINITY;

  for (let leftIndex = 0; leftIndex < homes.length; leftIndex += 1) {
    for (
      let rightIndex = leftIndex + 1;
      rightIndex < homes.length;
      rightIndex += 1
    ) {
      const left = homes[leftIndex];
      const right = homes[rightIndex];
      if (left.cellId === right.cellId) {
        continue;
      }

      const distance = Math.hypot(
        left.point[0] - right.point[0],
        left.point[1] - right.point[1],
      );
      if (distance > 48) {
        continue;
      }

      const scoreDifference = Math.abs(left.score - right.score);
      const ranking = scoreDifference * 10 + distance / 100;
      if (ranking < bestScore) {
        bestScore = ranking;
        bestPair = { left, right, distance };
      }
    }
  }

  return bestPair;
}

function buildPostcodeWorld(seed: number) {
  const relaxedPoints = relaxPoints(generateSeedPoints(seed, 14), 2);
  const voronoi = d3.Delaunay.from(relaxedPoints).voronoi([
    12,
    12,
    MAP_WIDTH - 12,
    MAP_HEIGHT - 12,
  ]);
  const cells = relaxedPoints
    .map((_, index) => {
      const polygonWithRepeat = voronoi.cellPolygon(index) as Point[] | null;
      if (!polygonWithRepeat) {
        return null;
      }

      const polygon = polygonWithRepeat.slice(0, -1) as Point[];
      const [centerX, centerY] = d3.polygonCentroid(polygon);
      return {
        id: index,
        code: String(28000 + ((seed * 17 + index * 13) % 800)),
        centroid: [centerX, centerY] as Point,
        polygon,
        score: behaviorScore(centerX, centerY),
      } satisfies PostcodeCell;
    })
    .filter((cell): cell is PostcodeCell => cell !== null);

  const edges = new Map<string, { start: Point; end: Point }>();
  cells.forEach((cell) => {
    for (let index = 0; index < cell.polygon.length; index += 1) {
      const start = cell.polygon[index];
      const end = cell.polygon[(index + 1) % cell.polygon.length];
      const key = edgeKey(start, end);
      if (!edges.has(key)) {
        edges.set(key, { start, end });
      }
    }
  });

  const homes = generateHomes()
    .map((point) => {
      const cell = pointCell(cells, point);
      if (!cell) {
        return null;
      }
      return {
        point,
        cellId: cell.id,
        code: cell.code,
        score: behaviorScore(point[0], point[1]),
      } satisfies TaggedHome;
    })
    .filter((home): home is TaggedHome => home !== null);

  return {
    cells,
    edges: [...edges.entries()].map(([key, edge]) => ({
      key,
      path: linePath(generateOrganicEdge(edge.start, edge.end, key)),
    })),
    highlightedPair: pickHighlightPair(homes),
  };
}

const FIELD_TILES = buildFieldTiles();

function FieldMap({ children }: { children?: React.ReactNode }) {
  return (
    <svg
      viewBox={`0 0 ${MAP_WIDTH} ${MAP_HEIGHT}`}
      width={MAP_WIDTH}
      height={MAP_HEIGHT}
      style={{
        display: "block",
        width: "100%",
        height: "auto",
        borderRadius: 18,
        background: "rgba(255,255,255,0.04)",
      }}
    >
      {FIELD_TILES.map((tile) => (
        <rect
          key={`${tile.x}-${tile.y}`}
          x={tile.x}
          y={tile.y}
          width={FIELD_STEP + 1}
          height={FIELD_STEP + 1}
          fill={colorForValue(tile.score, 1, DEFAULT_HEATMAP_PALETTE)}
          opacity={0.74}
        />
      ))}
      <rect
        x={10}
        y={10}
        width={MAP_WIDTH - 20}
        height={MAP_HEIGHT - 20}
        rx={24}
        fill="none"
        stroke="rgba(255,255,255,0.24)"
      />
      {children}
    </svg>
  );
}

export function PostcodeAggregationVisual() {
  const rootRef = useRef<HTMLDivElement>(null);
  const { isFullscreen, toggleFullscreen } = useFullscreen(rootRef);
  const [layoutSeed, setLayoutSeed] = useState(7);
  const [showFieldUnderlay, setShowFieldUnderlay] = useState(true);
  const [showLabels, setShowLabels] = useState(true);

  const world = useMemo(() => buildPostcodeWorld(layoutSeed), [layoutSeed]);

  const commands = useMemo<VimCommand[]>(
    () => [
      {
        key: "r",
        label: "Redraw postcodes",
        run: () => setLayoutSeed((current) => current + 1),
      },
      {
        key: "v",
        label: "Toggle smooth field",
        run: () => setShowFieldUnderlay((current) => !current),
      },
      {
        key: "l",
        label: "Toggle postcode labels",
        run: () => setShowLabels((current) => !current),
      },
      {
        key: "f",
        label: "Toggle fullscreen",
        run: toggleFullscreen,
      },
    ],
    [toggleFullscreen],
  );

  const armed = useScopedVimMode({
    rootRef,
    modeId: "postcode-aggregation-visual",
    label: "Postal Code Aggregation",
    commands,
  });

  return (
    <div ref={rootRef} style={fullscreenRootStyle(isFullscreen)}>
      <div style={fullscreenInnerStyle(isFullscreen, 1140)}>
        <HeatmapVisualCard>
          <HeatmapHudBar>
            <div style={{ display: "grid", gap: 8 }}>
              <HeatmapPanelLabel>Administrative boundaries</HeatmapPanelLabel>
              <div style={{ fontSize: "1.15rem", fontWeight: 800 }}>
                Postal codes help logistics, but they do not magically become
                behavioral borders
              </div>
            </div>

            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              <HeatmapHudButton
                onClick={() => setLayoutSeed((current) => current + 1)}
              >
                Redraw codes
              </HeatmapHudButton>
              <HeatmapHudButton
                onClick={() => setShowFieldUnderlay((current) => !current)}
              >
                {showFieldUnderlay ? "Hide field" : "Show field"}
              </HeatmapHudButton>
              <HeatmapHudButton
                onClick={() => setShowLabels((current) => !current)}
              >
                {showLabels ? "Hide labels" : "Show labels"}
              </HeatmapHudButton>
              <HeatmapHudButton onClick={toggleFullscreen}>
                Fullscreen
              </HeatmapHudButton>
            </div>
          </HeatmapHudBar>

          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 18,
            }}
          >
            <div
              style={{
                flex: "1 1 320px",
                display: "grid",
                gap: 10,
              }}
            >
              <HeatmapPanelLabel>
                Continuous neighborhood signal
              </HeatmapPanelLabel>
              <FieldMap>
                {world.highlightedPair && (
                  <>
                    {[
                      world.highlightedPair.left,
                      world.highlightedPair.right,
                    ].map((home, index) => (
                      <g key={home.code}>
                        <circle
                          cx={home.point[0]}
                          cy={home.point[1]}
                          r={5.5}
                          fill="#fff7ed"
                          stroke="#3a2e21"
                          strokeWidth={1.4}
                        />
                        <text
                          x={home.point[0] + 9}
                          y={home.point[1] - 8}
                          fontSize="12"
                          fontWeight="800"
                          fill="#fff7ed"
                          stroke="#3a2e21"
                          strokeWidth="0.3"
                        >
                          {index === 0 ? "A" : "B"}
                        </text>
                      </g>
                    ))}
                  </>
                )}
              </FieldMap>
              <HeatmapMetaText>
                The left map is an organic field: behavior changes smoothly, not
                in rigid jumps.
              </HeatmapMetaText>
            </div>

            <div
              style={{
                flex: "1 1 320px",
                display: "grid",
                gap: 10,
              }}
            >
              <HeatmapPanelLabel>Postal-code summary</HeatmapPanelLabel>
              <svg
                viewBox={`0 0 ${MAP_WIDTH} ${MAP_HEIGHT}`}
                width={MAP_WIDTH}
                height={MAP_HEIGHT}
                style={{
                  display: "block",
                  width: "100%",
                  height: "auto",
                  borderRadius: 18,
                  background: "rgba(255,255,255,0.04)",
                }}
              >
                {showFieldUnderlay &&
                  FIELD_TILES.map((tile) => (
                    <rect
                      key={`underlay-${tile.x}-${tile.y}`}
                      x={tile.x}
                      y={tile.y}
                      width={FIELD_STEP + 1}
                      height={FIELD_STEP + 1}
                      fill={colorForValue(
                        tile.score,
                        1,
                        DEFAULT_HEATMAP_PALETTE,
                      )}
                      opacity={0.22}
                    />
                  ))}

                {world.cells.map((cell) => (
                  <path
                    key={cell.code}
                    d={polygonPath(cell.polygon)}
                    fill={colorForValue(cell.score, 1, DEFAULT_HEATMAP_PALETTE)}
                    opacity={0.66}
                    stroke="rgba(255,255,255,0.08)"
                    strokeWidth={0.8}
                  />
                ))}

                {world.edges.map((edge) => (
                  <path
                    key={edge.key}
                    d={edge.path}
                    fill="none"
                    stroke="rgba(255,247,237,0.92)"
                    strokeWidth={1.6}
                    strokeLinejoin="round"
                    strokeLinecap="round"
                  />
                ))}

                {showLabels &&
                  world.cells.map((cell) => (
                    <text
                      key={`label-${cell.code}`}
                      x={cell.centroid[0]}
                      y={cell.centroid[1]}
                      textAnchor="middle"
                      fontSize="11"
                      fontWeight="800"
                      fill="#fff7ed"
                      stroke="#3a2e21"
                      strokeWidth="0.4"
                    >
                      {cell.code}
                    </text>
                  ))}

                {world.highlightedPair && (
                  <>
                    {[
                      world.highlightedPair.left,
                      world.highlightedPair.right,
                    ].map((home, index) => (
                      <g key={`pair-${home.code}`}>
                        <circle
                          cx={home.point[0]}
                          cy={home.point[1]}
                          r={5.5}
                          fill="#fff7ed"
                          stroke="#3a2e21"
                          strokeWidth={1.4}
                        />
                        <text
                          x={home.point[0] + 9}
                          y={home.point[1] - 8}
                          fontSize="12"
                          fontWeight="800"
                          fill="#fff7ed"
                          stroke="#3a2e21"
                          strokeWidth="0.3"
                        >
                          {index === 0 ? "A" : "B"}
                        </text>
                      </g>
                    ))}
                  </>
                )}

                <rect
                  x={10}
                  y={10}
                  width={MAP_WIDTH - 20}
                  height={MAP_HEIGHT - 20}
                  rx={24}
                  fill="none"
                  stroke="rgba(255,255,255,0.24)"
                />
              </svg>
              <HeatmapMetaText>
                The right map aggregates that same field into irregular
                administrative areas. The borders look natural, but they are
                still arbitrary.
              </HeatmapMetaText>
            </div>
          </div>

          {world.highlightedPair && (
            <HeatmapMetaText>
              Homes A and B are only {world.highlightedPair.distance.toFixed(1)}{" "}
              px apart. Their local scores are{" "}
              {world.highlightedPair.left.score.toFixed(2)} and{" "}
              {world.highlightedPair.right.score.toFixed(2)}, but they fall in
              postal codes {world.highlightedPair.left.code} and{" "}
              {world.highlightedPair.right.code} because the delivery border
              happens to cut between them.
            </HeatmapMetaText>
          )}

          <HeatmapMetaText>
            Keyboard live: {armed ? "yes" : "click the card first"}. Use{" "}
            <HeatmapShortcutLabel>R</HeatmapShortcutLabel> to redraw postcodes
            and <HeatmapShortcutLabel>V</HeatmapShortcutLabel> to toggle the
            underlying smooth field.
          </HeatmapMetaText>
        </HeatmapVisualCard>
      </div>
    </div>
  );
}
