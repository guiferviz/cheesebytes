/**
 * MineStateGraphVisual — interactive radial BFS joint-state graph.
 *
 * Nodes radiate outward from the initial state at the center.
 * Each node is a tiny abstract grid card. Nodes fade in one-by-one
 * in BFS visit order; the camera starts zoomed-in on the root and
 * smoothly pulls back as more nodes are revealed.
 *
 * Above the graph sits the actual game map (MineMapViewer + sprites)
 * as a separate centered block. Clicking a node highlights it and
 * updates the game preview. Press f to toggle fullscreen mode, where
 * the map moves to the left and the graph fills the right side.
 *
 * Vim keys (whole visual is one focus zone):
 *   space → play/pause   ← → back   → → next   g → node view   b → backtracks   f → fullscreen   r → restart
 */

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import * as d3 from "d3";
import { useArticleMap } from "./article-store";
import { posKey } from "./types";
import type { MineMapState, Pos } from "./types";
import { MineMapViewer } from "./MineMapViewer";
import {
  ATLASES,
  MineGameSprite,
  frameToColRow,
  loadManifest,
  resolveAnimFrames,
} from "./MineGameSprite";
import {
  ATLAS_SRC,
  GOLD_SPECKS,
  TS,
  buildTilemapData,
  cellCenterX,
  cellCenterY,
} from "./mine-viewer-shared";
import type { VimModeAPI } from "../../utils/vim-mode";

// ── Colors ──────────────────────────────────────────────────────────

const PLAYER_FILL = "#4caf50";
const PLAYER_RING = "#1b5e20";
const MONSTER_FILL = "#a855f7";
const MONSTER_RING = "#4b1d6b";
const NODE_FILL_DARK = "#0f172a";
const NODE_FILL_LIGHT = "#fffbeb";
const NODE_STROKE_DARK = "rgba(254, 171, 2, 0.34)";
const NODE_STROKE_LIGHT = "rgba(147, 50, 9, 0.40)";
const NODE_STROKE_ROOT_DARK = "rgba(76, 175, 80, 0.72)";
const NODE_STROKE_ROOT_LIGHT = "rgba(56, 142, 60, 0.58)";
const NODE_STROKE_GOAL = "#f44336";
const EDGE_COLOR_DARK = "rgba(148, 163, 184, 0.65)";
const EDGE_COLOR_LIGHT = "rgba(71, 85, 105, 0.55)";
const BACKTRACK_EDGE_COLOR_DARK = "rgba(254, 171, 2, 0.78)";
const BACKTRACK_EDGE_COLOR_LIGHT = "rgba(210, 72, 5, 0.72)";
const EDGE_PLAN_COLOR = "#facc15";
const CELL_EMPTY_DARK = "rgba(148, 163, 184, 0.22)";
const CELL_EMPTY_LIGHT = "rgba(15, 23, 42, 0.10)";
const NODE_THUMBNAIL_SPRITE_SCALE = 1.4;

function baseNodeStroke(
  node: Pick<StateNode, "depth" | "isGoal">,
  isDark: boolean,
): string {
  if (node.isGoal) return NODE_STROKE_GOAL;
  if (node.depth === 0) {
    return isDark ? NODE_STROKE_ROOT_DARK : NODE_STROKE_ROOT_LIGHT;
  }
  return isDark ? NODE_STROKE_DARK : NODE_STROKE_LIGHT;
}

function baseNodeStrokeWidth(
  node: Pick<StateNode, "depth" | "isGoal">,
): number {
  if (node.isGoal) return 2;
  if (node.depth === 0) return 1.35;
  return 1;
}

// ── BFS helpers ─────────────────────────────────────────────────────

const MOVES: Array<[number, number]> = [
  [0, 1],
  [-1, 0],
  [1, 0],
  [0, -1],
];

function isOpen(map: MineMapState, r: number, c: number): boolean {
  if (r < 0 || r >= map.rows || c < 0 || c >= map.cols) return false;
  return !map.walls.has(posKey(r, c));
}

function bfsNextStep(map: MineMapState, start: Pos, target: Pos): Pos | null {
  if (start.r === target.r && start.c === target.c) return null;
  const tk = posKey(target.r, target.c);
  const parent = new Map<string, Pos | null>();
  parent.set(posKey(start.r, start.c), null);
  const q: Pos[] = [start];
  while (q.length > 0) {
    const cur = q.shift()!;
    if (posKey(cur.r, cur.c) === tk) {
      let step: Pos = cur;
      while (true) {
        const p = parent.get(posKey(step.r, step.c));
        if (!p) return step;
        if (p.r === start.r && p.c === start.c) return step;
        step = p;
      }
    }
    for (const [dr, dc] of MOVES) {
      const nr = cur.r + dr;
      const nc = cur.c + dc;
      if (!isOpen(map, nr, nc)) continue;
      const k = posKey(nr, nc);
      if (parent.has(k)) continue;
      parent.set(k, cur);
      q.push({ r: nr, c: nc });
    }
  }
  return null;
}

function bfsDistances(map: MineMapState, start: Pos): Map<string, number> {
  const dist = new Map<string, number>();
  dist.set(posKey(start.r, start.c), 0);
  const q: Pos[] = [start];
  while (q.length > 0) {
    const cur = q.shift()!;
    const d = dist.get(posKey(cur.r, cur.c))!;
    for (const [dr, dc] of MOVES) {
      const nr = cur.r + dr;
      const nc = cur.c + dc;
      if (!isOpen(map, nr, nc)) continue;
      const k = posKey(nr, nc);
      if (dist.has(k)) continue;
      dist.set(k, d + 1);
      q.push({ r: nr, c: nc });
    }
  }
  return dist;
}

function pickMonsterStart(map: MineMapState): Pos {
  const fromStart = bfsDistances(map, map.start);
  const fromExit = bfsDistances(map, map.exit);
  let best: Pos = { ...map.exit };
  let bestScore = -Infinity;
  for (let r = 0; r < map.rows; r += 1) {
    for (let c = 0; c < map.cols; c += 1) {
      if (map.walls.has(posKey(r, c))) continue;
      if (r === map.start.r && c === map.start.c) continue;
      if (r === map.exit.r && c === map.exit.c) continue;
      const k = posKey(r, c);
      const ds = fromStart.get(k);
      const de = fromExit.get(k);
      if (ds == null || de == null) continue;
      const score = ds * 2 + de;
      if (score > bestScore) {
        bestScore = score;
        best = { r, c };
      }
    }
  }
  return best;
}

// ── Joint-state graph ───────────────────────────────────────────────

interface StateNode {
  id: string;
  parent: string | null;
  player: Pos;
  monster: Pos;
  depth: number;
  order: number;
  onPlan: boolean;
  isGoal: boolean;
}

interface StateBacktrackEdge {
  id: string;
  sourceId: string;
  targetId: string;
}

