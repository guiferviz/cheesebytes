import { useMemo } from "react";
import {
  PairOrders,
  StrengthScene,
  FriendScene,
  MergeScene,
  PrivacyScene,
  ExtensionScene,
  ClusterScene,
} from "./ExtraScenes";
import { Shape } from "./Shape";
import { FrequencyCounterScene } from "./FrequencyCounterScene";
import { createMemoryShapes, DEFAULT_MEMORY_SEED } from "./memory-shapes";
import {
  useVideoSection,
  useVideoVisual,
} from "@guiferviz/cheese-bytes-video/react";
import { SHAPES } from "../MajorityVoteConstants";
import {
  majorityVideoDefinition,
  SEQUENCE,
  ONLINE_SEQUENCE,
  NO_MAJORITY,
  summarize,
  type ShapeKind,
  type MajorityVideoState,
} from "./definition";
export { majorityVideoDefinition } from "./definition";

const gold = "#fbbf24",
  blue = "#64b5f6",
  white = "#f8fafc";
const clamp = (v: number) => Math.max(0, Math.min(1, v));
const smooth = (v: number) => {
  const q = clamp(v);
  return q * q * (3 - 2 * q);
};
const mix = (a: number, b: number, q: number) => a + (b - a) * q;
const tint = (kind: ShapeKind) => SHAPES.find((s) => s.type === kind)!.color;
const angle = (i: number, n: number) => (i / n) * Math.PI * 2 - Math.PI / 2;
const descriptions: Record<string, string> = {
  stream: "An endless river of shapes. Find the hidden majority.",
  counting:
    "Shapes enter from the right, then merge into their frequency counters exactly when the numbers increase.",
  memory:
    "New values allocate more counters until the storage space fills and the stream queues at intake. Repeated values only increase existing numbers.",
  cancel: "Different shapes collide and cancel. Two squares survive.",
  invariant:
    "Six squares face four other shapes. The majority survives every cancellation.",
  online: "A stream feeds a single candidate and a small residual balance.",
  algorithm:
    "Matching elements add to the balance; different elements cancel. The next element replaces a zero-balance candidate.",
  complexity: "Boyer–Moore Majority Vote. Linear time, constant extra memory.",
  catch:
    "A square survives, although only three of seven elements are squares.",
  verify:
    "A second pass checks actual frequency against the strict majority threshold.",
  distributed: "Three machines reduce their streams to weighted candidates.",
  merge:
    "A square of strength three cancels with a circle of strength two, leaving one square.",
  closing:
    "Different elements cancel; a majority survives, even when parts are combined.",
  "pair-orders":
    "A circle and a triangle cancel first. A different pairing order leaves four squares.",
  strength: "Residual strength two is different from the actual frequency six.",
  friend:
    "Two friends compare full frequency tables with small candidate summaries.",
  privacy:
    "Flag a transaction group where one person contributes six of ten transactions.",
  extension:
    "Misra–Gries maintains several candidates with bounded frequency error.",
};

