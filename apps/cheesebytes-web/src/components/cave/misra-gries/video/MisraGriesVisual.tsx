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
export { misraGriesDefinition } from "./definition";
const gold = "#fbbf24",
  blue = "#64b5f6",
  ink = "#e2e8f0",
  muted = "#94a3b8",
  green = "#81c784";
const clamp = (n: number) => Math.max(0, Math.min(1, n)),
  smooth = (n: number) => {
    const t = clamp(n);
    return t * t * (3 - 2 * t);
  },
  lerp = (a: number, b: number, t: number) => a + (b - a) * t;
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
      fontFamily="'IosevkaTermSlab Nerd Font Mono', ui-monospace, monospace"
    >
      {children}
    </text>
  );
}
function Heading({ children }: { children: ReactNode }) {
  return (
    <Text y={100} size={40} fill={muted}>
      {children}
    </Text>
  );
}
function Sequence({
  processed = 0,
  y = 225,
  reveal = false,
}: {
  processed?: number;
  y?: number;
  reveal?: boolean;
}) {
  return (
    <g>
      {STREAM.map((kind, i) => (
        <Shape
          key={i}
          kind={kind}
          x={240 + i * 80}
          y={y}
          size={40}
          opacity={processed && i < processed ? 0.4 : 1}
          highlight={reveal && i < processed && kind === "square" ? 1 : 0}
        />
      ))}
      <Text y={y + 65} size={25} fill={muted}>
        15 shapes · same order
      </Text>
    </g>
  );
}
function Slots({
  summary,
  capacity = 2,
  x = 800,
  y = 490,
  size = 180,
}: {
  summary: Summary;
  capacity?: number;
  x?: number;
  y?: number;
  size?: number;
}) {
  const kinds =
    capacity === 3 ? KINDS.slice(0, 3) : KINDS.filter((k) => summary.counts[k]);
  return (
    <g>
      {Array.from({ length: capacity }, (_, i) => {
        const px = x + (i - (capacity - 1) / 2) * (size + 35),
          kind = kinds[i];
        return (
          <g key={i}>
            <rect
              x={px - size / 2}
              y={y - size / 2}
              width={size}
              height={size}
              rx={20}
              fill="#0b1018"
              stroke="#334155"
              strokeWidth={2}
            />
            {kind && summary.counts[kind] && (
              <>
                <Shape kind={kind} x={px} y={y - 20} size={size * 0.36} />
                <Text x={px} y={y + size * 0.29} size={size * 0.25} fill={gold}>
                  {summary.counts[kind]}
                </Text>
              </>
            )}
          </g>
        );
      })}
    </g>
  );
}
function Interval({
  low,
  high,
  y = 450,
  kind = "square",
  label = true,
  threshold,
  exact,
}: {
  low: number;
  high: number;
  y?: number;
  kind?: Kind;
  label?: boolean;
  threshold?: number;
  exact?: number;
}) {
  const x = (n: number) => 420 + n * 90;
  return (
    <g>
      <Shape kind={kind} x={285} y={y} size={54} />
      <line x1={420} x2={1320} y1={y} y2={y} stroke="#25303e" strokeWidth={5} />
      {Array.from({ length: 11 }, (_, i) => (
        <g key={i}>
          <line x1={x(i)} x2={x(i)} y1={y - 9} y2={y + 9} stroke="#475569" />
          {label && (
            <Text x={x(i)} y={y + 46} size={22} fill={muted}>
              {i}
            </Text>
          )}
        </g>
      ))}
      <rect
        x={x(low)}
        y={y - 18}
        width={Math.max(4, (high - low) * 90)}
        height={36}
        rx={8}
        fill={gold}
        opacity={0.2}
      />
      <line
        x1={x(low)}
        x2={x(high)}
        y1={y}
        y2={y}
        stroke={gold}
        strokeWidth={7}
      />
      <circle cx={x(low)} cy={y} r={9} fill={blue} />
      <circle cx={x(high)} cy={y} r={9} fill={gold} />
      <Text x={(x(low) + x(high)) / 2} y={y - 57} size={42}>
        {low === high ? low : `${low} ≤ count ≤ ${high}`}
      </Text>
      {threshold !== undefined && (
        <g>
          <line
            x1={x(threshold)}
            x2={x(threshold)}
            y1={y - 95}
            y2={y + 70}
            stroke={muted}
            strokeWidth={2}
            strokeDasharray="10 10"
          />
          <Text x={x(threshold)} y={y + 100} size={25} fill={muted}>
            threshold {threshold}
          </Text>
        </g>
      )}
      {exact !== undefined && (
        <>
          <circle cx={x(exact)} cy={y} r={12} fill={green} />
          <Text x={x(exact)} y={y - 110} size={30} fill={green}>
            exactly {exact}
          </Text>
        </>
      )}
    </g>
  );
}
export function MisraGriesVisual({ initial }: { initial: State }) {
  const { ref, state, sectionId } = useVideoVisual(
      misraGriesDefinition,
      initial,
    ),
    section = useVideoSection(sectionId),
    s = state.step,
    scene = state.scene;
  let content: ReactNode;
  if (scene === "question")
    content = (
      <>
        <Heading>One pass. A small memory.</Heading>
        {Array.from({ length: 21 }, (_, i) => (
          <Shape
            key={i}
            kind={KINDS[i % 4]}
            x={
              ((((i * 100 - section.localTime * 38) % 2100) + 2100) % 2100) -
              200
            }
            y={300 + Math.sin(i) * 24}
            size={56}
            opacity={0.8}
          />
        ))}
        <Shape kind="square" x={680} y={540} size={90} />
        <Text x={850} y={540} size={90} fill={gold}>
          3
        </Text>
        <Text y={665} size={42} opacity={smooth(s - 1)}>
          counter ≠ actual frequency
        </Text>
        <Text y={770} size={36} fill={gold} opacity={smooth(s - 2)}>
          How far off could we be?
        </Text>
      </>
    );
  else if (scene === "slots") {
    const arriving = s < 2 ? "square" : "circle",
      q = smooth(s < 2 ? s - 1 : s - 2);
    content = (
      <>
        <Heading>Two counters</Heading>
        <Slots
          summary={{
            counts:
              s < 1.75
                ? {}
                : s < 2.75
                  ? { square: 1 }
                  : { square: 1, circle: 1 },
            removed: 0,
            event: "start",
            group: [],
          }}
        />
        {s > 1 && s < 3 && (
          <Shape
            kind={arriving}
            x={lerp(800, arriving === "square" ? 692 : 908, q)}
            y={lerp(230, 470, q)}
            size={66}
            opacity={1 - smooth((q - 0.75) / 0.25)}
          />
        )}
        <Text y={740} size={35} fill={muted}>
          match → increment · free slot → start at 1
        </Text>
      </>
    );
  } else if (scene === "cancel") {
    const q = smooth(s - 1),
      fade = 1 - smooth((q - 0.65) / 0.35);
    content = (
      <>
        <Heading>A new value. Both slots full.</Heading>
        <Slots
          summary={{ counts: {}, removed: 0, event: "start", group: [] }}
        />
        <g opacity={fade}>
          <Shape
            kind="square"
            x={lerp(692, 800, q)}
            y={lerp(470, 345, q)}
            size={65}
          />
          <Shape
            kind="circle"
            x={lerp(908, 800, q)}
            y={lerp(470, 345, q)}
            size={65}
          />
          <Shape kind="triangle" x={800} y={lerp(215, 345, q)} size={65} />
        </g>
        <Text y={700} size={50} fill={gold} opacity={q}>
          3 different values → remove one of each
        </Text>
        <Text y={780} size={35} fill={muted} opacity={smooth(s - 2)}>
          removed groups: 1
        </Text>
      </>
    );
  } else if (scene === "trace") {
    const p = Math.min(15, Math.max(0, s)),
      n = Math.min(14, Math.floor(p)),
      f = p - n,
      next = TWO[n + 1],
      settled = p >= 15 || f > 0.8,
      summary = TWO[Math.min(15, n + (settled ? 1 : 0))];
    content = (
      <>
        <Heading>One pass through the same fifteen shapes</Heading>
        <Sequence processed={n + (settled ? 1 : 0)} />
        <Slots summary={summary} />
        <Text y={700} fill={gold} size={43}>
          removed groups: {summary.removed}
        </Text>
        {p < 15 && next.event === "cancel" && (
          <g opacity={1 - smooth((f - 0.65) / 0.35)}>
            {next.group.map((kind, i) => (
              <Shape
                key={kind}
                kind={kind}
                x={lerp(620 + i * 180, 800, smooth(f))}
                y={lerp(i === 2 ? 280 : 410, 345, smooth(f))}
                size={56}
              />
            ))}
          </g>
        )}
        <Text y={790} size={28} fill={muted}>
          {p >= 15
            ? "summary: 5 squares + 1 circle"
            : "match · insert · or cancel three distinct values"}
        </Text>
      </>
    );
  } else if (scene === "bounds")
    content = (
      <>
        <Heading>The counter gives a lower bound</Heading>
        <Interval low={5} high={s < 2 ? 5 : 8} y={330} />
        {s > 2.5 && <Interval kind="circle" low={1} high={4} y={535} />}
        <g opacity={smooth(s - 3)}>
          <Shape kind="triangle" x={655} y={740} size={46} />
          <Shape kind="diamond" x={725} y={740} size={46} />
          <Text x={1000} y={740} size={37}>
            untracked: 0 to 3
          </Text>
        </g>
        <Text y={165} size={29} fill={muted}>
          at most one hidden copy per removed group
        </Text>
      </>
    );
  else if (scene === "budget")
    content = (
      <>
        <Heading>An error budget. Not a probability.</Heading>
        <Slots summary={TWO[15]} y={340} size={130} />
        <Text y={535} size={72} opacity={smooth(s - 1)}>
          15 = 6 + 3 × 3
        </Text>
        <Text y={620} size={31} fill={muted} opacity={smooth(s - 1)}>
          seen = survivors + group size × removed groups
        </Text>
        <Text y={760} size={64} fill={gold} opacity={smooth(s - 2)}>
          cₓ ≤ fₓ ≤ cₓ + D
        </Text>
      </>
    );
  else if (scene === "threshold")
    content = (
      <>
        <Heading>Surviving is not the same as qualifying</Heading>
        <Text y={220} size={45} fill={muted}>
          more than 15 / 3 = more than 5
        </Text>
        <Interval
          low={5}
          high={8}
          y={440}
          threshold={s > 1.5 ? 5 : undefined}
        />
        <Text y={710} size={53} fill={gold} opacity={smooth(s - 2)}>
          Could be 5. Could be 8.
        </Text>
      </>
    );
  else if (scene === "compare")
    content = (
      <>
        <Heading>More memory. The same stream.</Heading>
        <Sequence y={215} />
        <line x1={800} x2={800} y1={340} y2={790} stroke="#263243" />
        <Text x={410} y={370} size={37} fill={muted}>
          2 counters
        </Text>
        <Text x={1190} y={370} size={37} fill={muted}>
          3 counters
        </Text>
        <Slots summary={TWO[15]} x={410} y={505} size={120} />
        <Slots
          summary={s < 1.8 ? THREE[5] : s < 2.75 ? THREE[6] : THREE[15]}
          capacity={3}
          x={1190}
          y={505}
          size={110}
        />
        <Text x={410} y={650} size={32}>
          after 15 arrivals · D = 3
        </Text>
        <Text x={1190} y={650} size={28}>
          {s < 1.8
            ? "after 5 arrivals"
            : s < 2.75
              ? "after 6 arrivals · D = 1"
              : "after all 15 arrivals · D = 1"}
        </Text>
        {s > 1 && s < 2 && (
          <g opacity={1 - smooth((s - 1.65) / 0.35)}>
            {KINDS.map((kind, i) => (
              <Shape
                key={kind}
                kind={kind}
                x={lerp(1055 + i * 90, 1190, smooth(s - 1))}
                y={416}
                size={46}
              />
            ))}
          </g>
        )}
        <Text x={410} y={760} size={57} fill={muted}>
          5 ≤ count ≤ 8
        </Text>
        <Text x={1190} y={760} size={57} fill={gold} opacity={smooth(s - 2)}>
          6 ≤ count ≤ 7
        </Text>
      </>
    );
  else if (scene === "decide") {
    const q = clamp(s - 2),
      visited = Math.floor(q * 15),
      actual = STREAM.slice(0, visited).filter((k) => k === "square").length;
    content = (
      <>
        <Heading>Enough information to decide</Heading>
        <Interval
          low={6}
          high={7}
          y={340}
          threshold={5}
          exact={q > 0.99 ? 7 : undefined}
        />
        <Text y={540} size={48} fill={green} opacity={smooth(s - 1)}>
          certain: more than one third
        </Text>
        {s > 2 && (
          <>
            <Sequence processed={visited} y={660} reveal />
            <Text y={805} size={38} fill={gold}>
              verification pass · exact count: {actual}
            </Text>
          </>
        )}
      </>
    );
  } else if (scene === "general")
    content = (
      <>
        <Heading>Misra–Gries</Heading>
        <Text y={245} size={46}>
          m counters · cancel m + 1 distinct values
        </Text>
        <Text y={405} size={68} fill={gold} opacity={smooth(s - 1)}>
          maximum error ≤ N / (m + 1)
        </Text>
        <g opacity={smooth(s - 2)}>
          <Text x={390} y={575} size={35} anchor="end">
            9 counters
          </Text>
          <rect
            x={460}
            y={550}
            width={650}
            height={40}
            rx={8}
            fill={gold}
            opacity={0.7}
          />
          <Text x={1260} y={575} size={37}>
            ≤ 10% of N
          </Text>
          <Text x={390} y={690} size={35} anchor="end">
            99 counters
          </Text>
          <rect x={460} y={665} width={65} height={40} rx={8} fill={blue} />
          <Text x={1260} y={690} size={37}>
            ≤ 1% of N
          </Text>
          <Text y={800} size={30} fill={muted}>
            additive error · never a confidence percentage
          </Text>
        </g>
      </>
    );
  else
    content = (
      <>
        <Heading>A small summary. A useful guarantee.</Heading>
        <Interval low={6} high={7} y={415} />
        <Text y={650} size={47} fill={gold} opacity={smooth(s - 1)}>
          Remember the survivors.
        </Text>
        <Text y={725} size={40} fill={muted} opacity={smooth(s - 2)}>
          Account for what was removed.
        </Text>
      </>
    );
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
            <stop stopColor={blue} stopOpacity=".07" />
            <stop offset="1" stopColor="#000" stopOpacity="0" />
          </radialGradient>
        </defs>
        <rect width="1600" height="900" fill={`url(#mg-haze-${scene})`} />
        {content}
      </svg>
    </main>
  );
}
