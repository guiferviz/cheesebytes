import { useRef, useEffect, useState } from 'react';
import { SPRITE_SIZE, SPRITES, WATER_SURFACE_FRAMES, DEFAULT_SPRITE_SHEET } from './sprites';

interface PhaserWorldProps {
  heights: number[];
  waterLevels: number[];
  spriteSheet?: string;
  scale?: number;
  showRain?: boolean;
  highlightedColumn?: number;
  leftPointer?: number;
  rightPointer?: number;
  width?: number;
  height?: number;
}

// Store scene reference and pointer containers globally for updates
interface SceneData {
  scene: any;
  leftPointerContainer: any;
  rightPointerContainer: any;
  waterSprites: any[];
  startX: number;
  groundY: number;
  scaledSize: number;
}

export const PhaserWorld: React.FC<PhaserWorldProps> = ({
  heights,
  waterLevels,
  spriteSheet = DEFAULT_SPRITE_SHEET,
  scale = 0.375, // 128 * 0.375 = 48px (integer to avoid gaps)
  showRain = false,
  highlightedColumn,
  leftPointer,
  rightPointer,
  width = 1024,
  height = 720,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<any>(null);
  const sceneDataRef = useRef<SceneData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Create Phaser game once
  useEffect(() => {
    if (!containerRef.current || gameRef.current) return;
    
    // Dynamic import to avoid SSR issues
    import('phaser').then((Phaser) => {
      const scaledSize = SPRITE_SIZE * scale;

      class TrappingWaterScene extends Phaser.Scene {
        leftPointerContainer: any = null;
        rightPointerContainer: any = null;
        waterSprites: any[] = [];

        constructor() {
          super({ key: 'TrappingWaterScene' });
        }

        preload() {
          this.load.spritesheet('tiles', spriteSheet, {
            frameWidth: SPRITE_SIZE,
            frameHeight: SPRITE_SIZE,
          });
        }

        create() {
          const numColumns = heights.length;
          const totalWidth = numColumns * scaledSize;
          const startX = (width - totalWidth) / 2;
          const groundY = height - scaledSize * 2;

          // Background
          this.createBackground(groundY);
          
          // Ground
          this.createGround(startX, groundY, numColumns);
          
          // Terrain
          this.createTerrain(startX, groundY);
          
          // Water animation
          const waterFrame1 = WATER_SURFACE_FRAMES[0];
          const waterFrame2 = WATER_SURFACE_FRAMES[1];
          if (!this.anims.exists('water-surface')) {
            this.anims.create({
              key: 'water-surface',
              frames: [
                { key: 'tiles', frame: waterFrame1 },
                { key: 'tiles', frame: waterFrame2 },
              ],
              frameRate: 2,
              repeat: -1,
            });
          }
          
          // Water
          this.createWater(startX, groundY);

          // Rain
          if (showRain) {
            this.createRain();
          }
          
          // Create pointer containers (always create them, just set visibility)
          const pointerY = groundY + scaledSize + 25;
          this.leftPointerContainer = this.createPointerContainer(0, pointerY, 'L', 0x22C55E);
          this.rightPointerContainer = this.createPointerContainer(0, pointerY, 'R', 0xF59E0B);
          
          // Position pointers initially
          if (leftPointer !== undefined) {
            const x = startX + leftPointer * scaledSize + scaledSize / 2;
            this.leftPointerContainer.setPosition(x, pointerY);
            this.leftPointerContainer.setVisible(true);
          } else {
            this.leftPointerContainer.setVisible(false);
          }
          
          if (rightPointer !== undefined) {
            const x = startX + rightPointer * scaledSize + scaledSize / 2;
            this.rightPointerContainer.setPosition(x, pointerY);
            this.rightPointerContainer.setVisible(true);
          } else {
            this.rightPointerContainer.setVisible(false);
          }

          // Store scene data for external updates
          sceneDataRef.current = {
            scene: this,
            leftPointerContainer: this.leftPointerContainer,
            rightPointerContainer: this.rightPointerContainer,
            waterSprites: this.waterSprites,
            startX,
            groundY,
            scaledSize,
          };
          
          setIsLoading(false);
        }

        createBackground(groundY: number) {
        }

        createRain() {
          if (!this.textures.exists('raindrop')) {
            const graphics = this.make.graphics({ x: 0, y: 0, add: false });
            graphics.fillStyle(0xaaddff, 0.6);
            graphics.fillRect(0, 0, 1, 10);
            graphics.generateTexture('raindrop', 2, 15);
          }

          this.add.particles(0, 0, 'raindrop', {
            x: { min: 0, max: width },
            y: -20,
            lifespan: 1500,
            speedY: { min: 400, max: 600 },
            speedX: { min: -20, max: 20 },
            scale: { start: 1, end: 1 },
            quantity: 3,
            frequency: 10,
            alpha: { start: 0.6, end: 0.2 },
            blendMode: 'ADD'
          });
        }

        createGround(startX: number, groundY: number, numColumns: number) {
          for (let col = -1; col <= numColumns; col++) {
            const x = startX + col * scaledSize + scaledSize / 2;
            const y = groundY + scaledSize / 2;
            
            let groundFrame = SPRITES.GROUND;
            if (col === -1) groundFrame = SPRITES.GROUND_LEFT;
            else if (col === numColumns) groundFrame = SPRITES.GROUND_RIGHT;

            const sprite = this.add.sprite(x, y, 'tiles', groundFrame);
            sprite.setScale(scale);
          }
        }

        createTerrain(startX: number, groundY: number) {
          const blockFrame = SPRITES.BLOCK_BROWN;
          
          for (let col = 0; col < heights.length; col++) {
            const h = heights[col];
            const x = startX + col * scaledSize + scaledSize / 2;
            for (let row = 0; row < h; row++) {
              const y = groundY - (row + 1) * scaledSize + scaledSize / 2;
              const sprite = this.add.sprite(x, y, 'tiles', blockFrame);
              sprite.setScale(scale);
            }
          }
        }

        createWater(startX: number, groundY: number) {
          const waterFullFrame = SPRITES.WATER_FULL;
          const waterSurfaceFrame = SPRITES.WATER_SURFACE_1;
          
          for (let col = 0; col < heights.length; col++) {
            const waterHeight = waterLevels[col];
            if (waterHeight <= 0) continue;
            
            const terrainHeight = heights[col];
            const x = startX + col * scaledSize + scaledSize / 2;
            
            for (let row = 0; row < waterHeight; row++) {
              const y = groundY - (terrainHeight + row + 1) * scaledSize + scaledSize / 2;
              const isTop = row === waterHeight - 1;
              const sprite = this.add.sprite(x, y, 'tiles', isTop ? waterSurfaceFrame : waterFullFrame);
              sprite.setScale(scale);
              sprite.setAlpha(0.85);
              if (isTop) sprite.play('water-surface');
              this.waterSprites.push(sprite);
            }
          }
        }

        createPointerContainer(x: number, y: number, label: string, color: number) {
          const container = this.add.container(x, y);
          
          const graphics = this.add.graphics();
          graphics.fillStyle(color);
          graphics.beginPath();
          graphics.moveTo(0, -25);
          graphics.lineTo(-12, -8);
          graphics.lineTo(-5, -8);
          graphics.lineTo(-5, 8);
          graphics.lineTo(5, 8);
          graphics.lineTo(5, -8);
          graphics.lineTo(12, -8);
          graphics.closePath();
          graphics.fillPath();
          
          const text = this.add.text(0, 0, label, {
            fontFamily: 'monospace',
            fontSize: '12px',
            color: '#FFFFFF',
          }).setOrigin(0.5, 0.5);
          
          container.add([graphics, text]);
          return container;
        }
      }

      gameRef.current = new Phaser.Game({
        type: Phaser.AUTO,
        parent: containerRef.current!,
        width,
        height,
        pixelArt: true,
        antialias: false,
        roundPixels: true,
        scene: TrappingWaterScene,
        render: {
          pixelArt: true,
          antialias: false,
          roundPixels: true,
        },
      });
    });

    return () => {
      gameRef.current?.destroy(true);
      gameRef.current = null;
      sceneDataRef.current = null;
    };
  }, [heights, waterLevels, scale, showRain, spriteSheet, width, height]); // Note: pointers NOT in deps

  // Update pointer positions with tween animation
  useEffect(() => {
    const data = sceneDataRef.current;
    if (!data || !data.scene) return;

    const { scene, leftPointerContainer, rightPointerContainer, startX, groundY, scaledSize } = data;
    const pointerY = groundY + scaledSize + 25;

    if (leftPointer !== undefined && leftPointerContainer) {
      const targetX = startX + leftPointer * scaledSize + scaledSize / 2;
      leftPointerContainer.setVisible(true);
      
      scene.tweens.add({
        targets: leftPointerContainer,
        x: targetX,
        y: pointerY,
        duration: 200,
        ease: 'Power2'
      });
    } else if (leftPointerContainer) {
      leftPointerContainer.setVisible(false);
    }

    if (rightPointer !== undefined && rightPointerContainer) {
      const targetX = startX + rightPointer * scaledSize + scaledSize / 2;
      rightPointerContainer.setVisible(true);
      
      scene.tweens.add({
        targets: rightPointerContainer,
        x: targetX,
        y: pointerY,
        duration: 200,
        ease: 'Power2'
      });
    } else if (rightPointerContainer) {
      rightPointerContainer.setVisible(false);
    }
  }, [leftPointer, rightPointer]);

  return (
    <div ref={containerRef} className="rounded-xl shadow-lg overflow-hidden" style={{ width, height }}>
      {isLoading && (
        <div className="w-full h-full bg-sky-200 flex items-center justify-center">
          <span className="text-sky-600">Loading...</span>
        </div>
      )}
    </div>
  );
};

export default PhaserWorld;
