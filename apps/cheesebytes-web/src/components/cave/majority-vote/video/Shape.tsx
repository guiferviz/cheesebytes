import { SHAPES } from "../MajorityVoteConstants";
import type { ShapeKind } from "./definition";

export function Shape({
  kind,
  x,
  y,
  size = 64,
  opacity = 1,
  rotate = 0,
  colour,
}: {
  kind: ShapeKind;
  x: number;
  y: number;
  size?: number;
  opacity?: number;
  rotate?: number;
  colour?: string;
}) {
  const r = size / 2;
  return (
    <g
      transform={`translate(${x} ${y}) rotate(${rotate})`}
      opacity={opacity}
      fill={colour ?? SHAPES.find((s) => s.type === kind)!.color}
      stroke="#ffffff30"
      strokeWidth={1.3}
    >
      {kind === "square" && (
        <rect x={-r} y={-r} width={size} height={size} rx={size * 0.095} />
      )}
      {kind === "circle" && <circle r={r} />}
      {kind === "triangle" && <path d={`M0 ${-r} L${r} ${r} L${-r} ${r} Z`} />}
      {kind === "diamond" && <path d={`M0 ${-r} L${r} 0 L0 ${r} L${-r} 0 Z`} />}
    </g>
  );
}
