import React from 'react';
import type { GarmentItem, GarmentType, DisplayMode } from './types';
import { GARMENT_SYMBOLS, GARMENT_NAMES } from './types';

interface StateDisplayProps {
  stack: GarmentItem[];
  mode: DisplayMode;
  showTypeCounters?: boolean;
  balance?: number;
  showParentheses?: boolean;
  hasError?: boolean;
}

export const StateDisplay: React.FC<StateDisplayProps> = ({
  stack,
  mode,
  showTypeCounters = false,
  balance,
  showParentheses = false,
  hasError = false,
}) => {
  // Count items by type
  const typeCounts: Record<GarmentType, number> = { T: 0, S: 0, J: 0 };
  stack.forEach(item => {
    typeCounts[item.type]++;
  });

  const renderCounter = () => (
    <div className="text-center">
      <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
        Balance
      </div>
      <div 
        className={`
          text-5xl font-bold tabular-nums
          ${hasError ? 'text-red-500' : 'text-gray-800 dark:text-gray-100'}
          transition-all duration-300
        `}
      >
        {balance ?? stack.length}
      </div>
    </div>
  );

  const renderStack = () => (
    <div>
      <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2 text-center">
        Stack
      </div>
      <div className="flex flex-col-reverse gap-1 min-h-[120px] items-center">
        {stack.length === 0 ? (
          <div className="text-gray-400 dark:text-gray-500 text-sm italic">
            empty
          </div>
        ) : (
          stack.map((item, index) => {
            const symbol = showParentheses 
              ? GARMENT_SYMBOLS[item.type].open 
              : GARMENT_SYMBOLS[item.type].label;
            
            return (
              <div
                key={item.id}
                className={`
                  px-3 py-1.5 rounded-md text-sm font-mono font-bold
                  border-2 transition-all duration-300
                  ${index === stack.length - 1 ? 'ring-2 ring-amber-400 ring-offset-1' : ''}
                `}
                style={{
                  backgroundColor: item.color,
                  borderColor: index === stack.length - 1 ? '#f59e0b' : '#6b7280',
                }}
              >
                {symbol}
              </div>
            );
          })
        )}
      </div>
      {stack.length > 0 && (
        <div className="text-xs text-gray-400 dark:text-gray-500 text-center mt-1">
          ↑ top
        </div>
      )}
    </div>
  );

  const renderTypeCounters = () => (
    <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-600">
      <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2 text-center">
        By Type
      </div>
      <div className="grid grid-cols-3 gap-2 text-center">
        {(['T', 'S', 'J'] as GarmentType[]).map(type => (
          <div key={type} className="flex flex-col items-center">
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {showParentheses ? GARMENT_SYMBOLS[type].open : type}
            </span>
            <span className="text-lg font-bold text-gray-700 dark:text-gray-200">
              {typeCounts[type]}
            </span>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="state-display bg-white/80 dark:bg-gray-800/80 rounded-lg p-4 shadow-lg backdrop-blur-sm min-w-[120px]">
      <p className="text-sm font-bold text-gray-600 dark:text-gray-300 uppercase tracking-wide text-center">
        State
      </p>
      
      {(mode === 'counter' || mode === 'both') && renderCounter()}
      
      {mode === 'both' && <div className="my-4 border-t border-gray-200 dark:border-gray-600" />}
      
      {(mode === 'stack' || mode === 'both') && renderStack()}
      
      {showTypeCounters && renderTypeCounters()}
    </div>
  );
};

export default StateDisplay;
