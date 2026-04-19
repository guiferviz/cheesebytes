import React from "react";
import { MineReplayExplorer } from "../../pathfinding-gold-mine";

const INITIAL_CODE = `def dfs_backtracking(
    grid: list[str],
    current: Cell,
    end: Cell,
    visited: set[Cell],
    path: list[Cell],
) -> list[Cell]:
    visited.add(current)
    path.append(current)
    show_state(visited, path, current)

    best_path: list[Cell] = []

    if current == end:
        best_path = path.copy()
    else:
        for nxt in neighbors(grid, current):
            if nxt in visited:
                continue
            candidate = dfs_backtracking(grid, nxt, end, visited, path)
            if len(candidate) > len(best_path):
                best_path = candidate

    path.pop()
    visited.remove(current)
    show_state(visited, path, path[-1] if path else None)
    return best_path


def solve() -> None:
    visited: set[Cell] = set()
    path: list[Cell] = []
    best_path = dfs_backtracking(MINE_MAP, START, END, visited, path)
    show_state(None, best_path, None)`;

export const MostGoldBacktrackingExplorer: React.FC = () => (
  <MineReplayExplorer
    title="DFS with backtracking (longest path)"
    vimModeId="most-gold-backtracking"
    vimModeLabel="DFS+BT"
    initialCode={INITIAL_CODE}
  />
);
