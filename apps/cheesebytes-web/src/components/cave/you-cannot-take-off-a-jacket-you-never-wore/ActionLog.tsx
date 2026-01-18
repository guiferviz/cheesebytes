import React from 'react';
import type { Action } from './types';
import { GARMENT_NAMES, GARMENT_SYMBOLS } from './types';

interface ActionLogProps {
  actions: Action[];
  currentStep: number;
  showParentheses?: boolean;
  errorAtStep?: number;
}

export const ActionLog: React.FC<ActionLogProps> = ({
  actions,
  currentStep,
  showParentheses = false,
  errorAtStep,
}) => {
  const formatAction = (action: Action, index: number): string => {
    if (showParentheses) {
      const symbol = action.type === 'PUT' 
        ? GARMENT_SYMBOLS[action.garment].open 
        : GARMENT_SYMBOLS[action.garment].close;
      return symbol;
    }
    
    const name = GARMENT_NAMES[action.garment];
    return action.type === 'PUT' ? `PUT ${name}` : `TAKE OFF ${name}`;
  };

  return (
    <div className="action-log bg-white/80 dark:bg-gray-800/80 rounded-lg p-4 shadow-lg backdrop-blur-sm min-w-[180px]">
      <p className="text-sm font-bold text-gray-600 dark:text-gray-300 m-3 uppercase tracking-wide">
        Action Log
      </p>
      <div className="space-y-1.5">
        {actions.map((action, index) => {
          const isCurrentStep = index === currentStep;
          const isCompleted = index < currentStep;
          const isError = index === errorAtStep;
          const isPending = index > currentStep;
          
          return (
            <div
              key={index}
              className={`
                flex items-center gap-2 px-2 py-1.5 rounded-md text-sm font-mono
                transition-all duration-300
                ${isCurrentStep ? 'bg-amber-100 dark:bg-amber-900/50 scale-105' : ''}
                ${isCompleted ? 'text-gray-400 dark:text-gray-500' : ''}
                ${isError ? 'bg-red-100 dark:bg-red-900/50 text-red-600 dark:text-red-400' : ''}
                ${isPending ? 'text-gray-300 dark:text-gray-600' : ''}
                ${!isPending && !isError ? 'text-gray-700 dark:text-gray-200' : ''}
              `}
            >
              {/* Step indicator */}
              <span className="w-5 flex-shrink-0">
                {isCurrentStep && !isError && (
                  <span className="text-amber-500 animate-pulse">▶</span>
                )}
                {isError && (
                  <span className="text-red-500">✕</span>
                )}
                {isCompleted && (
                  <span className="text-green-500">✓</span>
                )}
              </span>
              
              {/* Action text */}
              <span className={`flex-1 ${showParentheses ? 'text-xl font-bold' : ''}`}>
                {formatAction(action, index)}
              </span>
              
              {/* Color indicator */}
              {action.color && (
                <span
                  className="w-3 h-3 rounded-full flex-shrink-0 border border-gray-300"
                  style={{ backgroundColor: action.color }}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ActionLog;
