# Trapping Rain Water - Sprite System

## 🎮 Overview

This visualization uses a sprite-based rendering system to create a
platformer-style world for the Trapping Rain Water algorithm.

## 📁 Files

- `SpriteWorld.tsx` - Canvas-based sprite renderer
- `TrappingWaterSprite.tsx` - Main component with algorithm logic
- `sprites.ts` - Sprite sheet configuration

## 🖼️ Sprite Sheet Requirements

The system expects a sprite sheet image with **32x32 pixel sprites** arranged in
a grid:

### Layout (5 columns × 5 rows)

```
Row 0 - Terrain:
[0,0] Dirt block (interior)
[1,0] Dirt block with grass top ← main terrain block
[2,0] Dirt left edge
[3,0] Dirt right edge
[4,0] Dirt top (no grass)

Row 1 - Water:
[0,1] Water full block
[1,1] Water surface (waves/foam) ← top water block
[2,1] Water left edge
[3,1] Water right edge

Row 2 - Background:
[0,2] Sky/empty
[1,2] Cloud left
[2,2] Cloud middle
[3,2] Cloud right
[4,2] Mountain/hill

Row 3 - Ground Platform:
[0,3] Ground top with grass
[1,3] Ground interior
[2,3] Ground left edge
[3,3] Ground right edge

Row 4 - Effects:
[0,4] Rain drop
[1,4] Splash effect
[2,4] Pointer arrow (green/left)
[3,4] Pointer arrow (amber/right)
```

### Minimum Required Sprites

For the system to work with just the essentials:

| Sprite            | Position | Description                   |
| ----------------- | -------- | ----------------------------- |
| `DIRT_GRASS_TOP`  | [1,0]    | Main terrain block with grass |
| `DIRT`            | [0,0]    | Interior terrain block        |
| `WATER_SURFACE`   | [1,1]    | Top water block with waves    |
| `WATER_FULL`      | [0,1]    | Interior water block          |
| `GROUND_TOP`      | [0,3]    | Ground platform with grass    |
| `GROUND_INTERIOR` | [1,3]    | Ground interior               |

### Image Size

For a 5×5 grid of 32×32 sprites:

- **Width:** 160px
- **Height:** 160px

## 🎨 Sprite Style Tips

Based on your attached image:

1. **Color Palette:**
   - Dirt: Brown tones (#8B4513, #A0522D)
   - Grass: Greens (#228B22, #32CD32)
   - Water: Blues (#4A90D9, #87CEEB)
   - Ground: Dark earth (#2D5016)

2. **Style:**
   - Pixel art with clear block edges
   - Subtle shading (lighter top-left, darker bottom-right)
   - Water should have foam/wave detail on surface blocks

3. **Transparency:**
   - Water blocks can have alpha for see-through effect
   - Sky blocks should be transparent (for background gradient)

## 📍 Installation

1. Create your sprite sheet image
2. Save it to: `public/sprites/trapping-water-sprites.png`
3. Use the component:

```tsx
<TrappingWaterSprite
  heights={[0, 1, 0, 2, 1, 0, 1, 3, 2, 1, 2, 1]}
  showAlgorithm={true}
  showControls={true}
  spriteSheet="/sprites/trapping-water-sprites.png"
  scale={1.5}
/>
```

## 🔄 Fallback Mode

If no sprite sheet is provided or it fails to load, the system uses **colored
rectangles** as a fallback - so it works even without sprites!

## 🎯 Customization

### Scale

```tsx
scale={2}  // Double size (64x64 rendered sprites)
```

### Custom sprite sheet

```tsx
spriteSheet = "/my-custom-sprites.png";
```

### Different terrain

```tsx
heights={[3, 0, 2, 0, 4, 0, 1, 0, 3]}
```

## 🛠️ Creating Sprites

Recommended tools:

- **Aseprite** - Professional pixel art editor
- **Piskel** - Free online pixel art tool
- **Pixilart** - Browser-based editor

Export as PNG with transparency for best results.
