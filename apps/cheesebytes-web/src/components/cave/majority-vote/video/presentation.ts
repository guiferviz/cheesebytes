import { itemGrid } from "@guiferviz/cheese-bytes-video/item-layouts";
import {
  clampProgress,
  smoothStep,
  moveHoldFade,
} from "@guiferviz/cheese-bytes-video/motion";
import type { ShapeKind } from "./definition";

/** Story choreography; all values are sampled from the absolute video clock. */
export const clamp = clampProgress;
export const smooth = smoothStep;
export const mix = (a: number, b: number, q: number) => a + (b - a) * q;

/** Subtle continuous motion, sampled from the video clock rather than entry progress. */
export function gentleFloat(time: number) {
  return {
    offsetY: Math.sin((time * Math.PI * 2) / 6.8) * 6,
    rotate: Math.sin((time * Math.PI * 2) / 8.4) * 1.5,
  };
}

/** Preserve a waiting item's angle as it becomes the next arrival, then match the candidate. */
export function arrivalRotation(time: number, index: number, progress: number) {
  const waiting = Math.sin(time * 0.5 + index) * 2;
  return mix(waiting, gentleFloat(time).rotate, clamp(progress));
}

export function closingChoreography(
  time: number,
  marks: Record<string, number>,
) {
  const remember = marks.remember ?? Infinity;
  const after = Math.max(0, time - remember);
  return {
    travelTime:
      time <= remember ? time : remember + 0.45 * (1 - Math.exp(-after / 0.45)),
    recall: smooth(after / 2),
    counter: smooth((time - (marks.counter ?? Infinity)) / 0.8),
    brand: smooth((time - (marks.end ?? Infinity) - 0.25) / 0.5),
  };
}

/** Finish the subtraction, then hold the matching example through the cluster bridge. */
export function mergeChoreography(time: number, marks: Record<string, number>) {
  const after = (mark: string) => time - (marks[mark] ?? Infinity);
  const matching = smooth(after("same") / 0.8);
  return {
    expand: smooth(after("different") / 0.9),
    cancelTime: after("cancel"),
    survivor: smooth((after("cancel") - 1.55) / 0.9),
    actual: 1 - matching,
    matching,
    addition: smooth(after("sum") / 1.2),
  };
}

/** Keep summaries readable, cancel equal opposing weights, then count the survivor. */
export function clusterChoreography(
  time: number,
  marks: Record<string, number>,
) {
  const combineAt = marks.combine ?? Infinity;
  const countAt = marks.counts ?? Infinity;
  return {
    collapse: smooth((time - (marks.three ?? Infinity)) / 0.9),
    move: smooth((time - combineAt) / 1),
    cancel: smooth((time - combineAt - 1.6) / 0.75),
    settle: smooth((time - combineAt - 2.35) / 0.6),
    broadcast: smooth((time - countAt) / 1.1),
    counts: smooth((time - countAt - 1.1) / 0.55),
    total: smooth((time - (marks.total ?? Infinity)) / 0.8),
  };
}

// Normalized units here; each scene maps its own duration onto this sequence.
const cancellation = moveHoldFade({
  move: 0.5,
  hold: 0.14,
  fade: 0.36,
});

export function ringPoint(index: number) {
  const angle = -Math.PI / 2 + (index * Math.PI * 2) / 10;
  return { x: 800 + Math.cos(angle) * 265, y: 450 + Math.sin(angle) * 265 };
}

/** The two surviving squares retain their identity across the example reset. */
export function survivorPoint(index: number) {
  return { x: index === 8 ? 740 : 860, y: 450 };
}

export function pairPose(
  x: number,
  y: number,
  targetX: number,
  targetY: number,
  progress: number,
) {
  const motion = cancellation.sample(progress);
  return {
    x: mix(x, targetX, motion.progress),
    y: mix(y, targetY, motion.progress),
    opacity: motion.opacity,
  };
}

export function ringPairPose(
  index: number,
  pair: readonly number[],
  progress: number,
) {
  const start = ringPoint(index);
  const ordered = [...pair].sort(
    (a, b) => ringPoint(a).x - ringPoint(b).x || a - b,
  );
  return pairPose(
    start.x,
    start.y,
    ordered.indexOf(index) === 0 ? 740 : 860,
    450,
    progress,
  );
}

export function resetRingPose(index: number, time: number) {
  const end = ringPoint(index);
  const q = smooth(time / 1.1);
  if (index === 8 || index === 9) {
    const start = survivorPoint(index);
    return { x: mix(start.x, end.x, q), y: mix(start.y, end.y, q), opacity: 1 };
  }
  return { ...end, opacity: smooth((time - 0.25) / 0.85) };
}

/** Stable identities: runs enter from the right; visible pieces never change type. */
export function introShape(index: number, row: number): ShapeKind {
  const squares: ShapeKind[] = [
    "square",
    "circle",
    "square",
    "triangle",
    "square",
    "square",
    "diamond",
    "square",
  ];
  const circles: ShapeKind[] = [
    "circle",
    "circle",
    "square",
    "circle",
    "triangle",
    "circle",
    "circle",
    "diamond",
  ];
  const mixed: ShapeKind[] = [
    "square",
    "triangle",
    "circle",
    "diamond",
    "circle",
    "square",
    "triangle",
    "square",
  ];
  const key = index + row * 3;
  const pattern =
    row === 1 && index >= 13 && index < 25
      ? circles
      : row === 1 && index < 13
        ? squares
        : mixed;
  return pattern[((key % pattern.length) + pattern.length) % pattern.length];
}

export function introItems(time: number, row: number) {
  const speed = row === 1 ? 230 : 130;
  const offset = row * 65;
  const first = Math.floor((time * speed - offset - 170) / 170);
  return Array.from({ length: 13 }, (_, i) => {
    const index = first + i;
    return {
      index,
      kind: introShape(index, row),
      x: index * 170 - time * speed + offset,
    };
  });
}

/** Keep the outgoing visual alive briefly, without keeping its logical state. */
export function arrivalFade(
  time: number,
  processed: number,
  progressAt: (time: number) => number,
  duration = 0.6,
) {
  if (!processed) return 0;
  let low = Math.max(0, time - duration);
  let high = time;
  const completedAt = (t: number) => Math.floor(progressAt(t) + 1e-6);
  if (completedAt(low) >= processed) return 0;
  // Invert the actual evaluated timeline, including inspector easing/duration.
  for (let i = 0; i < 18; i++) {
    const middle = (low + high) / 2;
    if (completedAt(middle) < processed) low = middle;
    else high = middle;
  }
  return 1 - smooth((time - high) / duration);
}

export function clusterPoint(cluster: number, index: number, count: number) {
  return itemGrid({
    rows: count === 3 ? [1, 2] : [2, 2],
    center: { x: 360 + cluster * 440, y: 400 },
    columnSpacing: 108,
    rowSpacing: 108,
  })[index];
}
