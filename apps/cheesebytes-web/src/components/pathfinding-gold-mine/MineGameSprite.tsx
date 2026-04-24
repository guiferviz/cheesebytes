/**
 * MineGameSprite — animated sprite overlay for the playable Mine games.
 *
 * Supports both the gold-miner and cave-monster atlases. Loads the JSON
 * manifest once per atlas (cached in-module) and resolves the frame
 * indices for the requested animation + direction. Cycles frames with
 * a setInterval so a single React component can drive all on-screen
 * miner / monster movement.
 */
import React, { useEffect, useState, useRef } from "react";

export type Direction = "north" | "south" | "east" | "west";
export type SpriteKind = "miner" | "monster";
export type SpriteAnim = "idle" | "walk";

export interface AtlasInfo {
  src: string;
  manifestSrc: string;
  frameW: number;
  frameH: number;
  cols: number;
  atlasW: number;
  atlasH: number;
  /** Visual scale relative to one cell (e.g. 1.0 = exactly one cell). */
  cellScale: number;
  /** Animation key in manifest.clips.animations for the "idle" anim. */
  idleClipKey: string;
  /** Animation key in manifest.clips.animations for the "walk" anim. */
  walkClipKey: string;
  idleFps: number;
  walkFps: number;
}

export const MINER_ATLAS: AtlasInfo = {
  src: "/cave/greedy-gold-miner/gold-miner-atlas.png",
  manifestSrc: "/cave/greedy-gold-miner/gold-miner-atlas.json",
  frameW: 48,
  frameH: 48,
  cols: 8,
  atlasW: 384,
  atlasH: 288,
  cellScale: 1.05,
  idleClipKey: "breathing-idle",
  walkClipKey: "walk",
  idleFps: 6,
  walkFps: 10,
};

export const MONSTER_ATLAS: AtlasInfo = {
  src: "/cave/greedy-gold-miner/cave-monster-atlas.png",
  manifestSrc: "/cave/greedy-gold-miner/cave-monster-atlas.json",
  frameW: 92,
  frameH: 92,
  cols: 8,
  atlasW: 736,
  atlasH: 644,
  cellScale: 1.25,
  // The monster manifest uses cleaned animation IDs from PixelLab.
  // We auto-resolve the actual key via case-insensitive prefix match
  // below, so just record the prefix here.
  idleClipKey: "Breathing_Idle",
  walkClipKey: "Scary_Walk",
  idleFps: 5,
  walkFps: 9,
};

export const ATLASES: Record<SpriteKind, AtlasInfo> = {
  miner: MINER_ATLAS,
  monster: MONSTER_ATLAS,
};

interface ManifestFrame {
  frame: { x: number; y: number; w: number; h: number };
}

export interface Manifest {
  meta: { columns: number };
  frames: Record<string, ManifestFrame>;
  clips: {
    rotations: Record<string, string[]>;
    animations: Record<string, Record<string, string[]>>;
  };
}

const manifestCache = new Map<string, Promise<Manifest>>();

export function loadManifest(src: string): Promise<Manifest> {
  let p = manifestCache.get(src);
  if (!p) {
    p = fetch(src).then((r) => r.json() as Promise<Manifest>);
    manifestCache.set(src, p);
  }
  return p;
}

export function frameToColRow(
  m: Manifest,
  frameKey: string,
  atlas: AtlasInfo,
): [number, number] {
  const f = m.frames[frameKey]?.frame;
  if (!f) return [0, 0];
  return [Math.floor(f.x / atlas.frameW), Math.floor(f.y / atlas.frameH)];
}

export interface ResolvedAnim {
  frames: string[];
  mirrored: boolean;
}

const HORIZONTAL_MIRROR: Partial<Record<Direction, Direction>> = {
  west: "east",
  east: "west",
};

