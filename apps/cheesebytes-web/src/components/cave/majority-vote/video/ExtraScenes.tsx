import { Shape, DIMMED_SHAPE_OPACITY } from "./Shape";
import { moveHoldFade } from "@guiferviz/cheese-bytes-video/motion";
import {
  ringPairPose,
  resetRingPose,
  clusterPoint,
  clamp,
  mix,
  smooth,
  mergeChoreography,
  clusterChoreography,
  closingChoreography,
  introItems,
  gentleFloat,
} from "./presentation";
import {
  FRIEND_PARTS,
  CLUSTER_PARTS,
  SEQUENCE,
  summarize,
  merge,
  type ShapeKind,
} from "./definition";

const gold = "#fbbf24",
  muted = "#94a3b8";
const mergeCancellation = moveHoldFade({
  move: 0.65,
  hold: 0.104,
  fade: 0.546,
});

export function ClosingScene({
  time,
  globalTime,
  marks,
}: {
  time: number;
  globalTime: number;
  marks: Record<string, number>;
}) {
  const motion = closingChoreography(time, marks);
  const floating = gentleFloat(globalTime);
  const selected = introItems(marks.remember ?? 2.5, 1)
    .filter((item) => item.kind === "square")
    .sort(
      (a, b) =>
        Number(a.x < 720) - Number(b.x < 720) ||
        Math.abs(a.x - 720) - Math.abs(b.x - 720),
    )[0];
  const sourceX = selected.index * 170 - motion.travelTime * 230 + 65;
  const sourceY =
    450 + Math.sin(selected.index * 1.7 + motion.travelTime * 0.6) * 18;
  return (
    <g
      data-closing-phase={
        motion.brand > 0 ? "outro" : motion.recall >= 1 ? "summary" : "stream"
      }
    >
      <g data-closing-stream opacity={1 - motion.recall}>
        {[0, 1, 2].map((row) => (
          <g key={row} opacity={row === 1 ? 1 : DIMMED_SHAPE_OPACITY}>
            {introItems(motion.travelTime, row)
              .filter((item) => row !== 1 || item.index !== selected.index)
              .map((item) => (
                <Shape
                  key={item.index}
                  kind={item.kind}
                  x={item.x}
                  y={
                    450 +
                    (row - 1) * 200 +
                    Math.sin(item.index * 1.7 + motion.travelTime * 0.6) * 18
                  }
                  size={row === 1 ? 90 : 54}
                  rotate={Math.sin(item.index + motion.travelTime * 0.3) * 2}
                />
              ))}
          </g>
        ))}
      </g>
      <g data-closing-candidate data-source-index={selected.index}>
        <Shape
          kind="square"
          x={mix(sourceX, 720, motion.recall)}
          y={mix(sourceY, 450 + floating.offsetY, motion.recall)}
          size={mix(90, 136, motion.recall)}
          rotate={mix(
            Math.sin(selected.index + motion.travelTime * 0.3) * 2,
            floating.rotate,
            motion.recall,
          )}
        />
      </g>
      <g data-closing-counter opacity={motion.counter}>
        <Label x={935} y={460} size={160} fill={gold}>
          1
        </Label>
      </g>
    </g>
  );
}
function Label({
  x = 800,
  y,
  children,
  size = 32,
  fill = muted,
  opacity = 1,
}: {
  x?: number;
  y: number;
  children: React.ReactNode;
  size?: number;
  fill?: string;
  opacity?: number;
}) {
  return (
    <text
      x={x}
      y={y}
      fontSize={size}
      fill={fill}
      textAnchor="middle"
      dominantBaseline="middle"
      opacity={opacity}
    >
      {children}
    </text>
  );
}