interface StateGraph {
  nodes: StateNode[];
  backtrackEdges: StateBacktrackEdge[];
  planIds: Set<string>;
  goalId: string | null;
}

function jointKey(player: Pos, monster: Pos): string {
  return `${posKey(player.r, player.c)}|${posKey(monster.r, monster.c)}`;
}

/**
 * Joint-state BFS. **Stops immediately when it finds the goal** —
 * we do not keep expanding after the exit is reached.
 */
function buildStateGraph(
  map: MineMapState,
  monsterStart: Pos,
  maxNodes: number,
): StateGraph {
  const exitKey = posKey(map.exit.r, map.exit.c);
  const start: StateNode = {
    id: jointKey(map.start, monsterStart),
    parent: null,
    player: map.start,
    monster: monsterStart,
    depth: 0,
    order: 0,
    onPlan: false,
    isGoal: posKey(map.start.r, map.start.c) === exitKey,
  };

  const seen = new Map<string, StateNode>();
  seen.set(start.id, start);
  const order: StateNode[] = [start];
  const backtrackEdges: StateBacktrackEdge[] = [];
  const backtrackEdgeIds = new Set<string>();
  const queue: StateNode[] = [start];
  let head = 0;
  let goalId: string | null = start.isGoal ? start.id : null;

  // Stop as soon as goal is found.
  while (head < queue.length && order.length < maxNodes && goalId === null) {
    const node = queue[head++];

    for (const [dr, dc] of MOVES) {
      const nr = node.player.r + dr;
      const nc = node.player.c + dc;
      if (!isOpen(map, nr, nc)) continue;
      const newPlayer: Pos = { r: nr, c: nc };
      const mNext = bfsNextStep(map, node.monster, newPlayer) ?? node.monster;
      if (mNext.r === newPlayer.r && mNext.c === newPlayer.c) continue;

      const id = jointKey(newPlayer, mNext);
      const seenNode = seen.get(id);
      if (seenNode) {
        const edgeId = `${node.id}->${seenNode.id}`;
        if (!backtrackEdgeIds.has(edgeId)) {
          backtrackEdgeIds.add(edgeId);
          backtrackEdges.push({
            id: edgeId,
            sourceId: node.id,
            targetId: seenNode.id,
          });
        }
        continue;
      }

      const child: StateNode = {
        id,
        parent: node.id,
        player: newPlayer,
        monster: mNext,
        depth: node.depth + 1,
        order: order.length,
        onPlan: false,
        isGoal: posKey(newPlayer.r, newPlayer.c) === exitKey,
      };
      seen.set(id, child);
      order.push(child);
      queue.push(child);
      if (child.isGoal) {
        goalId = child.id;
        break;
      }
      if (order.length >= maxNodes) break;
    }
  }

  // Mark escape plan path.
  const planIds = new Set<string>();
  if (goalId) {
    let cur: string | null = goalId;
    while (cur) {
      planIds.add(cur);
      const n = seen.get(cur);
      if (!n) break;
      cur = n.parent;
    }
    for (const n of order) if (planIds.has(n.id)) n.onPlan = true;
  }

  return { nodes: order, backtrackEdges, planIds, goalId };
}

// ── Radial layout ───────────────────────────────────────────────────

interface LaidOutNode extends StateNode {
  x: number;
  y: number;
}

