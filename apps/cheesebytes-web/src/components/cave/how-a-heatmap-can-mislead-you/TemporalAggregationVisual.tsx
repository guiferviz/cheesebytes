import { useEffect, useMemo, useRef, useState } from "react";

import type { VimCommand } from "../../../utils/vim-mode";
import {
  fullscreenInnerStyle,
  fullscreenRootStyle,
  useFullscreen,
} from "../shared/useFullscreen";

import { SP500_MONTHLY_INDEX } from "./sp500MonthlyData";
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

const TABLE_MONTH_CELL = 18;
const TABLE_TOTAL_CELL_WIDTH = 36;
const TABLE_YEAR_CELL_WIDTH = 56;
const TABLE_TOTAL_GUTTER = 8;
const TIMELINE_MONTH_WIDTH = 46;
const TIMELINE_MONTH_HEIGHT = 34;
const TIMELINE_MONTH_GAP = 3;
const TIMELINE_BAR_HEIGHT = 30;

type TemporalViewMode = "detail" | "timeline";

interface MonthlyEntry {
  year: number;
  month: number;
  index: number | null;
  dateKey: string;
  monthlyReturn: number | null;
  hasData: boolean;
}

interface AlignedYear {
  startYear: number;
  displayYear: number;
  label: string;
  months: MonthlyEntry[];
  totalReturn: number | null;
  hasMissingMonths: boolean;
}

interface TimelineWindow {
  key: string;
  startOffset: number;
  observedMonthCount: number;
  totalReturn: number | null;
  hasMissingMonths: boolean;
  rangeLabel: string;
}

function AnimatedPercentText({
  value,
  duration = 380,
}: {
  value: number | null;
  duration?: number;
}) {
  const initialValue = value ?? 0;
  const [displayValue, setDisplayValue] = useState(initialValue);
  const displayedValueRef = useRef(initialValue);

  useEffect(() => {
    if (value === null) {
      displayedValueRef.current = 0;
      setDisplayValue(0);
      return;
    }

    const startValue = displayedValueRef.current;
    if (Math.abs(startValue - value) < 0.0001) {
      displayedValueRef.current = value;
      setDisplayValue(value);
      return;
    }

    let frameId = 0;
    let startTime: number | null = null;

    const step = (timestamp: number) => {
      if (startTime === null) {
        startTime = timestamp;
      }

      const progress = Math.min(1, (timestamp - startTime) / duration);
      const easedProgress = 1 - Math.pow(1 - progress, 3);
      const nextValue = startValue + (value - startValue) * easedProgress;

      displayedValueRef.current = nextValue;
      setDisplayValue(nextValue);

      if (progress < 1) {
        frameId = requestAnimationFrame(step);
        return;
      }

      displayedValueRef.current = value;
      setDisplayValue(value);
    };

    frameId = requestAnimationFrame(step);

    return () => cancelAnimationFrame(frameId);
  }, [duration, value]);

  if (value === null) {
    return null;
  }

  return <span>{formatPercent(displayValue)}</span>;
}

function parseDateKey(raw: string) {
  const [year, month] = raw.split(".");
  return {
    year: Number(year),
    month: Number(month) - 1,
  };
}

function formatPercent(value: number) {
  const sign = value > 0 ? "+" : "";
  return `${sign}${(value * 100).toFixed(1)}%`;
}

function formatMonthYear(month: number, year: number) {
  return `${MONTH_LABELS[month]} ${year}`;
}

function colorForReturn(value: number, alphaFloor = 0.18) {
  const intensity = Math.min(1, Math.abs(value) / 0.22);
  const alpha = alphaFloor + intensity * (1 - alphaFloor);
  if (value >= 0) {
    return `rgba(16, 185, 129, ${alpha.toFixed(3)})`;
  }
  return `rgba(225, 85, 84, ${alpha.toFixed(3)})`;
}

function absoluteMonthIndex(year: number, month: number) {
  return year * 12 + month;
}

const BASE_DATE = parseDateKey(SP500_MONTHLY_INDEX[0]?.[0] ?? "1957.01");
const BASE_ABSOLUTE_MONTH = absoluteMonthIndex(BASE_DATE.year, BASE_DATE.month);

