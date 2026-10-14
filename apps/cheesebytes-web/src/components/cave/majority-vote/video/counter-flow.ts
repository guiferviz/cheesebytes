import type { ShapeKind } from "./definition";

export interface CounterArrival {
  value: string;
  arrival: number;
}
export interface FrequencyEntry {
  value: string;
  count: number;
  lastArrival: number;
}
export const TRANSFER_DURATION = 0.42;
export const FEED_DURATION = 3.2;
export const MEMORY_CAPACITY = 11;

export function centredCounterLayout(count: number, memory: boolean) {
  const n = Math.max(1, count);
  const q = memory ? Math.max(0, Math.min(1, (n - 4) / 7)) : 0;
  const compact = q * q * (3 - 2 * q);
  const size = 90 - 34 * compact;
  const pitch = memory
    ? Math.min(160, Math.max(68, (740 - size) / Math.max(1, n - 1)))
    : 160;
  return { compact, size, pitch, top: 450 - ((n - 1) * pitch) / 2 };
}

/** A full table can update known values; the next unseen value blocks at intake. */
export function capacityState(
  arrivals: readonly CounterArrival[],
  time: number,
  initial: readonly FrequencyEntry[],
  capacity = MEMORY_CAPACITY,
) {
  const entries = initial.map((entry) => ({
    ...entry,
    lastArrival: -Infinity,
  }));
  for (let index = 0; index < arrivals.length; index++) {
    const event = arrivals[index];
    const entry = entries.find((entry) => entry.value === event.value);
    const blockedAt = event.arrival - TRANSFER_DURATION;
    if (!entry && entries.length >= capacity && time >= blockedAt)
      return { entries, blocked: { event, index, time: blockedAt } };
    if (event.arrival > time) break;
    if (entry) {
      entry.count++;
      entry.lastArrival = event.arrival;
    } else
      entries.push({
        value: event.value,
        count: 1,
        lastArrival: event.arrival,
      });
  }
  return { entries, blocked: null };
}
export const COUNTING_VALUES: ShapeKind[] = [
  "square",
  "circle",
  "triangle",
  "square",
  "square",
  "diamond",
  "square",
  "triangle",
  "square",
  "square",
];
export function countingArrivals(
  countMark: number,
  simpleMark = countMark + 6.8,
): CounterArrival[] {
  const first = Math.max(countMark + 0.45, FEED_DURATION + TRANSFER_DURATION);
  const spacing = Math.max(0.38, (simpleMark - 0.35 - first) / 9);
  return COUNTING_VALUES.map((value, i) => ({
    value,
    arrival: first + i * spacing,
  }));
}
export function memoryArrivals(questionMark: number): CounterArrival[] {
  const known = ["square", "square", "circle", "square"];
  let previous = -Infinity;
  return Array.from({ length: 94 }, (_, i) => ({
    value:
      i < known.length
        ? known[i]
        : i % 2 === 0
          ? "square"
          : `polygon-${Math.floor((i - 4) / 2)}`,
    arrival: (previous = Math.max(
      previous + 0.55,
      0.65 + (questionMark - 0.8) * (i / 90) ** 0.7,
    )),
  }));
}

/** Leave the belt sideways, travel in a clear aisle, then merge into one row. */
export function counterRoute(progress: number, targetY: number) {
  const smooth = (v: number) => {
    const q = Math.max(0, Math.min(1, v));
    return q * q * (3 - 2 * q);
  };
  if (progress < 0.22)
    return { x: 800 - 110 * smooth(progress / 0.22), y: 450 };
  if (progress < 0.8)
    return {
      x: 690,
      y: 450 + (targetY - 450) * smooth((progress - 0.22) / 0.58),
    };
  return { x: 690 - 260 * smooth((progress - 0.8) / 0.2), y: targetY };
}
export function initialFrequencies(): FrequencyEntry[] {
  return frequenciesAt(countingArrivals(0), Infinity);
}
/** Arrivals, counts and pulses share one exact timestamp, including on seek. */
export function frequenciesAt(
  arrivals: readonly CounterArrival[],
  time: number,
  initial: readonly FrequencyEntry[] = [],
): FrequencyEntry[] {
  const entries = initial.map((entry) => ({
    ...entry,
    lastArrival: -Infinity,
  }));
  for (const event of arrivals) {
    if (event.arrival > time) break;
    const entry = entries.find((entry) => entry.value === event.value);
    if (entry) {
      entry.count++;
      entry.lastArrival = event.arrival;
    } else
      entries.push({
        value: event.value,
        count: 1,
        lastArrival: event.arrival,
      });
  }
  return entries;
}
