import React, { useEffect, useMemo, useRef, useState } from "react";
import "./goldmine-theme.css";
import type { Pos, MineMapState } from "./types";
import {
  ATLAS_SRC,
  GOLD_SPECKS,
  TS,
  buildTilemapData,
  cellCenterX,
  cellCenterY,
} from "./mine-viewer-shared";

interface MineMapViewerProps {
  mapState: MineMapState;
  pathCells?: Pos[];
  showGoldSpecks?: boolean;
  showMonsterMarker?: boolean;
  width?: string | number;
  height?: string | number;
  maxWidth?: string | number;
  border?: string;
  joinHudBottom?: boolean;
  children?: React.ReactNode;
}

interface SceneHandle {
  renderMap: (mapState: MineMapState) => void;
  drawPath: (cells: Pos[]) => void;
}

export const MineMapViewer: React.FC<MineMapViewerProps> = ({
  mapState,
  pathCells = [],
  showGoldSpecks = true,
  showMonsterMarker = false,
  width = "100%",
  height,
  maxWidth = "100%",
  border = "2px solid var(--goldmine-hud-border, #d4a574)",
  joinHudBottom = false,
  children,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<unknown>(null);
  const sceneRef = useRef<SceneHandle | null>(null);
  const mapStateRef = useRef(mapState);
  const pathRef = useRef(pathCells);
  const showGoldSpecksRef = useRef(showGoldSpecks);
  const showMonsterMarkerRef = useRef(showMonsterMarker);
  const [isDark, setIsDark] = useState(
    () =>
      typeof document !== "undefined" &&
      document.documentElement.classList.contains("dark"),
  );

  mapStateRef.current = mapState;
  pathRef.current = pathCells;
  showGoldSpecksRef.current = showGoldSpecks;
  showMonsterMarkerRef.current = showMonsterMarker;

  useEffect(() => {
    const observer = new MutationObserver(() => {
      setIsDark(document.documentElement.classList.contains("dark"));
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });

    return () => observer.disconnect();
  }, []);

  const worldWidth = useMemo(() => mapState.cols * 2 * TS, [mapState.cols]);
  const worldHeight = useMemo(() => mapState.rows * 2 * TS, [mapState.rows]);
  const aspect = useMemo(
    () => mapState.cols / mapState.rows,
    [mapState.cols, mapState.rows],
  );
  const viewerBackgroundColor = isDark ? "#05070a" : "#fff7ed";

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
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        monsterGraphics: any = null;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        monsterLabel: any = null;

        constructor() {
          super({ key: "MineMapViewerScene" });
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

        renderMap(nextMapState: MineMapState) {
          this.floorLayer?.destroy();
          this.floorMap?.destroy();
          this.goldGraphics?.clear();
          this.startGraphics?.destroy();
          this.startLabel?.destroy();
          this.exitGraphics?.destroy();
          this.exitLabel?.destroy();
          this.monsterGraphics?.destroy();
          this.monsterLabel?.destroy();

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

          if (showMonsterMarkerRef.current && nextMapState.monsterStart) {
            const mx = cellCenterX(nextMapState.monsterStart.c);
            const my = cellCenterY(nextMapState.monsterStart.r);
            this.monsterGraphics = this.add.graphics().setDepth(10);
            this.monsterGraphics.fillStyle(0x4b1d6b, 1);
            this.monsterGraphics.fillCircle(mx, my, TS * 0.55);
            this.monsterLabel = this.add
              .text(mx, my, "M", {
                fontFamily: "monospace",
                fontSize: `${TS * 0.8}px`,
                color: "#ffffff",
                fontStyle: "bold",
              })
              .setOrigin(0.5, 0.5)
              .setDepth(11);
          }
        }

        drawPath(cells: Pos[]) {
          this.pathGraphics?.clear();
          if (!cells || cells.length === 0) return;
          this.pathGraphics.lineStyle(6, 0xffa500, 0.85);
          this.pathGraphics.beginPath();
          cells.forEach((cell, i) => {
            const px = cellCenterX(cell.c);
            const py = cellCenterY(cell.r);
            if (i === 0) this.pathGraphics.moveTo(px, py);
            else this.pathGraphics.lineTo(px, py);
          });
          this.pathGraphics.strokePath();
        }
      }

      const game = new Phaser.Game({
        type: Phaser.AUTO,
        parent: containerRef.current!,
        width: worldWidth,
        height: worldHeight,
        backgroundColor: viewerBackgroundColor,
        scene: [MineMapScene],
        scale: { mode: Phaser.Scale.NONE },
        render: { pixelArt: true, antialias: false, roundPixels: true },
        audio: { disableWebAudio: true },
        input: { keyboard: false, mouse: false, touch: false },
      });

      gameRef.current = game;
    });

    return () => {
      alive = false;
      sceneRef.current = null;
      if (gameRef.current) {
        (gameRef.current as { destroy: (arg: boolean) => void }).destroy(true);
        gameRef.current = null;
      }
    };
  }, [worldWidth, worldHeight, viewerBackgroundColor]);

  useEffect(() => {
    sceneRef.current?.renderMap(mapState);
  }, [mapState]);

  useEffect(() => {
    sceneRef.current?.drawPath(pathCells);
  }, [pathCells]);

  return (
    <div style={{ width, maxWidth, boxSizing: "border-box" as const }}>
      <style>{`.mine-map-viewer canvas { width: 100% !important; height: 100% !important; display: block; object-fit: contain; }`}</style>
      <div
        style={{
          position: "relative",
          aspectRatio: height ? undefined : `${aspect}`,
          height: height ?? "auto",
          border,
          borderBottom: joinHudBottom ? "none" : border,
          background: viewerBackgroundColor,
          boxSizing: "border-box",
        }}
      >
        <div
          ref={containerRef}
          className="mine-map-viewer"
          style={{ width: "100%", height: "100%", overflow: "hidden" }}
        />
        {children}
      </div>
    </div>
  );
};
