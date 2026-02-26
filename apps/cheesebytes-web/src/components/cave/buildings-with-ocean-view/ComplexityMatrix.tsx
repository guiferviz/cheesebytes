import { useRef, useEffect, useState, useCallback } from "react";
import { SPRITES, BUILDINGS_KEY, SHEET_PATH } from "./sprites";
import { parseHeights } from "./types";
import { CheeseSlideContainer } from "../shared";
import { CB_HEX } from "../../../styles/palette";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type PhaserObj = any;

// ── Reveal.js global type ──
interface RevealApi {
  on: (event: string, cb: (ev?: unknown) => void) => void;
  off: (event: string, cb: (ev?: unknown) => void) => void;
  sync?: () => void;
}
const getReveal = (): RevealApi | null =>
  (typeof window !== "undefined" &&
    (window as unknown as { Reveal?: RevealApi }).Reveal) ||
  null;

export interface ComplexityMatrixProps {
  heights: number[];
  showEditor?: boolean;
  width?: number;
  height?: number;
  waitForSlideTrigger?: boolean;
}

/**
 * Brute-force O(n²) comparison matrix with animated dots.
 *
 * - Square n×n grid, centred.
 * - Buildings above (columns) and to the LEFT (rows, same order).
 * - Ocean on the LEFT → last building (rightmost) compares with all in front.
 * - Lower-left triangle is filled with dots.
 * - Animation: last column first, sweeping left.
 * - Restarts on RevealJS slide activation.
 */
export const ComplexityMatrix: React.FC<ComplexityMatrixProps> = ({
  heights: initialHeights,
  showEditor = false,
  width = 1080,
  height = 620,
  waitForSlideTrigger = true,
}) => {
  const [heights, setHeights] = useState(initialHeights);
  const [heightInput, setHeightInput] = useState(initialHeights.join(", "));

  const handleHeightInputChange = useCallback((value: string) => {
    setHeightInput(value);
    const parsed = parseHeights(value);
    if (parsed.length > 0) setHeights(parsed);
  }, []);

  return (
    <CheeseSlideContainer>
      {showEditor && (
        <div className="flex items-center justify-center gap-3 mb-4">
          <label className="text-sm font-medium text-stone-600 dark:text-stone-300">
            heights =
          </label>
          <input
            type="text"
            value={heightInput}
            onChange={(e) => handleHeightInputChange(e.target.value)}
            className="font-mono text-sm bg-stone-100 dark:bg-stone-800 text-amber-700 dark:text-amber-300 border border-stone-300 dark:border-stone-600 rounded-lg px-3 py-2 w-80 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent"
            placeholder="4, 2, 3, 1"
          />
          <span className="text-xs text-stone-400 dark:text-stone-500">
            (0-9)
          </span>
        </div>
      )}
      <MatrixCanvas
        key={heights.join("-")}
        heights={heights}
        width={width}
        height={height}
        waitForSlideTrigger={waitForSlideTrigger}
      />
    </CheeseSlideContainer>
  );
};

// ── Inner Phaser canvas (remounts on height change via key) ──

interface MatrixCanvasProps {
  heights: number[];
  width: number;
  height: number;
  waitForSlideTrigger: boolean;
}

