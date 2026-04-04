import React, { useEffect, useRef, useState } from "react";
import { posKey, MAP_ROWS, MAP_COLS } from "../dungeon-escape/types";
import { CheeseSlideContainer } from "../shared";
import { useGreedyMineMap } from "./map-state";

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
const SPRITE_ATLAS_SRC = "/cave/greedy-gold-miner/gold-miner-atlas.png";
const SPRITE_META_SRC = "/cave/greedy-gold-miner/gold-miner-atlas.json";
const SPRITE_FRAME_W = 48;
const SPRITE_FRAME_H = 48;
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
const IDLE_FRAME_RATE = 6;
const WALK_FRAME_RATE = 10;

interface SpriteManifestFrame {
  frame: { x: number; y: number; w: number; h: number };
  sprite: { x: number; y: number; w: number; h: number };
  kind: "rotation" | "animation";
  pose: string | null;
  animation: string | null;
  direction: string;
  frame_index: number;
}

interface SpriteManifest {
  meta: {
    image: string;
    format: string;
    size: { w: number; h: number };
    scale: number;
    cell_size: { w: number; h: number };
    padding: number;
    columns: number;
    rows: number;
    frame_count: number;
    generator: string;
  };
  frames: Record<string, SpriteManifestFrame>;
  clips: {
    rotations: Record<string, string[]>;
    animations: Record<string, Record<string, string[]>>;
  };
}

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

function isWall(walls: Set<string>, r: number, c: number): boolean {
  if (r < 0 || r >= MAP_ROWS || c < 0 || c >= MAP_COLS) return true;
  return walls.has(posKey(r, c));
}

type BlockedFn = (r: number, c: number) => boolean;

function isBlocked(
  walls: Set<string>,
  r: number,
  c: number,
  collapsed: Set<string>,
): boolean {
  if (r < 0 || r >= MAP_ROWS || c < 0 || c >= MAP_COLS) return true;
  const key = posKey(r, c);
  return walls.has(key) || collapsed.has(key);
}

function tIdx(row: number, col: number): number {
  return row * ATLAS_COLS + col;
}

function tileTL(r: number, c: number, blocked: BlockedFn): number {
  const wN = blocked(r - 1, c);
  const wW = blocked(r, c - 1);
  if (wN && wW) return tIdx(2, 18);
  if (wN) return tIdx(2, 19);
  if (wW) return tIdx(3, 18);
  if (blocked(r - 1, c - 1)) return tIdx(1, 20);
  return tIdx(3, 19);
}

function tileTR(r: number, c: number, blocked: BlockedFn): number {
  const wN = blocked(r - 1, c);
  const wE = blocked(r, c + 1);
  if (wN && wE) return tIdx(2, 20);
  if (wN) return tIdx(2, 19);
  if (wE) return tIdx(3, 20);
  if (blocked(r - 1, c + 1)) return tIdx(1, 19);
  return tIdx(3, 19);
}

function tileBL(r: number, c: number, blocked: BlockedFn): number {
  const wS = blocked(r + 1, c);
  const wW = blocked(r, c - 1);
  if (wS && wW) return tIdx(4, 18);
  if (wS) return tIdx(4, 19);
  if (wW) return tIdx(3, 18);
  if (blocked(r + 1, c - 1)) return tIdx(0, 20);
  return tIdx(3, 19);
}

