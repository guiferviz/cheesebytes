import { useRef, useEffect, useState } from "react";
import { SPRITES, BUILDINGS_KEY, SHEET_PATH } from "./sprites";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type PhaserObj = any;

export interface PhaserWorldSolverProps {
  heights: number[];
  width: number;
  height: number;
  currentIndex: number;
  maxSoFar: number;
  viewIndices: number[];
  currentHasView: boolean | null;
}

/* -------------------------------------------------- */
/*  Constants                                          */
/* -------------------------------------------------- */
const FONT_FAMILY = "'IosevkaTermSlab Nerd Font Mono', monospace";

// Dracula palette (dark mode)
const DARK = {
  view: 0x50fa7b,
  blocked: 0xff5555,
  maxLine: 0xffb86c,
  pointer: 0x8be9fd,
  text: "#F8F8F2",
  pointerHex: "#8BE9FD",
  maxHex: "#FFB86C",
  maxLabelBg: "#282A36CC",
  dimColor: 0x000000,
};

// Light palette
const LIGHT = {
  view: 0x16a34a,
  blocked: 0xdc2626,
  maxLine: 0xea580c,
  pointer: 0x0284c7,
  text: "#1C1917",
  pointerHex: "#0284C7",
  maxHex: "#EA580C",
  maxLabelBg: "#FFFFFFCC",
  dimColor: 0xffffff,
};

function getThemeColors(): typeof DARK {
  if (typeof document === "undefined") return DARK;
  return document.documentElement.classList.contains("dark") ? DARK : LIGHT;
}

/* -------------------------------------------------- */

interface BuildingData {
  door: PhaserObj;
  windows: PhaserObj[];
  balcony: PhaserObj;
  x: number;
  topY: number;
  heightVal: number;
}

interface SceneRef {
  scene: PhaserObj;
  buildings: BuildingData[];
  pointer: PhaserObj;
  maxLine: PhaserObj;
  maxLabel: PhaserObj;
  glows: Map<number, PhaserObj>;
  dimOverlays: PhaserObj[];
  heightLabels: PhaserObj[];
  viewIcons: Map<number, PhaserObj>;
  skylineBottom: number;
  scale: number;
  buildingW: number;
  colors: typeof DARK;
  maxLineY: number;
  maxLineRightX: number;
  maxLineTweenProxy: { y: number; rightX: number };
}

/* -------------------------------------------------- */
/*  Draw CheeseIcons-style tick/cross in Phaser        */
/*  (same visual as CheeseTickIcon / CheeseCrossIcon)  */
/* -------------------------------------------------- */

function drawTickIcon(scene: PhaserObj, x: number, y: number, size: number, color: number): PhaserObj {
  const g = scene.add.graphics();
  // Rounded rect background
  g.fillStyle(color, 0.15);
  g.fillRoundedRect(x - size / 2, y - size / 2, size, size, size * 0.2);
  // Tick path: same proportions as CheeseTickIcon SVG
  const s = size / 96; // scale from 96x96 viewBox
  const ox = x - size / 2;
  const oy = y - size / 2;
  g.lineStyle(size * 0.1, color, 1);
  g.beginPath();
  g.moveTo(ox + 28 * s, oy + 50 * s);
  g.lineTo(ox + 42 * s, oy + 64 * s);
  g.lineTo(ox + 68 * s, oy + 32 * s);
  g.strokePath();
  return g;
}

function drawCrossIcon(scene: PhaserObj, x: number, y: number, size: number, color: number): PhaserObj {
  const g = scene.add.graphics();
  // Rounded rect background
  g.fillStyle(color, 0.15);
  g.fillRoundedRect(x - size / 2, y - size / 2, size, size, size * 0.2);
  // Cross paths: same proportions as CheeseCrossIcon SVG
  const s = size / 96;
  const ox = x - size / 2;
  const oy = y - size / 2;
  g.lineStyle(size * 0.1, color, 1);
  g.beginPath();
  g.moveTo(ox + 32 * s, oy + 32 * s);
  g.lineTo(ox + 64 * s, oy + 64 * s);
  g.strokePath();
  g.beginPath();
  g.moveTo(ox + 64 * s, oy + 32 * s);
  g.lineTo(ox + 32 * s, oy + 64 * s);
  g.strokePath();
  return g;
}

/* -------------------------------------------------- */

