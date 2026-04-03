/**
 * GoldMineDemo — compact, self-contained gold mine game for embedding in MDX
 * notes.  Hardcoded 9×9 square-loop map with exactly two paths (short = 6
 * gold, long = 18 gold) making it obvious that the longest route wins.
 *
 * Features: 8-bit procedural SFX & music, sprite atlas animations,
 * light/dark theme, blinking click-to-focus status bar, score tracking.
 */
import React, { useEffect, useRef, useState, useMemo } from "react";

// ── Types ───────────────────────────────────────────────────────────

interface Pos {
  r: number;
  c: number;
}

// ── Props ───────────────────────────────────────────────────────────

export interface GoldMineDemoProps {
  /** Map rows as strings.  '#'=wall, '.'=floor, 'S'=start, 'E'=exit */
  rawMap: string[];
  /** Best possible gold.  If omitted the row is hidden. */
  bestPossible?: number;
}

// ── Map parsing ─────────────────────────────────────────────────────

interface ParsedMap {
  rows: number;
  cols: number;
  walls: Set<string>;
  start: Pos;
  exit: Pos;
}

function pk(r: number, c: number): string {
  return `${r},${c}`;
}

function parseMap(raw: string[]): ParsedMap {
  const rows = raw.length;
  const cols = raw[0]?.length ?? 0;
  const walls = new Set<string>();
  let start: Pos = { r: 0, c: 0 };
  let exit: Pos = { r: 0, c: 0 };
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const ch = raw[r][c];
      if (ch === "#") walls.add(pk(r, c));
      if (ch === "S") start = { r, c };
      if (ch === "E") exit = { r, c };
    }
  }
  return { rows, cols, walls, start, exit };
}

type Dir = "north" | "south" | "east" | "west";
type GameStatus = "playing" | "won" | "lost";

const DELTAS: Record<Dir, Pos> = {
  north: { r: -1, c: 0 },
  south: { r: 1, c: 0 },
  east: { r: 0, c: 1 },
  west: { r: 0, c: -1 },
};

// ── Rendering constants ─────────────────────────────────────────────

const ATLAS_SRC = "/tiles/terrain_atlas.png";
const SPRITE_ATLAS_SRC = "/cave/greedy-gold-miner/gold-miner-atlas.png";
const SPRITE_META_SRC = "/cave/greedy-gold-miner/gold-miner-atlas.json";
const FW = 48;
const FH = 48;
const TS = 32;
const AC = 32;
const IDLE_FR = 6;
const WALK_FR = 10;

// ── Theme ───────────────────────────────────────────────────────────

interface HudTheme {
  hudBg: string;
  hudBorder: string;
  hudText: string;
  hudMuted: string;
  hudAccent: string;
  hudBtnBg: string;
  hudBtnActiveBg: string;
  hudBtnActiveText: string;
  hudGold: string;
  hudBest: string;
  hudWin: string;
  hudLose: string;
  hudArmed: string;
  frameBg: string;
}

const DARK_HUD: HudTheme = {
  hudBg: "linear-gradient(180deg,#3a2a1a,#2a1c10)",
  hudBorder: "#5a422e",
  hudText: "#d4b896",
  hudMuted: "#a08060",
  hudAccent: "#f6bd60",
  hudBtnBg: "rgba(0,0,0,0.3)",
  hudBtnActiveBg: "rgba(128,237,153,0.15)",
  hudBtnActiveText: "#b8d4a0",
  hudGold: "#ffd166",
  hudBest: "#80ed99",
  hudWin: "#80ed99",
  hudLose: "#ff9aa2",
  hudArmed: "#b8d4a0",
  frameBg: "#05070a",
};

const LIGHT_HUD: HudTheme = {
  hudBg: "linear-gradient(180deg,#e8dfd2,#d8ccb8)",
  hudBorder: "#b8a88e",
  hudText: "#4a3a28",
  hudMuted: "#8a7a60",
  hudAccent: "#996515",
  hudBtnBg: "rgba(0,0,0,0.06)",
  hudBtnActiveBg: "rgba(46,139,87,0.15)",
  hudBtnActiveText: "#2e7d52",
  hudGold: "#b8860b",
  hudBest: "#2e8b57",
  hudWin: "#2e8b57",
  hudLose: "#c0392b",
  hudArmed: "#3a6a3a",
  frameBg: "#d0c8b8",
};

function useIsDark(): boolean {
  const [dark, setDark] = useState(() => {
    if (typeof document === "undefined") return false;
    return (
      document.documentElement.classList.contains("dark") ||
      document.body.classList.contains("dark")
    );
  });
  useEffect(() => {
    const check = () =>
      setDark(
        document.documentElement.classList.contains("dark") ||
          document.body.classList.contains("dark"),
      );
    check();
    const obs = new MutationObserver(check);
    obs.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });
    obs.observe(document.body, {
      attributes: true,
      attributeFilter: ["class"],
    });
    return () => obs.disconnect();
  }, []);
  return dark;
}

// ── Sprite manifest ─────────────────────────────────────────────────

interface ManifestFrame {
  frame: { x: number; y: number; w: number; h: number };
}

interface Manifest {
  meta: {
    cell_size: { w: number; h: number };
    padding: number;
    columns: number;
  };
  frames: Record<string, ManifestFrame>;
  clips: {
    rotations: Record<string, string[]>;
    animations: Record<string, Record<string, string[]>>;
  };
}

