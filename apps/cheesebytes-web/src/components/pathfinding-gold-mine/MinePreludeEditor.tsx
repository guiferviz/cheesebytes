/**
 * MinePreludeEditor — collapsible Python textarea showing the full setup
 * code (map + START/END markers + neighbors function) inherited from the
 * "Representing a Gold Mine" note.
 *
 * The textarea is editable. Whatever the reader writes here becomes the
 * prelude for every other visual on the page (replays, games, ...) via
 * the article-store. Tweaking the order of `MOVES`, replacing the map,
 * or rewriting `neighbors()` is enough to change how the algorithms
 * behave further down.
 *
 * Style mirrors the canonical map editor used in "Representing a Gold
 * Mine": no rounded borders, `--goldmine-*` CSS variables, dark/light
 * theme tracked from `<html class="dark">`, and a small vim-mode hook
 * for the keyboard-first crowd.
 */
import React, { useCallback, useEffect, useRef, useState } from "react";
import CodeMirror, { EditorView } from "@uiw/react-codemirror";
import { python } from "@codemirror/lang-python";
import { oneDark } from "@codemirror/theme-one-dark";
import type { VimModeAPI } from "../../utils/vim-mode";
import {
  getArticlePrelude,
  resetArticlePrelude,
  setArticlePrelude,
  useArticlePrelude,
} from "./article-store";

const cmSmallFont = EditorView.theme({
  "&": { fontSize: "11px" },
  ".cm-content": {
    fontFamily: "'JetBrains Mono', monospace",
    padding: "8px 0",
  },
  ".cm-gutters": { fontSize: "10px" },
});

const cmExtensions = [python(), EditorView.lineWrapping, cmSmallFont];

export interface MinePreludeEditorProps {
  maxWidth?: number;
  /** Title shown on the toggle bar. */
  title?: string;
  /** Whether the editor starts expanded. */
  defaultOpen?: boolean;
  vimModeId?: string;
  vimModeLabel?: string;
}

