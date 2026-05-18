/**
 * MineGameVisual — playable arcade game on top of the article's map.
 *
 * Three modes selected by `mode`:
 *
 *  - "collapse"  — every cell collapses behind the player, so each cell
 *                  can only be visited once. Goal is to reach the exit
 *                  with as much gold as possible. Used in
 *                  "Escaping with the Most Gold".
 *
 *  - "shortest"  — no collapse, no monster. Goal is to walk to the exit
 *                  in as few steps as possible. Used in
 *                  "Escaping the Mine: The Shortest Path".
 *
 *  - "monster"   — a cave monster lurks in the deepest cell and chases
 *                  the player using BFS after every move. Cells stay
 *                  walkable. Used in "Escaping the Monster in the Mine".
 *
 * At the end of every level the game tells the reader whether the route
 * they took matched the optimal one — computed with the same algorithm
 * the article describes (DFS+backtracking for "collapse", BFS for the
 * other two).
 *
 * Visuals: pixel-art tilemap from `MineMapViewer`, animated miner /
 * monster sprites overlaid on top, no debug grid, no yellow visited
 * rectangles. Audio: shared 8-bit SFX / music engine from
 * `mine-audio.ts`. Controls: arrow keys, vim hjkl, Z zoom on player,
 * R restart, U undo (collapse only), F fullscreen, M music, X SFX.
 */
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { VimModeAPI } from "../../utils/vim-mode";
import { posKey } from "./types";
import type { Pos, MineMapState } from "./types";
import { MineMapViewer } from "./MineMapViewer";
import { useFullscreen } from "../cave/shared/useFullscreen";
import { useArticleMap } from "./article-store";
import { MineGameSprite } from "./MineGameSprite";
import type { Direction } from "./MineGameSprite";
import { MusicEngine, sfx } from "./mine-audio";
import {
  MINE_HUD as HUD,
  MineHudBar,
  MineHudButton as HudBtn,
  MineVisualFrame,
} from "./MineVisualFrame";

type GameMode = "collapse" | "shortest" | "monster";
type GameStatus = "playing" | "won" | "lost";

/** Duration of one cell-to-cell move (sprite slide + walk animation). */
const MOVE_DURATION_MS = 380;
/** How long the camera-shake animation runs after a wall bump. */
const SHAKE_DURATION_MS = 220;
/** Match the original GoldMineDemo zoom factor on the player. */
const PLAYER_ZOOM_SCALE = 2.5;
/** Camera tween duration used when toggling zoom. */
const ZOOM_TWEEN_MS = 350;

interface Snapshot {
  player: Pos;
  facing: Direction;
  visited: Set<string>;
  collapsed: Set<string>;
  monster: Pos | null;
  monsterFacing: Direction;
  steps: number;
}

interface PendingMove {
  dr: number;
  dc: number;
}

interface GameState extends Snapshot {
  status: GameStatus;
}

function dirOf(from: Pos, to: Pos): Direction {
  if (to.r < from.r) return "north";
  if (to.r > from.r) return "south";
  if (to.c < from.c) return "west";
  return "east";
}

// ── Algorithms (mirror the Python algorithms used in the articles) ──

const MOVES: Array<[number, number]> = [
  [0, 1], // east
  [-1, 0], // north
  [1, 0], // south
  [0, -1], // west
];

function isOpen(map: MineMapState, r: number, c: number): boolean {
  if (r < 0 || r >= map.rows || c < 0 || c >= map.cols) return false;
  return !map.walls.has(posKey(r, c));
}

/** BFS shortest distance from `start` to every cell. */
function bfsDistances(
  map: MineMapState,
  start: Pos,
  blocked?: Set<string>,
): Map<string, number> {
  const dist = new Map<string, number>();
  dist.set(posKey(start.r, start.c), 0);
  const q: Pos[] = [start];
  while (q.length > 0) {
    const cur = q.shift()!;
    const d = dist.get(posKey(cur.r, cur.c))!;
    for (const [dr, dc] of MOVES) {
      const nr = cur.r + dr;
      const nc = cur.c + dc;
      const k = posKey(nr, nc);
      if (!isOpen(map, nr, nc)) continue;
      if (blocked && blocked.has(k)) continue;
      if (dist.has(k)) continue;
      dist.set(k, d + 1);
      q.push({ r: nr, c: nc });
    }
  }
  return dist;
}

