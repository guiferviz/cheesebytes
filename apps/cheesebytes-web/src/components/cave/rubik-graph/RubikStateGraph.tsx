/**
 * RubikStateGraph.tsx
 *
 * Interactive D3 force-graph of pocket-cube (2×2×2) states.
 * Each node is a state index; edges are labelled with the move that connects
 * them.  The user picks a root index and a BFS depth, and the component
 * expands the graph on-the-fly.
 *
 * Nodes render as tiny SVG "unfolded cubes" when zoomed in (semantic zoom)
 * and as plain coloured circles when zoomed out.
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useEffect, useRef, useState, useCallback } from "react";
// @ts-expect-error no type declarations for d3
import * as d3 from "d3";

// ─── Pocket-cube constants ────────────────────────────────────────────────────

const N_ORIENTATIONS = 3 ** 6; // 729

const MOVES_PERM: Record<string, number[]> = {
  U: [3, 0, 1, 2, 4, 5, 6],
  F: [0, 1, 3, 4, 5, 2, 6],
  R: [0, 2, 5, 3, 4, 6, 1],
};
const MOVES_ORI: Record<string, number[]> = {
  U: [0, 0, 0, 0, 0, 0],
  F: [0, 0, 1, 2, 1, 2],
  R: [0, 1, 2, 0, 0, 1],
};

function invertPerm(p: number[]): number[] {
  const inv = new Array(p.length);
  for (let i = 0; i < p.length; i++) inv[p[i]] = i;
  return inv;
}
function composePerm(p2: number[], p1: number[]): number[] {
  return p2.map((i) => p1[i]);
}

// Expand moves: add inverses and double moves
for (const k of Object.keys(MOVES_PERM)) {
  MOVES_PERM[k + "'"] = invertPerm(MOVES_PERM[k]);
  MOVES_ORI[k + "'"] = [...MOVES_ORI[k]];
  MOVES_PERM[k + "2"] = composePerm(MOVES_PERM[k], MOVES_PERM[k]);
  MOVES_ORI[k + "2"] = [0, 0, 0, 0, 0, 0];
}
const MOVE_NAMES = Object.keys(MOVES_PERM);
const QTM_MOVES = MOVE_NAMES.filter((m) => !m.endsWith("2")); // quarter-turn only
const HTM_MOVES = MOVE_NAMES; // half-turn (includes doubles)
type Metric = "QTM" | "HTM";
const MOVES_BY_METRIC: Record<Metric, string[]> = {
  QTM: QTM_MOVES,
  HTM: HTM_MOVES,
};

function orderMoves(metric: Metric, moves: string[]): string[] {
  const moveSet = new Set(moves);
  return MOVES_BY_METRIC[metric].filter((move) => moveSet.has(move));
}

// ─── Index  ↔  (perm, ori) codec ─────────────────────────────────────────────

function splitIndex(index: number): [number, number] {
  return [Math.floor(index / N_ORIENTATIONS), index % N_ORIENTATIONS];
}
function combineIndex(permIdx: number, oriIdx: number): number {
  return permIdx * N_ORIENTATIONS + oriIdx;
}

function decodePerm(permIdx: number): number[] {
  const n = 7;
  const code = new Array(n).fill(0);
  for (let i = 2; i <= n; i++) {
    code[n - i] = permIdx % i;
    permIdx = Math.floor(permIdx / i);
  }
  const perm = [...code];
  for (let i = n - 1; i >= 0; i--)
    for (let j = i + 1; j < n; j++) if (perm[j] >= perm[i]) perm[j]++;
  return perm;
}
function encodePerm(perm: number[]): number {
  const p = [...perm];
  const n = p.length;
  for (let i = 0; i < n; i++)
    for (let j = i + 1; j < n; j++) if (p[j] > p[i]) p[j]--;
  let result = 0,
    fact = 1;
  const rev = [...p].reverse();
  for (let i = 0; i < rev.length; i++) {
    result += rev[i] * fact;
    fact *= i + 1;
  }
  return result;
}

function decodeOri(oriIdx: number): number[] {
  const r = new Array(7).fill(0);
  for (let i = 0; i < 6; i++) {
    r[i] = oriIdx % 3;
    oriIdx = Math.floor(oriIdx / 3);
  }
  r[6] = ((3 - (r.slice(0, 6).reduce((a, b) => a + b, 0) % 3)) % 3) % 3;
  return r;
}
function encodeOri(ori: number[]): number {
  let result = 0,
    pos = 1;
  for (let i = 0; i < 6; i++) {
    result += ori[i] * pos;
    pos *= 3;
  }
  return result;
}

function applyPerm<T>(state: T[], perm: number[]): T[] {
  return perm.map((i) => state[i]);
}

function applyMove(index: number, move: string): number {
  const [permIdx, oriIdx] = splitIndex(index);
  // perm
  const perm = decodePerm(permIdx);
  const newPerm = applyPerm(perm, MOVES_PERM[move]);
  const newPermIdx = encodePerm(newPerm);
  // ori
  const ori = decodeOri(oriIdx);
  const permutedOri = applyPerm(ori, MOVES_PERM[move]);
  const movOri = MOVES_ORI[move];
  const newOri = new Array(6);
  for (let i = 0; i < 6; i++) newOri[i] = (permutedOri[i] + movOri[i]) % 3;
  // 7th orientation is implicit
  const newOriIdx = encodeOri(newOri);
  return combineIndex(newPermIdx, newOriIdx);
}

// ─── Index → 24-sticker string (for drawing the unfolded cube) ───────────────
// Corners of a 2×2×2 in the order used by the integer encoding:
// corner 0 = ULB, 1 = URB, 2 = URF, 3 = ULF, 4 = DLF, 5 = DRF, 6 = DRB (7th = DLB is fixed)
// Each corner touches 3 faces.  The "base" orientation (ori=0) has the U/D
// sticker in its natural position.
//
// The 24-sticker string uses face order: U(4) L(4) F(4) R(4) B(4) D(4)
// Within each face, stickers are scanned TL→TR then BL→BR when viewed head-on.
//
// Corner → (face, stickerIndex) for each of its 3 orientations (twist 0,1,2):

const CORNER_FACETS: {
  [corner: number]: [string, number][];
} = {
  //           twist=0 (U/D)      twist=1 (CW)       twist=2 (CCW)
  0: [
    ["U", 0],
    ["L", 0],
    ["B", 1],
  ], // ULB
  1: [
    ["U", 1],
    ["B", 0],
    ["R", 1],
  ], // URB
  2: [
    ["U", 3],
    ["R", 0],
    ["F", 1],
  ], // URF
  3: [
    ["U", 2],
    ["F", 0],
    ["L", 1],
  ], // ULF
  4: [
    ["D", 0],
    ["L", 3],
    ["F", 2],
  ], // DLF
  5: [
    ["D", 1],
    ["F", 3],
    ["R", 2],
  ], // DRF
  6: [
    ["D", 3],
    ["R", 3],
    ["B", 2],
  ], // DRB
};
// The fixed corner (DLB = corner 7)
const FIXED_CORNER_FACETS: [string, number][] = [
  ["D", 2],
  ["B", 3],
  ["L", 2],
];

// Solved colours: U=B(blue), D=G(green), F=Y(yellow), B=W(white), R=O(orange), L=R(red)
const FACE_SOLVED_COLOR: Record<string, string> = {
  U: "#0033cc",
  D: "#00aa00",
  F: "#ffff00",
  B: "#dddddd",
  R: "#ff6600",
  L: "#cc0000",
};

function indexToStickers(index: number): string[] {
  const [permIdx, oriIdx] = splitIndex(index);
  const perm = decodePerm(permIdx);
  const ori = decodeOri(oriIdx);

  // 24 stickers: 6 faces × 4 stickers each
  const stickers = new Array(24).fill("#333");

  // Face → base offset in the 24-char string
  const faceOff: Record<string, number> = {
    U: 0,
    L: 4,
    F: 8,
    R: 12,
    B: 16,
    D: 20,
  };

  // For each mobile corner, figure out where its 3 facets end up.
  for (let slot = 0; slot < 7; slot++) {
    const cornerPiece = perm[slot]; // which physical corner sits here
    const twist = ori[slot]; // how it's twisted

    const slotFacets = CORNER_FACETS[slot]; // positions in this slot
    // The corner piece's home facets give us the colours
    const pieceFacets = CORNER_FACETS[cornerPiece];

    for (let f = 0; f < 3; f++) {
      // The facet at orientation offset (3+f-twist)%3 of the piece
      // lands in slot facet f.  (Minus because CW twist = index goes backwards.)
      const [srcFace] = pieceFacets[(3 + f - twist) % 3];
      const [dstFace, dstIdx] = slotFacets[f];
      stickers[faceOff[dstFace] + dstIdx] = FACE_SOLVED_COLOR[srcFace];
    }
  }

  // Fixed corner (DLB, corner 7) — always in place with twist 0
  for (let f = 0; f < 3; f++) {
    const [face, idx] = FIXED_CORNER_FACETS[f];
    // corner 7's home colours: D, B, L
    const homeColors = ["D", "B", "L"];
    stickers[faceOff[face] + idx] = FACE_SOLVED_COLOR[homeColors[f]];
  }

  return stickers;
}

// ─── BFS expansion ───────────────────────────────────────────────────────────

interface GraphNode {
  id: number;
  depth: number;
  x?: number;
  y?: number;
  fx?: number | null;
  fy?: number | null;
}
interface GraphEdge {
  source: number;
  target: number;
  move: string;
}

function bfsExpand(
  rootIndex: number,
  maxDepth: number,
  moveNames: string[],
): { nodes: GraphNode[]; edges: GraphEdge[] } {
  const visited = new Map<number, number>(); // index → depth
  const nodes: GraphNode[] = [];
  const edges: GraphEdge[] = [];
  const edgeSet = new Set<string>();

  const queue: [number, number][] = [[rootIndex, 0]];
  visited.set(rootIndex, 0);
  nodes.push({ id: rootIndex, depth: 0 });

  let head = 0;
  while (head < queue.length) {
    const [idx, depth] = queue[head++];
    if (depth >= maxDepth) continue;

    for (const m of moveNames) {
      const neighbor = applyMove(idx, m);

      if (!visited.has(neighbor)) {
        visited.set(neighbor, depth + 1);
        nodes.push({ id: neighbor, depth: depth + 1 });
        queue.push([neighbor, depth + 1]);
      }

      // Add edge (deduplicate by unordered pair + move)
      // But we want: if two different moves produce the same neighbor, show
      // both edges.  If the SAME move from different parents produces the same
      // target, that's fine too (multi-graph).  We key by source:target:move.
      const ek2 = idx + "→" + neighbor + ":" + m;
      if (!edgeSet.has(ek2)) {
        edgeSet.add(ek2);
        edges.push({ source: idx, target: neighbor, move: m });
      }
    }
  }
  return { nodes, edges };
}

// ─── Move colours (lighter/solid for clean arrow rendering) ──────────────────

const MOVE_COLOR: Record<string, string> = {
  U: "#5599ff",
  "U'": "#5599ff",
  U2: "#5599ff",
  F: "#cccc00",
  "F'": "#cccc00",
  F2: "#cccc00",
  R: "#ee8822",
  "R'": "#ee8822",
  R2: "#ee8822",
};

// ─── Mini 2D unfolded cube SVG ───────────────────────────────────────────────

function drawMiniCube(
  g: d3.Selection<SVGGElement, unknown, null, undefined>,
  stickers: string[],
  size: number,
  isDark: boolean,
) {
  const s = size / 4; // each sticker cell
  const gap = 0; // stickers are flush; separation is just the stroke

  // Face layout in the cross:
  //         [U]
  //    [L] [F] [R] [B]
  //         [D]
  const facePositions: Record<string, [number, number]> = {
    U: [1, 0],
    L: [0, 1],
    F: [1, 1],
    R: [2, 1],
    B: [3, 1],
    D: [1, 2],
  };
  const faceOrder = ["U", "L", "F", "R", "B", "D"];

  for (let fi = 0; fi < 6; fi++) {
    const face = faceOrder[fi];
    const [fx, fy] = facePositions[face];
    // The cross bounding box is 4×2s wide and 3×2s tall, so offset by full half-spans:
    const baseX = fx * 2 * s - 4 * s;
    const baseY = fy * 2 * s - 3 * s;

    for (let row = 0; row < 2; row++) {
      for (let col = 0; col < 2; col++) {
        const stickerIdx = fi * 4 + row * 2 + col;
        g.append("rect")
          .attr("x", baseX + col * s + gap)
          .attr("y", baseY + row * s + gap)
          .attr("width", s - 2 * gap)
          .attr("height", s - 2 * gap)
          .attr("rx", 0)
          .attr("fill", stickers[stickerIdx])
          .attr("stroke", isDark ? "#111" : "#bbb")
          .attr("stroke-width", 0.8);
      }
    }
  }
}

// ─── Fake-3D isometric cube SVG ──────────────────────────────────────────────
// Shows the 3 visible faces: U (top), F (front-left), R (front-right)
// Cube lives in [0,2]^3 world coords.  Iso projection:
//   px = (x - z) * s * √3/2
//   py = (x + z) * s * 0.5 - y * s    (SVG y grows down)
// The cube centre (1,1,1) projects to (0,0), so the g-element is centred.
//
// Sticker layout (same face offsets as drawMiniCube):
//   U face (y=2): sticker[0..3]  — TL=z↑x↑ → index order: [x∈[0,1],z∈[0,1]], [x∈[1,2],z∈[0,1]], [x∈[0,1],z∈[1,2]], [x∈[1,2],z∈[1,2]]
//   F face (z=2): sticker[8..11] — as seen from front: [x∈[0,1],y∈[1,2]], [x∈[1,2],y∈[1,2]], [x∈[0,1],y∈[0,1]], [x∈[1,2],y∈[0,1]]
//   R face (x=2): sticker[12..15]— as seen from right (left=z=2,right=z=0): [z∈[1,2],y∈[1,2]], [z∈[0,1],y∈[1,2]], [z∈[1,2],y∈[0,1]], [z∈[0,1],y∈[0,1]]

function drawIsoCube(
  g: d3.Selection<SVGGElement, unknown, null, undefined>,
  stickers: string[],
  size: number,
  isDark: boolean,
) {
  const ISO = Math.sqrt(3) / 2;
  const s = size / 4; // world unit → pixels (cube is 2 units → size/2 px total)

  const proj = (xw: number, yw: number, zw: number): [number, number] => [
    (xw - zw) * s * ISO,
    (xw + zw) * s * 0.5 - yw * s,
  ];

  const gap = 0.08; // fraction of cell size to leave as gap

  const drawSticker = (
    pts4: [
      [number, number, number],
      [number, number, number],
      [number, number, number],
      [number, number, number],
    ],
    color: string,
  ) => {
    const projected = pts4.map(([x, y, z]) => proj(x, y, z));
    const cx = projected.reduce((acc, p) => acc + p[0], 0) / 4;
    const cy = projected.reduce((acc, p) => acc + p[1], 0) / 4;
    const inset = projected.map(([px, py]) => [
      px + (cx - px) * gap,
      py + (cy - py) * gap,
    ]);
    g.append("polygon")
      .attr("points", inset.map((p) => p.join(",")).join(" "))
      .attr("fill", color)
      .attr("stroke", isDark ? "#111" : "#bbb")
      .attr("stroke-width", 0.5);
  };

  // U face (y=2) — 4 stickers, offsets 0–3
  // U[0]: x∈[0,1], z∈[0,1] → back-left;  U[1]: x∈[1,2], z∈[0,1] → back-right
  // U[2]: x∈[0,1], z∈[1,2] → front-left; U[3]: x∈[1,2], z∈[1,2] → front-right
  const faceU: [
    number,
    [
      [number, number, number],
      [number, number, number],
      [number, number, number],
      [number, number, number],
    ],
  ][] = [
    [
      0,
      [
        [0, 2, 0],
        [1, 2, 0],
        [1, 2, 1],
        [0, 2, 1],
      ],
    ],
    [
      1,
      [
        [1, 2, 0],
        [2, 2, 0],
        [2, 2, 1],
        [1, 2, 1],
      ],
    ],
    [
      2,
      [
        [0, 2, 1],
        [1, 2, 1],
        [1, 2, 2],
        [0, 2, 2],
      ],
    ],
    [
      3,
      [
        [1, 2, 1],
        [2, 2, 1],
        [2, 2, 2],
        [1, 2, 2],
      ],
    ],
  ];
  // R face (x=2) — stickers 12–15; left-in-net=z=2(front), right-in-net=z=0(back)
  // R[0]: z∈[1,2], y∈[1,2]; R[1]: z∈[0,1], y∈[1,2]; R[2]: z∈[1,2], y∈[0,1]; R[3]: z∈[0,1], y∈[0,1]
  const faceR: [
    number,
    [
      [number, number, number],
      [number, number, number],
      [number, number, number],
      [number, number, number],
    ],
  ][] = [
    [
      0,
      [
        [2, 2, 2],
        [2, 2, 1],
        [2, 1, 1],
        [2, 1, 2],
      ],
    ],
    [
      1,
      [
        [2, 2, 1],
        [2, 2, 0],
        [2, 1, 0],
        [2, 1, 1],
      ],
    ],
    [
      2,
      [
        [2, 1, 2],
        [2, 1, 1],
        [2, 0, 1],
        [2, 0, 2],
      ],
    ],
    [
      3,
      [
        [2, 1, 1],
        [2, 1, 0],
        [2, 0, 0],
        [2, 0, 1],
      ],
    ],
  ];
  // F face (z=2) — stickers 8–11; left=x=0, right=x=2
  // F[0]: x∈[0,1], y∈[1,2]; F[1]: x∈[1,2], y∈[1,2]; F[2]: x∈[0,1], y∈[0,1]; F[3]: x∈[1,2], y∈[0,1]
  const faceF: [
    number,
    [
      [number, number, number],
      [number, number, number],
      [number, number, number],
      [number, number, number],
    ],
  ][] = [
    [
      0,
      [
        [0, 2, 2],
        [1, 2, 2],
        [1, 1, 2],
        [0, 1, 2],
      ],
    ],
    [
      1,
      [
        [1, 2, 2],
        [2, 2, 2],
        [2, 1, 2],
        [1, 1, 2],
      ],
    ],
    [
      2,
      [
        [0, 1, 2],
        [1, 1, 2],
        [1, 0, 2],
        [0, 0, 2],
      ],
    ],
    [
      3,
      [
        [1, 1, 2],
        [2, 1, 2],
        [2, 0, 2],
        [1, 0, 2],
      ],
    ],
  ];

  // Draw order: U first, then R, then F (F is visually frontmost)
  for (const [idx, corners] of faceU) drawSticker(corners, stickers[0 + idx]);
  for (const [idx, corners] of faceR) drawSticker(corners, stickers[12 + idx]);
  for (const [idx, corners] of faceF) drawSticker(corners, stickers[8 + idx]);
}

// ─── React Component ─────────────────────────────────────────────────────────

interface Props {
  initialIndex?: number;
  initialDepth?: number;
  overflow?: boolean;
}

export default function RubikStateGraph({
  initialIndex = 0,
  initialDepth = 1,
  overflow = false,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const simRef = useRef<d3.Simulation<
    GraphNode,
    d3.SimulationLinkDatum<GraphNode>
  > | null>(null);

  // Auto-detect parent size
  const [size, setSize] = useState({ width: 1080, height: 680 });
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const { width, height } = entries[0].contentRect;
      if (width > 0 && height > 0) setSize({ width, height });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const { width, height } = size;

  const [rootIndex, setRootIndex] = useState(initialIndex);
  const [depth, setDepth] = useState(initialDepth);
  const [inputValue, setInputValue] = useState(String(initialIndex));
  const [metric, setMetric] = useState<Metric>("HTM");
  const [cubeView, setCubeView] = useState<"net" | "iso">("net");
  const [enabledMovesByMetric, setEnabledMovesByMetric] = useState<
    Record<Metric, string[]>
  >(() => ({
    QTM: [...QTM_MOVES],
    HTM: [...HTM_MOVES],
  }));

  // Collapsible settings
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [chargeStrength, setChargeStrength] = useState(-250);
  const [linkDistance, setLinkDistance] = useState(80);
  const [cubeThreshold, setCubeThreshold] = useState(0); // 0 = always show cube
  const [showIds, setShowIds] = useState(true);
  const [showLabels, setShowLabels] = useState(true);
  const [edgeBend, setEdgeBend] = useState(15);
  const [edgeWidth, setEdgeWidth] = useState(1.5);
  const [cubeSize, setCubeSize] = useState(32);
  const availableMoves = MOVES_BY_METRIC[metric];
  const activeMoveset = orderMoves(metric, enabledMovesByMetric[metric]);
  const activeMovesKey = activeMoveset.join("|");
  const activeMovesSet = new Set(activeMoveset);

  // ── Visibility controls (don't trigger graph rebuild) ────────────────
  const [visStep, setVisStep] = useState(depth);
  const [visHiddenMoves, setVisHiddenMoves] = useState<Set<string>>(
    () => new Set(),
  );

  // Refs for live settings (read by zoom/tick closures without triggering rebuild)
  const cubeThresholdRef = useRef(cubeThreshold);
  cubeThresholdRef.current = cubeThreshold;
  const containerGRef = useRef<any>(null);
  const linksRef = useRef<any[]>([]);
  const tickFnRef = useRef<(() => void) | null>(null);

  // ── Dark / light theme detection ──────────────────────────────────────
  const [isDark, setIsDark] = useState(
    () =>
      typeof document !== "undefined" &&
      document.documentElement.classList.contains("dark"),
  );
  useEffect(() => {
    const obs = new MutationObserver(() => {
      setIsDark(document.documentElement.classList.contains("dark"));
    });
    obs.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });
    return () => obs.disconnect();
  }, []);

  // Theme-dependent colors
  const themeColors = isDark
    ? {
        idFill: "#aaa",
        labelStroke: "#0a0a0a",
        stickerStroke: "#111",

        panelBg: "rgba(15,15,15,0.95)",
      }
    : {
        idFill: "#444",
        labelStroke: "#ffffff",
        stickerStroke: "#bbb",

        panelBg: "rgba(245,245,245,0.97)",
      };

  // Sticker cache to avoid recomputing
  const stickerCache = useRef(new Map<number, string[]>());
  const getStickers = useCallback((idx: number) => {
    if (!stickerCache.current.has(idx)) {
      stickerCache.current.set(idx, indexToStickers(idx));
    }
    return stickerCache.current.get(idx)!;
  }, []);

  // Clear sticker cache when cubeView changes (iso/net don't need different
  // sticker arrays, but we clear if the underlying formula changes)
  useEffect(() => {
    stickerCache.current.clear();
  }, []);

  // Build & render graph
  useEffect(() => {
    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const { nodes, edges } = bfsExpand(rootIndex, depth, activeMoveset);

    // D3 links need object references
    const nodeById = new Map(nodes.map((n) => [n.id, n]));
    const links = edges.map((e) => ({
      source: nodeById.get(e.source)!,
      target: nodeById.get(e.target)!,
      move: e.move,
    }));

    // All edges get a uniform slight bend.  Forward edges (A→B) and
    // reverse edges (B→A) naturally curve on OPPOSITE sides because the
    // perpendicular direction flips when source and target swap.
    for (const lk of links) {
      (lk as any).bendAmt = edgeBend;
    }
    linksRef.current = links;

    // Container with zoom
    const container = svg.append("g");
    containerGRef.current = container;
    const zoom = d3
      .zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 8])
      .on("zoom", (event: any) => {
        container.attr("transform", event.transform);
        // Semantic zoom: cubeThreshold=0 → always visible
        const k = event.transform.k;
        const ct = cubeThresholdRef.current;
        container
          .selectAll<SVGGElement, GraphNode>(".cube-detail")
          .attr("opacity", () =>
            ct === 0 ? 1 : Math.min(1, Math.max(0, (k - ct) * 5)),
          );
      });
    svg.call(zoom as any);

    // Edges: each edge is a group with a curve, an arrowhead polygon at
    // t=0.75, and a label near the arrowhead.
    const linkG = container
      .append("g")
      .attr("class", "links")
      .selectAll("g")
      .data(links)
      .enter()
      .append("g")
      .style("transition", "opacity 0.25s ease");

    // The curved line (solid color, no alpha)
    const linkLine = linkG
      .append("path")
      .attr("class", "edge-line")
      .attr("fill", "none")
      .attr("stroke", (d: any) => MOVE_COLOR[d.move] ?? "#888")
      .attr("stroke-width", edgeWidth);

    // Arrowhead triangle placed at t=0.65 of the bézier (solid, matching color)
    const linkArrow = linkG
      .append("polygon")
      .attr("fill", (d: any) => MOVE_COLOR[d.move] ?? "#888");

    // Labels in a separate group so they render ON TOP of ALL edges
    const linkLabelG = container
      .append("g")
      .attr("class", "link-labels")
      .selectAll("text")
      .data(links)
      .enter();

    const linkLabel = linkLabelG
      .append("text")
      .attr("class", "edge-label")
      .text((d: any) => d.move)
      .attr("font-size", 8)
      .attr("fill", (d: any) => MOVE_COLOR[d.move] ?? "#aaa")
      .attr("stroke", themeColors.labelStroke)
      .attr("stroke-width", 3)
      .style("paint-order", "stroke")
      .attr("text-anchor", "middle")
      .attr("font-family", "monospace")
      .attr("font-weight", "bold")
      .attr("opacity", showLabels ? 1 : 0)
      .style("transition", "opacity 0.25s ease");

    // Nodes
    const nodeG = container
      .append("g")
      .attr("class", "nodes")
      .selectAll<SVGGElement, GraphNode>("g")
      .data(nodes)
      .enter()
      .append("g")
      .attr("cursor", "pointer")
      .style("transition", "opacity 0.25s ease")
      .call(
        d3
          .drag<SVGGElement, GraphNode>()
          .on("start", (event: any, d: any) => {
            if (!event.active) simRef.current?.alphaTarget(0.3).restart();
            d.fx = d.x;
            d.fy = d.y;
          })
          .on("drag", (event: any, d: any) => {
            d.fx = event.x;
            d.fy = event.y;
          })
          .on("end", (event: any, d: any) => {
            if (!event.active) simRef.current?.alphaTarget(0);
            d.fx = null;
            d.fy = null;
          }) as any,
      );

    // Background rect for hit area + subtle node highlight
    nodeG
      .append("rect")
      .attr("x", -20)
      .attr("y", -20)
      .attr("width", 40)
      .attr("height", 40)
      .attr("fill", "transparent");

    // Mini cube
    nodeG.each(function (this: any, d: any) {
      const g = d3
        .select(this)
        .append("g")
        .attr("class", "cube-detail")
        .attr(
          "opacity",
          cubeThreshold === 0
            ? 1
            : Math.min(1, Math.max(0, (1 - cubeThreshold) * 5)),
        );
      const stickers = getStickers(d.id);
      if (cubeView === "iso") {
        drawIsoCube(g as any, stickers, cubeSize, isDark);
      } else {
        drawMiniCube(g as any, stickers, cubeSize, isDark);
      }

      // Draw a subtle highlight ring for root (larger for net, smaller for iso)
      if (d.depth === 0) {
        const ringR = cubeView === "iso" ? cubeSize * 0.7 : cubeSize * 1.3;
        g.append("circle")
          .attr("r", ringR)
          .attr("fill", "none")
          .attr("stroke", "#ff4444")
          .attr("stroke-width", 1.5)
          .attr("stroke-dasharray", "3,2");
      }
    });

    // Index label under node
    nodeG
      .append("text")
      .attr("class", "node-id")
      .text((d: any) => d.id)
      .attr("text-anchor", "middle")
      .attr("dy", 28)
      .attr("font-size", 7)
      .attr("fill", themeColors.idFill)
      .attr("font-family", "monospace")
      .attr("opacity", showIds ? 1 : 0);

    // Click to re-center on node
    nodeG.on("click", (_event: any, d: any) => {
      setRootIndex(d.id);
      setInputValue(String(d.id));
    });

    // Force simulation
    const sim = d3
      .forceSimulation(nodes)
      .force(
        "link",
        d3
          .forceLink(links)
          .id((d: any) => d.id)
          .distance(linkDistance),
      )
      .force("charge", d3.forceManyBody().strength(chargeStrength))
      .force("center", d3.forceCenter(width / 2, height / 2))
      .force("collision", d3.forceCollide(25));

    // Bézier helpers (shared by tick)
    const bezAt = (p0: number, p1: number, p2: number, t: number) =>
      (1 - t) * (1 - t) * p0 + 2 * (1 - t) * t * p1 + t * t * p2;
    const bezTan = (p0: number, p1: number, p2: number, t: number) =>
      2 * (1 - t) * (p1 - p0) + 2 * t * (p2 - p1);
    const ARROW_T = 0.65;
    const ARROW_SIZE = 5;

    function tick() {
      linkLine.attr("d", (d: any) => {
        const sx = d.source.x,
          sy = d.source.y;
        const tx = d.target.x,
          ty = d.target.y;
        const bend = (d.bendAmt as number) ?? 0;
        const ex = tx - sx,
          ey = ty - sy;
        const len = Math.sqrt(ex * ex + ey * ey) || 1;
        const cpx = (sx + tx) / 2 + (-ey / len) * bend;
        const cpy = (sy + ty) / 2 + (ex / len) * bend;
        return `M${sx},${sy}Q${cpx},${cpy} ${tx},${ty}`;
      });

      linkArrow.attr("points", (d: any) => {
        const sx = d.source.x,
          sy = d.source.y;
        const tx = d.target.x,
          ty = d.target.y;
        const bend = (d.bendAmt as number) ?? 0;
        const ex = tx - sx,
          ey = ty - sy;
        const len = Math.sqrt(ex * ex + ey * ey) || 1;
        const cpx = (sx + tx) / 2 + (-ey / len) * bend;
        const cpy = (sy + ty) / 2 + (ex / len) * bend;
        const ax = bezAt(sx, cpx, tx, ARROW_T);
        const ay = bezAt(sy, cpy, ty, ARROW_T);
        const tdx = bezTan(sx, cpx, tx, ARROW_T);
        const tdy = bezTan(sy, cpy, ty, ARROW_T);
        const tLen = Math.sqrt(tdx * tdx + tdy * tdy) || 1;
        const ux = tdx / tLen,
          uy = tdy / tLen;
        const nx = -uy,
          ny = ux;
        const tipX = ax + ux * ARROW_SIZE;
        const tipY = ay + uy * ARROW_SIZE;
        const b1x = ax - ux * ARROW_SIZE + nx * ARROW_SIZE * 1.0;
        const b1y = ay - uy * ARROW_SIZE + ny * ARROW_SIZE * 1.0;
        const b2x = ax - ux * ARROW_SIZE - nx * ARROW_SIZE * 1.0;
        const b2y = ay - uy * ARROW_SIZE - ny * ARROW_SIZE * 1.0;
        return `${tipX},${tipY} ${b1x},${b1y} ${b2x},${b2y}`;
      });

      linkLabel.each(function (this: any, d: any) {
        const sx = d.source.x,
          sy = d.source.y;
        const tx = d.target.x,
          ty = d.target.y;
        const bend = (d.bendAmt as number) ?? 0;
        const ex = tx - sx,
          ey = ty - sy;
        const len = Math.sqrt(ex * ex + ey * ey) || 1;
        const cpx = (sx + tx) / 2 + (-ey / len) * bend;
        const cpy = (sy + ty) / 2 + (ex / len) * bend;
        const lx = bezAt(sx, cpx, tx, ARROW_T);
        const ly = bezAt(sy, cpy, ty, ARROW_T);
        const tdx = bezTan(sx, cpx, tx, ARROW_T);
        const tdy = bezTan(sy, cpy, ty, ARROW_T);
        const tLen = Math.sqrt(tdx * tdx + tdy * tdy) || 1;
        const offx = -(-tdy / tLen) * 10;
        const offy = -(tdx / tLen) * 10;
        d3.select(this)
          .attr("x", lx + offx)
          .attr("y", ly + offy);
      });

      nodeG.attr("transform", (d: any) => `translate(${d.x},${d.y})`);
    }

    sim.on("tick", tick);
    simRef.current = sim;
    tickFnRef.current = tick;

    // Initial zoom to fit
    svg.call(zoom.transform as any, d3.zoomIdentity.translate(0, 0).scale(1));

    return () => {
      sim.stop();
    };
  }, [rootIndex, depth, width, height, getStickers, activeMovesKey]);

  // ── Force-params useEffect: adjusts simulation without rebuilding ──────
  useEffect(() => {
    const sim = simRef.current;
    if (!sim) return;
    sim.force("charge", d3.forceManyBody().strength(chargeStrength));
    const lf = sim.force("link") as any;
    if (lf) lf.distance(linkDistance);
    sim.alpha(1).alphaDecay(0.02).restart();
  }, [chargeStrength, linkDistance]);

  // ── Visual useEffect: updates appearance in-place (no graph rebuild) ───
  useEffect(() => {
    const container = containerGRef.current;
    if (!container) return;

    // Update edge bend in link data (tick reads d.bendAmt)
    for (const lk of linksRef.current) lk.bendAmt = edgeBend;

    container.selectAll(".edge-line").attr("stroke-width", edgeWidth);

    // Edge labels: visibility + theme stroke + ensure outline is always present
    container
      .selectAll(".edge-label")
      .attr("opacity", showLabels ? 1 : 0)
      .attr("stroke", isDark ? "#0a0a0a" : "#ffffff")
      .attr("stroke-width", 3)
      .style("paint-order", "stroke");

    // Node IDs: visibility + theme color + position
    container
      .selectAll(".node-id")
      .attr("opacity", showIds ? 1 : 0)
      .attr("fill", isDark ? "#aaa" : "#444")
      .attr("dy", cubeSize * 0.9);

    // Redraw cube SVGs with current cubeView / cubeSize / isDark
    container.selectAll(".cube-detail").each(function (this: any, d: any) {
      const g = d3.select(this);
      g.selectAll("*").remove();
      const stickers = getStickers(d.id);
      if (cubeView === "iso") {
        drawIsoCube(g as any, stickers, cubeSize, isDark);
      } else {
        drawMiniCube(g as any, stickers, cubeSize, isDark);
      }
      if (d.depth === 0) {
        const ringR = cubeView === "iso" ? cubeSize * 0.7 : cubeSize * 1.3;
        g.append("circle")
          .attr("r", ringR)
          .attr("fill", "none")
          .attr("stroke", "#ff4444")
          .attr("stroke-width", 1.5)
          .attr("stroke-dasharray", "3,2");
      }
    });

    // Cube opacity based on current zoom level
    const k = svgRef.current ? d3.zoomTransform(svgRef.current).k : 1;
    const ct = cubeThreshold;
    container
      .selectAll(".cube-detail")
      .attr("opacity", () =>
        ct === 0 ? 1 : Math.min(1, Math.max(0, (k - ct) * 5)),
      );

    // Re-render edges with updated bend values
    tickFnRef.current?.();
  }, [
    showIds,
    showLabels,
    cubeSize,
    cubeView,
    isDark,
    cubeThreshold,
    edgeBend,
    edgeWidth,
  ]);

  // ── Reset visibility when graph is rebuilt ──────────────────────────
  useEffect(() => {
    setVisStep(depth);
    setVisHiddenMoves(new Set());
  }, [depth, rootIndex, activeMovesKey]);

  // ── Visibility useEffect: BFS through visible edges only ───────────
  useEffect(() => {
    const container = containerGRef.current;
    if (!container) return;

    const effectiveStep = Math.min(visStep, depth);
    const links = linksRef.current;

    // Build directed adjacency from edges whose move is visible
    const adj = new Map<number, number[]>();
    for (const lk of links) {
      if (visHiddenMoves.has(lk.move)) continue;
      const sid = typeof lk.source === "object" ? lk.source.id : lk.source;
      const tid = typeof lk.target === "object" ? lk.target.id : lk.target;
      if (!adj.has(sid)) adj.set(sid, []);
      adj.get(sid)!.push(tid);
    }

    // BFS from root following only visible-move edges up to effectiveStep
    // Track each node's discovery depth so we know which edges were traversed
    const reachDepth = new Map<number, number>(); // nodeId → BFS depth
    const queue: [number, number][] = [[rootIndex, 0]];
    reachDepth.set(rootIndex, 0);
    let head = 0;
    while (head < queue.length) {
      const [nodeId, d] = queue[head++];
      if (d >= effectiveStep) continue;
      const neighbors = adj.get(nodeId);
      if (!neighbors) continue;
      for (const n of neighbors) {
        if (!reachDepth.has(n)) {
          reachDepth.set(n, d + 1);
          queue.push([n, d + 1]);
        }
      }
    }

    // Show/hide nodes
    container.selectAll(".nodes > g").each(function (this: any, d: any) {
      const vis = reachDepth.has(d.id);
      d3.select(this)
        .style("opacity", vis ? 1 : 0)
        .style("pointer-events", vis ? null : "none");
    });

    // Show/hide edge groups (line + arrow)
    // An edge src→tgt is visible only if:
    //  - the move isn't hidden
    //  - both endpoints are reachable
    //  - the source was reached early enough to emit the edge (depth < effectiveStep)
    container.selectAll(".links > g").each(function (this: any, d: any) {
      const sid = typeof d.source === "object" ? d.source.id : d.source;
      const tid = typeof d.target === "object" ? d.target.id : d.target;
      const sd = reachDepth.get(sid);
      const vis =
        sd !== undefined &&
        sd < effectiveStep &&
        reachDepth.has(tid) &&
        !visHiddenMoves.has(d.move);
      d3.select(this)
        .style("opacity", vis ? 1 : 0)
        .style("pointer-events", vis ? null : "none");
    });

    // Show/hide edge labels
    container.selectAll(".link-labels text").each(function (this: any, d: any) {
      const sid = typeof d.source === "object" ? d.source.id : d.source;
      const tid = typeof d.target === "object" ? d.target.id : d.target;
      const sd = reachDepth.get(sid);
      const vis =
        sd !== undefined &&
        sd < effectiveStep &&
        reachDepth.has(tid) &&
        !visHiddenMoves.has(d.move);
      d3.select(this)
        .style("opacity", vis ? 1 : 0)
        .style("pointer-events", vis ? null : "none");
    });
  }, [visStep, visHiddenMoves, depth, rootIndex, activeMovesKey]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseInt(inputValue, 10);
    if (!isNaN(val) && val >= 0) setRootIndex(val);
  };

  const setAllMoves = () => {
    setEnabledMovesByMetric((current) => ({
      ...current,
      [metric]: [...MOVES_BY_METRIC[metric]],
    }));
  };

  const clearMoves = () => {
    setEnabledMovesByMetric((current) => ({
      ...current,
      [metric]: [],
    }));
  };

  const toggleMove = (move: string) => {
    setEnabledMovesByMetric((current) => {
      const selectedMoves = current[metric];
      const nextMoves = selectedMoves.includes(move)
        ? selectedMoves.filter((item) => item !== move)
        : [...selectedMoves, move];

      return {
        ...current,
        [metric]: orderMoves(metric, nextMoves),
      };
    });
  };

  const toggleVisMove = (move: string) => {
    setVisHiddenMoves((prev) => {
      const next = new Set(prev);
      if (next.has(move)) next.delete(move);
      else next.add(move);
      return next;
    });
  };
  const showAllVisMoves = () => setVisHiddenMoves(new Set());
  const hideAllVisMoves = () => setVisHiddenMoves(new Set(activeMoveset));

  return (
    <div
      ref={containerRef}
      style={{
        width: "100%",
        height: "100%",
        position: "relative",
        background: "transparent",
        borderRadius: 0,
        overflow: overflow ? "visible" : "hidden",
      }}
    >
      {/* Gear button (top-right corner) */}
      <button
        onClick={() => setSettingsOpen((o) => !o)}
        title="Graph settings"
        style={{
          position: "absolute",
          top: 8,
          right: 8,
          zIndex: 10,
          background: settingsOpen
            ? isDark
              ? "#555"
              : "#ccc"
            : isDark
              ? "rgba(30,30,30,0.7)"
              : "rgba(230,230,230,0.7)",
          color: isDark ? "#ccc" : "#555",
          border: `1px solid ${isDark ? "#555" : "#bbb"}`,
          borderRadius: 6,
          padding: "4px 8px",
          cursor: "pointer",
          fontSize: 16,
          lineHeight: 1,
          backdropFilter: "blur(6px)",
        }}
      >
        ⚙
      </button>

      {/* ── Collapsible settings panel ────────────────────────── */}
      {settingsOpen && (
        <div
          style={{
            position: "absolute",
            top: 40,
            right: 8,
            zIndex: 20,
            background: themeColors.panelBg,
            border: `1px solid ${isDark ? "#444" : "#ccc"}`,
            borderRadius: 6,
            padding: "10px 14px",
            fontFamily: "monospace",
            fontSize: 11,
            color: isDark ? "#bbb" : "#555",
            display: "flex",
            flexDirection: "column",
            gap: 8,
            minWidth: 260,
            maxHeight: "80vh",
            overflowY: "auto",
          }}
        >
          {/* State input */}
          <form
            onSubmit={handleSubmit}
            style={{ display: "flex", gap: 6, alignItems: "center" }}
          >
            <label>State:</label>
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              style={{
                flex: 1,
                background: isDark ? "#222" : "#fff",
                color: isDark ? "#eee" : "#222",
                border: `1px solid ${isDark ? "#555" : "#bbb"}`,
                borderRadius: 4,
                padding: "2px 6px",
                fontFamily: "monospace",
                fontSize: 13,
              }}
            />
            <button
              type="submit"
              style={{
                background: isDark ? "#444" : "#ddd",
                color: isDark ? "#eee" : "#222",
                border: "none",
                borderRadius: 4,
                padding: "2px 8px",
                cursor: "pointer",
                fontSize: 12,
              }}
            >
              Go
            </button>
          </form>

          {/* Depth slider */}
          <label
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            Depth: {depth}
            <input
              type="range"
              min={0}
              max={10}
              value={depth}
              onChange={(e) => setDepth(Number(e.target.value))}
              style={{ width: 100, accentColor: "#ff8800" }}
            />
          </label>

          {/* Metric toggle */}
          <label
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            Metric
            <div style={{ display: "flex", gap: 0 }}>
              {(["QTM", "HTM"] as const).map((m) => (
                <button
                  key={m}
                  onClick={() => setMetric(m)}
                  style={{
                    background:
                      metric === m ? "#ff8800" : isDark ? "#333" : "#ddd",
                    color: metric === m ? "#000" : isDark ? "#aaa" : "#555",
                    border: `1px solid ${isDark ? "#555" : "#bbb"}`,
                    borderRadius: m === "QTM" ? "4px 0 0 4px" : "0 4px 4px 0",
                    padding: "2px 8px",
                    cursor: "pointer",
                    fontSize: 11,
                    fontFamily: "monospace",
                    fontWeight: metric === m ? "bold" : "normal",
                  }}
                >
                  {m}
                </button>
              ))}
            </div>
          </label>

          {/* Cube view toggle */}
          <label
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            Cube style
            <div style={{ display: "flex", gap: 0 }}>
              {(["net", "iso"] as const).map((v, i) => (
                <button
                  key={v}
                  onClick={() => setCubeView(v)}
                  style={{
                    background:
                      cubeView === v ? "#4488ff" : isDark ? "#333" : "#ddd",
                    color: cubeView === v ? "#000" : isDark ? "#aaa" : "#555",
                    border: `1px solid ${isDark ? "#555" : "#bbb"}`,
                    borderRadius: i === 0 ? "4px 0 0 4px" : "0 4px 4px 0",
                    padding: "2px 8px",
                    cursor: "pointer",
                    fontSize: 11,
                    fontFamily: "monospace",
                    fontWeight: cubeView === v ? "bold" : "normal",
                  }}
                >
                  {v === "net" ? "2D" : "3D"}
                </button>
              ))}
            </div>
          </label>

          <hr
            style={{
              border: "none",
              borderTop: `1px solid ${isDark ? "#444" : "#ccc"}`,
              margin: "2px 0",
            }}
          />

          {/* Advanced sliders */}
          <label
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            Charge: {chargeStrength}
            <input
              type="range"
              min={-600}
              max={-20}
              value={chargeStrength}
              onChange={(e) => setChargeStrength(Number(e.target.value))}
              style={{ width: 100, accentColor: "#ff8800" }}
            />
          </label>
          <label
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            Link dist: {linkDistance}
            <input
              type="range"
              min={20}
              max={200}
              value={linkDistance}
              onChange={(e) => setLinkDistance(Number(e.target.value))}
              style={{ width: 100, accentColor: "#ff8800" }}
            />
          </label>
          <label
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            Edge bend: {edgeBend}
            <input
              type="range"
              min={0}
              max={60}
              value={edgeBend}
              onChange={(e) => setEdgeBend(Number(e.target.value))}
              style={{ width: 100, accentColor: "#ff8800" }}
            />
          </label>
          <label
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            Edge width: {edgeWidth.toFixed(1)}
            <input
              type="range"
              min={0.5}
              max={6}
              step={0.5}
              value={edgeWidth}
              onChange={(e) => setEdgeWidth(Number(e.target.value))}
              style={{ width: 100, accentColor: "#ff8800" }}
            />
          </label>
          <label
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            Cube threshold:{" "}
            {cubeThreshold === 0 ? "always" : cubeThreshold.toFixed(1)}
            <input
              type="range"
              min={0}
              max={3}
              step={0.1}
              value={cubeThreshold}
              onChange={(e) => setCubeThreshold(Number(e.target.value))}
              style={{ width: 100, accentColor: "#4488ff" }}
            />
          </label>
          <label
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            Cube size: {cubeSize}
            <input
              type="range"
              min={8}
              max={80}
              step={2}
              value={cubeSize}
              onChange={(e) => setCubeSize(Number(e.target.value))}
              style={{ width: 100, accentColor: "#4488ff" }}
            />
          </label>
          <label
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            Show IDs
            <input
              type="checkbox"
              checked={showIds}
              onChange={(e) => setShowIds(e.target.checked)}
            />
          </label>
          <label
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            Show labels
            <input
              type="checkbox"
              checked={showLabels}
              onChange={(e) => setShowLabels(e.target.checked)}
            />
          </label>
          <details>
            <summary
              style={{
                cursor: "pointer",
                userSelect: "none",
                color: isDark ? "#ddd" : "#333",
              }}
            >
              Moves ({activeMoveset.length}/{availableMoves.length}) [{metric}]
            </summary>
            <div
              style={{
                marginTop: 8,
                display: "flex",
                flexDirection: "column",
                gap: 8,
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                <span style={{ fontSize: 10 }}>
                  The graph expands only with the checked moves.
                </span>
                <div style={{ display: "flex", gap: 6 }}>
                  <button
                    type="button"
                    onClick={setAllMoves}
                    style={{
                      background: isDark ? "#333" : "#ddd",
                      color: isDark ? "#ccc" : "#444",
                      border: `1px solid ${isDark ? "#555" : "#bbb"}`,
                      borderRadius: 4,
                      padding: "2px 6px",
                      cursor: "pointer",
                      fontSize: 10,
                      fontFamily: "monospace",
                    }}
                  >
                    all
                  </button>
                  <button
                    type="button"
                    onClick={clearMoves}
                    style={{
                      background: isDark ? "#333" : "#ddd",
                      color: isDark ? "#ccc" : "#444",
                      border: `1px solid ${isDark ? "#555" : "#bbb"}`,
                      borderRadius: 4,
                      padding: "2px 6px",
                      cursor: "pointer",
                      fontSize: 10,
                      fontFamily: "monospace",
                    }}
                  >
                    none
                  </button>
                </div>
              </div>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
                  gap: 6,
                }}
              >
                {availableMoves.map((move) => (
                  <label
                    key={move}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                      padding: "2px 6px",
                      borderRadius: 4,
                      background: activeMovesSet.has(move)
                        ? isDark
                          ? "rgba(255,136,0,0.16)"
                          : "rgba(255,136,0,0.12)"
                        : "transparent",
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={activeMovesSet.has(move)}
                      onChange={() => toggleMove(move)}
                    />
                    <span>{move}</span>
                  </label>
                ))}
              </div>
            </div>
          </details>

          <hr
            style={{
              border: "none",
              borderTop: `1px solid ${isDark ? "#444" : "#ccc"}`,
              margin: "2px 0",
            }}
          />

          {/* ── Visibility (no rebuild) ── */}
          <span
            style={{
              color: isDark ? "#ddd" : "#333",
              fontWeight: "bold",
              fontSize: 11,
            }}
          >
            Visibility
          </span>

          <label
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            Step: {Math.min(visStep, depth)}
            <input
              type="range"
              min={0}
              max={depth}
              value={Math.min(visStep, depth)}
              onChange={(e) => setVisStep(Number(e.target.value))}
              style={{ width: 100, accentColor: "#88cc44" }}
            />
          </label>

          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: 8,
            }}
          >
            <span style={{ fontSize: 10 }}>Edge visibility by move</span>
            <div style={{ display: "flex", gap: 6 }}>
              <button
                type="button"
                onClick={showAllVisMoves}
                style={{
                  background: isDark ? "#333" : "#ddd",
                  color: isDark ? "#ccc" : "#444",
                  border: `1px solid ${isDark ? "#555" : "#bbb"}`,
                  borderRadius: 4,
                  padding: "2px 6px",
                  cursor: "pointer",
                  fontSize: 10,
                  fontFamily: "monospace",
                }}
              >
                all
              </button>
              <button
                type="button"
                onClick={hideAllVisMoves}
                style={{
                  background: isDark ? "#333" : "#ddd",
                  color: isDark ? "#ccc" : "#444",
                  border: `1px solid ${isDark ? "#555" : "#bbb"}`,
                  borderRadius: 4,
                  padding: "2px 6px",
                  cursor: "pointer",
                  fontSize: 10,
                  fontFamily: "monospace",
                }}
              >
                none
              </button>
            </div>
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
              gap: 6,
            }}
          >
            {activeMoveset.map((move) => (
              <label
                key={move}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "2px 6px",
                  borderRadius: 4,
                  background: !visHiddenMoves.has(move)
                    ? isDark
                      ? "rgba(136,204,68,0.16)"
                      : "rgba(136,204,68,0.12)"
                    : "transparent",
                }}
              >
                <input
                  type="checkbox"
                  checked={!visHiddenMoves.has(move)}
                  onChange={() => toggleVisMove(move)}
                />
                <span>{move}</span>
              </label>
            ))}
          </div>
        </div>
      )}

      <svg
        ref={svgRef}
        width={width}
        height={height}
        style={{ display: "block", overflow: overflow ? "visible" : "hidden" }}
      />
    </div>
  );
}
