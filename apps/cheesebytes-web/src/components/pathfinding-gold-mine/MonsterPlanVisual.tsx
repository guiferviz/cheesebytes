/**
 * MonsterPlanVisual — algorithm replay for the Monster note.
 *
 * Animates BFS over joint states (player_pos, monster_pos).
 * Plays the resulting plan as a smooth trajectory of both
 * sprites — including "lure-then-escape" maneuvers that arise
 * from the monster's deterministic shortest-path pursuit.
 *
 * Shares the tile renderer and the sprite component with MineGameVisual,
 * but uses a tiny play/pause/step HUD instead of keyboard controls.
 */
import React, { useEffect, useMemo, useState } from "react";
import { posKey } from "./types";
import type { Pos, MineMapState } from "./types";
import { MineMapViewer } from "./MineMapViewer";
import { MineGameSprite } from "./MineGameSprite";
import type { Direction } from "./MineGameSprite";
import { useArticleMap } from "./article-store";
import {
  MINE_HUD as HUD,
  MineHudBar,
  MineHudButton as Btn,
  MineVisualFrame,
} from "./MineVisualFrame";

interface Frame {
  path: Pos[];
  player: Pos;
  monster: Pos;
  caption: string;
  /** True when no escape exists. */
  failure?: boolean;
  /** True when the algorithm successfully reached the exit. */
  success?: boolean;
}

interface JointStateNode {
  prev: string | null;
  player: Pos;
  monster: Pos;
}

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

function dirOf(from: Pos, to: Pos): Direction {
  if (to.r < from.r) return "north";
  if (to.r > from.r) return "south";
  if (to.c < from.c) return "west";
  return "east";
}

// ── Joint-state plan ───────────────────────────────────────────────────

function buildJointStateFrames(map: MineMapState, monsterStart: Pos): Frame[] {
  // BFS over (player, monster) states. Player moves first in 4 directions,
  // then the monster takes one BFS step toward the new player position.
  // Win: player == exit. Lose-edge skipped: states where monster catches
  // player are not enqueued.
  const startKey = `${posKey(map.start.r, map.start.c)}|${posKey(monsterStart.r, monsterStart.c)}`;
  const exitKey = posKey(map.exit.r, map.exit.c);
  const parent = new Map<string, JointStateNode>();
  parent.set(startKey, { prev: null, player: map.start, monster: monsterStart });

  let foundKey: string | null = null;
  const queue: string[] = [startKey];
  let head = 0;
  while (head < queue.length) {
    const k = queue[head++];
    const node = parent.get(k)!;
    if (posKey(node.player.r, node.player.c) === exitKey) {
      foundKey = k;
      break;
    }
    for (const [dr, dc] of MOVES) {
      const nr = node.player.r + dr;
      const nc = node.player.c + dc;
      if (!isOpen(map, nr, nc)) continue;
      const newPlayer: Pos = { r: nr, c: nc };
      // Monster reacts.
      const mNext = bfsNextStep(map, node.monster, newPlayer) ?? node.monster;
      // The monster catches the player → skip.
      if (mNext.r === newPlayer.r && mNext.c === newPlayer.c) continue;
      const nk = `${posKey(newPlayer.r, newPlayer.c)}|${posKey(mNext.r, mNext.c)}`;
      if (parent.has(nk)) continue;
      parent.set(nk, { prev: k, player: newPlayer, monster: mNext });
      queue.push(nk);
    }
  }

  const frames: Frame[] = [];
  if (!foundKey) {
    frames.push({
      path: [],
      player: map.start,
      monster: monsterStart,
      caption: "Joint-state BFS · NO ESCAPE exists for this map",
      failure: true,
    });
    return frames;
  }

  // Reconstruct the trajectory.
  const trajectory: Array<{ player: Pos; monster: Pos }> = [];
  let cur: string | null = foundKey;
  while (cur) {
    const node: JointStateNode = parent.get(cur)!;
    trajectory.unshift({ player: node.player, monster: node.monster });
    cur = node.prev;
  }

  const playerPath: Pos[] = [];
  for (let i = 0; i < trajectory.length; i += 1) {
    const t = trajectory[i];
    playerPath.push(t.player);
    frames.push({
      path: [...playerPath],
      player: t.player,
      monster: t.monster,
      caption: `Joint-state plan · step ${i} / ${trajectory.length - 1}`,
      success: i === trajectory.length - 1 ? true : undefined,
    });
  }
  return frames;
}

