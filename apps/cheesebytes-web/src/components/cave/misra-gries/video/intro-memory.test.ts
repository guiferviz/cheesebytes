import { describe, it, expect } from "vitest";
import { introMemoryArrivals } from "./intro-memory";
import {
  capacityState,
  MEMORY_CAPACITY,
  TRANSFER_DURATION,
} from "../../majority-vote/video/counter-flow";
describe("standalone memory introduction", () => {
  it("starts empty with unfamiliar kinds and retains repeated-kind counts", () => {
    const events = introMemoryArrivals(10);
    expect(events[0].value).toMatch(/^polygon-/);
    expect(capacityState(events, 0, []).entries).toEqual([]);
    const halfway = capacityState(events, events[8].arrival, []);
    expect(halfway.entries.some((e) => e.value.startsWith("polygon-"))).toBe(
      true,
    );
    expect(halfway.entries.find((e) => e.value === "square")?.count).toBe(2);
  });
  it("fills available memory before blocking a new kind, while the stream continues", () => {
    for (const mark of [8, 10, 12]) {
      const events = introMemoryArrivals(mark),
        state = capacityState(events, Infinity, []);
      expect(state.entries).toHaveLength(MEMORY_CAPACITY);
      expect(state.blocked?.event.value).toBe("polygon-7");
      expect(state.blocked!.time).toBeCloseTo(
        events[13].arrival - TRANSFER_DURATION,
      );
      expect(events.length).toBeGreaterThan(state.blocked!.index + 10);
    }
  });
});
