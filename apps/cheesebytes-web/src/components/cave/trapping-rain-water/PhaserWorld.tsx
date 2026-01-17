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
  waterSprites: Map<string, any>; // key: "col-row"
  startX: number;
  groundY: number;
  scaledSize: number;
  numColumns: number;
  heights: number[];
}

export const PhaserWorld: React.FC<PhaserWorldProps> = ({
  heights,
  waterLevels,
  spriteSheet = DEFAULT_SPRITE_SHEET,
  scale = 0.375,
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
  
  // Store current values in refs so we can access them without triggering re-renders
  const heightsRef = useRef(heights);
  const waterLevelsRef = useRef(waterLevels);
  const leftPointerRef = useRef(leftPointer);
  const rightPointerRef = useRef(rightPointer);
  
  // Keep refs updated
  heightsRef.current = heights;
  waterLevelsRef.current = waterLevels;
  leftPointerRef.current = leftPointer;
  rightPointerRef.current = rightPointer;

  // Create Phaser game ONCE - use refs to access dynamic values
  useEffect(() => {
    if (!containerRef.current || gameRef.current) return;
    
    import('phaser').then((Phaser) => {
      const scaledSize = SPRITE_SIZE * scale;
      const currentHeights = heightsRef.current;

      class TrappingWaterScene extends Phaser.Scene {
        leftPointerContainer: any = null;
        rightPointerContainer: any = null;
        waterSprites: Map<string, any> = new Map(); // key: "col-row"

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
          const numColumns = currentHeights.length;
          const totalWidth = numColumns * scaledSize;
          const startX = (width - totalWidth) / 2;
          const groundY = height - scaledSize * 2;

          // Ground
          this.createGround(startX, groundY, numColumns);
          
          // Terrain (static - doesn't change)
          this.createTerrain(startX, groundY, currentHeights);
          
          // Water animation definition (Phaser handles sync automatically)
          if (!this.anims.exists('water-surface')) {
            this.anims.create({
              key: 'water-surface',
              frames: [
                { key: 'tiles', frame: WATER_SURFACE_FRAMES[0] },
                { key: 'tiles', frame: WATER_SURFACE_FRAMES[1] },
              ],
              frameRate: 2,
              repeat: -1,
            });
          }
          
          // Pre-create ALL possible water sprites (invisible) so animations stay synced
          const maxWaterHeight = 15; // Safe upper bound
          this.preCreateWaterSprites(startX, groundY, currentHeights, maxWaterHeight);
          
          // Set initial water visibility
          this.updateWater(waterLevelsRef.current);

          // Rain
          if (showRain) {
            this.createRain();
          }
          
          // Create pointer containers
          const pointerY = groundY + scaledSize + 25;
          this.leftPointerContainer = this.createPointerContainer(0, pointerY, 'L', 0x22C55E);
          this.rightPointerContainer = this.createPointerContainer(0, pointerY, 'R', 0xF59E0B);
          
          // Position pointers initially
          const lp = leftPointerRef.current;
          const rp = rightPointerRef.current;
          
          if (lp !== undefined) {
            const x = startX + lp * scaledSize + scaledSize / 2;
            this.leftPointerContainer.setPosition(x, pointerY);
            this.leftPointerContainer.setVisible(true);
          } else {
            this.leftPointerContainer.setVisible(false);
          }
          
          if (rp !== undefined) {
            const x = startX + rp * scaledSize + scaledSize / 2;
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
            numColumns,
            heights: currentHeights,
          };
          
          setIsLoading(false);
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

        createTerrain(startX: number, groundY: number, h: number[]) {
          const blockFrame = SPRITES.BLOCK_BROWN;
          
          for (let col = 0; col < h.length; col++) {
            const colHeight = h[col];
            const x = startX + col * scaledSize + scaledSize / 2;
            for (let row = 0; row < colHeight; row++) {
              const y = groundY - (row + 1) * scaledSize + scaledSize / 2;
              const sprite = this.add.sprite(x, y, 'tiles', blockFrame);
              sprite.setScale(scale);
            }
          }
        }

        preCreateWaterSprites(startX: number, groundY: number, h: number[], maxWaterHeight: number) {
          const waterFullFrame = SPRITES.WATER_FULL;
          
          for (let col = 0; col < h.length; col++) {
            const terrainHeight = h[col];
            const x = startX + col * scaledSize + scaledSize / 2;
            
            for (let row = 0; row < maxWaterHeight; row++) {
              const key = `${col}-${row}`;
              const y = groundY - (terrainHeight + row + 1) * scaledSize + scaledSize / 2;
              
              // Create sprite invisible with animation already playing
              const sprite = this.add.sprite(x, y, 'tiles', waterFullFrame);
              sprite.setScale(scale);
              sprite.setAlpha(0); // Start invisible
              sprite.play('water-surface'); // Start animation NOW - all sprites sync from this moment
              sprite.setData('row', row);
              
              this.waterSprites.set(key, sprite);
            }
          }
        }

        updateWater(wl: number[]) {
          const waterFullFrame = SPRITES.WATER_FULL;
          
          for (let col = 0; col < wl.length; col++) {
            const waterHeight = wl[col];
            
            // Update visibility and frame for each pre-created sprite
            for (let row = 0; row < 15; row++) {
              const key = `${col}-${row}`;
              const sprite = this.waterSprites.get(key);
              if (!sprite) continue;
              
              const shouldBeVisible = row < waterHeight;
              const isTop = row === waterHeight - 1;
              const targetAlpha = shouldBeVisible ? 0.85 : 0;
              const currentAlpha = sprite.alpha;
              
              // Only tween if alpha needs to change significantly
              if (Math.abs(currentAlpha - targetAlpha) > 0.01) {
                this.tweens.add({
                  targets: sprite,
                  alpha: targetAlpha,
                  duration: 150,
                  ease: 'Power1'
                });
              }
              
              // Update frame: surface tiles animate, full tiles are static
              if (shouldBeVisible) {
                if (isTop) {
                  // Surface: let animation play (it's already running)
                  if (!sprite.anims.isPlaying) {
                    sprite.play('water-surface');
                  }
                } else {
                  // Full water: stop animation, show static frame
                  sprite.stop();
                  sprite.setFrame(waterFullFrame);
                }
              }
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
        backgroundColor: 0x000000,
      });
    });

    return () => {
      gameRef.current?.destroy(true);
      gameRef.current = null;
      sceneDataRef.current = null;
    };
  }, [scale, showRain, spriteSheet, width, height]); // NO heights/waterLevels/pointers here!

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

  // Update water levels dynamically
  useEffect(() => {
    const data = sceneDataRef.current;
    if (!data || !data.scene) return;

    const { scene } = data;
    
    // Call updateWater on the scene (only needs waterLevels now)
    if (scene.updateWater) {
      scene.updateWater(waterLevels);
    }
  }, [waterLevels]);

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
