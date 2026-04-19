import React from "react";
import { MineReplayExplorer } from "../../pathfinding-gold-mine";

const INITIAL_CODE = `from collections import deque

def bfs(
    grid: list[str],
    start: Cell,
    end: Cell,
) -> list[Cell]:
    queue: deque[Cell] = deque([start])
    visited: set[Cell] = {start}
    parent: dict[Cell, Cell] = {}

    while queue:
        current = queue.popleft()
        path = reconstruct(parent, start, current)
        show_state(visited, path, current)

        if current == end:
            return path

        for nxt in neighbors(grid, current):
            if nxt in visited:
                continue
            visited.add(nxt)
            parent[nxt] = current
            queue.append(nxt)

    return []


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


def solve() -> None:
    path = bfs(MINE_MAP, START, END)
    show_state(None, path, None)`;

export const BfsShortestPathExplorer: React.FC = () => (
  <MineReplayExplorer
    title="Breadth-first search (shortest path)"
    vimModeId="mine-bfs-shortest"
    vimModeLabel="BFS"
    initialCode={INITIAL_CODE}
  />
);
