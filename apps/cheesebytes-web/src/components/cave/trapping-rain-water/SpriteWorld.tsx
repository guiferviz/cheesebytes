import React, { useRef, useEffect, useState } from 'react';
import { 
  SPRITES, 
  SPRITE_SIZE, 
  DEFAULT_SPRITE_SHEET,
  type SpriteKey,
} from './sprites';

// ===========================================
// TYPES
// ===========================================

interface SpriteWorldProps {
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

// ===========================================
// FALLBACK COLORS (platformer style)
// ===========================================

const COLORS = {
  dirt: '#8B5A2B',
  dirtDark: '#6B4423',
  grass: '#4A9628',
  grassDark: '#3D7A1E',
  water: '#4A90D9',
  waterSurface: '#7BC8F6',
  ground: '#5D4037',
  groundGrass: '#2E7D32',
  sky: '#87CEEB',
  skyBottom: '#B8E0B8',
  mountain1: '#6B8E6B',
  mountain2: '#7BA17B',
  pointerLeft: '#22C55E',
  pointerRight: '#F59E0B',
};

// ===========================================
// MAIN COMPONENT
// ===========================================

export const SpriteWorld: React.FC<SpriteWorldProps> = ({
  heights,
  waterLevels,
  spriteSheet = DEFAULT_SPRITE_SHEET,
  scale = 1.5,
  showRain = false,
  highlightedColumn,
  leftPointer,
  rightPointer,
  width = 900,
  height = 450,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const spriteImgRef = useRef<HTMLImageElement | null>(null);
  const [spriteLoaded, setSpriteLoaded] = useState(false);
  const frameRef = useRef<number>(0);
  const rainRef = useRef<Array<{x: number; y: number; speed: number}>>([]);
  const animFrameRef = useRef<number | null>(null);

  // Scaled sprite size
  const scaledSize = SPRITE_SIZE * scale;

  // Calculate layout
  const maxHeight = Math.max(...heights, 1);
  const numColumns = heights.length;
  const columnWidth = scaledSize;
  const totalWidth = numColumns * columnWidth;
  const startX = (width - totalWidth) / 2;
  const groundY = height - scaledSize * 2;

  // Load sprite sheet
  useEffect(() => {
    const img = new Image();
    img.onload = () => {
      spriteImgRef.current = img;
      setSpriteLoaded(true);
    };
    img.onerror = () => {
      setSpriteLoaded(false);
    };
    img.src = spriteSheet;

    return () => {
      img.onload = null;
      img.onerror = null;
    };
  }, [spriteSheet]);

  // Initialize rain
  useEffect(() => {
    if (showRain) {
      rainRef.current = Array.from({ length: 40 }, () => ({
        x: Math.random() * width,
        y: Math.random() * height,
        speed: 3 + Math.random() * 4,
      }));
    }
  }, [showRain, width, height]);

  // Main render effect
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.imageSmoothingEnabled = false;

    const drawFrame = () => {
      // Clear
      ctx.clearRect(0, 0, width, height);

      // Sky gradient
      const skyGradient = ctx.createLinearGradient(0, 0, 0, height);
      skyGradient.addColorStop(0, COLORS.sky);
      skyGradient.addColorStop(0.7, '#B4E1D0');
      skyGradient.addColorStop(1, COLORS.skyBottom);
      ctx.fillStyle = skyGradient;
      ctx.fillRect(0, 0, width, height);

      // Background mountains
      ctx.fillStyle = COLORS.mountain1;
      ctx.beginPath();
      ctx.moveTo(0, groundY);
      ctx.lineTo(0, groundY - 100);
      ctx.lineTo(width * 0.2, groundY - 150);
      ctx.lineTo(width * 0.4, groundY - 80);
      ctx.lineTo(width * 0.6, groundY - 180);
      ctx.lineTo(width * 0.8, groundY - 100);
      ctx.lineTo(width, groundY - 130);
      ctx.lineTo(width, groundY);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = COLORS.mountain2;
      ctx.beginPath();
      ctx.moveTo(0, groundY);
      ctx.lineTo(0, groundY - 50);
      ctx.lineTo(width * 0.25, groundY - 90);
      ctx.lineTo(width * 0.5, groundY - 60);
      ctx.lineTo(width * 0.75, groundY - 100);
      ctx.lineTo(width, groundY - 70);
      ctx.lineTo(width, groundY);
      ctx.closePath();
      ctx.fill();

      // Ground platform
      const platformPadding = scaledSize;
      const platformX = startX - platformPadding;
      const platformWidth = totalWidth + platformPadding * 2;

      // Ground body
      ctx.fillStyle = COLORS.ground;
      ctx.fillRect(platformX, groundY, platformWidth, scaledSize * 2);

      // Grass top
      ctx.fillStyle = COLORS.groundGrass;
      ctx.fillRect(platformX, groundY, platformWidth, 10);

      // Grass tufts (static pattern based on position)
      ctx.fillStyle = '#4CAF50';
      for (let i = 0; i < platformWidth; i += 8) {
        const tuftHeight = 4 + ((i * 7) % 6);
        ctx.fillRect(platformX + i, groundY - tuftHeight, 3, tuftHeight + 2);
      }

      // Terrain columns
      for (let col = 0; col < numColumns; col++) {
        const h = heights[col];
        const x = startX + col * columnWidth;

        for (let row = 0; row < h; row++) {
          const y = groundY - (row + 1) * scaledSize;
          const isTop = row === h - 1;

          if (spriteLoaded && spriteImgRef.current) {
            // Use sprite
            const spriteKey: SpriteKey = isTop ? 'DIRT_GRASS_TOP' : 'DIRT';
            const [sx, sy] = SPRITES[spriteKey];
            ctx.drawImage(
              spriteImgRef.current,
              sx * SPRITE_SIZE, sy * SPRITE_SIZE, SPRITE_SIZE, SPRITE_SIZE,
              x, y, scaledSize, scaledSize
            );
          } else {
            // Fallback: draw pixelated block
            drawPixelBlock(ctx, x, y, scaledSize, isTop, col, row);
          }
        }
      }

      // Water
      for (let col = 0; col < numColumns; col++) {
        const waterHeight = waterLevels[col];
        if (waterHeight <= 0) continue;

        const terrainHeight = heights[col];
        const x = startX + col * columnWidth;

        for (let row = 0; row < waterHeight; row++) {
          const y = groundY - (terrainHeight + row + 1) * scaledSize;
          const isTop = row === waterHeight - 1;

          if (spriteLoaded && spriteImgRef.current) {
            const spriteKey: SpriteKey = isTop ? 'WATER_SURFACE' : 'WATER_FULL';
            const [sx, sy] = SPRITES[spriteKey];
            ctx.globalAlpha = 0.8;
            ctx.drawImage(
              spriteImgRef.current,
              sx * SPRITE_SIZE, sy * SPRITE_SIZE, SPRITE_SIZE, SPRITE_SIZE,
              x, y, scaledSize, scaledSize
            );
            ctx.globalAlpha = 1;
          } else {
            // Fallback water
            drawWaterBlock(ctx, x, y, scaledSize, isTop, frameRef.current, col, row);
          }
        }
      }

      // Rain
      if (showRain) {
        ctx.strokeStyle = 'rgba(173, 216, 230, 0.5)';
        ctx.lineWidth = 2;
        rainRef.current.forEach(drop => {
          ctx.beginPath();
          ctx.moveTo(drop.x, drop.y);
          ctx.lineTo(drop.x - 3, drop.y + 12);
          ctx.stroke();
          
          // Update position
          drop.y += drop.speed;
          drop.x -= 0.5;
          if (drop.y > height) {
            drop.y = -10;
            drop.x = Math.random() * width;
          }
        });
      }

      // Highlight column
      if (highlightedColumn !== undefined) {
        const x = startX + highlightedColumn * columnWidth;
        ctx.fillStyle = 'rgba(255, 215, 0, 0.25)';
        ctx.fillRect(x, 0, columnWidth, groundY);
      }

      // Pointers
      if (leftPointer !== undefined) {
        drawPointer(ctx, startX + leftPointer * columnWidth + columnWidth / 2, groundY + scaledSize * 2 + 15, 'L', COLORS.pointerLeft);
      }
      if (rightPointer !== undefined) {
        drawPointer(ctx, startX + rightPointer * columnWidth + columnWidth / 2, groundY + scaledSize * 2 + 15, 'R', COLORS.pointerRight);
      }

      frameRef.current++;

      if (showRain) {
        animFrameRef.current = requestAnimationFrame(drawFrame);
      }
    };

    drawFrame();

    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [heights, waterLevels, spriteLoaded, highlightedColumn, leftPointer, rightPointer, showRain, width, height, scaledSize, startX, groundY, totalWidth, numColumns]);

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      className="rounded-xl shadow-lg"
      style={{ imageRendering: 'pixelated' }}
    />
  );
};

