import React, { useEffect, useRef, useState } from "react";
import {
  posKey,
  WALLS,
  START,
  EXIT,
  MAP_ROWS,
  MAP_COLS,
} from "../dungeon-escape/types";
import { CheeseSlideContainer } from "../shared";

type Direction = "north" | "south" | "east" | "west";
type GameStatus = "playing" | "won" | "lost";

interface Pos {
  r: number;
  c: number;
}

interface SceneController {
  move: (direction: Direction) => void;
}

interface CellDecor {
  specks: any[];
  collapsedOverlay: any;
}

const ATLAS_SRC = "/tiles/terrain_atlas.png";
const SPRITE_SHEET = "/cave/greedy-gold-miner/gold-miner-walk.png";
const TS = 32;
const ATLAS_COLS = 32;
const DISPLAY_W = 620;
const DISPLAY_H = 620;
const TILE_COLS = MAP_COLS * 2;
const TILE_ROWS = MAP_ROWS * 2;
const WORLD_W = TILE_COLS * TS;
const WORLD_H = TILE_ROWS * TS;
const DIRECTION_DELTAS: Record<Direction, Pos> = {
  north: { r: -1, c: 0 },
  south: { r: 1, c: 0 },
  east: { r: 0, c: 1 },
  west: { r: 0, c: -1 },
};
const ANIMATION_ROWS: Record<Direction, number> = {
  south: 0,
  west: 1,
  east: 2,
  north: 3,
};

function isWall(r: number, c: number): boolean {
  if (r < 0 || r >= MAP_ROWS || c < 0 || c >= MAP_COLS) return true;
  return WALLS.has(posKey(r, c));
}

function tIdx(row: number, col: number): number {
  return row * ATLAS_COLS + col;
}

function tileTL(r: number, c: number): number {
  const wN = isWall(r - 1, c);
  const wW = isWall(r, c - 1);
  if (wN && wW) return tIdx(2, 18);
  if (wN) return tIdx(2, 19);
  if (wW) return tIdx(3, 18);
  if (isWall(r - 1, c - 1)) return tIdx(1, 20);
  return tIdx(3, 19);
}

function tileTR(r: number, c: number): number {
  const wN = isWall(r - 1, c);
  const wE = isWall(r, c + 1);
  if (wN && wE) return tIdx(2, 20);
  if (wN) return tIdx(2, 19);
  if (wE) return tIdx(3, 20);
  if (isWall(r - 1, c + 1)) return tIdx(1, 19);
  return tIdx(3, 19);
}

function tileBL(r: number, c: number): number {
  const wS = isWall(r + 1, c);
  const wW = isWall(r, c - 1);
  if (wS && wW) return tIdx(4, 18);
  if (wS) return tIdx(4, 19);
  if (wW) return tIdx(3, 18);
  if (isWall(r + 1, c - 1)) return tIdx(0, 20);
  return tIdx(3, 19);
}

function tileBR(r: number, c: number): number {
  const wS = isWall(r + 1, c);
  const wE = isWall(r, c + 1);
  if (wS && wE) return tIdx(4, 20);
  if (wS) return tIdx(4, 19);
  if (wE) return tIdx(3, 20);
  if (isWall(r + 1, c + 1)) return tIdx(0, 19);
  return tIdx(3, 19);
}

function buildTilemapData(): number[][] {
  const data: number[][] = [];
  for (let r = 0; r < MAP_ROWS; r += 1) {
    const topRow: number[] = [];
    const bottomRow: number[] = [];
    for (let c = 0; c < MAP_COLS; c += 1) {
      if (WALLS.has(posKey(r, c))) {
        topRow.push(-1, -1);
        bottomRow.push(-1, -1);
      } else {
        topRow.push(tileTL(r, c), tileTR(r, c));
        bottomRow.push(tileBL(r, c), tileBR(r, c));
      }
    }
    data.push(topRow, bottomRow);
  }
  return data;
}

function cellCenterX(c: number): number {
  return c * 2 * TS + TS;
}

function cellCenterY(r: number): number {
  return r * 2 * TS + TS;
}

