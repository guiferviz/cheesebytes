import { Shape } from "./Shape";
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
const clamp = (v: number) => Math.max(0, Math.min(1, v));
const smooth = (v: number) => {
  const q = clamp(v);
  return q * q * (3 - 2 * q);
};
const mix = (a: number, b: number, q: number) => a + (b - a) * q;
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
      ? clamp((time - start) / 1.2)
      : 1 + 2 * smooth((time - repeat) / 3.2);
  return (
    <g
      data-pair-order="non-square-first"
      data-survivors={progress >= 3 ? 4 : undefined}
    >
      {SEQUENCE.map((kind, i) => {
        const pair = pairs.findIndex((pair) => pair.includes(i));
        const q =
          pair < 0
            ? smooth((time - repeat - 3.2) / 1)
            : smooth(progress - pair);
        const x = 520 + (i % 5) * 140,
          y = 350 + Math.floor(i / 5) * 200;
        const rank = [5, 6, 8, 9].indexOf(i);
        return (
          <Shape
            key={i}
            kind={kind}
            x={mix(x, pair < 0 ? 590 + rank * 140 : 800, q)}
            y={mix(y, 450, q)}
            size={pair < 0 ? mix(90, 102, q) : 90 * (1 - q * 0.35)}
            opacity={pair < 0 ? 1 : 1 - smooth((progress - pair - 0.65) / 0.35)}
          />
        );
      })}
      <g opacity={smooth((time - (marks.result ?? 18)) / 0.6)}>
        <Shape kind="square" x={700} y={715} size={38} />
        <Label x={835} y={715} size={44} fill={gold}>
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
  const q = smooth((time - (marks.balance ?? 3)) / 1.1);
  return (
    <g>
      {SEQUENCE.map((kind, i) => (
        <Shape
          key={i}
          kind={kind}
          x={350 + i * 100}
          y={195}
          size={58}
          opacity={kind === "square" ? 1 : 0.18}
        />
      ))}
      <Shape kind="square" x={800} y={450} size={125} />
      <Label x={560} y={650} size={24}>
        strength
      </Label>
      <Label x={1040} y={650} size={24}>
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
    <g data-friend-summary={summaries >= 1 ? "square:3,circle:2" : undefined}>
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
      <path
        d="M670 450 H930 m-18 -10 l18 10 l-18 10"
        stroke={muted}
        strokeWidth={2}
        opacity={lists * (1 - summaries) * 0.45}
      />
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
  const different = smooth((time - (marks.different ?? 4)) / 0.8);
  const example = smooth((time - (marks.example ?? 9)) / 0.8);
  const cancelTime = time - (marks.cancel ?? 15);
  const survivor = smooth((cancelTime - 1.8) / 1.2);
  // Show the operation on actual residual copies, not changing unexplained totals.
  const guarantee = smooth((time - (marks.guarantee ?? 23)) / 1.1);
  return (
    <g
      data-merged-candidate="square"
      data-merged-strength={survivor >= 1 ? 1 : undefined}
    >
      <g opacity={1 - example}>
        <Shape kind="square" x={520} y={410} size={100} />
        <Shape
          kind={different > 0.5 ? "circle" : "square"}
          x={1080}
          y={410}
          size={100}
          opacity={Math.abs(different - 0.5) * 2}
        />
        <Label x={520} y={610} size={78} fill={gold}>
          3
        </Label>
        <Label x={1080} y={610} size={78} fill={gold}>
          2
        </Label>
        <Label y={410} size={70} fill={gold}>
          {different < 0.5 ? "+" : "−"}
        </Label>
        <Label y={715} size={76} fill={gold}>
          {different < 0.5 ? "5" : "1"}
        </Label>
      </g>
      <g opacity={example}>
        {[0, 1, 2].map((i) => {
          const q = i < 2 ? smooth((cancelTime - i * 0.55) / 1.3) : survivor;
          return (
            <Shape
              key={i}
              kind="square"
              x={mix(510, 800, q)}
              y={mix(310 + i * 140, i < 2 ? 350 + i * 160 : 450, q)}
              size={i === 2 ? mix(86, 125, q) : 86 * (1 - 0.3 * q)}
              opacity={i === 2 ? 1 : 1 - smooth((q - 0.7) / 0.3)}
            />
          );
        })}
        {[0, 1].map((i) => {
          const q = smooth((cancelTime - i * 0.55) / 1.3);
          return (
            <Shape
              key={i}
              kind="circle"
              x={mix(1090, 800, q)}
              y={mix(380 + i * 140, 350 + i * 160, q)}
              size={86 * (1 - 0.3 * q)}
              opacity={1 - smooth((q - 0.7) / 0.3)}
            />
          );
        })}
        <Label y={710} size={94} fill={gold} opacity={survivor}>
          1
        </Label>
      </g>
      <g opacity={guarantee}>
        {FRIEND_PARTS.flat().map((kind, i) => (
          <Shape
            key={i}
            kind={kind}
            x={400 + i * 80}
            y={180}
            size={47}
            opacity={kind === "square" ? 1 : 0.3}
          />
        ))}
        <Label y={805} size={26}>
          6 squares out of 11 · remaining strength 1
        </Label>
      </g>
    </g>
  );
}

export function PrivacyScene({
  time,
  marks,
}: {
  time: number;
  marks: Record<string, number>;
}) {
  const transactionCount = SEQUENCE.length;
  const contribution = SEQUENCE.filter((value) => value === "square").length;
  const mapping = smooth((time - (marks.mapping ?? 10)) / 0.8);
  const candidate = smooth((time - (marks.candidate ?? 17)) / 1.5);
  const parallel = smooth((time - (marks.parallel ?? 28)) / 1.1);
  return (
    <g data-application="transaction-count" data-contribution="6/10">
      {SEQUENCE.map((kind, i) => {
        const x = 350 + i * 100,
          y = 325 + Math.sin(time * 0.4 + i) * 4;
        return (
          <g key={i}>
            <Shape
              kind={kind}
              x={x}
              y={y}
              size={70}
              opacity={mix(1, kind === "square" ? 1 : 0.15, candidate)}
            />
            <path
              d={`M${x - 18} ${y + 65} h36 m-36 10 h25`}
              stroke={muted}
              strokeWidth={2}
              opacity={mapping * (1 - parallel) * 0.5}
            />
          </g>
        );
      })}
      <Shape kind="square" x={640} y={565} size={100} />
      <Label x={900} y={565} size={78} fill={gold} opacity={candidate}>
        {contribution} / {transactionCount}
      </Label>
      <Label y={710} size={30} opacity={mapping * (1 - parallel)}>
        one shape = one person
      </Label>
      <g opacity={parallel}>
        {[540, 800, 1060].map((x, i) => (
          <g key={x}>
            <path
              d={`M${x} 770 L800 650`}
              stroke="#64b5f6"
              strokeWidth={2}
              opacity={0.4}
            />
            <Shape
              kind={i === 1 ? "triangle" : "square"}
              x={x}
              y={790}
              size={42}
            />
          </g>
        ))}
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
  const combinedSummary = CLUSTER_PARTS.map(summarize).reduce(merge);
  const values = CLUSTER_PARTS.flat();
  const verifiedCount = values.filter(
    (v) => v === combinedSummary.candidate,
  ).length;
  const fraction = `${verifiedCount} / ${values.length}`;
  const collapse = smooth((time - (marks.summaries ?? 5)) / 0.65);
  const combine = smooth((time - (marks.summaries ?? 5) - 0.65) / 0.65);
  const verify = smooth((time - (marks.verify ?? 8)) / 1.1);
  return (
    <g data-cluster-verification={verify >= 1 ? fraction : undefined}>
      {CLUSTER_PARTS.map((values, i) => {
        const x = 360 + i * 440,
          result = summarize(values);
        const summaryX = mix(x, 800, combine),
          summaryY = mix(400, 450, combine);
        return (
          <g key={i}>
            <circle
              cx={x}
              cy={400}
              r={145}
              fill="none"
              stroke="#64b5f6"
              strokeWidth={1}
              opacity={0.18 * (1 - combine + verify)}
            />
            {values.map((kind, j) => {
              const angle = (j / values.length) * Math.PI * 2 - Math.PI / 2;
              return (
                <Shape
                  key={j}
                  kind={kind}
                  x={mix(x + Math.cos(angle) * 175, x, collapse)}
                  y={mix(400 + Math.sin(angle) * 175, 400, collapse)}
                  size={55}
                  opacity={1 - collapse}
                />
              );
            })}
            <g opacity={collapse * (1 - smooth(combine / 0.7)) * (1 - verify)}>
              <Shape
                kind={result.candidate!}
                x={summaryX}
                y={summaryY}
                size={100}
              />
              <Label x={summaryX} y={summaryY + 210} size={72} fill={gold}>
                {result.strength}
              </Label>
            </g>
            <g opacity={verify}>
              <Shape
                kind="square"
                x={mix(800, x, verify)}
                y={mix(450, 400, verify)}
                size={100}
              />
              <Label x={x} y={630} size={72} fill={gold}>
                {values.filter((v) => v === "square").length}
              </Label>
              <path
                d={`M${x} 690 L800 760`}
                fill="none"
                stroke="#64b5f6"
                strokeWidth={2}
                opacity={0.3}
              />
            </g>
          </g>
        );
      })}
      <g opacity={smooth((combine - 0.3) / 0.7) * (1 - verify)}>
        <Shape kind="square" x={800} y={450} size={125} />
        <Label y={690} size={94} fill={gold}>
          {combinedSummary.strength}
        </Label>
      </g>
      <Label y={815} size={52} fill="#81c784" opacity={verify}>
        {fraction}
      </Label>
    </g>
  );
}