export function PairOrders({
  time,
  marks,
}: {
  time: number;
  marks: Record<string, number>;
}) {
  // Explicitly begin with circle + triangle. Four squares survive, rather than two.
  const pairs = [
    [1, 2],
    [0, 3],
    [4, 7],
  ];
  const start = marks.other ?? 4;
  const repeat = marks.repeat ?? 10;
  const progress =
    time < repeat
      ? clamp((time - start) / 1.6)
      : 1 + 2 * clamp((time - repeat) / 3.6);
  return (
    <g
      data-pair-order="non-square-first"
      data-survivors={progress >= 3 ? 4 : undefined}
    >
      {SEQUENCE.map((kind, i) => {
        const pair = pairs.findIndex((pair) => pair.includes(i));
        const q = smooth((time - repeat - 3.6) / 1);
        const source = resetRingPose(i, time);
        const rank = [5, 6, 8, 9].indexOf(i);
        const pose =
          pair < 0
            ? {
                x: mix(source.x, 620 + rank * 120, q),
                y: mix(source.y, 450, q),
                opacity: source.opacity,
              }
            : {
                ...ringPairPose(i, pairs[pair], progress - pair),
                opacity:
                  source.opacity *
                  ringPairPose(i, pairs[pair], progress - pair).opacity,
              };
        return (
          <Shape
            key={i}
            kind={kind}
            x={pose.x}
            y={pose.y}
            size={84}
            opacity={pose.opacity}
          />
        );
      })}
      <g opacity={smooth((time - (marks.result ?? 18)) / 0.6)}>
        <Shape kind="square" x={720} y={680} size={38} />
        <Label x={840} y={680} size={44} fill={gold}>
          2 → 4
        </Label>
      </g>
    </g>
  );
}

export function StrengthScene({
  time,
  marks,
}: {
  time: number;
  marks: Record<string, number>;
}) {
  const q = smooth((time - (marks.actual ?? Infinity)) / 0.65);
  return (
    <g>
      {SEQUENCE.map((kind, i) => (
        <Shape
          key={i}
          kind={kind}
          x={350 + i * 100}
          y={195}
          size={58}
          opacity={mix(1, kind === "square" ? 1 : DIMMED_SHAPE_OPACITY, q)}
          highlight={kind === "square" ? q : 0}
        />
      ))}
      <Shape kind="square" x={800} y={450} size={125} />
      <Label x={560} y={650} size={24}>
        strength
      </Label>
      <Label x={1040} y={650} size={24} opacity={q}>
        actual count
      </Label>
      <Label x={560} y={735} size={88} fill={gold}>
        2
      </Label>
      <Label x={1040} y={735} size={88} fill="#81c784" opacity={q}>
        6
      </Label>
      <Label x={800} y={735} size={52} opacity={q}>
        ≠
      </Label>
    </g>
  );
}

export function FriendScene({
  time,
  marks,
}: {
  time: number;
  marks: Record<string, number>;
}) {
  const lists = smooth((time - (marks.lists ?? 6)) / 0.9);
  const summaries = smooth((time - (marks.summaries ?? 15)) / 1.15);
  return (
    <g
      data-friend-summary={
        summaries >= 1
          ? FRIEND_PARTS.map((values) => {
              const result = summarize(values);
              return `${result.candidate}:${result.strength}`;
            }).join(",")
          : undefined
      }
    >
      {["You", "A friend"].map((name, i) => (
        <Label key={name} x={450 + i * 700} y={155} size={28}>
          {name}
        </Label>
      ))}
      {FRIEND_PARTS.map((values, side) => {
        const cx = 450 + side * 700,
          result = summarize(values);
        const kinds = [...new Set(values)];
        return (
          <g key={side}>
            {values.map((kind, i) => {
              const row = kinds.indexOf(kind);
              const startX = cx + (i - (values.length - 1) / 2) * 77;
              return (
                <Shape
                  key={i}
                  kind={kind}
                  x={mix(mix(startX, cx + 45, lists), cx, summaries)}
                  y={mix(
                    mix(400, 450 + (row - (kinds.length - 1) / 2) * 145, lists),
                    450,
                    summaries,
                  )}
                  size={mix(57, 94, summaries)}
                  opacity={(1 - lists) * (1 - summaries)}
                />
              );
            })}
            <g opacity={lists * (1 - summaries)}>
              {kinds.map((kind, row) => (
                <g key={kind}>
                  <Shape
                    kind={kind}
                    x={cx + 45}
                    y={450 + (row - (kinds.length - 1) / 2) * 145}
                    size={85}
                  />
                  <Label
                    x={cx - 65}
                    y={450 + (row - (kinds.length - 1) / 2) * 145}
                    size={58}
                    fill={gold}
                  >
                    {values.filter((v) => v === kind).length}
                  </Label>
                </g>
              ))}
            </g>
            <g opacity={summaries}>
              <Shape kind={result.candidate!} x={cx} y={450} size={110} />
              <Label x={cx} y={645} size={90} fill={gold}>
                {result.strength}
              </Label>
            </g>
          </g>
        );
      })}
      <g opacity={lists * (1 - summaries)}>
        <path
          data-friend-exchange
          d="M670 450 H930 M688 440 l-18 10 l18 10 M912 440 l18 10 l-18 10"
          fill="none"
          stroke={muted}
          strokeWidth={2}
          opacity={0.65}
        />
        <Label y={760} size={24} fill={muted}>
          More distinct shapes → more data to send
        </Label>
      </g>
    </g>
  );
}

