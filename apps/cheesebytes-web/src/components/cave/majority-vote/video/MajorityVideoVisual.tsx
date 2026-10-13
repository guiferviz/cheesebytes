import {
  useVideoSection,
  useVideoVisual,
} from "@guiferviz/cheese-bytes-video/react";
import { SHAPES } from "../MajorityVoteConstants";
import {
  majorityVideoDefinition,
  SEQUENCE,
  NO_MAJORITY,
  SHARDS,
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
  counting: "Shapes land in separate piles; each pile needs a counter.",
  memory: "The counters multiply until they fill the screen.",
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
    "Weighted candidates converge and cancel, leaving a square with strength two.",
  closing: "One candidate, one counter, and a final verification.",
};

function Shape({
  kind,
  x,
  y,
  size = 64,
  opacity = 1,
  rotate = 0,
}: {
  kind: ShapeKind;
  x: number;
  y: number;
  size?: number;
  opacity?: number;
  rotate?: number;
}) {
  const r = size / 2;
  return (
    <g
      transform={`translate(${x} ${y}) rotate(${rotate})`}
      opacity={opacity}
      fill={tint(kind)}
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
  const { localTime: t, marks } = useVideoSection(sectionId);
  const { scene, progress: p } = state;
  const seq = scene === "catch" ? NO_MAJORITY : SEQUENCE;
  const processed = Math.min(seq.length, Math.floor(p + 1e-6));
  const fraction = p - Math.floor(p + 1e-6);
  const summary = summarize(seq.slice(0, processed));
  const entered = smooth(t / 1.1);
  const elapsed = (mark: string) => Math.max(0, t - (marks[mark] ?? Infinity));
  const verifyValues = p < 1 ? NO_MAJORITY : SEQUENCE;
  const scanned = Math.min(
    verifyValues.length,
    Math.ceil((p < 1 ? p : p - 1) * verifyValues.length),
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
            <g opacity={smooth(elapsed("majority") / 1.5)}>
              <circle
                cx={800}
                cy={450}
                r={133}
                fill="#000"
                stroke={blue}
                strokeWidth={2}
              />
              <Shape
                kind="square"
                x={800}
                y={450}
                size={134}
                rotate={Math.sin(t) * 3}
              />
              <Halo t={t} r={157} />
              <Word
                x={1030}
                y={310}
                size={85}
                fill={gold}
                opacity={smooth(elapsed("question"))}
              >
                ?
              </Word>
            </g>
          </>
        )}

        {scene === "counting" && (
          <>
            {SHAPES.map((shape, i) => {
              const x = 320 + i * 320;
              const count = SEQUENCE.filter((k) => k === shape.type).length;
              const amount = clamp(p / 4) * count;
              return (
                <g key={shape.type}>
                  {Array.from({ length: count }, (_, j) => {
                    const q = smooth(amount - j);
                    return (
                      <Shape
                        key={j}
                        kind={shape.type}
                        x={x + Math.sin(j * 7) * 6 * (1 - q)}
                        y={mix(-100 - j * 80, 600 - j * 62, q)}
                        size={72}
                        opacity={q}
                        rotate={mix(35, 0, q)}
                      />
                    );
                  })}
                  <path
                    d={`M${x - 75} 662 Q${x} 678 ${x + 75} 662`}
                    fill="none"
                    stroke={tint(shape.type)}
                    strokeWidth={3}
                    opacity={0.4}
                  />
                  <Word x={x} y={745} size={67} fill={tint(shape.type)}>
                    {Math.round(amount)}
                  </Word>
                </g>
              );
            })}
            <g opacity={0.25}>
              {Array.from({ length: 16 }, (_, i) => (
                <Shape
                  key={i}
                  kind={SEQUENCE[i % 10]}
                  x={((((i * 160 - t * 260) % 2560) + 2560) % 2560) - 300}
                  y={130}
                  size={32}
                />
              ))}
            </g>
          </>
        )}

        {scene === "memory" && (
          <>
            {Array.from({ length: 360 }, (_, i) => {
              const a = i * 2.399963;
              const radius = Math.sqrt(i) * 27;
              const q = smooth(t / 7);
              const r = mix(radius * 2.8, radius, q);
              const x = 800 + Math.cos(a + t * 0.035) * r;
              const y = 450 + Math.sin(a + t * 0.035) * r * 0.64;
              const s = mix(67, 23, q);
              return (
                <g key={i} opacity={smooth(t * 0.65 - i * 0.009)}>
                  <Shape
                    kind={SHAPES[i % 4].type}
                    x={x}
                    y={y - 12}
                    size={s}
                    rotate={Math.sin(i) * 12}
                  />
                  <Word
                    x={x}
                    y={y + s * 0.7}
                    size={Math.max(13, s * 0.42)}
                    fill="#ffffff65"
                  >
                    {(i % 9) + 1}
                  </Word>
                </g>
              );
            })}
            <circle
              cx={800}
              cy={450}
              r={140 + Math.sin(t * 2) * 6}
              fill="#000"
              opacity={smooth(elapsed("question"))}
            />
            <Word
              y={450}
              size={115}
              fill={gold}
              opacity={smooth(elapsed("question"))}
            >
              ?
            </Word>
          </>
        )}

        {scene === "cancel" && (
          <>
            {SEQUENCE.map((kind, i) => {
              const a = angle(i, 10);
              const ox = 800 + Math.cos(a) * 340,
                oy = 450 + Math.sin(a) * 275;
              const pair = cancellationPairs.findIndex((v) => v.includes(i));
              if (pair < 0) {
                const q = smooth(p - 3);
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
                  y={mix(oy, 450, travel)}
                  size={84 * (1 - 0.4 * travel)}
                  opacity={1 - smooth((q - 0.55) / 0.18)}
                  rotate={mix(((i % 3) - 1) * 5, 0, travel)}
                />
              );
            })}
            {cancellationPairs.map((_, i) => (
              <Burst key={i} x={800} y={450} q={(p - i - 0.55) / 0.45} />
            ))}
            <Halo t={t} r={190} opacity={smooth(p - 3)} />
          </>
        )}

        {scene === "invariant" && (
          <>
            {Array.from({ length: 6 }, (_, i) => {
              const wave = smooth(t / 2);
              const q = smooth((t - 3 - i * 0.75) / 0.65);
              return (
                <Shape
                  key={i}
                  kind="square"
                  x={mix(360 + i * 145, i < 4 ? 800 : 720 + (i - 4) * 160, q)}
                  y={mix(mix(450, 310, wave), 450, q)}
                  size={mix(84, i < 4 ? 50 : 116, q)}
                  opacity={i < 4 ? 1 - q : 1}
                />
              );
            })}
            {(["circle", "triangle", "triangle", "diamond"] as ShapeKind[]).map(
              (kind, i) => {
                const q = smooth((t - 3 - i * 0.75) / 0.65);
                return (
                  <Shape
                    key={i}
                    kind={kind}
                    x={mix(580 + i * 145, 800, q)}
                    y={mix(mix(1050, 590, smooth(t / 2)), 450, q)}
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
                q={(t - 3 - i * 0.75 - 0.3) / 0.9}
              />
            ))}
            <Halo t={t} r={190} opacity={smooth((t - 6) / 0.8)} />
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
              const startX = 800 + (i - processed) * 138;
              return (
                <Shape
                  key={i}
                  kind={kind}
                  x={mix(startX, 800, q)}
                  y={mix(160, 450, q)}
                  size={mix(54, 76, q)}
                  opacity={i < processed ? 0 : isNext ? 1 : 0.4}
                  rotate={isNext ? mix(-8, 0, q) : Math.sin(t * 0.5 + i) * 4}
                />
              );
            })}
            {summary.candidate && (
              <Shape
                kind={summary.candidate}
                x={800}
                y={450}
                size={146 + Math.sin(t * 2) * 2}
                opacity={summary.strength ? 1 : 0.12}
                rotate={summary.strength ? Math.sin(t * 0.6) * 2 : 18}
              />
            )}
            {Array.from({ length: summary.strength }, (_, i) => (
              <Shape
                key={i}
                kind={summary.candidate!}
                x={
                  800 +
                  Math.cos(angle(i, Math.max(3, summary.strength)) + t * 0.12) *
                    235
                }
                y={
                  450 +
                  Math.sin(angle(i, Math.max(3, summary.strength)) + t * 0.12) *
                    235
                }
                size={26}
                opacity={0.7}
              />
            ))}
            <Word
              x={800}
              y={735}
              size={94}
              fill={summary.strength ? gold : "#ffffff35"}
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
                (p < 1 ? p : p - 1) * verifyValues.length - i,
              );
              return (
                <Shape
                  key={i}
                  kind={kind}
                  x={kind === "square" ? mix(x, targetX, arrival) : x}
                  y={kind === "square" ? mix(170, targetY, arrival) : 170}
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

        {scene === "distributed" && (
          <>
            {SHARDS.map((values, i) => {
              const x = 360 + i * 440,
                y = 450;
              const result = summarize(values);
              const q = smooth(p);
              return (
                <g key={i}>
                  <Halo
                    x={x}
                    y={y}
                    r={150}
                    t={t + i}
                    color={tint(result.candidate!)}
                  />
                  {values.map((kind, j) => {
                    const a = angle(j, values.length) + t * 0.08;
                    return (
                      <Shape
                        key={j}
                        kind={kind}
                        x={mix(x + Math.cos(a) * 205, x, q)}
                        y={mix(y + Math.sin(a) * 205, y, q)}
                        size={mix(57, 32, q)}
                        opacity={1 - q}
                      />
                    );
                  })}
                  <Shape
                    kind={result.candidate!}
                    x={x}
                    y={y}
                    size={mix(0, 105, q)}
                    opacity={q}
                  />
                  <Word x={x} y={680} size={67} fill={gold} opacity={q}>
                    {result.strength}
                  </Word>
                  <path
                    d={`M${x - 45} 750 h90`}
                    stroke="#ffffff25"
                    strokeWidth={2}
                  />
                </g>
              );
            })}
          </>
        )}

        {scene === "merge" && (
          <>
            {(["square", "triangle", "square"] as ShapeKind[]).map(
              (kind, i) => {
                const q = smooth(i === 2 ? (p - 0.5) * 2 : p * 2);
                const x = mix(360 + i * 440, 800, q);
                const y = mix(450, 450, q);
                return (
                  <g key={i}>
                    <Shape
                      kind={kind}
                      x={x}
                      y={y}
                      size={mix(105, 116, q)}
                      opacity={i === 1 ? 1 - smooth((p - 0.28) / 0.22) : 1}
                    />
                    {i === 0 && (
                      <Shape
                        kind="square"
                        x={mix(360, 800, q)}
                        y={mix(565, 450, q)}
                        size={56}
                        opacity={1 - smooth((p - 0.28) / 0.22)}
                      />
                    )}
                    <Halo x={x} y={y} r={150} t={t + i} opacity={1 - q} />
                  </g>
                );
              },
            )}
            <Burst x={800} y={450} q={(p - 0.28) / 0.45} />
            <Word y={725} size={94} fill={gold}>
              {p < 0.5 ? 2 : p < 0.99 ? 1 : 2}
            </Word>
            <Halo t={t} r={185} opacity={smooth(p - 0.7)} />
          </>
        )}

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
              2
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