const MatrixCanvas: React.FC<MatrixCanvasProps> = ({
  heights,
  width,
  height,
  waitForSlideTrigger,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<PhaserObj>(null);
  const sceneRef = useRef<PhaserObj>(null);
  const armedRef = useRef(true);
  const triggerRef = useRef<HTMLSpanElement | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const hideDots = useCallback(() => {
    const scene = sceneRef.current;
    if (!scene || !scene.dots) return;
    // Kill in-progress tweens FIRST so they don't override setScale(0)
    scene.tweens.killAll();
    for (const d of scene.dots as PhaserObj[]) d.setScale(0);
  }, []);

  const replay = useCallback(() => {
    const scene = sceneRef.current;
    if (!scene || !scene.dots) return;
    scene.tweens.killAll();
    const dots: PhaserObj[] = scene.dots;
    const n = heights.length;
    const dotDelay = 120;
    const colGap = 280;
    let globalIdx = 0;

    for (const d of dots) d.setScale(0);

    // Animate from first column to last (leftmost building first)
    for (let col = 0; col < n; col++) {
      for (const d of dots) {
        if (d.getData("col") !== col) continue;
        const delay = globalIdx * dotDelay + col * colGap;
        scene.tweens.add({
          targets: d,
          scaleX: 1,
          scaleY: 1,
          ease: "Back.easeOut",
          duration: 350,
          delay,
        });
        globalIdx++;
      }
    }
  }, [heights]);

  // RevealJS trigger:
  // - When slide becomes present: keep matrix visible but dots hidden.
  // - When a specific fragment is revealed: play animation.
  useEffect(() => {
    if (!waitForSlideTrigger) {
      armedRef.current = false;
      return;
    }

    const ensureTriggerFragment = () => {
      if (!containerRef.current) return;
      const section = containerRef.current.closest("section");
      if (!section) return;

      const existing = section.querySelector(
        ".fragment[data-cm-trigger]",
      ) as HTMLSpanElement | null;
      if (existing) {
        triggerRef.current = existing;
        return;
      }

      const frag = document.createElement("span");
      frag.className = "fragment";
      frag.setAttribute("data-cm-trigger", "auto");
      frag.setAttribute("aria-hidden", "true");
      frag.style.position = "absolute";
      frag.style.width = "0";
      frag.style.height = "0";
      frag.style.overflow = "hidden";
      frag.style.pointerEvents = "none";
      section.appendChild(frag);
      triggerRef.current = frag;

      const reveal = getReveal();
      reveal?.sync?.();
    };

    const handleSlideChanged = () => {
      if (!containerRef.current) return;
      const activeSlide = document.querySelector(".reveal .present");
      if (activeSlide && activeSlide.contains(containerRef.current)) {
        ensureTriggerFragment();
        armedRef.current = true;
        hideDots();
      } else {
        // Leaving this slide (e.g. going back): matrix must reset to empty
        armedRef.current = true;
        hideDots();

        const section = containerRef.current.closest("section");
        if (section) {
          const trigger = section.querySelector(
            ".fragment[data-cm-trigger]",
          ) as HTMLSpanElement | null;
          trigger?.classList.remove("visible", "current-fragment");
        }
      }
    };

    const handleFragmentShown = (ev?: unknown) => {
      if (!containerRef.current || !armedRef.current) return;
      const activeSlide = document.querySelector(".reveal .present");
      if (!activeSlide || !activeSlide.contains(containerRef.current)) return;

      const fragment = (ev as { fragment?: Element } | undefined)?.fragment;
      if (!fragment) return;
      const sameSlide = activeSlide.contains(fragment);
      const isTrigger = fragment.hasAttribute("data-cm-trigger");
      if (!sameSlide || !isTrigger) return;

      replay();
      armedRef.current = false;
    };

    const handleFragmentHidden = (ev?: unknown) => {
      if (!containerRef.current) return;
      const activeSlide = document.querySelector(".reveal .present");
      if (!activeSlide || !activeSlide.contains(containerRef.current)) return;

      const fragment = (ev as { fragment?: Element } | undefined)?.fragment;
      if (!fragment || !fragment.hasAttribute("data-cm-trigger")) return;

      armedRef.current = true;
      hideDots();
    };

    ensureTriggerFragment();
    const initialCheck = setTimeout(handleSlideChanged, 300);
    const reveal = getReveal();
    if (reveal) {
      reveal.on("slidechanged", handleSlideChanged);
      reveal.on("fragmentshown", handleFragmentShown);
      reveal.on("fragmenthidden", handleFragmentHidden);
    }

    return () => {
      clearTimeout(initialCheck);
      const r = getReveal();
      if (r) {
        r.off("slidechanged", handleSlideChanged);
        r.off("fragmentshown", handleFragmentShown);
        r.off("fragmenthidden", handleFragmentHidden);
      }
      if (triggerRef.current?.getAttribute("data-cm-trigger") === "auto") {
        triggerRef.current.remove();
      }
      triggerRef.current = null;
    };
  }, [hideDots, replay, waitForSlideTrigger]);

  // Create Phaser game
  useEffect(() => {
    if (!containerRef.current || gameRef.current) return;

    import("phaser").then((Phaser) => {
      const PhaserLib = Phaser.default ?? Phaser;

      class MatrixScene extends PhaserLib.Scene {
        dots: PhaserObj[] = [];

        constructor() {
          super({ key: `CM-${Math.random().toString(36).slice(2)}` });
        }

        preload() {
          if (!this.textures.exists(BUILDINGS_KEY)) {
            this.load.image(BUILDINGS_KEY, SHEET_PATH);
          }
        }

        create() {
          const tex = this.textures.get(BUILDINGS_KEY);
          if (!tex.has(SPRITES.balcony.frame)) {
            tex.add(
              SPRITES.balcony.frame,
              0,
              SPRITES.balcony.x,
              SPRITES.balcony.y,
              SPRITES.balcony.w,
              SPRITES.balcony.h,
            );
            tex.add(
              SPRITES.window.frame,
              0,
              SPRITES.window.x,
              SPRITES.window.y,
              SPRITES.window.w,
              SPRITES.window.h,
            );
            tex.add(
              SPRITES.door.frame,
              0,
              SPRITES.door.x,
              SPRITES.door.y,
              SPRITES.door.w,
              SPRITES.door.h,
            );
          }

          const n = heights.length;

          // ── Layout: centred square grid ──
          const buildingMargin = height * 0.2;
          const pad = 20;
          const gridSize = Math.min(
            width - buildingMargin - pad * 2,
            height - buildingMargin - pad * 2,
          );
          const cell = gridSize / n;

          // Centre the composite (left-buildings + grid) horizontally,
          // and (top-buildings + grid) vertically.
          const totalW = gridSize + buildingMargin;
          const totalH = gridSize + buildingMargin;
          const originX = (width - totalW) / 2;
          const originY = (height - totalH) / 2;

          const gridLeft = originX + buildingMargin;
          const gridTop = originY + buildingMargin;
          const gridRight = gridLeft + gridSize;
          const gridBottom = gridTop + gridSize;

          // ── Grid lines ──
          const gridGfx = this.add.graphics();
          gridGfx.lineStyle(2, 0x475569, 0.8);
          for (let i = 0; i <= n; i++) {
            gridGfx.moveTo(gridLeft + i * cell, gridTop);
            gridGfx.lineTo(gridLeft + i * cell, gridBottom);
            gridGfx.moveTo(gridLeft, gridTop + i * cell);
            gridGfx.lineTo(gridRight, gridTop + i * cell);
          }
          gridGfx.strokePath();

          // Diagonal (top-left to bottom-right)
          const diagGfx = this.add.graphics();
          diagGfx.lineStyle(2, 0x475569, 0.8);
          diagGfx.moveTo(gridLeft, gridTop);
          diagGfx.lineTo(gridRight, gridBottom);
          diagGfx.strokePath();

          // ── Dots — LOWER-LEFT triangle ──
          // Row i = building i (direct order).
          // Building `col` compares against every building in front
          // (indices 0 … col-1).  Dot at (col, row) when row < col.
          const dotR = cell * 0.22;
          this.dots = [];

          for (let col = 1; col < n; col++) {
            for (let row = 0; row < col; row++) {
              const cx = gridLeft + col * cell + cell / 2;
              const cy = gridTop + row * cell + cell / 2;
              const dot = this.add.circle(cx, cy, dotR, CB_HEX.orange, 0.9);
              dot.setScale(0);
              dot.setData("col", col);
              dot.setData("row", row);
              this.dots.push(dot);
            }
          }

          // ── Buildings above (columns, index 0 … n-1) ──
          const maxH = Math.max(...heights, 1);
          const tallestSprite =
            SPRITES.door.h + SPRITES.balcony.h + maxH * SPRITES.window.h;
          const bScale = Math.min(
            (buildingMargin * 0.72) / tallestSprite,
            (cell * 0.78) / SPRITES.balcony.w,
            0.15,
          );

          for (let i = 0; i < n; i++) {
            const cx = gridLeft + i * cell + cell / 2;
            this.drawBuilding(cx, gridTop - 6, heights[i], bScale);
          }

          // ── Buildings LEFT of grid (rows, direct order: row i = building i) ──
          for (let row = 0; row < n; row++) {
            const cy = gridTop + row * cell + cell / 2;
            this.drawBuildingRotatedLeft(
              gridLeft - 6,
              cy,
              heights[row],
              bScale,
            );
          }

          sceneRef.current = this;
          setIsLoading(false);
          if (waitForSlideTrigger) {
            hideDots();
          } else {
            replay();
          }
        }

        drawBuilding(cx: number, baseY: number, h: number, sc: number) {
          let y = 0;
          this.addSeg(cx, baseY - y, SPRITES.door, sc);
          y += SPRITES.door.h * sc;
          for (let w = 0; w < h; w++) {
            this.addSeg(cx, baseY - y, SPRITES.window, sc);
            y += SPRITES.window.h * sc;
          }
          this.addSeg(cx, baseY - y, SPRITES.balcony, sc);
        }

        /** Building rotated 90° CCW, growing leftward from baseX. */
        drawBuildingRotatedLeft(
          baseX: number,
          cy: number,
          h: number,
          sc: number,
        ) {
          let x = 0;
          this.addSegRotL(baseX - x, cy, SPRITES.door, sc);
          x += SPRITES.door.h * sc;
          for (let w = 0; w < h; w++) {
            this.addSegRotL(baseX - x, cy, SPRITES.window, sc);
            x += SPRITES.window.h * sc;
          }
          this.addSegRotL(baseX - x, cy, SPRITES.balcony, sc);
        }

        addSeg(x: number, botY: number, s: typeof SPRITES.door, sc: number) {
          const img = this.add.image(
            x,
            botY - (s.h * sc) / 2,
            BUILDINGS_KEY,
            s.frame,
          );
          img.setDisplaySize(s.w * sc, s.h * sc);
        }

        addSegRotL(rx: number, cy: number, s: typeof SPRITES.door, sc: number) {
          const dispW = Math.max(1, Math.round(s.w * sc));
          const dispH = Math.max(1, Math.round(s.h * sc));
          const x = Math.round(rx - dispH / 2);
          const y = Math.round(cy);
          const img = this.add.image(x, y, BUILDINGS_KEY, s.frame);
          img.setDisplaySize(dispW, dispH);
          img.setAngle(-90);
        }
      }

      gameRef.current = new PhaserLib.Game({
        type: PhaserLib.AUTO,
        parent: containerRef.current!,
        width,
        height,
        transparent: true,
        render: {
          pixelArt: false,
          antialias: true,
          antialiasGL: true,
          roundPixels: false,
        },
        input: { mouse: { preventDefaultWheel: false } },
        scene: MatrixScene,
      });
    });

    return () => {
      gameRef.current?.destroy(true);
      gameRef.current = null;
      sceneRef.current = null;
    };
  }, [heights, width, height, hideDots, replay, waitForSlideTrigger]);

  return (
    <div
      ref={containerRef}
      className="overflow-hidden rounded-[14px]"
      style={{ width, height, background: "transparent" }}
    >
      {isLoading && (
        <div className="w-full h-full flex items-center justify-center">
          <span className="text-sky-400">Loading…</span>
        </div>
      )}
    </div>
  );
};

export default ComplexityMatrix;