interface LaidOutBacktrackEdge extends StateBacktrackEdge {
  source: LaidOutNode;
  target: LaidOutNode;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

type GraphLayoutMode = "circular" | "tree" | "force";
type NodeVisualMode = "thumbnail" | "grid" | "numeric";

type ForceNode = LaidOutNode & d3.SimulationNodeDatum;

interface ForceLink extends d3.SimulationLinkDatum<ForceNode> {
  source: string | ForceNode;
  target: string | ForceNode;
  distance: number;
  strength: number;
}

function layoutRadial(
  nodes: StateNode[],
  nodeWidth: number,
  nodeHeight: number,
): LaidOutNode[] {
  if (nodes.length === 0) return [];
  if (nodes.length === 1) {
    return [{ ...nodes[0], x: 0, y: 0 }];
  }

  const root = d3
    .stratify<StateNode>()
    .id((d) => d.id)
    .parentId((d) => d.parent ?? "")(nodes.map((n) => ({ ...n })));

  const nodeSize = Math.max(nodeWidth, nodeHeight);
  const radius = nodeSize * 1.2;

  const treeLayout = d3
    .tree<StateNode>()
    .size([2 * Math.PI, radius * Math.max(1, root.height)])
    .separation((a, b) => {
      const base = a.parent === b.parent ? 1 : 1.5;
      // Give more room at deeper levels.
      return base / Math.max(1, a.depth * 0.6);
    });

  const laid = treeLayout(root);

  const out: LaidOutNode[] = [];
  const byId = new Map(nodes.map((n) => [n.id, n]));
  laid.each((d) => {
    const original = byId.get(d.id as string);
    if (!original) return;
    // Polar → Cartesian. d.x = angle, d.y = radius.
    const angle = d.x - Math.PI / 2;
    const r = d.y;
    out.push({
      ...original,
      x: Math.cos(angle) * r,
      y: Math.sin(angle) * r,
    });
  });
  out.sort((a, b) => a.order - b.order);
  return out;
}

function layoutTree(
  nodes: StateNode[],
  nodeWidth: number,
  nodeHeight: number,
): LaidOutNode[] {
  if (nodes.length === 0) return [];
  if (nodes.length === 1) {
    return [{ ...nodes[0], x: 0, y: 0 }];
  }

  const root = d3
    .stratify<StateNode>()
    .id((d) => d.id)
    .parentId((d) => d.parent ?? "")(nodes.map((n) => ({ ...n })));

  const treeLayout = d3
    .tree<StateNode>()
    .nodeSize([nodeWidth * 1.25, nodeHeight * 1.9])
    .separation((a, b) => (a.parent === b.parent ? 1 : 1.2));

  const laid = treeLayout(root);

  const out: LaidOutNode[] = [];
  const byId = new Map(nodes.map((n) => [n.id, n]));
  laid.each((d) => {
    const original = byId.get(d.id as string);
    if (!original) return;
    out.push({
      ...original,
      x: d.x,
      y: d.y,
    });
  });
  out.sort((a, b) => a.order - b.order);
  return out;
}

function layoutForce(
  nodes: StateNode[],
  backtrackEdges: StateBacktrackEdge[],
  nodeWidth: number,
  nodeHeight: number,
): LaidOutNode[] {
  if (nodes.length === 0) return [];
  if (nodes.length === 1) {
    return [{ ...nodes[0], x: 0, y: 0 }];
  }

  const seeded = layoutTree(nodes, nodeWidth, nodeHeight);
  const jitter = Math.max(nodeWidth, nodeHeight) * 0.18;
  const simNodes: ForceNode[] = seeded.map((node) => {
    const angle = node.order * 2.399963229728653;
    return {
      ...node,
      x: node.x + Math.cos(angle) * jitter,
      y: node.y + Math.sin(angle) * jitter,
    };
  });
  const radiusStep = Math.max(nodeWidth, nodeHeight) * 1.2;
  const links: ForceLink[] = [
    ...nodes
      .filter((node) => node.parent)
      .map((node) => ({
        source: node.parent!,
        target: node.id,
        distance: radiusStep * 0.82,
        strength: 0.34,
      })),
    ...backtrackEdges.map((edge) => ({
      source: edge.sourceId,
      target: edge.targetId,
      distance: radiusStep * 0.7,
      strength: 0.18,
    })),
  ];

  const root = simNodes.find((node) => node.depth === 0);
  if (root) {
    root.fx = 0;
    root.fy = 0;
  }

  const simulation = d3
    .forceSimulation<ForceNode>(simNodes)
    .force(
      "link",
      d3
        .forceLink<ForceNode, ForceLink>(links)
        .id((node) => node.id)
        .distance((link) => link.distance)
        .strength((link) => link.strength),
    )
    .force(
      "charge",
      d3
        .forceManyBody<ForceNode>()
        .strength(-Math.max(nodeWidth, nodeHeight) * 6.2),
    )
    .force(
      "collide",
      d3.forceCollide<ForceNode>(Math.max(nodeWidth, nodeHeight) * 0.78),
    )
    .force("center", d3.forceCenter<ForceNode>(0, 0))
    .force("x", d3.forceX<ForceNode>(0).strength(0.015))
    .force("y", d3.forceY<ForceNode>(0).strength(0.015))
    .stop();

  for (let tick = 0; tick < 360; tick += 1) {
    simulation.tick();
  }

  simulation.stop();
  simNodes.sort((a, b) => a.order - b.order);
  return simNodes.map((node) => ({
    ...node,
    x: node.x ?? 0,
    y: node.y ?? 0,
  }));
}

function cardBoundaryPoint(
  fromX: number,
  fromY: number,
  toX: number,
  toY: number,
  halfW: number,
  halfH: number,
): { x: number; y: number } {
  const dx = toX - fromX;
  const dy = toY - fromY;
  if (dx === 0 && dy === 0) return { x: fromX, y: fromY };

  const scale =
    1 /
    Math.max(
      Math.abs(dx) / Math.max(1, halfW),
      Math.abs(dy) / Math.max(1, halfH),
    );

  return {
    x: fromX + dx * scale,
    y: fromY + dy * scale,
  };
}

function lineBetweenCards(
  source: LaidOutNode,
  target: LaidOutNode,
  nodeWidth: number,
  nodeHeight: number,
): { x1: number; y1: number; x2: number; y2: number } {
  const halfW = nodeWidth / 2;
  const halfH = nodeHeight / 2;
  const start = cardBoundaryPoint(
    source.x,
    source.y,
    target.x,
    target.y,
    halfW,
    halfH,
  );
  const end = cardBoundaryPoint(
    target.x,
    target.y,
    source.x,
    source.y,
    halfW,
    halfH,
  );
  return { x1: start.x, y1: start.y, x2: end.x, y2: end.y };
}

// ── Mini-grid renderer ──────────────────────────────────────────────

interface MiniGridOpts {
  rows: number;
  cols: number;
  cell: number;
  player: Pos;
  monster: Pos;
  isDark: boolean;
}

function renderMiniGrid(
  group: d3.Selection<SVGGElement, unknown, null, undefined>,
  opts: MiniGridOpts,
): void {
  const { rows, cols, cell, player, monster, isDark } = opts;
  const emptyFill = isDark ? CELL_EMPTY_DARK : CELL_EMPTY_LIGHT;

  const cells: Array<{ r: number; c: number }> = [];
  for (let r = 0; r < rows; r += 1) {
    for (let c = 0; c < cols; c += 1) cells.push({ r, c });
  }
  group
    .selectAll("rect.cell")
    .data(cells)
    .enter()
    .append("rect")
    .attr("class", "cell")
    .attr("x", (d) => d.c * cell)
    .attr("y", (d) => d.r * cell)
    .attr("width", Math.max(1, cell - 0.6))
    .attr("height", Math.max(1, cell - 0.6))
    .attr("rx", Math.max(1, cell * 0.18))
    .attr("ry", Math.max(1, cell * 0.18))
    .attr("fill", emptyFill);

  // Monster.
  group
    .append("circle")
    .attr("cx", monster.c * cell + cell / 2)
    .attr("cy", monster.r * cell + cell / 2)
    .attr("r", cell * 0.36)
    .attr("fill", MONSTER_FILL)
    .attr("stroke", MONSTER_RING)
    .attr("stroke-width", Math.max(0.8, cell * 0.08));

  // Player.
  group
    .append("circle")
    .attr("cx", player.c * cell + cell / 2)
    .attr("cy", player.r * cell + cell / 2)
    .attr("r", cell * 0.32)
    .attr("fill", PLAYER_FILL)
    .attr("stroke", PLAYER_RING)
    .attr("stroke-width", Math.max(0.6, cell * 0.07));
}

interface NumericStateOpts {
  rows: number;
  cols: number;
  cell: number;
  player: Pos;
  monster: Pos;
}

function renderNumericState(
  group: d3.Selection<SVGGElement, unknown, null, undefined>,
  opts: NumericStateOpts,
): void {
  const { rows, cols, cell, player, monster } = opts;
  const innerWidth = cols * cell;
  const innerHeight = rows * cell;
  const tupleFontSize = Math.max(10, Math.min(16, innerWidth / 5));
  const tupleGap = Math.max(12, tupleFontSize * 1.2);
  const centerY = innerHeight / 2 + Math.max(5, tupleFontSize * 0.35);

  const entries = [
    { pos: player, fill: PLAYER_FILL, y: centerY - tupleGap / 2 },
    { pos: monster, fill: MONSTER_FILL, y: centerY + tupleGap / 2 },
  ];

  group
    .selectAll("text.state-tuple")
    .data(entries)
    .enter()
    .append("text")
    .attr("class", "state-tuple")
    .attr("x", innerWidth / 2)
    .attr("y", (d) => d.y)
    .attr("text-anchor", "middle")
    .attr("dominant-baseline", "central")
    .attr("font-family", "monospace")
    .attr("font-size", tupleFontSize)
    .attr("font-weight", 700)
    .attr("fill", (d) => d.fill)
    .text((d) => `(${d.pos.r}, ${d.pos.c})`);
}

const imageCache = new Map<string, Promise<HTMLImageElement>>();

function loadImage(src: string): Promise<HTMLImageElement> {
  let cached = imageCache.get(src);
  if (cached) return cached;

  cached = new Promise((resolve, reject) => {
    const img = new Image();
    img.decoding = "async";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Failed to load image: ${src}`));
    img.src = src;
  });
  imageCache.set(src, cached);
  return cached;
}

function colorNumberToCss(color: number): string {
  return `#${color.toString(16).padStart(6, "0")}`;
}

function drawExitMarker(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
): void {
  ctx.fillStyle = "#f44336";
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#ffffff";
  ctx.font = `bold ${Math.max(5, radius * 1.4)}px monospace`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("E", x, y + 0.5);
}

function drawStaticSprite(
  ctx: CanvasRenderingContext2D,
  image: HTMLImageElement,
  atlas: (typeof ATLASES)[keyof typeof ATLASES],
  frameKey: string,
  manifest: Awaited<ReturnType<typeof loadManifest>>,
  cellPx: number,
  pos: Pos,
): void {
  if (!frameKey) return;
  const [fc, fr] = frameToColRow(manifest, frameKey, atlas);
  const size = cellPx * atlas.cellScale * NODE_THUMBNAIL_SPRITE_SCALE;
  const x = (pos.c + 0.5) * cellPx - size / 2;
  const y = (pos.r + 0.5) * cellPx - size / 2;
  ctx.drawImage(
    image,
    fc * atlas.frameW,
    fr * atlas.frameH,
    atlas.frameW,
    atlas.frameH,
    x,
    y,
    size,
    size,
  );
}

function renderStaticNodeThumbnail(
  node: Pick<StateNode, "id" | "player" | "monster">,
  map: MineMapState,
  cellPx: number,
  baseCanvas: HTMLCanvasElement,
  minerImage: HTMLImageElement,
  monsterImage: HTMLImageElement,
  minerFrameKey: string,
  monsterFrameKey: string,
  minerManifest: Awaited<ReturnType<typeof loadManifest>>,
  monsterManifest: Awaited<ReturnType<typeof loadManifest>>,
): string | null {
  const width = Math.max(1, Math.round(map.cols * cellPx));
  const height = Math.max(1, Math.round(map.rows * cellPx));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  ctx.imageSmoothingEnabled = false;

  ctx.drawImage(baseCanvas, 0, 0);
  drawStaticSprite(
    ctx,
    minerImage,
    ATLASES.miner,
    minerFrameKey,
    minerManifest,
    cellPx,
    node.player,
  );
  drawStaticSprite(
    ctx,
    monsterImage,
    ATLASES.monster,
    monsterFrameKey,
    monsterManifest,
    cellPx,
    node.monster,
  );

  return canvas.toDataURL("image/png");
}

function createBaseThumbnailCanvas(
  map: MineMapState,
  cellPx: number,
  isDark: boolean,
  terrainImage: HTMLImageElement,
): HTMLCanvasElement {
  const width = Math.max(1, Math.round(map.cols * cellPx));
  const height = Math.max(1, Math.round(map.rows * cellPx));
  const worldScale = cellPx / (2 * TS);
  const tilePx = TS * worldScale;
  const atlasCols = Math.max(1, Math.floor(terrainImage.naturalWidth / TS));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext("2d");
  if (!ctx) return canvas;
  ctx.imageSmoothingEnabled = false;
  ctx.fillStyle = isDark ? "#05070a" : "#fff7ed";
  ctx.fillRect(0, 0, width, height);

  const tileData = buildTilemapData(map);
  for (let row = 0; row < tileData.length; row += 1) {
    for (let col = 0; col < tileData[row].length; col += 1) {
      const tileIdx = tileData[row][col];
      if (tileIdx < 0) continue;
      const sx = (tileIdx % atlasCols) * TS;
      const sy = Math.floor(tileIdx / atlasCols) * TS;
      ctx.drawImage(
        terrainImage,
        sx,
        sy,
        TS,
        TS,
        col * tilePx,
        row * tilePx,
        tilePx,
        tilePx,
      );
    }
  }

  for (let r = 0; r < map.rows; r += 1) {
    for (let c = 0; c < map.cols; c += 1) {
      if (map.walls.has(posKey(r, c))) continue;
      const x = cellCenterX(c) * worldScale;
      const y = cellCenterY(r) * worldScale;
      for (const speck of GOLD_SPECKS) {
        ctx.fillStyle = colorNumberToCss(speck.color);
        ctx.globalAlpha = speck.alpha;
        ctx.beginPath();
        ctx.arc(
          x + speck.dx * worldScale,
          y + speck.dy * worldScale,
          Math.max(0.45, speck.radius * worldScale),
          0,
          Math.PI * 2,
        );
        ctx.fill();
      }
    }
  }
  ctx.globalAlpha = 1;

  drawExitMarker(
    ctx,
    cellCenterX(map.exit.c) * worldScale,
    cellCenterY(map.exit.r) * worldScale,
    Math.max(2.5, TS * 0.55 * worldScale),
  );

  return canvas;
}

// ── HUD styling ─────────────────────────────────────────────────────

const HUD = {
  bg: "var(--goldmine-hud-bg)",
  border: "var(--goldmine-hud-border)",
  text: "var(--goldmine-hud-text)",
  muted: "var(--goldmine-hud-muted)",
  accent: "var(--goldmine-hud-accent)",
  btnBg: "var(--goldmine-hud-btn-bg)",
  activeBg: "var(--goldmine-hud-active-bg)",
  activeText: "var(--goldmine-hud-active-text)",
};

const VIM_MODE_ID = "mine-state-graph";
const GRAPH_HEIGHT = 420;

// ── Component ───────────────────────────────────────────────────────

interface Props {
  maxNodes?: number;
  fps?: number;
}

export const MineStateGraphVisual: React.FC<Props> = ({
  maxNodes = 80,
  fps = 3,
}) => {
  const map = useArticleMap();
  const [maxNodeLimit, setMaxNodeLimit] = useState(maxNodes);
  const monsterStart = useMemo(
    () => (map.monsterStart ? { ...map.monsterStart } : pickMonsterStart(map)),
    [map],
  );

  const graph = useMemo(
    () => buildStateGraph(map, monsterStart, maxNodeLimit),
    [map, monsterStart, maxNodeLimit],
  );

  // Node sizing.
  const cell = useMemo(() => {
    const longest = Math.max(map.rows, map.cols);
    return Math.max(4, Math.min(9, Math.floor(60 / longest)));
  }, [map.rows, map.cols]);
  const thumbnailCell = useMemo(() => Math.max(cell * 4, 24), [cell]);

  const padding = 8;
  const nodeWidth = cell * map.cols + padding * 2;
  const nodeHeight = cell * map.rows + padding * 2;

  const [layoutMode, setLayoutMode] = useState<GraphLayoutMode>("circular");
  const [nodeVisualMode, setNodeVisualMode] =
    useState<NodeVisualMode>("thumbnail");
  const [showBacktracks, setShowBacktracks] = useState(false);

  const laidOut = useMemo(
    () =>
      layoutMode === "circular"
        ? layoutRadial(graph.nodes, nodeWidth, nodeHeight)
        : layoutMode === "tree"
          ? layoutTree(graph.nodes, nodeWidth, nodeHeight)
          : layoutForce(
              graph.nodes,
              graph.backtrackEdges,
              nodeWidth,
              nodeHeight,
            ),
    [graph.nodes, graph.backtrackEdges, layoutMode, nodeWidth, nodeHeight],
  );

  // ── State ─────────────────────────────────────────────────────

  const [revealed, setRevealed] = useState(1);
  const [playing, setPlaying] = useState(false);
  const [armed, setArmed] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isDark, setIsDark] = useState(
    () =>
      typeof document !== "undefined" &&
      document.documentElement.classList.contains("dark"),
  );

  // The state shown in the game preview (defaults to root).
  const [previewNode, setPreviewNode] = useState<StateNode>(
    () => graph.nodes[0],
  );

  // Currently selected (clicked) node id — for highlight ring.
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [nodeThumbnailUrls, setNodeThumbnailUrls] = useState<
    Record<string, string>
  >({});

  // The map keeps the original S / M markers; the moving sprites show the current state.
  const previewMapState = useMemo((): MineMapState => {
    return {
      ...map,
      monsterStart,
    };
  }, [map, monsterStart]);

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

  useEffect(() => {
    if (typeof window === "undefined") return;

    let cancelled = false;
    setNodeThumbnailUrls({});

    const generate = async () => {
      try {
        const [
          terrainImage,
          minerImage,
          monsterImage,
          minerManifest,
          monsterManifest,
        ] = await Promise.all([
          loadImage(ATLAS_SRC),
          loadImage(ATLASES.miner.src),
          loadImage(ATLASES.monster.src),
          loadManifest(ATLASES.miner.manifestSrc),
          loadManifest(ATLASES.monster.manifestSrc),
        ]);

        if (cancelled) return;

        const minerFrameKey =
          resolveAnimFrames(minerManifest, ATLASES.miner, "idle", "south")
            .frames[0] ?? "";
        const monsterFrameKey =
          resolveAnimFrames(monsterManifest, ATLASES.monster, "idle", "south")
            .frames[0] ?? "";

        const baseCanvas = createBaseThumbnailCanvas(
          map,
          thumbnailCell,
          isDark,
          terrainImage,
        );

        const nextUrls: Record<string, string> = {};
        for (const node of graph.nodes) {
          const url = renderStaticNodeThumbnail(
            node,
            map,
            thumbnailCell,
            baseCanvas,
            minerImage,
            monsterImage,
            minerFrameKey,
            monsterFrameKey,
            minerManifest,
            monsterManifest,
          );
          if (url) nextUrls[node.id] = url;
        }

        if (!cancelled) {
          setNodeThumbnailUrls(nextUrls);
        }
      } catch (error) {
        if (!cancelled) {
          console.error("Failed to generate mine graph thumbnails", error);
          setNodeThumbnailUrls({});
        }
      }
    };

    void generate();
    return () => {
      cancelled = true;
    };
  }, [graph.nodes, map, thumbnailCell, isDark]);

  // Reset on graph change.
  useEffect(() => {
    setRevealed(1);
    setPreviewNode(graph.nodes[0]);
    setSelectedId(null);
    setPlaying(false);
  }, [graph]);

  const total = laidOut.length;
  const showPlan = graph.goalId !== null && revealed >= total;

  const addNodeBudget = useCallback(() => {
    setMaxNodeLimit((n) => n + 10);
  }, []);

  const removeNodeBudget = useCallback(() => {
    setMaxNodeLimit((n) => Math.max(10, n - 10));
  }, []);

  const toggleLayoutMode = useCallback(() => {
    setLayoutMode((mode) => {
      if (mode === "circular") return "tree";
      if (mode === "tree") return "force";
      return "circular";
    });
  }, []);
  const forceShowsBacktracks = layoutMode === "force";

  const toggleNodeVisualMode = useCallback(() => {
    setNodeVisualMode((mode) => {
      if (mode === "thumbnail") return "grid";
      if (mode === "grid") return "numeric";
      return "thumbnail";
    });
  }, []);

  const toggleBacktracks = useCallback(() => {
    setShowBacktracks((show) => !show);
  }, []);

  const stepBack = useCallback(
    () => setRevealed((n) => Math.max(1, n - 1)),
    [],
  );
  const stepForward = useCallback(
    () => setRevealed((n) => Math.min(total, n + 1)),
    [total],
  );
  const restart = useCallback(() => {
    setRevealed(1);
    setPreviewNode(graph.nodes[0]);
    setSelectedId(null);
    setPlaying(false);
  }, [graph.nodes]);

  const triggerButtonAction = useCallback(
    (action: () => void) => (event: React.PointerEvent<HTMLButtonElement>) => {
      event.preventDefault();
      action();
    },
    [],
  );

  // Auto-play.
  useEffect(() => {
    if (!playing) return;
    const id = window.setInterval(
      () => {
        setRevealed((n) => {
          if (n >= total) {
            setPlaying(false);
            return n;
          }
          return n + 1;
        });
      },
      Math.max(60, Math.round(1000 / fps)),
    );
    return () => window.clearInterval(id);
  }, [playing, total, fps]);

  // ── Refs ──────────────────────────────────────────────────────

  const rootRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const armedRef = useRef(false);
  const zoomRef = useRef<d3.ZoomBehavior<SVGSVGElement, unknown> | null>(null);
  const backtrackMarkerIdRef = useRef(
    `mine-state-backtrack-arrow-${Math.random().toString(36).slice(2)}`,
  );
  const [containerWidth, setContainerWidth] = useState(720);
  const [containerHeight, setContainerHeight] = useState(GRAPH_HEIGHT);

  useEffect(() => {
    armedRef.current = armed;
  }, [armed]);

  useEffect(() => {
    const syncFullscreen = () => {
      const root = rootRef.current;
      setIsFullscreen(root != null && document.fullscreenElement === root);
    };

    syncFullscreen();
    document.addEventListener("fullscreenchange", syncFullscreen);
    return () =>
      document.removeEventListener("fullscreenchange", syncFullscreen);
  }, []);

  const toggleFullscreen = useCallback(() => {
    const root = rootRef.current;
    if (!root) return;

    if (document.fullscreenElement === root) {
      void document.exitFullscreen();
      return;
    }

    if (!document.fullscreenElement) {
      void root.requestFullscreen();
    }
  }, []);

  // Track graph viewport size.
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const updateSize = () => {
      const rect = el.getBoundingClientRect();
      setContainerWidth(Math.max(320, Math.round(rect.width)));
      setContainerHeight(Math.max(320, Math.round(rect.height)));
    };
    const ro = new ResizeObserver(() => {
      updateSize();
    });
    ro.observe(el);
    updateSize();
    return () => ro.disconnect();
  }, []);