function Word({
  children,
  x = 800,
  y = 450,
  size = 64,
  fill = white,
  opacity = 1,
}: {
  children: React.ReactNode;
  x?: number;
  y?: number;
  size?: number;
  fill?: string;
  opacity?: number;
}) {
  return (
    <text
      x={x}
      y={y}
      fill={fill}
      opacity={opacity}
      fontSize={size}
      textAnchor="middle"
      dominantBaseline="middle"
    >
      {children}
    </text>
  );
}
function Burst({
  x,
  y,
  q,
  color = gold,
}: {
  x: number;
  y: number;
  q: number;
  color?: string;
}) {
  const phase = clamp(q);
  return (
    <g opacity={Math.sin(phase * Math.PI)}>
      <circle
        cx={x}
        cy={y}
        r={16 + phase * 100}
        stroke={color}
        strokeWidth={2 * (1 - phase) + 0.5}
        fill="none"
      />
      {Array.from({ length: 12 }, (_, i) => {
        const a = angle(i, 12);
        const r = 15 + phase * 110;
        return (
          <circle
            key={i}
            cx={x + Math.cos(a) * r}
            cy={y + Math.sin(a) * r}
            r={3.5 * (1 - phase) + 1}
            fill={color}
          />
        );
      })}
    </g>
  );
}
function Halo({
  x = 800,
  y = 450,
  r = 170,
  t,
  color = blue,
  opacity = 1,
}: {
  x?: number;
  y?: number;
  r?: number;
  t: number;
  color?: string;
  opacity?: number;
}) {
  return (
    <g opacity={opacity}>
      <circle
        cx={x}
        cy={y}
        r={r}
        stroke={color}
        strokeWidth={1}
        opacity={0.13}
        fill="none"
      />
      <circle
        cx={x}
        cy={y}
        r={r}
        stroke={color}
        strokeWidth={2.5}
        strokeDasharray={`${r * 0.8} ${r * 5.48}`}
        transform={`rotate(${t * 22} ${x} ${y})`}
        opacity={0.6}
        fill="none"
      />
    </g>
  );
}
function Tick({
  x = 800,
  y = 650,
  q = 1,
  color = "#81c784",
}: {
  x?: number;
  y?: number;
  q?: number;
  color?: string;
}) {
  return (
    <path
      d={`M${x - 24} ${y} l18 18 l38 -42`}
      fill="none"
      stroke={color}
      strokeWidth={7}
      strokeLinecap="round"
      strokeLinejoin="round"
      pathLength={1}
      strokeDasharray={1}
      strokeDashoffset={1 - clamp(q)}
    />
  );
}
const cancellationPairs = [
  [0, 1],
  [4, 2],
  [5, 3],
  [6, 7],
];