/** BFS first-step toward `target` (or null if unreachable). */
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
      const k = posKey(nr, nc);
      if (!isOpen(map, nr, nc)) continue;
      if (parent.has(k)) continue;
      parent.set(k, cur);
      q.push({ r: nr, c: nc });
    }
  }
  return null;
}

/**
 * DFS + backtracking longest simple path from start to exit (gold count).
 * Bounded by walkable cell count, fine for the small maps embedded in
 * notes. Returns -1 if unreachable.
 */
function longestSimplePath(map: MineMapState): number {
  const visited = new Set<string>();
  let best = -1;
  const target = posKey(map.exit.r, map.exit.c);
  const startKey = posKey(map.start.r, map.start.c);
  visited.add(startKey);

  function dfs(r: number, c: number, gold: number): void {
    if (posKey(r, c) === target) {
      if (gold > best) best = gold;
      return;
    }
    for (const [dr, dc] of MOVES) {
      const nr = r + dr;
      const nc = c + dc;
      const k = posKey(nr, nc);
      if (!isOpen(map, nr, nc)) continue;
      if (visited.has(k)) continue;
      visited.add(k);
      dfs(nr, nc, gold + 1);
      visited.delete(k);
    }
  }

  dfs(map.start.r, map.start.c, 1);
  return best;
}

function totalWalkable(map: MineMapState): number {
  let total = 0;
  for (let r = 0; r < map.rows; r += 1) {
    for (let c = 0; c < map.cols; c += 1) {
      if (!map.walls.has(posKey(r, c))) total += 1;
    }
  }
  return total;
}

function shortestExitSteps(map: MineMapState): number | null {
  const dist = bfsDistances(map, map.start);
  const k = posKey(map.exit.r, map.exit.c);
  return dist.has(k) ? dist.get(k)! : null;
}

/**
 * Joint-state BFS over (player, monster) pairs.
 * Returns the minimum number of player steps to reach the exit without
 * being caught, or null if no escape exists.
 */
