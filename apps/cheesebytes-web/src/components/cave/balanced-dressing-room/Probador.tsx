import React, { useState, useCallback, useEffect, useRef } from 'react';
import type { Action, GarmentItem, DisplayMode, GarmentType } from './types';
import { GARMENT_COLORS, GARMENT_SYMBOLS } from './types';
import { Mannequin } from './Mannequin';
import { ActionLog } from './ActionLog';
import { StateDisplay } from './StateDisplay';

interface ProbadorProps {
  actions: Action[];
  displayMode?: DisplayMode;
  showTypeCounters?: boolean;
  autoPlay?: boolean;
  autoPlayDelay?: number;
  showParentheses?: boolean;
  title?: string;
  showControls?: boolean;
  onComplete?: () => void;
  onError?: (step: number) => void;
}

type AnimationState = 'idle' | 'putting' | 'taking' | 'error' | 'complete';

// CSS Keyframe animations
const ANIMATION_STYLES = `
  @keyframes garmentDropIn {
    0% {
      transform: translateY(-200px) scale(0.5);
      opacity: 0;
    }
    60% {
      transform: translateY(20px) scale(1.1);
      opacity: 1;
    }
    80% {
      transform: translateY(-10px) scale(0.95);
    }
    100% {
      transform: translateY(0) scale(1);
      opacity: 1;
    }
  }

  @keyframes garmentFlyOut {
    0% {
      transform: translateX(0) translateY(0) rotate(0deg);
      opacity: 1;
    }
    100% {
      transform: translateX(300px) translateY(-100px) rotate(20deg);
      opacity: 0;
    }
  }

  @keyframes garmentShake {
    0%, 100% { transform: translateX(0); }
    10%, 30%, 50%, 70%, 90% { transform: translateX(-8px); }
    20%, 40%, 60%, 80% { transform: translateX(8px); }
  }

  @keyframes stampAppear {
    0% {
      transform: scale(3) rotate(-20deg);
      opacity: 0;
    }
    50% {
      transform: scale(1.1) rotate(-12deg);
      opacity: 1;
    }
    100% {
      transform: scale(1) rotate(-12deg);
      opacity: 1;
    }
  }

  @keyframes pulseHighlight {
    0%, 100% { filter: brightness(1); }
    50% { filter: brightness(1.3); }
  }
`;

