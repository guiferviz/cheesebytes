import { useEffect, useRef, useState } from "react";
import * as d3 from "d3";
import "./fantastic-lands-theme.css";

type Point = [number, number];

interface WorldData {
  width: number;
  height: number;
  polygons: Array<Point[] | null>;
  provinceCountry: number[];
  edgeToProvinces: Map<string, number[]>;
  edgeCache: Map<string, Point[]>;
  countryColors: number[];
}

interface VectorLine {
  start: Point;
  end: Point;
}

const MAP_COLORS = [
  "#2d5a27",
  "#c29b61",
  "#5a6b2d",
  "#1e3d24",
  "#8b9a47",
  "#a3b18a",
  "#d4a373",
  "#606c38",
];

const SEA_DEEP = "#082f49";
const SEA_LIGHT = "#0c4a6e";
const INITIAL_FRACTAL_POINTS: Point[] = [
  [50, 150],
  [750, 150],
];

function useElementWidth<T extends HTMLElement>(
  ref: React.RefObject<T | null>,
) {
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const node = ref.current;
    if (!node) {
      return;
    }

    const updateSize = () => {
      setWidth(node.clientWidth);
    };

    updateSize();

    const observer = new ResizeObserver(updateSize);
    observer.observe(node);

    return () => observer.disconnect();
  }, [ref]);

  return width;
}

function prepareCanvas(
  canvas: HTMLCanvasElement,
  width: number,
  height: number,
) {
  const ratio = window.devicePixelRatio || 1;

  canvas.width = Math.max(1, Math.floor(width * ratio));
  canvas.height = Math.max(1, Math.floor(height * ratio));
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;

  const context = canvas.getContext("2d");
  if (!context) {
    return null;
  }

  context.setTransform(ratio, 0, 0, ratio, 0, 0);
  return context;
}

function getEdgeKey(p1: Point, p2: Point) {
  const ordered = [p1, p2].sort((left, right) => {
    if (left[0] === right[0]) {
      return left[1] - right[1];
    }

    return left[0] - right[0];
  });

  return `${ordered[0][0].toFixed(1)},${ordered[0][1].toFixed(1)}|${ordered[1][0].toFixed(1)},${ordered[1][1].toFixed(1)}`;
}

function pseudoNoise(x: number, y: number) {
  let value = Math.sin(x * 0.012) * Math.cos(y * 0.012);
  value += Math.sin(x * 0.04 + y * 0.02) * 0.5;
  value += Math.cos(x * 0.02 - y * 0.05) * 0.3;
  return value;
}

function generateFractalLine(
  start: Point,
  end: Point,
  maxDepth: number,
  depth = 0,
): Point[] {
  if (depth >= maxDepth) {
    return [start, end];
  }

  const dx = end[0] - start[0];
  const dy = end[1] - start[1];
  const distance = Math.hypot(dx, dy);

  if (distance < 0.001) {
    return [start, end];
  }

  const midX = (start[0] + end[0]) / 2;
  const midY = (start[1] + end[1]) / 2;
  const magnitude = ((Math.random() - 0.5) * distance * 0.4) / (depth + 1);
  const normalX = -dy / distance;
  const normalY = dx / distance;
  const midpoint: Point = [
    midX + normalX * magnitude,
    midY + normalY * magnitude,
  ];

  const left = generateFractalLine(start, midpoint, maxDepth, depth + 1);
  const right = generateFractalLine(midpoint, end, maxDepth, depth + 1);

  return [...left.slice(0, -1), ...right];
}