  // ── Compute the bounding box of *revealed* nodes ─────────────

  const revealedBBox = useMemo(() => {
    const visible = laidOut.filter((n) => n.order < revealed);
    if (visible.length === 0) {
      return { cx: 0, cy: 0, halfW: nodeWidth, halfH: nodeHeight };
    }
    let minX = Infinity,
      maxX = -Infinity,
      minY = Infinity,
      maxY = -Infinity;
    for (const n of visible) {
      if (n.x - nodeWidth / 2 < minX) minX = n.x - nodeWidth / 2;
      if (n.x + nodeWidth / 2 > maxX) maxX = n.x + nodeWidth / 2;
      if (n.y - nodeHeight / 2 < minY) minY = n.y - nodeHeight / 2;
      if (n.y + nodeHeight / 2 > maxY) maxY = n.y + nodeHeight / 2;
    }
    const m = nodeWidth * 0.6; // margin
    return {
      cx: (minX + maxX) / 2,
      cy: (minY + maxY) / 2,
      halfW: (maxX - minX) / 2 + m,
      halfH: (maxY - minY) / 2 + m,
    };
  }, [laidOut, revealed, nodeWidth, nodeHeight]);

  // Transform that fits the revealed bounding box into the viewport.
  const revealedTransform = useCallback((): d3.ZoomTransform => {
    const vw = containerWidth;
    const vh = containerHeight;
    const bw = Math.max(1, revealedBBox.halfW * 2);
    const bh = Math.max(1, revealedBBox.halfH * 2);
    const scale = Math.min(vw / bw, vh / bh, 3.5);
    const tx = vw / 2 - revealedBBox.cx * scale;
    const ty = vh / 2 - revealedBBox.cy * scale;
    return d3.zoomIdentity.translate(tx, ty).scale(scale);
  }, [containerHeight, containerWidth, revealedBBox]);

