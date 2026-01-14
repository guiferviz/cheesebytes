import React, { useState, useCallback, useEffect, useRef } from 'react';
import type { PointerState, StepLog } from './types';
import { COLORS, DEFAULT_HEIGHTS } from './types';
import { Background, RainDrops } from './Background';
import { TerrainColumn } from './TerrainBlocks';
import { WaterColumn } from './WaterBlocks';
import { Pointer, MaxMarker } from './Pointers';

// CSS Animations
const ANIMATION_STYLES = `
  @keyframes blockGrow {
    0% { transform: scaleY(0); opacity: 0; }
    100% { transform: scaleY(1); opacity: 1; }
  }
  
  @keyframes waterFill {
    0% { transform: scaleY(0); opacity: 0; }
    60% { transform: scaleY(1.1); opacity: 0.9; }
    100% { transform: scaleY(1); opacity: 0.85; }
  }
  
  @keyframes rainFall {
    0% { transform: translateY(0); opacity: 0.6; }
    100% { transform: translateY(450px); opacity: 0; }
  }
  
  @keyframes highlight {
    0%, 100% { opacity: 0; }
    50% { opacity: 0.3; }
  }
  
  @keyframes counterPop {
    0% { transform: scale(1); }
    50% { transform: scale(1.2); }
    100% { transform: scale(1); }
  }
`;

interface TrappingWaterProps {
  heights?: number[];
  showAlgorithm?: boolean;
  showRain?: boolean;
  showWaterPreview?: boolean;
  showControls?: boolean;
  title?: string;
  autoPlay?: boolean;
  autoPlayDelay?: number;
  highlightColumn?: number;
  showMaxMarkers?: boolean;
  showFormula?: boolean;
}

// Calculate trapped water for preview
function calculateWater(heights: number[]): number[] {
  const n = heights.length;
  if (n === 0) return [];
  
  const water: number[] = new Array(n).fill(0);
  const leftMax: number[] = new Array(n).fill(0);
  const rightMax: number[] = new Array(n).fill(0);
  
  leftMax[0] = heights[0];
  for (let i = 1; i < n; i++) {
    leftMax[i] = Math.max(leftMax[i - 1], heights[i]);
  }
  
  rightMax[n - 1] = heights[n - 1];
  for (let i = n - 2; i >= 0; i--) {
    rightMax[i] = Math.max(rightMax[i + 1], heights[i]);
  }
  
  for (let i = 0; i < n; i++) {
    water[i] = Math.min(leftMax[i], rightMax[i]) - heights[i];
  }
  
  return water;
}