export function MergeScene({
  time,
  marks,
}: {
  time: number;
  marks: Record<string, number>;
}) {
  const [left, right] = FRIEND_PARTS.map(summarize);
  const cancelledPairs = Math.min(left.strength, right.strength);
  const result = merge(left, right);
  const motion = mergeChoreography(time, marks);
  return (
    <g
      data-merge-case={
        motion.matching > 0.5 ? "matching-alternative" : "original-example"
      }
      data-merged-candidate={result.candidate ?? undefined}
      data-merged-strength={
        motion.survivor >= 1 && motion.actual > 0.99
          ? result.strength
          : undefined
      }
    >
      <g data-real-summary opacity={motion.actual * (1 - motion.expand)}>
        {[left, right].map((summary, side) => {
          const x = 450 + side * 700;
          return (
            <g key={side}>
              <Label x={x} y={155} size={28}>
                {side ? "A friend" : "You"}
              </Label>
              <Shape kind={summary.candidate!} x={x} y={450} size={110} />
              <Label x={x} y={645} size={90} fill={gold}>
                {summary.strength}
              </Label>
            </g>
          );
        })}
      </g>
      <g data-real-cancellation opacity={motion.actual * motion.expand}>
        {Array.from({ length: left.strength }, (_, i) => {
          const cancellation = mergeCancellation.sample(
            motion.cancelTime - i * 0.55,
          );
          const survives = i >= cancelledPairs;
          const q = survives ? motion.survivor : cancellation.progress;
          const sourceY = mix(
            450,
            450 + (i - (left.strength - 1) / 2) * 140,
            motion.expand,
          );
          return (
            <Shape
              key={i}
              kind="square"
              x={mix(450, survives ? 800 : 752, q)}
              y={mix(sourceY, 450, q)}
              size={
                survives
                  ? mix(mix(110, 86, motion.expand), 125, q)
                  : mix(110, 86, motion.expand)
              }
              opacity={survives ? 1 : cancellation.opacity}
            />
          );
        })}
        {Array.from({ length: right.strength }, (_, i) => {
          const cancellation = mergeCancellation.sample(
            motion.cancelTime - i * 0.55,
          );
          return (
            <Shape
              key={i}
              kind="circle"
              x={mix(1150, 848, cancellation.progress)}
              y={450 + (i - (right.strength - 1) / 2) * 140}
              size={mix(110, 86, motion.expand)}
              opacity={cancellation.opacity}
            />
          );
        })}
        <Label y={710} size={94} fill={gold} opacity={motion.survivor}>
          {result.strength}
        </Label>
      </g>
      <g data-matching-alternative opacity={motion.matching}>
        <Label y={175} size={28}>
          If they matched
        </Label>
        <g opacity={1 - motion.addition}>
          {[left.strength, right.strength].map((strength, side) => {
            const x = mix(450 + side * 700, 800, motion.addition);
            return (
              <g key={side}>
                <Shape kind="square" x={x} y={450} size={110} />
                <Label x={x} y={645} size={90} fill={gold}>
                  {strength}
                </Label>
              </g>
            );
          })}
          <Label y={450} size={70} fill={gold}>
            +
          </Label>
        </g>
        <g opacity={motion.addition}>
          <Shape kind="square" x={800} y={450} size={125} />
          <Label y={710} size={94} fill={gold}>
            {left.strength + right.strength}
          </Label>
        </g>
      </g>
    </g>
  );
}

