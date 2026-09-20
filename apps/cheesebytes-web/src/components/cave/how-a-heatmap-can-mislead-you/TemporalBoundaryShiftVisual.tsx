import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import type { VimCommand } from "../../../utils/vim-mode";
import { useFullscreen } from "../shared/useFullscreen";

import { HeatmapHudButton, HeatmapVisualCard } from "./shared";
import { useScopedVimMode } from "./useScopedVimMode";

const MONTH_LABELS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
] as const;

const DAILY_CSV_URL =
  "https://gist.githubusercontent.com/kevinyang372/25ab989b33465bdc6fe5f06be3164fda/raw/04bf1f0653979702a96706e3480d124512feb980/%5EGSPC.csv";

const EARLY_2016_DAILY_CLOSES: ReadonlyArray<readonly [string, number]> = [
  ["2016-01-04", 2012.66],
  ["2016-01-05", 2016.71],
  ["2016-01-06", 1990.26],
  ["2016-01-07", 1943.09],
  ["2016-01-08", 1922.03],
  ["2016-01-11", 1923.67],
  ["2016-01-12", 1938.68],
  ["2016-01-13", 1890.28],
  ["2016-01-14", 1921.84],
  ["2016-01-15", 1880.33],
  ["2016-01-19", 1881.33],
  ["2016-01-20", 1859.33],
  ["2016-01-21", 1868.99],
  ["2016-01-22", 1906.9],
  ["2016-01-25", 1877.08],
  ["2016-01-26", 1903.63],
  ["2016-01-27", 1882.95],
  ["2016-01-28", 1893.36],
  ["2016-01-29", 1940.24],
  ["2016-02-01", 1939.38],
  ["2016-02-02", 1903.03],
  ["2016-02-03", 1912.53],
  ["2016-02-04", 1915.45],
  ["2016-02-05", 1880.05],
  ["2016-02-08", 1853.44],
];

const MONTH_WIDTH = 48;
const PLOT_PADDING_X = 72;
const PLOT_TOP = 46;
const PLOT_BOTTOM = 390;
const FULLSCREEN_PLOT_BOTTOM = PLOT_BOTTOM + 200;
const PLOT_START_TIMESTAMP = Date.UTC(2016, 0, 1);
const PLOT_END_TIMESTAMP = Date.UTC(2021, 0, 1);
const PLOT_MONTH_COUNT = 60;
const PLOT_WIDTH =
  PLOT_PADDING_X * 2 + PLOT_MONTH_COUNT * MONTH_WIDTH;
const FOCUS_YEAR = 2018;
const DISPLAY_YEARS = [2017, 2018, 2019, 2020] as const;
const CALENDAR_YEARS = [2016, 2017, 2018, 2019, 2020] as const;
const STORY_CLEAN_HOLD_MS = 750;
const STORY_ARROW_REVEAL_MS = 650;
const STORY_SHIFT_DURATION_MS = 1650;
const MONTH_ANIMATION_DURATION_MS = 680;
const MIN_BOUNDARY_OFFSET = -11;
const MAX_BOUNDARY_OFFSET = 11;

interface DailyPoint {
  date: string;
  timestamp: number;
  value: number;
}

interface ScaleBounds {
  min: number;
  max: number;
  range: number;
}

interface WindowGeometry {
  year: number;
  windowLeftX: number;
  windowRightX: number;
  arrowStartX: number;
  arrowEndX: number;
  startY: number;
  endY: number;
  returnValue: number;
}

interface TrendArrowGeometry {
  shaftX1: number;
  shaftY1: number;
  shaftX2: number;
  shaftY2: number;
  headPoints: string;
}

function timestampForDate(date: string) {
  return Date.parse(date + "T00:00:00Z");
}

function monthStartTimestamp(year: number, month: number) {
  return Date.UTC(year, month, 1);
}

function datePartsFromTimestamp(timestamp: number) {
  const date = new Date(timestamp);
  return {
    year: date.getUTCFullYear(),
    month: date.getUTCMonth(),
  };
}

function formatPercent(value: number) {
  const sign = value > 0 ? "+" : "";
  return sign + (value * 100).toFixed(1) + "%";
}

function lerp(start: number, end: number, progress: number) {
  return start + (end - start) * progress;
}

