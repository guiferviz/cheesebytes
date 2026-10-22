import type { ReactNode } from "react";
import {
  useVideoVisual,
  useVideoSection,
} from "@guiferviz/cheese-bytes-video/react";
import { Shape } from "../../majority-vote/video/Shape";
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
  transferPose,
  cancellationPose,
} from "./motion";
export { misraGriesDefinition } from "./definition";
const gold = "#fbbf24",
  blue = "#64b5f6",
  ink = "#edf2f7",
  muted = "#94a3b8",
  green = "#81c784";
const TWO = trace(STREAM, 2),
  THREE = trace(STREAM, 3);
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
      fontFamily="'Inter', system-ui, sans-serif"
      fontWeight={450}
    >
      {children}
    </text>
  );
}
function Caption({
  children,
  opacity = 1,
  y = 100,
}: {
  children: ReactNode;
  opacity?: number;
  y?: number;
}) {
  return (
    <Text y={y} size={38} fill={muted} opacity={opacity}>
      {children}
    </Text>
  );
}
function Card({
  x,
  children,
  opacity = 1,
  pulse = 0,
}: {
  x: number;
  children?: ReactNode;
  opacity?: number;
  pulse?: number;
}) {
  return (
    <g opacity={opacity}>
      <rect
        x={x - 110}
        y={355}
        width={220}
        height={245}
        rx={23}
        fill="#0a1017"
        stroke={pulse ? blue : "#283644"}
        strokeWidth={2 + pulse * 2}
      />
      {children}
    </g>
  );
}
function FixedSummary({
  summary,
  capacity = 2,
  opacity = 1,
}: {
  summary: Summary;
  capacity?: number;
  opacity?: number;
}) {
  return (
    <g opacity={opacity}>
      {summary.slots.map((kind, i) => (
        <Card key={i} x={slotX(i, capacity)}>
          {kind && (
            <>
              <Shape kind={kind} x={slotX(i, capacity)} y={445} size={88} />
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
function Ledger({ count, opacity = 1 }: { count: number; opacity?: number }) {
  return (
    <g opacity={opacity}>
      <Text x={755} y={730} size={38} fill={muted} anchor="end">
        groups removed
      </Text>
      <Text x={815} y={730} size={62} fill={gold} anchor="start">
        {count}
      </Text>
      {Array.from({ length: count }, (_, i) => (
        <g
          key={i}
          transform={`translate(${738 + (i - (count - 1) / 2) * 80} 795)`}
        >
          {[0, 1, 2].map((n) => (
            <circle
              key={n}
              cx={n * 18}
              cy={0}
              r={5}
              fill={gold}
              opacity={0.75}
            />
          ))}
        </g>
      ))}
    </g>
  );
}
/** The original row stays in place. Only the active arrival leaves it. */
function TraceBoard({
  progress,
  capacity,
}: {
  progress: number;
  capacity: number;
}) {
  const states = capacity === 2 ? TWO : THREE,
    p = Math.max(0, Math.min(15, progress)),
    n = Math.min(14, Math.floor(p)),
    f = p >= 15 ? 1 : p - n;
  const before = states[n],
    after = states[n + 1],
    incoming = STREAM[n],
    cancel = after.event === "cancel",
    done = p >= 15;
  const hit = smooth((f - 0.67) / 0.23),
    removed = hit > 0.5 ? after.removed : before.removed;
  const targetIndex = after.slots.indexOf(incoming),
    target = targetIndex < 0 ? 800 : slotX(targetIndex, capacity);
  return (
    <g data-trace-progress={p} data-capacity={capacity}>
      {STREAM.map((kind, i) =>
        i === n && !done ? (
          <g key={i} />
        ) : (
          <Shape
            key={i}
            kind={kind}
            x={ribbonX(i)}
            y={190}
            size={50}
            opacity={i < n || done ? 0.3 : 1}
          />
        ),
      )}
      <Text y={275} size={31} fill={muted}>
        {done ? "15 / 15" : ""}
      </Text>
      {!done &&
        before.slots.map((kind, i) => {
          const x = slotX(i, capacity),
            next = after.slots[i],
            oldCount = kind ? (before.counts[kind] ?? 0) : 0,
            newCount = next ? (after.counts[next] ?? 0) : 0;
          return (
            <Card
              key={i}
              x={x}
              pulse={
                !cancel && i === targetIndex ? Math.sin(Math.PI * hit) * 0.7 : 0
              }
            >
              {kind && (
                <Shape
                  kind={kind}
                  x={x}
                  y={445}
                  size={88}
                  opacity={cancel && oldCount === 1 ? 0 : 1}
                />
              )}
              {!kind && next && (
                <Shape kind={next} x={x} y={445} size={88} opacity={hit} />
              )}
              {kind && (
                <g opacity={oldCount === newCount ? 1 : 1 - hit}>
                  <Text x={x} y={545 - hit * 12} size={66} fill={gold}>
                    {oldCount}
                  </Text>
                </g>
              )}
              {newCount !== oldCount && newCount > 0 && (
                <g opacity={hit}>
                  <Text x={x} y={557 - hit * 12} size={66} fill={gold}>
                    {newCount}
                  </Text>
                </g>
              )}
            </Card>
          );
        })}
      {!done && !cancel && (
        <Shape kind={incoming} {...transferPose(ribbonX(n), target, f)} />
      )}
      {!done && cancel && (
        <>
          {before.slots.map(
            (kind, i) =>
              kind && (
                <Shape
                  key={kind}
                  kind={kind}
                  {...cancellationPose(slotX(i, capacity), 445, f)}
                  size={88}
                />
              ),
          )}
          <Shape
            kind={incoming}
            {...cancellationPose(ribbonX(n), 190, f)}
            size={mix(50, 88, smooth(f / 0.5))}
          />
        </>
      )}
      {done && <FixedSummary summary={states[15]} capacity={capacity} />}
      <Ledger count={done ? states[15].removed : removed} />
    </g>
  );
}
function Range({
  low = 5,
  high = 8,
  y = 490,
  threshold = 0,
  exact,
  opacity = 1,
}: {
  low?: number;
  high?: number;
  y?: number;
  threshold?: number;
  exact?: number;
  opacity?: number;
}) {
  const x = (n: number) => 370 + (n - 4) * 200;
  return (
    <g opacity={opacity} data-interval-low={low} data-interval-high={high}>
      <Shape kind="square" x={205} y={y} size={82} />
      <line x1={370} x2={1370} y1={y} y2={y} stroke="#344353" strokeWidth={4} />
      {[4, 5, 6, 7, 8, 9].map((n) => (
        <g key={n}>
          <line x1={x(n)} x2={x(n)} y1={y - 8} y2={y + 8} stroke={muted} />
          <Text x={x(n)} y={y + 55} size={30} fill={muted}>
            {n}
          </Text>
        </g>
      ))}
      <rect
        x={x(low)}
        y={y - 19}
        width={Math.max(2, (high - low) * 200)}
        height={38}
        rx={12}
        fill={gold}
        opacity={0.16}
      />
      <line
        x1={x(low)}
        x2={x(high)}
        y1={y}
        y2={y}
        stroke={gold}
        strokeWidth={8}
        strokeLinecap="round"
      />
      <circle cx={x(low)} cy={y} r={11} fill={blue} />
      <circle
        cx={x(high)}
        cy={y}
        r={11}
        fill={gold}
        opacity={smooth((high - low) / 0.25)}
      />
      <Text x={x(low)} y={y - 68} size={66} fill={blue}>
        {Math.round(low)}
      </Text>
      <Text
        x={x(high)}
        y={y - 68}
        size={66}
        fill={gold}
        opacity={smooth((high - low) / 0.25)}
      >
        {Math.round(high)}
      </Text>
      <g opacity={threshold}>
        <line
          x1={x(5)}
          x2={x(5)}
          y1={y - 125}
          y2={y + 100}
          stroke={muted}
          strokeWidth={3}
          strokeDasharray="9 9"
        />
        <Text x={x(5)} y={y + 145} size={37} fill={muted}>
          ⅓ of 15 = 5
        </Text>
      </g>
      {exact !== undefined && (
        <g>
          <circle cx={x(exact)} cy={y} r={14} fill={green} />
          <Text x={x(exact)} y={y - 145} size={42} fill={green}>
            exactly {exact}
          </Text>
        </g>
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
        const x = ((((i * 105 - time * 72) % 2520) + 2520) % 2520) - 460;
        return (
          <Shape
            key={i}
            kind={KINDS[(i * 7 + Math.floor(i / 5)) % 4]}
            x={x}
            y={y + Math.sin(time * 0.65 + i * 1.7) * 12}
            size={64}
            rotate={Math.sin(time * 0.55 + i) * 2}
            opacity={smooth((x + 80) / 130) * (1 - smooth((x - 1440) / 160))}
          />
        );
      })}
    </g>
  );
}
function Demo({ s, cancel = false }: { s: number; cancel?: boolean }) {
  const first = smooth(s),
    second = smooth(s - 1),
    arrival = cancel ? smooth(s) : 0,
    collision = cancel ? smooth(s - 1) : 0;
  return (
    <>
      {[0, 1].map((i) => {
        const x = slotX(i, 2),
          q = cancel ? 1 : i === 0 ? first : second,
          kind = i === 0 ? "square" : "circle",
          flight = cancel
            ? cancellationPose(x, 445, collision)
            : { x, y: mix(190, 445, q), opacity: 1, size: 88 };
        return (
          <g key={i}>
            <Card x={x} />
            {q > 0 && (
              <Shape
                kind={kind}
                x={flight.x}
                y={flight.y}
                size={mix(66, 88, q)}
                opacity={flight.opacity}
              />
            )}
            <Text
              x={x}
              y={545}
              size={66}
              fill={gold}
              opacity={
                smooth((q - 0.75) / 0.25) *
                (cancel ? 1 - smooth((collision - 0.67) / 0.23) : 1)
              }
            >
              1
            </Text>
          </g>
        );
      })}
      {cancel && (
        <Shape
          kind="triangle"
          x={800}
          y={mix(mix(40, 190, arrival), 330, smooth(collision / 0.78))}
          size={88}
          opacity={arrival * (1 - smooth((collision - 0.68) / 0.24))}
        />
      )}
      <Ledger
        count={cancel && collision > 0.82 ? 1 : 0}
        opacity={cancel ? smooth((s - 1.7) / 0.3) : 0}
      />
    </>
  );
}
export function MisraGriesVisual({ initial }: { initial: State }) {
  const { ref, state, sectionId } = useVideoVisual(
      misraGriesDefinition,
      initial,
    ),
    section = useVideoSection(sectionId);
  const s = state.step,
    scene = state.scene,
    t = section.localTime,
    global = section.globalTime,
    float = Math.sin(global * 0.7) * 3;
  let content: ReactNode;
  if (scene === "hook")
    content = (
      <>
        <River time={global} y={260} />
        <g opacity={smooth(s)}>
          <Shape kind="square" x={415} y={500} size={108} />
          <Text x={940} y={505} size={104}>
            more than ⅓?
          </Text>
        </g>
        <g opacity={smooth((s - 1.45) / 0.55)}>
          {KINDS.map((kind, i) => (
            <g
              key={kind}
              opacity={1 - smooth((s - 1.45) / 0.55) * (i > 1 ? 0.8 : 0)}
            >
              <Shape kind={kind} x={620 + i * 120} y={700} size={54} />
            </g>
          ))}
        </g>
      </>
    );
  else if (scene === "slots")
    content = (
      <>
        <Caption>Two counters</Caption>
        <Demo s={s} />
      </>
    );
  else if (scene === "cancel")
    content = (
      <>
        <Caption opacity={1 - smooth((s - 1.65) / 0.35)}>
          Two slots. A third kind.
        </Caption>
        <Demo s={s} cancel />
        <Text y={100} size={42} fill={gold} opacity={smooth((s - 1.65) / 0.35)}>
          One of each. One group removed.
        </Text>
      </>
    );
  else if (scene === "trace")
    content = (
      <>
        <Caption>Same rule · 15 arrivals</Caption>
        <TraceBoard progress={s} capacity={2} />
      </>
    );
  else if (scene === "bounds") {
    const spread = smooth(s),
      hidden = smooth(s - 1),
      rise = smooth(s - 2);
    content = (
      <>
        <FixedSummary summary={TWO[15]} opacity={1 - spread} />
        <Ledger count={3} opacity={1 - spread} />
        {Array.from({ length: 5 }, (_, i) => (
          <Shape
            key={i}
            kind="square"
            x={mix(615, 360 + i * 110, spread)}
            y={mix(445, 310, spread)}
            size={88}
            opacity={i === 0 ? 1 : spread}
          />
        ))}
        <Text
          x={580}
          y={430}
          size={48}
          fill={blue}
          opacity={spread * (1 - rise)}
        >
          5 survived
        </Text>
        {Array.from({ length: 3 }, (_, i) => {
          const x = 520 + i * 280,
            target = 910 + i * 110;
          return (
            <g key={i} opacity={hidden}>
              <g opacity={1 - rise}>
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
                <Text x={x} y={675} size={34} fill={muted}>
                  at most 1
                </Text>
              </g>
              <g
                transform={`translate(${mix(x, target, rise)} ${mix(565, 310, rise)})`}
              >
                <rect
                  x={-44}
                  y={-44}
                  width={88}
                  height={88}
                  rx={9}
                  fill={blue}
                  fillOpacity={0.08}
                  stroke={blue}
                  strokeWidth={3}
                  strokeDasharray="9 7"
                />
                <Text x={0} y={3} size={42} fill={blue} opacity={1 - rise}>
                  ?
                </Text>
              </g>
            </g>
          );
        })}
        <Caption opacity={spread * (1 - rise)}>
          How many squares could we have lost?
        </Caption>
        <Caption opacity={rise}>5 survived + at most 3 lost</Caption>
        <Range low={5} high={mix(5, 8, rise)} y={660} opacity={rise} />
      </>
    );
  } else if (scene === "threshold") {
    const move = smooth(s),
      q = smooth(s - 1);
    content = (
      <>
        <Caption>More than one third?</Caption>
        <Range y={mix(660, 420, move)} threshold={move} />
        <Text y={725} size={54} fill={gold} opacity={q}>
          5 is still possible.
        </Text>
        <Text y={800} size={36} fill={muted} opacity={q}>
          The summary cannot decide yet.
        </Text>
      </>
    );
  } else if (scene === "replay") {
    const reveal = smooth(s - 15);
    content = (
      <>
        <Caption>Replay the same stream · three counters</Caption>
        <g opacity={1 - reveal}>
          <TraceBoard progress={Math.min(15, s)} capacity={3} />
        </g>
        <Range
          low={mix(5, 6, reveal)}
          high={mix(8, 7, reveal)}
          y={mix(600, 420, reveal)}
          opacity={reveal}
        />
        <Text y={695} size={54} fill={gold} opacity={reveal}>
          6 survived + at most 1 lost
        </Text>
      </>
    );
  } else if (scene === "decide") {
    const answer = smooth(s),
      scan = clamp(s - 2),
      visited = Math.min(15, Math.floor(scan * 15)),
      count = STREAM.slice(0, visited).filter((k) => k === "square").length;
    content = (
      <>
        <Caption>More than one third?</Caption>
        <Range
          low={6}
          high={7}
          y={420}
          threshold={1}
          exact={scan === 1 ? 7 : undefined}
        />
        <g opacity={1 - smooth((s - 1) / 0.45)}>
          <Text y={695} size={70} fill={green} opacity={answer}>
            Yes. Even the minimum is above 5.
          </Text>
          <Text y={785} size={38} fill={muted} opacity={answer}>
            No second pass for this decision.
          </Text>
        </g>
        {s > 1 && (
          <g opacity={smooth((s - 1.45) / 0.55)}>
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
            <Text y={795} size={43} fill={scan === 1 ? green : muted}>
              second pass · exact count: {count}
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
        <Caption>Misra–Gries</Caption>
        <Text x={600} y={290} size={130} fill={gold}>
          {m}
        </Text>
        <Text x={600} y={395} size={39} fill={muted}>
          counters
        </Text>
        <g opacity={1 - smooth(scale / 0.25)}>
          {["square", "circle", "triangle"].map((kind, i) => (
            <Shape
              key={i}
              kind={kind as Kind}
              x={1000 + (i - 1) * 100}
              y={280}
              size={65}
            />
          ))}
          <Text x={1000} y={395} size={37} fill={muted}>
            3 distinct values
          </Text>
        </g>
        <Text
          x={1050}
          y={290}
          size={105}
          fill={blue}
          opacity={smooth((scale - 0.25) / 0.25)}
        >
          {Math.round(fraction * 100)}%
        </Text>
        <Text
          x={1050}
          y={395}
          size={37}
          fill={muted}
          opacity={smooth((scale - 0.25) / 0.25)}
        >
          maximum error
        </Text>
        <Text y={540} size={74} fill={ink} opacity={formula}>
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
          <Text y={745} size={36} fill={muted}>
            N = stream length
          </Text>
        </g>
      </>
    );
  } else
    content = (
      <>
        <River time={global} y={195} opacity={0.5} />
        <Text y={335} size={34} fill={muted}>
          one-pass summary
        </Text>
        <Range low={6} high={7} y={460} />
        <Text y={680} size={62} fill={green} opacity={smooth(s)}>
          More than ⅓. Guaranteed.
        </Text>
        <Text y={785} size={45} fill={ink} opacity={smooth(s - 1)}>
          Lose the exact count. Keep the answer.
        </Text>
      </>
    );
  const fades = [
    "hook",
    "slots",
    "trace",
    "replay",
    "general",
    "closing",
  ].includes(scene)
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
        <g opacity={fades} transform={`translate(0 ${float})`}>
          {content}
        </g>
      </svg>
    </main>
  );
}
