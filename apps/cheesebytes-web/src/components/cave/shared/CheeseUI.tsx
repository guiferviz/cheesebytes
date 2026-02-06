/**
 * CheeseBytes UI Components
 * 
 * Reusable React components with consistent CheeseBytes styling.
 */

import React from 'react';
import { BUTTON_STYLES, CHEESE_ANIMATIONS } from './theme';

// ===========================================
// BUTTON
// ===========================================

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'success' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  children: React.ReactNode;
}

export const CheeseButton: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  children,
  className = '',
  disabled,
  ...props
}) => {
  const sizeClasses = {
    sm: 'px-3 py-1.5 text-sm rounded-lg',
    md: 'px-5 py-2.5 text-base rounded-xl',
    lg: 'px-7 py-3 text-lg rounded-2xl',
  };
  
  const styles = BUTTON_STYLES[variant];
  
  return (
    <button
      className={`
        ${styles.base} ${styles.hover} ${styles.disabled}
        ${sizeClasses[size]}
        transition-all duration-200 ease-out
        transform active:scale-95
        ${className}
      `}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  );
};

// ===========================================
// CONTROL BAR (Reset, Step, Play/Pause)
// ===========================================

interface ControlBarProps {
  onReset?: () => void;
  onStep?: () => void;
  onPlayPause?: () => void;
  isPlaying?: boolean;
  isComplete?: boolean;
  canStep?: boolean;
  stepLabel?: string;
  resetLabel?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const CheeseControlBar: React.FC<ControlBarProps> = ({
  onReset,
  onStep,
  onPlayPause,
  isPlaying = false,
  isComplete = false,
  canStep = true,
  stepLabel = 'Step →',
  resetLabel = '↺ Reset',
  size = 'md',
  className = '',
}) => {
  return (
    <div className={`flex gap-3 items-center justify-center ${className}`}>
      {onReset && (
        <CheeseButton variant="secondary" size={size} onClick={onReset}>
          {resetLabel}
        </CheeseButton>
      )}
      
      {onStep && (
        <CheeseButton
          variant="primary"
          size={size}
          onClick={onStep}
          disabled={isComplete || isPlaying || !canStep}
        >
          {isComplete ? '✓ Done!' : stepLabel}
        </CheeseButton>
      )}
      
      {onPlayPause && (
        <CheeseButton
          variant={isPlaying ? 'danger' : 'success'}
          size={size}
          onClick={onPlayPause}
          disabled={isComplete}
        >
          {isPlaying ? '⏸ Pause' : '▶ Play'}
        </CheeseButton>
      )}
    </div>
  );
};

// ===========================================
// TITLE BADGE
// ===========================================

interface TitleBadgeProps {
  children: React.ReactNode;
  emoji?: string;
  className?: string;
  /** Use compact mode inside Reveal slides */
  compact?: boolean;
}

export const CheeseTitleBadge: React.FC<TitleBadgeProps> = ({
  children,
  emoji,
  className = '',
  compact = false,
}) => {
  return (
    <div className={`
      bg-gradient-to-r from-amber-100 to-yellow-100
      border border-amber-300/50
      ${compact ? 'px-4 py-1.5' : 'px-6 py-2.5'} 
      rounded-full shadow-md
      flex-shrink-0
      ${className}
    `}>
      <h2 className={`
        ${compact ? 'text-base' : 'text-xl'} 
        font-bold text-amber-800 
        flex items-center gap-2
        !m-0 !p-0
      `}>
        {emoji && <span>{emoji}</span>}
        {children}
        {emoji && <span>{emoji}</span>}
      </h2>
    </div>
  );
};

// ===========================================
// CARD / PANEL
// ===========================================

interface CardProps {
  children: React.ReactNode;
  variant?: 'default' | 'info' | 'highlight' | 'glass';
  className?: string;
}

export const CheeseCard: React.FC<CardProps> = ({
  children,
  variant = 'default',
  className = '',
}) => {
  const variantStyles = {
    default: `
      bg-white/95 backdrop-blur-sm
      border border-amber-200/50
    `,
    info: `
      bg-gradient-to-br from-stone-50 to-stone-100
      border border-stone-200
      shadow-inner
    `,
    highlight: `
      bg-gradient-to-r from-amber-50 to-yellow-50
      border-2 border-amber-200
    `,
    glass: `
      bg-white/60 backdrop-blur-md
      border border-white/40
    `,
  };
  
  return (
    <div className={`
      rounded-2xl shadow-lg p-5
      ${variantStyles[variant]}
      ${className}
    `}>
      {children}
    </div>
  );
};

// ===========================================
// INFO STAT
// ===========================================

interface StatProps {
  label: string;
  value: React.ReactNode;
  variant?: 'default' | 'success' | 'warning' | 'info';
  color?: 'amber' | 'green' | 'blue' | 'purple' | 'pink' | 'orange';
  highlight?: boolean;
  className?: string;
}

export const CheeseStat: React.FC<StatProps> = ({
  label,
  value,
  variant = 'default',
  color,
  highlight = false,
  className = '',
}) => {
  const variantStyles = {
    default: 'bg-amber-50 border-amber-200',
    success: 'bg-emerald-50 border-emerald-200',
    warning: 'bg-orange-50 border-orange-200',
    info: 'bg-blue-50 border-blue-200',
  };
  
  const colorStyles: Record<string, { bg: string; text: string; highlightBg: string }> = {
    amber: { bg: 'bg-amber-50 border-amber-200', text: 'text-amber-600', highlightBg: 'bg-amber-100' },
    green: { bg: 'bg-emerald-50 border-emerald-200', text: 'text-emerald-600', highlightBg: 'bg-emerald-100' },
    blue: { bg: 'bg-blue-50 border-blue-200', text: 'text-blue-600', highlightBg: 'bg-blue-100' },
    purple: { bg: 'bg-purple-50 border-purple-200', text: 'text-purple-600', highlightBg: 'bg-purple-100' },
    pink: { bg: 'bg-pink-50 border-pink-200', text: 'text-pink-600', highlightBg: 'bg-pink-100' },
    orange: { bg: 'bg-orange-50 border-orange-200', text: 'text-orange-600', highlightBg: 'bg-orange-100' },
  };
  
  const colorStyle = color ? colorStyles[color] : null;
  const baseStyle = colorStyle 
    ? `${highlight ? colorStyle.highlightBg : colorStyle.bg.split(' ')[0]} ${colorStyle.bg.split(' ')[1]}`
    : variantStyles[variant];
  
  return (
    <div className={`
      p-3 rounded-xl border transition-colors
      ${baseStyle}
      ${className}
    `}>
      <div className="text-xs font-medium text-stone-500 uppercase tracking-wider mb-1">
        {label}
      </div>
      <div className={`text-xl font-bold tabular-nums ${colorStyle ? colorStyle.text : 'text-stone-800'}`}>
        {value}
      </div>
    </div>
  );
};

// ===========================================
// STEP LOG / HISTORY
// ===========================================

interface LogEntry {
  step?: number;
  key: number | string;
  text: string;
  highlight?: boolean;
}

interface StepLogProps {
  entries?: LogEntry[];
  logs?: LogEntry[];
  currentStep?: number;
  isComplete?: boolean;
  maxVisible?: number;
  title?: string;
  className?: string;
}

export const CheeseStepLog: React.FC<StepLogProps> = ({
  entries,
  logs,
  currentStep,
  isComplete = false,
  maxVisible = 5,
  title = 'History',
  className = '',
}) => {
  const allLogs = logs || entries || [];
  const visibleLogs = allLogs.slice(-maxVisible);
  
  return (
    <div className={`
      bg-gradient-to-br from-stone-50 to-stone-100
      rounded-xl p-4 border border-stone-200
      ${className}
    `}>
      {currentStep !== undefined ? (
        <div className="text-xs font-bold text-stone-500 uppercase tracking-wider mb-3">
          Step {currentStep} {isComplete && '(Done!)'}
        </div>
      ) : (
        <div className="text-xs font-bold text-stone-500 uppercase tracking-wider mb-3">
          {title}
        </div>
      )}
      <div className="space-y-1.5 max-h-32 overflow-y-auto">
        {visibleLogs.map((log, idx) => (
          <div
            key={log.key}
            className={`
              text-xs font-mono px-2 py-1.5 rounded
              ${log.highlight
                ? 'bg-blue-50 text-blue-700 border border-blue-200'
                : 'bg-white text-stone-600 border border-stone-100'
              }
            `}
          >
            {log.step !== undefined && <span className="opacity-50">#{log.step}</span>} {log.text}
          </div>
        ))}
        {visibleLogs.length === 0 && (
          <div className="text-xs text-stone-400 italic">No steps yet...</div>
        )}
      </div>
    </div>
  );
};

// ===========================================
// FORMULA BOX
// ===========================================

interface FormulaBoxProps {
  children: React.ReactNode;
  label?: string;
  className?: string;
}

export const CheeseFormulaBox: React.FC<FormulaBoxProps> = ({
  children,
  label,
  className = '',
}) => {
  return (
    <div className={`
      bg-gradient-to-r from-blue-50 to-indigo-50
      border border-blue-200
      rounded-xl p-4
      ${className}
    `}>
      {label && (
        <div className="text-xs font-medium text-blue-600 uppercase tracking-wider mb-2">
          {label}
        </div>
      )}
      <div className="font-mono text-sm text-blue-800">
        {children}
      </div>
    </div>
  );
};

// ===========================================
// SVG BACKGROUND (for slide containers)
// ===========================================

interface SVGBackgroundProps {
  width?: number;
  height?: number;
  className?: string;
}

export const CheeseSVGBackground: React.FC<SVGBackgroundProps> = ({
  width = 800,
  height = 400,
  className = '',
}) => {
  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className={`absolute inset-0 -z-10 ${className}`}
    >
      <defs>
        <linearGradient id="bgGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style={{ stopColor: '#FFF8DC', stopOpacity: 0.5 }} />
          <stop offset="100%" style={{ stopColor: '#FFE4B5', stopOpacity: 0.3 }} />
        </linearGradient>
        <pattern id="dots" width="20" height="20" patternUnits="userSpaceOnUse">
          <circle cx="10" cy="10" r="1" fill="#DAA520" opacity="0.2" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#bgGradient)" />
      <rect width="100%" height="100%" fill="url(#dots)" />
    </svg>
  );
};

// ===========================================
// COMPLETION BADGE
// ===========================================

interface CompletionBadgeProps {
  message?: string;
  className?: string;
}

export const CheeseCompletionBadge: React.FC<CompletionBadgeProps> = ({
  message = '✓ Complete!',
  className = '',
}) => {
  return (
    <div className={`
      bg-gradient-to-r from-emerald-400 to-green-500
      text-white px-6 py-2 rounded-full
      font-bold text-lg shadow-lg
      animate-bounce
      ${className}
    `}>
      {message}
    </div>
  );
};

// ===========================================
// SLIDE CONTAINER
// ===========================================

interface SlideContainerProps {
  children: React.ReactNode;
  className?: string;
}

export const CheeseSlideContainer: React.FC<SlideContainerProps> = ({
  children,
  className = '',
}) => {
  return (
    <>
      <style>{CHEESE_ANIMATIONS}</style>
      {/* 
        Override Reveal.js styles that interfere with our layout:
        - Reveal centers content vertically, we need full height control
        - prose class adds margins we don't want
      */}
      <style>{`
        .cheese-slide-container,
        .cheese-slide-container * {
          margin-top: 0 !important;
          margin-bottom: 0 !important;
        }
        .cheese-slide-container canvas {
          max-width: none !important;
          max-height: none !important;
        }
      `}</style>
      <div className={`
        cheese-slide-container
        flex flex-col items-center justify-center gap-4
        w-full h-full
        select-none
        ${className}
      `}>
        {children}
      </div>
    </>
  );
};
