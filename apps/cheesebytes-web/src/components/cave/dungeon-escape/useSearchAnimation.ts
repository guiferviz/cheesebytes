/**
 * useSearchAnimation.ts
 *
 * Hook that drives a search generator step-by-step on a timer.
 * Returns the current SearchStep state and play/reset controls.
 */

import { useState, useRef, useCallback, useEffect } from "react";
import type { Pos, SearchStep } from "./types";

export interface AnimationState {
  explored: Set<string>;
  frontier: Set<string>;
  currentPath: Pos[];
  path: Pos[] | null;
  memorySize: number;
  stepIndex: number;
  done: boolean;
}

const EMPTY_STATE: AnimationState = {
  explored: new Set(),
  frontier: new Set(),
  currentPath: [],
  path: null,
  memorySize: 0,
  stepIndex: 0,
  done: false,
};

export function useSearchAnimation(speed = 60) {
  const [state, setState] = useState<AnimationState>(EMPTY_STATE);
  const genRef = useRef<Generator<SearchStep> | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cancelRef = useRef(false);
  const speedRef = useRef(speed);
  speedRef.current = speed;

  const stop = useCallback(() => {
    cancelRef.current = true;
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const reset = useCallback(() => {
    stop();
    genRef.current = null;
    setState(EMPTY_STATE);
  }, [stop]);

  const play = useCallback(
    (generator: Generator<SearchStep>, delay = 0) => {
      stop();
      cancelRef.current = false;
      genRef.current = generator;
      setState(EMPTY_STATE);

      let idx = 0;
      const tick = () => {
        if (cancelRef.current || !genRef.current) return;
        const result = genRef.current.next();
        if (result.done) {
          setState((prev) => ({ ...prev, done: true }));
          return;
        }
        const s = result.value;
        idx++;
        setState({
          explored: s.explored,
          frontier: s.frontier,
          currentPath: s.currentPath,
          path: s.path,
          memorySize: s.memorySize,
          stepIndex: idx,
          done: false,
        });
        if (s.path) {
          setState((prev) => ({ ...prev, done: true }));
          return;
        }
        timerRef.current = setTimeout(tick, speedRef.current);
      };

      if (delay > 0) {
        timerRef.current = setTimeout(tick, delay);
      } else {
        tick();
      }
    },
    [stop],
  );

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cancelRef.current = true;
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  return { state, play, stop, reset };
}