function createMapWorld(
  width: number,
  height: number,
  countryCount: number,
  islandSize: number,
  roughness: number,
): WorldData {
  const numProvinces = 600;
  let points: Point[] = Array.from({ length: numProvinces }, () => [
    Math.random() * width,
    Math.random() * height,
  ]);

  for (let step = 0; step < 3; step += 1) {
    const voronoi = d3.Delaunay.from(points).voronoi([0, 0, width, height]);
    points = points.map((point, index) => {
      const polygon = voronoi.cellPolygon(index) as Point[] | null;
      if (!polygon) {
        return point;
      }

      const [centerX, centerY] = d3.polygonCentroid(polygon);
      return [centerX, centerY];
    });
  }

  const voronoi = d3.Delaunay.from(points).voronoi([0, 0, width, height]);
  const polygons = points.map((_, index) => {
    const polygon = voronoi.cellPolygon(index) as Point[] | null;
    if (!polygon) {
      return null;
    }

    return polygon.map((point) => [point[0], point[1]] as Point);
  });

  const isWater = new Array(numProvinces).fill(false);
  const centerX = width / 2;
  const centerY = height / 2;
  const maxRadius = Math.min(width, height) / 2;

  for (let index = 0; index < points.length; index += 1) {
    const polygon = polygons[index];
    if (!polygon) {
      isWater[index] = true;
      continue;
    }

    if (
      polygon.some(
        (point) =>
          point[0] <= 5 ||
          point[0] >= width - 5 ||
          point[1] <= 5 ||
          point[1] >= height - 5,
      )
    ) {
      isWater[index] = true;
      continue;
    }

    const distanceToCenter =
      Math.hypot(points[index][0] - centerX, points[index][1] - centerY) /
      maxRadius;
    const noise = pseudoNoise(points[index][0], points[index][1]);

    if (distanceToCenter > islandSize + noise * 0.5) {
      isWater[index] = true;
    }
  }

  const lakeCount = Math.floor(Math.random() * 6) + 3;
  for (let lake = 0; lake < lakeCount; lake += 1) {
    const seed = Math.floor(Math.random() * numProvinces);
    if (isWater[seed]) {
      continue;
    }

    isWater[seed] = true;
    for (const neighbor of voronoi.neighbors(seed)) {
      if (Math.random() < 0.7) {
        isWater[neighbor] = true;

        for (const secondNeighbor of voronoi.neighbors(neighbor)) {
          if (Math.random() < 0.4) {
            isWater[secondNeighbor] = true;
          }
        }
      }
    }
  }

  const landIndices = isWater.reduce<number[]>((indices, water, index) => {
    if (!water) {
      indices.push(index);
    }

    return indices;
  }, []);

  if (landIndices.length === 0) {
    const fallback = Math.floor(numProvinces / 2);
    isWater[fallback] = false;
    landIndices.push(fallback);
  }

  const availableLand = [...landIndices];
  const seeds: number[] = [];
  for (let index = 0; index < countryCount; index += 1) {
    if (availableLand.length === 0) {
      break;
    }

    const choice = Math.floor(Math.random() * availableLand.length);
    seeds.push(availableLand[choice]);
    availableLand.splice(choice, 1);
  }

  const provinceCountry = points.map((point, index) => {
    if (isWater[index]) {
      return -1;
    }

    let bestCountry = 0;
    let bestDistance = Number.POSITIVE_INFINITY;

    seeds.forEach((seedIndex, countryIndex) => {
      const distance = Math.hypot(
        point[0] - points[seedIndex][0],
        point[1] - points[seedIndex][1],
      );

      if (distance < bestDistance) {
        bestDistance = distance;
        bestCountry = countryIndex;
      }
    });

    return bestCountry;
  });

  const edgeToProvinces = new Map<string, number[]>();
  const edgeCache = new Map<string, Point[]>();

  polygons.forEach((polygon, provinceIndex) => {
    if (!polygon) {
      return;
    }

    for (let edgeIndex = 0; edgeIndex < polygon.length - 1; edgeIndex += 1) {
      const start = polygon[edgeIndex];
      const end = polygon[edgeIndex + 1];
      const key = getEdgeKey(start, end);

      if (!edgeToProvinces.has(key)) {
        edgeToProvinces.set(key, []);
      }

      edgeToProvinces.get(key)?.push(provinceIndex);

      if (!edgeCache.has(key)) {
        edgeCache.set(key, generateFractalLine(start, end, roughness));
      }
    }
  });

  const countryNeighbors = Array.from(
    { length: countryCount },
    () => new Set<number>(),
  );
  edgeToProvinces.forEach((provinces) => {
    if (provinces.length < 2) {
      return;
    }

    const countryA = provinceCountry[provinces[0]];
    const countryB = provinceCountry[provinces[1]];
    if (countryA === -1 || countryB === -1 || countryA === countryB) {
      return;
    }

    countryNeighbors[countryA].add(countryB);
    countryNeighbors[countryB].add(countryA);
  });

  const countryColors = new Array(countryCount).fill(-1);
  for (let index = 0; index < countryCount; index += 1) {
    const usedColors = new Set<number>();
    countryNeighbors[index].forEach((neighbor) => {
      const color = countryColors[neighbor];
      if (color !== -1) {
        usedColors.add(color);
      }
    });

    let nextColor = 0;
    while (usedColors.has(nextColor)) {
      nextColor += 1;
    }

    countryColors[index] = nextColor;
  }

  return {
    width,
    height,
    polygons,
    provinceCountry,
    edgeToProvinces,
    edgeCache,
    countryColors,
  };
}

