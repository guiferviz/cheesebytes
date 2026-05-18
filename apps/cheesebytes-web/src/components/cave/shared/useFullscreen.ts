/**
 * Shared fullscreen hook for interactive Cheese Bytes note visuals.
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

export function useFullscreen(ref: RefObject<HTMLElement | null>) {
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

export function fullscreenRootStyle(
  isFullscreen: boolean,
): React.CSSProperties {
  if (!isFullscreen) return {};
  return {
    background: "var(--goldmine-fullscreen-bg, #fefce8)",
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "flex-start",
    padding: 24,
    width: "100%",
    height: "100%",
    boxSizing: "border-box" as const,
    overflow: "auto",
  };
}

export function fullscreenInnerStyle(
  isFullscreen: boolean,
  normalMaxWidth: number,
): { maxWidth: number | "none"; width?: string } {
  if (!isFullscreen) return { maxWidth: normalMaxWidth };
  return { maxWidth: "none", width: "100%" };
}
