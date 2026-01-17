import React, { useState, useCallback, useEffect, useRef, lazy, Suspense } from 'react';
import type { PointerState, StepLog } from './types';
import { DEFAULT_HEIGHTS } from './types';
import { 
  CheeseSlideContainer, 
  CheeseControlBar, 
  CheeseTitleBadge,
  CheeseCard,
  CheeseStat,
  CheeseStepLog,
  CheeseCompletionBadge,
} from '../shared';

// Lazy load PhaserWorld to avoid SSR issues
const PhaserWorld = lazy(() => import('./PhaserWorld'));

// ===========================================
// TYPES
// ===========================================

interface TrappingWaterSpriteProps {
  heights?: number[];
  showAlgorithm?: boolean;
  showRain?: boolean;
  showWaterPreview?: boolean;
  showControls?: boolean;
  title?: string;
  autoPlay?: boolean;
  autoPlayDelay?: number;
  highlightColumn?: number;
  spriteSheet?: string;
  scale?: number;
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

// ===========================================
// MAIN COMPONENT
// ===========================================

export const TrappingWaterSprite: React.FC<TrappingWaterSpriteProps> = ({
  heights = DEFAULT_HEIGHTS,
  showAlgorithm = false,
  showRain = false,
  showWaterPreview = false,
  showControls = true,
  title = null,
  autoPlay = false,
  autoPlayDelay = 800,
  highlightColumn,
  spriteSheet,
  scale = 0.375,
}) => {
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
  
  const autoPlayTimerRef = useRef<NodeJS.Timeout | null>(null);
  
  // Preview water (for showWaterPreview mode)
  const previewWater = showWaterPreview ? calculateWater(heights) : [];
  
  // Get current water levels to display
  const displayWater = showWaterPreview 
    ? previewWater 
    : showAlgorithm 
      ? pointerState.waterPerColumn 
      : new Array(heights.length).fill(0);

  // Execute one step of the two-pointer algorithm
  const executeStep = useCallback(() => {
    setPointerState(prev => {
      if (prev.left >= prev.right) {
        // Already complete - schedule completion side effects
        setTimeout(() => {
          setIsComplete(true);
          setStepLogs(logs => [...logs, {
            step: currentStep + 1,
            description: '✓ Done! Pointers met.',
          }]);
        }, 0);
        return prev;
      }
      
      const { left, right, leftMax, rightMax, waterPerColumn, waterTotal } = prev;
      const newState = { ...prev, waterPerColumn: [...waterPerColumn] };
      
      if (leftMax <= rightMax) {
        // Process left side
        newState.activeSide = 'L';
        newState.left = left + 1;
        
        const newHeight = heights[newState.left];
        if (newHeight >= leftMax) {
          newState.leftMax = newHeight;
          setTimeout(() => {
            setStepLogs(logs => [...logs, {
              step: currentStep + 1,
              description: `L→${newState.left}: New leftMax = ${newHeight}`,
            }]);
          }, 0);
        } else {
          const water = leftMax - newHeight;
          newState.waterPerColumn[newState.left] = water;
          newState.waterTotal = waterTotal + water;
          setTimeout(() => {
            setStepLogs(logs => [...logs, {
              step: currentStep + 1,
              description: `L→${newState.left}: +${water} water`,
              waterAdded: water,
            }]);
          }, 0);
        }
      } else {
        // Process right side
        newState.activeSide = 'R';
        newState.right = right - 1;
        
        const newHeight = heights[newState.right];
        if (newHeight >= rightMax) {
          newState.rightMax = newHeight;
          setTimeout(() => {
            setStepLogs(logs => [...logs, {
              step: currentStep + 1,
              description: `R→${newState.right}: New rightMax = ${newHeight}`,
            }]);
          }, 0);
        } else {
          const water = rightMax - newHeight;
          newState.waterPerColumn[newState.right] = water;
          newState.waterTotal = waterTotal + water;
          setTimeout(() => {
            setStepLogs(logs => [...logs, {
              step: currentStep + 1,
              description: `R→${newState.right}: +${water} water`,
              waterAdded: water,
            }]);
          }, 0);
        }
      }
      
      // Check if this step completes the algorithm
      if (newState.left >= newState.right) {
        setTimeout(() => {
          setIsComplete(true);
          setStepLogs(logs => [...logs, {
            step: currentStep + 2,
            description: '✓ Complete! Pointers met.',
          }]);
        }, 0);
      }
      
      setTimeout(() => {
        setCurrentStep(s => s + 1);
      }, 0);
      
      return newState;
    });
  }, [heights, currentStep]);

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
  }, [isPlaying, autoPlay, isComplete, showAlgorithm, executeStep, autoPlayDelay, currentStep]);

  const totalWater = showWaterPreview 
    ? previewWater.reduce((a, b) => a + b, 0)
    : pointerState.waterTotal;

  // Render the world using Phaser
  const renderWorld = () => {
    const worldProps = {
      heights,
      waterLevels: displayWater,
      spriteSheet,
      scale,
      showRain,
      highlightedColumn: highlightColumn,
      leftPointer: showAlgorithm ? pointerState.left : undefined,
      rightPointer: showAlgorithm ? pointerState.right : undefined,
      width: 800,
      height: 400,
    };

    return (
      <Suspense fallback={
        <div className="w-[800px] h-[400px] bg-sky-200 rounded-xl flex items-center justify-center">
          <div className="text-sky-600">Loading Phaser...</div>
        </div>
      }>
        <PhaserWorld {...worldProps} />
      </Suspense>
    );
  };

  return (
    <CheeseSlideContainer>
      {/* Title - using compact mode for Reveal slides */}
      {title && (
        <CheeseTitleBadge compact>{title}</CheeseTitleBadge>
      )}
      
      <div className="flex gap-4 items-start justify-center">
        {/* Main sprite world visualization */}
        <div className="relative flex-shrink-0">
          {renderWorld()}
          
          {/* Water total overlay */}
          {(showAlgorithm || showWaterPreview) && totalWater > 0 && (
            <div className="absolute top-3 right-3 bg-blue-500/90 text-white px-3 py-1.5 rounded-lg shadow-lg backdrop-blur-sm">
              <div className="text-xs opacity-80">💧 Total Water</div>
              <div className="text-xl font-bold tabular-nums">{totalWater}</div>
            </div>
          )}
          
          {/* Completion badge */}
          {isComplete && (
            <div className="absolute bottom-16 left-1/2 -translate-x-1/2">
              <CheeseCompletionBadge message="Level Complete! 🏆" />
            </div>
          )}
        </div>
        
        {/* Side panel for algorithm state */}
        {showAlgorithm && (
          <CheeseCard className="min-w-[180px] max-h-[380px] overflow-y-auto flex-shrink-0">
            <h3 className="text-xs font-bold text-amber-700 mb-2 uppercase tracking-wide flex items-center gap-1 !m-0">
              <span>🎮</span> Game State
            </h3>
            
            {/* Pointers */}
            <div className="grid grid-cols-2 gap-2 mb-3">
              <CheeseStat 
                label="L" 
                value={pointerState.left}
                highlight={pointerState.activeSide === 'L'}
                color="green"
              />
              <CheeseStat 
                label="R" 
                value={pointerState.right}
                highlight={pointerState.activeSide === 'R'}
                color="amber"
              />
            </div>
            
            {/* Max values */}
            <div className="grid grid-cols-2 gap-2 mb-3">
              <CheeseStat 
                label="leftMax" 
                value={pointerState.leftMax}
                highlight={pointerState.activeSide === 'L'}
                color="green"
              />
              <CheeseStat 
                label="rightMax" 
                value={pointerState.rightMax}
                highlight={pointerState.activeSide === 'R'}
                color="amber"
              />
            </div>
            
            {/* Step log */}
            <CheeseStepLog
              currentStep={currentStep}
              isComplete={isComplete}
              logs={stepLogs.slice(-4).map((log, i) => ({
                key: i,
                text: log.description,
                highlight: !!log.waterAdded
              }))}
            />
          </CheeseCard>
        )}
      </div>
      
      {/* Controls */}
      {showControls && showAlgorithm && (
        <CheeseControlBar
          onReset={reset}
          onStep={executeStep}
          onPlayPause={() => setIsPlaying(p => !p)}
          isPlaying={isPlaying}
          isComplete={isComplete}
          stepLabel="Next →"
        />
      )}
      
      {/* Height labels - hidden to save space */}
      {/* Height labels - hidden to save space in slides */}
      {false && (
        <div className="flex justify-center gap-1 font-mono text-xs text-stone-500">
          {heights.map((h, i) => (
            <div 
              key={i} 
              className="w-12 text-center"
              style={{ opacity: highlightColumn === i ? 1 : 0.6 }}
            >
              [{h}]
            </div>
          ))}
        </div>
      )}
    </CheeseSlideContainer>
  );
};

export default TrappingWaterSprite;
