import { SHAPES } from "../MajorityVoteConstants";
import type { ShapeKind } from "./definition";

/** One readable resting opacity for every de-emphasized shape in this story. */
export const DIMMED_SHAPE_OPACITY = 0.4;

export function Shape({
  kind,
  x,
  y,
  size = 64,
  opacity = 1,
  rotate = 0,
  colour,
  highlight = 0,
}: {
  kind: ShapeKind;
  x: number;
  y: number;
  size?: number;
  opacity?: number;
  rotate?: number;
  colour?: string;
  highlight?: number;
}) {
  const r = size / 2;
  return (
    <g
      data-shape-kind={kind}
      transform={`translate(${x} ${y}) rotate(${rotate})`}
      opacity={opacity}
      fill={colour ?? SHAPES.find((s) => s.type === kind)!.color}
      stroke="#ffffff30"
      strokeWidth={1.3}
    >
      {highlight > 0 && (
        <rect
          data-shape-highlight
          x={-r - 8}
          y={-r - 8}
          width={size + 16}
          height={size + 16}
          rx={size * 0.095 + 6}
          fill="none"
          stroke="#64b5f6"
          strokeWidth={2}
          opacity={highlight * 0.8}
        />
      )}
      {kind === "square" && (
        <rect x={-r} y={-r} width={size} height={size} rx={size * 0.095} />
      )}
      {kind === "circle" && <circle r={r} />}
      {kind === "triangle" && <path d={`M0 ${-r} L${r} ${r} L${-r} ${r} Z`} />}
      {kind === "diamond" && <path d={`M0 ${-r} L${r} 0 L0 ${r} L${-r} 0 Z`} />}
    </g>
  );
}
