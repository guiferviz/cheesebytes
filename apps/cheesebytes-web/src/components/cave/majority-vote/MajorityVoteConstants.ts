export interface Shape {
  type: "circle" | "square" | "triangle" | "diamond";
  color: string;
  bgClass: string;
  label: string;
}

export const SHAPES: Shape[] = [
  { type: "circle", color: "#e57373", bgClass: "bg-red-400", label: "Circle" },
  {
    type: "square",
    color: "#64b5f6",
    bgClass: "bg-blue-400",
    label: "Square",
  },
  {
    type: "triangle",
    color: "#81c784",
    bgClass: "bg-green-400",
    label: "Triangle",
  },
  {
    type: "diamond",
    color: "#ffb74d",
    bgClass: "bg-amber-400",
    label: "Diamond",
  },
];

export const ARTICLE_SEQUENCE: Shape[] = [
  SHAPES[0], // circle
  SHAPES[1], // square
  SHAPES[0], // circle
  SHAPES[0], // circle
  SHAPES[2], // triangle
  SHAPES[0], // circle
  SHAPES[3], // diamond
  SHAPES[0], // circle
  SHAPES[1], // square
  SHAPES[0], // circle
  SHAPES[0], // circle
  SHAPES[2], // triangle
];