// ===========================================
// DRAWING HELPERS
// ===========================================

function drawPixelBlock(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, isTop: boolean, col: number, row: number) {
  const pixelSize = size / 8; // 8x8 pixel grid per block

  // Main dirt color
  ctx.fillStyle = '#8B5A2B';
  ctx.fillRect(x, y, size, size);

  // Darker dirt patches (deterministic pattern based on position)
  ctx.fillStyle = '#6B4423';
  for (let px = 0; px < 8; px++) {
    for (let py = 0; py < 8; py++) {
      if ((px + py + col + row) % 3 === 0) {
        ctx.fillRect(x + px * pixelSize, y + py * pixelSize, pixelSize, pixelSize);
      }
    }
  }

  // Lighter highlights
  ctx.fillStyle = '#A67B4B';
  for (let px = 0; px < 8; px++) {
    for (let py = 0; py < 8; py++) {
      if ((px * py + col) % 7 === 1) {
        ctx.fillRect(x + px * pixelSize, y + py * pixelSize, pixelSize, pixelSize);
      }
    }
  }

  // Grass top
  if (isTop) {
    ctx.fillStyle = '#4A9628';
    ctx.fillRect(x, y, size, pixelSize * 2);

    // Grass detail
    ctx.fillStyle = '#5CB832';
    for (let px = 0; px < 8; px++) {
      if ((px + col) % 2 === 0) {
        ctx.fillRect(x + px * pixelSize, y - pixelSize, pixelSize, pixelSize * 2);
      }
    }

    // Darker grass edge
    ctx.fillStyle = '#3D7A1E';
    ctx.fillRect(x, y + pixelSize * 2, size, pixelSize);
  }

  // Block outline
  ctx.strokeStyle = '#5D3A1A';
  ctx.lineWidth = 1;
  ctx.strokeRect(x + 0.5, y + 0.5, size - 1, size - 1);
}

