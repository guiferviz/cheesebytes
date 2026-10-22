import { STREAM, trace, type Kind } from "./definition";

export const clamp = (n: number) => Math.max(0, Math.min(1, n));
export const smooth = (n: number) => {
  const t = clamp(n);
  return t * t * t * (t * (t * 6 - 15) + 10);
};
export const mix = (a: number, b: number, t: number) => a + (b - a) * t;
export const slotX = (index: number, capacity: number) =>
  800 + (index - (capacity - 1) / 2) * (capacity === 2 ? 370 : 325);
export const ribbonX = (index: number) => 212 + index * 84;
export const rangeX = (n: number) => 370 + ((n - 1) * 1000) / 7;
export interface Point {
  x: number;
  y: number;
}
const between = (a: Point, b: Point, t: number): Point => ({
  x: mix(a.x, b.x, t),
  y: mix(a.y, b.y, t),
});
const distance = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y);

/** Round the route's corners, then travel by distance with one eased start/end.
 * Gutters keep an arrival clear of the stream and of unrelated candidate piles. */
export function route(points: Point[], progress: number, radius = 30): Point {
  const samples: Point[] = [points[0]];
  for (let i = 1; i < points.length - 1; i++) {
    const a = points[i - 1],
      b = points[i],
      c = points[i + 1];
    const r = Math.min(radius, distance(a, b) / 2, distance(b, c) / 2);
    const entry = between(b, a, r / (distance(a, b) || 1)),
      exit = between(b, c, r / (distance(b, c) || 1));
    samples.push(entry);
    for (let j = 1; j <= 12; j++) {
      const t = j / 12;
      samples.push(between(between(entry, b, t), between(b, exit, t), t));
    }
  }
  samples.push(points[points.length - 1]);
  const lengths = samples.slice(1).map((p, i) => distance(samples[i], p));
  let remaining = smooth(progress) * lengths.reduce((a, b) => a + b, 0);
  for (let i = 0; i < lengths.length; i++) {
    if (remaining <= lengths[i])
      return between(samples[i], samples[i + 1], remaining / (lengths[i] || 1));
    remaining -= lengths[i];
  }
  return samples[samples.length - 1];
}

/** Three columns stay in the same order when another row opens. */
export function pilePoint(index: number, count: number, x: number): Point {
  const rows = Math.ceil(count / 3),
    row = Math.floor(index / 3),
    inRow = Math.min(3, count - row * 3);
  return {
    x: x + ((index % 3) - (inRow - 1) / 2) * 64,
    y: 435 + (row - (rows - 1) / 2) * 64,
  };
}
export function spreadPose(index: number, progress: number) {
  const source = pilePoint(index, 4, slotX(0, 2));
  const fan = smooth(progress / 0.6),
    lift = smooth((progress - 0.5) / 0.5);
  return {
    x: mix(source.x, [470, 690, 800, 580][index], fan),
    y: mix(source.y, 310, lift),
    size: mix(54, 78, lift),
  };
}
export function possiblePose(index: number, progress: number) {
  return {
    x: mix(520 + index * 280, 910 + index * 110, smooth(progress / 0.6)),
    y: mix(565, 310, smooth((progress - 0.5) / 0.5)),
  };
}
export interface Actor extends Point {
  id: string;
  kind: Kind;
  size: number;
  opacity: number;
  role: "stream" | "pile" | "arrival" | "removed";
}
const TWO = trace(STREAM, 2),
  THREE = trace(STREAM, 3);
export function traceFrame(progress: number, capacity: number) {
  const states = capacity === 2 ? TWO : THREE,
    p = Math.max(0, Math.min(15, progress)),
    done = p === 15;
  const n = Math.min(14, Math.floor(p)),
    f = done ? 1 : p - n,
    before = states[n],
    after = states[n + 1],
    incoming = STREAM[n];
  const cancel = after.event === "cancel",
    q = clamp((f - 0.3) / 0.7),
    faded = cancel ? smooth((q - 0.75) / 0.2) : 0;
  const committed = done || (cancel ? q >= 0.85 : f >= 0.96),
    summary = committed ? after : before;
  const reflow = cancel ? smooth((q - 0.22) / 0.5) : smooth((f - 0.12) / 0.43);
  const actors: Actor[] = [];
  let arrival: Actor | undefined;
  if (!done) {
    if (cancel) {
      arrival = {
        id: "arrival",
        kind: incoming,
        ...route(
          [
            { x: ribbonX(n), y: 190 },
            { x: ribbonX(n), y: 255 },
            { x: 800, y: 255 },
          ],
          f / 0.3,
          20,
        ),
        size: 50,
        opacity: 1 - faded,
        role: "arrival",
      };
    } else {
      const slot = after.slots.indexOf(incoming),
        x = slotX(slot, capacity),
        count = after.counts[incoming]!;
      const target = pilePoint(count - 1, count, x);
      arrival = {
        id: "arrival",
        kind: incoming,
        ...route(
          [
            { x: ribbonX(n), y: 190 },
            { x: ribbonX(n), y: 280 },
            { x: x + 148, y: 280 },
            { x: x + 148, y: target.y },
            target,
          ],
          f / 0.96,
        ),
        size: mix(50, 54, smooth(f / 0.96)),
        opacity: 1,
        role: "arrival",
      };
    }
  }
  STREAM.forEach((kind, i) => {
    const opacity =
      i === n && !done
        ? 0.4 *
          smooth((distance(arrival!, { x: ribbonX(n), y: 190 }) - 60) / 25)
        : done || i < n
          ? 0.4
          : 1;
    actors.push({
      id: `stream-${i}`,
      kind,
      x: ribbonX(i),
      y: 190,
      size: 50,
      opacity,
      role: "stream",
    });
  });
  const slots = done ? after.slots : before.slots;
  slots.forEach((kind, i) => {
    if (!kind) return;
    const x = slotX(i, capacity),
      oldCount = (done ? after : before).counts[kind]!,
      newCount = after.counts[kind] ?? 0;
    for (let j = 0; j < oldCount; j++) {
      const from = pilePoint(j, oldCount, x),
        removed = !done && cancel && j === oldCount - 1;
      const to = pilePoint(j, Math.max(1, newCount), x);
      const pose = removed
        ? route(
            [
              from,
              { x: x + 148, y: from.y },
              { x: x + 148, y: 325 },
              { x, y: 325 },
            ],
            q / 0.75,
          )
        : between(from, to, done ? 0 : reflow);
      actors.push({
        id: `slot-${i}-${j}`,
        kind,
        ...pose,
        size: 54,
        opacity: removed ? 1 - faded : 1,
        role: removed ? "removed" : "pile",
      });
    }
  });
  if (arrival) actors.push(arrival);
  return { actors, summary, progress: p };
}