const MONTHLY_SERIES: MonthlyEntry[] = SP500_MONTHLY_INDEX.map(
  ([, index], indexInSeries) => {
    const absoluteMonth = BASE_DATE.month + indexInSeries;
    const year = BASE_DATE.year + Math.floor(absoluteMonth / 12);
    const month = absoluteMonth % 12;
    const previous =
      indexInSeries === 0 ? index : SP500_MONTHLY_INDEX[indexInSeries - 1][1];

    return {
      year,
      month,
      index,
      dateKey: `${year}.${String(month + 1).padStart(2, "0")}`,
      monthlyReturn: indexInSeries === 0 ? 0 : index / previous - 1,
      hasData: true,
    };
  },
);

function buildAlignedYears(startMonth: number): AlignedYear[] {
  const lookup = new Map(
    MONTHLY_SERIES.map((entry) => [`${entry.year}-${entry.month}`, entry]),
  );
  const firstYear = MONTHLY_SERIES[0]?.year ?? 0;
  const lastEntry = MONTHLY_SERIES[MONTHLY_SERIES.length - 1];
  const lastYear = lastEntry?.year ?? 0;
  const lastKnownMonth = lastEntry
    ? absoluteMonthIndex(lastEntry.year, lastEntry.month)
    : -1;
  const years: AlignedYear[] = [];

  for (let anchorYear = firstYear; anchorYear <= lastYear; anchorYear += 1) {
    const finalYear = anchorYear + Math.floor((startMonth + 11) / 12);
    const isLatestYearWindow = anchorYear === lastYear;
    if (finalYear > lastYear && !isLatestYearWindow) {
      continue;
    }

    const startEntry = lookup.get(`${anchorYear}-${startMonth}`);
    if (!startEntry && !isLatestYearWindow) {
      continue;
    }

    const months: MonthlyEntry[] = [];
    let carryIndex = startEntry?.index ?? null;
    let hasMissingMonths = false;

    for (let offset = 0; offset < 12; offset += 1) {
      const absoluteMonth = startMonth + offset;
      const year = anchorYear + Math.floor(absoluteMonth / 12);
      const month = absoluteMonth % 12;
      const entry = lookup.get(`${year}-${month}`);
      const isKnownMonth = absoluteMonthIndex(year, month) <= lastKnownMonth;

      if (entry && entry.index !== null && isKnownMonth) {
        months.push(entry);
        carryIndex = entry.index;
        continue;
      }

      hasMissingMonths = true;
      months.push({
        year,
        month,
        index: carryIndex,
        dateKey: `${year}.${String(month + 1).padStart(2, "0")}-missing`,
        monthlyReturn: null,
        hasData: false,
      });
    }

    const observedMonthlyReturns = months.flatMap((month) =>
      month.hasData && month.monthlyReturn !== null
        ? [month.monthlyReturn]
        : [],
    );
    const totalReturn =
      observedMonthlyReturns.length > 0
        ? observedMonthlyReturns.reduce(
            (total, monthlyReturn) => total * (1 + monthlyReturn),
            1,
          ) - 1
        : null;
    years.push({
      startYear: anchorYear,
      displayYear: finalYear,
      label:
        startMonth === 0
          ? `${anchorYear}`
          : `${anchorYear}/${String((anchorYear + 1) % 100).padStart(2, "0")}`,
      months,
      totalReturn,
      hasMissingMonths,
    });
  }

  return years.reverse();
}