function drawMapWorld(
  context: CanvasRenderingContext2D,
  world: WorldData,
  showSubregions: boolean,
) {
  const {
    width,
    height,
    polygons,
    provinceCountry,
    edgeToProvinces,
    edgeCache,
    countryColors,
  } = world;

  const background = context.createRadialGradient(
    width / 2,
    height / 2,
    0,
    width / 2,
    height / 2,
    width / 1.2,
  );
  background.addColorStop(0, SEA_LIGHT);
  background.addColorStop(1, SEA_DEEP);
  context.fillStyle = background;
  context.fillRect(0, 0, width, height);

  polygons.forEach((polygon, provinceIndex) => {
    const country = provinceCountry[provinceIndex];
    if (country === -1 || !polygon) {
      return;
    }

    context.beginPath();
    context.fillStyle = MAP_COLORS[countryColors[country] % MAP_COLORS.length];

    for (let edgeIndex = 0; edgeIndex < polygon.length - 1; edgeIndex += 1) {
      const start = polygon[edgeIndex];
      const end = polygon[edgeIndex + 1];
      const key = getEdgeKey(start, end);
      const cachedLine = edgeCache.get(key);

      if (!cachedLine) {
        continue;
      }

      const orientedLine =
        Math.hypot(start[0] - cachedLine[0][0], start[1] - cachedLine[0][1]) > 1
          ? [...cachedLine].reverse()
          : cachedLine;

      if (edgeIndex === 0) {
        context.moveTo(orientedLine[0][0], orientedLine[0][1]);
      }

      orientedLine.forEach((point) => {
        context.lineTo(point[0], point[1]);
      });
    }

    context.fill();
    context.strokeStyle = showSubregions
      ? "rgba(0, 0, 0, 0.15)"
      : context.fillStyle;
    context.lineWidth = showSubregions ? 0.5 : 1;
    context.stroke();
  });

  const coastPath = new Path2D();
  const borderPath = new Path2D();

  edgeCache.forEach((fractalPath, key) => {
    const provinces = edgeToProvinces.get(key);
    if (!provinces) {
      return;
    }

    let isCoast = false;
    let isBorder = false;

    if (provinces.length === 1) {
      if (provinceCountry[provinces[0]] !== -1) {
        isCoast = true;
      }
    } else {
      const countryA = provinceCountry[provinces[0]];
      const countryB = provinceCountry[provinces[1]];

      if (
        (countryA === -1 && countryB !== -1) ||
        (countryA !== -1 && countryB === -1)
      ) {
        isCoast = true;
      } else if (countryA !== -1 && countryB !== -1 && countryA !== countryB) {
        isBorder = true;
      }
    }

    if (isCoast) {
      coastPath.moveTo(fractalPath[0][0], fractalPath[0][1]);
      for (let index = 1; index < fractalPath.length; index += 1) {
        coastPath.lineTo(fractalPath[index][0], fractalPath[index][1]);
      }
    } else if (isBorder && !showSubregions) {
      borderPath.moveTo(fractalPath[0][0], fractalPath[0][1]);
      for (let index = 1; index < fractalPath.length; index += 1) {
        borderPath.lineTo(fractalPath[index][0], fractalPath[index][1]);
      }
    }
  });

  if (!showSubregions) {
    context.strokeStyle = "rgba(0, 0, 0, 0.4)";
    context.lineWidth = 1.5;
    context.stroke(borderPath);
  }

  context.strokeStyle = "#7dd3fc";
  context.lineWidth = 1.5;
  context.globalAlpha = 0.6;
  context.stroke(coastPath);
  context.lineWidth = 4;
  context.globalAlpha = 0.2;
  context.stroke(coastPath);
  context.globalAlpha = 1;
}