export function MajorityVideoVisual({
  initial,
}: {
  initial: MajorityVideoState;
}) {
  const { ref, state, sectionId } = useVideoVisual(
    majorityVideoDefinition,
    initial,
  );
  const { localTime: t, marks, duration } = useVideoSection(sectionId);
  const { scene, progress: p } = state;
  const seed = state.seed ?? DEFAULT_MEMORY_SEED;
  const memoryShapes = useMemo(() => createMemoryShapes(seed), [seed]);
  const seq = scene === "catch" ? NO_MAJORITY : ONLINE_SEQUENCE;
  const processed = Math.min(seq.length, Math.floor(p + 1e-6));
  const fraction = p - Math.floor(p + 1e-6);
  const summary = summarize(seq.slice(0, processed));
  const entered = smooth(t / 1.1);
  const elapsed = (mark: string) => Math.max(0, t - (marks[mark] ?? Infinity));
  const verifyValues = p <= 1 ? NO_MAJORITY : SEQUENCE;
  const scanned = Math.min(
    verifyValues.length,
    Math.floor((p <= 1 ? p : p - 1) * verifyValues.length + 1e-6),
  );
  const frequency = verifyValues
    .slice(0, scanned)
    .filter((k) => k === "square").length;
  const verified =
    scanned === verifyValues.length && frequency > verifyValues.length / 2;
  const verification =
    scanned === verifyValues.length
      ? verified
        ? "majority"
        : "none"
      : "counting";

  return (
    <main
      ref={ref}
      data-majority-scene={scene}
      data-progress={p}
      data-memory-seed={scene === "memory" ? seed : undefined}
      data-processed={processed}
      data-candidate={summary.candidate ?? ""}
      data-strength={summary.strength}
      data-verification={scene === "verify" ? verification : undefined}
      style={{
        height: "100%",
        width: "100%",
        background: "#000",
        overflow: "hidden",
      }}
    >
      <svg
        viewBox="0 0 1600 900"
        width="100%"
        height="100%"
        role="img"
        aria-label={descriptions[scene]}
        style={{ display: "block" }}
      >
        <defs>
          <radialGradient id={`haze-${scene}`}>
            <stop
              stopColor={scene === "memory" ? "#ffb74d" : blue}
              stopOpacity=".10"
            />
            <stop offset="1" stopColor="#000" stopOpacity="0" />
          </radialGradient>
        </defs>
        <ellipse
          cx={800}
          cy={450}
          rx={650}
          ry={430}
          fill={`url(#haze-${scene})`}
        />

        {scene === "stream" && (
          <>
            {[0, 1, 2].map((row) => (
              <g key={row} opacity={row === 1 ? 1 : 0.28}>
                {Array.from({ length: 22 }, (_, i) => {
                  const depth = row === 1 ? 1 : 0.6;
                  const x =
                    ((((i * 170 - t * (row === 1 ? 230 : 130) + row * 65) %
                      3740) +
                      3740) %
                      3740) -
                    300;
                  return (
                    <Shape
                      key={i}
                      kind={SEQUENCE[i % 10]}
                      x={x}
                      y={
                        450 + (row - 1) * 200 + Math.sin(i * 1.7 + t * 0.6) * 18
                      }
                      size={90 * depth}
                      rotate={Math.sin(i + t * 0.3) * 9}
                    />
                  );
                })}
              </g>
            ))}
            <Word
              y={175}
              size={84}
              fill={gold}
              opacity={entered * (1 - smooth(elapsed("majority") / 1.5))}
            >
              1,000,000,000
            </Word>
            <Word
              y={175}
              size={100}
              fill={gold}
              opacity={smooth(elapsed("majority"))}
            >
              ?
            </Word>
          </>
        )}

        {(scene === "counting" || scene === "memory") && (
          <FrequencyCounterScene
            memory={scene === "memory"}
            time={t}
            duration={duration}
            marks={marks}
            polygons={memoryShapes}
          />
        )}

        {scene === "cancel" && (
          <>
            {SEQUENCE.map((kind, i) => {
              const squareIndices = [0, 4, 5, 6, 8, 9];
              const otherIndices = [1, 2, 3, 7];
              const index = (
                kind === "square" ? squareIndices : otherIndices
              ).indexOf(i);
              const group = smooth(elapsed("six") / 0.8);
              const ox = mix(
                560 + (i % 5) * 120,
                kind === "square"
                  ? 380 + (index % 3) * 130
                  : 1060 + (index % 2) * 140,
                group,
              );
              const oy = mix(
                380 + Math.floor(i / 5) * 130,
                310 + Math.floor(index / (kind === "square" ? 3 : 2)) * 280,
                group,
              );
              const pair = cancellationPairs.findIndex((v) => v.includes(i));
              if (pair < 0) {
                const q = smooth(elapsed("left") / 1);
                return (
                  <Shape
                    key={i}
                    kind={kind}
                    x={mix(ox, i === 8 ? 720 : 880, q)}
                    y={mix(oy, 450, q)}
                    size={mix(84, 116, q)}
                    rotate={Math.sin(t + i) * 3}
                  />
                );
              }
              const q = clamp(p - pair);
              const travel = smooth(q / 0.68);
              return (
                <Shape
                  key={i}
                  kind={kind}
                  x={mix(ox, 800, travel)}
                  y={mix(oy, 450, 1 - (1 - clamp(q / 0.68)) ** 3)}
                  size={84 * (1 - 0.4 * travel)}
                  opacity={1 - smooth((q - 0.55) / 0.18)}
                  rotate={mix(((i % 3) - 1) * 5, 0, travel)}
                />
              );
            })}
            {cancellationPairs.map((_, i) => (
              <Burst key={i} x={800} y={450} q={(p - i - 0.55) / 0.45} />
            ))}
            <Halo t={t} r={190} opacity={smooth(elapsed("left"))} />
          </>
        )}

        {scene === "invariant" && (
          <>
            {Array.from({ length: 6 }, (_, i) => {
              const wave = smooth(t / 2);
              const q = smooth((t - (marks.why ?? 3) - i * 0.85) / 1.1);
              return (
                <Shape
                  key={i}
                  kind="square"
                  x={mix(475 + i * 130, i < 4 ? 800 : 720 + (i - 4) * 160, q)}
                  y={mix(mix(450, 310, wave), 450, 1 - (1 - q) ** 3)}
                  size={mix(84, i < 4 ? 50 : 116, q)}
                  opacity={i < 4 ? 1 - q : 1}
                />
              );
            })}
            {(["circle", "triangle", "triangle", "diamond"] as ShapeKind[]).map(
              (kind, i) => {
                const q = smooth((t - (marks.why ?? 3) - i * 0.85) / 1.1);
                return (
                  <Shape
                    key={i}
                    kind={kind}
                    x={mix(605 + i * 130, 800, q)}
                    y={mix(
                      mix(1050, 590, smooth(t / 2)),
                      450,
                      1 - (1 - q) ** 3,
                    )}
                    size={84 * (1 - q * 0.4)}
                    opacity={1 - q}
                  />
                );
              },
            )}
            {Array.from({ length: 4 }, (_, i) => (
              <Burst
                key={i}
                x={800}
                y={450}
                q={(t - (marks.why ?? 3) - i * 0.85 - 0.5) / 0.9}
              />
            ))}
            <Halo
              t={t}
              r={190}
              opacity={smooth((t - (marks.trick ?? 10)) / 0.8)}
            />
          </>
        )}

        {scene === "online" && p < 1 && (
          <g opacity={1 - smooth(p)}>
            {Array.from({ length: 22 }, (_, i) => (
              <Shape
                key={i}
                kind={SEQUENCE[i % 10]}
                x={((((i * 165 - t * 210) % 3630) + 3630) % 3630) - 300}
                y={450 + Math.sin(t * 0.8 + i * 0.7) * 12}
                size={82}
                rotate={Math.sin(t * 0.3 + i) * 5}
              />
            ))}
          </g>
        )}

        {(scene === "online" || scene === "algorithm" || scene === "catch") && (
          <g opacity={scene === "online" ? smooth(p) : 1}>
            <Halo
              x={800}
              y={450}
              r={181}
              t={t}
              color={summary.candidate ? tint(summary.candidate) : blue}
              opacity={summary.strength ? 1 : 0.2}
            />
            {seq.map((kind, i) => {
              const isNext = i === processed;
              const q = isNext ? smooth(fraction) : 0;
              const startX =
                1000 +
                (i - processed) * 145 -
                (isNext ? 0 : 145 * smooth(fraction));
              return (
                <g key={i} data-online-index={i}>
                  <Shape
                    kind={kind}
                    x={mix(startX, 800, q)}
                    y={mix(180, 450, q)}
                    size={mix(66, summary.strength ? 90 : 146, q)}
                    opacity={i < processed ? 0 : isNext ? 1 : 0.4}
                    rotate={isNext ? mix(-8, 0, q) : Math.sin(t * 0.5 + i) * 4}
                  />
                </g>
              );
            })}
            {summary.candidate && (
              <Shape
                kind={summary.candidate}
                x={800}
                y={450}
                size={146 + Math.sin(t * 2) * 2}
                opacity={summary.strength ? 1 : 0}
                rotate={summary.strength ? Math.sin(t * 0.6) * 2 : 18}
              />
            )}
            <Word
              x={800}
              y={735}
              size={94}
              fill={summary.strength ? gold : "#ffffff85"}
            >
              {summary.strength}
            </Word>
            {fraction > 0.6 && processed < seq.length && (
              <Burst
                x={800}
                y={450}
                q={(fraction - 0.6) / 0.4}
                color={summary.candidate === seq[processed] ? blue : gold}
              />
            )}
            {scene === "catch" && processed === seq.length && (
              <Word
                x={1010}
                y={435}
                size={94}
                fill={gold}
                opacity={smooth(elapsed("survive"))}
              >
                ?
              </Word>
            )}
          </g>
        )}

        {scene === "complexity" && (
          <>
            <Halo t={t} r={180} />
            <Shape
              kind="square"
              x={735}
              y={420}
              size={116}
              rotate={mix(-30, 0, entered)}
            />
            <Word x={945} y={425} size={140} fill={gold}>
              2
            </Word>
            <g opacity={smooth(elapsed("cost"))}>
              <Word x={570} y={660} size={76}>
                O(n)
              </Word>
              <Word x={1030} y={660} size={76}>
                O(1)
              </Word>
            </g>
            <Word y={210} size={43} opacity={entered}>
              Boyer–Moore
            </Word>
            <Word y={265} size={25} fill="#ffffff65" opacity={entered}>
              Majority Vote
            </Word>
          </>
        )}

        {scene === "verify" && (
          <>
            {verifyValues.map((kind, i) => {
              const x = 350 + i * 100;
              const counted = i < scanned;
              const rank = verifyValues
                .slice(0, i)
                .filter((value) => value === "square").length;
              const targetX = 730 + (rank % 2) * 140;
              const targetY = 350 + Math.floor(rank / 2) * 110;
              const arrival = smooth(
                (p <= 1 ? p : p - 1) * verifyValues.length - i,
              );
              return (
                <Shape
                  key={i}
                  kind={kind}
                  x={kind === "square" ? mix(x, targetX, arrival) : x}
                  y={
                    kind === "square"
                      ? mix(170, targetY, 1 - (1 - arrival) ** 3)
                      : 170
                  }
                  size={kind === "square" ? mix(45, 65, arrival) : 45}
                  opacity={counted && kind !== "square" ? 0.08 : 1}
                />
              );
            })}
            <Word
              y={740}
              size={74}
              fill={
                scanned === verifyValues.length
                  ? verified
                    ? "#81c784"
                    : "#e57373"
                  : gold
              }
            >
              {frequency} / {verifyValues.length}
            </Word>
            {scanned === verifyValues.length &&
              (verified ? (
                <Tick x={1080} y={733} />
              ) : (
                <g stroke="#e57373" strokeWidth={7} strokeLinecap="round">
                  <path d="M1060 712 l40 40 M1100 712 l-40 40" />
                </g>
              ))}
            <circle
              cx={800}
              cy={470}
              r={235}
              stroke={verified ? "#81c784" : blue}
              strokeWidth={2}
              opacity={0.24}
              fill="none"
              strokeDasharray={`${clamp(scanned / verifyValues.length) * 1477} 1477`}
              transform="rotate(-90 800 470)"
            />
          </>
        )}

        {scene === "distributed" && <ClusterScene time={t} marks={marks} />}

        {scene === "pair-orders" && <PairOrders time={t} marks={marks} />}
        {scene === "strength" && <StrengthScene time={t} marks={marks} />}
        {scene === "friend" && <FriendScene time={t} marks={marks} />}
        {scene === "merge" && <MergeScene time={t} marks={marks} />}
        {scene === "privacy" && <PrivacyScene time={t} marks={marks} />}
        {scene === "extension" && <ExtensionScene />}

        {scene === "closing" && (
          <>
            <Halo t={t} r={200} />
            <Shape
              kind="square"
              x={720}
              y={450}
              size={136}
              rotate={Math.sin(t * 0.6) * 2}
            />
            <Word x={935} y={460} size={160} fill={gold}>
              1
            </Word>
            <Tick x={800} y={710} q={smooth(elapsed("check"))} />
            <Word
              y={810}
              size={26}
              fill={gold}
              opacity={smooth(elapsed("check") - 1)}
            >
              cheese bytes
            </Word>
          </>
        )}
      </svg>
    </main>
  );
}