// ── 8-bit Audio ─────────────────────────────────────────────────────

let _audioCtx: AudioContext | null = null;
function getCtx(): AudioContext {
  if (!_audioCtx) _audioCtx = new AudioContext();
  return _audioCtx;
}

function tone(
  freq: number,
  dur: number,
  type: OscillatorType = "square",
  vol = 0.12,
  det = 0,
) {
  const ac = getCtx();
  if (ac.state === "suspended") ac.resume();
  const osc = ac.createOscillator();
  const gain = ac.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  osc.detune.value = det;
  gain.gain.setValueAtTime(vol, ac.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + dur);
  osc.connect(gain).connect(ac.destination);
  osc.start(ac.currentTime);
  osc.stop(ac.currentTime + dur);
}

const sfx = {
  step() {
    tone(220 + Math.random() * 60, 0.06, "square", 0.07);
  },
  collapse() {
    tone(80, 0.15, "sawtooth", 0.1);
    tone(55, 0.25, "triangle", 0.08);
  },
  gold() {
    tone(587, 0.08, "square", 0.09);
    setTimeout(() => tone(784, 0.1, "square", 0.09), 60);
  },
  bump() {
    tone(90, 0.12, "sawtooth", 0.1, -20);
  },
  win() {
    [523, 659, 784, 1047].forEach((f, i) =>
      setTimeout(() => tone(f, 0.18, "square", 0.1), i * 100),
    );
  },
  lose() {
    [311, 277, 233, 185].forEach((f, i) =>
      setTimeout(() => tone(f, 0.22, "sawtooth", 0.1), i * 120),
    );
  },
  rewind() {
    [880, 698, 587, 494, 392].forEach((f, i) =>
      setTimeout(() => tone(f, 0.06, "square", 0.07), i * 40),
    );
  },
};

const MELODY = [
  164.81, 196, 185, 164.81, 146.83, 164.81, 130.81, 146.83, 123.47, 146.83,
  130.81, 110, 123.47, 110, 98, 110,
];
const BASS = [
  82.41, 82.41, 73.42, 73.42, 65.41, 65.41, 55, 55, 61.74, 61.74, 55, 55, 61.74,
  55, 49, 55,
];
const ND = 0.32;

class MusicEngine {
  private iv: ReturnType<typeof setInterval> | null = null;
  private step = 0;
  playing = false;

  start() {
    if (this.playing) return;
    this.playing = true;
    const ac = getCtx();
    if (ac.state === "suspended") ac.resume();
    this.step = 0;
    this.tick();
    this.iv = setInterval(() => this.tick(), ND * 1000);
  }

  stop() {
    this.playing = false;
    if (this.iv !== null) {
      clearInterval(this.iv);
      this.iv = null;
    }
  }

  private tick() {
    const i = this.step % MELODY.length;
    tone(MELODY[i], ND * 0.8, "square", 0.05);
    tone(BASS[i], ND * 0.9, "triangle", 0.06);
    this.step++;
  }
}

// ── Tile helpers ────────────────────────────────────────────────────

type Blocked = (r: number, c: number) => boolean;

function ti(row: number, col: number) {
  return row * AC + col;
}

function tTL(r: number, c: number, b: Blocked): number {
  const wN = b(r - 1, c),
    wW = b(r, c - 1);
  if (wN && wW) return ti(2, 18);
  if (wN) return ti(2, 19);
  if (wW) return ti(3, 18);
  if (b(r - 1, c - 1)) return ti(1, 20);
  return ti(3, 19);
}

function tTR(r: number, c: number, b: Blocked): number {
  const wN = b(r - 1, c),
    wE = b(r, c + 1);
  if (wN && wE) return ti(2, 20);
  if (wN) return ti(2, 19);
  if (wE) return ti(3, 20);
  if (b(r - 1, c + 1)) return ti(1, 19);
  return ti(3, 19);
}

function tBL(r: number, c: number, b: Blocked): number {
  const wS = b(r + 1, c),
    wW = b(r, c - 1);
  if (wS && wW) return ti(4, 18);
  if (wS) return ti(4, 19);
  if (wW) return ti(3, 18);
  if (b(r + 1, c - 1)) return ti(0, 20);
  return ti(3, 19);
}

function tBR(r: number, c: number, b: Blocked): number {
  const wS = b(r + 1, c),
    wE = b(r, c + 1);
  if (wS && wE) return ti(4, 20);
  if (wS) return ti(4, 19);
  if (wE) return ti(3, 20);
  if (b(r + 1, c + 1)) return ti(0, 19);
  return ti(3, 19);
}

// ── Game helpers ────────────────────────────────────────────────────

function cellX(c: number) {
  return c * 2 * TS + TS;
}
function cellY(r: number) {
  return r * 2 * TS + TS;
}
function rp(v: number) {
  return Math.round(v);
}

function idleKey(d: Dir) {
  return `gmd-idle-${d}`;
}
function walkKey(d: Dir) {
  return `gmd-walk-${d}`;
}
function clipMs(n: number, rate: number) {
  return Math.max(1, Math.round((n / rate) * 1000));
}

function mfIdx(m: Manifest, id: string): number {
  const f = m.frames[id]?.frame;
  if (!f) return 0;
  const sx = m.meta.cell_size.w + m.meta.padding;
  const sy = m.meta.cell_size.h + m.meta.padding;
  return Math.floor(f.y / sy) * m.meta.columns + Math.floor(f.x / sx);
}

