import { defineVideoVisual } from "@guiferviz/cheese-bytes-video/actions";
export type Kind = "square" | "circle" | "triangle" | "diamond";
export const KINDS: Kind[] = ["square", "circle", "triangle", "diamond"];
export const STREAM: Kind[] = [..."SCSSCTSCDSTCSCS"].map(
  (c) => ({ S: "square", C: "circle", T: "triangle", D: "diamond" })[c] as Kind,
);
export interface Summary {
  counts: Partial<Record<Kind, number>>;
  slots: (Kind | null)[];
  removed: number;
  event: "start" | "insert" | "increment" | "cancel";
  group: Kind[];
}
export function trace(values: readonly Kind[], capacity: number): Summary[] {
  if (!Number.isInteger(capacity) || capacity < 1)
    throw new Error("Capacity must be a positive integer");
  let counts: Partial<Record<Kind, number>> = {},
    removed = 0;
  const slots: (Kind | null)[] = Array(capacity).fill(null);
  const states: Summary[] = [
    { counts: {}, slots: [...slots], removed: 0, event: "start", group: [] },
  ];
  for (const kind of values) {
    let event: Summary["event"],
      group: Kind[] = [];
    if (counts[kind]) {
      counts[kind]!++;
      event = "increment";
    } else if (Object.keys(counts).length < capacity) {
      counts[kind] = 1;
      slots[slots.indexOf(null)] = kind;
      event = "insert";
    } else {
      group = [...(Object.keys(counts) as Kind[]), kind];
      removed++;
      event = "cancel";
      for (const key of Object.keys(counts) as Kind[]) {
        counts[key]!--;
        if (!counts[key]) {
          delete counts[key];
          slots[slots.indexOf(key)] = null;
        }
      }
    }
    states.push({
      counts: { ...counts },
      slots: [...slots],
      removed,
      event,
      group,
    });
  }
  return states;
}
export interface State {
  scene: string;
  step: number;
}
export const misraGriesDefinition = defineVideoVisual<State>()({
  type: "misra-gries",
  actions: {
    advance: {
      timing: "animated",
      label: "Narrative step",
      params: { value: { type: "number", min: 0, max: 20, step: 0.1 } },
      apply: (state, params, { progress }) => ({
        ...state,
        step: state.step + (Number(params.value) - state.step) * progress,
      }),
    },
  },
});