function jointStateBfsSteps(
  map: MineMapState,
  monsterStart: Pos,
): number | null {
  const startKey = `${posKey(map.start.r, map.start.c)}|${posKey(monsterStart.r, monsterStart.c)}`;
  const exitKey = posKey(map.exit.r, map.exit.c);
  const dist = new Map<string, number>();
  dist.set(startKey, 0);
  const queue: Array<{ player: Pos; monster: Pos }> = [
    { player: map.start, monster: monsterStart },
  ];
  let head = 0;
  while (head < queue.length) {
    const { player, monster } = queue[head];
    const k = `${posKey(player.r, player.c)}|${posKey(monster.r, monster.c)}`;
    const d = dist.get(k)!;
    head++;
    if (posKey(player.r, player.c) === exitKey) return d;
    for (const [dr, dc] of MOVES) {
      const nr = player.r + dr;
      const nc = player.c + dc;
      if (!isOpen(map, nr, nc)) continue;
      const newPlayer: Pos = { r: nr, c: nc };
      const mNext = bfsNextStep(map, monster, newPlayer) ?? monster;
      if (mNext.r === newPlayer.r && mNext.c === newPlayer.c) continue;
      const nk = `${posKey(newPlayer.r, newPlayer.c)}|${posKey(mNext.r, mNext.c)}`;
      if (dist.has(nk)) continue;
      dist.set(nk, d + 1);
      queue.push({ player: newPlayer, monster: mNext });
    }
  }
  return null;
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

function resolveMonsterStart(map: MineMapState): Pos {
  return map.monsterStart ? { ...map.monsterStart } : pickMonsterStart(map);
}

function initialState(map: MineMapState, mode: GameMode): GameState {
  return {
    player: { ...map.start },
    facing: "south",
    visited: new Set([posKey(map.start.r, map.start.c)]),
    collapsed: new Set(),
    monster: mode === "monster" ? resolveMonsterStart(map) : null,
    monsterFacing: "south",
    steps: 0,
    status: "playing",
  };
}

// ── Component ──────────────────────────────────────────────────────

export interface MineGameVisualProps {
  mode: GameMode;
  maxWidth?: number;
  vimModeId?: string;
  vimModeLabel?: string;
}

export const MineGameVisual: React.FC<MineGameVisualProps> = ({
  mode,
  maxWidth = 720,
  vimModeId = `mine-game-${mode}`,
  vimModeLabel = mode === "collapse"
    ? "Collapse Game"
    : mode === "shortest"
      ? "Shortest Game"
      : "Monster Game",
}) => {
  const map = useArticleMap();
  const rootRef = useRef<HTMLDivElement>(null);
  const { isFullscreen, toggleFullscreen } = useFullscreen(rootRef);

  const [state, setState] = useState<GameState>(() => initialState(map, mode));
  const [, setHistory] = useState<Snapshot[]>([]);
  const [armed, setArmed] = useState(false);
  const [musicOn, setMusicOn] = useState(false);
  const [sfxOn, setSfxOn] = useState(true);
  const [bestSoFar, setBestSoFar] = useState<number | null>(null);
  const [isMoving, setIsMoving] = useState(false);
  const [monsterMoving, setMonsterMoving] = useState(false);
  const [shakeId, setShakeId] = useState(0);
  const [zoomed, setZoomed] = useState(false);

  // The monster's spawn cell is shown as a static "M" marker even while
  // the live monster sprite walks around.
  const monsterStart = useMemo(
    () => (mode === "monster" ? resolveMonsterStart(map) : null),
    [map, mode],
  );

  const moveTimerRef = useRef<number | null>(null);
  const monsterTimerRef = useRef<number | null>(null);
  const pendingMoveRef = useRef<PendingMove | null>(null);
  const gameFrameRef = useRef<HTMLDivElement>(null);

  const [gameFrameWidth, setGameFrameWidth] = useState(maxWidth);
  const [viewportHeight, setViewportHeight] = useState(() =>
    typeof window === "undefined" ? 720 : window.innerHeight,
  );

  const stateRef = useRef(state);
  stateRef.current = state;
  const sfxRef = useRef(sfxOn);
  sfxRef.current = sfxOn;
  const armedRef = useRef(armed);
  armedRef.current = armed;
  const musicRef = useRef<MusicEngine | null>(null);

  // ── Optimum (computed once per map / mode) ──
  const optimum = useMemo(() => {
    if (mode === "collapse") return longestSimplePath(map);
    if (mode === "shortest") return shortestExitSteps(map);
    if (mode === "monster" && monsterStart)
      return jointStateBfsSteps(map, monsterStart);
    return null;
  }, [map, mode, monsterStart]);

  // ── Reset on map change ──
  useEffect(() => {
    pendingMoveRef.current = null;
    setState(initialState(map, mode));
    setHistory([]);
    setZoomed(false);
  }, [map, mode]);

  const reset = useCallback(() => {
    pendingMoveRef.current = null;
    setState(initialState(map, mode));
    setHistory([]);
    setIsMoving(false);
    setMonsterMoving(false);
    if (moveTimerRef.current !== null) {
      window.clearTimeout(moveTimerRef.current);
      moveTimerRef.current = null;
    }
    if (monsterTimerRef.current !== null) {
      window.clearTimeout(monsterTimerRef.current);
      monsterTimerRef.current = null;
    }
  }, [map, mode]);

  const toggleZoom = useCallback(() => {
    setZoomed((current) => !current);
  }, []);

  useEffect(
    () => () => {
      pendingMoveRef.current = null;
      if (moveTimerRef.current !== null)
        window.clearTimeout(moveTimerRef.current);
      if (monsterTimerRef.current !== null)
        window.clearTimeout(monsterTimerRef.current);
    },
    [],
  );

  useEffect(() => {
    if (typeof window === "undefined") return;
    const sync = () => setViewportHeight(window.innerHeight);
    sync();
    window.addEventListener("resize", sync);
    return () => window.removeEventListener("resize", sync);
  }, []);

  useEffect(() => {
    const el = gameFrameRef.current;
    if (!el) return;

    const sync = () => setGameFrameWidth(el.clientWidth || maxWidth);
    sync();
    const ro = new ResizeObserver(sync);
    ro.observe(el);
    return () => ro.disconnect();
  }, [maxWidth]);

  // ── Music lifecycle ──
  useEffect(() => {
    if (!musicRef.current) musicRef.current = new MusicEngine();
    const should = musicOn && armed;
    if (should) musicRef.current.start();
    else musicRef.current.stop();
    return () => musicRef.current?.stop();
  }, [musicOn, armed]);

  // ── Game logic ──
  const tryMove = useCallback(
    (dr: number, dc: number) => {
      const cur = stateRef.current;
      if (cur.status !== "playing") {
        pendingMoveRef.current = null;
        return;
      }

      if (moveTimerRef.current !== null) {
        pendingMoveRef.current = { dr, dc };
        return;
      }

      pendingMoveRef.current = null;

      const nr = cur.player.r + dr;
      const nc = cur.player.c + dc;
      const nk = posKey(nr, nc);

      const facing: Direction =
        dr < 0 ? "north" : dr > 0 ? "south" : dc < 0 ? "west" : "east";

      // Wall / OOB / collapsed → bump (camera shake + bump SFX).
      if (!isOpen(map, nr, nc) || cur.collapsed.has(nk)) {
        if (sfxRef.current) sfx.bump();
        setShakeId((id) => id + 1);
        // Still rotate the sprite to the attempted direction.
        setState({ ...cur, facing });
        return;
      }

      const snapshot: Snapshot = {
        player: { ...cur.player },
        facing: cur.facing,
        visited: new Set(cur.visited),
        collapsed: new Set(cur.collapsed),
        monster: cur.monster ? { ...cur.monster } : null,
        monsterFacing: cur.monsterFacing,
        steps: cur.steps,
      };
      setHistory((h) => [...h, snapshot]);

      const newPlayer: Pos = { r: nr, c: nc };
      const visited = new Set(cur.visited);
      visited.add(nk);
      const collapsed =
        mode === "collapse"
          ? new Set([...cur.collapsed, posKey(cur.player.r, cur.player.c)])
          : cur.collapsed;

      let monster = cur.monster ? { ...cur.monster } : null;
      let monsterFacing = cur.monsterFacing;
      let monsterMovedThisTurn = false;
      let status: GameStatus = "playing";

      if (newPlayer.r === map.exit.r && newPlayer.c === map.exit.c) {
        status = "won";
      }

      if (mode === "monster" && monster && status === "playing") {
        // Player moved first. Monster sees the new player position and
        // takes one BFS step toward it.
        const next = bfsNextStep(map, monster, newPlayer);
        if (next) {
          monsterFacing = dirOf(monster, next);
          monster = next;
          monsterMovedThisTurn = true;
          if (sfxRef.current) sfx.growl();
        }
        if (monster && monster.r === newPlayer.r && monster.c === newPlayer.c) {
          status = "lost";
        }
      }

      // Played sound effects.
      if (sfxRef.current) {
        sfx.step();
        if (mode === "collapse") {
          sfx.gold();
          // The cell we just left now collapses.
          sfx.collapse();
        }
      }

      // Game-over jingles.
      const newSteps = cur.steps + 1;
      if (status === "won") {
        if (sfxRef.current) sfx.win();
        if (mode === "collapse") {
          // Score is gold = number of distinct visited cells.
          setBestSoFar((b) => Math.max(b ?? 0, visited.size));
        } else {
          // Score is steps; lower is better.
          setBestSoFar((b) => (b == null ? newSteps : Math.min(b, newSteps)));
        }
      } else if (status === "lost") {
        if (sfxRef.current) sfx.lose();
      }

      setState({
        player: newPlayer,
        facing,
        visited,
        collapsed,
        monster,
        monsterFacing,
        steps: newSteps,
        status,
      });

      // Trigger walk animation for the duration of the slide.
      setIsMoving(true);
      if (moveTimerRef.current !== null)
        window.clearTimeout(moveTimerRef.current);
      moveTimerRef.current = window.setTimeout(() => {
        const pending = pendingMoveRef.current;
        pendingMoveRef.current = null;
        if (pending && stateRef.current.status === "playing") {
          moveTimerRef.current = null;
          if (monsterTimerRef.current !== null) {
            window.clearTimeout(monsterTimerRef.current);
            monsterTimerRef.current = null;
          }
          window.requestAnimationFrame(() => tryMove(pending.dr, pending.dc));
          return;
        }

        setIsMoving(false);
        setMonsterMoving(false);
        moveTimerRef.current = null;
      }, MOVE_DURATION_MS);

      setMonsterMoving(monsterMovedThisTurn);

      // For collapse mode, check if we are stranded (no walkable
      // neighbours that aren't collapsed).
      if (status === "playing" && mode === "collapse") {
        let escapable = false;
        for (const [pr, pc] of MOVES) {
          const r2 = newPlayer.r + pr;
          const c2 = newPlayer.c + pc;
          if (!isOpen(map, r2, c2)) continue;
          if (collapsed.has(posKey(r2, c2))) continue;
          escapable = true;
          break;
        }
        if (!escapable) {
          if (sfxRef.current) sfx.lose();
          setState((s) => ({ ...s, status: "lost" }));
        }
      }
    },
    [map, mode],
  );

  const tryUndo = useCallback(() => {
    if (mode !== "collapse") return;
    pendingMoveRef.current = null;
    setHistory((h) => {
      if (h.length === 0) return h;
      const snap = h[h.length - 1];
      setState({ ...snap, status: "playing" });
      if (sfxRef.current) sfx.rewind();
      return h.slice(0, -1);
    });
  }, [mode]);

  // ── Keyboard ──
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const handler = (e: KeyboardEvent) => {
      const k = e.key;
      if (k === "ArrowUp" || k === "k" || k === "w") {
        e.preventDefault();
        tryMove(-1, 0);
      } else if (k === "ArrowDown" || k === "j" || k === "s") {
        e.preventDefault();
        tryMove(1, 0);
      } else if (k === "ArrowLeft" || k === "h" || k === "a") {
        e.preventDefault();
        tryMove(0, -1);
      } else if (k === "ArrowRight" || k === "l" || k === "d") {
        e.preventDefault();
        tryMove(0, 1);
      } else if (k === "r" || k === "R") {
        e.preventDefault();
        reset();
      } else if (k === "u" || k === "U") {
        e.preventDefault();
        tryUndo();
      } else if (k === "z" || k === "Z") {
        e.preventDefault();
        toggleZoom();
      } else if (k === "f" || k === "F") {
        e.preventDefault();
        toggleFullscreen();
      } else if (k === "m") {
        e.preventDefault();
        setMusicOn((v) => !v);
      } else if (k === "x") {
        e.preventDefault();
        setSfxOn((v) => !v);
      }
    };
    root.addEventListener("keydown", handler);
    return () => root.removeEventListener("keydown", handler);
  }, [reset, toggleFullscreen, tryMove, tryUndo]);

  // ── Focus + click-to-arm + vim mode ──
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const getVim = (): VimModeAPI | undefined =>
      (window as Window & { vimMode?: VimModeAPI }).vimMode;

    const setMode = (inside: boolean) => {
      armedRef.current = inside;
      setArmed(inside);
      const vm = getVim();
      if (!vm) return;
      if (inside) {
        const move = (dr: number, dc: number) => () => tryMove(dr, dc);
        vm.pushMode(vimModeId, {
          label: vimModeLabel,
          extends: "normal",
          commands: [
            {
              key: "w",
              label: "Move north",
              run: move(-1, 0),
              altKeys: ["\u2191"],
            },
            {
              key: "a",
              label: "Move west",
              run: move(0, -1),
              altKeys: ["\u2190"],
            },
            {
              key: "s",
              label: "Move south",
              run: move(1, 0),
              altKeys: ["\u2193"],
            },
            {
              key: "d",
              label: "Move east",
              run: move(0, 1),
              altKeys: ["\u2192"],
            },
            { key: "h", label: "Move west", run: move(0, -1), hidden: true },
            { key: "j", label: "Move south", run: move(1, 0), hidden: true },
            { key: "k", label: "Move north", run: move(-1, 0), hidden: true },
            { key: "l", label: "Move east", run: move(0, 1), hidden: true },
            { key: "z", label: "Zoom on player", run: () => toggleZoom() },
            {
              key: "m",
              label: "Toggle music",
              run: () => setMusicOn((v) => !v),
            },
            { key: "x", label: "Toggle SFX", run: () => setSfxOn((v) => !v) },
            {
              key: "f",
              label: "Toggle fullscreen",
              run: () => toggleFullscreen(),
            },
            ...(mode === "collapse"
              ? [{ key: "u", label: "Undo last move", run: () => tryUndo() }]
              : []),
            { key: "r", label: "Restart", run: () => reset() },
            {
              key: "escape",
              label: "Exit game",
              run: () => root.blur(),
              hidden: true,
            },
          ],
        });
      } else {
        vm.popMode(vimModeId);
      }
    };

    const focusRoot = () => {
      root.focus({ preventScroll: true });
      setMode(true);
    };
    const sync = () => {
      requestAnimationFrame(() =>
        setMode(root.contains(document.activeElement)),
      );
    };

    root.addEventListener("pointerdown", focusRoot, true);
    root.addEventListener("focusin", sync);
    root.addEventListener("focusout", sync);
    return () => {
      root.removeEventListener("pointerdown", focusRoot, true);
      root.removeEventListener("focusin", sync);
      root.removeEventListener("focusout", sync);
      getVim()?.popMode(vimModeId);
    };
  }, [
    reset,
    toggleFullscreen,
    toggleZoom,
    tryMove,
    tryUndo,
    vimModeId,
    vimModeLabel,
    mode,
  ]);

  // ── Effective map ──
  // For "collapse" mode every collapsed cell becomes a wall, so the
  // tilemap's auto-tiler closes the cave behind the player with proper
  // border sprites (no gaps, no orphan dirt edges).
  const effectiveMap: MineMapState = useMemo(() => {
    if (mode !== "collapse" || state.collapsed.size === 0) return map;
    const walls = new Set(map.walls);
    for (const k of state.collapsed) walls.add(k);
    return { ...map, walls };
  }, [map, mode, state.collapsed]);

  const displayMap: MineMapState = useMemo(() => {
    if (mode !== "monster" || !monsterStart) return effectiveMap;
    return { ...effectiveMap, monsterStart };
  }, [effectiveMap, mode, monsterStart]);

  const zoomTransform = useMemo(() => {
    if (!zoomed) return "translate(0%, 0%) scale(1)";

    const px = ((state.player.c + 0.5) / map.cols) * 100;
    const py = ((state.player.r + 0.5) / map.rows) * 100;
    const minOffset = 100 * (1 - PLAYER_ZOOM_SCALE);
    const offsetX = Math.min(
      0,
      Math.max(minOffset, 50 - PLAYER_ZOOM_SCALE * px),
    );
    const offsetY = Math.min(
      0,
      Math.max(minOffset, 50 - PLAYER_ZOOM_SCALE * py),
    );

    return `translate(${offsetX}%, ${offsetY}%) scale(${PLAYER_ZOOM_SCALE})`;
  }, [zoomed, state.player.c, state.player.r, map.cols, map.rows]);

  // ── HUD strings ──
  const goldCount = state.visited.size;
  const totalGold = useMemo(() => totalWalkable(map), [map]);

  const optimalAchieved =
    state.status === "won" &&
    optimum != null &&
    (mode === "collapse"
      ? goldCount >= (optimum as number)
      : state.steps <= (optimum as number));

  const statusText = (() => {
    if (state.status === "playing") {
      if (mode === "collapse") return `GOLD ${goldCount} / ${totalGold}`;
      return `STEPS ${state.steps}`;
    }
    if (state.status === "lost") {
      if (mode === "monster") return "✦ THE MONSTER CAUGHT YOU ✦";
      return "✦ TRAPPED — NO MOVES LEFT ✦";
    }
    // Won.
    if (mode === "collapse") {
      if (optimum == null || optimum < 0)
        return `ESCAPED WITH ${goldCount} GOLD`;
      return optimalAchieved
        ? `★ OPTIMAL! ${goldCount} / ${optimum} GOLD ★`
        : `ESCAPED WITH ${goldCount} GOLD — best possible is ${optimum}`;
    }
    if (optimum == null) return `ESCAPED IN ${state.steps} STEPS`;
    return optimalAchieved
      ? `★ SHORTEST PATH! ${state.steps} STEPS ★`
      : `ESCAPED IN ${state.steps} STEPS — shortest is ${optimum}`;
  })();

  const statusColor =
    state.status === "won"
      ? optimalAchieved
        ? "var(--goldmine-hud-active-text)"
        : HUD.accent
      : state.status === "lost"
        ? "#ff6b6b"
        : armed
          ? HUD.activeText
          : HUD.accent;

  const mapAspect = Math.max(0.05, map.cols / Math.max(1, map.rows));
  const maxBoardHeight = isFullscreen
    ? Math.max(180, viewportHeight - 132)
    : Math.max(180, Math.min(720, viewportHeight * 0.68));
  const boardWidth = Math.max(
    1,
    Math.min(gameFrameWidth || maxWidth, maxBoardHeight * mapAspect),
  );
  const boardHeight = Math.max(1, boardWidth / mapAspect);

  return (
    <MineVisualFrame
      rootRef={rootRef}
      innerRef={gameFrameRef}
      focusable
      isFullscreen={isFullscreen}
      maxWidth={maxWidth}
      margin="1.5rem auto"
    >
      <style>{`
        @keyframes mgv-pulse { 0%,100%{opacity:1} 50%{opacity:0.15} }
        .mgv-blink { animation: mgv-pulse 1.2s ease-in-out infinite; }
        @keyframes mgv-shake-a {
          0%   { transform: translate(0, 0); }
          15%  { transform: translate(-4px, 1px); }
          30%  { transform: translate(4px, -1px); }
          45%  { transform: translate(-3px, 2px); }
          60%  { transform: translate(3px, -2px); }
          75%  { transform: translate(-2px, 0); }
          100% { transform: translate(0, 0); }
        }
        @keyframes mgv-shake-b {
          0%   { transform: translate(0, 0); }
          15%  { transform: translate(-4px, 1px); }
          30%  { transform: translate(4px, -1px); }
          45%  { transform: translate(-3px, 2px); }
          60%  { transform: translate(3px, -2px); }
          75%  { transform: translate(-2px, 0); }
          100% { transform: translate(0, 0); }
        }
      `}</style>

      <div
        style={{
          position: "relative",
          width: boardWidth,
          maxWidth: "100%",
          margin: "0 auto",
          // Re-trigger the shake on every bump by alternating between
          // two identical keyframes (no remount → Phaser stays alive).
          animation:
            shakeId > 0
              ? `${shakeId % 2 === 0 ? "mgv-shake-a" : "mgv-shake-b"} ${SHAKE_DURATION_MS}ms ease-out`
              : undefined,
        }}
      >
        <div
          style={{
            position: "relative",
            overflow: "hidden",
            border: `2px solid ${HUD.border}`,
            boxSizing: "border-box",
            background: "var(--goldmine-fullscreen-bg, #05070a)",
          }}
        >
          <div
            style={{
              position: "relative",
              width: "100%",
              transformOrigin: "top left",
              transform: zoomTransform,
              transition: `transform ${isMoving ? MOVE_DURATION_MS : ZOOM_TWEEN_MS}ms ease-out`,
              willChange: "transform",
            }}
          >
            <MineMapViewer
              mapState={displayMap}
              showMonsterMarker={mode === "monster"}
              width="100%"
              height={boardHeight}
              border="none"
            />

            {/* Player sprite. */}
            <MineGameSprite
              kind="miner"
              facing={state.facing}
              anim={isMoving && state.status === "playing" ? "walk" : "idle"}
              row={state.player.r}
              col={state.player.c}
              rows={map.rows}
              cols={map.cols}
              zIndex={6}
              transitionMs={MOVE_DURATION_MS}
            />

            {/* Monster sprite. */}
            {mode === "monster" && state.monster && (
              <MineGameSprite
                kind="monster"
                facing={state.monsterFacing}
                anim={
                  monsterMoving && state.status === "playing" ? "walk" : "idle"
                }
                row={state.monster.r}
                col={state.monster.c}
                rows={map.rows}
                cols={map.cols}
                zIndex={7}
                transitionMs={MOVE_DURATION_MS}
              />
            )}
          </div>

          {/* Click-to-play overlay. */}
          {!armed && state.status === "playing" && (
            <div
              style={{
                position: "absolute",
                inset: 0,
                background: "rgba(5, 7, 10, 0.32)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                pointerEvents: "none",
                zIndex: 20,
              }}
            >
              <div
                className="mgv-blink"
                style={{
                  fontFamily: "monospace",
                  fontWeight: 700,
                  fontSize: "clamp(11px, 2.6vmin, 18px)",
                  letterSpacing: "0.05em",
                  color: "rgba(246,189,96,0.96)",
                  textShadow: "0 1px 10px rgba(0,0,0,0.5)",
                  background: "rgba(8, 10, 14, 0.5)",
                  padding: "8px 14px",
                  border: "1px solid rgba(246,189,96,0.28)",
                }}
              >
                CLICK TO PLAY
              </div>
            </div>
          )}

          {/* Win / lose overlay. */}
          {state.status !== "playing" && (
            <div
              style={{
                position: "absolute",
                inset: 0,
                background:
                  state.status === "won"
                    ? "rgba(8, 30, 12, 0.55)"
                    : "rgba(40, 6, 8, 0.6)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                pointerEvents: "none",
                zIndex: 21,
                color: "#fff",
                fontFamily: "monospace",
                textAlign: "center",
                padding: 18,
              }}
            >
              <div>
                <div
                  style={{
                    fontSize: "clamp(16px, 4vmin, 26px)",
                    fontWeight: 800,
                  }}
                >
                  {state.status === "won" ? "✦ ESCAPED ✦" : "✦ CAUGHT ✦"}
                </div>
                <div
                  style={{
                    marginTop: 8,
                    fontSize: "clamp(11px, 2.4vmin, 15px)",
                    opacity: 0.92,
                  }}
                >
                  {statusText}
                </div>
                <div style={{ marginTop: 10, fontSize: 11, opacity: 0.75 }}>
                  Press R to play again
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* HUD */}
      <MineHudBar
        style={{
          width: boardWidth,
          maxWidth: "100%",
          margin: "0 auto",
        }}
      >
        <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
          <HudBtn
            onClick={() => setMusicOn((v) => !v)}
            active={musicOn}
            title={musicOn ? "Mute music [M]" : "Enable music [M]"}
          >
            <span style={{ textDecoration: "underline" }}>M</span>usic
          </HudBtn>
          <HudBtn
            onClick={() => setSfxOn((v) => !v)}
            active={sfxOn}
            title={sfxOn ? "Mute SFX [X]" : "Enable SFX [X]"}
          >
            SF<span style={{ textDecoration: "underline" }}>X</span>
          </HudBtn>
          <HudBtn
            onClick={() => toggleFullscreen()}
            active={isFullscreen}
            title="Toggle fullscreen [F]"
          >
            <span style={{ textDecoration: "underline" }}>F</span>ull
          </HudBtn>
          {mode === "collapse" && (
            <HudBtn onClick={() => tryUndo()} title="Undo last move [U]">
              <span style={{ textDecoration: "underline" }}>U</span>ndo
            </HudBtn>
          )}
          <HudBtn onClick={() => reset()} title="Restart [R]">
            <span style={{ textDecoration: "underline" }}>R</span>estart
          </HudBtn>
        </div>

        <div
          style={{
            flex: 1,
            textAlign: "center",
            fontWeight: 700,
            letterSpacing: "0.04em",
            color: statusColor,
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
            padding: "0 6px",
            minWidth: 120,
          }}
        >
          {statusText}
        </div>

        <div
          style={{
            display: "flex",
            gap: 10,
            flexShrink: 0,
            color: HUD.muted,
          }}
        >
          {bestSoFar != null && (
            <span title="Your best on this map this session">
              BEST {bestSoFar}
            </span>
          )}
          {optimum != null && (optimum as number) >= 0 && (
            <span
              title={
                mode === "collapse"
                  ? "Best possible gold (longest simple path)"
                  : "Shortest path length"
              }
            >
              OPT {optimum as number}
            </span>
          )}
        </div>
      </MineHudBar>
    </MineVisualFrame>
  );
};

export default MineGameVisual;
