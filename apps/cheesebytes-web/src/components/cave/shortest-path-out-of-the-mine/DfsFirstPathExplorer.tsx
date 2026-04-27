import React from "react";
import { MineReplayExplorer } from "../../pathfinding-gold-mine";

const INITIAL_CODE = `def dfs(
    grid: list[str],
    current: Cell,
    end: Cell,
    visited: set[Cell],
    path: list[Cell],
) -> list[Cell] | None:
    visited.add(current)
    path.append(current)
    show_state(visited, path, current)

    if current == end:
        return path.copy()

    for nxt in neighbors(grid, current):
        if nxt in visited:
            continue
        result = dfs(grid, nxt, end, visited, path)
        if result:
            return result

    path.pop()
    show_state(visited, path, path[-1] if path else None)
    return None


def solve() -> None:
    visited: set[Cell] = set()
    path = dfs(MINE_MAP, START, END, visited, [])
    show_state(None, path, None)`;

export const DfsFirstPathExplorer: React.FC = () => (
  <MineReplayExplorer
    title="Depth-first search (first path found)"
    vimModeId="mine-dfs-first-path"
    vimModeLabel="DFS"
    initialCode={INITIAL_CODE}
  />
);
