import React from "react";
import { MineReplayExplorer } from "../../pathfinding-gold-mine";

const INITIAL_CODE = `from collections import deque

def bfs_shortest_path(
    grid: list[str],
    start: Cell,
    end: Cell,
) -> list[Cell]:
    """Return the shortest path from start to end (or [] if unreachable)."""
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
    path = bfs_shortest_path(MINE_MAP, START, END)
    show_state(None, path, None)`;

export interface BfsShortestPathExplorerProps {
  maxWidth?: number;
}

export const BfsShortestPathExplorer: React.FC<BfsShortestPathExplorerProps> = ({
  maxWidth = 980,
}) => (
  <MineReplayExplorer
    maxWidth={maxWidth}
    title="Breadth-first search (shortest path)"
    vimModeId="mine-bfs-shortest"
    vimModeLabel="BFS"
    initialCode={INITIAL_CODE}
  />
);