function worldToTileCell(pos: Pos): { tx: number; ty: number } {
  return { tx: pos.c * 2, ty: pos.r * 2 };
}

function animationKey(direction: Direction): string {
  return `gold-miner-${direction}`;
}

function idleFrame(direction: Direction): number {
  return ANIMATION_ROWS[direction] * 6;
}

function isWalkable(pos: Pos, collapsed: Set<string>): boolean {
  if (pos.r < 0 || pos.r >= MAP_ROWS || pos.c < 0 || pos.c >= MAP_COLS)
    return false;
  if (WALLS.has(posKey(pos.r, pos.c))) return false;
  return !collapsed.has(posKey(pos.r, pos.c));
}

function availableMoves(pos: Pos, collapsed: Set<string>): Direction[] {
  return (Object.keys(DIRECTION_DELTAS) as Direction[]).filter((direction) => {
    const delta = DIRECTION_DELTAS[direction];
    return isWalkable({ r: pos.r + delta.r, c: pos.c + delta.c }, collapsed);
  });
}

function directionFromKey(code: string): Direction | null {
  if (code === "ArrowUp" || code === "KeyW") return "north";
  if (code === "ArrowDown" || code === "KeyS") return "south";
  if (code === "ArrowLeft" || code === "KeyA") return "west";
  if (code === "ArrowRight" || code === "KeyD") return "east";
  return null;
}

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tagName = target.tagName;
  return (
    target.isContentEditable ||
    tagName === "INPUT" ||
    tagName === "TEXTAREA" ||
    tagName === "SELECT"
  );
}

function isCurrentRevealSectionActive(element: HTMLElement | null): boolean {
  const section = element?.closest("section");
  return section?.classList.contains("present") ?? false;
}