function easeInOutCubic(progress: number) {
  return progress < 0.5
    ? 4 * progress * progress * progress
    : 1 - Math.pow(-2 * progress + 2, 3) / 2;
}

function clampBoundaryOffset(offset: number) {
  return Math.max(
    MIN_BOUNDARY_OFFSET,
    Math.min(MAX_BOUNDARY_OFFSET, offset),
  );
}

function xForTimestamp(timestamp: number) {
  const ratio =
    (timestamp - PLOT_START_TIMESTAMP) /
    (PLOT_END_TIMESTAMP - PLOT_START_TIMESTAMP);

  return (
    PLOT_PADDING_X +
    ratio * (PLOT_WIDTH - PLOT_PADDING_X * 2)
  );
}

function yForValue(
  value: number,
  plotBottom: number,
  bounds: ScaleBounds,
) {
  const plotHeight = plotBottom - PLOT_TOP;
  return (
    plotBottom -
    ((value - bounds.min) / bounds.range) * plotHeight
  );
}

function scaleBoundsFor(points: DailyPoint[]): ScaleBounds {
  if (points.length === 0) {
    return {
      min: 1750,
      max: 3850,
      range: 2100,
    };
  }

  const values = points.map((point) => point.value);
  const rawMin = Math.min(...values);
  const rawMax = Math.max(...values);
  const padding = (rawMax - rawMin) * 0.06;
  const min = rawMin - padding;
  const max = rawMax + padding;

  return {
    min,
    max,
    range: max - min,
  };
}

function parseDailyCsv(csv: string): DailyPoint[] {
  const points: DailyPoint[] = [];

  for (const line of csv.split(/\r?\n/).slice(1)) {
    if (!line.trim()) continue;

    const columns = line.split(",");
    const date = columns[0]?.trim();
    const close = Number(columns[4]);

    if (!date || !Number.isFinite(close)) continue;

    const timestamp = timestampForDate(date);
    if (
      timestamp < timestampForDate("2016-02-09") ||
      timestamp > timestampForDate("2020-12-31")
    ) {
      continue;
    }

    points.push({
      date,
      timestamp,
      value: close,
    });
  }

  return points;
}

function mergeDailyPoints(remotePoints: DailyPoint[]) {
  const byDate = new Map<string, DailyPoint>();

  for (const [date, value] of EARLY_2016_DAILY_CLOSES) {
    byDate.set(date, {
      date,
      timestamp: timestampForDate(date),
      value,
    });
  }

  for (const point of remotePoints) {
    byDate.set(point.date, point);
  }

  return [...byDate.values()]
    .filter(
      (point) =>
        point.timestamp >= PLOT_START_TIMESTAMP &&
        point.timestamp < PLOT_END_TIMESTAMP,
    )
    .sort((a, b) => a.timestamp - b.timestamp);
}

function pointBefore(
  points: DailyPoint[],
  timestamp: number,
): DailyPoint | null {
  let low = 0;
  let high = points.length - 1;
  let match: DailyPoint | null = null;

  while (low <= high) {
    const middle = Math.floor((low + high) / 2);
    const point = points[middle];

    if (point.timestamp < timestamp) {
      match = point;
      low = middle + 1;
    } else {
      high = middle - 1;
    }
  }

  return match;
}

function integerWindowGeometry(
  year: number,
  boundaryOffset: number,
  points: DailyPoint[],
  plotBottom: number,
  bounds: ScaleBounds,
): WindowGeometry | null {
  const startBoundary = monthStartTimestamp(year, boundaryOffset);
  const endBoundary = monthStartTimestamp(year, boundaryOffset + 12);

  if (
    startBoundary < PLOT_START_TIMESTAMP ||
    endBoundary > PLOT_END_TIMESTAMP
  ) {
    return null;
  }

  const startPoint = pointBefore(points, startBoundary);
  const endPoint = pointBefore(points, endBoundary);

  if (!startPoint || !endPoint) {
    return null;
  }

  return {
    year,
    windowLeftX: xForTimestamp(startBoundary),
    windowRightX: xForTimestamp(endBoundary),
    arrowStartX: xForTimestamp(startPoint.timestamp),
    arrowEndX: xForTimestamp(endPoint.timestamp),
    startY: yForValue(startPoint.value, plotBottom, bounds),
    endY: yForValue(endPoint.value, plotBottom, bounds),
    returnValue: endPoint.value / startPoint.value - 1,
  };
}

