import { Shape } from "./Shape";
import { SHAPES } from "../MajorityVoteConstants";
import type { ShapeKind } from "./definition";
import type { createMemoryShapes } from "./memory-shapes";
import {
  countingArrivals,
  memoryArrivals,
  frequenciesAt,
  initialFrequencies,
  counterRoute,
  FEED_DURATION,
  TRANSFER_DURATION,
  MEMORY_CAPACITY,
  capacityState,
  centredCounterLayout,
  type CounterArrival,
  type FrequencyEntry,
} from "./counter-flow";

const clamp = (v: number) => Math.max(0, Math.min(1, v));
const smooth = (v: number) => {
  const q = clamp(v);
  return q * q * (3 - 2 * q);
};
const mix = (a: number, b: number, q: number) => a + (b - a) * q;

export function FrequencyCounterScene({
  memory,
  time,
  duration,
  marks,
  polygons,
  arrivals: suppliedArrivals,
  initialEntries,
  fadeMatchingArrivals = false,
}: {
  memory: boolean;
  time: number;
  duration: number;
  marks: Record<string, number>;
  polygons: ReturnType<typeof createMemoryShapes>;
  arrivals?: CounterArrival[];
  initialEntries?: FrequencyEntry[];
  fadeMatchingArrivals?: boolean;
}) {
  const mode = memory ? "memory" : "counting";
  const stop = memory ? (marks.question ?? 17) : Infinity;
  const clock = time;
  const events =
    suppliedArrivals ??
    (memory
      ? memoryArrivals(stop)
      : countingArrivals(marks.count ?? 3.1, marks.simple));
  const initial = initialEntries ?? (memory ? initialFrequencies() : []);
  const status = memory
    ? capacityState(events, clock, initial)
    : { entries: frequenciesAt(events, clock, initial), blocked: null };
  const { entries, blocked } = status;
  const queueStop = memory
    ? capacityState(events, Infinity, initial).blocked
    : null;

  const order = [
    ...new Set([...initial.map((e) => e.value), ...events.map((e) => e.value)]),
  ];
  // Reserve a new row just before its arrival so neighbours move smoothly,
  // without delaying the count or the pulse when the shape actually lands.
  const futureValues = new Set(entries.map((e) => e.value));
  let occupied = entries.length;
  for (const event of events) {
    if (blocked || (memory && occupied >= MEMORY_CAPACITY)) break;
    if (event.arrival <= clock || futureValues.has(event.value)) continue;
    futureValues.add(event.value);
    occupied += smooth(
      (clock - event.arrival + TRANSFER_DURATION) / TRANSFER_DURATION,
    );
  }
  const { compact, top, pitch, size } = centredCounterLayout(occupied, memory);
  const position = (index: number) => ({ x: 430, y: top + index * pitch });
  const colour = (value: string) =>
    SHAPES.find((s) => s.type === value)?.color ??
    polygons[Number(value.split("-")[1])].colour;
  const glyph = (value: string, x: number, y: number, extent: number) => {
    if (!value.startsWith("polygon-"))
      return <Shape kind={value as ShapeKind} x={x} y={y} size={extent} />;
    const polygon = polygons[Number(value.split("-")[1])];
    return (
      <polygon
        points={polygon.points}
        fill={polygon.colour}
        stroke="#ffffff28"
        strokeWidth={0.06}
        strokeLinejoin="round"
        transform={`translate(${x} ${y}) scale(${extent / 2})`}
      />
    );
  };
  // The next scene continues the same belt. Preview only its known shapes;
  // they have not arrived yet and cannot create a fifth counting slot.
  const flights = memory
    ? events
    : [
        ...events,
        ...memoryArrivals(11)
          .slice(0, 5)
          .map((event) => ({ ...event, arrival: duration + event.arrival })),
      ];

  return (
    <g
      data-counter-scene={mode}
      data-entries={entries.length}
      data-layout="single-column"
      data-blocked={blocked?.event.value ?? ""}
    >
      <defs>
        <clipPath id={`counter-flight-${mode}`}>
          <rect x={0} y={0} width={1600} height={875} />
        </clipPath>
        <clipPath id={`counter-space-${mode}`}>
          <rect x={230} y={70} width={320} height={760} rx={12} />
        </clipPath>
        <linearGradient
          id={`counter-bottom-fade-${mode}`}
          x1="0"
          y1="0"
          x2="0"
          y2="1"
        >
          <stop stopColor="#000" stopOpacity="0" />
          <stop offset="1" stopColor="#000" />
        </linearGradient>
      </defs>
      {memory && (
        <rect
          x={230}
          y={70}
          width={320}
          height={760}
          rx={12}
          fill="none"
          stroke={blocked ? "#d5bb8f" : "#64748b"}
          strokeWidth={1.3}
          opacity={
            blocked
              ? 0.4 + Math.sin((clock - blocked.time) * 4) * 0.12
              : mix(0.08, 0.3, smooth((occupied - 7) / 4))
          }
        />
      )}
      <g clipPath={`url(#counter-space-${mode})`}>
        {entries.map((entry, index) => {
          const { x, y } = position(index);
          if (y > 920) return null;
          const pulse = Math.exp(-Math.max(0, clock - entry.lastArrival) * 9);
          const c = colour(entry.value);
          const numberX = x - size * 0.75 - 24;
          return (
            <g
              key={entry.value}
              data-counter-id={entry.value}
              data-count={entry.count}
              data-pulse={pulse}
              data-last-arrival={entry.lastArrival}
            >
              <rect
                x={numberX - 95}
                y={y - Math.min(pitch - 6, size + 18) / 2}
                width={x + size / 2 + 12 - (numberX - 95)}
                height={Math.min(pitch - 6, size + 18)}
                rx={10}
                fill={c}
                fillOpacity={pulse * 0.025}
                stroke={c}
                strokeOpacity={pulse * 0.5}
                strokeWidth={1.6}
              />
              {y < 840 && (
                <text
                  x={numberX}
                  y={y}
                  textAnchor="end"
                  dominantBaseline="middle"
                  fill={c}
                  fontSize={mix(68, 48, compact) * (1 + pulse * 0.1)}
                >
                  {entry.count}
                </text>
              )}
              <g data-counter-icon={entry.value}>
                {glyph(entry.value, x, y, size * (1 + pulse * 0.055))}
              </g>
            </g>
          );
        })}
      </g>
      {blocked && (
        <rect
          x={742}
          y={392}
          width={116}
          height={116}
          rx={16}
          stroke="#d5bb8f"
          strokeWidth={1.8}
          fill="#d5bb8f"
          fillOpacity={0.035}
          strokeOpacity={0.5 + Math.sin((clock - blocked.time) * 4) * 0.2}
        />
      )}
      {flights.map((event, i) => {
        const queued = Boolean(
          queueStop &&
            i >= queueStop.index &&
            clock >= queueStop.time - 80 / (880 / FEED_DURATION),
        );
        if (!queued && clock >= event.arrival) return null;
        const spawn = event.arrival - FEED_DURATION - TRANSFER_DURATION;
        if (clock < spawn) return null;
        const phase = clamp(
          (clock - event.arrival + TRANSFER_DURATION) / TRANSFER_DURATION,
        );
        const dest = position(Math.max(0, order.indexOf(event.value)));
        const route = counterRoute(phase, dest.y);
        const feed = clamp((clock - spawn) / FEED_DURATION);
        const feedX = queued
          ? 1680 - (880 / FEED_DURATION) * (clock - spawn)
          : mix(1680, 800, feed);
        const queueX = queueStop ? 800 + (i - queueStop.index) * 110 : 800;
        const queueDistance = feedX - queueX;
        const queuedX =
          queueDistance >= 80
            ? feedX
            : queueDistance <= -80
              ? queueX
              : queueX + (queueDistance + 80) ** 2 / 320;
        const x = queued ? queuedX : phase > 0 ? route.x : feedX;
        const y = queued ? 450 : phase > 0 ? route.y : 450;
        const extent = queued ? 90 : mix(90, size, smooth(phase / 0.8));
        const matching = entries.some((entry) => entry.value === event.value);
        const opacity =
          fadeMatchingArrivals && matching && !queued
            ? smooth(
                (Math.hypot(x - dest.x, y - dest.y) - (extent + size) / 2 - 4) /
                  28,
              )
            : 1;
        return (
          <g
            key={i}
            opacity={opacity}
            data-flight-id={event.value}
            data-flight-index={i}
            data-x={x}
            data-y={y}
            data-arrival={event.arrival}
            data-transfer={phase}
            data-queued={queued || undefined}
            clipPath={`url(#counter-flight-${mode})`}
          >
            {glyph(event.value, x, y, extent)}
          </g>
        );
      })}
    </g>
  );
}
