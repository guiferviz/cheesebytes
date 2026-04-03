/**
 * GoldMineSolver.tsx
 *
 * Two-column slide: Python code editor (left) + Phaser-rendered dungeon map (right).
 * The user defines `solve(grid, start, end) -> list[tuple[int,int]]`.
 * Clicking Run executes the code, then calls `solve()` with the grid,
 * painting the returned path on the map using Phaser tilemaps.
 *
 * Each dungeon cell = 2×2 tiles (TL, TR, BL, BR) → square world.
 */

import React, { useState, useCallback, useRef, useEffect } from "react";
import PyodideCodeRunner from "../../PyodideCodeRunner";
import type { Pos } from "../dungeon-escape/types";
import { posKey, MAP_ROWS, MAP_COLS } from "../dungeon-escape/types";
import pyodideContext from "../../../utils/pyodideContext";
import { CheeseSlideContainer } from "../shared";
import {
  buildGridFromGreedyMap,
  type GreedyMineMapState,
  useGreedyMineMap,
} from "./map-state";

const ATLAS_SRC = "/tiles/terrain_atlas.png";
const TS = 32;
const ATLAS_COLS = 32;
const DISPLAY_W = 540;
const DISPLAY_H = 540;

const TILE_COLS = MAP_COLS * 2;
const TILE_ROWS = MAP_ROWS * 2;
const WORLD_W = TILE_COLS * TS;
const WORLD_H = TILE_ROWS * TS;

function isWall(walls: Set<string>, r: number, c: number): boolean {
  if (r < 0 || r >= MAP_ROWS || c < 0 || c >= MAP_COLS) return true;
  return walls.has(posKey(r, c));
}

function tIdx(row: number, col: number): number {
  return row * ATLAS_COLS + col;
}

function tileTL(walls: Set<string>, r: number, c: number): number {
  const wN = isWall(walls, r - 1, c);
  const wW = isWall(walls, r, c - 1);
  if (wN && wW) return tIdx(2, 18);
  if (wN) return tIdx(2, 19);
  if (wW) return tIdx(3, 18);
  if (isWall(walls, r - 1, c - 1)) return tIdx(1, 20);
  return tIdx(3, 19);
}

function tileTR(walls: Set<string>, r: number, c: number): number {
  const wN = isWall(walls, r - 1, c);
  const wE = isWall(walls, r, c + 1);
  if (wN && wE) return tIdx(2, 20);
  if (wN) return tIdx(2, 19);
  if (wE) return tIdx(3, 20);
  if (isWall(walls, r - 1, c + 1)) return tIdx(1, 19);
  return tIdx(3, 19);
}

function tileBL(walls: Set<string>, r: number, c: number): number {
  const wS = isWall(walls, r + 1, c);
  const wW = isWall(walls, r, c - 1);
  if (wS && wW) return tIdx(4, 18);
  if (wS) return tIdx(4, 19);
  if (wW) return tIdx(3, 18);
  if (isWall(walls, r + 1, c - 1)) return tIdx(0, 20);
  return tIdx(3, 19);
}

function tileBR(walls: Set<string>, r: number, c: number): number {
  const wS = isWall(walls, r + 1, c);
  const wE = isWall(walls, r, c + 1);
  if (wS && wE) return tIdx(4, 20);
  if (wS) return tIdx(4, 19);
  if (wE) return tIdx(3, 20);
  if (isWall(walls, r + 1, c + 1)) return tIdx(0, 19);
  return tIdx(3, 19);
}

function buildTilemapData(walls: Set<string>): number[][] {
  const data: number[][] = [];
  for (let r = 0; r < MAP_ROWS; r++) {
    const topRow: number[] = [];
    const botRow: number[] = [];
    for (let c = 0; c < MAP_COLS; c++) {
      if (walls.has(posKey(r, c))) {
        topRow.push(-1, -1);
        botRow.push(-1, -1);
      } else {
        topRow.push(tileTL(walls, r, c), tileTR(walls, r, c));
        botRow.push(tileBL(walls, r, c), tileBR(walls, r, c));
      }
    }
    data.push(topRow);
    data.push(botRow);
  }
  return data;
}

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

interface SceneData {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  scene: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  pathGraphics: any;
}

function cellCenterX(c: number): number {
  return c * 2 * TS + TS;
}
function cellCenterY(r: number): number {
  return r * 2 * TS + TS;
}

