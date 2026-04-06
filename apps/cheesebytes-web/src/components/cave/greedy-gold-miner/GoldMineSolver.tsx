/**
 * GoldMineSolver.tsx
 *
 * Two-column slide: Python code editor (left) + shared gold mine viewer (right).
 * The user defines `solve(grid, start, end) -> list[tuple[int,int]]`.
 * Clicking Run executes the code and paints the returned path on the map.
 */

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import PyodideCodeRunner from "../../PyodideCodeRunner";
import type { Pos } from "../dungeon-escape/types";
import pyodideContext from "../../../utils/pyodideContext";
import { CheeseSlideContainer } from "../shared";
import { GoldMineMapViewer } from "./GoldMineMapViewer";
import { buildGridFromGreedyMap, parseRawMap } from "./gold-mine-viewer-shared";
import { mediumMap } from "./maps";

const INITIAL_CODE = `from collections import deque

UP, RIGHT, DOWN, LEFT = (-1,0), (0,1), (1,0), (0,-1)
MOVES = [RIGHT, UP, DOWN, LEFT]

def neighbors(grid, cell):
  rows, cols = len(grid), len(grid[0])
  r, c = cell
  for dr, dc in MOVES:
    nr, nc = r + dr, c + dc
    if grid[nr][nc] != '#':
      yield (nr, nc)

def dfs(grid, start, end, visited):
  if start == end:
    return [end]

  visited.add(start)
  max_result = []

  for i in neighbors(grid, start):
    if i in visited:
      continue

    result = dfs(grid, i, end, visited)

    if result and len(result) + 1 > len(max_result):
      max_result = [start] + result

  visited.remove(start)
  return max_result

def solve(grid, start, end):
  print(start)
  return dfs(grid, start, end, set())
`;

export const GoldMineSolver: React.FC<{ rawMap?: string[] }> = ({
  rawMap = mediumMap,
}) => {
  const mapState = useMemo(() => parseRawMap(rawMap), [rawMap]);
  const [pathCells, setPathCells] = useState<Pos[]>([]);
  const [pathError, setPathError] = useState<string | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const editorRef = useRef<any>(null);

  useEffect(() => {
    setPathCells([]);
    setPathError(null);
  }, [mapState.version]);

  const handleAfterRun = useCallback(async () => {
    setPathError(null);
    try {
      const grid = buildGridFromGreedyMap(mapState);
      await pyodideContext.set("_grid", grid);
      await pyodideContext.set("_start", [mapState.start.r, mapState.start.c]);
      await pyodideContext.set("_end", [mapState.exit.r, mapState.exit.c]);

      await pyodideContext.run(
        "_path_result = solve(_grid, tuple(_start), tuple(_end))",
      );
      const rawPath = await pyodideContext.get("_path_result");

      if (!rawPath || rawPath.length === 0) {
        setPathCells([]);
        setPathError("No path returned");
        return;
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const cells: Pos[] = Array.from(rawPath).map((p: any) => ({
        r: Array.isArray(p) ? p[0] : p.get(0),
        c: Array.isArray(p) ? p[1] : p.get(1),
      }));

      setPathCells(cells);
    } catch (err) {
      setPathCells([]);
      setPathError(String(err));
    }
  }, [mapState]);

  return (
    <CheeseSlideContainer>
      <div
        style={{
          display: "flex",
          gap: 20,
          alignItems: "start",
          maxWidth: 1180,
          margin: "0 auto",
          width: "100%",
        }}
      >
        <div style={{ flex: 1, minWidth: 550 }}>
          <PyodideCodeRunner
            ref={editorRef}
            initialCode={INITIAL_CODE}
            onAfterRun={handleAfterRun}
            initialEditorHeight={520}
          />
        </div>

        <div style={{ position: "relative", flex: "0 0 520px", width: 520 }}>
          <GoldMineMapViewer
            mapState={mapState}
            pathCells={pathCells}
            width={520}
          />

          {pathCells.length > 0 && (
            <div
              style={{
                position: "absolute",
                top: 8,
                right: 8,
                background: "rgba(0,0,0,0.65)",
                color: "#fff",
                padding: "4px 10px",
                borderRadius: 6,
                fontSize: 14,
                fontWeight: 700,
                fontFamily: "monospace",
              }}
            >
              Path: {pathCells.length} cells
            </div>
          )}

          {pathError && (
            <div
              style={{
                position: "absolute",
                bottom: 8,
                left: 8,
                right: 8,
                background: "rgba(239,68,68,0.85)",
                color: "#fff",
                padding: "6px 10px",
                borderRadius: 6,
                fontSize: 13,
                fontFamily: "monospace",
                whiteSpace: "pre-wrap",
                maxHeight: 80,
                overflowY: "auto",
              }}
            >
              {pathError}
            </div>
          )}
        </div>
      </div>
    </CheeseSlideContainer>
  );
};
