import { useMemo, useRef, useState } from "react";

import type { VimCommand } from "../../../utils/vim-mode";
import {
  fullscreenInnerStyle,
  fullscreenRootStyle,
  useFullscreen,
} from "../../pathfinding-gold-mine/useFullscreen";

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
  label: string;
  months: MonthlyEntry[];
  totalReturn: number | null;
  hasMissingMonths: boolean;
}

function parseDateKey(raw: string) {
  const [year, month] = raw.split(".");
  return {
    year: Number(year),
    month: Number(month) - 1,
  };
}

const BASE_DATE = parseDateKey(SP500_MONTHLY_INDEX[0]?.[0] ?? "1957.01");

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

function formatPercent(value: number) {
  const sign = value > 0 ? "+" : "";
  return `${sign}${(value * 100).toFixed(1)}%`;
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
  const tableScale = isFullscreen ? 1.35 : 1;

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
        run: () => setStartMonth(0),
      },
      {
        key: "a",
        label: "Toggle full history",
        run: () => setShowFullHistory((current) => !current),
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
      }}
    >
      <div style={fullscreenInnerStyle(isFullscreen, 1120)}>
        <div style={{ display: "grid", gap: 12 }}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(12, minmax(0, 1fr))",
              gap: 6,
            }}
          >
            {MONTH_LABELS.map((month, monthIndex) => {
              const isSelected = monthIndex === startMonth;

              return (
                <button
                  key={month}
                  type="button"
                  aria-pressed={isSelected}
                  onClick={() => setStartMonth(monthIndex)}
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

          <div
            style={{
              overflowX: "hidden",
              overflowY: showFullHistory ? "auto" : "hidden",
              maxHeight: isFullscreen
                ? "calc(100vh - 170px)"
                : showFullHistory
                  ? 580
                  : undefined,
            }}
          >
            <div
              style={{
                width: "100%",
                padding: 10,
                display: "grid",
                gap: 3,
                justifyContent: "center",
                transform: `scale(${tableScale})`,
                transformOrigin: "top center",
              }}
            >
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: `${TABLE_YEAR_CELL_WIDTH}px repeat(12, ${TABLE_MONTH_CELL}px) ${TABLE_TOTAL_GUTTER}px ${TABLE_TOTAL_CELL_WIDTH}px`,
                  columnGap: 2,
                  alignItems: "end",
                  justifyContent: "center",
                  fontSize: "0.58rem",
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
                    gridTemplateColumns: `${TABLE_YEAR_CELL_WIDTH}px repeat(12, ${TABLE_MONTH_CELL}px) ${TABLE_TOTAL_GUTTER}px ${TABLE_TOTAL_CELL_WIDTH}px`,
                    columnGap: 2,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <div
                    style={{
                      fontSize: "0.72rem",
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
                        width: TABLE_MONTH_CELL,
                        height: TABLE_MONTH_CELL,
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
                      width: TABLE_TOTAL_CELL_WIDTH,
                      height: TABLE_MONTH_CELL,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontFamily: "'IosevkaTermSlab Nerd Font Mono', monospace",
                      fontSize: "0.62rem",
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
        </div>
      </div>
    </div>
  );
}