function tileBR(r: number, c: number, blocked: BlockedFn): number {
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

function idleAnimationKey(direction: Direction): string {
  return `gold-miner-idle-${direction}`;
}

function walkAnimationKey(direction: Direction): string {
  return `gold-miner-walk-${direction}`;
}

function clipDurationMs(frameCount: number, frameRate: number): number {
  return Math.max(1, Math.round((frameCount / frameRate) * 1000));
}

function manifestFrameToIndex(
  manifest: SpriteManifest,
  frameId: string,
): number {
  const frame = manifest.frames[frameId]?.frame;
  if (!frame) throw new Error(`Missing frame '${frameId}' in sprite manifest`);
  const strideX = manifest.meta.cell_size.w + manifest.meta.padding;
  const strideY = manifest.meta.cell_size.h + manifest.meta.padding;
  const col = Math.floor(frame.x / strideX);
  const row = Math.floor(frame.y / strideY);
  return row * manifest.meta.columns + col;
}

function isWalkable(
  pos: Pos,
  walls: Set<string>,
  collapsed: Set<string>,
): boolean {
  if (pos.r < 0 || pos.r >= MAP_ROWS || pos.c < 0 || pos.c >= MAP_COLS)
    return false;
  if (walls.has(posKey(pos.r, pos.c))) return false;
  return !collapsed.has(posKey(pos.r, pos.c));
}

function availableMoves(
  pos: Pos,
  walls: Set<string>,
  collapsed: Set<string>,
): Direction[] {
  return (Object.keys(DIRECTION_DELTAS) as Direction[]).filter((direction) => {
    const delta = DIRECTION_DELTAS[direction];
    return isWalkable(
      { r: pos.r + delta.r, c: pos.c + delta.c },
      walls,
      collapsed,
    );
  });
}

function isCurrentRevealSectionActive(element: HTMLElement | null): boolean {
  const section = element?.closest("section");
  return section?.classList.contains("present") ?? false;
}

export const GoldMineGame: React.FC = () => {
  const mapState = useGreedyMineMap();
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

  useEffect(() => {
    const syncMusicPlayback = () => {
      const active =
        !document.hidden && isCurrentRevealSectionActive(rootRef.current);
      if (musicOn && active) musicEngine.start();
      else musicEngine.stop();
    };

    syncMusicPlayback();
    document.addEventListener("visibilitychange", syncMusicPlayback);

    const reveal = (window as { Reveal?: { on?: Function; off?: Function } })
      .Reveal;
    reveal?.on?.("slidechanged", syncMusicPlayback);
    reveal?.on?.("ready", syncMusicPlayback);

    return () => {
      document.removeEventListener("visibilitychange", syncMusicPlayback);
      reveal?.off?.("slidechanged", syncMusicPlayback);
      reveal?.off?.("ready", syncMusicPlayback);
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
  }, [runId, mapState.version]);

  useEffect(() => {
    function activateGameControls() {
      if (controlsArmedRef.current) return;
      setControlsCapture(true);
      pushGameMode();
    }

    function deactivateGameControls() {
      if (!controlsArmedRef.current) return;
      setControlsCapture(false);
      popGameMode();
    }

    function pushGameMode() {
      const vm = (window as any).vimMode;
      if (!vm) return;
      vm.pushMode("gold-mine-game", {
        label: "Game",
        extends: "normal",
        commands: [
          {
            key: "w",
            label: "Move north",
            altKeys: ["↑"],
            run: () => move("north"),
          },
          {
            key: "a",
            label: "Move west",
            altKeys: ["←"],
            run: () => move("west"),
          },
          {
            key: "s",
            label: "Move south",
            altKeys: ["↓"],
            run: () => move("south"),
          },
          {
            key: "d",
            label: "Move east",
            altKeys: ["→"],
            run: () => move("east"),
          },
          {
            key: "arrowup",
            label: "Move north",
            run: () => move("north"),
            hidden: true,
          },
          {
            key: "arrowleft",
            label: "Move west",
            run: () => move("west"),
            hidden: true,
          },
          {
            key: "arrowdown",
            label: "Move south",
            run: () => move("south"),
            hidden: true,
          },
          {
            key: "arrowright",
            label: "Move east",
            run: () => move("east"),
            hidden: true,
          },
          {
            key: "escape",
            label: "Exit game controls",
            run: () => {
              deactivateGameControls();
            },
          },
        ],
      });
    }

    function popGameMode() {
      (window as any).vimMode?.popMode("gold-mine-game");
    }

    const handlePointerDownCapture = (event: PointerEvent) => {
      const root = rootRef.current;
      if (!root) return;
      if (root.contains(event.target as Node)) {
        activateGameControls();
        return;
      }
      // Don't deactivate if a higher mode is stacked on top (e.g. paint overlay)
      const vm = (window as any).vimMode;
      if (vm) {
        const current = vm.mode();
        if (current !== "gold-mine-game" && current !== "normal") return;
      }
      deactivateGameControls();
    };

    const syncSlideControls = () => {
      if (isCurrentRevealSectionActive(rootRef.current)) {
        activateGameControls();
        return;
      }
      deactivateGameControls();
    };

    document.addEventListener("pointerdown", handlePointerDownCapture, true);
    const reveal = (window as { Reveal?: any }).Reveal;
    reveal?.on?.("slidechanged", syncSlideControls);
    reveal?.on?.("ready", syncSlideControls);
    syncSlideControls();

    return () => {
      document.removeEventListener(
        "pointerdown",
        handlePointerDownCapture,
        true,
      );
      reveal?.off?.("slidechanged", syncSlideControls);
      reveal?.off?.("ready", syncSlideControls);
      popGameMode();
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
      const walls = mapState.walls;
      const start = mapState.start;
      const exit = mapState.exit;
      const staticBlocked: BlockedFn = (r, c) => isWall(walls, r, c);

      class GoldMineScene extends Phaser.Scene {
        floorTexture: any;
        miner: any;
        cameraTarget: any;
        spriteManifest: SpriteManifest | null = null;
        collapsed = new Set<string>();
        currentPos: Pos = { ...start };
        currentFacing: Direction = "south";
        moving = false;
        currentGold = 0;
        decor = new Map<string, CellDecor>();
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
          this.load.spritesheet("gold-miner", SPRITE_ATLAS_SRC, {
            frameWidth: SPRITE_FRAME_W,
            frameHeight: SPRITE_FRAME_H,
          });
          this.load.json("gold-miner-meta", SPRITE_META_SRC);
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
              if (walls.has(posKey(r, c))) continue;
              this.renderFloorCell(r, c, staticBlocked);
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
          if (walls.has(key) || this.collapsed.has(key)) return;

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
              if (walls.has(key)) continue;

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
          const sx = cellCenterX(start.c);
          const sy = cellCenterY(start.r);
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

          const ex = cellCenterX(exit.c);
          const ey = cellCenterY(exit.r);
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
          this.spriteManifest = this.cache.json.get(
            "gold-miner-meta",
          ) as SpriteManifest;

          (Object.keys(DIRECTION_DELTAS) as Direction[]).forEach(
            (direction) => {
              this.createClipAnimation(
                idleAnimationKey(direction),
                this.spriteManifest?.clips.animations["breathing-idle"]?.[
                  direction
                ] ??
                  this.spriteManifest?.clips.rotations[direction] ??
                  [],
                IDLE_FRAME_RATE,
                -1,
              );

              this.createClipAnimation(
                walkAnimationKey(direction),
                this.spriteManifest?.clips.animations.walk?.[direction] ?? [],
                WALK_FRAME_RATE,
                0,
              );
            },
          );
        }

        createClipAnimation(
          key: string,
          clipFrameIds: string[],
          frameRate: number,
          repeat: number,
        ) {
          if (
            !this.spriteManifest ||
            this.anims.exists(key) ||
            clipFrameIds.length === 0
          ) {
            return;
          }

          this.anims.create({
            key,
            frames: clipFrameIds.map((frameId) => ({
              key: "gold-miner",
              frame: manifestFrameToIndex(this.spriteManifest!, frameId),
            })),
            frameRate,
            repeat,
          });
        }

        getRotationFrame(direction: Direction): number {
          const manifest = this.spriteManifest;
          if (!manifest) return 0;

          const rotationFrames = manifest.clips.rotations[direction];
          if (rotationFrames?.length) {
            return manifestFrameToIndex(manifest, rotationFrames[0]);
          }

          const idleFrames =
            manifest.clips.animations["breathing-idle"]?.[direction];
          if (idleFrames?.length) {
            return manifestFrameToIndex(manifest, idleFrames[0]);
          }

          return 0;
        }

        playIdle(direction: Direction) {
          this.currentFacing = direction;
          const key = idleAnimationKey(direction);
          if (this.anims.exists(key)) {
            this.miner.play(key, true);
            return;
          }
          this.miner.stop();
          this.miner.setFrame(this.getRotationFrame(direction));
        }

        getMoveProfile(direction: Direction) {
          const walkIds =
            this.spriteManifest?.clips.animations.walk?.[direction] ?? [];
          if (
            walkIds.length > 0 &&
            this.anims.exists(walkAnimationKey(direction))
          ) {
            return {
              key: walkAnimationKey(direction),
              durationMs: clipDurationMs(walkIds.length, WALK_FRAME_RATE),
            };
          }

          const idleIds =
            this.spriteManifest?.clips.animations["breathing-idle"]?.[
              direction
            ] ?? [];
          if (
            idleIds.length > 0 &&
            this.anims.exists(idleAnimationKey(direction))
          ) {
            return {
              key: idleAnimationKey(direction),
              durationMs: clipDurationMs(idleIds.length, IDLE_FRAME_RATE),
            };
          }

          return {
            key: null,
            durationMs: 420,
          };
        }

        createMiner() {
          const x = cellCenterX(start.c);
          const y = cellCenterY(start.r);
          this.cameraTarget = this.add.zone(x, y, 1, 1);
          this.miner = this.add.sprite(
            x,
            y,
            "gold-miner",
            this.getRotationFrame("south"),
          );
          this.miner.setScale(1.25);
          this.miner.setDepth(10);
          this.baseY = y;
          this.setMinerPosition(x, y);
          this.playIdle("south");
        }

        setMinerPosition(x: number, y: number) {
          this.miner.setPosition(roundToPixel(x), roundToPixel(y));
        }

        setCameraTargetPosition(x: number, y: number) {
          this.cameraTarget.setPosition(roundToPixel(x), roundToPixel(y));
        }

        stopIdleFloat() {
          this.miner.stop();
          this.setMinerPosition(this.miner.x, this.baseY);
        }

        startIdleFloat() {
          this.playIdle(this.currentFacing);
        }

        tryMove(direction: Direction) {
          if (this.moving || this.status !== "playing") return;

          this.playIdle(direction);

          const delta = DIRECTION_DELTAS[direction];
          const next = {
            r: this.currentPos.r + delta.r,
            c: this.currentPos.c + delta.c,
          };
          if (!isWalkable(next, walls, this.collapsed)) {
            this.cameras.main.shake(70, 0.002);
            if (sfxOnRef.current) sfx.bump();
            return;
          }

          this.moving = true;
          this.stopIdleFloat();
          this.currentFacing = direction;
          const moveProfile = this.getMoveProfile(direction);
          if (moveProfile.key) {
            this.miner.play(moveProfile.key, true);
          } else {
            this.miner.setFrame(this.getRotationFrame(direction));
          }
          const previous = { ...this.currentPos };
          const targetX = cellCenterX(next.c);
          const targetY = cellCenterY(next.r);
          const moveState = { x: this.miner.x, y: this.baseY };

          this.tweens.add({
            targets: moveState,
            x: targetX,
            y: targetY,
            duration: moveProfile.durationMs,
            ease: "Quad.Out",
            onUpdate: () => {
              this.setMinerPosition(moveState.x, moveState.y);
              this.setCameraTargetPosition(moveState.x, moveState.y);
            },
            onComplete: () => {
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
          const blocked: BlockedFn = (r, c) =>
            isBlocked(walls, r, c, this.collapsed);
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
          if (this.currentPos.r === exit.r && this.currentPos.c === exit.c) {
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

          if (
            availableMoves(this.currentPos, walls, this.collapsed).length === 0
          ) {
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
  }, [runId, mapState.version]);

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