export const GoldMineSolver: React.FC = () => {
  const mapState = useGreedyMineMap();
  const [pathCells, setPathCells] = useState<Pos[]>([]);
  const [pathError, setPathError] = useState<string | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const editorRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const gameRef = useRef<any>(null);
  const sceneDataRef = useRef<SceneData | null>(null);
  const mapStateRef = useRef(mapState);
  const pathCellsRef = useRef<Pos[]>([]);
  mapStateRef.current = mapState;
  pathCellsRef.current = pathCells;

  useEffect(() => {
    if (!containerRef.current || gameRef.current) return;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    import("phaser").then((Phaser: any) => {
      class DungeonScene extends Phaser.Scene {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        pathGraphics: any = null;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        floorLayer: any = null;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        floorMap: any = null;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        startGraphics: any = null;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        startLabel: any = null;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        exitGraphics: any = null;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        exitLabel: any = null;

        constructor() {
          super({ key: "DungeonScene" });
        }

        preload() {
          this.load.spritesheet("terrain", ATLAS_SRC, {
            frameWidth: TS,
            frameHeight: TS,
          });
        }

        create() {
          const cam = this.cameras.main;
          cam.setBounds(0, 0, WORLD_W, WORLD_H);
          cam.setRoundPixels(true);
          cam.setZoom(DISPLAY_W / WORLD_W);
          cam.centerOn(WORLD_W / 2, WORLD_H / 2);

          this.pathGraphics = this.add.graphics();
          this.pathGraphics.setDepth(20);

          this.renderMap(mapStateRef.current);

          sceneDataRef.current = {
            scene: this,
            pathGraphics: this.pathGraphics,
          };

          this.drawPath(pathCellsRef.current);
        }

        renderMap(mapState: GreedyMineMapState) {
          this.floorLayer?.destroy();
          this.floorMap?.destroy();
          this.startGraphics?.destroy();
          this.startLabel?.destroy();
          this.exitGraphics?.destroy();
          this.exitLabel?.destroy();

          const tileData = buildTilemapData(mapState.walls);
          this.floorMap = this.make.tilemap({
            data: tileData,
            tileWidth: TS,
            tileHeight: TS,
          });
          const tileset = this.floorMap.addTilesetImage("terrain")!;
          this.floorLayer = this.floorMap.createLayer(0, tileset, 0, 0);
          this.floorLayer.setDepth(0);

          const sx = cellCenterX(mapState.start.c);
          const sy = cellCenterY(mapState.start.r);
          this.startGraphics = this.add.graphics();
          this.startGraphics.setDepth(10);
          this.startGraphics.fillStyle(0x4caf50, 1);
          this.startGraphics.fillCircle(sx, sy, TS * 0.55);
          this.startLabel = this.add
            .text(sx, sy, "S", {
              fontFamily: "monospace",
              fontSize: `${TS * 0.8}px`,
              color: "#ffffff",
              fontStyle: "bold",
            })
            .setOrigin(0.5, 0.5)
            .setDepth(11);

          const ex = cellCenterX(mapState.exit.c);
          const ey = cellCenterY(mapState.exit.r);
          this.exitGraphics = this.add.graphics();
          this.exitGraphics.setDepth(10);
          this.exitGraphics.fillStyle(0xf44336, 1);
          this.exitGraphics.fillCircle(ex, ey, TS * 0.55);
          this.exitLabel = this.add
            .text(ex, ey, "E", {
              fontFamily: "monospace",
              fontSize: `${TS * 0.8}px`,
              color: "#ffffff",
              fontStyle: "bold",
            })
            .setOrigin(0.5, 0.5)
            .setDepth(11);
        }

        drawPath(cells: Pos[]) {
          const g = this.pathGraphics;
          if (!g) return;
          g.clear();
          if (cells.length < 2) return;

          g.lineStyle(6, 0xffa500, 1);
          g.beginPath();
          cells.forEach((p: Pos, i: number) => {
            const px = cellCenterX(p.c);
            const py = cellCenterY(p.r);
            if (i === 0) g.moveTo(px, py);
            else g.lineTo(px, py);
          });
          g.strokePath();
        }
      }

      gameRef.current = new Phaser.Game({
        type: Phaser.AUTO,
        parent: containerRef.current!,
        width: DISPLAY_W,
        height: DISPLAY_H,
        transparent: true,
        scene: DungeonScene,
        render: {
          pixelArt: true,
          antialias: false,
        },
      });
    });

    return () => {
      gameRef.current?.destroy(true);
      gameRef.current = null;
      sceneDataRef.current = null;
      if (containerRef.current) {
        containerRef.current.innerHTML = "";
      }
    };
  }, []);

  useEffect(() => {
    setPathCells([]);
    setPathError(null);
  }, [mapState.version]);

  useEffect(() => {
    const data = sceneDataRef.current;
    if (!data?.scene) return;
    data.scene.renderMap(mapState);
    data.scene.drawPath([]);
  }, [mapState]);

  useEffect(() => {
    const data = sceneDataRef.current;
    if (!data?.scene) return;
    data.scene.drawPath(pathCells);
  }, [pathCells]);

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
          maxWidth: 1100,
          margin: "0 auto",
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

        <div style={{ position: "relative", flexShrink: 0 }}>
          <div
            ref={containerRef}
            style={{
              width: DISPLAY_W,
              height: DISPLAY_H,
              overflow: "hidden",
            }}
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
              Path: {pathCells.length} steps
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