export function ExtensionScene() {
  return (
    <g>
      <Label y={230} size={45} fill="#f8fafc">
        Misra–Gries
      </Label>
      {(["square", "circle", "triangle"] as ShapeKind[]).map((kind, i) => {
        const x = 530 + i * 270;
        return (
          <g key={kind}>
            <Shape kind={kind} x={x} y={440} size={100} />
            <path
              d={`M${x - 60} 630 H${x + 60} M${x - 60} 615 v30 M${x + 60} 615 v30`}
              stroke={muted}
              strokeWidth={2}
            />
            <circle cx={x} cy={630} r={6} fill={gold} />
          </g>
        );
      })}
      <Label y={745} size={28}>
        several candidates · bounded error
      </Label>
    </g>
  );
}

export function ClusterScene({
  time,
  marks,
}: {
  time: number;
  marks: Record<string, number>;
}) {
  const summaries = CLUSTER_PARTS.map(summarize);
  const combinedSummary = summaries.reduce(merge);
  const survivorIndex = summaries.findIndex(
    (summary) =>
      summary.candidate === combinedSummary.candidate &&
      summary.strength === combinedSummary.strength,
  );
  const values = CLUSTER_PARTS.flat();
  const verifiedCount = values.filter(
    (v) => v === combinedSummary.candidate,
  ).length;
  const fraction = `${verifiedCount} / ${values.length}`;
  const motion = clusterChoreography(time, marks);
  const phase =
    motion.broadcast > 0
      ? "verification"
      : motion.settle >= 1
        ? "combined"
        : motion.cancel > 0
          ? "cancelling"
          : motion.move > 0
            ? "combining"
            : motion.collapse >= 1
              ? "summaries"
              : "processing";
  return (
    <g
      data-cluster-phase={phase}
      data-cluster-verification={motion.total >= 1 ? fraction : undefined}
    >
      {CLUSTER_PARTS.map((values, i) => {
        const x = 360 + i * 440,
          result = summaries[i];
        const survives = i === survivorIndex;
        const summaryX = mix(
            mix(x, 660 + i * 140, motion.move),
            800,
            survives ? motion.settle : 0,
          ),
          summaryY = mix(400, 450, motion.move);
        const summaryOpacity =
          motion.collapse *
          (survives ? 1 : 1 - motion.cancel) *
          (1 - smooth(motion.broadcast * 2));
        return (
          <g key={i} data-cluster={i}>
            {values.map((kind, j) => {
              const point = clusterPoint(i, j, values.length);
              return (
                <g key={j} data-cluster-item={j}>
                  <Shape
                    kind={kind}
                    x={mix(point.x, x, motion.collapse)}
                    y={mix(point.y, 400, motion.collapse)}
                    size={72}
                    opacity={(1 - motion.collapse) * (1 - motion.broadcast)}
                  />
                </g>
              );
            })}
            <g
              data-cluster-summary
              data-strength={result.strength}
              opacity={summaryOpacity}
            >
              <Shape
                kind={result.candidate!}
                x={summaryX}
                y={summaryY}
                size={survives ? mix(100, 125, motion.settle) : 100}
              />
              <Label
                x={summaryX}
                y={summaryY + 210 + (survives ? 30 * motion.settle : 0)}
                size={72}
                fill={gold}
              >
                {result.strength}
              </Label>
            </g>
            <g
              data-cluster-exact-count
              opacity={smooth((motion.broadcast - 0.45) / 0.55)}
            >
              {values.map((kind, j) => {
                const point = clusterPoint(i, j, values.length);
                const matches = kind === combinedSummary.candidate;
                return (
                  <g key={j} data-verification-item={kind}>
                    <Shape
                      kind={kind}
                      x={point.x}
                      y={point.y}
                      size={72}
                      opacity={mix(
                        1,
                        matches ? 1 : DIMMED_SHAPE_OPACITY,
                        motion.counts,
                      )}
                      highlight={matches ? motion.counts : 0}
                    />
                  </g>
                );
              })}
              <Label
                x={x}
                y={630}
                size={72}
                fill={gold}
                opacity={motion.counts}
              >
                {values.filter((v) => v === combinedSummary.candidate).length}
              </Label>
              <path
                d={`M${x} 690 L800 760`}
                fill="none"
                stroke="#64b5f6"
                strokeWidth={2}
                opacity={0.3 * motion.total}
              />
            </g>
          </g>
        );
      })}
      <Label y={815} size={52} fill="#81c784" opacity={motion.total}>
        {fraction}
      </Label>
    </g>
  );
}