function drawWaterBlock(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, isTop: boolean, frame: number, col: number, row: number) {
  const pixelSize = size / 8;

  ctx.globalAlpha = 0.75;

  // Base water
  ctx.fillStyle = '#4A90D9';
  ctx.fillRect(x, y, size, size);

  // Lighter streaks (animated)
  ctx.fillStyle = '#6BA8E8';
  for (let px = 0; px < 8; px++) {
    for (let py = 0; py < 8; py++) {
      if ((px + py + Math.floor(frame / 10) + col) % 4 === 0) {
        ctx.fillRect(x + px * pixelSize, y + py * pixelSize, pixelSize, pixelSize);
      }
    }
  }

  // Surface with foam
  if (isTop) {
    ctx.fillStyle = '#7BC8F6';
    ctx.fillRect(x, y, size, pixelSize * 2);

    // Foam bubbles (animated)
    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
    for (let px = 0; px < 8; px++) {
      if ((px + Math.floor(frame / 20) + col) % 3 === 0) {
        const waveY = Math.sin((frame + col * 10) / 15) > 0 ? 0 : 1;
        ctx.fillRect(x + px * pixelSize, y + pixelSize * waveY, pixelSize, pixelSize);
      }
    }
  }

  ctx.globalAlpha = 1;
}

function drawPointer(ctx: CanvasRenderingContext2D, x: number, y: number, label: string, color: string) {
  // Arrow pointing up
  ctx.fillStyle = color;
  ctx.strokeStyle = '#333';
  ctx.lineWidth = 2;

  ctx.beginPath();
  ctx.moveTo(x, y - 25);      // Top point
  ctx.lineTo(x - 12, y - 8);  // Left
  ctx.lineTo(x - 5, y - 8);   // Inner left
  ctx.lineTo(x - 5, y + 8);   // Bottom left
  ctx.lineTo(x + 5, y + 8);   // Bottom right
  ctx.lineTo(x + 5, y - 8);   // Inner right
  ctx.lineTo(x + 12, y - 8);  // Right
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Label
  ctx.fillStyle = '#FFF';
  ctx.font = 'bold 12px monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, x, y);
}

export default SpriteWorld;
