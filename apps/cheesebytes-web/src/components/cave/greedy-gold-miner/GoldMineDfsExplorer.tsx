import React from "react";
import { GoldMineReplayExplorer } from "./GoldMineReplayExplorer";

const INITIAL_CODE = `def dfs(
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
        if dfs(grid, nxt, end, visited, path):
            return True

    path.pop()
    show_state(visited, path, path[-1] if path else None)
    return False

def solve() -> bool:
    visited: set[Cell] = set()
    path: list[Cell] = []
    return dfs(MINE_MAP, START, END, visited, path)`;

export interface GoldMineDfsExplorerProps {
  maxWidth?: number;
}

export const GoldMineDfsExplorer: React.FC<GoldMineDfsExplorerProps> = ({
  maxWidth = 980,
}) => (
  <GoldMineReplayExplorer
    maxWidth={maxWidth}
    title="DFS exploration"
    vimModeId="gold-mine-dfs"
    vimModeLabel="DFS"
    initialCode={INITIAL_CODE}
  />
);