function createSweepPoints(width: number, height: number) {
  return Array.from(
    { length: 25 },
    () =>
      [
        Math.random() * (width - 40) + 20,
        Math.random() * (height - 100) + 20,
      ] as Point,
  );
}

function buildNextFractalLevel(
  points: Point[],
  roughness: number,
  decay: number,
  level: number,
) {
  const currentMultiplier = roughness * Math.pow(decay, level);
  const nextPoints: Point[] = [points[0]];
  const vectors: VectorLine[] = [];

  for (let index = 0; index < points.length - 1; index += 1) {
    const start = points[index];
    const end = points[index + 1];
    const dx = end[0] - start[0];
    const dy = end[1] - start[1];
    const distance = Math.hypot(dx, dy);

    if (distance < 0.001) {
      nextPoints.push(end);
      continue;
    }

    const midpointX = (start[0] + end[0]) / 2;
    const midpointY = (start[1] + end[1]) / 2;
    const normalX = -dy / distance;
    const normalY = dx / distance;
    const magnitude = (Math.random() - 0.5) * distance * currentMultiplier;
    const offset: Point = [
      midpointX + normalX * magnitude,
      midpointY + normalY * magnitude,
    ];

    if (level < 2) {
      vectors.push({
        start: [midpointX, midpointY],
        end: offset,
      });
    }

    nextPoints.push(offset, end);
  }

  return { nextPoints, vectors };
}

function SliderField(props: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  accent: string;
  onChange: (value: number) => void;
  leftLabel?: string;
  rightLabel?: string;
  hint?: string;
  displayValue?: string;
}) {
  const {
    label,
    value,
    min,
    max,
    step,
    accent,
    onChange,
    leftLabel,
    rightLabel,
    hint,
    displayValue,
  } = props;

  return (
    <div className="geo-fractal-field">
      <div className="geo-fractal-label">
        <span>{label}</span>
        {displayValue ? <span>{displayValue}</span> : null}
      </div>
      <input
        className="geo-fractal-range"
        style={{ accentColor: accent }}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
      />
      {leftLabel || rightLabel ? (
        <div className="geo-fractal-range-copy">
          <span>{leftLabel}</span>
          <span>{rightLabel}</span>
        </div>
      ) : null}
      {hint ? <p className="geo-fractal-hint">{hint}</p> : null}
    </div>
  );
}