export function resolveAnimFrames(
  m: Manifest,
  atlas: AtlasInfo,
  anim: SpriteAnim,
  dir: Direction,
): ResolvedAnim {
  const animsRoot = m.clips.animations;
  const wantPrefix = anim === "idle" ? atlas.idleClipKey : atlas.walkClipKey;
  // First try an exact match, then a case-insensitive prefix match
  // (covers monster keys like "Scary_Walk-5faca324").
  let clipKey: string | null = null;
  if (animsRoot[wantPrefix]) {
    clipKey = wantPrefix;
  } else {
    const lower = wantPrefix.toLowerCase();
    for (const k of Object.keys(animsRoot)) {
      if (k.toLowerCase().startsWith(lower)) {
        clipKey = k;
        break;
      }
    }
  }
  const clip = clipKey ? animsRoot[clipKey] : undefined;
  const frames = clip?.[dir];
  if (frames && frames.length > 0) return { frames, mirrored: false };
  // Mirror: if west is missing try east (and vice-versa).
  const opp = HORIZONTAL_MIRROR[dir];
  if (opp) {
    const oppFrames = clip?.[opp];
    if (oppFrames && oppFrames.length > 0)
      return { frames: oppFrames, mirrored: true };
  }
  // Fallback: rotation frame for this direction.
  const rot = m.clips.rotations[dir];
  if (rot && rot.length > 0) return { frames: rot, mirrored: false };
  // Last resort: the south rotation, never empty in practice.
  return { frames: m.clips.rotations.south ?? [], mirrored: false };
}

export interface MineGameSpriteProps {
  kind: SpriteKind;
  facing: Direction;
  anim: SpriteAnim;
  /** Row in the logical map (0-indexed). */
  row: number;
  /** Column in the logical map (0-indexed). */
  col: number;
  rows: number;
  cols: number;
  zIndex?: number;
  /** Duration in ms of the slide between cells. */
  transitionMs?: number;
}

export const MineGameSprite: React.FC<MineGameSpriteProps> = ({
  kind,
  facing,
  anim,
  row,
  col,
  rows,
  cols,
  zIndex = 5,
  transitionMs = 90,
}) => {
  const atlas = ATLASES[kind];
  const [manifest, setManifest] = useState<Manifest | null>(null);
  const [frameIdx, setFrameIdx] = useState(0);
  const [cellPx, setCellPx] = useState(48);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let alive = true;
    loadManifest(atlas.manifestSrc).then((m) => {
      if (alive) setManifest(m);
    });
    return () => {
      alive = false;
    };
  }, [atlas.manifestSrc]);

  // Track parent size to compute pixel cell size.
  useEffect(() => {
    const el = wrapRef.current?.parentElement;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      const w = el.clientWidth / cols;
      const h = el.clientHeight / rows;
      setCellPx(Math.max(8, Math.min(w, h)));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [rows, cols]);

  // Animation loop.
  useEffect(() => {
    if (!manifest) return;
    const fps = anim === "walk" ? atlas.walkFps : atlas.idleFps;
    const { frames } = resolveAnimFrames(manifest, atlas, anim, facing);
    if (frames.length <= 1) {
      setFrameIdx(0);
      return;
    }
    setFrameIdx(0);
    const id = setInterval(
      () => {
        setFrameIdx((i) => (i + 1) % frames.length);
      },
      Math.max(40, Math.round(1000 / fps)),
    );
    return () => clearInterval(id);
  }, [manifest, anim, facing, atlas]);

  if (!manifest) {
    return <div ref={wrapRef} style={{ display: "none" }} />;
  }

  const { frames, mirrored } = resolveAnimFrames(manifest, atlas, anim, facing);
  const frameKey = frames[frameIdx % frames.length] ?? frames[0];
  const [fc, fr] = frameToColRow(manifest, frameKey, atlas);

  const size = cellPx * atlas.cellScale;
  // Center of the (row, col) cell in % of map dimensions.
  const cx = ((col + 0.5) / cols) * 100;
  const cy = ((row + 0.5) / rows) * 100;

  const bgWidth = atlas.atlasW * (size / atlas.frameW);
  const bgHeight = atlas.atlasH * (size / atlas.frameH);
  const bgX = -fc * size;
  const bgY = -fr * size;

  return (
    <div
      ref={wrapRef}
      style={{
        position: "absolute",
        left: `${cx}%`,
        top: `${cy}%`,
        width: size,
        height: size,
        marginLeft: -size / 2,
        marginTop: -size / 2,
        backgroundImage: `url(${atlas.src})`,
        backgroundPosition: `${bgX}px ${bgY}px`,
        backgroundSize: `${bgWidth}px ${bgHeight}px`,
        backgroundRepeat: "no-repeat",
        imageRendering: "pixelated",
        pointerEvents: "none",
        zIndex,
        transform: mirrored ? "scaleX(-1)" : undefined,
        transition: `left ${transitionMs}ms linear, top ${transitionMs}ms linear`,
      }}
    />
  );
};

export default MineGameSprite;
