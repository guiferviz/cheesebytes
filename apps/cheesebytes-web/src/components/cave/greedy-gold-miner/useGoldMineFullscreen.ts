/**
 * useGoldMineFullscreen — shared fullscreen hook for gold-mine visuals.
 *
 * Wraps the Fullscreen API (with webkit prefix for Safari) and syncs
 * React state with the actual fullscreen element.
 *
 * Usage:
 *   const { isFullscreen, toggleFullscreen } = useGoldMineFullscreen(rootRef);
 *
 * Add `toggleFullscreen` to vim-mode commands under key "f", or call it
 * from a keydown handler for components that don't use vim-mode.
 */
import { useCallback, useEffect, useState } from "react";
import type { RefObject } from "react";

interface FullscreenDocument extends Document {
  webkitFullscreenElement?: Element | null;
  webkitExitFullscreen?: () => Promise<void> | void;
}

interface FullscreenElement extends HTMLElement {
  webkitRequestFullscreen?: () => Promise<void> | void;
}

function getActiveFullscreen(): Element | null {
  const doc = document as FullscreenDocument;
  return doc.fullscreenElement ?? doc.webkitFullscreenElement ?? null;
}

export function useGoldMineFullscreen(ref: RefObject<HTMLElement | null>) {
  const [isFullscreen, setIsFullscreen] = useState(false);

  const toggleFullscreen = useCallback(() => {
    const root = ref.current as FullscreenElement | null;
    const doc = document as FullscreenDocument;
    if (!root) return;

    if (getActiveFullscreen() === root) {
      if (doc.exitFullscreen) doc.exitFullscreen();
      else doc.webkitExitFullscreen?.();
    } else {
      if (root.requestFullscreen) root.requestFullscreen();
      else root.webkitRequestFullscreen?.();
    }
  }, [ref]);

  useEffect(() => {
    const sync = () => {
      setIsFullscreen(getActiveFullscreen() === ref.current);
    };
    sync();
    document.addEventListener("fullscreenchange", sync);
    document.addEventListener("webkitfullscreenchange", sync);
    return () => {
      document.removeEventListener("fullscreenchange", sync);
      document.removeEventListener("webkitfullscreenchange", sync);
    };
  }, [ref]);

  return { isFullscreen, toggleFullscreen } as const;
}

/**
 * Fullscreen root styles — spread these onto the root element's `style` prop.
 * When not fullscreen the object is empty so it's a no-op.
 */
export function fullscreenRootStyle(
  isFullscreen: boolean,
): React.CSSProperties {
  if (!isFullscreen) return {};
  return {
    background: "var(--goldmine-fullscreen-bg, #fefce8)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    width: "100%",
    height: "100%",
    boxSizing: "border-box" as const,
    overflow: "auto",
  };
}

/**
 * Inner container style override for fullscreen — removes maxWidth cap
 * so the content can grow to fill the viewport.
 */
export function fullscreenInnerStyle(
  isFullscreen: boolean,
  normalMaxWidth: number,
): { maxWidth: number | "none"; width?: string } {
  if (!isFullscreen) return { maxWidth: normalMaxWidth };
  return { maxWidth: "none", width: "100%" };
}