export function ContinentalMapGenerator() {
  const stageRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stageWidth = useElementWidth(stageRef);
  const [countryCount, setCountryCount] = useState(12);
  const [islandSize, setIslandSize] = useState(0.75);
  const [roughness, setRoughness] = useState(3);
  const [showSubregions, setShowSubregions] = useState(false);
  const [worldVersion, setWorldVersion] = useState(0);
  const [worldData, setWorldData] = useState<WorldData | null>(null);

  const mapSide = Math.min(760, Math.max(280, Math.floor(stageWidth - 32)));

  useEffect(() => {
    if (stageWidth < 240) {
      return;
    }

    setWorldData(
      createMapWorld(mapSide, mapSide, countryCount, islandSize, roughness),
    );
  }, [countryCount, islandSize, mapSide, roughness, stageWidth, worldVersion]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !worldData) {
      return;
    }

    const context = prepareCanvas(canvas, worldData.width, worldData.height);
    if (!context) {
      return;
    }

    drawMapWorld(context, worldData, showSubregions);
  }, [showSubregions, worldData]);

  return (
    <div className="geo-fractal-studio">
      <aside className="geo-fractal-panel">
        <div className="geo-fractal-panel-inner">
          <div>
            <p className="geo-fractal-eyebrow">Fantastic Lands</p>
            <div className="geo-fractal-header-row">
              <span
                className="geo-fractal-dot"
                style={{ background: "#38bdf8" }}
              />
              <h2 className="geo-fractal-heading geo-fractal-accent-sky">
                Continental Map Generator
              </h2>
            </div>
            <p className="geo-fractal-copy">
              Generate landmasses surrounded by deep ocean and assign colors so
              neighboring nations stay visually distinct.
            </p>
          </div>

          <div className="geo-fractal-stack">
            <SliderField
              accent="#38bdf8"
              label="Number of nations"
              value={countryCount}
              min={2}
              max={50}
              onChange={setCountryCount}
              leftLabel="2"
              rightLabel="50 nations"
              displayValue={String(countryCount)}
            />

            <SliderField
              accent="#38bdf8"
              label="Island size"
              value={islandSize}
              min={0.3}
              max={1.2}
              step={0.05}
              onChange={setIslandSize}
              displayValue={islandSize.toFixed(2)}
              hint="Lower values tend to produce archipelagos and more intricate coastlines."
            />

            <SliderField
              accent="#38bdf8"
              label="Fractal detail"
              value={roughness}
              min={1}
              max={5}
              onChange={setRoughness}
              leftLabel="1"
              rightLabel="5 iterations"
              displayValue={String(roughness)}
            />

            <div className="geo-fractal-toggle">
              <input
                id="show-subregions"
                style={{ accentColor: "#38bdf8" }}
                type="checkbox"
                checked={showSubregions}
                onChange={(event) => setShowSubregions(event.target.checked)}
              />
              <label htmlFor="show-subregions">Provincial lines</label>
            </div>

            <button
              className="geo-fractal-button"
              style={{ background: "#0284c7" }}
              type="button"
              onClick={() => setWorldVersion((version) => version + 1)}
            >
              Generate New World
            </button>

            <p className="geo-fractal-hint">
              The sea, border, and land palette stay faithful to the original
              visual reference while the sliders control the next generated map.
            </p>
          </div>
        </div>
      </aside>

      <div className="geo-fractal-stage" ref={stageRef}>
        <canvas className="geo-fractal-canvas" ref={canvasRef} />
      </div>
    </div>
  );
}

