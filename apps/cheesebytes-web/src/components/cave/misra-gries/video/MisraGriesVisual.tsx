import type { ReactNode } from "react";
import {
  useVideoVisual,
  useVideoSection,
} from "@guiferviz/cheese-bytes-video/react";
import { FrequencyCounterScene } from "../../majority-vote/video/FrequencyCounterScene";
import { introMemoryArrivals } from "./intro-memory";
import { Shape } from "../../majority-vote/video/Shape";
import { createMemoryShapes } from "../../majority-vote/video/memory-shapes";
import {
  STREAM,
  KINDS,
  trace,
  misraGriesDefinition,
  type Kind,
  type State,
  type Summary,
} from "./definition";
import {
  clamp,
  smooth,
  mix,
  slotX,
  ribbonX,
  rangeX,
  pilePoint,
  spreadPose,
  possiblePose,
  traceFrame,
} from "./motion";
export { misraGriesDefinition } from "./definition";
const gold = "#fbbf24",
  blue = "#64b5f6",
  ink = "#edf2f7",
  muted = "#94a3b8",
  green = "#81c784";
const TWO = trace(STREAM, 2),
  THREE = trace(STREAM, 3),
  POLYGONS = createMemoryShapes(42, 64);
function Text({
  children,
  x = 800,
  y = 450,
  size = 48,
  fill = ink,
  opacity = 1,
  anchor = "middle",
}: {
  children: ReactNode;
  x?: number;
  y?: number;
  size?: number;
  fill?: string;
  opacity?: number;
  anchor?: "middle" | "start" | "end";
}) {
  return (
    <text
      x={x}
      y={y}
      fontSize={size}
      fill={fill}
      opacity={opacity}
      textAnchor={anchor}
      dominantBaseline="middle"
      fontFamily="'Inter',system-ui,sans-serif"
    >
      {children}
    </text>
  );
}
function Card({ x, children }: { x: number; children?: ReactNode }) {
  return (
    <g>
      <rect
        x={x - 110}
        y={355}
        width={220}
        height={270}
        rx={23}
        fill="#0a1017"
        stroke="#283644"
        strokeWidth={2}
      />
      {children}
    </g>
  );
}
/** Visible copies explain subtraction. Their count is the residual, never the frequency. */
function Pile({
  kind,
  count,
  x,
  opacity = 1,
}: {
  kind: Kind;
  count: number;
  x: number;
  opacity?: number;
}) {
  return (
    <g opacity={opacity}>
      {Array.from({ length: count }, (_, i) => (
        <Shape key={i} kind={kind} {...pilePoint(i, count, x)} size={54} />
      ))}
    </g>
  );
}
function FixedSummary({
  summary,
  capacity = 2,
  opacity = 1,
  hideSquare = false,
}: {
  summary: Summary;
  capacity?: number;
  opacity?: number;
  hideSquare?: boolean;
}) {
  return (
    <g opacity={opacity}>
      {summary.slots.map((kind, i) => (
        <Card key={i} x={slotX(i, capacity)}>
          {kind && (
            <>
              {!(hideSquare && kind === "square") && (
                <Pile
                  kind={kind}
                  count={summary.counts[kind]!}
                  x={slotX(i, capacity)}
                />
              )}
              <Text x={slotX(i, capacity)} y={565} size={66} fill={gold}>
                {summary.counts[kind]}
              </Text>
            </>
          )}
        </Card>
      ))}
    </g>
  );
}
function Ledger({ count, opacity = 1 }: { count: number; opacity?: number }) {
  return (
    <g opacity={opacity} data-removed={count}>
      <Text x={765} y={735} size={34} fill={muted} anchor="end">
        groups
      </Text>
      <Text x={825} y={735} size={60} fill={gold}>
        {count}
      </Text>
    </g>
  );
}
function StreamRow({
  processed = 0,
  opacity = 1,
}: {
  processed?: number;
  opacity?: number;
}) {
  return (
    <g opacity={opacity}>
      {STREAM.map((kind, i) => (
        <Shape
          key={i}
          kind={kind}
          x={ribbonX(i)}
          y={190}
          size={50}
          opacity={i < processed ? 0.4 : 1}
        />
      ))}
    </g>
  );
}
function TraceBoard({
  progress,
  capacity,
  streamOpacity = 1,
}: {
  progress: number;
  capacity: number;
  streamOpacity?: number;
}) {
  const frame = traceFrame(progress, capacity);
  return (
    <g
      data-trace-progress={frame.progress}
      data-capacity={capacity}
      data-square-count={frame.summary.counts.square ?? 0}
      data-circle-count={frame.summary.counts.circle ?? 0}
    >
      {Array.from({ length: capacity }, (_, i) => (
        <Card key={i} x={slotX(i, capacity)} />
      ))}
      {frame.actors.map(({ id, role, ...actor }) => (
        <g key={id} data-actor={id} data-actor-role={role}>
          <Shape
            {...actor}
            opacity={
              actor.opacity *
              (role === "stream" || (role === "arrival" && actor.y === 190)
                ? streamOpacity
                : 1)
            }
          />
        </g>
      ))}
      {frame.summary.slots.map(
        (kind, i) =>
          kind && (
            <Text key={i} x={slotX(i, capacity)} y={565} size={66} fill={gold}>
              {frame.summary.counts[kind]}
            </Text>
          ),
      )}
      <Ledger
        count={frame.summary.removed}
        opacity={frame.summary.removed ? 1 : 0}
      />
    </g>
  );
}
function Threshold({
  top = 320,
  bottom = 510,
  opacity = 1,
}: {
  top?: number;
  bottom?: number;
  opacity?: number;
}) {
  return (
    <g opacity={opacity}>
      <line
        x1={rangeX(5)}
        x2={rangeX(5)}
        y1={top}
        y2={bottom}
        stroke={muted}
        strokeWidth={3}
        strokeDasharray="8 8"
      />
      <Text x={rangeX(5)} y={bottom + 45} size={40} fill={muted}>
        5
      </Text>
    </g>
  );
}
function Range({
  low = 4,
  high = 7,
  y = 490,
  kind = "square",
  exact = false,
  opacity = 1,
  small = false,
  reveal = 1,
  iconOpacity = 1,
  lowLabelOpacity = 1,
  hideFive = 0,
}: {
  low?: number;
  high?: number;
  y?: number;
  kind?: Kind;
  exact?: boolean;
  opacity?: number;
  small?: boolean;
  reveal?: number;
  iconOpacity?: number;
  lowLabelOpacity?: number;
  hideFive?: number;
}) {
  return (
    <g
      opacity={opacity}
      data-interval-kind={kind}
      data-interval-low={low}
      data-interval-high={high}
    >
      <g opacity={iconOpacity}>
        <Shape kind={kind} x={235} y={y} size={small ? 64 : 82} />
      </g>
      <line x1={370} x2={1370} y1={y} y2={y} stroke="#344353" strokeWidth={3} />
      {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
        <line
          key={n}
          x1={rangeX(n)}
          x2={rangeX(n)}
          y1={y - 7}
          y2={y + 7}
          stroke={muted}
        />
      ))}
      <rect
        x={rangeX(low)}
        y={y - 17}
        width={Math.max(1, (rangeX(high) - rangeX(low)) * reveal)}
        height={34}
        rx={10}
        fill={gold}
        opacity={0.15}
      />
      <line
        x1={rangeX(low)}
        x2={mix(rangeX(low), rangeX(high), reveal)}
        y1={y}
        y2={y}
        stroke={gold}
        strokeWidth={7}
        strokeLinecap="round"
      />
      <circle cx={rangeX(low)} cy={y} r={10} fill={blue} />
      <circle
        cx={rangeX(high)}
        cy={y}
        r={exact ? 13 : 10}
        fill={exact ? green : gold}
        opacity={smooth((reveal - 0.7) / 0.3)}
      />
      <Text
        x={rangeX(low)}
        y={y - 58}
        size={small ? 46 : 62}
        fill={blue}
        opacity={lowLabelOpacity}
      >
        {low}
      </Text>
      <Text
        x={rangeX(high)}
        y={y - 58}
        size={small ? 46 : 62}
        fill={exact ? green : gold}
        opacity={smooth((reveal - 0.7) / 0.3) * (high === 5 ? 1 - hideFive : 1)}
      >
        {high}
      </Text>
    </g>
  );
}
function SummaryToRange({ progress }: { progress: number }) {
  const p = smooth(progress),
    fade = 1 - smooth(progress / 0.28),
    source = pilePoint(0, 6, slotX(0, 3));
  return (
    <>
      <g opacity={fade}>
        <StreamRow processed={15} />
        {THREE[15].slots.map((kind, i) => (
          <Card key={i} x={slotX(i, 3)}>
            {kind && i > 0 && (
              <>
                <Pile
                  kind={kind}
                  count={THREE[15].counts[kind]!}
                  x={slotX(i, 3)}
                />
                <Text x={slotX(i, 3)} y={565} size={66} fill={gold}>
                  {THREE[15].counts[kind]}
                </Text>
              </>
            )}
          </Card>
        ))}
        <Ledger count={1} />
        {Array.from({ length: 5 }, (_, j) => (
          <Shape
            key={j}
            kind="square"
            {...pilePoint(j + 1, 6, slotX(0, 3))}
            size={54}
          />
        ))}
      </g>
      <Range
        low={6}
        high={7}
        y={420}
        opacity={p}
        reveal={p}
        iconOpacity={0}
        lowLabelOpacity={0}
      />
      <Shape
        kind="square"
        x={mix(source.x, 235, p)}
        y={mix(source.y, 420, p)}
        size={mix(54, 82, p)}
      />
      <Text
        x={mix(slotX(0, 3), rangeX(6), p)}
        y={mix(565, 362, p)}
        size={mix(66, 62, p)}
        fill={`rgb(${mix(251, 100, p)} ${mix(191, 181, p)} ${mix(36, 246, p)})`}
      >
        6
      </Text>
    </>
  );
}
function River({
  time,
  opacity = 1,
  y = 235,
}: {
  time: number;
  opacity?: number;
  y?: number;
}) {
  return (
    <g opacity={opacity}>
      {Array.from({ length: 24 }, (_, i) => {
        const x = ((((i * 105 - time * 72) % 2520) + 2520) % 2520) - 460,
          py = y + Math.sin(time * 0.65 + i * 1.7) * 12,
          fade = smooth((x + 80) / 130) * (1 - smooth((x - 1440) / 160));
        return i % 3 === 0 ? (
          <g
            key={i}
            transform={`translate(${x} ${py}) rotate(${Math.sin(time * 0.55 + i) * 2}) scale(33)`}
            opacity={fade}
          >
            <polygon points={POLYGONS[i].points} fill={POLYGONS[i].colour} />
          </g>
        ) : (
          <Shape
            key={i}
            kind={KINDS[(i * 7 + Math.floor(i / 5)) % 4]}
            x={x}
            y={py}
            size={64}
            rotate={Math.sin(time * 0.55 + i) * 2}
            opacity={fade}
          />
        );
      })}
    </g>
  );
}
function Tick({
  x = 800,
  y = 690,
  opacity = 1,
}: {
  x?: number;
  y?: number;
  opacity?: number;
}) {
  return (
    <path
      d={`M${x - 35} ${y} l25 25 l50 -60`}
      fill="none"
      stroke={green}
      strokeWidth={9}
      strokeLinecap="round"
      strokeLinejoin="round"
      opacity={opacity}
    />
  );
}
export function MisraGriesVisual({ initial }: { initial: State }) {
  const { ref, state, sectionId } = useVideoVisual(
      misraGriesDefinition,
      initial,
    ),
    section = useVideoSection(sectionId),
    s = state.step,
    scene = state.scene,
    t = section.localTime,
    global = section.globalTime;
  let content: ReactNode;
  if (scene === "hook")
    content = (
      <>
        <River time={global} y={245} />
        <Text y={490} size={112} opacity={smooth(s)}>
          any &gt; ⅓?
        </Text>
      </>
    );
  else if (scene === "memory")
    content = (
      <g fontFamily="'Inter',system-ui,sans-serif">
        <FrequencyCounterScene
          memory
          time={t}
          duration={section.duration}
          marks={{ question: section.marks.limit ?? 9 }}
          polygons={POLYGONS}
          initialEntries={[]}
          fadeMatchingArrivals
          arrivals={introMemoryArrivals(section.marks.limit ?? 9)}
        />
      </g>
    );
  else if (scene === "bridge") {
    const move = smooth(s),
      clear = 1 - smooth(s / 0.45),
      known = smooth((t - (section.marks.counter ?? 4)) / 0.6);
    content = (
      <>
        <Text y={185} size={100} opacity={clear}>
          &gt; ½
        </Text>
        <Card x={mix(800, 615, move)}>
          <g opacity={clear * known}>
            <Shape kind="square" x={mix(800, 615, move)} y={435} size={74} />
            <Text x={mix(800, 615, move)} y={565} size={66} fill={gold}>
              1
            </Text>
          </g>
        </Card>
        <g opacity={smooth((s - 0.35) / 0.65)}>
          <Card x={985} />
        </g>
      </>
    );
  } else if (scene === "slots")
    content = (
      <TraceBoard progress={s} capacity={2} streamOpacity={smooth(t / 0.45)} />
    );
  else if (scene === "cancel")
    content = <TraceBoard progress={5 + s} capacity={2} />;
  else if (scene === "trace")
    content = <TraceBoard progress={s} capacity={2} />;
  else if (scene === "bounds") {
    const spread = smooth(s),
      hidden = smooth(s - 1),
      rise = smooth(s - 2),
      chart = smooth((rise - 0.55) / 0.45),
      shift = smooth((s - 3) / 0.65),
      rowFade = 1 - smooth((s - 3) / 0.35),
      others = smooth((s - 3 - 0.65) / 0.35);
    content = (
      <>
        <StreamRow processed={15} opacity={1 - spread} />
        <FixedSummary summary={TWO[15]} hideSquare opacity={1 - spread} />
        <Ledger count={3} opacity={1 - spread} />
        {Array.from({ length: 4 }, (_, i) => {
          return (
            <Shape
              key={i}
              kind="square"
              {...spreadPose(i, spread)}
              opacity={rowFade}
            />
          );
        })}
        {Array.from({ length: 3 }, (_, i) => {
          const x = 520 + i * 280,
            possible = possiblePose(i, rise);
          return (
            <g key={i} opacity={hidden * rowFade}>
              <g opacity={1 - smooth(rise / 0.35)}>
                <rect
                  x={x - 100}
                  y={510}
                  width={200}
                  height={125}
                  rx={24}
                  stroke="#46586d"
                  strokeWidth={3}
                  strokeDasharray="8 8"
                  fill="none"
                />
                <Text x={x} y={680} size={35} fill={muted}>
                  ≤ 1
                </Text>
              </g>
              <g transform={`translate(${possible.x} ${possible.y})`}>
                <rect
                  x={-39}
                  y={-39}
                  width={78}
                  height={78}
                  rx={8}
                  fill={blue}
                  fillOpacity={0.08}
                  stroke={blue}
                  strokeWidth={3}
                  strokeDasharray="9 7"
                />
              </g>
            </g>
          );
        })}
        <Range
          low={4}
          high={7}
          reveal={chart}
          y={mix(660, 355, shift)}
          opacity={chart}
        />
        <Range kind="circle" low={2} high={5} y={615} opacity={others} small />
        <g opacity={others}>
          <Shape kind="triangle" x={675} y={805} size={47} opacity={0.4} />
          <Shape kind="diamond" x={745} y={805} size={47} opacity={0.4} />
          <Text x={905} y={805} size={42} fill={muted}>
            ≤ 3
          </Text>
        </g>
      </>
    );
  } else if (scene === "threshold") {
    const q = smooth(s),
      circle = smooth(s - 1),
      ask = smooth(s - 2);
    content = (
      <>
        <Text y={125} size={70} opacity={q}>
          any &gt; ⅓?
        </Text>
        <Range low={4} high={7} y={355} />
        <Threshold top={315} bottom={695} opacity={q} />
        <g opacity={1 - q}>
          <Shape kind="triangle" x={675} y={805} size={47} opacity={0.4} />
          <Shape kind="diamond" x={745} y={805} size={47} opacity={0.4} />
          <Text x={905} y={805} size={42} fill={muted}>
            ≤ 3
          </Text>
        </g>
        <Range
          kind="circle"
          low={2}
          high={5}
          y={615}
          small
          hideFive={q}
          opacity={mix(1, 0.4, circle)}
        />
        <Text x={1180} y={615} size={65} fill={muted} opacity={circle}>
          ×
        </Text>
        <Text x={1150} y={330} size={80} fill={gold} opacity={ask}>
          ?
        </Text>
      </>
    );
  } else if (scene === "replay") {
    content =
      s <= 15 ? (
        <TraceBoard progress={s} capacity={3} />
      ) : (
        <SummaryToRange progress={s - 15} />
      );
  } else if (scene === "decide") {
    const yes = smooth(s),
      intro = clamp(s - 1),
      scan = clamp(s - 2),
      visited = Math.min(15, Math.floor(scan * 15)),
      finished = scan === 1;
    content = (
      <>
        <Range low={6} high={7} y={420} exact={scan === 1} />
        <Threshold opacity={yes} />
        <Tick opacity={yes * (1 - smooth(intro / 0.45))} />
        {s > 1 && (
          <g opacity={smooth((intro - 0.45) / 0.55)}>
            {STREAM.map((kind, i) => (
              <Shape
                key={i}
                kind={kind}
                x={ribbonX(i)}
                y={680}
                size={50}
                opacity={i < visited && kind !== "square" ? 0.4 : 1}
                highlight={i < visited && kind === "square" ? 1 : 0}
              />
            ))}
            <Text y={800} size={32} fill={finished ? green : muted}>
              second pass
            </Text>
          </g>
        )}
      </>
    );
  } else if (scene === "general") {
    const formula = smooth(s),
      scale = smooth(s - 1),
      m = scale < 0.5 ? 2 : 99,
      counterOpacity =
        scale < 0.5 ? 1 - smooth(scale / 0.45) : smooth((scale - 0.55) / 0.45),
      fraction = mix(1 / 3, 0.01, scale);
    content = (
      <>
        <Text y={120} size={48} fill={muted}>
          Misra–Gries
        </Text>
        <Text x={600} y={285} size={124} fill={gold} opacity={counterOpacity}>
          {m}
        </Text>
        <Text x={600} y={390} size={34} fill={muted}>
          counters
        </Text>
        <g opacity={1 - smooth(scale / 0.25)}>
          {["square", "circle", "triangle"].map((k, i) => (
            <Shape
              key={k}
              kind={k as Kind}
              x={1000 + (i - 1) * 100}
              y={285}
              size={65}
            />
          ))}
        </g>
        <Text
          x={1050}
          y={285}
          size={105}
          fill={blue}
          opacity={smooth((scale - 0.6) / 0.4)}
        >
          1%
        </Text>
        <Text
          x={1050}
          y={390}
          size={34}
          fill={muted}
          opacity={smooth((scale - 0.6) / 0.4)}
        >
          max. error
        </Text>
        <Text y={540} size={70} opacity={formula}>
          error ≤ N / (m + 1)
        </Text>
        <g opacity={formula}>
          <rect
            x={400}
            y={650}
            width={800}
            height={26}
            rx={13}
            fill="#1e2a38"
          />
          <rect
            x={400}
            y={650}
            width={800 * fraction}
            height={26}
            rx={Math.min(13, (800 * fraction) / 2)}
            fill={blue}
          />
        </g>
      </>
    );
  } else
    content = (
      <>
        <River time={global} y={220} opacity={0.45} />
        <Shape kind="square" x={540} y={505} size={115} />
        <Text x={855} y={510} size={114} opacity={smooth(s)}>
          &gt; ⅓
        </Text>
        <Tick x={1130} y={505} opacity={smooth(s - 1)} />
      </>
    );
  // Continuous scenes preserve their last frame. Deliberate resets fade out and
  // in on both sides; never cut a fully visible scene to an empty first frame.
  const enter = [
    "hook",
    "memory",
    "bridge",
    "replay",
    "general",
    "closing",
  ].includes(scene)
    ? smooth(t / 0.45)
    : 1;
  const exit = ["hook", "memory", "threshold", "decide", "general"].includes(
    scene,
  )
    ? smooth((section.duration - t) / 0.45)
    : 1;
  const fade = enter * exit;
  return (
    <main
      ref={ref}
      data-misra-scene={scene}
      data-step={s}
      style={{
        width: "100%",
        height: "100%",
        background: "#000",
        overflow: "hidden",
      }}
    >
      <svg
        viewBox="0 0 1600 900"
        width="100%"
        height="100%"
        role="img"
        aria-label={`Misra–Gries: ${scene}`}
        style={{ display: "block" }}
      >
        <defs>
          <radialGradient id={`mg-haze-${scene}`}>
            <stop stopColor={blue} stopOpacity=".045" />
            <stop offset="1" stopColor="#000" stopOpacity="0" />
          </radialGradient>
        </defs>
        <rect width="1600" height="900" fill={`url(#mg-haze-${scene})`} />
        <g
          opacity={fade}
          transform={`translate(0 ${Math.sin(global * 0.7) * 3})`}
        >
          {content}
        </g>
      </svg>
    </main>
  );
}