export const Probador: React.FC<ProbadorProps> = ({
  actions,
  displayMode = 'counter',
  showTypeCounters = false,
  autoPlay = false,
  autoPlayDelay = 1500,
  showParentheses = false,
  title = 'Dressing Room Log: Is this possible?',
  showControls = true,
  onComplete,
  onError,
}) => {
  const [currentStep, setCurrentStep] = useState(-1); // -1 means not started
  const [stack, setStack] = useState<GarmentItem[]>([]);
  const [animationState, setAnimationState] = useState<AnimationState>('idle');
  const [errorStep, setErrorStep] = useState<number | undefined>();
  const [showImpossibleStamp, setShowImpossibleStamp] = useState(false);
  const [animatingGarmentId, setAnimatingGarmentId] = useState<string | null>(null);
  const [highlightedGarmentId, setHighlightedGarmentId] = useState<string | null>(null);
  
  const colorCounters = useRef<Record<GarmentType, number>>({ T: 0, S: 0, J: 0 });
  const autoPlayTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Get next color for a garment type
  const getNextColor = (type: GarmentType): string => {
    const colors = GARMENT_COLORS[type];
    const index = colorCounters.current[type] % colors.length;
    colorCounters.current[type]++;
    return colors[index];
  };

  // Reset the animation
  const reset = useCallback(() => {
    setCurrentStep(-1);
    setStack([]);
    setAnimationState('idle');
    setErrorStep(undefined);
    setShowImpossibleStamp(false);
    setAnimatingGarmentId(null);
    setHighlightedGarmentId(null);
    colorCounters.current = { T: 0, S: 0, J: 0 };
    
    if (autoPlayTimerRef.current) {
      clearTimeout(autoPlayTimerRef.current);
      autoPlayTimerRef.current = null;
    }
  }, []);

  // Execute a single step
  const executeStep = useCallback((stepIndex: number) => {
    if (stepIndex >= actions.length) {
      setAnimationState('complete');
      onComplete?.();
      return;
    }

    const action = actions[stepIndex];
    setCurrentStep(stepIndex);

    if (action.type === 'PUT') {
      // PUT action: add garment to stack
      const newGarment: GarmentItem = {
        id: `garment-${stepIndex}-${Date.now()}`,
        type: action.garment,
        color: action.color || getNextColor(action.garment),
      };
      
      setAnimationState('putting');
      setAnimatingGarmentId(newGarment.id);
      
      // Add to stack after animation starts
      setStack(prev => [...prev, newGarment]);
      
      // Animation complete
      setTimeout(() => {
        setAnimatingGarmentId(null);
        setAnimationState('idle');
      }, 500);
      
    } else {
      // TAKE_OFF action: try to remove garment
      const topGarment = stack[stack.length - 1];
      
      if (!topGarment || topGarment.type !== action.garment) {
        // ERROR: trying to remove wrong garment or empty stack
        setAnimationState('error');
        setErrorStep(stepIndex);
        
        // Find the garment we're trying to remove (if it exists in stack)
        const targetGarment = [...stack].reverse().find(g => g.type === action.garment);
        if (targetGarment) {
          setHighlightedGarmentId(targetGarment.id);
        }
        
        // Show impossible stamp after shake animation
        setTimeout(() => {
          setShowImpossibleStamp(true);
          onError?.(stepIndex);
        }, 600);
        
        return; // Stop execution
      }
      
      // Valid TAKE_OFF
      setAnimationState('taking');
      setAnimatingGarmentId(topGarment.id);
      
      // Remove from stack after animation
      setTimeout(() => {
        setStack(prev => prev.slice(0, -1));
        setAnimatingGarmentId(null);
        setAnimationState('idle');
      }, 400);
    }
  }, [actions, stack, onComplete, onError]);

  // Step forward
  const nextStep = useCallback(() => {
    if (animationState === 'error' || animationState === 'complete') return;
    if (animationState !== 'idle') return; // Wait for current animation
    
    const nextStepIndex = currentStep + 1;
    if (nextStepIndex < actions.length) {
      executeStep(nextStepIndex);
    } else {
      setAnimationState('complete');
      onComplete?.();
    }
  }, [currentStep, actions.length, animationState, executeStep, onComplete]);

  // Auto-play effect
  useEffect(() => {
    if (autoPlay && animationState === 'idle' && currentStep < actions.length - 1 && errorStep === undefined) {
      autoPlayTimerRef.current = setTimeout(() => {
        nextStep();
      }, autoPlayDelay);
      
      return () => {
        if (autoPlayTimerRef.current) {
          clearTimeout(autoPlayTimerRef.current);
        }
      };
    }
  }, [autoPlay, autoPlayDelay, animationState, currentStep, actions.length, nextStep, errorStep]);

  // Start auto-play on mount if enabled
  useEffect(() => {
    if (autoPlay && currentStep === -1) {
      const timer = setTimeout(() => {
        nextStep();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [autoPlay, currentStep, nextStep]);

  const isComplete = animationState === 'complete' || (currentStep >= actions.length - 1 && animationState === 'idle' && !errorStep);

  return (
    <>
      <style>{ANIMATION_STYLES}</style>
      
      <div className="probador-container flex flex-col items-center gap-4 p-4 select-none">
        {/* Title banner */}
        <div className="bg-amber-100 dark:bg-amber-900/50 px-6 py-2 rounded-full shadow-md">
          <h2 className="text-lg font-bold text-amber-800 dark:text-amber-200">
            {title}
          </h2>
        </div>
        
        {/* Main content area */}
        <div className="flex gap-6 items-start justify-center w-full">
          {/* Action Log - Left */}
          <ActionLog
            actions={actions}
            currentStep={currentStep}
            showParentheses={showParentheses}
            errorAtStep={errorStep}
          />
          
          {/* Dressing Room Scene - Center */}
          <div className="relative">
            {/* Background */}
            <div className="bg-gradient-to-b from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-800 rounded-xl p-6 shadow-inner">
              {/* Mirror effect hint */}
              <div className="absolute top-4 right-4 w-16 h-24 bg-white/20 rounded-lg border border-white/30" />
              
              <svg 
                width="280" 
                height="350" 
                viewBox="0 0 280 350"
                className="relative overflow-visible"
              >
                {/* Definitions */}
                <defs>
                  <filter id="redGlow">
                    <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
                    <feMerge>
                      <feMergeNode in="coloredBlur"/>
                      <feMergeNode in="SourceGraphic"/>
                    </feMerge>
                  </filter>
                </defs>
                
                {/* Mannequin */}
                <g transform="translate(90, 50)">
                  <Mannequin width={100} height={280} />
                </g>
                
                {/* Clothing Stack */}
                <g transform="translate(80, 95)">
                  {stack.map((garment, index) => {
                    const isAnimatingIn = animatingGarmentId === garment.id && animationState === 'putting';
                    const isAnimatingOut = animatingGarmentId === garment.id && animationState === 'taking';
                    const isShaking = animationState === 'error' && index === stack.length - 1;
                    const isHighlighted = highlightedGarmentId === garment.id;
                    
                    return (
                      <g 
                        key={garment.id}
                        transform={`translate(0, ${-index * 8})`}
                        style={{
                          animation: isAnimatingIn 
                            ? 'garmentDropIn 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) forwards'
                            : isAnimatingOut
                            ? 'garmentFlyOut 0.4s ease-in forwards'
                            : isShaking
                            ? 'garmentShake 0.5s ease-in-out'
                            : undefined
                        }}
                      >
                        <GarmentSVG
                          type={garment.type}
                          color={garment.color}
                          isHighlighted={isHighlighted}
                          showParentheses={showParentheses}
                        />
                      </g>
                    );
                  })}
                </g>
                
                {/* IMPOSSIBLE stamp */}
                {showImpossibleStamp && (
                  <g 
                    transform="translate(140, 180)"
                    style={{ animation: 'stampAppear 0.3s ease-out forwards' }}
                  >
                    <rect
                      x="-80"
                      y="-25"
                      width="160"
                      height="50"
                      rx="5"
                      fill="none"
                      stroke="#dc2626"
                      strokeWidth="4"
                      transform="rotate(-12)"
                    />
                    <text
                      x="0"
                      y="8"
                      textAnchor="middle"
                      fontSize="28"
                      fontFamily="Impact, sans-serif"
                      fontWeight="bold"
                      fill="#dc2626"
                      transform="rotate(-12)"
                    >
                      IMPOSSIBLE
                    </text>
                  </g>
                )}
              </svg>
            </div>
            
            {/* Success indicator */}
            {isComplete && !errorStep && (
              <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-green-500 text-white px-4 py-1 rounded-full text-sm font-bold shadow-lg animate-bounce">
                ✓ Valid Sequence!
              </div>
            )}
          </div>
          
          {/* State Display - Right */}
          <StateDisplay
            stack={stack}
            mode={displayMode}
            showTypeCounters={showTypeCounters}
            showParentheses={showParentheses}
            hasError={!!errorStep}
          />
        </div>
        
        {/* Controls */}
        {showControls && (
          <div className="flex gap-3 mt-4">
            <button
              onClick={reset}
              className="px-4 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 rounded-lg font-medium transition-colors"
            >
              ↺ Reset
            </button>
            <button
              onClick={nextStep}
              disabled={animationState !== 'idle' || !!errorStep || isComplete}
              className={`
                px-6 py-2 rounded-lg font-bold transition-all
                ${animationState !== 'idle' || !!errorStep || isComplete
                  ? 'bg-gray-300 dark:bg-gray-600 text-gray-500 cursor-not-allowed'
                  : 'bg-amber-500 hover:bg-amber-600 text-white shadow-md hover:shadow-lg'
                }
              `}
            >
              {isComplete ? 'Done!' : errorStep !== undefined ? 'Error!' : 'Next Step →'}
            </button>
          </div>
        )}
        
        {/* Status message */}
        {errorStep !== undefined && (
          <div className="text-red-600 dark:text-red-400 text-center max-w-md">
            <p className="font-bold">Cannot remove that garment!</p>
            <p className="text-sm">It's not on top of the stack.</p>
          </div>
        )}
      </div>
    </>
  );
};

// Internal component for SVG garment rendering
interface GarmentSVGProps {
  type: GarmentType;
  color: string;
  isHighlighted?: boolean;
  showParentheses?: boolean;
}

const GarmentSVG: React.FC<GarmentSVGProps> = ({
  type,
  color,
  isHighlighted = false,
  showParentheses = false,
}) => {
  const width = 120;
  const height = 120;
  
  const symbol = showParentheses 
    ? GARMENT_SYMBOLS[type].open 
    : GARMENT_SYMBOLS[type].label;
  
  const getPath = (): string => {
    switch (type) {
      case 'T': // T-shirt - classic rounded shape
        return `
          M ${width * 0.35} ${height * 0.08}
          Q ${width * 0.5} ${height * 0.14} ${width * 0.65} ${height * 0.08}
          L ${width * 0.85} ${height * 0.08}
          Q ${width * 0.92} ${height * 0.10} ${width * 0.95} ${height * 0.18}
          L ${width * 1.0} ${height * 0.38}
          Q ${width * 0.95} ${height * 0.42} ${width * 0.78} ${height * 0.38}
          L ${width * 0.78} ${height * 0.92}
          L ${width * 0.22} ${height * 0.92}
          L ${width * 0.22} ${height * 0.38}
          Q ${width * 0.05} ${height * 0.42} ${width * 0.0} ${height * 0.38}
          L ${width * 0.05} ${height * 0.18}
          Q ${width * 0.08} ${height * 0.10} ${width * 0.15} ${height * 0.08}
          Z
        `;
      case 'S': // Sweater - long sleeve, crew neck
        return `
          M ${width * 0.35} ${height * 0.06}
          Q ${width * 0.5} ${height * 0.12} ${width * 0.65} ${height * 0.06}
          L ${width * 0.82} ${height * 0.06}
          Q ${width * 0.88} ${height * 0.08} ${width * 0.90} ${height * 0.14}
          L ${width * 1.02} ${height * 0.52}
          Q ${width * 0.98} ${height * 0.56} ${width * 0.80} ${height * 0.52}
          L ${width * 0.80} ${height * 0.92}
          L ${width * 0.20} ${height * 0.92}
          L ${width * 0.20} ${height * 0.52}
          Q ${width * 0.02} ${height * 0.56} ${width * -0.02} ${height * 0.52}
          L ${width * 0.10} ${height * 0.14}
          Q ${width * 0.12} ${height * 0.08} ${width * 0.18} ${height * 0.06}
          Z
        `;
      case 'J': // Jacket
        return `
          M ${width * 0.2} ${height * 0.05}
          L ${width * 0.35} ${height * 0.12}
          L ${width * 0.35} ${height * 0.02}
          Q ${width * 0.5} ${height * 0.07} ${width * 0.65} ${height * 0.02}
          L ${width * 0.65} ${height * 0.12}
          L ${width * 0.8} ${height * 0.05}
          L ${width * 0.88} ${height * 0.22}
          L ${width * 1.02} ${height * 0.27}
          L ${width * 1.02} ${height * 0.55}
          L ${width * 0.82} ${height * 0.55}
          L ${width * 0.82} ${height * 0.92}
          L ${width * 0.55} ${height * 0.92}
          L ${width * 0.55} ${height * 0.22}
          L ${width * 0.45} ${height * 0.22}
          L ${width * 0.45} ${height * 0.92}
          L ${width * 0.18} ${height * 0.92}
          L ${width * 0.18} ${height * 0.55}
          L ${width * -0.02} ${height * 0.55}
          L ${width * -0.02} ${height * 0.27}
          L ${width * 0.12} ${height * 0.22}
          Z
        `;
    }
  };
  
  return (
    <g>
      <path
        d={getPath()}
        fill={color}
        stroke={isHighlighted ? '#dc2626' : '#4b5563'}
        strokeWidth={isHighlighted ? 3 : 2}
        style={{
          filter: isHighlighted ? 'drop-shadow(0 0 8px rgba(220, 38, 38, 0.5))' : undefined,
          animation: isHighlighted ? 'pulseHighlight 0.5s ease-in-out infinite' : undefined,
        }}
      />
      
      {/* Label badge */}
      <g transform={`translate(${width * 0.08}, ${height * 0.18})`}>
        <rect
          x={0}
          y={0}
          width={22}
          height={16}
          rx={3}
          fill="#ffffff"
          stroke="#4b5563"
          strokeWidth={1}
        />
        <text
          x={11}
          y={12}
          textAnchor="middle"
          fontSize={11}
          fontFamily="monospace"
          fontWeight="bold"
          fill="#374151"
        >
          {symbol}
        </text>
      </g>
    </g>
  );
};

export default Probador;