export function FortuneSweepLineVisual() {
  const stageRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stageWidth = useElementWidth(stageRef);
  const [points, setPoints] = useState<Point[]>([]);
  const [isPlaying, setIsPlaying] = useState(true);
  const [sweepValue, setSweepValue] = useState(0);
  const [showAllParabolas, setShowAllParabolas] = useState(true);
  const [resetToken, setResetToken] = useState(0);

  const canvasWidth = Math.min(980, Math.max(320, Math.floor(stageWidth - 32)));
  const canvasHeight = Math.max(360, Math.round(canvasWidth * 0.62));

  useEffect(() => {
    if (stageWidth < 320) {
      return;
    }

    setPoints(createSweepPoints(canvasWidth, canvasHeight));
    setSweepValue(0);
    setIsPlaying(true);
  }, [canvasHeight, canvasWidth, resetToken, stageWidth]);

  useEffect(() => {
    if (!isPlaying) {
      return;
    }

    let animationFrame = 0;
    const loop = () => {
      setSweepValue((currentValue) =>
        currentValue >= 1000 ? 0 : currentValue + 3,
      );
      animationFrame = window.requestAnimationFrame(loop);
    };

    animationFrame = window.requestAnimationFrame(loop);

    return () => window.cancelAnimationFrame(animationFrame);
  }, [isPlaying]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || points.length === 0) {
      return;
    }

    const context = prepareCanvas(canvas, canvasWidth, canvasHeight);
    if (!context) {
      return;
    }

    const voronoi = d3.Delaunay.from(points).voronoi([
      0,
      0,
      canvasWidth,
      canvasHeight,
    ]);
    const sweepY = (sweepValue / 1000) * (canvasHeight + 150);

    context.fillStyle = "#020617";
    context.fillRect(0, 0, canvasWidth, canvasHeight);

    const beachLine: Point[] = [];
    for (let x = 0; x <= canvasWidth; x += 3) {
      let maxY = Number.NEGATIVE_INFINITY;
      let hasParabola = false;

      for (const point of points) {
        if (point[1] >= sweepY - 0.1) {
          continue;
        }

        const denominator = 2 * (point[1] - sweepY);
        if (Math.abs(denominator) < 0.001) {
          continue;
        }

        const parabolaY =
          (Math.pow(x - point[0], 2) + point[1] * point[1] - sweepY * sweepY) /
          denominator;

        if (parabolaY > maxY) {
          maxY = parabolaY;
          hasParabola = true;
        }
      }

      beachLine.push([x, hasParabola ? Math.min(maxY, sweepY) : sweepY]);
    }

    context.save();
    context.beginPath();
    context.moveTo(canvasWidth, 0);
    context.lineTo(0, 0);
    beachLine.forEach(([x, y]) => {
      context.lineTo(x, y);
    });
    context.closePath();
    context.clip();

    context.strokeStyle = "#38bdf8";
    context.lineWidth = 2;
    context.beginPath();
    voronoi.render(context);
    context.stroke();
    context.restore();

    if (showAllParabolas && sweepY > 0) {
      context.strokeStyle = "rgba(255, 255, 255, 0.1)";
      context.lineWidth = 1;

      for (const point of points) {
        if (point[1] >= sweepY - 0.5) {
          continue;
        }

        context.beginPath();
        for (let x = 0; x <= canvasWidth; x += 5) {
          const denominator = 2 * (point[1] - sweepY);
          if (Math.abs(denominator) < 0.001) {
            continue;
          }

          const parabolaY =
            (Math.pow(x - point[0], 2) +
              point[1] * point[1] -
              sweepY * sweepY) /
            denominator;

          if (x === 0) {
            context.moveTo(x, parabolaY);
          } else {
            context.lineTo(x, parabolaY);
          }
        }
        context.stroke();
      }
    }

    context.strokeStyle = "#eab308";
    context.lineWidth = 3;
    context.beginPath();
    beachLine.forEach(([x, y], index) => {
      if (index === 0) {
        context.moveTo(x, y);
      } else {
        context.lineTo(x, y);
      }
    });
    context.stroke();

    context.strokeStyle = "#ec4899";
    context.lineWidth = 2;
    context.beginPath();
    context.moveTo(0, sweepY);
    context.lineTo(canvasWidth, sweepY);
    context.stroke();

    points.forEach((point) => {
      context.fillStyle = point[1] < sweepY ? "#ffffff" : "#475569";
      context.beginPath();
      context.arc(point[0], point[1], 4, 0, Math.PI * 2);
      context.fill();
    });
  }, [canvasHeight, canvasWidth, points, showAllParabolas, sweepValue]);

  return (
    <div className="geo-fractal-studio">
      <aside className="geo-fractal-panel">
        <div className="geo-fractal-panel-inner">
          <div>
            <p className="geo-fractal-eyebrow">Fantastic Lands</p>
            <div className="geo-fractal-header-row">
              <span
                className="geo-fractal-dot"
                style={{ background: "#f472b6" }}
              />
              <h2 className="geo-fractal-heading geo-fractal-accent-fuchsia">
                Fortune Sweep Line
              </h2>
            </div>
            <p className="geo-fractal-copy">
              Watch the sweep line, the beach line, and the finished Voronoi
              edges emerge as the scan moves downward.
            </p>
          </div>

          <div className="geo-fractal-stack">
            <div className="geo-fractal-button-row">
              <button
                className="geo-fractal-button"
                style={{ background: isPlaying ? "#c026d3" : "#334155" }}
                type="button"
                onClick={() => setIsPlaying((playing) => !playing)}
              >
                {isPlaying ? "Pause" : "Play"}
              </button>
            </div>

            <SliderField
              accent="#d946ef"
              label="Manual sweep position"
              value={sweepValue}
              min={0}
              max={1000}
              onChange={(value) => {
                setIsPlaying(false);
                setSweepValue(value);
              }}
              leftLabel="Top"
              rightLabel="Off screen"
              displayValue={`${Math.round((sweepValue / 1000) * 100)}%`}
            />

            <div className="geo-fractal-toggle">
              <input
                id="show-parabolas"
                style={{ accentColor: "#d946ef" }}
                type="checkbox"
                checked={showAllParabolas}
                onChange={(event) => setShowAllParabolas(event.target.checked)}
              />
              <label htmlFor="show-parabolas">Show base parabolas</label>
            </div>

            <button
              className="geo-fractal-button secondary"
              type="button"
              onClick={() => setResetToken((token) => token + 1)}
            >
              New points
            </button>
          </div>

          <div className="geo-fractal-legend">
            <strong className="geo-fractal-accent-fuchsia">
              Visual legend
            </strong>
            <span
              className="geo-fractal-legend-line"
              style={{ color: "#ec4899" }}
            >
              Straight line
            </span>
            The directrix, or sweep line.
            <br />
            <span
              className="geo-fractal-legend-line"
              style={{ color: "#eab308" }}
            >
              Yellow curve
            </span>
            The beach line, formed by the parabola envelope.
            <br />
            <span
              className="geo-fractal-legend-line"
              style={{ color: "#38bdf8" }}
            >
              Blue edges
            </span>
            Completed Voronoi borders.
          </div>
        </div>
      </aside>

      <div className="geo-fractal-stage" ref={stageRef}>
        <canvas className="geo-fractal-canvas" ref={canvasRef} />
      </div>
    </div>
  );
}

