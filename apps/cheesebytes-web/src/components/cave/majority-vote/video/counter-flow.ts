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
export const TRANSFER_DURATION = 0.75;
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

/** Two tangent-continuous curves: keep clear of the table until on the target row.
 * Entry velocity matches the belt; the only full stop is at the counter itself.
 */
export function counterRoute(progress: number, targetY: number) {
  const p = Math.max(0, Math.min(1, progress));
  const bezier = (a: number, b: number, c: number, d: number, q: number) =>
    (1 - q) ** 3 * a +
    3 * (1 - q) ** 2 * q * b +
    3 * (1 - q) * q * q * c +
    q ** 3 * d;
  const split = 0.72;
  const beltSpeed = 880 / FEED_DURATION;
  const entryControl = 800 - (beltSpeed * TRANSFER_DURATION * split) / 3;
  const joinControl = 620 - ((690 - 620) * (1 - split)) / split;
  if (p < split) {
    const q = p / split;
    return {
      x: bezier(800, entryControl, 690, 620, q),
      y: bezier(450, 450, targetY, targetY, q),
    };
  }
  return {
    x: bezier(620, joinControl, 430, 430, (p - split) / (1 - split)),
    y: targetY,
  };
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