function geometryForYear(
  year: number,
  boundaryOffset: number,
  points: DailyPoint[],
  plotBottom: number,
  bounds: ScaleBounds,
): WindowGeometry | null {
  const lowerOffset = Math.floor(boundaryOffset);
  const upperOffset = Math.ceil(boundaryOffset);

  const lower = integerWindowGeometry(
    year,
    lowerOffset,
    points,
    plotBottom,
    bounds,
  );

  if (lowerOffset === upperOffset) {
    return lower;
  }

  const upper = integerWindowGeometry(
    year,
    upperOffset,
    points,
    plotBottom,
    bounds,
  );

  if (!lower) return upper;
  if (!upper) return lower;

  const progress = boundaryOffset - lowerOffset;

  return {
    year,
    windowLeftX: lerp(
      lower.windowLeftX,
      upper.windowLeftX,
      progress,
    ),
    windowRightX: lerp(
      lower.windowRightX,
      upper.windowRightX,
      progress,
    ),
    arrowStartX: lerp(
      lower.arrowStartX,
      upper.arrowStartX,
      progress,
    ),
    arrowEndX: lerp(
      lower.arrowEndX,
      upper.arrowEndX,
      progress,
    ),
    startY: lerp(lower.startY, upper.startY, progress),
    endY: lerp(lower.endY, upper.endY, progress),
    returnValue: lerp(
      lower.returnValue,
      upper.returnValue,
      progress,
    ),
  };
}

function trendArrowGeometry(
  window: WindowGeometry,
  highlighted: boolean,
): TrendArrowGeometry {
  const dx = window.arrowEndX - window.arrowStartX;
  const dy = window.endY - window.startY;
  const length = Math.max(1, Math.hypot(dx, dy));
  const unitX = dx / length;
  const unitY = dy / length;
  const perpendicularX = -unitY;
  const perpendicularY = unitX;

  const startInset = highlighted ? 17 : 14;
  const tipInset = highlighted ? 9 : 8;
  const headLength = highlighted ? 18 : 15;
  const headHalfWidth = highlighted ? 9 : 7;

  const tipX = window.arrowEndX - unitX * tipInset;
  const tipY = window.endY - unitY * tipInset;
  const baseX = tipX - unitX * headLength;
  const baseY = tipY - unitY * headLength;

  const leftX = baseX + perpendicularX * headHalfWidth;
  const leftY = baseY + perpendicularY * headHalfWidth;
  const rightX = baseX - perpendicularX * headHalfWidth;
  const rightY = baseY - perpendicularY * headHalfWidth;

  return {
    shaftX1: window.arrowStartX + unitX * startInset,
    shaftY1: window.startY + unitY * startInset,
    shaftX2: baseX,
    shaftY2: baseY,
    headPoints: [
      tipX.toFixed(1) + "," + tipY.toFixed(1),
      leftX.toFixed(1) + "," + leftY.toFixed(1),
      rightX.toFixed(1) + "," + rightY.toFixed(1),
    ].join(" "),
  };
}

function periodLabelForOffset(offset: number) {
  const startTimestamp = monthStartTimestamp(FOCUS_YEAR, offset);
  const endIncludedTimestamp = monthStartTimestamp(
    FOCUS_YEAR,
    offset + 11,
  );

  const start = datePartsFromTimestamp(startTimestamp);
  const end = datePartsFromTimestamp(endIncludedTimestamp);

  return {
    label:
      MONTH_LABELS[start.month] +
      " " +
      start.year +
      " to " +
      MONTH_LABELS[end.month] +
      " " +
      end.year,
    windowName:
      MONTH_LABELS[start.month] +
      "-" +
      MONTH_LABELS[end.month] +
      " window",
  };
}

