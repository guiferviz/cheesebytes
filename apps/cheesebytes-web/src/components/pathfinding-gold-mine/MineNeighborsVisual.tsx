/**
 * MineNeighborsVisual — interactive Python neighbors() exercise.
 *
 * Left panel:  CodeMirror editor with the `neighbors(grid, cell)` function.
 * Right panel: Map viewer. Click any walkable cell → run Python → highlight
 *              the returned neighbors on the grid.
 *
 * The map and code are shared across the article via the article-store
 * singleton, so editing them here is reflected in every other visual on
 * the page.
 */
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import CodeMirror, { EditorView } from "@uiw/react-codemirror";
import { python } from "@codemirror/lang-python";
import { oneDark } from "@codemirror/theme-one-dark";
import type { VimModeAPI } from "../../utils/vim-mode";
import pyodideWorkerContext from "../../utils/pyodideWorkerContext";
import { posKey } from "./types";
import type { Pos } from "./types";
import { MineGridOverlay } from "./MineGridOverlay";
import { MineMapViewer } from "./MineMapViewer";
import { useFullscreen } from "./useFullscreen";
import {
  getArticleMapPython,
  getArticleMarkersPython,
  setArticleNeighborsPython,
  useArticleMap,
  useArticleNeighborsPython,
} from "./article-store";
import {
  MINE_HUD as HUD_THEME,
  MineHudBar,
  MinePanelLabel,
  MineVisualFrame,
} from "./MineVisualFrame";

const cmSmallFont = EditorView.theme({
  "&": { fontSize: "11px" },
  ".cm-content": {
    fontFamily: "'JetBrains Mono', monospace",
    padding: "8px 0",
  },
  ".cm-gutters": { fontSize: "10px" },
});

const cmExtensions = [python(), EditorView.lineWrapping, cmSmallFont];

export interface MineNeighborsVisualProps {
  maxWidth?: number;
  vimModeId?: string;
  vimModeLabel?: string;
}

