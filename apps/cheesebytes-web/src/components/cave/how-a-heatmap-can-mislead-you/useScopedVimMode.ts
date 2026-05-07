import { useEffect, useState } from "react";
import type { RefObject } from "react";

import type { VimCommand, VimModeAPI } from "../../../utils/vim-mode";

const EDITABLE_SELECTOR = [
  "input",
  "textarea",
  "select",
  "[contenteditable='true']",
  ".cm-editor",
  ".cm-content",
].join(", ");

function getVimMode(): VimModeAPI | null {
  if (typeof window === "undefined") {
    return null;
  }
  return (window as Window & { vimMode?: VimModeAPI }).vimMode ?? null;
}

interface UseScopedVimModeOptions {
  rootRef: RefObject<HTMLElement | null>;
  modeId: string;
  label: string;
  commands: VimCommand[];
  extendsMode?: string;
}

export function useScopedVimMode({
  rootRef,
  modeId,
  label,
  commands,
  extendsMode = "normal",
}: UseScopedVimModeOptions) {
  const [armed, setArmed] = useState(false);

  useEffect(() => {
    const vimMode = getVimMode();
    const root = rootRef.current;
    if (!root) {
      return;
    }

    root.tabIndex = 0;

    let isPushed = false;

    const pushMode = () => {
      if (!vimMode || isPushed) {
        return;
      }
      vimMode.pushMode(modeId, {
        label,
        extends: extendsMode,
        commands,
      });
      isPushed = true;
    };

    const popMode = () => {
      if (!vimMode || !isPushed) {
        return;
      }
      vimMode.popMode(modeId);
      isPushed = false;
    };

    const syncMode = () => {
      const currentRoot = rootRef.current;
      const activeElement = document.activeElement;
      const inside = !!(
        currentRoot &&
        activeElement instanceof Node &&
        currentRoot.contains(activeElement)
      );

      setArmed(inside);
      if (inside) {
        pushMode();
      } else {
        popMode();
      }
    };

    const handlePointerDown = (event: PointerEvent) => {
      const currentRoot = rootRef.current;
      if (!currentRoot) {
        return;
      }
      if (!(event.target instanceof Element)) {
        return;
      }
      if (!currentRoot.contains(event.target)) {
        return;
      }
      if (event.target.closest(EDITABLE_SELECTOR)) {
        return;
      }

      requestAnimationFrame(() => {
        currentRoot.focus({ preventScroll: true });
        syncMode();
      });
    };

    syncMode();

    document.addEventListener("focusin", syncMode);
    document.addEventListener("focusout", syncMode);
    document.addEventListener("pointerdown", handlePointerDown, true);

    return () => {
      document.removeEventListener("focusin", syncMode);
      document.removeEventListener("focusout", syncMode);
      document.removeEventListener("pointerdown", handlePointerDown, true);
      popMode();
    };
  }, [commands, extendsMode, label, modeId, rootRef]);

  return armed;
}
