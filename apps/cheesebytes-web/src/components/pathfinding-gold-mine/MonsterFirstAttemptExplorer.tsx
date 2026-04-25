import React from "react";
import { MineReplayExplorer } from "./MineReplayExplorer";

const INITIAL_CODE = `from collections import deque

def monster_next_step(
    grid: list[str],
    start: Cell,
    target: Cell,
) -> Cell:
    if start == target:
        return start

    queue: deque[Cell] = deque([start])
    parent = {start: None}

    while queue:
        current = queue.popleft()
        if current == target:
            step = current
            while parent[step] is not None and parent[step] != start:
                step = parent[step]
            return step

        for nxt in neighbors(grid, current):
            if nxt in parent:
                continue
            parent[nxt] = current
            queue.append(nxt)

    return start


def reconstruct(
    parent: dict[Cell, Cell],
    start: Cell,
    end: Cell,
) -> list[Cell]:
    path = [end]
    while path[-1] != start:
        path.append(parent[path[-1]])
    path.reverse()
    return path


def first_attempt_bfs(
    grid: list[str],
    start: Cell,
    end: Cell,
    monster_start: Cell,
) -> list[Cell]:
    queue: deque[Cell] = deque([start])
    visited: set[Cell] = {start}
    parent: dict[Cell, Cell] = {}
    monster_at: dict[Cell, Cell] = {start: monster_start}

    while queue:
        current = queue.popleft()
        monster = monster_at[current]
        path = reconstruct(parent, start, current)
        show_state(visited, path, current, monster)

        if current == end:
            return path

        for nxt in neighbors(grid, current):
            if nxt in visited:
                continue

            next_monster = monster_next_step(grid, monster, nxt)
            candidate_path = path + [nxt]
            caught = next_monster == nxt

            show_state(
                visited,
                candidate_path,
                nxt,
                next_monster,
                discarded=caught,
            )

            if caught:
                continue

            visited.add(nxt)
            parent[nxt] = current
            monster_at[nxt] = next_monster
            queue.append(nxt)

    return []


def solve() -> None:
    path = first_attempt_bfs(
        MINE_MAP,
        START,
        END,
        MONSTER_START,
    )
    show_state(None, path, None, None)`;

export const MonsterFirstAttemptExplorer: React.FC = () => (
  <MineReplayExplorer
    title="First attempt: BFS with a chasing monster"
    vimModeId="mine-monster-first-attempt"
    vimModeLabel="Monster BFS"
    initialCode={INITIAL_CODE}
  />
);

export default MonsterFirstAttemptExplorer;