  // ── D3: draw once ─────────────────────────────────────────────

  useEffect(() => {
    const svgEl = svgRef.current;
    if (!svgEl) return;
    const svg = d3.select<SVGSVGElement, unknown>(svgEl);
    svg.selectAll("*").remove();
    svg.style("display", "block").style("cursor", "grab");

    const backtrackColor = isDark
      ? BACKTRACK_EDGE_COLOR_DARK
      : BACKTRACK_EDGE_COLOR_LIGHT;
    const showBacktrackEdges = forceShowsBacktracks || showBacktracks;

    svg
      .append("defs")
      .append("marker")
      .attr("id", backtrackMarkerIdRef.current)
      .attr("viewBox", "0 0 10 10")
      .attr("refX", 8)
      .attr("refY", 5)
      .attr("markerWidth", 6)
      .attr("markerHeight", 6)
      .attr("orient", "auto")
      .append("path")
      .attr("d", "M 0 0 L 10 5 L 0 10 z")
      .attr("fill", backtrackColor);

    const view = svg.append("g").attr("class", "view");
    const edgesLayer = view.append("g").attr("class", "edges");
    const backtracksLayer = view.append("g").attr("class", "backtracks");
    const nodesLayer = view.append("g").attr("class", "nodes");

    const edgeColor = isDark ? EDGE_COLOR_DARK : EDGE_COLOR_LIGHT;
    const backtrackStroke = forceShowsBacktracks ? edgeColor : backtrackColor;
    const backtrackStrokeWidth = forceShowsBacktracks ? 1.4 : 1.6;
    const backtrackDashArray = forceShowsBacktracks ? null : "5 4";
    const backtrackMarkerEnd = forceShowsBacktracks
      ? null
      : `url(#${backtrackMarkerIdRef.current})`;
    const backtrackVisibleOpacity = forceShowsBacktracks ? 1 : 0.95;
    const cardFill = isDark ? NODE_FILL_DARK : NODE_FILL_LIGHT;
    const labelColor = isDark
      ? "rgba(226, 232, 240, 0.7)"
      : "rgba(51, 65, 85, 0.7)";

    const nodeById = new Map(laidOut.map((n) => [n.id, n]));
    const laidOutBacktracks: LaidOutBacktrackEdge[] =
      graph.backtrackEdges.flatMap((edge) => {
        const source = nodeById.get(edge.sourceId);
        const target = nodeById.get(edge.targetId);
        if (!source || !target) return [];
        return [
          {
            ...edge,
            source,
            target,
            ...lineBetweenCards(source, target, nodeWidth, nodeHeight),
          },
        ];
      });

    // Edges.
    edgesLayer
      .selectAll("line.edge")
      .data(laidOut.filter((n) => n.parent))
      .enter()
      .append("line")
      .attr("class", "edge")
      .attr("data-id", (d) => d.id)
      .attr("stroke", (d) =>
        showPlan && d.onPlan && d.order < revealed
          ? EDGE_PLAN_COLOR
          : edgeColor,
      )
      .attr("stroke-width", (d) =>
        showPlan && d.onPlan && d.order < revealed ? 2 : 1.4,
      )
      .attr("opacity", (d) => (d.order < revealed ? 1 : 0))
      .attr("x1", (d) => nodeById.get(d.parent!)?.x ?? 0)
      .attr("y1", (d) => nodeById.get(d.parent!)?.y ?? 0)
      .attr("x2", (d) => d.x)
      .attr("y2", (d) => d.y);

    backtracksLayer
      .selectAll("line.backtrack-edge")
      .data(laidOutBacktracks, (d) => (d as LaidOutBacktrackEdge).id)
      .enter()
      .append("line")
      .attr("class", "backtrack-edge")
      .attr("data-id", (d) => d.id)
      .attr("stroke", backtrackStroke)
      .attr("stroke-width", backtrackStrokeWidth)
      .attr("stroke-dasharray", backtrackDashArray)
      .attr("stroke-linecap", "round")
      .attr("marker-end", backtrackMarkerEnd)
      .attr("opacity", (d) =>
        showBacktrackEdges &&
        d.source.order < revealed &&
        d.target.order < revealed
          ? backtrackVisibleOpacity
          : 0,
      )
      .attr("x1", (d) => d.x1)
      .attr("y1", (d) => d.y1)
      .attr("x2", (d) => d.x2)
      .attr("y2", (d) => d.y2);

    // Nodes.
    const nodeGroups = nodesLayer
      .selectAll("g.node")
      .data(laidOut, (d) => (d as LaidOutNode).id)
      .enter()
      .append("g")
      .attr("class", "node")
      .attr("data-id", (d) => d.id)
      .attr(
        "transform",
        (d) => `translate(${d.x - nodeWidth / 2},${d.y - nodeHeight / 2})`,
      )
      .attr("opacity", (d) => (d.order < revealed ? 1 : 0))
      .style("pointer-events", (d) => (d.order < revealed ? "all" : "none"))
      .style("cursor", "pointer");

    nodeGroups
      .append("rect")
      .attr("class", "card")
      .attr("width", nodeWidth)
      .attr("height", nodeHeight)
      .attr("rx", 6)
      .attr("ry", 6)
      .attr("fill", cardFill)
      .attr("stroke", (d) => baseNodeStroke(d, isDark))
      .attr("stroke-width", (d) => baseNodeStrokeWidth(d));

    nodeGroups.each(function (d) {
      const inner = d3
        .select(this)
        .append("g")
        .attr("transform", `translate(${padding},${padding})`);
      const thumbnailUrl = nodeThumbnailUrls[d.id];
      if (nodeVisualMode === "thumbnail" && thumbnailUrl) {
        inner
          .append("image")
          .attr("href", thumbnailUrl)
          .attr("x", 0)
          .attr("y", 0)
          .attr("width", nodeWidth - padding * 2)
          .attr("height", nodeHeight - padding * 2)
          .attr("preserveAspectRatio", "none")
          .style("image-rendering", "pixelated");
      } else if (nodeVisualMode === "numeric") {
        renderNumericState(inner, {
          rows: map.rows,
          cols: map.cols,
          cell,
          player: d.player,
          monster: d.monster,
        });
      } else {
        renderMiniGrid(inner, {
          rows: map.rows,
          cols: map.cols,
          cell,
          player: d.player,
          monster: d.monster,
          isDark,
        });
      }
    });

    // Depth label.
    nodeGroups
      .append("text")
      .attr("x", 5)
      .attr("y", 10)
      .attr("font-family", "monospace")
      .attr("font-size", 8)
      .attr("font-weight", 700)
      .attr("fill", labelColor)
      .text((d) => `depth=${d.depth}`);

    // Click → highlight + update game preview.
    nodeGroups.on("click", (_evt, d) => {
      setPreviewNode(d);
      setSelectedId(d.id);
    });

    // Zoom.
    const zoom = d3
      .zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.15, 5])
      .filter((event) => {
        if (event.type === "wheel") return armedRef.current;
        const target = event.target as Element | null;
        return !target?.closest?.("g.node");
      })
      .on("zoom", (event) => {
        view.attr("transform", event.transform.toString());
      });
    zoomRef.current = zoom;
    svg.call(zoom);
    svg.on("dblclick.zoom", null);
  }, [
    laidOut,
    isDark,
    padding,
    cell,
    map.rows,
    map.cols,
    nodeThumbnailUrls,
    nodeVisualMode,
    graph.backtrackEdges,
    revealed,
    showPlan,
  ]);

  // ── D3: size the svg ──────────────────────────────────────────

  useEffect(() => {
    const svgEl = svgRef.current;
    if (!svgEl) return;
    const svg = d3.select<SVGSVGElement, unknown>(svgEl);
    svg
      .attr("width", containerWidth)
      .attr("height", containerHeight)
      .attr("viewBox", `0 0 ${containerWidth} ${containerHeight}`);
  }, [containerHeight, containerWidth]);

  // ── D3: auto-zoom to fit revealed nodes ───────────────────────

  useEffect(() => {
    const svgEl = svgRef.current;
    const zoom = zoomRef.current;
    if (!svgEl || !zoom) return;
    const svg = d3.select<SVGSVGElement, unknown>(svgEl);
    svg.interrupt();
    const t = revealedTransform();
    svg
      .transition()
      .duration(400)
      .ease(d3.easeCubicOut)
      .call(zoom.transform, t);
  }, [revealedTransform, nodeThumbnailUrls, nodeVisualMode]);

  // ── D3: reveal nodes ──────────────────────────────────────────

  useEffect(() => {
    const svg = d3.select(svgRef.current);
    if (!svg.node()) return;

    const baseEdge = isDark ? EDGE_COLOR_DARK : EDGE_COLOR_LIGHT;
    const backtrackColor = isDark
      ? BACKTRACK_EDGE_COLOR_DARK
      : BACKTRACK_EDGE_COLOR_LIGHT;
    const showBacktrackEdges = forceShowsBacktracks || showBacktracks;
    const backtrackStroke = forceShowsBacktracks ? baseEdge : backtrackColor;
    const backtrackVisibleOpacity = forceShowsBacktracks ? 1 : 0.95;

    svg
      .selectAll<SVGGElement, LaidOutNode>("g.node")
      .interrupt()
      .each(function (d) {
        const visible = d.order < revealed;
        d3.select(this)
          .style("pointer-events", visible ? "all" : "none")
          .transition()
          .duration(visible ? 350 : 100)
          .ease(d3.easeCubicOut)
          .attr("opacity", visible ? 1 : 0);
      });

    svg
      .selectAll<SVGLineElement, LaidOutNode>("line.edge")
      .interrupt()
      .each(function (d) {
        const visible = d.order < revealed;
        const plan = showPlan && d.onPlan && d.order < revealed;
        d3.select(this)
          .transition()
          .duration(visible ? 350 : 100)
          .ease(d3.easeCubicOut)
          .attr("opacity", visible ? 1 : 0)
          .attr("stroke", plan ? EDGE_PLAN_COLOR : baseEdge)
          .attr("stroke-width", plan ? 2 : 1.4);
      });

    svg
      .selectAll<SVGLineElement, LaidOutBacktrackEdge>("line.backtrack-edge")
      .interrupt()
      .each(function (d) {
        const visible =
          showBacktrackEdges &&
          d.source.order < revealed &&
          d.target.order < revealed;
        d3.select(this)
          .transition()
          .duration(visible ? 350 : 100)
          .ease(d3.easeCubicOut)
          .attr("opacity", visible ? backtrackVisibleOpacity : 0)
          .attr("stroke", backtrackStroke);
      });
  }, [revealed, isDark, showPlan, showBacktracks, forceShowsBacktracks]);

  // ── D3: selection highlight ───────────────────────────────────

  useEffect(() => {
    const svg = d3.select(svgRef.current);
    if (!svg.node()) return;

    const HIGHLIGHT = "#facc15";

    svg.selectAll<SVGGElement, LaidOutNode>("g.node").each(function (d) {
      const card = d3.select(this).select<SVGRectElement>("rect.card");
      const selected = d.id === selectedId;
      card
        .attr("stroke", selected ? HIGHLIGHT : baseNodeStroke(d, isDark))
        .attr("stroke-width", selected ? 2.5 : baseNodeStrokeWidth(d));
    });
  }, [selectedId, isDark]);

  // ── Vim mode ──────────────────────────────────────────────────

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const getVim = (): VimModeAPI | undefined =>
      (window as Window & { vimMode?: VimModeAPI }).vimMode;

    const setMode = (inside: boolean) => {
      setArmed(inside);
      const vm = getVim();
      if (!vm) return;
      if (inside) {
        vm.pushMode(VIM_MODE_ID, {
          label: "State graph",
          extends: "normal",
          commands: [
            {
              key: " ",
              label: "Play / pause",
              run: () => setPlaying((p) => !p),
            },
            { key: "arrowleft", label: "Hide last state", run: stepBack },
            { key: "arrowright", label: "Reveal next state", run: stepForward },
            { key: "f", label: "Toggle fullscreen", run: toggleFullscreen },
            {
              key: "g",
              label: "Cycle map / grid / numeric",
              run: toggleNodeVisualMode,
            },
            {
              key: "b",
              label: "Toggle backtrack edges",
              run: toggleBacktracks,
            },
            {
              key: "l",
              label: "Cycle circular / tree / force",
              run: toggleLayoutMode,
            },
            { key: "0", label: "Increase max nodes", run: addNodeBudget },
            { key: "9", label: "Decrease max nodes", run: removeNodeBudget },
            { key: "r", label: "Restart", run: restart },
            {
              key: "escape",
              label: "Exit",
              run: () => root.blur(),
              hidden: true,
            },
          ],
        });
      } else {
        vm.popMode(VIM_MODE_ID);
      }
    };

    const focusRoot = () => {
      if (root.contains(document.activeElement)) return;
      root.focus({ preventScroll: true });
      setMode(true);
    };
    const sync = () =>
      requestAnimationFrame(() =>
        setMode(root.contains(document.activeElement)),
      );

    root.addEventListener("pointerdown", focusRoot, true);
    root.addEventListener("focusin", sync);
    root.addEventListener("focusout", sync);
    sync();
    return () => {
      root.removeEventListener("pointerdown", focusRoot, true);
      root.removeEventListener("focusin", sync);
      root.removeEventListener("focusout", sync);
      getVim()?.popMode(VIM_MODE_ID);
    };
  }, [
    stepForward,
    stepBack,
    toggleFullscreen,
    toggleNodeVisualMode,
    toggleBacktracks,
    toggleLayoutMode,
    addNodeBudget,
    removeNodeBudget,
    restart,
  ]);

  // ── Render ────────────────────────────────────────────────────

  const surfaceBg = isDark ? "#05070a" : "#fff7ed";

  return (
    <div
      ref={rootRef}
      tabIndex={0}
      style={{
        margin: isFullscreen ? 0 : "1.5rem auto",
        maxWidth: isFullscreen ? "none" : 720,
        width: "100%",
        height: isFullscreen ? "100%" : undefined,
        padding: isFullscreen ? 16 : 0,
        boxSizing: "border-box",
        background: isFullscreen ? surfaceBg : "transparent",
        outline: "none",
        display: "flex",
        flexDirection: "column",
        gap: isFullscreen ? 10 : 0,
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: isFullscreen ? "row" : "column",
          gap: isFullscreen ? 16 : 0,
          alignItems: "stretch",
          flex: isFullscreen ? 1 : undefined,
          minHeight: 0,
        }}
      >
        {/* Game preview */}
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            marginBottom: isFullscreen ? 0 : 12,
            flex: isFullscreen ? "0 0 min(40vw, 480px)" : undefined,
            alignItems: "center",
            minWidth: isFullscreen ? 280 : undefined,
          }}
        >
          <div
            style={{
              position: "relative",
              width: isFullscreen ? "100%" : "55%",
              minWidth: isFullscreen ? 280 : 200,
              maxWidth: isFullscreen ? "none" : 400,
            }}
          >
            <MineMapViewer
              mapState={previewMapState}
              showGoldSpecks
              showMonsterMarker
            />
            <MineGameSprite
              kind="miner"
              facing="south"
              anim="idle"
              row={previewNode.player.r}
              col={previewNode.player.c}
              rows={map.rows}
              cols={map.cols}
              zIndex={6}
              transitionMs={200}
            />
            <MineGameSprite
              kind="monster"
              facing="south"
              anim="idle"
              row={previewNode.monster.r}
              col={previewNode.monster.c}
              rows={map.rows}
              cols={map.cols}
              zIndex={7}
              transitionMs={200}
            />
          </div>
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            flex: isFullscreen ? 1 : undefined,
            minWidth: 0,
            minHeight: 0,
          }}
        >
          {/* Graph */}
          <div
            ref={containerRef}
            style={{
              position: "relative",
              width: "100%",
              height: isFullscreen ? "100%" : GRAPH_HEIGHT,
              flex: isFullscreen ? 1 : undefined,
              minHeight: isFullscreen ? 0 : GRAPH_HEIGHT,
              overflow: "hidden",
              background: surfaceBg,
              border: `1px solid ${HUD.border}`,
              borderRadius: 6,
            }}
          >
            <svg ref={svgRef} role="img" aria-label="Joint-state BFS graph" />
          </div>

          {/* Minimal HUD */}
          <div
            style={{
              marginTop: 0,
              padding: "6px 10px",
              background: HUD.bg,
              border: `1px solid ${HUD.border}`,
              fontFamily: "monospace",
              fontSize: 11,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 12,
            }}
          >
            <button
              type="button"
              tabIndex={-1}
              onPointerDown={triggerButtonAction(restart)}
              title="Restart (r)"
              style={{
                padding: "4px 10px",
                fontSize: 16,
                fontWeight: 700,
                fontFamily: "monospace",
                cursor: "pointer",
                border: `1px solid ${HUD.border}`,
                background: HUD.btnBg,
                color: HUD.text,
                lineHeight: 1,
              }}
            >
              ⟲
            </button>
            <button
              type="button"
              tabIndex={-1}
              onPointerDown={triggerButtonAction(stepBack)}
              disabled={revealed <= 1}
              title="Back (Left Arrow)"
              style={{
                padding: "4px 10px",
                fontSize: 13,
                fontWeight: 700,
                fontFamily: "monospace",
                cursor: revealed <= 1 ? "default" : "pointer",
                opacity: revealed <= 1 ? 0.35 : 1,
                border: `1px solid ${HUD.border}`,
                background: HUD.btnBg,
                color: HUD.text,
                lineHeight: 1,
              }}
            >
              ◀
            </button>
            <span
              style={{
                color: HUD.muted,
                fontVariantNumeric: "tabular-nums",
                minWidth: 60,
                textAlign: "center",
              }}
            >
              {Math.min(revealed, total)} / {total}
            </span>
            <button
              type="button"
              tabIndex={-1}
              onPointerDown={triggerButtonAction(stepForward)}
              disabled={revealed >= total}
              title="Next (Right Arrow)"
              style={{
                padding: "4px 10px",
                fontSize: 13,
                fontWeight: 700,
                fontFamily: "monospace",
                cursor: revealed >= total ? "default" : "pointer",
                opacity: revealed >= total ? 0.35 : 1,
                border: `1px solid ${HUD.border}`,
                background: HUD.btnBg,
                color: HUD.text,
                lineHeight: 1,
              }}
            >
              ▶
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
