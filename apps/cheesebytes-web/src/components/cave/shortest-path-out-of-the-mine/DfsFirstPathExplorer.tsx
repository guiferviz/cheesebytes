import React from "react";
import { MineReplayExplorer } from "../../pathfinding-gold-mine";

const INITIAL_CODE = `def dfs_first_path(
    grid: list[str],
    current: Cell,
    end: Cell,
    visited: set[Cell],
    path: list[Cell],
) -> bool:
    visited.add(current)
    path.append(current)
    show_state(visited, path, current)

    if current == end:
        return True

    for nxt in neighbors(grid, current):
        if nxt in visited:
            continue
        if dfs_first_path(grid, nxt, end, visited, path):
            return True

    path.pop()
    show_state(visited, path, path[-1] if path else None)
    return False


def solve() -> None:
    visited: set[Cell] = set()
    path: list[Cell] = []
    dfs_first_path(MINE_MAP, START, END, visited, path)
    show_state(None, path, None)`;

export interface DfsFirstPathExplorerProps {
  maxWidth?: number;
}

export const DfsFirstPathExplorer: React.FC<DfsFirstPathExplorerProps> = ({
  maxWidth = 980,
}) => (
  <MineReplayExplorer
    maxWidth={maxWidth}
    title="Depth-first search (first path found)"
    vimModeId="mine-dfs-first-path"
    vimModeLabel="DFS"
    initialCode={INITIAL_CODE}
  />
);
