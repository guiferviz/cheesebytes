import React, { useEffect, useMemo, useRef } from "react";
import type { Pos } from "../dungeon-escape/types";
import type { GreedyMineMapState } from "./gold-mine-viewer-shared";
import {
  ATLAS_SRC,
  GOLD_SPECKS,
  TS,
  buildTilemapData,
  cellCenterX,
  cellCenterY,
} from "./gold-mine-viewer-shared";

interface GoldMineMapViewerProps {
  mapState: GreedyMineMapState;
  pathCells?: Pos[];
  showGoldSpecks?: boolean;
  width?: string | number;
  height?: string | number;
  maxWidth?: string | number;
  joinHudBottom?: boolean;
}

interface SceneHandle {
  renderMap: (mapState: GreedyMineMapState) => void;
  drawPath: (cells: Pos[]) => void;
}

export const GoldMineMapViewer: React.FC<GoldMineMapViewerProps> = ({
  mapState,
  pathCells = [],
  showGoldSpecks = true,
  width = "100%",
  height,
  maxWidth = "100%",
  joinHudBottom = false,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<unknown>(null);
  const sceneRef = useRef<SceneHandle | null>(null);
  const mapStateRef = useRef(mapState);
  const pathRef = useRef(pathCells);
  const showGoldSpecksRef = useRef(showGoldSpecks);

  mapStateRef.current = mapState;
  pathRef.current = pathCells;
  showGoldSpecksRef.current = showGoldSpecks;

  const worldWidth = useMemo(() => mapState.cols * 2 * TS, [mapState.cols]);
  const worldHeight = useMemo(() => mapState.rows * 2 * TS, [mapState.rows]);
  const aspect = useMemo(
    () => mapState.cols / mapState.rows,
    [mapState.cols, mapState.rows],
  );

  useEffect(() => {
    if (!containerRef.current) return;

    let alive = true;

    import("phaser").then((Phaser) => {
      if (!alive || !containerRef.current) return;

      class MineMapScene extends Phaser.Scene {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        pathGraphics: any = null;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        floorLayer: any = null;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        floorMap: any = null;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        goldGraphics: any = null;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        startGraphics: any = null;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        startLabel: any = null;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        exitGraphics: any = null;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        exitLabel: any = null;

        constructor() {
          super({ key: "GoldMineMapViewerScene" });
        }

        preload() {
          this.load.spritesheet("terrain", ATLAS_SRC, {
            frameWidth: TS,
            frameHeight: TS,
          });
        }

        create() {
          const cam = this.cameras.main;
          cam.setBounds(0, 0, worldWidth, worldHeight);
          cam.setRoundPixels(true);
          cam.centerOn(worldWidth / 2, worldHeight / 2);

          this.pathGraphics = this.add.graphics();
          this.pathGraphics.setDepth(20);
          this.goldGraphics = this.add.graphics();
          this.goldGraphics.setDepth(3);

          this.renderMap(mapStateRef.current);
          this.drawPath(pathRef.current);

          sceneRef.current = {
            renderMap: (nextMapState) => this.renderMap(nextMapState),
            drawPath: (cells) => this.drawPath(cells),
          };
        }

        renderMap(nextMapState: GreedyMineMapState) {
          this.floorLayer?.destroy();
          this.floorMap?.destroy();
          this.goldGraphics?.clear();
          this.startGraphics?.destroy();
          this.startLabel?.destroy();
          this.exitGraphics?.destroy();
          this.exitLabel?.destroy();

          const tileData = buildTilemapData(nextMapState);
          this.floorMap = this.make.tilemap({
            data: tileData,
            tileWidth: TS,
            tileHeight: TS,
          });

          const tileset = this.floorMap.addTilesetImage("terrain");
          if (!tileset) return;

          this.floorLayer = this.floorMap.createLayer(0, tileset, 0, 0);
          this.floorLayer.setDepth(0);

          if (showGoldSpecksRef.current) {
            for (let r = 0; r < nextMapState.rows; r += 1) {
              for (let c = 0; c < nextMapState.cols; c += 1) {
                if (nextMapState.walls.has(`${r},${c}`)) continue;
                const x = cellCenterX(c);
                const y = cellCenterY(r);
                for (const speck of GOLD_SPECKS) {
                  this.goldGraphics.fillStyle(speck.color, speck.alpha);
                  this.goldGraphics.fillCircle(
                    x + speck.dx,
                    y + speck.dy,
                    speck.radius,
                  );
                }
              }
            }
          }

          const sx = cellCenterX(nextMapState.start.c);
          const sy = cellCenterY(nextMapState.start.r);
          this.startGraphics = this.add.graphics().setDepth(10);
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

          const ex = cellCenterX(nextMapState.exit.c);
          const ey = cellCenterY(nextMapState.exit.r);
          this.exitGraphics = this.add.graphics().setDepth(10);
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
          if (!this.pathGraphics) return;
          this.pathGraphics.clear();
          if (cells.length < 2) return;

          this.pathGraphics.lineStyle(8, 0xffb703, 0.95);
          this.pathGraphics.beginPath();
          cells.forEach((cell, index) => {
            const px = cellCenterX(cell.c);
            const py = cellCenterY(cell.r);
            if (index === 0) this.pathGraphics.moveTo(px, py);
            else this.pathGraphics.lineTo(px, py);
          });
          this.pathGraphics.strokePath();

          this.pathGraphics.fillStyle(0xffe29a, 0.95);
          for (const cell of cells.slice(1, -1)) {
            this.pathGraphics.fillCircle(
              cellCenterX(cell.c),
              cellCenterY(cell.r),
              5,
            );
          }
        }
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      gameRef.current = new (Phaser as any).Game({
        type: Phaser.AUTO,
        parent: containerRef.current,
        width: worldWidth,
        height: worldHeight,
        backgroundColor: "#05070a",
        scene: MineMapScene,
        scale: { mode: Phaser.Scale.NONE },
        render: { pixelArt: true, antialias: false, roundPixels: true },
      });
    });

    return () => {
      alive = false;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (gameRef.current as any)?.destroy?.(true);
      gameRef.current = null;
      sceneRef.current = null;
      if (containerRef.current) containerRef.current.innerHTML = "";
    };
  }, [worldHeight, worldWidth]);

  useEffect(() => {
    sceneRef.current?.renderMap(mapState);
    sceneRef.current?.drawPath(pathCells);
  }, [mapState, pathCells]);

  return (
    <>
      <style>{`
        .gold-mine-map-viewer canvas {
          width: 100% !important;
          height: 100% !important;
          display: block;
          object-fit: contain;
        }
      `}</style>
      <div
        style={{
          width,
          height,
          maxWidth,
          maxHeight: "100%",
          margin: "0 auto",
          boxSizing: "border-box",
        }}
      >
        <div
          style={{
            position: "relative",
            width: "100%",
            height: height ?? "auto",
            maxHeight: "100%",
            aspectRatio: height ? undefined : `${aspect}`,
            overflow: "hidden",
            borderRadius: joinHudBottom ? "10px 10px 0 0" : 12,
            border: "2px solid #5a422e",
            borderBottom: joinHudBottom ? "none" : "2px solid #5a422e",
            background: "#05070a",
            boxShadow: "0 12px 30px rgba(0, 0, 0, 0.28)",
            boxSizing: "border-box",
            marginBottom: joinHudBottom ? 0 : 2,
          }}
        >
          <div
            ref={containerRef}
            className="gold-mine-map-viewer"
            style={{ width: "100%", height: "100%" }}
          />
        </div>
      </div>
    </>
  );
};
