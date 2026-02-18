import { useRef, useEffect, useState } from "react";
import { SPRITES, BUILDINGS_KEY, SHEET_PATH } from "./sprites";
import type { PhaserWorldProps } from "./types";

// Phaser game objects don't export usable TS types at compile time.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type PhaserObj = any;

interface BuildingData {
  door: PhaserObj;
  windows: PhaserObj[];
  balcony: PhaserObj;
}

interface SceneData {
  buildings: BuildingData[];
}

export const PhaserWorld: React.FC<PhaserWorldProps> = ({
  heights,
  width,
  height,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<PhaserObj>(null);
  const sceneDataRef = useRef<SceneData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Create Phaser game once per heights change (key-based remount)
  useEffect(() => {
    if (!containerRef.current || gameRef.current) return;

    import("phaser").then((Phaser) => {
      const PhaserLib = Phaser.default ?? Phaser;

      class SeaScene extends PhaserLib.Scene {
        buildings: BuildingData[] = [];

        constructor() {
          super({ key: `SeaViews-${Math.random().toString(36).slice(2)}` });
        }

        preload() {
          if (!this.textures.exists(BUILDINGS_KEY)) {
            this.load.image(BUILDINGS_KEY, SHEET_PATH);
          }
        }

        create() {
          // Register individual frames from the sprite sheet
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

          this.drawBuildings();

          sceneDataRef.current = {
            buildings: this.buildings,
          };
          setIsLoading(false);
        }

        drawBuildings() {
          this.buildings = [];

          const n = heights.length;
          const maxH = Math.max(...heights, 1);

          // Uniform scale: fit the tallest building into max available height
          // while preserving the sprite's original aspect ratio.
          const skylineBottom = height * 0.83;
          const maxPixels = height * 0.55;
          const tallestBuildingH =
            SPRITES.door.h + SPRITES.balcony.h + maxH * SPRITES.window.h;
          const scale = Math.min(maxPixels / tallestBuildingH, 0.28);

          const buildingW = SPRITES.balcony.w * scale; // aspect-correct width
          const gap = 20;

          // Center buildings as one packed group.
          const rowWidth = n * buildingW + (n - 1) * gap;
          const xStart = width / 2 - rowWidth / 2 + buildingW / 2;
          const actualStep = buildingW + gap;

          for (let i = 0; i < n; i++) {
            const h = heights[i];
            const x = xStart + i * actualStep;

            let yOffset = 0;

            // Door (bottom)
            const door = this.addSegment(
              x,
              skylineBottom - yOffset,
              SPRITES.door,
              scale,
            );
            yOffset += SPRITES.door.h * scale;

            // Windows
            const windows: PhaserObj[] = [];
            for (let w = 0; w < h; w++) {
              const win = this.addSegment(
                x,
                skylineBottom - yOffset,
                SPRITES.window,
                scale,
              );
              windows.push(win);
              yOffset += SPRITES.window.h * scale;
            }

            // Balcony (top)
            const balcony = this.addSegment(
              x,
              skylineBottom - yOffset,
              SPRITES.balcony,
              scale,
            );

            this.buildings.push({
              door,
              windows,
              balcony,
            });
          }
        }

        addSegment(
          x: number,
          bottomY: number,
          sprite: typeof SPRITES.door,
          scale: number,
        ) {
          const dispW = sprite.w * scale;
          const dispH = sprite.h * scale;
          const y = bottomY - dispH / 2;
          const img = this.add.image(x, y, BUILDINGS_KEY, sprite.frame);
          img.setDisplaySize(dispW, dispH);
          return img;
        }
      }

      gameRef.current = new PhaserLib.Game({
        type: PhaserLib.AUTO,
        parent: containerRef.current!,
        width,
        height,
        transparent: true,
        render: { pixelArt: false, antialias: true },
        scene: SeaScene,
      });
    });

    return () => {
      gameRef.current?.destroy(true);
      gameRef.current = null;
      sceneDataRef.current = null;
    };
  }, [width, height]); // heights handled by key-based remount from parent

  return (
    <div
      ref={containerRef}
      className="overflow-hidden rounded-[14px]"
      style={{
        width,
        height,
        boxShadow: "0 12px 30px rgba(0,0,0,0.35)",
        background: "transparent",
      }}
    >
      {isLoading && (
        <div className="w-full h-full flex items-center justify-center">
          <span className="text-sky-400">Loading...</span>
        </div>
      )}
    </div>
  );
};

export default PhaserWorld;
