import type { CounterArrival } from "../../majority-vote/video/counter-flow";

/** An open set of kinds, not the four-kind worked example. Repeated kinds still
 * update their entries; unseen kinds consume more space. The first blocked
 * arrival is timed to the spoken limit, with space for its 0.75 s transfer. */
export function introMemoryArrivals(limitMark: number): CounterArrival[] {
  const prefix = [
    "polygon-0",
    "square",
    "circle",
    "polygon-1",
    "triangle",
    "square",
    "polygon-2",
    "circle",
    "polygon-3",
    "diamond",
    "polygon-4",
    "polygon-5",
    "polygon-6",
  ];
  const spacing = Math.max(0.55, (limitMark + 0.75 - 1.2) / 13);
  return Array.from({ length: 64 }, (_, i) => ({
    value:
      prefix[i] ??
      (i % 2 === 1
        ? `polygon-${7 + Math.floor((i - 13) / 2)}`
        : i % 4 === 2
          ? "circle"
          : "square"),
    arrival: 1.2 + i * spacing,
  }));
}