export const MineNeighborsVisual: React.FC<MineNeighborsVisualProps> = ({
  maxWidth = 900,
  vimModeId = "mine-neighbors",
  vimModeLabel = "Neighbors",
}) => {
  const mapState = useArticleMap();
  const sharedCode = useArticleNeighborsPython();
  const [code, setCode] = useState(sharedCode);
  const containerRef = useRef<HTMLDivElement>(null);
  const { isFullscreen, toggleFullscreen } = useFullscreen(containerRef);
  const [hover, setHover] = useState<Pos | null>(null);
  const [selected, setSelected] = useState<Pos | null>(null);
  const [highlighted, setHighlighted] = useState<Set<string>>(new Set());
  const [neighborOrder, setNeighborOrder] = useState<string[]>([]);
  const [showHoverCoords, setShowHoverCoords] = useState(true);
  const [zeroIndexedLabels, setZeroIndexedLabels] = useState(false);
  const [stdout, setStdout] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [running, setRunning] = useState(false);
  const [engineReady, setEngineReady] = useState(() =>
    pyodideWorkerContext.isReady(),
  );
  const codeRef = useRef(code);
  codeRef.current = code;

  // If another visual updates the shared neighbors code, mirror it here.
  useEffect(() => {
    setCode(sharedCode);
  }, [sharedCode]);

  // Reset highlights when the map changes.
  useEffect(() => {
    setSelected(null);
    setHighlighted(new Set());
    setNeighborOrder([]);
    setStdout("");
    setError(null);
  }, [mapState]);

  const highlightedLabels = useMemo(() => {
    const labels = new Map<string, string>();
    for (const [index, key] of neighborOrder.entries()) {
      if (!labels.has(key)) {
        labels.set(key, String(zeroIndexedLabels ? index : index + 1));
      }
    }
    return labels;
  }, [neighborOrder, zeroIndexedLabels]);

  useEffect(() => {
    const unsubscribe = pyodideWorkerContext.onReady(() => {
      setEngineReady(true);
    });
    return unsubscribe;
  }, []);

  const [isDark, setIsDark] = useState(
    () =>
      typeof document !== "undefined" &&
      document.documentElement.classList.contains("dark"),
  );

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

  useEffect(() => {
    const root = containerRef.current;
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
                key: "c",
                label: "Toggle hover coordinates",
                run: () => setShowHoverCoords((current) => !current),
              },
              {
                key: "z",
                label: "Toggle zero-based neighbor labels",
                run: () => setZeroIndexedLabels((current) => !current),
              },
              {
                key: "f",
                label: "Toggle fullscreen",
                run: () => toggleFullscreen(),
              },
              {
                key: "escape",
                label: "Exit neighbor controls",
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

    return () => {
      root.removeEventListener("pointerdown", focusRoot, true);
      root.removeEventListener("focusin", syncMode);
      root.removeEventListener("focusout", syncMode);
      getVimMode()?.popMode(vimModeId);
    };
  }, [toggleFullscreen, vimModeId, vimModeLabel]);

  const handleCellClick = useCallback(
    async (cell: Pos) => {
      const isBorder =
        cell.r === 0 ||
        cell.r === mapState.rows - 1 ||
        cell.c === 0 ||
        cell.c === mapState.cols - 1;
      if (isBorder) return;

      setSelected(cell);
      setHighlighted(new Set());
      setNeighborOrder([]);
      setStdout("");
      setError(null);
      setRunning(true);

      try {
        const fullCode = [
          getArticleMapPython(),
          "",
          getArticleMarkersPython(),
          "",
          codeRef.current,
          "",
          "_result = list(neighbors(MINE_MAP, (_row, _col)))",
        ].join("\n");

        const { stdout: finalStdout, vars } = await pyodideWorkerContext.run(
          fullCode,
          {
            context: { _row: cell.r, _col: cell.c },
            returnVars: ["_result"],
            onStdoutChunk: (chunk) => {
              setStdout((current) => current + chunk);
            },
          },
        );

        if (finalStdout) setStdout(finalStdout);

        const result = vars._result;
        const cells = new Set<string>();
        const orderedKeys: string[] = [];
        if (Array.isArray(result)) {
          for (const pair of result) {
            const r = Array.isArray(pair) ? pair[0] : pair.get?.(0);
            const c = Array.isArray(pair) ? pair[1] : pair.get?.(1);
            if (typeof r === "number" && typeof c === "number") {
              const key = posKey(r, c);
              cells.add(key);
              orderedKeys.push(key);
            }
          }
        }
        setHighlighted(cells);
        setNeighborOrder(orderedKeys);
      } catch (err) {
        setError(String(err));
      } finally {
        setRunning(false);
      }
    },
    [mapState],
  );

  const handleCodeChange = useCallback((value: string) => {
    setCode(value);
    setArticleNeighborsPython(value);
  }, []);

  return (
    <MineVisualFrame
      rootRef={containerRef}
      focusable
      isFullscreen={isFullscreen}
      maxWidth={maxWidth}
      margin="2rem auto"
    >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
            gap: 16,
            alignItems: "start",
          }}
        >
          <div style={{ minWidth: 0 }}>
            <MinePanelLabel>Python</MinePanelLabel>
            <div
              style={{
                overflow: "hidden",
                border: `2px solid ${error ? "var(--goldmine-error-fg)" : "var(--goldmine-hud-border)"}`,
                transition: "border-color 0.2s",
              }}
            >
              <CodeMirror
                value={code}
                extensions={cmExtensions}
                theme={isDark ? oneDark : undefined}
                onChange={handleCodeChange}
                indentWithTab
                basicSetup={{
                  lineNumbers: true,
                  foldGutter: false,
                  tabSize: 4,
                }}
              />
            </div>
            {stdout && (
              <div
                style={{
                  fontSize: 11,
                  color: "var(--goldmine-stdout-fg)",
                  marginTop: 8,
                  fontFamily: "monospace",
                  whiteSpace: "pre-wrap",
                  background: "var(--goldmine-hud-btn-bg)",
                  border: `1px solid var(--goldmine-hud-border)`,
                  padding: "8px 10px",
                  maxHeight: 120,
                  overflowY: "auto",
                }}
              >
                {stdout}
              </div>
            )}
            {error && (
              <div
                style={{
                  fontSize: 11,
                  color: "var(--goldmine-error-fg)",
                  marginTop: 4,
                  fontFamily: "monospace",
                  whiteSpace: "pre-wrap",
                  maxHeight: 80,
                  overflowY: "auto",
                }}
              >
                {error}
              </div>
            )}
          </div>

          <div style={{ minWidth: 0 }}>
            <MinePanelLabel>Click a cell to test</MinePanelLabel>

            <div style={{ position: "relative" }}>
              <MineMapViewer mapState={mapState} joinHudBottom />
              <MineGridOverlay
                rows={mapState.rows}
                cols={mapState.cols}
                hover={hover}
                onHover={setHover}
                onClick={handleCellClick}
                selected={selected}
                highlightedKeys={highlighted}
                cellLabels={highlightedLabels}
                showHoverLabel={showHoverCoords}
                cursor="pointer"
              />
            </div>

            <MineHudBar style={{ gap: 10 }}>
              {selected ? (
                <>
                  <span style={{ color: HUD_THEME.muted }}>Cell</span>
                  <span style={{ fontWeight: 700, color: HUD_THEME.accent }}>
                    ({selected.r}, {selected.c})
                  </span>
                  <span style={{ color: HUD_THEME.muted, margin: "0 2px" }}>
                    →
                  </span>
                  {running ? (
                    <span
                      style={{ color: HUD_THEME.muted, fontStyle: "italic" }}
                    >
                      running…
                    </span>
                  ) : error ? (
                    <span style={{ color: "var(--goldmine-error-fg)" }}>
                      error
                    </span>
                  ) : (
                    <span style={{ fontWeight: 700, color: HUD_THEME.accent }}>
                      {highlighted.size} neighbor
                      {highlighted.size !== 1 ? "s" : ""}
                    </span>
                  )}
                </>
              ) : (
                <span style={{ color: HUD_THEME.muted, fontStyle: "italic" }}>
                  {engineReady
                    ? "Click any open cell to run neighbors()"
                    : "Warming up Python engine..."}
                </span>
              )}
            </MineHudBar>
          </div>
        </div>
    </MineVisualFrame>
  );
};