function dirFromKey(code: string): Dir | null {
  if (code === "ArrowUp" || code === "KeyW") return "north";
  if (code === "ArrowDown" || code === "KeyS") return "south";
  if (code === "ArrowLeft" || code === "KeyA") return "west";
  if (code === "ArrowRight" || code === "KeyD") return "east";
  return null;
}

function isEditable(t: EventTarget | null): boolean {
  if (!(t instanceof HTMLElement)) return false;
  return (
    t.isContentEditable ||
    t.tagName === "INPUT" ||
    t.tagName === "TEXTAREA" ||
    t.tagName === "SELECT"
  );
}

// ── Component ───────────────────────────────────────────────────────

export const GoldMineDemo: React.FC<GoldMineDemoProps> = ({
  rawMap,
  bestPossible,
}) => {
  const isDark = useIsDark();
  const th = isDark ? DARK_HUD : LIGHT_HUD;

  const map = useMemo(() => parseMap(rawMap), [rawMap]);
  const {
    rows: ROWS,
    cols: COLS,
    walls: WALLS,
    start: START,
    exit: EXIT,
  } = map;

  const WW = COLS * 2 * TS;
  const WH = ROWS * 2 * TS;
  const aspect = COLS / ROWS;

  const rootRef = useRef<HTMLDivElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const gameRef = useRef<any>(null);
  const moveRef = useRef<((d: Dir) => void) | null>(null);
  const zoomRef = useRef<(() => void) | null>(null);
  const undoRef = useRef<(() => void) | null>(null);
  const armedRef = useRef(false);
  const sfxRef = useRef(true);
  const heldDirRef = useRef<Dir | null>(null);
  const musicRef = useRef<MusicEngine | null>(null);
  // Stable refs for vim commands
  const toggleMusicRef = useRef<() => void>(() => {});
  const toggleSfxRef = useRef<() => void>(() => {});
  const restartRef = useRef<() => void>(() => {});

  const [runId, setRunId] = useState(0);
  const [gold, setGold] = useState(0);
  const [bestGold, setBestGold] = useState(0);
  const [status, setStatus] = useState<GameStatus>("playing");
  const [armed, setArmed] = useState(false);
  const [musicOn, setMusicOn] = useState(false);
  const [sfxOn, setSfxOn] = useState(true);

  useEffect(() => {
    sfxRef.current = sfxOn;
  }, [sfxOn]);

  // Keep toggler refs in sync
  toggleMusicRef.current = () => setMusicOn((v) => !v);
  toggleSfxRef.current = () => setSfxOn((v) => !v);
  restartRef.current = () => setRunId((id) => id + 1);

  // Music lifecycle
  useEffect(() => {
    if (!musicRef.current) musicRef.current = new MusicEngine();
    if (musicOn) musicRef.current.start();
    else musicRef.current.stop();
    return () => {
      musicRef.current?.stop();
    };
  }, [musicOn]);

  // Pause music when tab hidden
  useEffect(() => {
    const sync = () => {
      if (document.hidden) musicRef.current?.stop();
      else if (musicOn) musicRef.current?.start();
    };
    document.addEventListener("visibilitychange", sync);
    return () => document.removeEventListener("visibilitychange", sync);
  }, [musicOn]);

  // Reset on restart
  useEffect(() => {
    setGold(0);
    setStatus("playing");
  }, [runId]);

  // Keyboard + pointer capture
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const d = dirFromKey(e.code);
      if (!d || isEditable(e.target) || !armedRef.current) return;
      e.preventDefault();
      e.stopPropagation();
      heldDirRef.current = d;
      moveRef.current?.(d);
    };
    const onKeyUp = (e: KeyboardEvent) => {
      const d = dirFromKey(e.code);
      if (d && d === heldDirRef.current) heldDirRef.current = null;
    };
    const root = rootRef.current;
    if (!root) return;

    const focusRoot = () => {
      root.focus({ preventScroll: true });
    };

    const syncArmed = () => {
      const inside = root.contains(document.activeElement);
      armedRef.current = inside;
      setArmed(inside);
      const vm = (window as any).vimMode;
      if (!vm) return;
      if (inside) {
        vm.pushScope("gold-mine-demo", [
          // Movement keys — passthrough so the game's own listener handles them,
          // but they shadow global bindings (e.g. S for sidebar) and show in help.
          {
            key: "w",
            label: "Move north",
            category: "Game",
            run: () => {},
            passthrough: true,
            altKeys: ["\u2191"],
          },
          {
            key: "a",
            label: "Move west",
            category: "Game",
            run: () => {},
            passthrough: true,
            altKeys: ["\u2190"],
          },
          {
            key: "s",
            label: "Move south",
            category: "Game",
            run: () => {},
            passthrough: true,
            altKeys: ["\u2193"],
          },
          {
            key: "d",
            label: "Move east",
            category: "Game",
            run: () => {},
            passthrough: true,
            altKeys: ["\u2192"],
          },
          // Actions
          {
            key: "z",
            label: "Zoom on player",
            category: "Game",
            run: () => zoomRef.current?.(),
          },
          {
            key: "m",
            label: "Toggle music",
            category: "Game",
            run: () => toggleMusicRef.current(),
          },
          {
            key: "x",
            label: "Toggle sound effects",
            category: "Game",
            run: () => toggleSfxRef.current(),
          },
          {
            key: "u",
            label: "Undo last move",
            category: "Game",
            run: () => undoRef.current?.(),
          },
          {
            key: "r",
            label: "Restart game",
            category: "Game",
            run: () => restartRef.current(),
          },
        ]);
      } else {
        vm.popScope("gold-mine-demo");
      }
    };

    document.addEventListener("keydown", onKey, true);
    document.addEventListener("keyup", onKeyUp, true);
    root.addEventListener("pointerdown", focusRoot, true);
    root.addEventListener("focusin", syncArmed);
    root.addEventListener("focusout", syncArmed);
    return () => {
      document.removeEventListener("keydown", onKey, true);
      document.removeEventListener("keyup", onKeyUp, true);
      root.removeEventListener("pointerdown", focusRoot, true);
      root.removeEventListener("focusin", syncArmed);
      root.removeEventListener("focusout", syncArmed);
      (window as any).vimMode?.popScope("gold-mine-demo");
    };
  }, []);

  // Phaser game
  useEffect(() => {
    if (!containerRef.current) return;
    let alive = true;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    import("phaser").then((P: any) => {
      if (!alive || !containerRef.current) return;
      const Phaser = P.default ?? P;

      const wallAt = (r: number, c: number): boolean =>
        r < 0 || r >= ROWS || c < 0 || c >= COLS || WALLS.has(pk(r, c));

      const blockedWith = (
        collapsed: Set<string>,
        r: number,
        c: number,
      ): boolean =>
        r < 0 ||
        r >= ROWS ||
        c < 0 ||
        c >= COLS ||
        WALLS.has(pk(r, c)) ||
        collapsed.has(pk(r, c));

      const canWalk = (pos: Pos, col: Set<string>): boolean =>
        pos.r >= 0 &&
        pos.r < ROWS &&
        pos.c >= 0 &&
        pos.c < COLS &&
        !WALLS.has(pk(pos.r, pos.c)) &&
        !col.has(pk(pos.r, pos.c));

      const availMoves = (pos: Pos, col: Set<string>): Dir[] =>
        (Object.keys(DELTAS) as Dir[]).filter((d) => {
          const delta = DELTAS[d];
          return canWalk({ r: pos.r + delta.r, c: pos.c + delta.c }, col);
        });

      const staticB: Blocked = (r, c) => wallAt(r, c);

      class Scene extends Phaser.Scene {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ft: any;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        miner: any;
        manifest: Manifest | null = null;
        collapsed = new Set<string>();
        history: Array<{
          pos: Pos;
          collapsed: Set<string>;
          g: number;
          facing: Dir;
        }> = [];
        pos: Pos = { ...START };
        facing: Dir = "south";
        moving = false;
        g = 0;
        stat: GameStatus = "playing";
        consecMoves = 0;
        lastMoveDir: Dir | null = null;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        decor = new Map<string, { specks: any[]; overlay: any }>();
        baseY = 0;

        zoomed = false;

        constructor() {
          super({ key: `GoldMineDemo-${runId}` });
        }

        preload() {
          this.load.spritesheet("terrain", ATLAS_SRC, {
            frameWidth: TS,
            frameHeight: TS,
          });
          this.load.spritesheet("gm", SPRITE_ATLAS_SRC, {
            frameWidth: FW,
            frameHeight: FH,
          });
          this.load.json("gm-meta", SPRITE_META_SRC);
        }

        create() {
          const cam = this.cameras.main;
          cam.setBounds(0, 0, WW, WH);
          cam.setBackgroundColor("#05070a");
          cam.roundPixels = false;
          cam.centerOn(WW / 2, WH / 2);

          this.ft = this.add
            .renderTexture(0, 0, WW, WH)
            .setOrigin(0, 0)
            .setDepth(1);
          this.renderFloor();
          this.drawSpecks();
          this.createMarkers();
          this.createAnims();
          this.createMiner();

          moveRef.current = (d: Dir) => this.tryMove(d);
          zoomRef.current = () => this.toggleZoom();
          undoRef.current = () => this.tryUndo();
        }

        toggleZoom() {
          const cam = this.cameras.main;
          this.zoomed = !this.zoomed;
          if (this.zoomed) {
            const zoomLevel = 2.5;
            const z = { v: cam.zoom };
            this.tweens.add({
              targets: z,
              v: zoomLevel,
              duration: 350,
              ease: "Quad.Out",
              onUpdate: () => {
                cam.setZoom(z.v);
                cam.centerOn(this.miner.x, this.miner.y);
              },
            });
          } else {
            const z = { v: cam.zoom };
            this.tweens.add({
              targets: z,
              v: 1,
              duration: 350,
              ease: "Quad.Out",
              onUpdate: () => {
                cam.setZoom(z.v);
                cam.centerOn(WW / 2, WH / 2);
              },
            });
          }
        }

        renderFloor() {
          this.ft.clear();
          for (let r = 0; r < ROWS; r++)
            for (let c = 0; c < COLS; c++)
              if (!WALLS.has(pk(r, c))) this.renderCell(r, c, staticB);
        }

        renderCell(r: number, c: number, b: Blocked) {
          const x = c * 2 * TS,
            y = r * 2 * TS;
          this.ft.fill(0x05070a, 1, x, y, TS * 2, TS * 2);
          if (WALLS.has(pk(r, c)) || this.collapsed.has(pk(r, c))) return;
          this.ft.drawFrame("terrain", tTL(r, c, b), x, y);
          this.ft.drawFrame("terrain", tTR(r, c, b), x + TS, y);
          this.ft.drawFrame("terrain", tBL(r, c, b), x, y + TS);
          this.ft.drawFrame("terrain", tBR(r, c, b), x + TS, y + TS);
        }

        drawSpecks() {
          for (let r = 0; r < ROWS; r++)
            for (let c = 0; c < COLS; c++) {
              const k = pk(r, c);
              if (WALLS.has(k)) continue;
              const x = cellX(c),
                y = cellY(r);
              const specks = [
                this.add.circle(x - 7, y - 4, 2.1, 0xffd166, 0.95),
                this.add.circle(x + 5, y + 6, 1.8, 0xf4a261, 0.85),
                this.add.circle(x + 1, y - 8, 1.5, 0xffe29a, 0.9),
              ];
              specks.forEach((s: { setDepth: (d: number) => void }) =>
                s.setDepth(3),
              );
              const overlay = this.add.rectangle(
                x,
                y,
                TS * 2,
                TS * 2,
                0x040608,
                0.92,
              );
              overlay.setDepth(4);
              overlay.setVisible(false);
              this.decor.set(k, { specks, overlay });
            }
        }

        createMarkers() {
          const sx = cellX(START.c),
            sy = cellY(START.r);
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

          const ex = cellX(EXIT.c),
            ey = cellY(EXIT.r);
          const ec = this.add.circle(ex, ey, TS * 0.55, 0xf44336, 1);
          ec.setDepth(5);
          this.tweens.add({
            targets: ec,
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

        createAnims() {
          this.manifest = this.cache.json.get("gm-meta") as Manifest;
          (Object.keys(DELTAS) as Dir[]).forEach((d) => {
            this.mkAnim(
              idleKey(d),
              this.manifest?.clips.animations["breathing-idle"]?.[d] ??
                this.manifest?.clips.rotations[d] ??
                [],
              IDLE_FR,
              -1,
            );
            this.mkAnim(
              walkKey(d),
              this.manifest?.clips.animations.walk?.[d] ?? [],
              WALK_FR,
              0,
            );
          });
        }

        mkAnim(key: string, ids: string[], rate: number, rep: number) {
          if (!this.manifest || this.anims.exists(key) || !ids.length) return;
          this.anims.create({
            key,
            frames: ids.map((id) => ({
              key: "gm",
              frame: mfIdx(this.manifest!, id),
            })),
            frameRate: rate,
            repeat: rep,
          });
        }

        rotFrame(d: Dir): number {
          if (!this.manifest) return 0;
          const r = this.manifest.clips.rotations[d];
          if (r?.length) return mfIdx(this.manifest, r[0]);
          const i = this.manifest.clips.animations["breathing-idle"]?.[d];
          if (i?.length) return mfIdx(this.manifest, i[0]);
          return 0;
        }

        idle(d: Dir) {
          this.facing = d;
          const k = idleKey(d);
          if (this.anims.exists(k)) {
            this.miner.play(k, true);
            return;
          }
          this.miner.stop();
          this.miner.setFrame(this.rotFrame(d));
        }

        moveProfile(d: Dir) {
          const wk = this.manifest?.clips.animations.walk?.[d] ?? [];
          if (wk.length && this.anims.exists(walkKey(d)))
            return {
              key: walkKey(d),
              ms: Math.min(320, clipMs(wk.length, WALK_FR)),
            };
          const ik =
            this.manifest?.clips.animations["breathing-idle"]?.[d] ?? [];
          if (ik.length && this.anims.exists(idleKey(d)))
            return {
              key: idleKey(d),
              ms: Math.min(320, clipMs(ik.length, IDLE_FR)),
            };
          return { key: null as string | null, ms: 320 };
        }

        // Acceleration: consecutive moves in the same direction get faster
        accelMs(baseMs: number): number {
          // 1st move: 100%, 2nd: 70%, 3rd: 50%, 4th+: 35%
          const factors = [1, 0.7, 0.5, 0.35];
          const f = factors[Math.min(this.consecMoves, factors.length - 1)];
          return Math.max(80, Math.round(baseMs * f));
        }

        createMiner() {
          const x = cellX(START.c),
            y = cellY(START.r);
          this.miner = this.add.sprite(x, y, "gm", this.rotFrame("south"));
          this.miner.setScale(1.25);
          this.miner.setDepth(10);
          this.baseY = y;
          this.idle("south");
        }

        tryMove(d: Dir) {
          if (this.moving || this.stat !== "playing") return;
          // Track consecutive moves for acceleration
          if (d === this.lastMoveDir) this.consecMoves++;
          else {
            this.consecMoves = 0;
            this.lastMoveDir = d;
          }

          this.idle(d);
          const delta = DELTAS[d];
          const next = { r: this.pos.r + delta.r, c: this.pos.c + delta.c };
          if (!canWalk(next, this.collapsed)) {
            this.cameras.main.shake(70, 0.002);
            if (sfxRef.current) sfx.bump();
            this.consecMoves = 0;
            return;
          }
          // Save state for undo before moving
          this.history.push({
            pos: { ...this.pos },
            collapsed: new Set(this.collapsed),
            g: this.g,
            facing: d,
          });
          this.moving = true;
          this.miner.stop();
          this.facing = d;
          const mp = this.moveProfile(d);
          const ms = this.accelMs(mp.ms);
          const animRate = mp.ms > 0 ? mp.ms / ms : 1;
          if (mp.key) {
            this.miner.play(mp.key, true);
            if (this.miner.anims.currentAnim) {
              this.miner.anims.timeScale = animRate;
            }
          } else {
            this.miner.setFrame(this.rotFrame(d));
          }
          const prev = { ...this.pos };
          const tx = cellX(next.c),
            ty = cellY(next.r);
          const state = { x: this.miner.x, y: this.baseY };
          this.tweens.add({
            targets: state,
            x: tx,
            y: ty,
            duration: ms,
            ease: "Quad.Out",
            onUpdate: () => {
              this.miner.setPosition(rp(state.x), rp(state.y));
              if (this.zoomed) {
                const cam = this.cameras.main;
                cam.centerOn(rp(state.x), rp(state.y));
              }
            },
            onComplete: () => {
              this.pos = next;
              this.g += 1;
              setGold(this.g);
              if (sfxRef.current) {
                sfx.step();
                sfx.gold();
              }
              this.collapse(prev);
              this.showGain(tx, ty - 22);
              this.baseY = ty;
              this.miner.setPosition(rp(tx), rp(ty));
              this.miner.anims.timeScale = 1;
              this.idle(this.facing);
              this.moving = false;
              this.checkEnd();
              // Auto-chain next move if key still held
              if (heldDirRef.current === d && this.stat === "playing") {
                this.tryMove(d);
              }
            },
          });
        }

        tryUndo() {
          if (this.moving || this.history.length === 0) return;
          if (this.stat !== "playing" && this.stat !== "lost") return;
          const snap = this.history.pop()!;
          this.moving = true;

          // Restore game state
          this.g = snap.g;
          setGold(this.g);

          // Reset status if was lost
          if (this.stat === "lost") {
            this.stat = "playing";
            setStatus("playing");
          }

          // Find tiles that were collapsed but shouldn't be anymore
          const restored = new Set<string>();
          for (const k of this.collapsed) {
            if (!snap.collapsed.has(k)) restored.add(k);
          }
          this.collapsed = snap.collapsed;

          // Re-render restored tiles and their neighbors
          const b: Blocked = (r, c) => blockedWith(this.collapsed, r, c);
          for (const k of restored) {
            const [rs, cs] = k.split(",").map(Number);
            this.renderCell(rs, cs, b);
            const dec = this.decor.get(k);
            dec?.specks.forEach((s: { setVisible: (v: boolean) => void }) =>
              s.setVisible(true),
            );
            dec?.overlay.setVisible(false);
            for (let dr = -1; dr <= 1; dr++)
              for (let dc = -1; dc <= 1; dc++) {
                const nr = rs + dr,
                  nc = cs + dc;
                if (nr >= 0 && nr < ROWS && nc >= 0 && nc < COLS)
                  this.renderCell(nr, nc, b);
              }
          }

          // Face toward the cell we're leaving (the direction of the original move)
          this.facing = snap.facing;
          this.miner.setFrame(this.rotFrame(snap.facing));

          // Animate backward to previous position
          const tx = cellX(snap.pos.c),
            ty = cellY(snap.pos.r);
          const state = { x: this.miner.x, y: this.baseY };
          if (sfxRef.current) sfx.rewind();
          this.tweens.add({
            targets: state,
            x: tx,
            y: ty,
            duration: 180,
            ease: "Quad.In",
            onUpdate: () => {
              this.miner.setPosition(rp(state.x), rp(state.y));
              if (this.zoomed) {
                this.cameras.main.centerOn(rp(state.x), rp(state.y));
              }
            },
            onComplete: () => {
              this.pos = snap.pos;
              this.baseY = ty;
              this.miner.setPosition(rp(tx), rp(ty));
              this.idle(this.facing);
              this.moving = false;
              // Reset acceleration
              this.consecMoves = 0;
              this.lastMoveDir = null;
            },
          });
        }

        collapse(pos: Pos) {
          const k = pk(pos.r, pos.c);
          this.collapsed.add(k);
          this.ft.fill(
            0x05070a,
            1,
            pos.c * 2 * TS,
            pos.r * 2 * TS,
            TS * 2,
            TS * 2,
          );
          const dec = this.decor.get(k);
          dec?.specks.forEach((s: { setVisible: (v: boolean) => void }) =>
            s.setVisible(false),
          );
          dec?.overlay.setVisible(true);
          if (sfxRef.current) sfx.collapse();
          this.refreshNeighbors(pos);
        }

        refreshNeighbors(pos: Pos) {
          const b: Blocked = (r, c) => blockedWith(this.collapsed, r, c);
          for (let dr = -1; dr <= 1; dr++)
            for (let dc = -1; dc <= 1; dc++) {
              const nr = pos.r + dr,
                nc = pos.c + dc;
              if (nr >= 0 && nr < ROWS && nc >= 0 && nc < COLS)
                this.renderCell(nr, nc, b);
            }
        }

        showGain(x: number, y: number) {
          const l = this.add
            .text(x, y, "+1", {
              fontFamily: "monospace",
              fontSize: "18px",
              color: "#ffd166",
              fontStyle: "bold",
            })
            .setOrigin(0.5)
            .setDepth(20);
          this.tweens.add({
            targets: l,
            y: y - 16,
            alpha: 0,
            duration: 350,
            onComplete: () => l.destroy(),
          });
        }

        checkEnd() {
          if (this.pos.r === EXIT.r && this.pos.c === EXIT.c) {
            this.stat = "won";
            setStatus("won");
            setBestGold((cur) => Math.max(cur, this.g));
            this.cameras.main.flash(220, 255, 215, 64, false);
            if (sfxRef.current) sfx.win();
            return;
          }
          if (availMoves(this.pos, this.collapsed).length === 0) {
            this.stat = "lost";
            setStatus("lost");
            this.cameras.main.shake(180, 0.0035);
            if (sfxRef.current) sfx.lose();
          }
        }
      }

      gameRef.current?.destroy(true);
      gameRef.current = new Phaser.Game({
        type: Phaser.AUTO,
        parent: containerRef.current,
        width: WW,
        height: WH,
        backgroundColor: "#05070a",
        scene: Scene,
        scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
        render: { pixelArt: true, antialias: true, roundPixels: false },
      });
    });

    return () => {
      alive = false;
      moveRef.current = null;
      zoomRef.current = null;
      undoRef.current = null;
      gameRef.current?.destroy(true);
      gameRef.current = null;
    };
  }, [runId, ROWS, COLS, WALLS, START, EXIT, WW, WH]);

  const statusText = !armed
    ? "[ CLICK HERE TO PLAY ]"
    : status === "won"
      ? `[ ESCAPED WITH ${gold} GOLD! ]`
      : status === "lost"
        ? "[ TRAPPED! NO MOVES LEFT ]"
        : "[ WASD OR ARROWS TO MOVE ]";

  return (
    <div
      ref={rootRef}
      tabIndex={0}
      style={{ margin: "2rem 0", outline: "none" }}
    >
      <style>{`
        @keyframes gmd-pulse { 0%,100%{opacity:1} 50%{opacity:0.15} }
        .gmd-blink { animation: gmd-pulse 1.2s ease-in-out infinite; }
      `}</style>

      {/* Game canvas */}
      <div
        ref={wrapRef}
        style={{
          overflow: "hidden",
          borderRadius: "10px 10px 0 0",
          border: `2px solid ${th.hudBorder}`,
          borderBottom: "none",
          background: th.frameBg,
        }}
      >
        <div
          ref={containerRef}
          style={{ width: "100%", aspectRatio: `${aspect}` }}
        />
      </div>

      {/* HUD bar */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 8,
          background: th.hudBg,
          border: `2px solid ${th.hudBorder}`,
          borderRadius: "0 0 10px 10px",
          padding: "7px 12px",
          fontFamily: "monospace",
          fontSize: 11,
          color: th.hudText,
          userSelect: "none",
          minHeight: 34,
        }}
      >
        {/* Left: controls */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            flexShrink: 0,
          }}
        >
          <HudBtn
            onClick={() => setMusicOn((v) => !v)}
            active={musicOn}
            th={th}
            title={musicOn ? "Mute music [M]" : "Enable music [M]"}
          >
            <MusicIcon
              muted={!musicOn}
              color={musicOn ? th.hudBtnActiveText : th.hudText}
            />
          </HudBtn>
          <HudBtn
            onClick={() => setSfxOn((v) => !v)}
            active={sfxOn}
            th={th}
            title={
              sfxOn ? "Mute sound effects [X]" : "Enable sound effects [X]"
            }
          >
            <SpeakerIcon
              muted={!sfxOn}
              color={sfxOn ? th.hudBtnActiveText : th.hudText}
            />
          </HudBtn>
          <HudBtn
            onClick={() => undoRef.current?.()}
            th={th}
            title="Undo last move [U]"
          >
            <span style={{ display: "inline-flex", alignItems: "baseline" }}>
              <span style={{ fontWeight: 800, textDecoration: "underline" }}>
                U
              </span>
              <span style={{ marginLeft: "-0.04em" }}>ndo</span>
            </span>
          </HudBtn>
          <HudBtn
            onClick={() => setRunId((id) => id + 1)}
            th={th}
            title="Restart the game [R]"
          >
            <span style={{ display: "inline-flex", alignItems: "baseline" }}>
              <span style={{ fontWeight: 800, textDecoration: "underline" }}>
                R
              </span>
              <span style={{ marginLeft: "-0.04em" }}>estart</span>
            </span>
          </HudBtn>
        </div>

        {/* Center: focus / status */}
        <div
          className={!armed && status === "playing" ? "gmd-blink" : undefined}
          style={{
            flex: 1,
            textAlign: "center",
            fontWeight: 700,
            fontSize: 11,
            letterSpacing: "0.04em",
            color:
              status === "won"
                ? th.hudWin
                : status === "lost"
                  ? th.hudLose
                  : armed
                    ? th.hudArmed
                    : th.hudAccent,
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
            padding: "0 6px",
            minWidth: 120,
          }}
        >
          {statusText}
        </div>

        {/* Right: scores */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            flexShrink: 0,
          }}
        >
          <HudStat
            icon={<CoinIcon color={th.hudGold} />}
            value={gold}
            color={th.hudGold}
            muted={th.hudMuted}
            title="Gold collected this run"
          />
          <HudStat
            icon={<TrophyIcon color={th.hudBest} />}
            value={bestGold}
            color={th.hudBest}
            muted={th.hudMuted}
            title="Best score this session"
          />
          {bestPossible != null && (
            <HudStat
              icon={<StarIcon color={th.hudAccent} />}
              value={bestPossible}
              color={th.hudAccent}
              muted={th.hudMuted}
              title="Best possible score for this map"
            />
          )}
        </div>
      </div>
    </div>
  );
};