export function MidpointFractalBorders() {
  const [roughness, setRoughness] = useState(0.5);
  const [decay, setDecay] = useState(0.8);
  const [history, setHistory] = useState<Point[][]>([INITIAL_FRACTAL_POINTS]);
  const [level, setLevel] = useState(0);
  const [vectors, setVectors] = useState<VectorLine[]>([]);

  const points = history[level] ?? INITIAL_FRACTAL_POINTS;

  useEffect(() => {
    setHistory([INITIAL_FRACTAL_POINTS]);
    setLevel(0);
    setVectors([]);
  }, [decay, roughness]);

  const minY = points.reduce((value, point) => Math.min(value, point[1]), 150);
  const maxY = points.reduce((value, point) => Math.max(value, point[1]), 150);
  let viewBoxY = minY - 60;
  let viewBoxHeight = maxY - minY + 120;
  if (viewBoxHeight < 300) {
    viewBoxY = (minY + maxY) / 2 - 150;
    viewBoxHeight = 300;
  }

  const pathData = points
    .map((point, index) => `${index === 0 ? "M" : "L"} ${point[0]} ${point[1]}`)
    .join(" ");

  return (
    <div className="geo-fractal-studio">
      <aside className="geo-fractal-panel">
        <div className="geo-fractal-panel-inner">
          <div>
            <p className="geo-fractal-eyebrow">Fantastic Lands</p>
            <div className="geo-fractal-header-row">
              <span
                className="geo-fractal-dot"
                style={{ background: "#34d399" }}
              />
              <h2 className="geo-fractal-heading geo-fractal-accent-emerald">
                Midpoint Fractal Borders
              </h2>
            </div>
            <p className="geo-fractal-copy">
              A visual midpoint displacement demo that turns rigid segments into
              borders with natural-looking roughness.
            </p>
          </div>

          <div className="geo-fractal-stack">
            <SliderField
              accent="#10b981"
              label="Roughness"
              value={roughness}
              min={0}
              max={1.5}
              step={0.05}
              onChange={setRoughness}
              displayValue={roughness.toFixed(2)}
            />

            <SliderField
              accent="#10b981"
              label="Decay"
              value={decay}
              min={0.4}
              max={1.2}
              step={0.05}
              onChange={setDecay}
              displayValue={decay.toFixed(2)}
            />

            <div className="geo-fractal-button-row">
              <button
                className="geo-fractal-button secondary"
                type="button"
                disabled={level === 0}
                onClick={() => {
                  setLevel((currentLevel) => Math.max(0, currentLevel - 1));
                  setVectors([]);
                }}
              >
                Previous
              </button>
              <button
                className="geo-fractal-button"
                style={{ background: "#059669" }}
                type="button"
                disabled={level >= 10}
                onClick={() => {
                  if (level < history.length - 1) {
                    setLevel(level + 1);
                    setVectors([]);
                    return;
                  }

                  const nextLevel = buildNextFractalLevel(
                    points,
                    roughness,
                    decay,
                    level,
                  );
                  setHistory([...history, nextLevel.nextPoints]);
                  setLevel(level + 1);
                  setVectors(nextLevel.vectors);
                }}
              >
                Next level
              </button>
            </div>

            <button
              className="geo-fractal-button secondary"
              type="button"
              onClick={() => {
                setHistory([INITIAL_FRACTAL_POINTS]);
                setLevel(0);
                setVectors([]);
              }}
            >
              Reset
            </button>
          </div>
        </div>
      </aside>

      <div className="geo-fractal-stage-shell">
        <div className="geo-fractal-stage-topbar">
          <div>
            <p className="geo-fractal-eyebrow">Organic borders</p>
            <p className="geo-fractal-copy">
              The same geometric move that gives life to a coastline or a
              procedural territorial border.
            </p>
          </div>
          <div className="geo-fractal-level">
            <span>Current level</span>
            <strong className="geo-fractal-accent-emerald">{level}</strong>
          </div>
        </div>

        <div className="geo-fractal-stage">
          <div className="geo-fractal-figure">
            <svg
              aria-label="Fractal border visual"
              className="h-full w-full"
              preserveAspectRatio="xMidYMid meet"
              viewBox={`0 ${viewBoxY} 800 ${viewBoxHeight}`}
            >
              <defs>
                <marker
                  id="geo-fractal-arrow"
                  markerHeight="4"
                  markerWidth="4"
                  orient="auto-start-reverse"
                  refX="5"
                  refY="5"
                  viewBox="0 0 10 10"
                >
                  <path d="M 0 0 L 10 5 L 0 10 z" fill="#10b981" />
                </marker>
              </defs>

              <line
                stroke="#475569"
                strokeDasharray="4"
                strokeWidth="1"
                x1="50"
                x2="750"
                y1="150"
                y2="150"
              />

              {vectors.map((vector, index) => (
                <line
                  key={`${vector.start[0]}-${vector.start[1]}-${index}`}
                  markerEnd="url(#geo-fractal-arrow)"
                  opacity="0.72"
                  stroke="#10b981"
                  strokeWidth="1.5"
                  x1={vector.start[0]}
                  x2={vector.end[0]}
                  y1={vector.start[1]}
                  y2={vector.end[1]}
                />
              ))}

              <path
                d={pathData}
                fill="none"
                stroke="#10b981"
                strokeLinejoin="round"
                strokeWidth="1.6"
              />

              {level < 6
                ? points.map((point, index) => (
                    <circle
                      key={`${point[0]}-${point[1]}-${index}`}
                      cx={point[0]}
                      cy={point[1]}
                      fill="#38bdf8"
                      r={level > 3 ? 1.5 : 3}
                      stroke="#0f172a"
                      strokeWidth="1"
                    />
                  ))
                : null}
            </svg>
          </div>

          <div className="geo-fractal-stage-note">
            <strong>Visual idea:</strong> every level splits each segment in two
            and displaces the midpoint along the normal. Reducing the amplitude
            at each iteration creates an irregular border without losing its
            overall structure.
          </div>
        </div>
      </div>
    </div>
  );
}
