import React, {
  useState,
  useCallback,
  useEffect,
  useRef,
  lazy,
  Suspense,
} from "react";
import type { SeaViewsProps } from "./types";
import { DEFAULT_HEIGHTS, parseHeights } from "./types";
import { CheeseSlideContainer, CheeseControlBar } from "../shared";
import { CheeseTickIcon, CheeseCrossIcon } from "../../icons/CheeseIcons";

// Lazy-load to avoid SSR issues
const PhaserWorldSolver = lazy(() => import("./PhaserWorldSolver"));

// ===========================================
// SOLVER ALGORITHM STATE
// ===========================================

interface SolverState {
  currentIndex: number;
  maxSoFar: number;
  viewIndices: number[];
  currentHasView: boolean | null;
}

function initialState(): SolverState {
  return {
    currentIndex: -1,
    maxSoFar: -1,
    viewIndices: [],
    currentHasView: null,
  };
}

// ===========================================
// Dark-friendly stat badge (inline, no CheeseStat)
// ===========================================

interface StatBadgeProps {
  label: string;
  value: React.ReactNode;
  variant: "amber" | "orange" | "green";
  highlight?: boolean;
  icon?: React.ReactNode;
}

const StatBadge: React.FC<StatBadgeProps> = ({
  label,
  value,
  variant,
  highlight = false,
  icon,
}) => {
  const styles = {
    amber: {
      border: highlight
        ? "border-amber-400 dark:border-amber-500"
        : "border-stone-300 dark:border-stone-600",
      bg: highlight
        ? "bg-amber-50 dark:bg-amber-900/30"
        : "bg-stone-50 dark:bg-stone-800/60",
      text: "text-amber-600 dark:text-amber-400",
      label: "text-stone-500 dark:text-stone-400",
    },
    orange: {
      border: highlight
        ? "border-orange-400 dark:border-orange-500"
        : "border-stone-300 dark:border-stone-600",
      bg: highlight
        ? "bg-orange-50 dark:bg-orange-900/30"
        : "bg-stone-50 dark:bg-stone-800/60",
      text: "text-orange-600 dark:text-orange-400",
      label: "text-stone-500 dark:text-stone-400",
    },
    green: {
      border: highlight
        ? "border-green-400 dark:border-green-500"
        : "border-stone-300 dark:border-stone-600",
      bg: highlight
        ? "bg-green-50 dark:bg-green-900/30"
        : "bg-stone-50 dark:bg-stone-800/60",
      text: "text-green-600 dark:text-green-400",
      label: "text-stone-500 dark:text-stone-400",
    },
  };

  const s = styles[variant];

  return (
    <div
      className={`
        px-4 py-2.5 rounded-xl border transition-colors
        ${s.border} ${s.bg}
      `}
    >
      <div className={`text-[10px] font-medium uppercase tracking-wider ${s.label}`}>
        {label}
      </div>
      <div className={`text-lg font-bold tabular-nums ${s.text} flex items-center gap-2`}>
        {icon}
        {value}
      </div>
    </div>
  );
};

// ===========================================
// MAIN COMPONENT
// ===========================================

