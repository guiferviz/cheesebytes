import { useMemo } from "react";
import {
  PairOrders,
  StrengthScene,
  FriendScene,
  MergeScene,
  ExtensionScene,
  ClusterScene,
  ClosingScene,
} from "./ExtraScenes";
import { Shape, DIMMED_SHAPE_OPACITY } from "./Shape";
import {
  arrivalFade,
  ringPoint,
  ringPairPose,
  pairPose,
  survivorPoint,
  introItems,
  gentleFloat,
  arrivalRotation,
  clamp,
  mix,
  smooth,
} from "./presentation";
import { FrequencyCounterScene } from "./FrequencyCounterScene";
import { createMemoryShapes, DEFAULT_MEMORY_SEED } from "./memory-shapes";
import {
  useVideoSection,
  useVideoVisual,
} from "@guiferviz/cheese-bytes-video/react";
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
    "The friends' square of strength two and circle of strength one leave a square of strength one. A separate matching example adds two and one to make three.",
  closing:
    "Different elements cancel; a majority survives, even when parts are combined.",
  "pair-orders":
    "A circle and a triangle cancel first. A different pairing order leaves four squares.",
  strength: "Residual strength two is different from the actual frequency six.",
  friend:
    "Two friends compare full frequency tables with small candidate summaries.",
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
  const { ref, state, sectionId, sampleAt } = useVideoVisual(
    majorityVideoDefinition,
    initial,
  );
  const {
    localTime: t,
    globalTime,
    marks,
    duration,
  } = useVideoSection(sectionId);
  const floating = gentleFloat(globalTime);
  const { scene, progress: p } = state;
  const seed = state.seed ?? DEFAULT_MEMORY_SEED;
  const memoryShapes = useMemo(() => createMemoryShapes(seed), [seed]);
  const seq = scene === "catch" ? NO_MAJORITY : ONLINE_SEQUENCE;
  const processed = Math.min(seq.length, Math.floor(p + 1e-6));
  const fraction = p - Math.floor(p + 1e-6);
  const summary = summarize(seq.slice(0, processed));
  const onlineScene = ["online", "algorithm", "catch"].includes(scene);
  const outgoingOpacity = onlineScene
    ? arrivalFade(t, processed, (time) => sampleAt(time).progress)
    : 0;
  const previousSummary = summarize(seq.slice(0, Math.max(0, processed - 1)));
  const cancelledIncoming =
    processed > 0 &&
    previousSummary.strength > 0 &&
    previousSummary.candidate !== seq[processed - 1];
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
      data-candidate={summary.strength ? summary.candidate : ""}
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
              <g key={row} opacity={row === 1 ? 1 : DIMMED_SHAPE_OPACITY}>
                {introItems(t, row).map(({ index: i, kind, x }) => {
                  const depth = row === 1 ? 1 : 0.6;
                  return (
                    <Shape
                      key={i}
                      kind={kind}
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
              const source = ringPoint(i);
              const pair = cancellationPairs.findIndex((v) => v.includes(i));
              const finish = (marks.repeat ?? 13.54) + 3;
              const settle = smooth((t - finish) / 0.65);
              const target = survivorPoint(i);
              const pose =
                pair < 0
                  ? {
                      x: mix(source.x, target.x, settle),
                      y: mix(source.y, target.y, settle),
                      opacity: 1,
                    }
                  : ringPairPose(i, cancellationPairs[pair], clamp(p - pair));
              return (
                <g
                  key={i}
                  data-cancellation-index={i}
                  data-pair={pair}
                  data-x={pose.x}
                  data-y={pose.y}
                  data-opacity={pose.opacity}
                >
                  <Shape
                    kind={kind}
                    x={pose.x}
                    y={pose.y}
                    size={84}
                    opacity={pose.opacity}
                  />
                </g>
              );
            })}
          </>
        )}

        {scene === "invariant" && (
          <>
            {Array.from({ length: 6 }, (_, i) => {
              const q = (t - (marks.why ?? 3) - i * 1.5) / 1.5;
              const entry = smooth(t / 1.2);
              const y = mix(450, 350, entry);
              const settle = smooth(elapsed("trick") / 1);
              const pose =
                i < 4
                  ? pairPose(
                      mix(620 + i * 120, 475 + i * 130, entry),
                      y,
                      475 + i * 130,
                      396,
                      q,
                    )
                  : {
                      x: mix(475 + i * 130, 740 + (i - 4) * 120, settle),
                      y: mix(y, 450, settle),
                      opacity: smooth((t - 0.95) / 0.45),
                    };
              return (
                <Shape
                  key={i}
                  kind="square"
                  x={pose.x}
                  y={pose.y}
                  size={84}
                  opacity={pose.opacity}
                />
              );
            })}
            {(["circle", "triangle", "triangle", "diamond"] as ShapeKind[]).map(
              (kind, i) => {
                const q = (t - (marks.why ?? 3) - i * 1.5) / 1.5;
                const pose = pairPose(
                  475 + i * 130,
                  mix(650, 550, smooth(t / 1.2)),
                  475 + i * 130,
                  504,
                  q,
                );
                return (
                  <Shape
                    key={i}
                    kind={kind}
                    x={pose.x}
                    y={pose.y}
                    size={84}
                    opacity={pose.opacity * smooth(t / 1.2)}
                  />
                );
              },
            )}
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
                    x={mix(
                      startX,
                      summary.strength && kind !== summary.candidate
                        ? 940
                        : 800,
                      q,
                    )}
                    y={mix(180, 450, q)}
                    size={mix(66, summary.strength ? 90 : 146, q)}
                    opacity={
                      i < processed ? 0 : isNext ? 1 : DIMMED_SHAPE_OPACITY
                    }
                    rotate={arrivalRotation(globalTime, i, q)}
                  />
                </g>
              );
            })}
            {cancelledIncoming && outgoingOpacity > 0 && (
              <g data-outgoing-incoming data-opacity={outgoingOpacity}>
                <Shape
                  kind={seq[processed - 1]}
                  x={940}
                  y={450}
                  size={90}
                  opacity={outgoingOpacity}
                  rotate={floating.rotate}
                />
              </g>
            )}
            {summary.candidate && (
              <g
                data-candidate-visual
                data-status={summary.strength ? "active" : "outgoing"}
                data-opacity={summary.strength ? 1 : outgoingOpacity}
              >
                <Shape
                  kind={summary.candidate}
                  x={800}
                  y={450}
                  size={146 + Math.sin(t * 2) * 2}
                  opacity={summary.strength ? 1 : outgoingOpacity}
                  rotate={floating.rotate}
                />
              </g>
            )}
            <Word
              x={800}
              y={735}
              size={94}
              fill={summary.strength ? gold : "#ffffff85"}
            >
              {summary.strength}
            </Word>
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
            <g
              data-algorithm-pair
              transform={`translate(0 ${floating.offsetY / 3})`}
            >
              <g data-algorithm-emblem>
                <Shape
                  kind="square"
                  x={735}
                  y={420}
                  size={116}
                  rotate={floating.rotate / 3}
                />
              </g>
              <Word x={945} y={436} size={140} fill={gold}>
                2
              </Word>
            </g>
            <g opacity={smooth(elapsed("cost"))}>
              <Word x={570} y={590} size={28} fill="#94a3b8">
                Time
              </Word>
              <Word x={1030} y={590} size={28} fill="#94a3b8">
                Extra space
              </Word>
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
              const x = 800 + (i - (verifyValues.length - 1) / 2) * 110;
              const arrival = smooth(
                (p <= 1 ? p : p - 1) * verifyValues.length - i,
              );
              return (
                <Shape
                  key={i}
                  kind={kind}
                  x={x}
                  y={450}
                  size={85}
                  opacity={mix(
                    1,
                    kind === "square" ? 1 : DIMMED_SHAPE_OPACITY,
                    arrival,
                  )}
                  highlight={kind === "square" ? arrival : 0}
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
          </>
        )}

        {scene === "distributed" && <ClusterScene time={t} marks={marks} />}

        {scene === "pair-orders" && <PairOrders time={t} marks={marks} />}
        {scene === "strength" && <StrengthScene time={t} marks={marks} />}
        {scene === "friend" && <FriendScene time={t} marks={marks} />}
        {scene === "merge" && <MergeScene time={t} marks={marks} />}
        {scene === "extension" && <ExtensionScene />}

        {scene === "closing" && (
          <ClosingScene time={t} globalTime={globalTime} marks={marks} />
        )}
      </svg>
    </main>
  );
}