// ── SVG Icons ───────────────────────────────────────────────────────

const iconStyle = {
  display: "inline-block",
  verticalAlign: "middle",
  lineHeight: 0,
} as const;

const MusicIcon: React.FC<{ muted: boolean; color: string }> = ({
  muted,
  color,
}) => (
  <span style={iconStyle}>
    <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
      <path d="M12 2v8.5" stroke={color} strokeWidth="1.5" />
      <path d="M6 4v8.5" stroke={color} strokeWidth="1.5" />
      <path d="M6 4l6-2" stroke={color} strokeWidth="1.5" />
      <circle cx="4" cy="12" r="2" fill={color} />
      <circle cx="10" cy="10.5" r="2" fill={color} />
      {muted && (
        <>
          <line
            x1="1"
            y1="1"
            x2="15"
            y2="15"
            stroke={color}
            strokeWidth="1.8"
          />
        </>
      )}
    </svg>
  </span>
);

const SpeakerIcon: React.FC<{ muted: boolean; color: string }> = ({
  muted,
  color,
}) => (
  <span style={iconStyle}>
    <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
      <path d="M3 5h2l3-3v12l-3-3H3a1 1 0 01-1-1V6a1 1 0 011-1z" fill={color} />
      {muted ? (
        <>
          <line
            x1="11"
            y1="5"
            x2="15"
            y2="11"
            stroke={color}
            strokeWidth="1.5"
          />
          <line
            x1="15"
            y1="5"
            x2="11"
            y2="11"
            stroke={color}
            strokeWidth="1.5"
          />
        </>
      ) : (
        <>
          <path
            d="M11 4.5a5 5 0 010 7"
            stroke={color}
            strokeWidth="1.2"
            fill="none"
          />
          <path
            d="M13 3a7.5 7.5 0 010 10"
            stroke={color}
            strokeWidth="1.2"
            fill="none"
          />
        </>
      )}
    </svg>
  </span>
);

