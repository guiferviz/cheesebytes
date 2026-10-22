import type { ReactNode } from "react";
import {
  useVideoVisual,
  useVideoSection,
} from "@guiferviz/cheese-bytes-video/react";
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
import { clamp, smooth, mix, slotX, ribbonX, cancellationPose } from "./motion";
export { misraGriesDefinition } from "./definition";
const gold = "#fbbf24",
  blue = "#64b5f6",
  ink = "#edf2f7",
  muted = "#94a3b8",
  green = "#81c784";
const TWO = trace(STREAM, 2),
  THREE = trace(STREAM, 3),
  POLYGONS = createMemoryShapes(42, 24);
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
        height={245}
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
function pilePoint(index: number, count: number, x: number) {
  const rows = Math.ceil(count / 3),
    columns = Math.ceil(count / rows),
    row = Math.floor(index / columns),
    inRow = Math.min(columns, count - row * columns);
  return {
    x: x + ((index % columns) - (inRow - 1) / 2) * 64,
    y: 435 + (row - (rows - 1) / 2) * 64,
  };
}
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
              <Text x={slotX(i, capacity)} y={545} size={66} fill={gold}>
                {summary.counts[kind]}
              </Text>
            </>
          )}
        </Card>
      ))}
    </g>
  );
}
function Ledger({
  count,
  capacity = 2,
  opacity = 1,
}: {
  count: number;
  capacity?: number;
  opacity?: number;
}) {
  return (
    <g opacity={opacity} data-removed={count}>
      <Text x={765} y={735} size={34} fill={muted} anchor="end">
        groups
      </Text>
      <Text x={825} y={735} size={60} fill={gold}>
        {count}
      </Text>
      {Array.from({ length: count }, (_, i) => (
        <g
          key={i}
          transform={`translate(${800 + (i - (count - 1) / 2) * 95} 798)`}
        >
          {Array.from({ length: capacity + 1 }, (_, n) => (
            <circle
              key={n}
              cx={(n - capacity / 2) * 18}
              cy={0}
              r={5}
              fill={gold}
            />
          ))}
        </g>
      ))}
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
}: {
  progress: number;
  capacity: number;
}) {
  const states = capacity === 2 ? TWO : THREE,
    p = Math.max(0, Math.min(15, progress)),
    done = p >= 15,
    n = Math.min(14, Math.floor(p)),
    f = done ? 1 : p - n;
  const before = states[n],
    after = states[n + 1],
    incoming = STREAM[n],
    cancel = after.event === "cancel",
    q = cancel ? clamp((f - 0.3) / 0.7) : f,
    hit = smooth((q - 0.67) / 0.23);
  const targetIndex = after.slots.indexOf(incoming),
    targetCount = after.counts[incoming] ?? 1,
    target = pilePoint(
      targetCount - 1,
      targetCount,
      slotX(targetIndex, capacity),
    );
  const removed = done
    ? states[15].removed
    : hit > 0.5
      ? after.removed
      : before.removed;
  return (
    <g
      data-trace-progress={p}
      data-capacity={capacity}
      data-square-count={(hit > 0.5 ? after : before).counts.square ?? 0}
      data-circle-count={(hit > 0.5 ? after : before).counts.circle ?? 0}
    >
      {STREAM.map((kind, i) =>
        i === n && !done ? null : (
          <Shape
            key={i}
            kind={kind}
            x={ribbonX(i)}
            y={190}
            size={50}
            opacity={done || i < n ? 0.4 : 1}
          />
        ),
      )}
      {!done &&
        before.slots.map((kind, i) => {
          const x = slotX(i, capacity),
            next = after.slots[i],
            oldCount = kind ? (before.counts[kind] ?? 0) : 0,
            newCount = next ? (after.counts[next] ?? 0) : 0;
          return (
            <Card key={i} x={x}>
              {kind &&
                Array.from({ length: oldCount }, (_, j) => {
                  const source = pilePoint(j, oldCount, x),
                    removedCopy = cancel && j === oldCount - 1;
                  if (removedCopy) {
                    const pose = cancellationPose(source.x, source.y, q);
                    return <Shape key={j} kind={kind} {...pose} size={54} />;
                  }
                  const dest = pilePoint(j, Math.max(1, newCount), x);
                  return (
                    <Shape
                      key={j}
                      kind={kind}
                      x={mix(source.x, dest.x, hit)}
                      y={mix(source.y, dest.y, hit)}
                      size={54}
                    />
                  );
                })}
              {!cancel && next && newCount > oldCount && (
                <Shape kind={next} {...target} size={54} opacity={hit} />
              )}
              {(hit > 0.5 ? newCount : oldCount) > 0 && (
                <Text x={x} y={545} size={66} fill={gold}>
                  {hit > 0.5 ? newCount : oldCount}
                </Text>
              )}
              {cancel && (
                <Text
                  x={x + 145}
                  y={470}
                  size={40}
                  fill={gold}
                  opacity={Math.sin(Math.PI * hit)}
                >
                  −1
                </Text>
              )}
            </Card>
          );
        })}
      {!done && !cancel && (
        <Shape
          kind={incoming}
          x={mix(ribbonX(n), target.x, smooth(f))}
          y={mix(190, target.y, smooth(f)) - Math.sin(Math.PI * smooth(f)) * 35}
          size={mix(50, 54, smooth(f))}
          opacity={1 - hit}
        />
      )}
      {!done && cancel && (
        <Shape
          kind={incoming}
          x={f <= 0.3 ? mix(ribbonX(n), 800, smooth(f / 0.3)) : 800}
          y={f <= 0.3 ? 190 : mix(190, 330, smooth(q / 0.78))}
          size={54}
          opacity={1 - smooth((q - 0.68) / 0.24)}
        />
      )}
      {done && <FixedSummary summary={states[15]} capacity={capacity} />}
      <Ledger count={removed} capacity={capacity} opacity={removed ? 1 : 0} />
    </g>
  );
}
function Range({
  low = 4,
  high = 7,
  y = 490,
  kind = "square",
  threshold = 0,
  exact,
  opacity = 1,
  small = false,
}: {
  low?: number;
  high?: number;
  y?: number;
  kind?: Kind;
  threshold?: number;
  exact?: number;
  opacity?: number;
  small?: boolean;
}) {
  const x = (n: number) => 370 + ((n - 1) * 1000) / 7;
  return (
    <g
      opacity={opacity}
      data-interval-kind={kind}
      data-interval-low={low}
      data-interval-high={high}
    >
      <Shape kind={kind} x={235} y={y} size={small ? 64 : 82} />
      <line x1={370} x2={1370} y1={y} y2={y} stroke="#344353" strokeWidth={3} />
      {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
        <g key={n}>
          <line x1={x(n)} x2={x(n)} y1={y - 7} y2={y + 7} stroke={muted} />
          {!small && (
            <Text x={x(n)} y={y + 53} size={29} fill={muted}>
              {n}
            </Text>
          )}
        </g>
      ))}
      <rect
        x={x(low)}
        y={y - 17}
        width={Math.max(1, ((high - low) * 1000) / 7)}
        height={34}
        rx={10}
        fill={gold}
        opacity={0.15}
      />
      <line
        x1={x(low)}
        x2={x(high)}
        y1={y}
        y2={y}
        stroke={gold}
        strokeWidth={7}
        strokeLinecap="round"
      />
      <circle cx={x(low)} cy={y} r={10} fill={blue} />
      <circle
        cx={x(high)}
        cy={y}
        r={10}
        fill={gold}
        opacity={smooth((high - low) / 0.25)}
      />
      <Text x={x(low)} y={y - 58} size={small ? 46 : 62} fill={blue}>
        {Math.round(low)}
      </Text>
      <Text
        x={x(high)}
        y={y - 58}
        size={small ? 46 : 62}
        fill={gold}
        opacity={smooth((high - low) / 0.25)}
      >
        {Math.round(high)}
      </Text>
      <g opacity={threshold}>
        <line
          x1={x(5)}
          x2={x(5)}
          y1={y - 28}
          y2={y + 83}
          stroke={muted}
          strokeWidth={3}
          strokeDasharray="8 8"
        />
        <Text x={x(5)} y={y + 122} size={36} fill={muted}>
          ⅓
        </Text>
      </g>
      {exact !== undefined && (
        <>
          <circle cx={x(exact)} cy={y} r={13} fill={green} />
          <Text x={x(exact)} y={y - 120} size={46} fill={green}>
            {exact}
          </Text>
        </>
      )}
    </g>
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
function PossibleRow({ opacity = 1 }: { opacity?: number }) {
  return (
    <g opacity={opacity}>
      {Array.from({ length: 4 }, (_, i) => (
        <Shape key={i} kind="square" x={470 + i * 110} y={310} size={78} />
      ))}
      {Array.from({ length: 3 }, (_, i) => (
        <rect
          key={i}
          x={910 + i * 110 - 39}
          y={271}
          width={78}
          height={78}
          rx={8}
          stroke={blue}
          strokeWidth={3}
          strokeDasharray="9 7"
          fill={blue}
          fillOpacity={0.08}
        />
      ))}
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
        <g opacity={smooth(s - 1)}>
          {[0, 1].map((i) => (
            <g key={i}>
              <rect
                x={650 + i * 230 - 82}
                y={640}
                width={164}
                height={145}
                rx={19}
                fill="#0a1017"
                stroke="#334155"
                strokeWidth={2}
              />
              <Text x={650 + i * 230} y={713} size={70} fill={gold}>
                ?
              </Text>
            </g>
          ))}
        </g>
      </>
    );
  else if (scene === "slots")
    content = <TraceBoard progress={s} capacity={2} />;
  else if (scene === "cancel")
    content = <TraceBoard progress={5 + s} capacity={2} />;
  else if (scene === "trace")
    content = <TraceBoard progress={s} capacity={2} />;
  else if (scene === "bounds") {
    const spread = smooth(s),
      hidden = smooth(s - 1),
      rise = smooth(s - 2),
      chart = smooth((rise - 0.55) / 0.45),
      others = smooth(s - 3);
    content = (
      <>
        <StreamRow processed={15} opacity={1 - spread} />
        <FixedSummary summary={TWO[15]} hideSquare opacity={1 - spread} />
        <Ledger count={3} opacity={1 - spread} />
        {Array.from({ length: 4 }, (_, i) => {
          const source = pilePoint(i, 4, slotX(0, 2));
          return (
            <Shape
              key={i}
              kind="square"
              x={mix(source.x, 470 + i * 110, spread)}
              y={mix(source.y, 310, spread)}
              size={mix(54, 78, spread)}
              opacity={1 - others}
            />
          );
        })}
        {Array.from({ length: 3 }, (_, i) => {
          const x = 520 + i * 280,
            target = 910 + i * 110;
          return (
            <g key={i} opacity={hidden * (1 - others)}>
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
              <g
                transform={`translate(${mix(x, target, rise)} ${mix(565, 310, rise)})`}
              >
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
                <Text x={0} y={0} size={42} fill={blue} opacity={1 - rise}>
                  ?
                </Text>
              </g>
            </g>
          );
        })}
        <Range
          low={4}
          high={mix(4, 7, chart)}
          y={mix(660, 355, others)}
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
        <Range low={4} high={7} y={355} threshold={q} />
        <Range
          kind="circle"
          low={2}
          high={5}
          y={615}
          small
          threshold={q}
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
    const reveal = smooth(s - 15),
      chart = smooth((reveal - 0.45) / 0.55);
    content = (
      <>
        <g opacity={1 - smooth(reveal / 0.35)}>
          <TraceBoard progress={Math.min(15, s)} capacity={3} />
        </g>
        <Range low={6} high={7} y={420} opacity={chart} />
      </>
    );
  } else if (scene === "decide") {
    const yes = smooth(s),
      intro = clamp(s - 1),
      scan = clamp(s - 2),
      visited = Math.min(15, Math.floor(scan * 15)),
      count = STREAM.slice(0, visited).filter((k) => k === "square").length;
    content = (
      <>
        <Range
          low={6}
          high={7}
          y={420}
          threshold={1}
          exact={scan === 1 ? 7 : undefined}
        />
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
            <Text x={740} y={800} size={32} fill={muted}>
              recount
            </Text>
            <Text x={895} y={800} size={62} fill={scan === 1 ? green : gold}>
              {count}
            </Text>
          </g>
        )}
      </>
    );
  } else if (scene === "general") {
    const formula = smooth(s),
      scale = smooth(s - 1),
      m = Math.round(mix(2, 99, smooth((scale - 0.25) / 0.75))),
      fraction = 1 / (m + 1);
    content = (
      <>
        <Text y={120} size={48} fill={muted}>
          Misra–Gries
        </Text>
        <Text x={600} y={285} size={124} fill={gold}>
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
          opacity={smooth((scale - 0.25) / 0.25)}
        >
          {Math.round(fraction * 100)}%
        </Text>
        <Text
          x={1050}
          y={390}
          size={34}
          fill={muted}
          opacity={smooth((scale - 0.25) / 0.25)}
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
  const fade = ["hook", "slots", "replay", "general", "closing"].includes(scene)
    ? smooth(t / 0.45)
    : 1;
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