export function TemporalBoundaryShiftVisual() {
  const rootRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const animationFrameRef = useRef<number | null>(null);
  const boundaryOffsetRef = useRef(0);
  const [boundaryOffset, setBoundaryOffset] = useState(0);
  const [trendReveal, setTrendReveal] = useState(1);
  const [isAnimating, setIsAnimating] = useState(false);
  const [dailyPoints, setDailyPoints] = useState<DailyPoint[]>([]);
  const [dataError, setDataError] = useState(false);
  const { isFullscreen, toggleFullscreen } = useFullscreen(rootRef);

  const plotBottom = isFullscreen
    ? FULLSCREEN_PLOT_BOTTOM
    : PLOT_BOTTOM;
  const plotHeight = plotBottom - PLOT_TOP;
  const svgHeight = plotBottom + 68;

  useEffect(() => {
    let cancelled = false;

    fetch(DAILY_CSV_URL)
      .then((response) => {
        if (!response.ok) {
          throw new Error(
            "Unable to load S&P 500 daily history: " +
              response.status,
          );
        }
        return response.text();
      })
      .then((csv) => {
        if (cancelled) return;
        setDailyPoints(mergeDailyPoints(parseDailyCsv(csv)));
        setDataError(false);
      })
      .catch(() => {
        if (cancelled) return;
        setDataError(true);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const bounds = useMemo(
    () => scaleBoundsFor(dailyPoints),
    [dailyPoints],
  );

  const linePoints = useMemo(
    () =>
      dailyPoints
        .map(
          (point) =>
            xForTimestamp(point.timestamp).toFixed(2) +
            "," +
            yForValue(
              point.value,
              plotBottom,
              bounds,
            ).toFixed(2),
        )
        .join(" "),
    [bounds, dailyPoints, plotBottom],
  );

  const windows = useMemo(
    () =>
      DISPLAY_YEARS.map((year) =>
        geometryForYear(
          year,
          boundaryOffset,
          dailyPoints,
          plotBottom,
          bounds,
        ),
      ).filter(
        (window): window is WindowGeometry => window !== null,
      ),
    [boundaryOffset, bounds, dailyPoints, plotBottom],
  );

  const focusWindow =
    windows.find((window) => window.year === FOCUS_YEAR) ?? null;

  const yTicks = useMemo(
    () =>
      [0, 0.25, 0.5, 0.75, 1].map((ratio) => ({
        value: bounds.max - bounds.range * ratio,
        y: PLOT_TOP + plotHeight * ratio,
      })),
    [bounds, plotHeight],
  );

  const monthTicks = useMemo(() => {
    const ticks: Array<{
      key: string;
      x: number;
      label: string;
    }> = [];

    for (let year = 2016; year <= 2020; year += 1) {
      for (let month = 0; month < 12; month += 1) {
        const timestamp = monthStartTimestamp(year, month);
        ticks.push({
          key: year + "-" + month,
          x: xForTimestamp(timestamp),
          label: MONTH_LABELS[month],
        });
      }
    }

    return ticks;
  }, []);

  const cancelAnimation = useCallback(() => {
    if (animationFrameRef.current !== null) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    setIsAnimating(false);
  }, []);

  useEffect(() => cancelAnimation, [cancelAnimation]);

  const scrollToFocus = useCallback(
    (behavior: ScrollBehavior = "smooth") => {
      const scroller = scrollRef.current;
      if (!scroller) return;

      const focusX = xForTimestamp(Date.UTC(2018, 5, 15));
      const targetLeft = Math.max(
        0,
        focusX - scroller.clientWidth * 0.48,
      );

      scroller.scrollTo({
        left: targetLeft,
        behavior,
      });
    },
    [],
  );

  useEffect(() => {
    const frameId = requestAnimationFrame(() => {
      scrollToFocus("auto");
      if (isFullscreen) {
        rootRef.current?.focus({
          preventScroll: true,
        });
      }
    });

    return () => cancelAnimationFrame(frameId);
  }, [isFullscreen, scrollToFocus]);

  const setOffsetImmediately = useCallback(
    (nextOffset: number) => {
      cancelAnimation();
      const clampedOffset = clampBoundaryOffset(nextOffset);
      boundaryOffsetRef.current = clampedOffset;
      setBoundaryOffset(clampedOffset);
    },
    [cancelAnimation],
  );

  const animateTo = useCallback(
    (
      targetOffset: number,
      duration = MONTH_ANIMATION_DURATION_MS,
      fromOffset?: number,
    ) => {
      cancelAnimation();

      const clampedTarget = clampBoundaryOffset(targetOffset);
      const startOffset =
        fromOffset ?? boundaryOffsetRef.current;

      if (Math.abs(clampedTarget - startOffset) < 0.0001) {
        boundaryOffsetRef.current = clampedTarget;
        setBoundaryOffset(clampedTarget);
        return;
      }

      setIsAnimating(true);
      const startedAt = performance.now();

      const step = (timestamp: number) => {
        const elapsed = timestamp - startedAt;
        const rawProgress = Math.min(
          1,
          elapsed / duration,
        );
        const eased = easeInOutCubic(rawProgress);
        const nextOffset = lerp(
          startOffset,
          clampedTarget,
          eased,
        );

        boundaryOffsetRef.current = nextOffset;
        setBoundaryOffset(nextOffset);

        if (rawProgress < 1) {
          animationFrameRef.current =
            requestAnimationFrame(step);
          return;
        }

        animationFrameRef.current = null;
        boundaryOffsetRef.current = clampedTarget;
        setBoundaryOffset(clampedTarget);
        setIsAnimating(false);
      };

      animationFrameRef.current =
        requestAnimationFrame(step);
    },
    [cancelAnimation],
  );

  const shiftByMonth = useCallback(
    (delta: number) => {
      setTrendReveal(1);
      const currentTarget = Math.round(
        boundaryOffsetRef.current,
      );
      animateTo(currentTarget + delta);
    },
    [animateTo],
  );

  const playShift = useCallback(() => {
    cancelAnimation();
    boundaryOffsetRef.current = 0;
    setBoundaryOffset(0);
    setTrendReveal(0);
    setIsAnimating(true);
    scrollToFocus("smooth");

    const startedAt = performance.now();
    const revealStartsAt = STORY_CLEAN_HOLD_MS;
    const shiftStartsAt =
      revealStartsAt + STORY_ARROW_REVEAL_MS;
    const totalDuration =
      shiftStartsAt + STORY_SHIFT_DURATION_MS;

    const step = (timestamp: number) => {
      const elapsed = timestamp - startedAt;

      let nextReveal = 0;
      let nextOffset = 0;

      if (
        elapsed >= revealStartsAt &&
        elapsed < shiftStartsAt
      ) {
        const revealProgress = Math.min(
          1,
          (elapsed - revealStartsAt) /
            STORY_ARROW_REVEAL_MS,
        );
        nextReveal = easeInOutCubic(revealProgress);
      } else if (elapsed >= shiftStartsAt) {
        nextReveal = 1;
        const shiftProgress = Math.min(
          1,
          (elapsed - shiftStartsAt) /
            STORY_SHIFT_DURATION_MS,
        );
        nextOffset = lerp(
          0,
          -1,
          easeInOutCubic(shiftProgress),
        );
      }

      boundaryOffsetRef.current = nextOffset;
      setTrendReveal(nextReveal);
      setBoundaryOffset(nextOffset);

      if (elapsed < totalDuration) {
        animationFrameRef.current =
          requestAnimationFrame(step);
        return;
      }

      animationFrameRef.current = null;
      boundaryOffsetRef.current = -1;
      setTrendReveal(1);
      setBoundaryOffset(-1);
      setIsAnimating(false);
    };

    animationFrameRef.current =
      requestAnimationFrame(step);
  }, [cancelAnimation, scrollToFocus]);

  const reset = useCallback(() => {
    setTrendReveal(1);
    setOffsetImmediately(0);
    scrollToFocus("smooth");
  }, [scrollToFocus, setOffsetImmediately]);

  const commands = useMemo<VimCommand[]>(
    () => [
      {
        key: "a",
        label: "Animate 2018 story flip",
        run: playShift,
      },
      {
        key: "h",
        label: "Move window one month earlier",
        altKeys: ["LEFT"],
        run: () => shiftByMonth(-1),
      },
      {
        key: "arrowleft",
        label: "Move window one month earlier",
        hidden: true,
        run: () => shiftByMonth(-1),
      },
      {
        key: "l",
        label: "Move window one month later",
        altKeys: ["RIGHT"],
        run: () => shiftByMonth(1),
      },
      {
        key: "arrowright",
        label: "Move window one month later",
        hidden: true,
        run: () => shiftByMonth(1),
      },
      {
        key: "r",
        label: "Reset calendar year window",
        run: reset,
      },
      {
        key: "f",
        label: "Toggle fullscreen recording mode",
        run: toggleFullscreen,
      },
    ],
    [
      playShift,
      reset,
      shiftByMonth,
      toggleFullscreen,
    ],
  );

  useScopedVimMode({
    rootRef,
    modeId: "temporal-boundary-shift-visual",
    label: "Temporal Boundary Shift",
    commands,
  });

  const highlightedReturn =
    focusWindow?.returnValue ?? 0;
  const isPositive = highlightedReturn >= 0;
  const focusFillProgress = Math.max(
    0,
    Math.min(
      1,
      (highlightedReturn + 0.065) / 0.11,
    ),
  );
  const focusFill =
    "color-mix(in srgb, var(--heatmapviz-window-negative) " +
    ((1 - focusFillProgress) * 100).toFixed(1) +
    "%, var(--heatmapviz-window-positive))";

  const roundedOffset = Math.round(boundaryOffset);
  const period = periodLabelForOffset(roundedOffset);

  const chartColors = {
    background: isFullscreen
      ? "var(--heatmapviz-fullscreen-bg)"
      : "var(--heatmapviz-chart-bg)",
    grid: "var(--heatmapviz-grid-line)",
    calendarBoundary: "var(--heatmapviz-boundary)",
    analysisBoundary: "var(--heatmapviz-ink)",
    price: "var(--heatmapviz-price-line)",
    muted: "var(--heatmapviz-muted)",
    labelBackground: "var(--heatmapviz-label-bg)",
    positive: "var(--heatmapviz-positive)",
    negative: "var(--heatmapviz-negative)",
    focus: focusFill,
  };

  const chart = (
    <div
      ref={scrollRef}
      style={{
        overflowX: "auto",
        overflowY: "hidden",
        width: "100%",
        border: isFullscreen
          ? "none"
          : "1px solid var(--heatmapviz-panel-edge)",
        borderRadius: isFullscreen ? 0 : 18,
        background: chartColors.background,
        scrollbarWidth: isFullscreen ? "none" : "thin",
      }}
    >
      <svg
        viewBox={
          "0 0 " + PLOT_WIDTH + " " + svgHeight
        }
        width={PLOT_WIDTH}
        height={isFullscreen ? 920 : 490}
        role="img"
        aria-label="Daily S&P 500 closes from 2016 through 2020 with fixed calendar-year boundaries and a movable 12-month analysis window"
        style={{
          display: "block",
          minWidth: PLOT_WIDTH,
          margin: "0 auto",
        }}
      >
        {yTicks.map((tick) => (
          <g key={tick.y}>
            <line
              x1={PLOT_PADDING_X}
              x2={PLOT_WIDTH - PLOT_PADDING_X}
              y1={tick.y}
              y2={tick.y}
              stroke={chartColors.grid}
              strokeWidth="1"
            />
            <text
              x={PLOT_PADDING_X - 12}
              y={tick.y + 4}
              textAnchor="end"
              fill={chartColors.muted}
              fontSize="12"
              fontWeight="700"
            >
              {Math.round(tick.value)}
            </text>
          </g>
        ))}

        {focusWindow ? (
          <rect
            x={focusWindow.windowLeftX}
            y={PLOT_TOP}
            width={Math.max(
              0,
              focusWindow.windowRightX -
                focusWindow.windowLeftX,
            )}
            height={plotHeight}
            rx="12"
            fill={chartColors.focus}
            opacity={trendReveal * 0.68}
          />
        ) : null}

        {linePoints ? (
          <polyline
            points={linePoints}
            fill="none"
            stroke={chartColors.price}
            strokeWidth="3.2"
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        ) : null}

        {CALENDAR_YEARS.map((year) => {
          const x = xForTimestamp(
            monthStartTimestamp(year, 0),
          );

          return (
            <g key={"calendar-boundary-" + year}>
              <line
                x1={x}
                x2={x}
                y1={PLOT_TOP - 22}
                y2={plotBottom + 18}
                stroke={chartColors.calendarBoundary}
                strokeWidth="1"
                strokeDasharray="4 7"
                opacity="0.48"
              />
              <text
                x={x}
                y={PLOT_TOP - 22}
                textAnchor="middle"
                fill={chartColors.muted}
                opacity="0.72"
                fontSize="12"
                fontWeight="700"
              >
                {year}
              </text>
            </g>
          );
        })}

        {focusWindow ? (
          <g opacity={trendReveal}>
            <line
              x1={focusWindow.windowLeftX}
              x2={focusWindow.windowLeftX}
              y1={PLOT_TOP - 12}
              y2={plotBottom + 10}
              stroke={chartColors.analysisBoundary}
              strokeWidth="2.6"
            />
            <line
              x1={focusWindow.windowRightX}
              x2={focusWindow.windowRightX}
              y1={PLOT_TOP - 12}
              y2={plotBottom + 10}
              stroke={chartColors.analysisBoundary}
              strokeWidth="2.6"
            />
          </g>
        ) : null}

        {windows.map((window) => {
          const positive =
            window.returnValue >= 0;
          const highlighted =
            window.year === FOCUS_YEAR;
          const lineColor = positive
            ? chartColors.positive
            : chartColors.negative;
          const labelX =
            (window.arrowStartX +
              window.arrowEndX) /
            2;
          const labelY =
            Math.min(
              window.startY,
              window.endY,
            ) - (highlighted ? 20 : 14);
          const arrow = trendArrowGeometry(
            window,
            highlighted,
          );

          return (
            <g
              key={"trend-" + window.year}
              opacity={
                trendReveal *
                (highlighted ? 1 : 0.82)
              }
            >
              <line
                x1={arrow.shaftX1}
                y1={arrow.shaftY1}
                x2={arrow.shaftX2}
                y2={arrow.shaftY2}
                stroke={lineColor}
                strokeWidth={
                  highlighted ? 7 : 4.5
                }
                strokeLinecap="round"
              />
              <polygon
                points={arrow.headPoints}
                fill={lineColor}
              />
              <g
                transform={
                  "translate(" +
                  labelX.toFixed(1) +
                  " " +
                  labelY.toFixed(1) +
                  ")"
                }
              >
                <rect
                  x={highlighted ? -43 : -36}
                  y="-15"
                  width={
                    highlighted ? 86 : 72
                  }
                  height="27"
                  rx="13.5"
                  fill={
                    chartColors.labelBackground
                  }
                  stroke={lineColor}
                  strokeWidth={
                    highlighted ? 2 : 1
                  }
                />
                <text
                  x="0"
                  y="4"
                  textAnchor="middle"
                  fill={lineColor}
                  fontSize={
                    highlighted ? 14 : 12
                  }
                  fontWeight="900"
                  style={{
                    fontVariantNumeric:
                      "tabular-nums",
                  }}
                >
                  {formatPercent(
                    window.returnValue,
                  )}
                </text>
              </g>
            </g>
          );
        })}

        {monthTicks.map((tick) => (
          <g key={tick.key}>
            <line
              x1={tick.x}
              x2={tick.x}
              y1={plotBottom + 8}
              y2={plotBottom + 16}
              stroke={chartColors.muted}
              strokeWidth="1"
              opacity="0.62"
            />
            <text
              x={tick.x}
              y={plotBottom + 34}
              textAnchor="middle"
              fill={chartColors.muted}
              fontSize="11"
              fontWeight="700"
            >
              {tick.label}
            </text>
          </g>
        ))}

        {!dailyPoints.length && !dataError ? (
          <text
            x={PLOT_WIDTH / 2}
            y={PLOT_TOP + plotHeight / 2}
            textAnchor="middle"
            fill={chartColors.muted}
            fontSize="14"
            fontWeight="700"
          >
            Loading daily S&amp;P 500 closes...
          </text>
        ) : null}

        {dataError ? (
          <text
            x={PLOT_WIDTH / 2}
            y={PLOT_TOP + plotHeight / 2}
            textAnchor="middle"
            fill={chartColors.negative}
            fontSize="14"
            fontWeight="700"
          >
            Daily S&amp;P 500 data could not be loaded.
          </text>
        ) : null}
      </svg>
    </div>
  );

  if (isFullscreen) {
    return (
      <div
        ref={rootRef}
        style={{
          background:
            "var(--heatmapviz-fullscreen-bg)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: "100%",
          height: "100%",
          overflow: "hidden",
          outline: "none",
        }}
      >
        <div
          style={{
            background:
              "var(--heatmapviz-fullscreen-bg)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: "100%",
            height: "100%",
            overflow: "hidden",
          }}
        >
          {chart}
        </div>
      </div>
    );
  }

  const roundedCurrentOffset =
    Math.round(boundaryOffset);
  const canMoveEarlier =
    roundedCurrentOffset > MIN_BOUNDARY_OFFSET;
  const canMoveLater =
    roundedCurrentOffset < MAX_BOUNDARY_OFFSET;

  return (
    <div
      ref={rootRef}
      style={{
        outline: "none",
        width: "100%",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 1180,
          margin: "0 auto",
        }}
      >
        <HeatmapVisualCard>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 12,
              flexWrap: "wrap",
            }}
          >
            <div
              style={{
                display: "grid",
                gap: 4,
              }}
            >
              <div
                style={{
                  color:
                    "var(--heatmapviz-muted)",
                  fontSize: "0.76rem",
                  fontWeight: 800,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                }}
              >
                Same daily prices, different
                12-month window
              </div>
              <div
                style={{
                  display: "flex",
                  alignItems: "baseline",
                  gap: 10,
                  flexWrap: "wrap",
                }}
              >
                <strong
                  style={{
                    color: isPositive
                      ? "var(--heatmapviz-positive)"
                      : "var(--heatmapviz-negative)",
                    fontSize: "1.55rem",
                    lineHeight: 1,
                    fontVariantNumeric:
                      "tabular-nums",
                  }}
                >
                  {formatPercent(
                    highlightedReturn,
                  )}
                </strong>
                <span
                  style={{
                    color:
                      "var(--heatmapviz-ink)",
                    fontSize: "0.92rem",
                    fontWeight: 700,
                  }}
                >
                  {period.label}
                </span>
                <span
                  style={{
                    color:
                      "var(--heatmapviz-muted)",
                    fontSize: "0.84rem",
                  }}
                >
                  {period.windowName}
                </span>
              </div>
            </div>

            <div
              style={{
                display: "flex",
                gap: 8,
                flexWrap: "wrap",
                alignItems: "center",
              }}
            >
              <HeatmapHudButton
                type="button"
                onClick={() =>
                  shiftByMonth(-1)
                }
                disabled={!canMoveEarlier}
              >
                ← Earlier month [h]
              </HeatmapHudButton>
              <HeatmapHudButton
                type="button"
                onClick={playShift}
                disabled={
                  isAnimating ||
                  !dailyPoints.length
                }
                active={
                  boundaryOffset < 0 &&
                  boundaryOffset > -1
                }
              >
                {isAnimating
                  ? "Shifting..."
                  : "▶ 2018 story flip [a]"}
              </HeatmapHudButton>
              <HeatmapHudButton
                type="button"
                onClick={() =>
                  shiftByMonth(1)
                }
                disabled={!canMoveLater}
              >
                Later month [l] →
              </HeatmapHudButton>
              <HeatmapHudButton
                type="button"
                onClick={reset}
              >
                Reset [r]
              </HeatmapHudButton>
              <HeatmapHudButton
                type="button"
                onClick={toggleFullscreen}
              >
                Fullscreen [f]
              </HeatmapHudButton>
            </div>
          </div>

          {chart}

          <div
            style={{
              display: "flex",
              justifyContent:
                "space-between",
              gap: 12,
              flexWrap: "wrap",
              color:
                "var(--heatmapviz-muted)",
              fontSize: "0.82rem",
              lineHeight: 1.45,
            }}
          >
            <span>
              Daily closes only, 2016–2020.
              Calendar boundaries stay fixed;
              the 12-month measurement window
              moves.
            </span>
            <span>
              h/← earlier · l/→ later · a
              animate · r reset · f fullscreen
            </span>
          </div>
        </HeatmapVisualCard>
      </div>
    </div>
  );
}