export const GoldMineGame: React.FC = () => {
  const rootRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<any>(null);
  const sceneControllerRef = useRef<SceneController | null>(null);
  const [runId, setRunId] = useState(0);
  const [gold, setGold] = useState(0);
  const [bestGold, setBestGold] = useState(0);
  const [status, setStatus] = useState<GameStatus>("playing");
  const [message, setMessage] = useState(
    "Cada paso da 1 de oro. El suelo que abandonas colapsa y desaparece.",
  );

  useEffect(() => {
    setGold(0);
    setStatus("playing");
    setMessage(
      "Cada paso da 1 de oro. El suelo que abandonas colapsa y desaparece.",
    );
  }, [runId]);

  useEffect(() => {
    const handleKeyDownCapture = (event: KeyboardEvent) => {
      const direction = directionFromKey(event.code);
      if (!direction) return;
      if (isEditableTarget(event.target)) return;
      if (!isCurrentRevealSectionActive(rootRef.current)) return;

      event.preventDefault();
      event.stopPropagation();
      sceneControllerRef.current?.move(direction);
    };

    document.addEventListener("keydown", handleKeyDownCapture, true);
    return () => {
      document.removeEventListener("keydown", handleKeyDownCapture, true);
    };
  }, []);

  useEffect(() => {
    if (!containerRef.current) return;

    let mounted = true;

    import("phaser").then((PhaserModule) => {
      if (!mounted || !containerRef.current) return;

      const Phaser = PhaserModule.default ?? PhaserModule;
      const tileData = buildTilemapData();

      class GoldMineScene extends Phaser.Scene {
        floorLayer: any;
        miner: any;
        collapsed = new Set<string>();
        currentPos: Pos = { ...START };
        moving = false;
        currentGold = 0;
        decor = new Map<string, CellDecor>();
        idleTween: any = null;
        status: GameStatus = "playing";

        constructor() {
          super({ key: `GoldMineGame-${runId}` });
        }

        preload() {
          this.load.spritesheet("terrain", ATLAS_SRC, {
            frameWidth: TS,
            frameHeight: TS,
          });
          this.load.spritesheet("gold-miner", SPRITE_SHEET, {
            frameWidth: 48,
            frameHeight: 48,
          });
        }

        create() {
          this.cameras.main.setBounds(0, 0, WORLD_W, WORLD_H);
          this.cameras.main.setBackgroundColor("#05070a");
          this.cameras.main.setZoom(1.8);
          this.cameras.main.roundPixels = true;

          const map = this.make.tilemap({
            data: tileData,
            tileWidth: TS,
            tileHeight: TS,
          });
          const tileset = map.addTilesetImage("terrain")!;
          this.floorLayer = map.createLayer(0, tileset, 0, 0);

          this.drawGoldSpecks();
          this.createMarkers();
          this.createAnimations();
          this.createMiner();
          this.registerControls();

          sceneControllerRef.current = {
            move: (direction: Direction) => this.tryMove(direction),
          };
        }

        drawGoldSpecks() {
          for (let r = 0; r < MAP_ROWS; r += 1) {
            for (let c = 0; c < MAP_COLS; c += 1) {
              const key = posKey(r, c);
              if (WALLS.has(key)) continue;

              const x = cellCenterX(c);
              const y = cellCenterY(r);
              const specks = [
                this.add.circle(x - 7, y - 4, 2.1, 0xffd166, 0.95),
                this.add.circle(x + 5, y + 6, 1.8, 0xf4a261, 0.85),
                this.add.circle(x + 1, y - 8, 1.5, 0xffe29a, 0.9),
              ];
              specks.forEach((speck) => speck.setDepth(3));

              const collapsedOverlay = this.add.rectangle(
                x,
                y,
                TS * 2,
                TS * 2,
                0x040608,
                0.92,
              );
              collapsedOverlay.setDepth(4);
              collapsedOverlay.setVisible(false);

              this.decor.set(key, { specks, collapsedOverlay });
            }
          }
        }

        createMarkers() {
          const sx = cellCenterX(START.c);
          const sy = cellCenterY(START.r);
          this.add.circle(sx, sy, TS * 0.55, 0x4caf50, 1).setDepth(5);
          this.add
            .text(sx, sy, "S", {
              fontFamily: "monospace",
              fontSize: `${TS * 0.8}px`,
              color: "#ffffff",
              fontStyle: "bold",
            })
            .setOrigin(0.5)
            .setDepth(6);

          const ex = cellCenterX(EXIT.c);
          const ey = cellCenterY(EXIT.r);
          const exitCircle = this.add.circle(ex, ey, TS * 0.55, 0xf44336, 1);
          exitCircle.setDepth(5);
          this.tweens.add({
            targets: exitCircle,
            alpha: 0.5,
            scale: 1.15,
            duration: 900,
            yoyo: true,
            repeat: -1,
          });
          this.add
            .text(ex, ey, "E", {
              fontFamily: "monospace",
              fontSize: `${TS * 0.8}px`,
              color: "#ffffff",
              fontStyle: "bold",
            })
            .setOrigin(0.5)
            .setDepth(6);
        }

        createAnimations() {
          (Object.keys(ANIMATION_ROWS) as Direction[]).forEach((direction) => {
            const key = animationKey(direction);
            if (this.anims.exists(key)) return;
            const start = ANIMATION_ROWS[direction] * 6;
            this.anims.create({
              key,
              frames: this.anims.generateFrameNumbers("gold-miner", {
                start,
                end: start + 5,
              }),
              frameRate: 12,
              repeat: -1,
            });
          });
        }

        createMiner() {
          const x = cellCenterX(START.c);
          const y = cellCenterY(START.r);
          this.miner = this.add.sprite(x, y, "gold-miner", idleFrame("south"));
          this.miner.setScale(1.25);
          this.miner.setDepth(10);
          this.cameras.main.startFollow(this.miner, true, 0.12, 0.12);
          this.startIdleFloat();
        }

        startIdleFloat() {
          this.idleTween?.stop();
          this.idleTween = this.tweens.add({
            targets: this.miner,
            y: this.miner.y - 2,
            duration: 700,
            yoyo: true,
            repeat: -1,
          });
        }

        registerControls() {
          this.input.keyboard?.on("keydown", (event: KeyboardEvent) => {
            const direction = directionFromKey(event.code);
            if (!direction) return;
            event.preventDefault();
            event.stopPropagation();
            this.tryMove(direction);
          });
        }

        tryMove(direction: Direction) {
          if (this.moving || this.status !== "playing") return;

          const delta = DIRECTION_DELTAS[direction];
          const next = {
            r: this.currentPos.r + delta.r,
            c: this.currentPos.c + delta.c,
          };
          if (!isWalkable(next, this.collapsed)) {
            this.cameras.main.shake(70, 0.002);
            return;
          }

          this.moving = true;
          this.idleTween?.stop();
          this.miner.play(animationKey(direction), true);
          const previous = { ...this.currentPos };
          const targetX = cellCenterX(next.c);
          const targetY = cellCenterY(next.r);

          this.tweens.add({
            targets: this.miner,
            x: targetX,
            y: targetY,
            duration: 160,
            ease: "Quad.Out",
            onComplete: () => {
              this.miner.stop();
              this.miner.setFrame(idleFrame(direction));
              this.currentPos = next;
              this.currentGold += 1;
              setGold(this.currentGold);
              this.collapseCell(previous);
              this.showGoldGain(targetX, targetY - 22);
              this.startIdleFloat();
              this.moving = false;
              this.evaluateState();
            },
          });
        }

        collapseCell(pos: Pos) {
          const key = posKey(pos.r, pos.c);
          this.collapsed.add(key);

          const cell = worldToTileCell(pos);
          this.floorLayer.putTileAt(-1, cell.tx, cell.ty);
          this.floorLayer.putTileAt(-1, cell.tx + 1, cell.ty);
          this.floorLayer.putTileAt(-1, cell.tx, cell.ty + 1);
          this.floorLayer.putTileAt(-1, cell.tx + 1, cell.ty + 1);

          const decor = this.decor.get(key);
          decor?.specks.forEach((speck) => speck.setVisible(false));
          decor?.collapsedOverlay.setVisible(true);
        }

        showGoldGain(x: number, y: number) {
          const label = this.add.text(x, y, "+1", {
            fontFamily: "monospace",
            fontSize: "18px",
            color: "#ffd166",
            fontStyle: "bold",
          });
          label.setOrigin(0.5).setDepth(20);
          this.tweens.add({
            targets: label,
            y: y - 16,
            alpha: 0,
            duration: 350,
            onComplete: () => label.destroy(),
          });
        }

        evaluateState() {
          if (this.currentPos.r === EXIT.r && this.currentPos.c === EXIT.c) {
            this.status = "won";
            setStatus("won");
            setBestGold((current) => Math.max(current, this.currentGold));
            setMessage(
              `Has escapado con ${this.currentGold} de oro. Puedes reiniciar para buscar una ruta mejor.`,
            );
            this.cameras.main.flash(220, 255, 215, 64, false);
            return;
          }

          if (availableMoves(this.currentPos, this.collapsed).length === 0) {
            this.status = "lost";
            setStatus("lost");
            setMessage(
              `Te has quedado atrapado con ${this.currentGold} de oro. La salida seguía viva, pero tu ruta no.`,
            );
            this.cameras.main.shake(180, 0.0035);
            return;
          }

          setMessage(
            `Oro actual: ${this.currentGold}. Cada celda que dejas atrás desaparece para siempre.`,
          );
        }
      }

      gameRef.current?.destroy(true);
      gameRef.current = new Phaser.Game({
        type: Phaser.AUTO,
        parent: containerRef.current,
        width: DISPLAY_W,
        height: DISPLAY_H,
        transparent: true,
        scene: GoldMineScene,
        render: {
          pixelArt: true,
          antialias: false,
        },
      });
    });

    return () => {
      mounted = false;
      sceneControllerRef.current = null;
      gameRef.current?.destroy(true);
      gameRef.current = null;
    };
  }, [runId]);

  function move(direction: Direction) {
    sceneControllerRef.current?.move(direction);
  }

  return (
    <CheeseSlideContainer>
      <div
        ref={rootRef}
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(280px, 360px) minmax(0, 1fr)",
          gap: 20,
          alignItems: "start",
          maxWidth: 1160,
          margin: "0 auto",
        }}
      >
        <div
          style={{
            padding: 22,
            borderRadius: 20,
            background: "linear-gradient(180deg, #171312 0%, #0d0f14 100%)",
            border: "1px solid rgba(255,255,255,0.08)",
            color: "#fff7e6",
          }}
        >
          <div
            style={{
              fontSize: 12,
              letterSpacing: "0.16em",
              textTransform: "uppercase",
              color: "#f6bd60",
              marginBottom: 10,
            }}
          >
            Nuevo visual
          </div>
          <h3 style={{ margin: "0 0 14px", fontSize: 28, lineHeight: 1.05 }}>
            Juega la ruta codiciosa
          </h3>
          <p style={{ margin: "0 0 18px", color: "#e9d8b4", lineHeight: 1.5 }}>
            Mismo dungeon, mismo tileset, pero ahora lo recorres tú. Cada paso
            vale oro y cada paso destruye el camino detrás del minero.
          </p>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
              gap: 10,
              marginBottom: 16,
            }}
          >
            <InfoCard label="Oro" value={String(gold)} accent="#ffd166" />
            <InfoCard label="Mejor" value={String(bestGold)} accent="#80ed99" />
          </div>

          <div
            style={{
              background: "rgba(255,255,255,0.05)",
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: 14,
              padding: 14,
              marginBottom: 18,
              color:
                status === "won"
                  ? "#80ed99"
                  : status === "lost"
                    ? "#ff9aa2"
                    : "#fff7e6",
              lineHeight: 1.45,
            }}
          >
            {message}
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, 60px)",
              gap: 8,
              justifyContent: "start",
              marginBottom: 16,
            }}
          >
            <div />
            <MoveButton label="↑" onClick={() => move("north")} />
            <div />
            <MoveButton label="←" onClick={() => move("west")} />
            <MoveButton label="↓" onClick={() => move("south")} />
            <MoveButton label="→" onClick={() => move("east")} />
          </div>

          <div style={{ color: "#bca98c", marginBottom: 14 }}>
            También puedes usar flechas o WASD.
          </div>

          <button
            type="button"
            onClick={() => setRunId((current) => current + 1)}
            style={{
              border: "none",
              borderRadius: 999,
              padding: "12px 18px",
              background: "#f6bd60",
              color: "#2b1d0e",
              fontWeight: 800,
              cursor: "pointer",
            }}
          >
            Reiniciar partida
          </button>
        </div>

        <div
          style={{
            padding: 14,
            borderRadius: 22,
            background:
              "linear-gradient(180deg, rgba(16,18,24,0.98) 0%, rgba(5,7,10,0.98) 100%)",
            border: "1px solid rgba(255,255,255,0.08)",
            overflow: "hidden",
          }}
        >
          <div
            ref={containerRef}
            style={{ width: DISPLAY_W, height: DISPLAY_H, margin: "0 auto" }}
          />
        </div>
      </div>
    </CheeseSlideContainer>
  );
};

const InfoCard: React.FC<{ label: string; value: string; accent: string }> = ({
  label,
  value,
  accent,
}) => {
  return (
    <div
      style={{
        padding: 12,
        borderRadius: 14,
        background: "rgba(255,255,255,0.05)",
        border: `1px solid ${accent}33`,
      }}
    >
      <div
        style={{
          fontSize: 12,
          textTransform: "uppercase",
          letterSpacing: "0.12em",
          color: accent,
          marginBottom: 6,
        }}
      >
        {label}
      </div>
      <div style={{ fontSize: 28, fontWeight: 800 }}>{value}</div>
    </div>
  );
};

const MoveButton: React.FC<{ label: string; onClick: () => void }> = ({
  label,
  onClick,
}) => {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        width: 60,
        height: 60,
        borderRadius: 16,
        border: "1px solid rgba(255,255,255,0.08)",
        background: "linear-gradient(180deg, #342417 0%, #20150e 100%)",
        color: "#fff7e6",
        fontSize: 24,
        fontWeight: 800,
        cursor: "pointer",
      }}
    >
      {label}
    </button>
  );
};

export default GoldMineGame;
