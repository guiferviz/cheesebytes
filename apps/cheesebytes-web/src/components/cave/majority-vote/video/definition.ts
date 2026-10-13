import { defineVideoVisual } from "@guiferviz/cheese-bytes-video/actions";
export type ShapeKind = "square" | "circle" | "triangle" | "diamond";
export const SEQUENCE: ShapeKind[] = [
  "square",
  "circle",
  "triangle",
  "triangle",
  "square",
  "square",
  "square",
  "diamond",
  "square",
  "square",
];
export const NO_MAJORITY: ShapeKind[] = [
  "square",
  "circle",
  "triangle",
  "triangle",
  "diamond",
  "square",
  "square",
];
export const SHARDS: ShapeKind[][] = [
  SEQUENCE.slice(0, 2).concat(SEQUENCE.slice(4, 6)),
  SEQUENCE.slice(2, 4).concat(SEQUENCE.slice(6, 7)),
  SEQUENCE.slice(7),
];
export interface Summary {
  candidate: ShapeKind | null;
  strength: number;
}
export function summarize(values: readonly ShapeKind[]): Summary {
  let candidate: ShapeKind | null = null,
    strength = 0;
  for (const value of values) {
    if (strength === 0) {
      candidate = value;
      strength = 1;
    } else strength += value === candidate ? 1 : -1;
  }
  return { candidate, strength };
}
export function merge(a: Summary, b: Summary): Summary {
  if (!a.strength) return b;
  if (!b.strength) return a;
  if (a.candidate === b.candidate)
    return { candidate: a.candidate, strength: a.strength + b.strength };
  return a.strength >= b.strength
    ? { candidate: a.candidate, strength: a.strength - b.strength }
    : { candidate: b.candidate, strength: b.strength - a.strength };
}
export interface MajorityVideoState {
  scene: string;
  progress: number;
  seed?: number;
}
export const majorityVideoDefinition = defineVideoVisual<MajorityVideoState>()({
  type: "majority-vote",
  actions: {
    setSeed: {
      timing: "instant",
      label: "Polygon seed",
      params: {
        seed: {
          type: "number",
          label: "Random seed",
          min: 0,
          max: 4294967295,
          step: 1,
        },
      },
      apply: (state, params) => ({ ...state, seed: Number(params.seed) }),
    },
    advance: {
      timing: "animated",
      label: "Advance visual",
      params: {
        value: {
          type: "number",
          label: "Visual step",
          min: 0,
          max: 20,
          step: 1,
        },
      },
      apply: (state, params, { progress }) => ({
        ...state,
        progress:
          state.progress + (Number(params.value) - state.progress) * progress,
      }),
    },
  },
});