export const TrappingWater: React.FC<TrappingWaterProps> = ({
  heights = DEFAULT_HEIGHTS,
  showAlgorithm = false,
  showRain = false,
  showWaterPreview = false,
  showControls = true,
  title = 'Trapping Rain Water',
  autoPlay = false,
  autoPlayDelay = 800,
  highlightColumn,
  showMaxMarkers = false,
  showFormula = false,
}) => {
  // Layout constants
  const SVG_WIDTH = 900;
  const SVG_HEIGHT = 400;
  const BLOCK_WIDTH = 45;
  const BLOCK_HEIGHT = 28;
  const GAP = 8;
  const BASE_Y = 340;
  
  // Calculate starting X to center the terrain
  const totalWidth = heights.length * (BLOCK_WIDTH + GAP) - GAP;
  const START_X = (SVG_WIDTH - totalWidth) / 2;
  
  // State for algorithm animation
  const [pointerState, setPointerState] = useState<PointerState>({
    left: 0,
    right: heights.length - 1,
    leftMax: heights[0] || 0,
    rightMax: heights[heights.length - 1] || 0,
    waterTotal: 0,
    waterPerColumn: new Array(heights.length).fill(0),
    activeSide: null,
  });
  
  const [stepLogs, setStepLogs] = useState<StepLog[]>([]);
  const [currentStep, setCurrentStep] = useState(0);
  const [isComplete, setIsComplete] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showTerrainAnimation, setShowTerrainAnimation] = useState(true);
  
  const autoPlayTimerRef = useRef<NodeJS.Timeout | null>(null);
  
  // Preview water (for showWaterPreview mode)
  const previewWater = showWaterPreview ? calculateWater(heights) : [];
  
  // Get column X position
  const getColumnX = (index: number): number => START_X + index * (BLOCK_WIDTH + GAP);
  const getColumnCenterX = (index: number): number => getColumnX(index) + BLOCK_WIDTH / 2;
  
  // Execute one step of the two-pointer algorithm
  const executeStep = useCallback(() => {
    if (isComplete) return;
    
    setPointerState(prev => {
      const { left, right, leftMax, rightMax, waterPerColumn, waterTotal } = prev;
      
      if (left >= right) {
        setIsComplete(true);
        setStepLogs(logs => [...logs, {
          step: currentStep + 1,
          description: '✓ Done! Pointers met.',
        }]);
        return prev;
      }
      
      const newState = { ...prev, waterPerColumn: [...waterPerColumn] };
      
      if (leftMax <= rightMax) {
        // Process left side
        newState.activeSide = 'L';
        newState.left = left + 1;
        
        const newHeight = heights[newState.left];
        if (newHeight >= leftMax) {
          newState.leftMax = newHeight;
          setStepLogs(logs => [...logs, {
            step: currentStep + 1,
            description: `L→${newState.left}: New leftMax = ${newHeight}`,
          }]);
        } else {
          const water = leftMax - newHeight;
          newState.waterPerColumn[newState.left] = water;
          newState.waterTotal = waterTotal + water;
          setStepLogs(logs => [...logs, {
            step: currentStep + 1,
            description: `L→${newState.left}: Water = ${leftMax} - ${newHeight} = ${water}`,
            waterAdded: water,
          }]);
        }
      } else {
        // Process right side
        newState.activeSide = 'R';
        newState.right = right - 1;
        
        const newHeight = heights[newState.right];
        if (newHeight >= rightMax) {
          newState.rightMax = newHeight;
          setStepLogs(logs => [...logs, {
            step: currentStep + 1,
            description: `R→${newState.right}: New rightMax = ${newHeight}`,
          }]);
        } else {
          const water = rightMax - newHeight;
          newState.waterPerColumn[newState.right] = water;
          newState.waterTotal = waterTotal + water;
          setStepLogs(logs => [...logs, {
            step: currentStep + 1,
            description: `R→${newState.right}: Water = ${rightMax} - ${newHeight} = ${water}`,
            waterAdded: water,
          }]);
        }
      }
      
      return newState;
    });
    
    setCurrentStep(s => s + 1);
  }, [heights, currentStep, isComplete]);
  
  // Reset
  const reset = useCallback(() => {
    setPointerState({
      left: 0,
      right: heights.length - 1,
      leftMax: heights[0] || 0,
      rightMax: heights[heights.length - 1] || 0,
      waterTotal: 0,
      waterPerColumn: new Array(heights.length).fill(0),
      activeSide: null,
    });
    setStepLogs([]);
    setCurrentStep(0);
    setIsComplete(false);
    setIsPlaying(false);
    if (autoPlayTimerRef.current) {
      clearTimeout(autoPlayTimerRef.current);
    }
  }, [heights]);
  
  // Auto-play effect
  useEffect(() => {
    if ((isPlaying || autoPlay) && !isComplete && showAlgorithm) {
      autoPlayTimerRef.current = setTimeout(() => {
        executeStep();
      }, autoPlayDelay);
      
      return () => {
        if (autoPlayTimerRef.current) {
          clearTimeout(autoPlayTimerRef.current);
        }
      };
    }
  }, [isPlaying, autoPlay, isComplete, showAlgorithm, executeStep, autoPlayDelay]);
  
  // Disable terrain animation after initial render
  useEffect(() => {
    const timer = setTimeout(() => setShowTerrainAnimation(false), 1500);
    return () => clearTimeout(timer);
  }, []);
  
  const maxHeight = Math.max(...heights, 1);
  
  return (
    <>
      <style>{ANIMATION_STYLES}</style>
      
      <div className="trapping-water-container flex flex-col items-center gap-4 p-4 select-none">
        {/* Title */}
        <div className="bg-blue-100 dark:bg-blue-900/50 px-6 py-2 rounded-full shadow-md">
          <h2 className="text-lg font-bold text-blue-800 dark:text-blue-200">
            {title}
          </h2>
        </div>
        
        <div className="flex gap-6 items-start">
          {/* Main SVG visualization */}
          <div className="relative">
            <svg 
              width={SVG_WIDTH} 
              height={SVG_HEIGHT} 
              viewBox={`0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`}
              className="rounded-xl shadow-lg overflow-visible"
            >
              {/* Background */}
              <Background 
                width={SVG_WIDTH} 
                height={SVG_HEIGHT}
                showMountains={true}
              />
              
              {/* Rain effect */}
              <RainDrops
                width={SVG_WIDTH}
                height={SVG_HEIGHT}
                isAnimating={showRain}
              />
              
              {/* Terrain columns */}
              {heights.map((h, i) => (
                <TerrainColumn
                  key={`terrain-${i}`}
                  x={getColumnX(i)}
                  baseY={BASE_Y}
                  blockWidth={BLOCK_WIDTH}
                  blockHeight={BLOCK_HEIGHT}
                  stackHeight={h}
                  isAnimating={showTerrainAnimation}
                  delay={i * 60}
                />
              ))}
              
              {/* Water columns (preview or algorithm) */}
              {(showWaterPreview ? previewWater : pointerState.waterPerColumn).map((w, i) => (
                <WaterColumn
                  key={`water-${i}`}
                  x={getColumnX(i)}
                  baseY={BASE_Y}
                  blockWidth={BLOCK_WIDTH}
                  blockHeight={BLOCK_HEIGHT}
                  waterUnits={w}
                  terrainHeight={heights[i]}
                  isAnimating={!showWaterPreview}
                  delay={showWaterPreview ? i * 50 : 0}
                />
              ))}
              
              {/* Highlight column */}
              {highlightColumn !== undefined && (
                <rect
                  x={getColumnX(highlightColumn) - 4}
                  y={BASE_Y - maxHeight * BLOCK_HEIGHT - 40}
                  width={BLOCK_WIDTH + 8}
                  height={maxHeight * BLOCK_HEIGHT + 50}
                  fill="#fbbf24"
                  opacity={0.2}
                  rx={4}
                  style={{ animation: 'highlight 1s ease-in-out infinite' }}
                />
              )}
              
              {/* Algorithm pointers */}
              {showAlgorithm && (
                <>
                  <Pointer
                    x={getColumnCenterX(pointerState.left)}
                    y={BASE_Y - heights[pointerState.left] * BLOCK_HEIGHT - 30}
                    side="L"
                    isActive={pointerState.activeSide === 'L'}
                  />
                  <Pointer
                    x={getColumnCenterX(pointerState.right)}
                    y={BASE_Y - heights[pointerState.right] * BLOCK_HEIGHT - 30}
                    side="R"
                    isActive={pointerState.activeSide === 'R'}
                  />
                </>
              )}
              
              {/* Max markers */}
              {showMaxMarkers && showAlgorithm && (
                <>
                  <MaxMarker
                    x={getColumnCenterX(pointerState.left)}
                    baseY={BASE_Y}
                    blockHeight={BLOCK_HEIGHT}
                    maxValue={pointerState.leftMax}
                    side="L"
                    isActive={pointerState.activeSide === 'L'}
                    columnWidth={BLOCK_WIDTH}
                  />
                  <MaxMarker
                    x={getColumnCenterX(pointerState.right)}
                    baseY={BASE_Y}
                    blockHeight={BLOCK_HEIGHT}
                    maxValue={pointerState.rightMax}
                    side="R"
                    isActive={pointerState.activeSide === 'R'}
                    columnWidth={BLOCK_WIDTH}
                  />
                </>
              )}
              
              {/* Column indices */}
              {heights.map((_, i) => (
                <text
                  key={`idx-${i}`}
                  x={getColumnCenterX(i)}
                  y={BASE_Y + 20}
                  textAnchor="middle"
                  fontSize={11}
                  fontFamily="monospace"
                  fill="#78716c"
                >
                  {i}
                </text>
              ))}
              
              {/* Formula overlay */}
              {showFormula && highlightColumn !== undefined && (
                <g transform={`translate(${SVG_WIDTH / 2}, 40)`}>
                  <rect
                    x={-200}
                    y={-20}
                    width={400}
                    height={45}
                    rx={8}
                    fill="white"
                    opacity={0.95}
                    stroke="#e5e7eb"
                    strokeWidth={1}
                  />
                  <text
                    x={0}
                    y={8}
                    textAnchor="middle"
                    fontSize={16}
                    fontFamily="monospace"
                    fill="#374151"
                  >
                    water = min(leftMax, rightMax) - height
                  </text>
                </g>
              )}
            </svg>
            
            {/* Water total overlay */}
            {showAlgorithm && (
              <div 
                className="absolute top-4 right-4 bg-blue-500 text-white px-4 py-2 rounded-lg shadow-lg"
                style={{
                  animation: pointerState.waterTotal > 0 ? 'counterPop 0.3s ease-out' : undefined,
                }}
              >
                <div className="text-xs opacity-80">Total Water</div>
                <div className="text-2xl font-bold tabular-nums">
                  {pointerState.waterTotal}
                </div>
              </div>
            )}
            
            {/* Preview total */}
            {showWaterPreview && (
              <div className="absolute top-4 right-4 bg-blue-500 text-white px-4 py-2 rounded-lg shadow-lg">
                <div className="text-xs opacity-80">Total Water</div>
                <div className="text-2xl font-bold tabular-nums">
                  {previewWater.reduce((a, b) => a + b, 0)}
                </div>
              </div>
            )}
          </div>
          
          {/* Side panel for algorithm */}
          {showAlgorithm && (
            <div className="bg-white/90 dark:bg-gray-800/90 rounded-lg p-4 shadow-lg backdrop-blur-sm min-w-[200px] max-h-[380px] overflow-y-auto">
              <h3 className="text-sm font-bold text-gray-600 dark:text-gray-300 mb-3 uppercase tracking-wide">
                Algorithm State
              </h3>
              
              {/* Pointers */}
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className={`p-2 rounded ${pointerState.activeSide === 'L' ? 'bg-green-100 dark:bg-green-900/30' : ''}`}>
                  <div className="text-xs text-gray-500">L</div>
                  <div className="text-xl font-bold text-green-600">{pointerState.left}</div>
                </div>
                <div className={`p-2 rounded ${pointerState.activeSide === 'R' ? 'bg-amber-100 dark:bg-amber-900/30' : ''}`}>
                  <div className="text-xs text-gray-500">R</div>
                  <div className="text-xl font-bold text-amber-600">{pointerState.right}</div>
                </div>
              </div>
              
              {/* Max values */}
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className={`p-2 rounded border-l-4 ${pointerState.activeSide === 'L' ? 'border-green-500' : 'border-gray-300'}`}>
                  <div className="text-xs text-gray-500">leftMax</div>
                  <div className="text-lg font-bold">{pointerState.leftMax}</div>
                </div>
                <div className={`p-2 rounded border-l-4 ${pointerState.activeSide === 'R' ? 'border-amber-500' : 'border-gray-300'}`}>
                  <div className="text-xs text-gray-500">rightMax</div>
                  <div className="text-lg font-bold">{pointerState.rightMax}</div>
                </div>
              </div>
              
              {/* Step log */}
              <div className="border-t pt-3">
                <div className="text-xs text-gray-500 mb-2">
                  Step {currentStep} {isComplete && '(Done!)'}
                </div>
                <div className="space-y-1 text-xs max-h-[150px] overflow-y-auto">
                  {stepLogs.slice(-5).map((log, i) => (
                    <div 
                      key={i} 
                      className={`p-1 rounded ${log.waterAdded ? 'bg-blue-50 dark:bg-blue-900/20' : ''}`}
                    >
                      {log.description}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
        
        {/* Controls */}
        {showControls && showAlgorithm && (
          <div className="flex gap-3 mt-2">
            <button
              onClick={reset}
              className="px-4 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 rounded-lg font-medium transition-colors"
            >
              ↺ Reset
            </button>
            <button
              onClick={executeStep}
              disabled={isComplete || isPlaying}
              className={`
                px-6 py-2 rounded-lg font-bold transition-all
                ${isComplete || isPlaying
                  ? 'bg-gray-300 dark:bg-gray-600 text-gray-500 cursor-not-allowed'
                  : 'bg-blue-500 hover:bg-blue-600 text-white shadow-md hover:shadow-lg'
                }
              `}
            >
              {isComplete ? 'Done!' : 'Step →'}
            </button>
            <button
              onClick={() => setIsPlaying(p => !p)}
              disabled={isComplete}
              className={`
                px-4 py-2 rounded-lg font-medium transition-all
                ${isComplete
                  ? 'bg-gray-300 dark:bg-gray-600 text-gray-500 cursor-not-allowed'
                  : isPlaying
                  ? 'bg-red-500 hover:bg-red-600 text-white'
                  : 'bg-green-500 hover:bg-green-600 text-white'
                }
              `}
            >
              {isPlaying ? '⏸ Pause' : '▶ Play'}
            </button>
          </div>
        )}
      </div>
    </>
  );
};

export default TrappingWater;