export const PhaserWorldSolver: React.FC<PhaserWorldSolverProps> = ({
  heights,
  width,
  height,
  currentIndex,
  maxSoFar,
  viewIndices,
  currentHasView,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<PhaserObj>(null);
  const sceneRef = useRef<SceneRef | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const currentIndexRef = useRef(currentIndex);
  const maxSoFarRef = useRef(maxSoFar);
  const viewIndicesRef = useRef(viewIndices);
  const currentHasViewRef = useRef(currentHasView);
  currentIndexRef.current = currentIndex;
  maxSoFarRef.current = maxSoFar;
  viewIndicesRef.current = viewIndices;
  currentHasViewRef.current = currentHasView;

  useEffect(() => {
    if (!containerRef.current || gameRef.current) return;

    const colors = getThemeColors();

    import("phaser").then((Phaser) => {
      const PhaserLib = Phaser.default ?? Phaser;

      class SolverScene extends PhaserLib.Scene {
        buildings: BuildingData[] = [];
        pointer: PhaserObj = null;
        maxLine: PhaserObj = null;
        maxLabel: PhaserObj = null;
        glows: Map<number, PhaserObj> = new Map();
        dimOverlays: PhaserObj[] = [];
        heightLabels: PhaserObj[] = [];
        viewIcons: Map<number, PhaserObj> = new Map();
        skylineBottom = 0;
        bScale = 0;
        buildingW = 0;
        xStart = 0;
        actualStep = 0;

        constructor() {
          super({
            key: `SeaSolver-${Math.random().toString(36).slice(2)}`,
          });
        }

        preload() {
          if (!this.textures.exists(BUILDINGS_KEY)) {
            this.load.image(BUILDINGS_KEY, SHEET_PATH);
          }
        }

        create() {
          const tex = this.textures.get(BUILDINGS_KEY);
          if (!tex.has(SPRITES.balcony.frame)) {
            tex.add(SPRITES.balcony.frame, 0, SPRITES.balcony.x, SPRITES.balcony.y, SPRITES.balcony.w, SPRITES.balcony.h);
            tex.add(SPRITES.window.frame, 0, SPRITES.window.x, SPRITES.window.y, SPRITES.window.w, SPRITES.window.h);
            tex.add(SPRITES.door.frame, 0, SPRITES.door.x, SPRITES.door.y, SPRITES.door.w, SPRITES.door.h);
          }

          this.drawBuildings();
          this.createOverlays();
          this.createPointer();
          this.createMaxLine();
          this.createHeightLabels();

          sceneRef.current = {
            scene: this,
            buildings: this.buildings,
            pointer: this.pointer,
            maxLine: this.maxLine,
            maxLabel: this.maxLabel,
            glows: this.glows,
            dimOverlays: this.dimOverlays,
            heightLabels: this.heightLabels,
            viewIcons: this.viewIcons,
            skylineBottom: this.skylineBottom,
            scale: this.bScale,
            buildingW: this.buildingW,
            colors,
            maxLineY: -1,
            maxLineRightX: -1,
            maxLineTweenProxy: { y: -1, rightX: -1 },
          };

          setIsLoading(false);
        }

        drawBuildings() {
          const n = heights.length;
          const maxH = Math.max(...heights, 1);

          this.skylineBottom = height * 0.78;
          const maxPixels = height * 0.50;
          const tallestH = SPRITES.door.h + SPRITES.balcony.h + maxH * SPRITES.window.h;
          this.bScale = Math.min(maxPixels / tallestH, 0.28);

          this.buildingW = SPRITES.balcony.w * this.bScale;
          const gap = 20;
          const rowWidth = n * this.buildingW + (n - 1) * gap;
          this.xStart = width / 2 - rowWidth / 2 + this.buildingW / 2;
          this.actualStep = this.buildingW + gap;

          for (let i = 0; i < n; i++) {
            const h = heights[i];
            const x = this.xStart + i * this.actualStep;
            let yOffset = 0;

            const door = this.addSegment(x, this.skylineBottom - yOffset, SPRITES.door, this.bScale);
            yOffset += SPRITES.door.h * this.bScale;

            const windows: PhaserObj[] = [];
            for (let w = 0; w < h; w++) {
              const win = this.addSegment(x, this.skylineBottom - yOffset, SPRITES.window, this.bScale);
              windows.push(win);
              yOffset += SPRITES.window.h * this.bScale;
            }

            const balcony = this.addSegment(x, this.skylineBottom - yOffset, SPRITES.balcony, this.bScale);
            yOffset += SPRITES.balcony.h * this.bScale;
            const topY = this.skylineBottom - yOffset;

            this.buildings.push({ door, windows, balcony, x, topY, heightVal: h });
          }
        }

        addSegment(x: number, bottomY: number, sprite: typeof SPRITES.door, scale: number) {
          const dispW = sprite.w * scale;
          const dispH = sprite.h * scale;
          const y = bottomY - dispH / 2;
          const img = this.add.image(x, y, BUILDINGS_KEY, sprite.frame);
          img.setDisplaySize(dispW, dispH);
          return img;
        }

        createOverlays() {
          const n = heights.length;
          for (let i = 0; i < n; i++) {
            const b = this.buildings[i];
            const totalH = this.skylineBottom - b.topY;
            const rect = this.add.rectangle(
              b.x,
              b.topY + totalH / 2,
              this.buildingW + 4,
              totalH + 4,
              colors.dimColor,
              0.55,
            );
            rect.setDepth(5);
            this.dimOverlays.push(rect);
          }
        }

        createPointer() {
          // Pre-position at first building so first fade-in has zero movement
          const firstB = this.buildings[0];
          const iconSize = 28;
          const initX = firstB ? firstB.x : 0;
          const initY = firstB ? firstB.topY - iconSize - 24 : 0;
          const container = this.add.container(initX, initY);

          const gfx = this.add.graphics();
          gfx.fillStyle(colors.pointer, 1);
          gfx.fillTriangle(0, 0, -14, -24, 14, -24);
          gfx.lineStyle(3, colors.pointer, 1);
          gfx.lineBetween(0, -24, 0, -48);

          const label = this.add.text(0, -62, "i", {
            fontFamily: FONT_FAMILY,
            fontSize: "18px",
            color: colors.pointerHex,
            fontStyle: "bold",
            resolution: 2,
          }).setOrigin(0.5, 0.5);

          container.add([gfx, label]);
          container.setVisible(false);
          container.setDepth(20);

          this.pointer = container;
        }

        createMaxLine() {
          this.maxLine = this.add.graphics();
          this.maxLine.setDepth(15);
          this.maxLine.setVisible(false);

          this.maxLabel = this.add.text(0, 0, "", {
            fontFamily: FONT_FAMILY,
            fontSize: "16px",
            color: colors.maxHex,
            fontStyle: "bold",
            backgroundColor: colors.maxLabelBg,
            padding: { x: 6, y: 3 },
            resolution: 2,
          }).setOrigin(0, 0.5);
          this.maxLabel.setDepth(16);
          this.maxLabel.setVisible(false);
        }

        createHeightLabels() {
          for (let i = 0; i < heights.length; i++) {
            const b = this.buildings[i];
            const label = this.add.text(
              b.x,
              this.skylineBottom + 14,
              `${heights[i]}`,
              {
                fontFamily: FONT_FAMILY,
                fontSize: "16px",
                color: colors.text,
                fontStyle: "bold",
                resolution: 2,
              },
            ).setOrigin(0.5, 0);
            label.setDepth(10);
            this.heightLabels.push(label);
          }
        }
      }

      gameRef.current = new PhaserLib.Game({
        type: PhaserLib.AUTO,
        parent: containerRef.current!,
        width,
        height,
        transparent: true,
        render: { pixelArt: false, antialias: true },
        scene: SolverScene,
      });
    });

    return () => {
      gameRef.current?.destroy(true);
      gameRef.current = null;
      sceneRef.current = null;
    };
  }, [width, height]);

  // ---- Sync React state -> Phaser visuals ----
  useEffect(() => {
    const ref = sceneRef.current;
    if (!ref || !ref.scene) return;

    const { scene, buildings, pointer, maxLine, maxLabel, dimOverlays, glows, viewIcons, colors } = ref;
    const n = heights.length;
    const idx = currentIndex;

    const iconSize = 28;

    // --- Pointer ---
    if (idx >= 0 && idx < n) {
      const b = buildings[idx];
      const pointerTargetX = b.x;
      const pointerTargetY = b.topY - iconSize - 24; // well above the icon

      if (!pointer.visible) {
        // First appearance: teleport directly, no tween from (0,0)
        pointer.setPosition(pointerTargetX, pointerTargetY);
        pointer.setAlpha(0);
        pointer.setVisible(true);
        scene.tweens.add({
          targets: pointer,
          alpha: 1,
          duration: 200,
          ease: "Power2",
        });
      } else {
        // Subsequent steps: animate to new position
        scene.tweens.add({
          targets: pointer,
          x: pointerTargetX,
          y: pointerTargetY,
          duration: 250,
          ease: "Back.easeOut",
        });
      }
    } else {
      pointer.setVisible(false);
    }

    // --- Dim overlays: reveal visited (left-to-right) ---
    for (let i = 0; i < n; i++) {
      const visited = idx >= 0 && i <= idx;
      const overlay = dimOverlays[i];
      if (!overlay) continue;

      const targetAlpha = visited ? 0 : 0.55;
      if (Math.abs(overlay.alpha - targetAlpha) > 0.01) {
        scene.tweens.add({
          targets: overlay,
          alpha: targetAlpha,
          duration: 200,
          ease: "Power1",
        });
      }
    }

    // --- Max-so-far line (animated) ---
    if (idx >= 0 && maxSoFar >= 0) {
      maxLine.setVisible(true);
      maxLabel.setVisible(true);

      const targetLineY = ref.skylineBottom -
        (SPRITES.door.h * ref.scale +
          SPRITES.balcony.h * ref.scale +
          maxSoFar * SPRITES.window.h * ref.scale);

      const leftX = buildings[0].x - ref.buildingW / 2 - 16;
      const targetRightX = buildings[idx].x + ref.buildingW / 2 + 16;

      const proxy = ref.maxLineTweenProxy;

      // Helper to redraw the dashed line at current proxy position
      const redrawDashedLine = () => {
        maxLine.clear();
        maxLine.lineStyle(3, colors.maxLine, 0.9);
        const dashLen = 10;
        const gapLen = 6;
        let cx = leftX;
        while (cx < proxy.rightX) {
          const endX = Math.min(cx + dashLen, proxy.rightX);
          maxLine.beginPath();
          maxLine.moveTo(cx, proxy.y);
          maxLine.lineTo(endX, proxy.y);
          maxLine.strokePath();
          cx += dashLen + gapLen;
        }
      };

      // First time: snap directly, no animation
      if (ref.maxLineY < 0) {
        proxy.y = targetLineY;
        proxy.rightX = targetRightX;
        ref.maxLineY = targetLineY;
        ref.maxLineRightX = targetRightX;
        redrawDashedLine();
        maxLabel.setText(`max = ${maxSoFar}`);
        maxLabel.setPosition(targetRightX + 8, targetLineY);
      } else {
        // Animate from current position to new position
        maxLabel.setText(`max = ${maxSoFar}`);
        scene.tweens.add({
          targets: proxy,
          y: targetLineY,
          rightX: targetRightX,
          duration: 280,
          ease: "Power2",
          onUpdate: () => {
            redrawDashedLine();
          },
          onComplete: () => {
            ref.maxLineY = targetLineY;
            ref.maxLineRightX = targetRightX;
          },
        });
        scene.tweens.add({
          targets: maxLabel,
          x: targetRightX + 8,
          y: targetLineY,
          duration: 280,
          ease: "Power2",
        });
      }
    } else {
      maxLine.setVisible(false);
      maxLabel.setVisible(false);
      // Reset so next appearance snaps
      ref.maxLineY = -1;
      ref.maxLineRightX = -1;
    }

    // --- Clean up glows only (they pulse and need refresh) ---
    for (const [, glow] of glows) {
      glow.destroy();
    }
    glows.clear();

    // --- Remove stale icons (when stepping backwards / resetting) ---
    for (const [key, icon] of viewIcons) {
      if (idx < 0 || key > idx) {
        icon.destroy();
        viewIcons.delete(key);
      }
    }

    // --- Draw view/blocked indicators (CheeseIcons style) ---
    for (let i = 0; i <= idx && idx >= 0; i++) {
      const b = buildings[i];
      const hasView = viewIndices.includes(i);
      const isCurrentBuilding = i === idx;

      // Glow behind building
      const totalH = ref.skylineBottom - b.topY;
      const glowColor = hasView ? colors.view : colors.blocked;
      const glowAlpha = isCurrentBuilding ? 0.25 : 0.1;
      const glow = scene.add.rectangle(
        b.x,
        b.topY + totalH / 2,
        ref.buildingW + 8,
        totalH + 8,
        glowColor,
        glowAlpha,
      );
      glow.setDepth(4);

      if (isCurrentBuilding) {
        scene.tweens.add({
          targets: glow,
          alpha: glowAlpha * 0.3,
          duration: 500,
          yoyo: true,
          repeat: -1,
          ease: "Sine.easeInOut",
        });
      }
      glows.set(i, glow);

      // CheeseIcons-style tick or cross above building
      // Only create if not already present (avoid re-animation)
      if (!viewIcons.has(i)) {
        const iconColor = hasView ? colors.view : colors.blocked;
        const iconY = b.topY - iconSize / 2 - 8;
        const icon = hasView
          ? drawTickIcon(scene, b.x, iconY, iconSize, iconColor)
          : drawCrossIcon(scene, b.x, iconY, iconSize, iconColor);
        icon.setDepth(18);

        // Appear animation via alpha fade-in (no movement)
        icon.setAlpha(0);
        scene.tweens.add({
          targets: icon,
          alpha: 1,
          duration: 250,
          ease: "Power2",
          delay: isCurrentBuilding ? 80 : 0,
        });

        viewIcons.set(i, icon);
      }
    }
  }, [currentIndex, maxSoFar, viewIndices, currentHasView, heights]);

  return (
    <div
      ref={containerRef}
      className="overflow-hidden"
      style={{ width, height }}
    >
      {isLoading && (
        <div className="w-full h-full flex items-center justify-center">
          <span className="text-stone-400 dark:text-stone-500">Loading...</span>
        </div>
      )}
    </div>
  );
};

export default PhaserWorldSolver;
