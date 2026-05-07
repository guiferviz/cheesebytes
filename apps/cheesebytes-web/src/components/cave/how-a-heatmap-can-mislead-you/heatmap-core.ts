import * as d3 from "d3";

import type {
  CellValues,
  GridType,
  HeatmapSettings,
  Origin,
  Point,
} from "./types";

const SQRT3 = Math.sqrt(3);
const TRIANGLE_HEIGHT_RATIO = SQRT3 / 2;
const POSTCODE_SPACING_RATIO = 1.62;

interface SquareVisibleRange {
  ixMin: number;
  ixMax: number;
  iyMin: number;
  iyMax: number;
}

interface GridBounds {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
}

interface PostcodeSeed {
  gx: number;
  gy: number;
  key: string;
  gridPoint: Point;
  canvasPoint: [number, number];
}

export const DEFAULT_HEATMAP_PALETTE = [
  "#8ecf8b",
  "#f6d365",
  "#f49d5f",
  "#da5a4d",
] as const;

export function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function mulberry32(seed: number) {
  let state = seed >>> 0;
  return () => {
    state += 0x6d2b79f5;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function randomBell(rand: () => number) {
  return (rand() + rand() + rand() + rand() - 2) / 2;
}

function rotate(point: Point, center: number, degrees: number): Point {
  const angle = (degrees * Math.PI) / 180;
  const sin = Math.sin(angle);
  const cos = Math.cos(angle);
  const dx = point.x - center;
  const dy = point.y - center;
  return {
    x: center + dx * cos - dy * sin,
    y: center + dx * sin + dy * cos,
  };
}

export function toGridSpace(
  point: Point,
  canvasSize: number,
  orientation: number,
) {
  return rotate(point, canvasSize / 2, -orientation);
}

export function toCanvasSpace(
  point: Point,
  canvasSize: number,
  orientation: number,
) {
  return rotate(point, canvasSize / 2, orientation);
}

export function squareKey(ix: number, iy: number) {
  return `${ix},${iy}`;
}

export function hexKey(q: number, r: number) {
  return `${q},${r}`;
}

export function triangleKey(ix: number, iy: number) {
  return `${ix},${iy}`;
}

export function postcodeKey(gx: number, gy: number) {
  return `postcode-${gx},${gy}`;
}

function getGridBounds(settings: HeatmapSettings): GridBounds {
  const corners = [
    { x: 0, y: 0 },
    { x: settings.canvasSize, y: 0 },
    { x: settings.canvasSize, y: settings.canvasSize },
    { x: 0, y: settings.canvasSize },
  ].map((corner) =>
    toGridSpace(corner, settings.canvasSize, settings.orientation),
  );

  const xs = corners.map((corner) => corner.x);
  const ys = corners.map((corner) => corner.y);

  return {
    minX: Math.min(...xs),
    maxX: Math.max(...xs),
    minY: Math.min(...ys),
    maxY: Math.max(...ys),
  };
}

function averagePoint(points: Point[]): Point {
  const total = points.reduce(
    (accumulator, point) => ({
      x: accumulator.x + point.x,
      y: accumulator.y + point.y,
    }),
    { x: 0, y: 0 },
  );

  return {
    x: total.x / points.length,
    y: total.y / points.length,
  };
}

function lerpPoint(left: Point, right: Point, t: number): Point {
  return {
    x: left.x + (right.x - left.x) * t,
    y: left.y + (right.y - left.y) * t,
  };
}

function polygonIntersectsCanvas(
  polygon: Point[],
  canvasSize: number,
  margin: number,
) {
  const xs = polygon.map((point) => point.x);
  const ys = polygon.map((point) => point.y);
  return !(
    Math.max(...xs) < -margin ||
    Math.max(...ys) < -margin ||
    Math.min(...xs) > canvasSize + margin ||
    Math.min(...ys) > canvasSize + margin
  );
}

export function generateStoryPoints(
  count: number,
  canvasSize: number,
  seed = 7,
): Point[] {
  const rand = mulberry32(seed);
  const clusters = [
    { x: 0.28, y: 0.32, spread: 0.075, weight: 0.24 },
    { x: 0.62, y: 0.38, spread: 0.09, weight: 0.3 },
    { x: 0.73, y: 0.68, spread: 0.08, weight: 0.23 },
    { x: 0.39, y: 0.75, spread: 0.065, weight: 0.16 },
  ];

  const pickCluster = () => {
    const roll = rand();
    let seen = 0;
    for (const cluster of clusters) {
      seen += cluster.weight;
      if (roll <= seen) {
        return cluster;
      }
    }
    return clusters[clusters.length - 1];
  };

  const points: Point[] = [];
  for (let index = 0; index < count; index += 1) {
    const useNoise = rand() < 0.12;
    if (useNoise) {
      points.push({
        x: clamp(rand() * canvasSize, 10, canvasSize - 10),
        y: clamp(rand() * canvasSize, 10, canvasSize - 10),
      });
      continue;
    }

    const cluster = pickCluster();
    points.push({
      x: clamp(
        canvasSize * (cluster.x + randomBell(rand) * cluster.spread),
        10,
        canvasSize - 10,
      ),
      y: clamp(
        canvasSize * (cluster.y + randomBell(rand) * cluster.spread),
        10,
        canvasSize - 10,
      ),
    });
  }

  return points;
}

export function generateUniformStoryPoints(
  count: number,
  canvasSize: number,
  seed = 124,
  padding = 10,
  layoutCount = count,
): Point[] {
  const rand = mulberry32(seed);
  const reservedCount = Math.max(count, layoutCount);
  const columns = Math.ceil(Math.sqrt(reservedCount));
  const rows = Math.ceil(reservedCount / columns);
  const usableSize = canvasSize - padding * 2;
  const cellWidth = usableSize / columns;
  const cellHeight = usableSize / rows;
  const cells = Array.from({ length: columns * rows }, (_, index) => ({
    column: index % columns,
    row: Math.floor(index / columns),
  }));

  for (let index = cells.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(rand() * (index + 1));
    const current = cells[index];
    cells[index] = cells[swapIndex];
    cells[swapIndex] = current;
  }

  return cells.slice(0, count).map((cell) => ({
    x: clamp(
      padding + (cell.column + 0.18 + rand() * 0.64) * cellWidth,
      padding,
      canvasSize - padding,
    ),
    y: clamp(
      padding + (cell.row + 0.18 + rand() * 0.64) * cellHeight,
      padding,
      canvasSize - padding,
    ),
  }));
}

export function getSquareVisibleRange(
  settings: HeatmapSettings,
): SquareVisibleRange {
  const bounds = getGridBounds(settings);
  const margin = 2;

  return {
    ixMin:
      Math.floor((bounds.minX - settings.origin.x) / settings.cellSize) -
      margin,
    ixMax:
      Math.ceil((bounds.maxX - settings.origin.x) / settings.cellSize) + margin,
    iyMin:
      Math.floor((bounds.minY - settings.origin.y) / settings.cellSize) -
      margin,
    iyMax:
      Math.ceil((bounds.maxY - settings.origin.y) / settings.cellSize) + margin,
  };
}

function squareCellGridPolygon(
  ix: number,
  iy: number,
  settings: HeatmapSettings,
): Point[] {
  const x0 = settings.origin.x + ix * settings.cellSize;
  const y0 = settings.origin.y + iy * settings.cellSize;
  return [
    { x: x0, y: y0 },
    { x: x0 + settings.cellSize, y: y0 },
    { x: x0 + settings.cellSize, y: y0 + settings.cellSize },
    { x: x0, y: y0 + settings.cellSize },
  ];
}

export function getSquareCellPolygon(
  ix: number,
  iy: number,
  settings: HeatmapSettings,
): Point[] {
  return squareCellGridPolygon(ix, iy, settings).map((point) =>
    toCanvasSpace(point, settings.canvasSize, settings.orientation),
  );
}

export function getSquareCellValues(
  points: Point[],
  settings: HeatmapSettings,
): CellValues {
  const values: CellValues = new Map();

  for (const point of points) {
    const gridPoint = toGridSpace(
      point,
      settings.canvasSize,
      settings.orientation,
    );
    const ix = Math.floor(
      (gridPoint.x - settings.origin.x) / settings.cellSize,
    );
    const iy = Math.floor(
      (gridPoint.y - settings.origin.y) / settings.cellSize,
    );
    const key = squareKey(ix, iy);
    values.set(key, (values.get(key) ?? 0) + 1);
  }

  return values;
}

function axialRound(q: number, r: number) {
  const s = -q - r;
  let roundedQ = Math.round(q);
  let roundedR = Math.round(r);
  let roundedS = Math.round(s);

  const qDiff = Math.abs(roundedQ - q);
  const rDiff = Math.abs(roundedR - r);
  const sDiff = Math.abs(roundedS - s);

  if (qDiff > rDiff && qDiff > sDiff) {
    roundedQ = -roundedR - roundedS;
  } else if (rDiff > sDiff) {
    roundedR = -roundedQ - roundedS;
  } else {
    roundedS = -roundedQ - roundedR;
  }

  return { q: roundedQ, r: roundedR, s: roundedS };
}

function axialToPixel(q: number, r: number, size: number) {
  return {
    x: size * SQRT3 * (q + r / 2),
    y: size * 1.5 * r,
  };
}

function pointToAxial(point: Point, origin: Origin, size: number) {
  const x = point.x - origin.x;
  const y = point.y - origin.y;
  const q = ((SQRT3 / 3) * x - y / 3) / size;
  const r = ((2 / 3) * y) / size;
  return axialRound(q, r);
}

function pointToRawAxial(point: Point, origin: Origin, size: number) {
  const x = point.x - origin.x;
  const y = point.y - origin.y;
  return {
    q: ((SQRT3 / 3) * x - y / 3) / size,
    r: ((2 / 3) * y) / size,
  };
}

export function getHexCellCenter(
  q: number,
  r: number,
  settings: HeatmapSettings,
): Point {
  const raw = axialToPixel(q, r, settings.cellSize);
  return toCanvasSpace(
    {
      x: settings.origin.x + raw.x,
      y: settings.origin.y + raw.y,
    },
    settings.canvasSize,
    settings.orientation,
  );
}

export function getHexCellPolygon(
  q: number,
  r: number,
  settings: HeatmapSettings,
): Point[] {
  const center = getHexCellCenter(q, r, settings);
  return Array.from({ length: 6 }, (_, index) => {
    const angle = ((60 * index - 30 + settings.orientation) * Math.PI) / 180;
    return {
      x: center.x + settings.cellSize * Math.cos(angle),
      y: center.y + settings.cellSize * Math.sin(angle),
    };
  });
}

export function getVisibleHexCoords(settings: HeatmapSettings) {
  const bounds = getGridBounds(settings);
  const corners = [
    { x: bounds.minX, y: bounds.minY },
    { x: bounds.maxX, y: bounds.minY },
    { x: bounds.maxX, y: bounds.maxY },
    { x: bounds.minX, y: bounds.maxY },
  ].map((corner) =>
    pointToRawAxial(corner, settings.origin, settings.cellSize),
  );
  const margin = 4;
  const qMin =
    Math.floor(Math.min(...corners.map((corner) => corner.q))) - margin;
  const qMax =
    Math.ceil(Math.max(...corners.map((corner) => corner.q))) + margin;
  const rMin =
    Math.floor(Math.min(...corners.map((corner) => corner.r))) - margin;
  const rMax =
    Math.ceil(Math.max(...corners.map((corner) => corner.r))) + margin;
  const coords: Array<{ q: number; r: number }> = [];

  for (let q = qMin; q <= qMax; q += 1) {
    for (let r = rMin; r <= rMax; r += 1) {
      const center = getHexCellCenter(q, r, settings);
      if (
        center.x < -settings.cellSize * 2 ||
        center.y < -settings.cellSize * 2 ||
        center.x > settings.canvasSize + settings.cellSize * 2 ||
        center.y > settings.canvasSize + settings.cellSize * 2
      ) {
        continue;
      }
      coords.push({ q, r });
    }
  }
  return coords;
}

export function getHexCellValues(
  points: Point[],
  settings: HeatmapSettings,
): CellValues {
  const values: CellValues = new Map();

  for (const point of points) {
    const gridPoint = toGridSpace(
      point,
      settings.canvasSize,
      settings.orientation,
    );
    const { q, r } = pointToAxial(
      gridPoint,
      settings.origin,
      settings.cellSize,
    );
    const key = hexKey(q, r);
    values.set(key, (values.get(key) ?? 0) + 1);
  }

  return values;
}

function triangleCellGridPolygon(
  ix: number,
  iy: number,
  settings: HeatmapSettings,
): Point[] {
  const side = settings.cellSize;
  const height = side * TRIANGLE_HEIGHT_RATIO;
  const x0 = settings.origin.x + ix * (side / 2);
  const y0 = settings.origin.y + iy * height;

  if ((ix + iy) % 2 === 0) {
    return [
      { x: x0, y: y0 + height },
      { x: x0 + side / 2, y: y0 },
      { x: x0 + side, y: y0 + height },
    ];
  }

  return [
    { x: x0, y: y0 },
    { x: x0 + side, y: y0 },
    { x: x0 + side / 2, y: y0 + height },
  ];
}

export function getTriangleCellPolygon(
  ix: number,
  iy: number,
  settings: HeatmapSettings,
): Point[] {
  return triangleCellGridPolygon(ix, iy, settings).map((point) =>
    toCanvasSpace(point, settings.canvasSize, settings.orientation),
  );
}

export function getVisibleTriangleCoords(settings: HeatmapSettings) {
  const bounds = getGridBounds(settings);
  const side = settings.cellSize;
  const height = side * TRIANGLE_HEIGHT_RATIO;
  const coords: Array<{ ix: number; iy: number }> = [];
  const ixMin = Math.floor((bounds.minX - settings.origin.x) / (side / 2)) - 3;
  const ixMax = Math.ceil((bounds.maxX - settings.origin.x) / (side / 2)) + 3;
  const iyMin = Math.floor((bounds.minY - settings.origin.y) / height) - 3;
  const iyMax = Math.ceil((bounds.maxY - settings.origin.y) / height) + 3;

  for (let iy = iyMin; iy <= iyMax; iy += 1) {
    for (let ix = ixMin; ix <= ixMax; ix += 1) {
      coords.push({ ix, iy });
    }
  }
  return coords;
}

export function getTriangleCellValues(
  points: Point[],
  settings: HeatmapSettings,
): CellValues {
  const values: CellValues = new Map();
  const side = settings.cellSize;
  const height = side * TRIANGLE_HEIGHT_RATIO;

  for (const point of points) {
    const gridPoint = toGridSpace(
      point,
      settings.canvasSize,
      settings.orientation,
    );
    const ixBase = Math.floor((gridPoint.x - settings.origin.x) / (side / 2));
    const iyBase = Math.floor((gridPoint.y - settings.origin.y) / height);
    let matchedIx = ixBase;
    let matchedIy = iyBase;
    let bestDistance = Number.POSITIVE_INFINITY;
    let found = false;

    for (let iy = iyBase - 1; iy <= iyBase + 1; iy += 1) {
      for (let ix = ixBase - 2; ix <= ixBase + 2; ix += 1) {
        const polygon = triangleCellGridPolygon(ix, iy, settings);
        if (
          d3.polygonContains(
            polygon.map((polygonPoint) => [polygonPoint.x, polygonPoint.y]),
            [gridPoint.x, gridPoint.y],
          )
        ) {
          matchedIx = ix;
          matchedIy = iy;
          found = true;
          break;
        }

        const centroid = averagePoint(polygon);
        const distance = Math.hypot(
          gridPoint.x - centroid.x,
          gridPoint.y - centroid.y,
        );
        if (distance < bestDistance) {
          bestDistance = distance;
          matchedIx = ix;
          matchedIy = iy;
        }
      }

      if (found) {
        break;
      }
    }

    const key = triangleKey(matchedIx, matchedIy);
    values.set(key, (values.get(key) ?? 0) + 1);
  }

  return values;
}

function seededPair(gx: number, gy: number, salt = 0) {
  return mulberry32(
    (((gx + 2048) * 73856093) ^
      ((gy + 4096) * 19349663) ^
      (salt * 83492791)) >>>
      0,
  );
}

function createAxisOffsetResolver(baseSpacing: number, salt: number) {
  const cache = new Map<number, number>([[0, 0]]);

  const resolve = (index: number): number => {
    const cached = cache.get(index);
    if (cached != null) {
      return cached;
    }

    const step = index > 0 ? 1 : -1;
    const previous = resolve(index - step);
    const segmentIndex = step > 0 ? index - 1 : index;
    const rand = mulberry32(hashString(`${salt}:${segmentIndex}`));
    const localScale = 0.68 + rand() * 0.82;
    const value = previous + step * baseSpacing * localScale;
    cache.set(index, value);
    return value;
  };

  return resolve;
}

function toStablePostcodeSpace(point: Point, settings: HeatmapSettings): Point {
  const gridPoint = toGridSpace(
    point,
    settings.canvasSize,
    settings.orientation,
  );
  return {
    x: gridPoint.x - settings.origin.x,
    y: gridPoint.y - settings.origin.y,
  };
}

function hashString(value: string) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function getPostcodeEdgeKey(
  start: Point,
  end: Point,
  settings: HeatmapSettings,
) {
  const ordered = [start, end]
    .map((point) => toStablePostcodeSpace(point, settings))
    .sort((left, right) => {
      if (left.x === right.x) {
        return left.y - right.y;
      }

      return left.x - right.x;
    });

  return `${ordered[0].x.toFixed(2)},${ordered[0].y.toFixed(2)}|${ordered[1].x.toFixed(2)},${ordered[1].y.toFixed(2)}`;
}

function generatePostcodeEdgeLine(
  start: Point,
  end: Point,
  roughness: number,
  edgeKey: string,
  depth = 0,
): Point[] {
  if (depth >= roughness) {
    return [start, end];
  }

  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const distance = Math.hypot(dx, dy);
  if (distance < 6) {
    return [start, end];
  }

  const rand = mulberry32(hashString(`${edgeKey}:${depth}`));
  const midpoint = lerpPoint(start, end, 0.5);
  const normalX = -dy / distance;
  const normalY = dx / distance;
  const magnitude = ((rand() - 0.5) * distance * 0.22) / (depth + 1.35);
  const displacedMidpoint = {
    x: midpoint.x + normalX * magnitude,
    y: midpoint.y + normalY * magnitude,
  };

  const left = generatePostcodeEdgeLine(
    start,
    displacedMidpoint,
    roughness,
    edgeKey,
    depth + 1,
  );
  const right = generatePostcodeEdgeLine(
    displacedMidpoint,
    end,
    roughness,
    edgeKey,
    depth + 1,
  );

  return [...left.slice(0, -1), ...right];
}

function orientEdgeLine(line: Point[], start: Point) {
  const first = line[0];
  const last = line[line.length - 1];
  const firstDistance = Math.hypot(start.x - first.x, start.y - first.y);
  const lastDistance = Math.hypot(start.x - last.x, start.y - last.y);
  return firstDistance <= lastDistance ? line : [...line].reverse();
}

function buildPostcodePolygonFromEdges(
  polygon: Point[],
  edgeCache: Map<string, Point[]>,
  settings: HeatmapSettings,
): Point[] {
  const rebuilt: Point[] = [];

  for (let edgeIndex = 0; edgeIndex < polygon.length; edgeIndex += 1) {
    const start = polygon[edgeIndex];
    const end = polygon[(edgeIndex + 1) % polygon.length];
    const edgeKey = getPostcodeEdgeKey(start, end, settings);
    const cachedLine = edgeCache.get(edgeKey);
    if (!cachedLine) {
      continue;
    }

    const oriented = orientEdgeLine(cachedLine, start);
    if (edgeIndex === 0) {
      rebuilt.push(...oriented);
    } else {
      rebuilt.push(...oriented.slice(1));
    }
  }

  return rebuilt;
}

function getPostcodeSeed(
  gx: number,
  gy: number,
  settings: HeatmapSettings,
  resolveColumn: (index: number) => number,
  resolveRow: (index: number) => number,
): Point {
  const rand = seededPair(gx, gy, 11);
  const spacing = settings.cellSize * POSTCODE_SPACING_RATIO;
  const sizeRand = seededPair(gx, gy, 19);
  const districtScale = 0.74 + sizeRand() * 0.72;
  const columnOffset = resolveColumn(gx);
  const rowOffset = resolveRow(gy);
  const waveX =
    Math.sin(gx * 0.23 + gy * 0.58) * spacing * 0.39 +
    Math.cos((gx - gy) * 0.19) * spacing * 0.15;
  const waveY =
    Math.cos(gy * 0.27 - gx * 0.51) * spacing * 0.4 +
    Math.sin((gx + gy) * 0.17) * spacing * 0.16;
  const jitterX = (rand() - 0.5) * spacing * (0.2 + districtScale * 0.11);
  const jitterY = (rand() - 0.5) * spacing * (0.2 + districtScale * 0.11);

  return {
    x:
      settings.origin.x +
      columnOffset +
      spacing * (0.48 + (districtScale - 1) * 0.22) +
      waveX +
      jitterX,
    y:
      settings.origin.y +
      rowOffset +
      spacing * (0.5 + (districtScale - 1) * 0.18) +
      waveY +
      jitterY,
  };
}

export function getPostcodeCells(settings: HeatmapSettings) {
  const bounds = getGridBounds(settings);
  const spacing = settings.cellSize * POSTCODE_SPACING_RATIO;
  const margin = 4;
  const gxMin =
    Math.floor((bounds.minX - settings.origin.x) / spacing) - margin;
  const gxMax = Math.ceil((bounds.maxX - settings.origin.x) / spacing) + margin;
  const gyMin =
    Math.floor((bounds.minY - settings.origin.y) / spacing) - margin;
  const gyMax = Math.ceil((bounds.maxY - settings.origin.y) / spacing) + margin;
  const resolveColumn = createAxisOffsetResolver(spacing, 101);
  const resolveRow = createAxisOffsetResolver(spacing, 211);

  const seeds: PostcodeSeed[] = [];
  for (let gy = gyMin; gy <= gyMax; gy += 1) {
    for (let gx = gxMin; gx <= gxMax; gx += 1) {
      const gridPoint = getPostcodeSeed(
        gx,
        gy,
        settings,
        resolveColumn,
        resolveRow,
      );
      const canvasPoint = toCanvasSpace(
        gridPoint,
        settings.canvasSize,
        settings.orientation,
      );
      seeds.push({
        gx,
        gy,
        key: postcodeKey(gx, gy),
        gridPoint,
        canvasPoint: [canvasPoint.x, canvasPoint.y],
      });
    }
  }

  const voronoi = d3.Delaunay.from(
    seeds,
    (seed) => seed.canvasPoint[0],
    (seed) => seed.canvasPoint[1],
  ).voronoi([
    -settings.cellSize * 2,
    -settings.cellSize * 2,
    settings.canvasSize + settings.cellSize * 2,
    settings.canvasSize + settings.cellSize * 2,
  ]);

  const edgeCache = new Map<string, Point[]>();
  seeds.forEach((_, index) => {
    const polygon = voronoi.cellPolygon(index) as [number, number][] | null;
    if (!polygon) {
      return;
    }

    const vertices = polygon.slice(0, -1).map(([x, y]) => ({ x, y }));
    for (let edgeIndex = 0; edgeIndex < vertices.length; edgeIndex += 1) {
      const start = vertices[edgeIndex];
      const end = vertices[(edgeIndex + 1) % vertices.length];
      const edgeKey = getPostcodeEdgeKey(start, end, settings);
      if (!edgeCache.has(edgeKey)) {
        edgeCache.set(
          edgeKey,
          generatePostcodeEdgeLine(start, end, 2, edgeKey),
        );
      }
    }
  });

  return seeds
    .map((seed, index) => {
      const polygon = voronoi.cellPolygon(index) as [number, number][] | null;
      if (!polygon) {
        return null;
      }

      const organicPolygon = buildPostcodePolygonFromEdges(
        polygon.slice(0, -1).map(([x, y]) => ({ x, y })),
        edgeCache,
        settings,
      );

      if (
        !polygonIntersectsCanvas(
          organicPolygon,
          settings.canvasSize,
          settings.cellSize,
        )
      ) {
        return null;
      }

      return {
        key: seed.key,
        polygon: organicPolygon,
      };
    })
    .filter((cell): cell is { key: string; polygon: Point[] } => cell !== null);
}

export function getPostcodeCellValues(
  points: Point[],
  settings: HeatmapSettings,
): CellValues {
  const values: CellValues = new Map();
  const cells = getPostcodeCells(settings);

  points.forEach((point) => {
    const cell = cells.find((candidate) =>
      d3.polygonContains(
        candidate.polygon.map((polygonPoint) => [
          polygonPoint.x,
          polygonPoint.y,
        ]),
        [point.x, point.y],
      ),
    );

    if (!cell) {
      return;
    }

    values.set(cell.key, (values.get(cell.key) ?? 0) + 1);
  });

  return values;
}

export function getGridCellValues(
  points: Point[],
  settings: HeatmapSettings,
): CellValues {
  if (settings.gridType === "square") {
    return getSquareCellValues(points, settings);
  }
  if (settings.gridType === "triangle") {
    return getTriangleCellValues(points, settings);
  }
  if (settings.gridType === "postcode") {
    return getPostcodeCellValues(points, settings);
  }
  return getHexCellValues(points, settings);
}

function parseHexColor(hex: string) {
  const clean = hex.replace("#", "");
  const full =
    clean.length === 3
      ? clean
          .split("")
          .map((char) => char + char)
          .join("")
      : clean;
  return {
    r: parseInt(full.slice(0, 2), 16),
    g: parseInt(full.slice(2, 4), 16),
    b: parseInt(full.slice(4, 6), 16),
  };
}

export function colorForValue(
  value: number,
  maxValue: number,
  palette: readonly string[] = DEFAULT_HEATMAP_PALETTE,
) {
  if (value <= 0 || maxValue <= 0) {
    return "transparent";
  }

  const t = clamp(value / maxValue, 0, 1);
  const scaled = t * (palette.length - 1);
  const index = Math.floor(scaled);
  const localT = scaled - index;
  const start = parseHexColor(palette[index]);
  const end = parseHexColor(palette[Math.min(index + 1, palette.length - 1)]);

  const channel = (from: number, to: number) =>
    Math.round(from + (to - from) * localT);

  return `rgb(${channel(start.r, end.r)}, ${channel(start.g, end.g)}, ${channel(start.b, end.b)})`;
}

export function getMaxCellValue(values: CellValues) {
  let maxValue = 0;
  for (const value of values.values()) {
    if (value > maxValue) {
      maxValue = value;
    }
  }
  return maxValue;
}

export function buildSquareMatrix(points: Point[], settings: HeatmapSettings) {
  const values = getSquareCellValues(points, settings);
  const range = getSquareVisibleRange(settings);
  const rows: number[][] = [];

  for (let iy = range.iyMin; iy <= range.iyMax; iy += 1) {
    const row: number[] = [];
    for (let ix = range.ixMin; ix <= range.ixMax; ix += 1) {
      row.push(values.get(squareKey(ix, iy)) ?? 0);
    }
    rows.push(row);
  }

  return { matrix: rows, range };
}

export function matrixToSquareCellValues(
  matrix: number[][],
  range: SquareVisibleRange,
): CellValues {
  const values: CellValues = new Map();

  matrix.forEach((row, rowIndex) => {
    row.forEach((value, columnIndex) => {
      if (!Number.isFinite(value) || value <= 0) {
        return;
      }
      const ix = range.ixMin + columnIndex;
      const iy = range.iyMin + rowIndex;
      values.set(squareKey(ix, iy), value);
    });
  });

  return values;
}

export function nudgeOrigin(origin: Origin, dx: number, dy: number) {
  return {
    x: origin.x + dx,
    y: origin.y + dy,
  };
}

export function describeGrid(gridType: GridType) {
  if (gridType === "square") {
    return "Square grid";
  }
  if (gridType === "triangle") {
    return "Equilateral triangle grid";
  }
  if (gridType === "postcode") {
    return "Organic postcode districts";
  }
  return "Hex grid";
}
