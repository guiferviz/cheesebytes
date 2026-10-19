import { describe, expect, it } from "vitest";
import {
  countingArrivals,
  frequenciesAt,
  initialFrequencies,
  memoryArrivals,
  counterRoute,
  FEED_DURATION,
  TRANSFER_DURATION,
  centredCounterLayout,
  capacityState,
  MEMORY_CAPACITY,
} from "./counter-flow";

describe("frequency arrivals", () => {
  it("centres one, two, three and four counters at the belt height", () => {
    for (const n of [1, 2, 3, 4]) {
      const layout = centredCounterLayout(n, false);
      expect(layout.top + ((n - 1) * layout.pitch) / 2).toBe(450);
    }
    const three = centredCounterLayout(3, false);
    expect(three.top + three.pitch).toBe(450);
  });
  it("keeps compacted counters centred and inside the available vertical space", () => {
    for (let n = 4; n <= MEMORY_CAPACITY; n++) {
      const layout = centredCounterLayout(n, true);
      expect(layout.top + ((n - 1) * layout.pitch) / 2).toBeCloseTo(450);
      expect(layout.top - layout.size / 2).toBeGreaterThanOrEqual(79.999);
      expect(
        layout.top + (n - 1) * layout.pitch + layout.size / 2,
      ).toBeLessThanOrEqual(820.001);
      expect(layout.pitch - layout.size).toBeGreaterThan(10);
    }
  });
  it("updates a known value at capacity, then blocks an unseen value at intake", () => {
    const initial = [{ value: "square", count: 6, lastArrival: 0 }];
    const events = [
      { value: "square", arrival: 1 },
      { value: "diamond", arrival: 2 },
      { value: "square", arrival: 3 },
    ];
    const before = capacityState(events, 1, initial, 1);
    expect(before.entries[0].count).toBe(7);
    expect(before.blocked).toBeNull();
    const blocked = capacityState(events, 2 - TRANSFER_DURATION, initial, 1);
    expect(blocked.blocked?.event.value).toBe("diamond");
    expect(blocked.entries).toHaveLength(1);
    expect(capacityState(events, 10, initial, 1).entries).toEqual(
      blocked.entries,
    );
  });
  it("creates the first slot and its pulse only at the arrival instant", () => {
    const events = countingArrivals(1, 8);
    const arrival = events[0].arrival;
    expect(frequenciesAt(events, arrival - 0.001)).toEqual([]);
    expect(frequenciesAt(events, arrival)).toEqual([
      { value: "square", count: 1, lastArrival: arrival },
    ]);
  });
  it("updates existing slots without storing repeat copies", () => {
    const events = countingArrivals(1, 8);
    const entries = frequenciesAt(events, events[3].arrival);
    expect(entries).toHaveLength(3);
    expect(entries[0]).toEqual({
      value: "square",
      count: 2,
      lastArrival: events[3].arrival,
    });
    expect(
      initialFrequencies().map(({ value, count }) => ({ value, count })),
    ).toEqual([
      { value: "square", count: 6 },
      { value: "circle", count: 1 },
      { value: "triangle", count: 2 },
      { value: "diamond", count: 1 },
    ]);
  });
  it("finishes the initial count before the narration moves on", () => {
    const events = countingArrivals(1, 8);
    expect(events.at(-1)!.arrival).toBeLessThan(8);
  });
  it("fills memory with new values while preserving a strict majority", () => {
    const initial = initialFrequencies(),
      events = memoryArrivals(12);
    const entries = frequenciesAt(events, 12, initial);
    expect(entries.length).toBeGreaterThan(10);
    const square = entries.find((e) => e.value === "square")!;
    const total = entries.reduce((n, e) => n + e.count, 0);
    expect(square.count).toBeGreaterThan(total / 2);
    expect(
      entries
        .filter((e) => e.value.startsWith("polygon-"))
        .every((e) => e.count === 1),
    ).toBe(true);
    const earlier = frequenciesAt(events, 5, initial);
    expect(frequenciesAt(events, 12, initial)).toEqual(entries);
    expect(earlier.length).toBeLessThan(entries.length);
  });
  it("starts the finite belt with one first shape, rather than prefilled traffic", () => {
    const events = countingArrivals(1, 8);
    expect(events[0].arrival - FEED_DURATION - TRANSFER_DURATION).toBeCloseTo(
      0,
    );
    expect(
      events[1].arrival - FEED_DURATION - TRANSFER_DURATION,
    ).toBeGreaterThan(0);
    expect(new Set(events.map((event) => event.value)).size).toBe(4);
  });
  it("matches the belt velocity and keeps velocity continuous at the curve join", () => {
    const dt = 0.00001;
    for (const y of [80, 210, 450, 690, 820]) {
      const velocity = (p: number) => {
        const a = counterRoute(p - dt, y),
          b = counterRoute(p, y);
        return {
          x: (b.x - a.x) / (dt * TRANSFER_DURATION),
          y: (b.y - a.y) / (dt * TRANSFER_DURATION),
        };
      };
      const entry = counterRoute(dt, y);
      expect((entry.x - 800) / (dt * TRANSFER_DURATION)).toBeCloseTo(
        -880 / FEED_DURATION,
        0,
      );
      const before = velocity(0.72),
        after = velocity(0.72 + dt);
      expect(Math.hypot(before.x - after.x, before.y - after.y)).toBeLessThan(
        0.2,
      );
      expect(Math.hypot(velocity(1).x, velocity(1).y)).toBeLessThan(0.2);
      // No artificial stops between the belt and the final destination.
      for (let i = 1; i < 99; i++) {
        const v = velocity(i / 100);
        expect(Math.hypot(v.x, v.y)).toBeGreaterThan(100);
        expect(v.x).toBeLessThan(0);
      }
    }
  });
  it("routes through an empty aisle before approaching only the target row", () => {
    for (const y of [130, 330, 490, 650, 810]) {
      expect(counterRoute(0, y)).toEqual({ x: 800, y: 450 });
      expect(counterRoute(1, y)).toEqual({ x: 430, y });
      for (let step = 0; step <= 100; step++) {
        const progress = step / 100,
          point = counterRoute(progress, y);
        if (progress < 0.72) expect(point.x).toBeGreaterThanOrEqual(620);
        else expect(point.y).toBe(y);
      }
    }
  });
});