const CoinIcon: React.FC<{ color: string }> = ({ color }) => (
  <span style={iconStyle}>
    <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
      <circle cx="8" cy="8" r="6" fill={color} opacity="0.25" />
      <circle
        cx="8"
        cy="8"
        r="6"
        stroke={color}
        strokeWidth="1.5"
        fill="none"
      />
      <text
        x="8"
        y="11"
        textAnchor="middle"
        fontSize="8"
        fontWeight="bold"
        fill={color}
      >
        $
      </text>
    </svg>
  </span>
);

const TrophyIcon: React.FC<{ color: string }> = ({ color }) => (
  <span style={iconStyle}>
    <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
      <path d="M5 2h6v4a3 3 0 01-6 0V2z" fill={color} opacity="0.3" />
      <path
        d="M5 2h6v4a3 3 0 01-6 0V2z"
        stroke={color}
        strokeWidth="1.2"
        fill="none"
      />
      <path
        d="M4 3H2.5a1 1 0 000 2H4M12 3h1.5a1 1 0 010 2H12"
        stroke={color}
        strokeWidth="1"
      />
      <line x1="8" y1="9" x2="8" y2="11" stroke={color} strokeWidth="1.2" />
      <rect x="5.5" y="11" width="5" height="1.5" rx="0.5" fill={color} />
    </svg>
  </span>
);