export const MinePreludeEditor: React.FC<MinePreludeEditorProps> = ({
  maxWidth = 900,
  title = "Shared map and helper code",
  defaultOpen = false,
  vimModeId = "mine-prelude",
  vimModeLabel = "Prelude",
}) => {
  const sharedCode = useArticlePrelude();
  const [code, setCode] = useState(sharedCode);
  const [open, setOpen] = useState(defaultOpen);
  const rootRef = useRef<HTMLDivElement>(null);
  const [isDark, setIsDark] = useState(
    () =>
      typeof document !== "undefined" &&
      document.documentElement.classList.contains("dark"),
  );

  // Mirror external changes (map editor, neighbors visual, ...) into our
  // local CodeMirror buffer.
  useEffect(() => {
    setCode(sharedCode);
  }, [sharedCode]);

  useEffect(() => {
    const obs = new MutationObserver(() =>
      setIsDark(document.documentElement.classList.contains("dark")),
    );
    obs.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });
    return () => obs.disconnect();
  }, []);

  const handleChange = useCallback((value: string) => {
    setCode(value);
    setArticlePrelude(value);
  }, []);

  const handleReset = useCallback(() => {
    resetArticlePrelude();
    setCode(getArticlePrelude());
  }, []);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const getVimMode = (): VimModeAPI | undefined =>
      (window as Window & { vimMode?: VimModeAPI }).vimMode;

    const syncMode = () => {
      requestAnimationFrame(() => {
        const vm = getVimMode();
        if (!vm) return;
        if (root.contains(document.activeElement)) {
          vm.pushMode(vimModeId, {
            label: vimModeLabel,
            extends: "normal",
            commands: [
              {
                key: "o",
                label: "Toggle setup code",
                run: () => setOpen((v) => !v),
              },
              {
                key: "r",
                label: "Reset to defaults",
                run: () => handleReset(),
              },
              {
                key: "escape",
                label: "Exit setup controls",
                run: () => root.blur(),
                hidden: true,
              },
            ],
          });
        } else {
          vm.popMode(vimModeId);
        }
      });
    };

    const focusRoot = (event: PointerEvent) => {
      const target = event.target;
      if (
        target instanceof HTMLElement &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable ||
          target.closest(".cm-editor"))
      ) {
        return;
      }
      root.focus({ preventScroll: true });
      syncMode();
    };

    root.addEventListener("pointerdown", focusRoot, true);
    root.addEventListener("focusin", syncMode);
    root.addEventListener("focusout", syncMode);
    syncMode();

    return () => {
      root.removeEventListener("pointerdown", focusRoot, true);
      root.removeEventListener("focusin", syncMode);
      root.removeEventListener("focusout", syncMode);
      getVimMode()?.popMode(vimModeId);
    };
  }, [handleReset, vimModeId, vimModeLabel]);

  return (
    <div
      ref={rootRef}
      tabIndex={0}
      style={{
        outline: "none",
        margin: "1.5rem auto",
        maxWidth,
      }}
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          width: "100%",
          padding: "8px 12px",
          background: "var(--goldmine-hud-btn-bg)",
          border: `2px solid var(--goldmine-hud-border)`,
          borderBottom: open ? "none" : "2px solid var(--goldmine-hud-border)",
          color: "var(--goldmine-hud-text)",
          fontFamily: "monospace",
          fontSize: 11,
          fontWeight: 700,
          textAlign: "left",
          cursor: "pointer",
        }}
      >
        <span
          aria-hidden
          style={{
            display: "inline-block",
            width: 10,
            transition: "transform 0.15s",
            transform: open ? "rotate(90deg)" : "rotate(0deg)",
          }}
        >
          ▶
        </span>
        <span style={{ textTransform: "uppercase", letterSpacing: "0.08em" }}>
          {title}
        </span>
        <span
          style={{
            marginLeft: "auto",
            color: "var(--goldmine-hud-muted)",
            fontWeight: 500,
          }}
        >
          {open ? "click to hide" : "click to edit"}
        </span>
      </button>

      {open && (
        <div>
          <div
            style={{
              padding: "8px 12px",
              background: "var(--goldmine-hud-bg)",
              borderLeft: `2px solid var(--goldmine-hud-border)`,
              borderRight: `2px solid var(--goldmine-hud-border)`,
              fontFamily: "system-ui, sans-serif",
              fontSize: 12,
              color: "var(--goldmine-hud-muted)",
              lineHeight: 1.5,
            }}
          >
            This panel contains the shared setup for this page: the map, the{" "}
            <code>find_marker</code> helpers, and the <code>neighbors()</code>{" "}
            generator. Edit any part of it if you want. As soon as the code
            contains a valid <code>MINE_MAP</code>, the game and every map-based
            visual on this page update automatically.
          </div>
          <div
            style={{
              border: `2px solid var(--goldmine-hud-border)`,
              borderTop: "none",
              overflow: "hidden",
            }}
          >
            <CodeMirror
              value={code}
              onChange={handleChange}
              extensions={cmExtensions}
              theme={isDark ? oneDark : undefined}
              indentWithTab
              basicSetup={{
                lineNumbers: true,
                foldGutter: false,
                tabSize: 4,
              }}
            />
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "6px 12px",
              background: "var(--goldmine-hud-bg)",
              border: `2px solid var(--goldmine-hud-border)`,
              borderTop: "none",
              fontFamily: "monospace",
              fontSize: 10,
              color: "var(--goldmine-hud-muted)",
            }}
          >
            <button
              type="button"
              onClick={handleReset}
              style={{
                padding: "3px 8px",
                background: "var(--goldmine-hud-btn-bg)",
                border: `1px solid var(--goldmine-hud-border)`,
                color: "var(--goldmine-hud-text)",
                fontFamily: "monospace",
                fontSize: 10,
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              Reset to defaults
            </button>
            <span>
              Tip: open{" "}
              <a
                href="/cave/representing-a-gold-mine"
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: "var(--goldmine-hud-accent)" }}
              >
                Representing a Gold Mine
              </a>{" "}
              in another tab to design a fresh map and paste it here.
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default MinePreludeEditor;
