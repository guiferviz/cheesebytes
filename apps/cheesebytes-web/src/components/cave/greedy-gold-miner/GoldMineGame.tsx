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
  setZoom: (zoom: number) => void;
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
const FIT_ZOOM = Math.min(DISPLAY_W / WORLD_W, DISPLAY_H / WORLD_H);
const MAX_ZOOM = 2.2;
const INITIAL_ZOOM = 1.8;
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

// ── 8-bit Audio Engine (Web Audio API) ──────────────────────────────

let sharedAudioCtx: AudioContext | null = null;

function getAudioCtx(): AudioContext {
  if (!sharedAudioCtx) {
    sharedAudioCtx = new AudioContext();
  }
  return sharedAudioCtx;
}

function playTone(
  freq: number,
  duration: number,
  type: OscillatorType = "square",
  volume = 0.12,
  detune = 0,
) {
  const ctx = getAudioCtx();
  if (ctx.state === "suspended") ctx.resume();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  osc.detune.value = detune;
  gain.gain.setValueAtTime(volume, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
  osc.connect(gain).connect(ctx.destination);
  osc.start(ctx.currentTime);
  osc.stop(ctx.currentTime + duration);
}

const sfx = {
  step() {
    playTone(220 + Math.random() * 60, 0.06, "square", 0.07);
  },
  collapse() {
    playTone(80, 0.15, "sawtooth", 0.1);
    playTone(55, 0.25, "triangle", 0.08);
  },
  gold() {
    playTone(587, 0.08, "square", 0.09);
    setTimeout(() => playTone(784, 0.1, "square", 0.09), 60);
  },
  bump() {
    playTone(90, 0.12, "sawtooth", 0.1, -20);
  },
  win() {
    const notes = [523, 659, 784, 1047];
    notes.forEach((f, i) =>
      setTimeout(() => playTone(f, 0.18, "square", 0.1), i * 100),
    );
  },
  lose() {
    const notes = [311, 277, 233, 185];
    notes.forEach((f, i) =>
      setTimeout(() => playTone(f, 0.22, "sawtooth", 0.1), i * 120),
    );
  },
};

// Dark underground 8-bit melody
const MELODY_NOTES = [
  164.81,
  196.0,
  185.0,
  164.81, // E3 G3 F#3 E3
  146.83,
  164.81,
  130.81,
  146.83, // D3 E3 C3 D3
  123.47,
  146.83,
  130.81,
  110.0, // B2 D3 C3 A2
  123.47,
  110.0,
  98.0,
  110.0, // B2 A2 G2 A2
];
const BASS_NOTES = [
  82.41,
  82.41,
  73.42,
  73.42, // E2 E2 D2 D2
  65.41,
  65.41,
  55.0,
  55.0, // C2 C2 A1 A1
  61.74,
  61.74,
  55.0,
  55.0, // B1 B1 A1 A1
  61.74,
  55.0,
  49.0,
  55.0, // B1 A1 G1 A1
];
const NOTE_DUR = 0.32;

class MusicEngine {
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private step = 0;
  playing = false;

  start() {
    if (this.playing) return;
    this.playing = true;
    const ctx = getAudioCtx();
    if (ctx.state === "suspended") ctx.resume();
    this.step = 0;
    this.tick();
    this.intervalId = setInterval(() => this.tick(), NOTE_DUR * 1000);
  }

  stop() {
    this.playing = false;
    if (this.intervalId !== null) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  private tick() {
    const i = this.step % MELODY_NOTES.length;
    playTone(MELODY_NOTES[i], NOTE_DUR * 0.8, "square", 0.05);
    playTone(BASS_NOTES[i], NOTE_DUR * 0.9, "triangle", 0.06);
    this.step++;
  }
}

const musicEngine = new MusicEngine();

function isWall(r: number, c: number): boolean {
  if (r < 0 || r >= MAP_ROWS || c < 0 || c >= MAP_COLS) return true;
  return WALLS.has(posKey(r, c));
}

type BlockedFn = (r: number, c: number) => boolean;

function isBlocked(r: number, c: number, collapsed: Set<string>): boolean {
  if (r < 0 || r >= MAP_ROWS || c < 0 || c >= MAP_COLS) return true;
  const key = posKey(r, c);
  return WALLS.has(key) || collapsed.has(key);
}

function tIdx(row: number, col: number): number {
  return row * ATLAS_COLS + col;
}

function tileTL(r: number, c: number, blocked: BlockedFn = isWall): number {
  const wN = blocked(r - 1, c);
  const wW = blocked(r, c - 1);
  if (wN && wW) return tIdx(2, 18);
  if (wN) return tIdx(2, 19);
  if (wW) return tIdx(3, 18);
  if (blocked(r - 1, c - 1)) return tIdx(1, 20);
  return tIdx(3, 19);
}

function tileTR(r: number, c: number, blocked: BlockedFn = isWall): number {
  const wN = blocked(r - 1, c);
  const wE = blocked(r, c + 1);
  if (wN && wE) return tIdx(2, 20);
  if (wN) return tIdx(2, 19);
  if (wE) return tIdx(3, 20);
  if (blocked(r - 1, c + 1)) return tIdx(1, 19);
  return tIdx(3, 19);
}

function tileBL(r: number, c: number, blocked: BlockedFn = isWall): number {
  const wS = blocked(r + 1, c);
  const wW = blocked(r, c - 1);
  if (wS && wW) return tIdx(4, 18);
  if (wS) return tIdx(4, 19);
  if (wW) return tIdx(3, 18);
  if (blocked(r + 1, c - 1)) return tIdx(0, 20);
  return tIdx(3, 19);
}

function tileBR(r: number, c: number, blocked: BlockedFn = isWall): number {
  const wS = blocked(r + 1, c);
  const wE = blocked(r, c + 1);
  if (wS && wE) return tIdx(4, 20);
  if (wS) return tIdx(4, 19);
  if (wE) return tIdx(3, 20);
  if (blocked(r + 1, c + 1)) return tIdx(0, 19);
  return tIdx(3, 19);
}

function cellCenterX(c: number): number {
  return c * 2 * TS + TS;
}

function cellCenterY(r: number): number {
  return r * 2 * TS + TS;
}

function roundToPixel(value: number): number {
  return Math.round(value);
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
  const controlsArmedRef = useRef(false);
  const [runId, setRunId] = useState(0);
  const [gold, setGold] = useState(0);
  const [bestGold, setBestGold] = useState(0);
  const [zoom, setZoom] = useState(INITIAL_ZOOM);
  const [controlsArmed, setControlsArmed] = useState(false);
  const [status, setStatus] = useState<GameStatus>("playing");
  const [message, setMessage] = useState(
    "Every step gives you 1 gold. The tile you leave behind collapses and disappears.",
  );
  const [musicOn, setMusicOn] = useState(false);
  const [sfxOn, setSfxOn] = useState(true);
  const sfxOnRef = useRef(true);

  useEffect(() => {
    sfxOnRef.current = sfxOn;
  }, [sfxOn]);

  useEffect(() => {
    if (musicOn) musicEngine.start();
    else musicEngine.stop();
    return () => {
      musicEngine.stop();
    };
  }, [musicOn]);

  function setControlsCapture(nextValue: boolean) {
    controlsArmedRef.current = nextValue;
    setControlsArmed(nextValue);
  }

  useEffect(() => {
    setGold(0);
    setStatus("playing");
    setMessage(
      "Every step gives you 1 gold. The tile you leave behind collapses and disappears.",
    );
    setZoom(INITIAL_ZOOM);
    setControlsCapture(false);
  }, [runId]);

  useEffect(() => {
    const handleKeyDownCapture = (event: KeyboardEvent) => {
      const direction = directionFromKey(event.code);
      if (!direction) return;
      if (isEditableTarget(event.target)) return;
      if (!isCurrentRevealSectionActive(rootRef.current)) return;
      if (!controlsArmedRef.current) return;

      event.preventDefault();
      event.stopPropagation();
      sceneControllerRef.current?.move(direction);
    };

    const handlePointerDownCapture = (event: PointerEvent) => {
      const root = rootRef.current;
      if (!root) return;
      if (root.contains(event.target as Node)) {
        setControlsCapture(true);
        return;
      }
      setControlsCapture(false);
    };

    document.addEventListener("keydown", handleKeyDownCapture, true);
    document.addEventListener("pointerdown", handlePointerDownCapture, true);
    return () => {
      document.removeEventListener("keydown", handleKeyDownCapture, true);
      document.removeEventListener(
        "pointerdown",
        handlePointerDownCapture,
        true,
      );
    };
  }, []);

  useEffect(() => {
    sceneControllerRef.current?.setZoom(zoom);
  }, [zoom]);

  useEffect(() => {
    if (!containerRef.current) return;

    let mounted = true;

    import("phaser").then((PhaserModule) => {
      if (!mounted || !containerRef.current) return;

      const Phaser = PhaserModule.default ?? PhaserModule;

      class GoldMineScene extends Phaser.Scene {
        floorTexture: any;
        miner: any;
        cameraTarget: any;
        collapsed = new Set<string>();
        currentPos: Pos = { ...START };
        moving = false;
        currentGold = 0;
        decor = new Map<string, CellDecor>();
        idleTween: any = null;
        baseY = 0;
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
          this.cameras.main.roundPixels = false;

          this.floorTexture = this.add
            .renderTexture(0, 0, WORLD_W, WORLD_H)
            .setOrigin(0, 0)
            .setDepth(1);
          this.renderFullFloor();

          this.drawGoldSpecks();
          this.createMarkers();
          this.createAnimations();
          this.createMiner();
          this.applyZoom(zoom);

          sceneControllerRef.current = {
            move: (direction: Direction) => this.tryMove(direction),
            setZoom: (nextZoom: number) => this.applyZoom(nextZoom),
          };
        }

        applyZoom(nextZoom: number) {
          const camera = this.cameras.main;
          camera.setZoom(nextZoom);
          if (nextZoom <= FIT_ZOOM + 0.001) {
            camera.stopFollow();
            camera.centerOn(WORLD_W / 2, WORLD_H / 2);
            return;
          }
          camera.startFollow(this.cameraTarget, true, 0.12, 0.12);
        }

        renderFullFloor() {
          this.floorTexture.clear();
          for (let r = 0; r < MAP_ROWS; r += 1) {
            for (let c = 0; c < MAP_COLS; c += 1) {
              if (WALLS.has(posKey(r, c))) continue;
              this.renderFloorCell(r, c, isWall);
            }
          }
        }

        clearFloorCell(r: number, c: number) {
          this.floorTexture.fill(
            0x05070a,
            1,
            c * 2 * TS,
            r * 2 * TS,
            TS * 2,
            TS * 2,
          );
        }

        renderFloorCell(r: number, c: number, blocked: BlockedFn) {
          const key = posKey(r, c);
          const x = c * 2 * TS;
          const y = r * 2 * TS;

          this.clearFloorCell(r, c);
          if (WALLS.has(key) || this.collapsed.has(key)) return;

          this.floorTexture.drawFrame("terrain", tileTL(r, c, blocked), x, y);
          this.floorTexture.drawFrame(
            "terrain",
            tileTR(r, c, blocked),
            x + TS,
            y,
          );
          this.floorTexture.drawFrame(
            "terrain",
            tileBL(r, c, blocked),
            x,
            y + TS,
          );
          this.floorTexture.drawFrame(
            "terrain",
            tileBR(r, c, blocked),
            x + TS,
            y + TS,
          );
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
          this.cameraTarget = this.add.zone(x, y, 1, 1);
          this.miner = this.add.sprite(x, y, "gold-miner", idleFrame("south"));
          this.miner.setScale(1.25);
          this.miner.setDepth(10);
          this.baseY = y;
          this.setMinerPosition(x, y);
          this.startIdleFloat();
        }

        setMinerPosition(x: number, y: number) {
          this.miner.setPosition(roundToPixel(x), roundToPixel(y));
        }

        setCameraTargetPosition(x: number, y: number) {
          this.cameraTarget.setPosition(roundToPixel(x), roundToPixel(y));
        }

        stopIdleFloat() {
          if (this.idleTween) {
            this.idleTween.stop();
            this.idleTween = null;
          }
          this.setMinerPosition(this.miner.x, this.baseY);
        }

        startIdleFloat() {
          this.stopIdleFloat();
          const idleState = { y: this.baseY };
          this.idleTween = this.tweens.add({
            targets: idleState,
            y: this.baseY - 2,
            duration: 700,
            yoyo: true,
            repeat: -1,
            ease: "Sine.InOut",
            onUpdate: () => {
              this.setMinerPosition(this.miner.x, idleState.y);
            },
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
            if (sfxOnRef.current) sfx.bump();
            return;
          }

          this.moving = true;
          this.stopIdleFloat();
          this.miner.play(animationKey(direction), true);
          const previous = { ...this.currentPos };
          const targetX = cellCenterX(next.c);
          const targetY = cellCenterY(next.r);
          const moveState = { x: this.miner.x, y: this.baseY };

          this.tweens.add({
            targets: moveState,
            x: targetX,
            y: targetY,
            duration: 160,
            ease: "Quad.Out",
            onUpdate: () => {
              this.setMinerPosition(moveState.x, moveState.y);
              this.setCameraTargetPosition(moveState.x, moveState.y);
            },
            onComplete: () => {
              this.miner.stop();
              this.miner.setFrame(idleFrame(direction));
              this.currentPos = next;
              this.currentGold += 1;
              setGold(this.currentGold);
              if (sfxOnRef.current) {
                sfx.step();
                sfx.gold();
              }
              this.collapseCell(previous);
              this.showGoldGain(targetX, targetY - 22);
              this.baseY = targetY;
              this.setMinerPosition(targetX, targetY);
              this.setCameraTargetPosition(targetX, targetY);
              this.startIdleFloat();
              this.moving = false;
              this.evaluateState();
            },
          });
        }

        collapseCell(pos: Pos) {
          const key = posKey(pos.r, pos.c);
          this.collapsed.add(key);

          this.clearFloorCell(pos.r, pos.c);

          const decor = this.decor.get(key);
          decor?.specks.forEach((speck) => speck.setVisible(false));
          decor?.collapsedOverlay.setVisible(true);
          if (sfxOnRef.current) sfx.collapse();

          this.refreshNeighborTiles(pos);
        }

        refreshNeighborTiles(pos: Pos) {
          const blocked: BlockedFn = (r, c) => isBlocked(r, c, this.collapsed);
          for (let dr = -1; dr <= 1; dr++) {
            for (let dc = -1; dc <= 1; dc++) {
              const nr = pos.r + dr;
              const nc = pos.c + dc;
              if (nr < 0 || nr >= MAP_ROWS || nc < 0 || nc >= MAP_COLS)
                continue;
              this.renderFloorCell(nr, nc, blocked);
            }
          }
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
              `You escaped with ${this.currentGold} gold. Restart and try to find a richer route.`,
            );
            this.cameras.main.flash(220, 255, 215, 64, false);
            if (sfxOnRef.current) sfx.win();
            return;
          }

          if (availableMoves(this.currentPos, this.collapsed).length === 0) {
            this.status = "lost";
            setStatus("lost");
            setMessage(
              `You got trapped with ${this.currentGold} gold. The exit still existed, but your route did not.`,
            );
            this.cameras.main.shake(180, 0.0035);
            if (sfxOnRef.current) sfx.lose();
            return;
          }

          setMessage(
            `Current gold: ${this.currentGold}. Every tile you leave behind disappears forever.`,
          );
        }
      }

      gameRef.current?.destroy(true);
      gameRef.current = new Phaser.Game({
        type: Phaser.AUTO,
        parent: containerRef.current,
        width: DISPLAY_W,
        height: DISPLAY_H,
        backgroundColor: "#05070a",
        scene: GoldMineScene,
        render: {
          pixelArt: true,
          antialias: true,
          roundPixels: false,
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
            padding: 14,
            borderRadius: 16,
            background: "linear-gradient(180deg, #171312 0%, #0d0f14 100%)",
            border: "1px solid rgba(255,255,255,0.08)",
            color: "#fff7e6",
          }}
        >
          <h3 style={{ margin: "0 0 6px", fontSize: 22, lineHeight: 1.1 }}>
            Play the Greedy Route
          </h3>
          <p
            style={{
              margin: "0 0 10px",
              color: "#e9d8b4",
              fontSize: 13,
              lineHeight: 1.4,
            }}
          >
            Each step earns gold and destroys the tile behind you.
          </p>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
              gap: 8,
              marginBottom: 10,
            }}
          >
            <InfoCard label="Gold" value={String(gold)} accent="#ffd166" />
            <InfoCard label="Best" value={String(bestGold)} accent="#80ed99" />
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              marginBottom: 10,
            }}
          >
            <span
              style={{
                fontSize: 11,
                textTransform: "uppercase",
                letterSpacing: "0.1em",
                color: "#f6bd60",
                whiteSpace: "nowrap",
              }}
            >
              Zoom
            </span>
            <input
              type="range"
              min={FIT_ZOOM}
              max={MAX_ZOOM}
              step={0.05}
              value={zoom}
              onChange={(event) => setZoom(Number(event.target.value))}
              style={{ flex: 1 }}
            />
            <button
              type="button"
              onClick={() => setZoom(FIT_ZOOM)}
              style={{
                border: "1px solid rgba(255,255,255,0.08)",
                borderRadius: 999,
                padding: "4px 10px",
                background: "rgba(255,255,255,0.06)",
                color: "#fff7e6",
                cursor: "pointer",
                fontSize: 12,
                whiteSpace: "nowrap",
              }}
            >
              Fit
            </button>
          </div>

          <div
            style={{
              background: "rgba(255,255,255,0.05)",
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: 10,
              padding: 10,
              marginBottom: 10,
              fontSize: 13,
              color:
                status === "won"
                  ? "#80ed99"
                  : status === "lost"
                    ? "#ff9aa2"
                    : "#fff7e6",
              lineHeight: 1.35,
            }}
          >
            {message}
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              marginBottom: 10,
            }}
          >
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(3, 44px)",
                gap: 4,
              }}
            >
              <div />
              <MoveButton label="↑" onClick={() => move("north")} />
              <div />
              <MoveButton label="←" onClick={() => move("west")} />
              <MoveButton label="↓" onClick={() => move("south")} />
              <MoveButton label="→" onClick={() => move("east")} />
            </div>

            <div
              style={{
                fontSize: 12,
                color: controlsArmed ? "#80ed99" : "#c9b48f",
                lineHeight: 1.35,
              }}
            >
              {controlsArmed
                ? "Keys active. WASD or arrows."
                : "Click here to capture keys."}
            </div>
          </div>

          <div
            style={{
              display: "flex",
              gap: 6,
              marginBottom: 10,
            }}
          >
            <ToggleButton
              label={musicOn ? "♫ Music ON" : "♫ Music OFF"}
              active={musicOn}
              onClick={() => setMusicOn((v) => !v)}
            />
            <ToggleButton
              label={sfxOn ? "♪ SFX ON" : "♪ SFX OFF"}
              active={sfxOn}
              onClick={() => setSfxOn((v) => !v)}
            />
          </div>

          <button
            type="button"
            onClick={() => setRunId((current) => current + 1)}
            style={{
              border: "none",
              borderRadius: 999,
              padding: "8px 16px",
              background: "#f6bd60",
              color: "#2b1d0e",
              fontWeight: 800,
              cursor: "pointer",
              fontSize: 13,
            }}
          >
            Restart
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
        padding: 8,
        borderRadius: 10,
        background: "rgba(255,255,255,0.05)",
        border: `1px solid ${accent}33`,
      }}
    >
      <div
        style={{
          fontSize: 11,
          textTransform: "uppercase",
          letterSpacing: "0.1em",
          color: accent,
          marginBottom: 2,
        }}
      >
        {label}
      </div>
      <div style={{ fontSize: 22, fontWeight: 800 }}>{value}</div>
    </div>
  );
};

const ToggleButton: React.FC<{
  label: string;
  active: boolean;
  onClick: () => void;
}> = ({ label, active, onClick }) => {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        flex: 1,
        padding: "6px 0",
        borderRadius: 10,
        border: `1px solid ${active ? "rgba(128,237,153,0.3)" : "rgba(255,255,255,0.08)"}`,
        background: active ? "rgba(128,237,153,0.1)" : "rgba(255,255,255,0.04)",
        color: active ? "#80ed99" : "#c9b48f",
        fontSize: 12,
        fontWeight: 700,
        cursor: "pointer",
      }}
    >
      {label}
    </button>
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
        width: 44,
        height: 44,
        borderRadius: 12,
        border: "1px solid rgba(255,255,255,0.08)",
        background: "linear-gradient(180deg, #342417 0%, #20150e 100%)",
        color: "#fff7e6",
        fontSize: 18,
        fontWeight: 800,
        cursor: "pointer",
      }}
    >
      {label}
    </button>
  );
};

export default GoldMineGame;