export const SeaViewsSolver: React.FC<SeaViewsProps> = ({
  heights: initialHeights = DEFAULT_HEIGHTS,
  showEditor = true,
  showControls = true,
  autoPlay = false,
  autoPlayDelay = 900,
  width = 1080,
  height = 560,
}) => {
  const [heights, setHeights] = useState(initialHeights);
  const [heightInput, setHeightInput] = useState(initialHeights.join(", "));

  const [solver, setSolver] = useState<SolverState>(initialState);
  const [currentStep, setCurrentStep] = useState(0);
  const [isComplete, setIsComplete] = useState(false);
  const [isPlaying, setIsPlaying] = useState(autoPlay);
  const autoPlayRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Execute one step: move pointer one position to the RIGHT (away from ocean)
  const executeStep = useCallback(() => {
    setSolver((prev) => {
      const n = heights.length;
      const nextIndex = prev.currentIndex + 1;

      if (nextIndex >= n) {
        setTimeout(() => setIsComplete(true), 0);
        return prev;
      }

      const h = heights[nextIndex];
      const hasView = h > prev.maxSoFar;
      const newMax = Math.max(prev.maxSoFar, h);

      setTimeout(() => setCurrentStep((s) => s + 1), 0);

      if (nextIndex === n - 1) {
        setTimeout(() => setIsComplete(true), 0);
      }

      return {
        currentIndex: nextIndex,
        maxSoFar: newMax,
        viewIndices: hasView
          ? [...prev.viewIndices, nextIndex]
          : prev.viewIndices,
        currentHasView: hasView,
      };
    });
  }, [heights]);

  const reset = useCallback(() => {
    setSolver(initialState());
    setCurrentStep(0);
    setIsComplete(false);
    setIsPlaying(false);
    if (autoPlayRef.current) clearTimeout(autoPlayRef.current);
  }, []);

  const handleHeightInputChange = useCallback((value: string) => {
    setHeightInput(value);
    const parsed = parseHeights(value);
    if (parsed.length > 0) {
      setHeights(parsed);
      setSolver(initialState());
      setCurrentStep(0);
      setIsComplete(false);
      setIsPlaying(false);
    }
  }, []);

  useEffect(() => {
    if (isPlaying && !isComplete) {
      autoPlayRef.current = setTimeout(() => {
        executeStep();
      }, autoPlayDelay);
      return () => {
        if (autoPlayRef.current) clearTimeout(autoPlayRef.current);
      };
    }
  }, [isPlaying, isComplete, executeStep, autoPlayDelay, currentStep]);

  const canvasH = height - (showEditor ? 40 : 0) - (showControls ? 50 : 0);

  // Current-step result icon for the Views stat
  const viewResultIcon =
    solver.currentHasView === true ? (
      <CheeseTickIcon className="w-5 h-5 inline-block" />
    ) : solver.currentHasView === false ? (
      <CheeseCrossIcon className="w-5 h-5 inline-block" />
    ) : null;

  return (
    <CheeseSlideContainer>
      {showEditor && (
        <div className="flex items-center justify-center gap-3">
          <label className="text-sm font-medium text-stone-600 dark:text-stone-400">
            heights =
          </label>
          <input
            type="text"
            value={heightInput}
            onChange={(e) => handleHeightInputChange(e.target.value)}
            className="font-mono text-sm bg-stone-100 dark:bg-stone-800 text-amber-700 dark:text-amber-300 border border-stone-300 dark:border-stone-600 rounded-lg px-3 py-2 w-80 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent"
            placeholder="3, 1, 2, 3, 4"
          />
          <span className="text-xs text-stone-400 dark:text-stone-500">
            (0-9)
          </span>
        </div>
      )}

      <div className="flex gap-4 items-start justify-center">
        <div className="relative flex-shrink-0">
          <Suspense
            fallback={
              <div
                className="flex items-center justify-center"
                style={{ width, height: canvasH }}
              >
                <span className="text-stone-400 dark:text-stone-500">
                  Loading...
                </span>
              </div>
            }
          >
            <PhaserWorldSolver
              key={heights.join("-")}
              heights={heights}
              width={width}
              height={canvasH}
              currentIndex={solver.currentIndex}
              maxSoFar={solver.maxSoFar}
              viewIndices={solver.viewIndices}
              currentHasView={solver.currentHasView}
            />
          </Suspense>
        </div>

        <div className="flex flex-col gap-2 min-w-[120px] flex-shrink-0">
          <StatBadge label="Step" value={currentStep} variant="amber" />
          <StatBadge
            label="max_left"
            value={solver.maxSoFar < 0 ? "-" : solver.maxSoFar}
            variant="orange"
            highlight={solver.currentHasView === false}
          />
          <StatBadge
            label="Views"
            value={solver.viewIndices.length}
            variant="green"
            highlight={solver.currentHasView === true}
            icon={viewResultIcon}
          />
        </div>
      </div>

      {showControls && (
        <CheeseControlBar
          onReset={reset}
          onStep={executeStep}
          onPlayPause={() => setIsPlaying((p) => !p)}
          isPlaying={isPlaying}
          isComplete={isComplete}
          stepLabel="Step"
          size="sm"
        />
      )}
    </CheeseSlideContainer>
  );
};

export default SeaViewsSolver;