// ── Component ──────────────────────────────────────────────────────────

interface Props {
  /** Steps per second when playing. */
  fps?: number;
}

export const MonsterPlanVisual: React.FC<Props> = ({ fps = 4 }) => {
  const map = useArticleMap();
  const monsterStart = useMemo(() => resolveMonsterStart(map), [map]);
  const frames = useMemo(
    () => buildJointStateFrames(map, monsterStart),
    [map, monsterStart],
  );
  const displayMap = useMemo(
    () => ({ ...map, monsterStart }),
    [map, monsterStart],
  );

  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(true);
  const stepMs = useMemo(() => Math.max(360, Math.round(1000 / fps)), [fps]);

  useEffect(() => {
    setIndex(0);
    setPlaying(frames.length > 1);
  }, [frames]);

  useEffect(() => {
    if (!playing) return;
    const interval = window.setInterval(
      () =>
        setIndex((i) => {
          if (i >= frames.length - 1) {
            setPlaying(false);
            return i;
          }
          return i + 1;
        }),
      stepMs,
    );
    return () => window.clearInterval(interval);
  }, [playing, frames.length, stepMs]);

  const frame = frames[Math.min(index, frames.length - 1)] ?? null;

  // Sprite facing follows path direction.
  const playerFacing: Direction = useMemo(() => {
    if (!frame || frame.path.length < 2) return "south";
    const a = frame.path[frame.path.length - 2];
    const b = frame.path[frame.path.length - 1];
    return dirOf(a, b);
  }, [frame]);

  const monsterFacingMemo: Direction = useMemo(() => {
    if (!frame || index === 0) return "south";
    const prev = frames[Math.max(0, index - 1)];
    if (!prev) return "south";
    if (prev.monster.r === frame.monster.r && prev.monster.c === frame.monster.c)
      return "south";
    return dirOf(prev.monster, frame.monster);
  }, [frame, frames, index]);

  if (!frame) return null;

  const status =
    frame.success === true
      ? "SUCCESS"
      : frame.failure === true
        ? "FAILURE"
        : "RUNNING";
  const statusColor =
    frame.success === true
      ? HUD.activeText
      : frame.failure === true
        ? "#ff6b6b"
        : HUD.accent;

  return (
    <MineVisualFrame maxWidth={720} margin="1.5rem auto">
      <div style={{ position: "relative" }}>
        <MineMapViewer mapState={displayMap} showMonsterMarker joinHudBottom />

        {/* Sprites. */}
        <MineGameSprite
          kind="miner"
          facing={playerFacing}
          anim={playing ? "walk" : "idle"}
          row={frame.player.r}
          col={frame.player.c}
          rows={map.rows}
          cols={map.cols}
          zIndex={6}
          transitionMs={stepMs}
        />
        <MineGameSprite
          kind="monster"
          facing={monsterFacingMemo}
          anim={playing ? "walk" : "idle"}
          row={frame.monster.r}
          col={frame.monster.c}
          rows={map.rows}
          cols={map.cols}
          zIndex={7}
          transitionMs={stepMs}
        />
      </div>

      {/* HUD */}
      <MineHudBar>
        <Btn
          onClick={() => {
            setIndex(0);
            setPlaying(false);
          }}
          title="Restart"
        >
          ⟲
        </Btn>
        <Btn
          onClick={() => setIndex((i) => Math.max(0, i - 1))}
          disabled={index === 0}
          title="Step back"
        >
          ◀
        </Btn>
        <Btn
          onClick={() => setPlaying((p) => !p)}
          active={playing}
          title={playing ? "Pause" : "Play"}
        >
          {playing ? "❚❚" : "▶"}
        </Btn>
        <Btn
          onClick={() =>
            setIndex((i) => Math.min(frames.length - 1, i + 1))
          }
          disabled={index >= frames.length - 1}
          title="Step forward"
        >
          ▶|
        </Btn>
        <span style={{ color: HUD.muted }}>
          step {index + 1} / {frames.length}
        </span>
        <span
          style={{
            marginLeft: "auto",
            color: statusColor,
            fontWeight: 800,
          }}
        >
          {status}
        </span>
      </MineHudBar>
    </MineVisualFrame>
  );
};

export default MonsterPlanVisual;