const StarIcon: React.FC<{ color: string }> = ({ color }) => (
  <span style={iconStyle}>
    <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
      <path
        d="M8 1l2.2 4.4 4.8.7-3.5 3.4.8 4.8L8 12l-4.3 2.3.8-4.8L1 6.1l4.8-.7z"
        fill={color}
        opacity="0.3"
      />
      <path
        d="M8 1l2.2 4.4 4.8.7-3.5 3.4.8 4.8L8 12l-4.3 2.3.8-4.8L1 6.1l4.8-.7z"
        stroke={color}
        strokeWidth="1"
        fill="none"
      />
    </svg>
  </span>
);

// ── Sub-components ──────────────────────────────────────────────────

const HudBtn: React.FC<{
  onClick: () => void;
  active?: boolean;
  children: React.ReactNode;
  th: HudTheme;
  title?: string;
}> = ({ onClick, active, children, th, title }) => (
  <button
    type="button"
    onClick={onClick}
    title={title}
    style={{
      display: "inline-flex",
      alignItems: "center",
      gap: 3,
      padding: "3px 8px",
      borderRadius: 4,
      fontSize: 10,
      fontWeight: 700,
      fontFamily: "monospace",
      cursor: "pointer",
      border: `1px solid ${th.hudBorder}`,
      background: active ? th.hudBtnActiveBg : th.hudBtnBg,
      color: active ? th.hudBtnActiveText : th.hudText,
      whiteSpace: "nowrap",
    }}
  >
    {children}
  </button>
);

const HudStat: React.FC<{
  icon: React.ReactNode;
  value: number;
  color: string;
  muted: string;
  title?: string;
}> = ({ icon, value, color, title }) => (
  <span style={{ whiteSpace: "nowrap", cursor: "default" }} title={title}>
    {icon} <span style={{ fontSize: 12, fontWeight: 800, color }}>{value}</span>
  </span>
);