export function TemporalAggregationVisual() {
  const rootRef = useRef<HTMLDivElement>(null);
  const { isFullscreen, toggleFullscreen } = useFullscreen(rootRef);
  const [startMonth, setStartMonth] = useState(0);
  const [showFullHistory, setShowFullHistory] = useState(false);
  const [viewMode, setViewMode] = useState<TemporalViewMode>("detail");

  const alignedYears = useMemo(
    () => buildAlignedYears(startMonth),
    [startMonth],
  );
  const monthOrder = useMemo(
    () =>
      Array.from(
        { length: 12 },
        (_, offset) => MONTH_LABELS[(startMonth + offset) % 12],
      ),
    [startMonth],
  );
  const visibleYears = showFullHistory
    ? alignedYears
    : alignedYears.slice(0, 18);
  const tableRowGap = isFullscreen ? 4 : 3;
  const tableRowCount = visibleYears.length + 1;
  const fullscreenHeightBudget = `100vh - 150px - ${
    visibleYears.length * tableRowGap
  }px`;
  const monthCellSize = isFullscreen
    ? `clamp(28px, calc((${fullscreenHeightBudget}) / ${tableRowCount}), 58px)`
    : `${TABLE_MONTH_CELL}px`;
  const yearCellWidth = isFullscreen
    ? `clamp(88px, calc((${fullscreenHeightBudget}) / ${(tableRowCount / 3.1).toFixed(4)}), 178px)`
    : `${TABLE_YEAR_CELL_WIDTH}px`;
  const totalCellWidth = isFullscreen
    ? `clamp(64px, calc((${fullscreenHeightBudget}) / ${(tableRowCount / 2.15).toFixed(4)}), 124px)`
    : `${TABLE_TOTAL_CELL_WIDTH}px`;
  const totalGutterWidth = isFullscreen
    ? `clamp(12px, calc((${fullscreenHeightBudget}) / ${(tableRowCount / 0.45).toFixed(4)}), 28px)`
    : `${TABLE_TOTAL_GUTTER}px`;
  const tableGridTemplate = `${yearCellWidth} repeat(12, ${monthCellSize}) ${totalGutterWidth} ${totalCellWidth}`;

  const timelineMonths = MONTHLY_SERIES;
  const timelineMonthWidth = isFullscreen ? 56 : TIMELINE_MONTH_WIDTH;
  const timelineMonthHeight = isFullscreen ? 40 : TIMELINE_MONTH_HEIGHT;
  const timelineMonthGap = isFullscreen ? 4 : TIMELINE_MONTH_GAP;
  const timelineBarHeight = isFullscreen ? 40 : TIMELINE_BAR_HEIGHT;
  const timelineStride = timelineMonthWidth + timelineMonthGap;
  const timelineTrackWidth =
    timelineMonths.length * timelineMonthWidth +
    Math.max(0, timelineMonths.length - 1) * timelineMonthGap;
  const timelineWindows = useMemo<TimelineWindow[]>(
    () =>
      [...alignedYears]
        .reverse()
        .map((year) => {
          const observedMonths = year.months.filter((month) => month.hasData);
          const firstMonth = year.months[0];
          const lastObservedMonth =
            observedMonths[observedMonths.length - 1] ?? firstMonth;

          return {
            key: `${year.displayYear}`,
            startOffset:
              absoluteMonthIndex(firstMonth.year, firstMonth.month) -
              BASE_ABSOLUTE_MONTH,
            observedMonthCount: observedMonths.length,
            totalReturn: year.totalReturn,
            hasMissingMonths: year.hasMissingMonths,
            rangeLabel: `${formatMonthYear(firstMonth.month, firstMonth.year)} to ${formatMonthYear(lastObservedMonth.month, lastObservedMonth.year)}`,
          };
        })
        .filter(
          (window) =>
            window.startOffset >= 0 &&
            window.startOffset < timelineMonths.length &&
            window.observedMonthCount > 0,
        ),
    [alignedYears, timelineMonths.length],
  );

  const moveToMonth = (nextMonth: number) => {
    setStartMonth(nextMonth);
  };

  const shiftStart = (delta: number) => {
    setStartMonth((current) => (current + delta + 12) % 12);
  };

  const commands = useMemo<VimCommand[]>(
    () => [
      {
        key: "h",
        label: "Move year start earlier",
        altKeys: ["LEFT"],
        run: () => shiftStart(-1),
      },
      {
        key: "arrowleft",
        label: "Move year start earlier",
        hidden: true,
        run: () => shiftStart(-1),
      },
      {
        key: "l",
        label: "Move year start later",
        altKeys: ["RIGHT"],
        run: () => shiftStart(1),
      },
      {
        key: "arrowright",
        label: "Move year start later",
        hidden: true,
        run: () => shiftStart(1),
      },
      {
        key: "g",
        label: "Reset to January",
        run: () => moveToMonth(0),
      },
      {
        key: "a",
        label: "Toggle full history",
        run: () => setShowFullHistory((current) => !current),
      },
      {
        key: "t",
        label: "Toggle timeline view",
        run: () =>
          setViewMode((current) =>
            current === "detail" ? "timeline" : "detail",
          ),
      },
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
    modeId: "temporal-aggregation-visual",
    label: "Temporal Aggregation",
    commands,
  });

  return (
    <div
      ref={rootRef}
      style={{
        ...fullscreenRootStyle(isFullscreen),
        background: "transparent",
        outline: "none",
        width: "100%",
        maxWidth: "100%",
        minWidth: 0,
      }}
    >
      <div
        style={{
          ...fullscreenInnerStyle(isFullscreen, 1120),
          height: isFullscreen ? "100%" : undefined,
          width: "100%",
          maxWidth: "100%",
          minWidth: 0,
        }}
      >
        <div
          style={{
            display: "grid",
            gap: isFullscreen ? 14 : 12,
            gridTemplateRows: isFullscreen ? "auto minmax(0, 1fr)" : undefined,
            height: isFullscreen ? "100%" : undefined,
            width: "100%",
            maxWidth: "100%",
            minWidth: 0,
          }}
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(12, minmax(0, 1fr))",
              gap: 6,
              width: "100%",
              maxWidth: "100%",
              minWidth: 0,
            }}
          >
            {MONTH_LABELS.map((month, monthIndex) => {
              const isSelected = monthIndex === startMonth;

              return (
                <button
                  key={month}
                  type="button"
                  aria-pressed={isSelected}
                  onClick={() => moveToMonth(monthIndex)}
                  style={{
                    border: isSelected
                      ? "1px solid var(--heatmapviz-accent)"
                      : "1px solid var(--heatmapviz-panel-edge)",
                    padding: "0.6rem 0.35rem",
                    background: isSelected
                      ? "var(--heatmapviz-button-bg-active)"
                      : "transparent",
                    boxShadow: isSelected
                      ? "inset 0 0 0 1px var(--heatmapviz-accent)"
                      : "none",
                    color: "var(--heatmapviz-ink)",
                    font: "inherit",
                    fontWeight: 800,
                    cursor: "pointer",
                  }}
                >
                  {month}
                </button>
              );
            })}
          </div>

          {viewMode === "detail" ? (
            <div
              style={{
                alignItems: "flex-start",
                display: isFullscreen ? "flex" : undefined,
                justifyContent: isFullscreen ? "center" : undefined,
                minHeight: 0,
                overflowX: "auto",
                overflowY: isFullscreen
                  ? "auto"
                  : showFullHistory
                    ? "auto"
                    : "hidden",
                maxHeight: !isFullscreen && showFullHistory ? 580 : undefined,
              }}
            >
              <div
                style={{
                  display: "grid",
                  gap: tableRowGap,
                  justifyContent: "center",
                  padding: isFullscreen ? "6px 10px 10px" : 10,
                  width: isFullscreen ? "max-content" : "100%",
                }}
              >
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: tableGridTemplate,
                    columnGap: isFullscreen ? 4 : 2,
                    alignItems: "end",
                    justifyContent: "center",
                    fontSize: isFullscreen
                      ? "clamp(0.7rem, 1.25vh, 1.1rem)"
                      : "0.58rem",
                    color: "var(--heatmapviz-muted)",
                    fontWeight: 700,
                  }}
                >
                  <div>Year</div>
                  {monthOrder.map((month) => (
                    <div
                      key={month}
                      style={{
                        textAlign: "center",
                        lineHeight: 1.05,
                      }}
                    >
                      {month}
                    </div>
                  ))}
                  <div aria-hidden="true" />
                  <div style={{ textAlign: "center" }}>Total</div>
                </div>

                {visibleYears.map((year) => (
                  <div
                    key={year.label}
                    style={{
                      display: "grid",
                      gridTemplateColumns: tableGridTemplate,
                      columnGap: isFullscreen ? 4 : 2,
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <div
                      style={{
                        fontSize: isFullscreen
                          ? "clamp(1rem, 1.8vh, 1.6rem)"
                          : "0.72rem",
                        fontWeight: 700,
                        whiteSpace: "nowrap",
                      }}
                    >
                      {year.label}
                    </div>

                    {year.months.map((month) => (
                      <div
                        key={month.dateKey}
                        title={
                          month.hasData
                            ? `${MONTH_LABELS[month.month]} ${month.year}: ${formatPercent(month.monthlyReturn ?? 0)}`
                            : `${MONTH_LABELS[month.month]} ${month.year}: no data yet`
                        }
                        style={{
                          width: monthCellSize,
                          height: monthCellSize,
                          border: month.hasData
                            ? "1px solid rgba(255,255,255,0.14)"
                            : "1px dashed rgba(148,163,184,0.38)",
                          background: month.hasData
                            ? colorForReturn(month.monthlyReturn ?? 0, 0.22)
                            : "rgba(148,163,184,0.08)",
                        }}
                      />
                    ))}

                    <div aria-hidden="true" />

                    <div
                      title={
                        year.totalReturn === null
                          ? "No data yet for this window."
                          : year.hasMissingMonths
                            ? `Partial window through latest available month: ${formatPercent(year.totalReturn)}`
                            : `Window return: ${formatPercent(year.totalReturn)}`
                      }
                      style={{
                        width: totalCellWidth,
                        height: monthCellSize,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontFamily:
                          "'IosevkaTermSlab Nerd Font Mono', monospace",
                        fontSize: isFullscreen
                          ? "clamp(0.78rem, 1.35vh, 1.18rem)"
                          : "0.62rem",
                        lineHeight: 1,
                        background:
                          year.totalReturn === null
                            ? "rgba(148,163,184,0.08)"
                            : colorForReturn(year.totalReturn, 0.24),
                        border:
                          year.hasMissingMonths || year.totalReturn === null
                            ? "1px dashed rgba(148,163,184,0.46)"
                            : "1px solid transparent",
                        color: "var(--heatmapviz-ink)",
                      }}
                    >
                      {year.totalReturn === null
                        ? ""
                        : formatPercent(year.totalReturn)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div
              style={{
                minHeight: 0,
                height: isFullscreen ? "100%" : undefined,
                display: "flex",
                alignItems: isFullscreen ? "center" : "flex-start",
                minWidth: 0,
                width: "100%",
              }}
            >
              <div
                style={{
                  overflowX: "auto",
                  overflowY: "hidden",
                  padding: isFullscreen ? "14px 10px" : 10,
                  width: "100%",
                  minWidth: 0,
                  maxWidth: "100%",
                }}
              >
                <div
                  style={{
                    width: timelineTrackWidth,
                    display: "grid",
                    gap: isFullscreen ? 18 : 14,
                  }}
                >
                  <div
                    style={{
                      position: "relative",
                      height: timelineBarHeight,
                    }}
                  >
                    {timelineWindows.map((window) => {
                      const barWidth =
                        window.observedMonthCount * timelineMonthWidth +
                        Math.max(0, window.observedMonthCount - 1) *
                          timelineMonthGap;

                      return (
                        <div
                          key={window.key}
                          title={
                            window.totalReturn === null
                              ? "No data yet for this window."
                              : window.hasMissingMonths
                                ? `${window.rangeLabel}: ${formatPercent(window.totalReturn)} (partial window through latest available month)`
                                : `${window.rangeLabel}: ${formatPercent(window.totalReturn)}`
                          }
                          style={{
                            position: "absolute",
                            left: 0,
                            top: 0,
                            width: barWidth,
                            height: timelineBarHeight,
                            transform: `translateX(${window.startOffset * timelineStride}px)`,
                            transition:
                              "transform 420ms cubic-bezier(0.22, 1, 0.36, 1), width 320ms ease, background-color 280ms ease, color 220ms ease",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontFamily:
                              "'IosevkaTermSlab Nerd Font Mono', monospace",
                            fontSize: isFullscreen
                              ? "clamp(0.84rem, 1.1vh, 1rem)"
                              : "0.68rem",
                            fontWeight: 800,
                            lineHeight: 1,
                            background:
                              window.totalReturn === null
                                ? "rgba(148,163,184,0.08)"
                                : colorForReturn(window.totalReturn, 0.28),
                            border:
                              window.hasMissingMonths ||
                              window.totalReturn === null
                                ? "1px dashed rgba(148,163,184,0.42)"
                                : "1px solid rgba(255,255,255,0.04)",
                            color: "var(--heatmapviz-ink)",
                            willChange: "transform, width, background-color",
                          }}
                        >
                          <AnimatedPercentText value={window.totalReturn} />
                        </div>
                      );
                    })}
                  </div>

                  <div
                    style={{
                      display: "flex",
                      gap: timelineMonthGap,
                      width: "max-content",
                    }}
                  >
                    {timelineMonths.map((month) => (
                      <div
                        key={month.dateKey}
                        title={`${MONTH_LABELS[month.month]} ${month.year}: ${formatPercent(
                          month.monthlyReturn ?? 0,
                        )}`}
                        style={{
                          width: timelineMonthWidth,
                          height: timelineMonthHeight,
                          border: "1px solid rgba(255,255,255,0.03)",
                          background: colorForReturn(
                            month.monthlyReturn ?? 0,
                            0.24,
                          ),
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          boxSizing: "border-box",
                          color: "var(--heatmapviz-ink)",
                        }}
                      >
                        <div
                          style={{
                            fontFamily:
                              "'IosevkaTermSlab Nerd Font Mono', monospace",
                            fontSize: isFullscreen
                              ? "clamp(0.76rem, 1.05vh, 0.92rem)"
                              : "0.66rem",
                            fontWeight: 700,
                            lineHeight: 1,
                            textAlign: "center",
                          }}
                        >
                          {formatPercent(month.monthlyReturn ?? 0)}
                        </div>
                      </div>
                    ))}
                  </div>

                  <div
                    style={{
                      position: "relative",
                      paddingTop: isFullscreen ? 12 : 10,
                    }}
                  >
                    <div
                      aria-hidden="true"
                      style={{
                        position: "absolute",
                        top: 0,
                        left: 0,
                        right: 0,
                        height: 1,
                        background: "rgba(148,163,184,0.38)",
                      }}
                    />

                    <div
                      style={{
                        display: "flex",
                        gap: timelineMonthGap,
                        width: "max-content",
                      }}
                    >
                      {timelineMonths.map((month) => (
                        <div
                          key={`${month.dateKey}-axis`}
                          style={{
                            width: timelineMonthWidth,
                            display: "grid",
                            justifyItems: "center",
                            gap: 5,
                          }}
                        >
                          <div
                            aria-hidden="true"
                            style={{
                              width: 1,
                              height: isFullscreen ? 10 : 8,
                              background: "rgba(148,163,184,0.65)",
                            }}
                          />

                          <div
                            style={{
                              display: "grid",
                              gap: 1,
                              justifyItems: "center",
                              textAlign: "center",
                              lineHeight: 1.05,
                              color: "var(--heatmapviz-muted)",
                            }}
                          >
                            <div
                              style={{
                                fontSize: isFullscreen
                                  ? "clamp(0.68rem, 0.96vh, 0.84rem)"
                                  : "0.56rem",
                                fontWeight: 700,
                              }}
                            >
                              {MONTH_LABELS[month.month]}
                            </div>
                            <div
                              style={{
                                fontSize: isFullscreen
                                  ? "clamp(0.76rem, 1.08vh, 0.98rem)"
                                  : "0.66rem",
                                fontWeight: 800,
                                minHeight: isFullscreen ? "1.05em" : "0.95em",
                              }}
                            >
                              {month.month === 0 ? month.year : ""}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
