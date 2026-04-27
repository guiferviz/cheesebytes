import React from "react";
import { MineReplayExplorer } from "../../pathfinding-gold-mine";

const INITIAL_CODE = `def dfs_iterative(
    grid: list[str],
    start: Cell,
    end: Cell,
) -> list[Cell]:
    stack: list[Cell] = [start]
    visited: set[Cell] = {start}
    parent: dict[Cell, Cell] = {}

    while stack:
        current = stack.pop()
        path = reconstruct(parent, start, current)
        show_state(visited, path, current)

        if current == end:
            return path

        for nxt in neighbors(grid, current):
            if nxt in visited:
                continue

            visited.add(nxt)
            parent[nxt] = current
            stack.append(nxt)

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
    path = dfs_iterative(MINE_MAP, START, END)
    show_state(None, path, None)`;

export const DfsIterativeFirstPathExplorer: React.FC = () => (
  <MineReplayExplorer
    title="Depth-first search (iterative stack)"
    vimModeId="mine-dfs-iterative-first-path"
    vimModeLabel="DFS Stack"
    initialCode={INITIAL_CODE}
  />
);
