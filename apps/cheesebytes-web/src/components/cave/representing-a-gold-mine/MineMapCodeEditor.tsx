import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import CodeMirror, { EditorView } from "@uiw/react-codemirror";
import { python } from "@codemirror/lang-python";
import { oneDark } from "@codemirror/theme-one-dark";
import type { VimModeAPI } from "../../../utils/vim-mode";
import {
  parseRawMap,
  mapToStrings,
  toPythonCode,
  fromPythonCode,
  validateRawMap,
  posKey,
  buildBorderWalls,
  clampInterior,
  MineMapViewer,
  MineGridOverlay,
  useFullscreen,
  fullscreenRootStyle,
  fullscreenInnerStyle,
  setArticleMap,
} from "../../pathfinding-gold-mine";
import type { Pos, MineMapState } from "../../pathfinding-gold-mine";
import { generateGreedyMineDfsMaze } from "../greedy-gold-miner/GreedyGoldMineMapEditor";

type ClickMode = "wall" | "start" | "exit";

const HUD_THEME = {
  border: "var(--goldmine-hud-border)",
  text: "var(--goldmine-hud-text)",
  muted: "var(--goldmine-hud-muted)",
  accent: "var(--goldmine-hud-accent)",
  activeBg: "var(--goldmine-hud-active-bg)",
  activeText: "var(--goldmine-hud-active-text)",
  btnBg: "var(--goldmine-hud-btn-bg)",
};

const cmSmallFont = EditorView.theme({
  "&": { fontSize: "11px" },
  ".cm-content": {
    fontFamily: "'JetBrains Mono', monospace",
    padding: "8px 0",
  },
  ".cm-gutters": { fontSize: "10px" },
});

const cmExtensions = [python(), EditorView.lineWrapping, cmSmallFont];

function resolveDistinctInteriorPos(
  preferred: Pos,
  other: Pos,
  rows: number,
  cols: number,
): Pos {
  const sameCell = preferred.r === other.r && preferred.c === other.c;
  if (!sameCell) return preferred;

  const candidates: Pos[] = [
    { r: preferred.r, c: preferred.c + 1 },
    { r: preferred.r + 1, c: preferred.c },
    { r: preferred.r, c: preferred.c - 1 },
    { r: preferred.r - 1, c: preferred.c },
    { r: 1, c: 1 },
    { r: rows - 2, c: cols - 2 },
    { r: 1, c: cols - 2 },
    { r: rows - 2, c: 1 },
  ];

  for (const candidate of candidates) {
    const r = clampInterior(candidate.r, rows);
    const c = clampInterior(candidate.c, cols);
    if (r !== other.r || c !== other.c) return { r, c };
  }

  return preferred;
}

function resizeMapState(
  map: MineMapState,
  nextRows: number,
  nextCols: number,
): MineMapState {
  const rows = Math.max(4, nextRows);
  const cols = Math.max(4, nextCols);
  const walls = buildBorderWalls(rows, cols);

  for (const key of map.walls) {
    const [rText, cText] = key.split(",");
    const r = Number(rText);
    const c = Number(cText);
    if (Number.isNaN(r) || Number.isNaN(c)) continue;
    if (r <= 0 || r >= rows - 1 || c <= 0 || c >= cols - 1) continue;
    walls.add(posKey(r, c));
  }

  const start = {
    r: clampInterior(map.start.r, rows),
    c: clampInterior(map.start.c, cols),
  };
  const exit = resolveDistinctInteriorPos(
    {
      r: clampInterior(map.exit.r, rows),
      c: clampInterior(map.exit.c, cols),
    },
    start,
    rows,
    cols,
  );

  walls.delete(posKey(start.r, start.c));
  walls.delete(posKey(exit.r, exit.c));

  return { rows, cols, walls, start, exit };
}

export interface MineMapCodeEditorProps {
  rawMap: string[];
  maxWidth?: number;
}

export const MineMapCodeEditor: React.FC<MineMapCodeEditorProps> = ({
  rawMap,
  maxWidth = 900,
}) => {
  const rootRef = useRef<HTMLDivElement>(null);
  const editorRootRef = useRef<HTMLDivElement>(null);
  const { isFullscreen, toggleFullscreen } = useFullscreen(rootRef);
  const [mapState, setMapState] = useState(() => parseRawMap(rawMap));
  const [code, setCode] = useState(() => toPythonCode(rawMap));
  const [codeError, setCodeError] = useState<string | null>(null);
  const [mode, setMode] = useState<ClickMode>("wall");
  const [drawAction, setDrawAction] = useState<"add" | "remove">("add");
  const [hover, setHover] = useState<Pos | null>(null);
  const [showHoverCoords, setShowHoverCoords] = useState(true);
  const mapStateRef = useRef(mapState);
  mapStateRef.current = mapState;
  const [isDark, setIsDark] = useState(
    () =>
      typeof document !== "undefined" &&
      document.documentElement.classList.contains("dark"),
  );
  const hudBackground = isDark
    ? "rgba(42, 28, 16, 0.96)"
    : "rgba(216, 204, 184, 0.96)";
  const panelBackground = isDark
    ? "rgba(20, 14, 10, 0.85)"
    : "rgba(245, 240, 230, 0.92)";

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

  const updateMapAndCode = useCallback((newMap: MineMapState) => {
    setMapState(newMap);
    const lines = mapToStrings(newMap);
    setCode(toPythonCode(lines));
    setCodeError(null);
    setArticleMap(lines);
  }, []);

  const handleCodeChange = useCallback((value: string) => {
    setCode(value);
    const lines = fromPythonCode(value);
    if (!lines) {
      setCodeError("Invalid format — all rows must be the same length");
      return;
    }
    const validationError = validateRawMap(lines);
    if (validationError) {
      setCodeError(validationError);
      return;
    }
    setMapState(parseRawMap(lines));
    setCodeError(null);
    setArticleMap(lines);
  }, []);

  const resizeRows = useCallback(
    (delta: number) => {
      const currentMap = mapStateRef.current;
      updateMapAndCode(
        resizeMapState(currentMap, currentMap.rows + delta, currentMap.cols),
      );
    },
    [updateMapAndCode],
  );

  const resizeCols = useCallback(
    (delta: number) => {
      const currentMap = mapStateRef.current;
      updateMapAndCode(
        resizeMapState(currentMap, currentMap.rows, currentMap.cols + delta),
      );
    },
    [updateMapAndCode],
  );

  const applyRandomMaze = useCallback(() => {
    const currentMap = mapStateRef.current;
    const preserve = buildBorderWalls(currentMap.rows, currentMap.cols);
    const walls = generateGreedyMineDfsMaze(
      currentMap.rows,
      currentMap.cols,
      preserve,
      5,
    );
    walls.delete(posKey(currentMap.start.r, currentMap.start.c));
    walls.delete(posKey(currentMap.exit.r, currentMap.exit.c));
    updateMapAndCode({ ...currentMap, walls });
  }, [updateMapAndCode]);

  const isBorder = useCallback(
    (r: number, c: number) =>
      r === 0 || r === mapState.rows - 1 || c === 0 || c === mapState.cols - 1,
    [mapState.rows, mapState.cols],
  );

  const handleCellClick = useCallback(
    (cell: Pos) => {
      if (isBorder(cell.r, cell.c)) return;

      if (mode === "start") {
        const key = posKey(cell.r, cell.c);
        if (
          !mapState.walls.has(key) &&
          key !== posKey(mapState.exit.r, mapState.exit.c)
        ) {
          updateMapAndCode({ ...mapState, start: cell });
        }
        return;
      }

      if (mode === "exit") {
        const key = posKey(cell.r, cell.c);
        if (
          !mapState.walls.has(key) &&
          key !== posKey(mapState.start.r, mapState.start.c)
        ) {
          updateMapAndCode({ ...mapState, exit: cell });
        }
        return;
      }

      const key = posKey(cell.r, cell.c);
      if (key === posKey(mapState.start.r, mapState.start.c)) return;
      if (key === posKey(mapState.exit.r, mapState.exit.c)) return;
      const action = mapState.walls.has(key) ? "remove" : "add";
      setDrawAction(action);
      const walls = new Set(mapState.walls);
      if (action === "add") walls.add(key);
      else walls.delete(key);
      updateMapAndCode({ ...mapState, walls });
    },
    [isBorder, mapState, mode, updateMapAndCode],
  );

  const handleCellDrag = useCallback(
    (cell: Pos) => {
      if (mode !== "wall") return;
      if (isBorder(cell.r, cell.c)) return;
      const key = posKey(cell.r, cell.c);
      if (key === posKey(mapState.start.r, mapState.start.c)) return;
      if (key === posKey(mapState.exit.r, mapState.exit.c)) return;

      setMapState((prev) => {
        const walls = new Set(prev.walls);
        if (drawAction === "add") {
          if (walls.has(key)) return prev;
          walls.add(key);
        } else {
          if (!walls.has(key)) return prev;
          walls.delete(key);
        }
        const next = { ...prev, walls };
        const lines = mapToStrings(next);
        setCode(toPythonCode(lines));
        setCodeError(null);
        setArticleMap(lines);
        return next;
      });
    },
    [mode, isBorder, mapState, drawAction],
  );

  useEffect(() => {
    const root = editorRootRef.current;
    if (!root) return;

    const getVimMode = (): VimModeAPI | undefined =>
      (window as Window & { vimMode?: VimModeAPI }).vimMode;
    const getActiveFullscreen = (): Element | null => {
      const doc = document as Document & {
        webkitFullscreenElement?: Element | null;
      };
      return doc.fullscreenElement ?? doc.webkitFullscreenElement ?? null;
    };

    const syncMode = () => {
      requestAnimationFrame(() => {
        const inside = root.contains(document.activeElement);
        const vm = getVimMode();
        if (!vm) return;
        if (inside) {
          vm.pushMode("gold-mine-map-editor", {
            label: "Map",
            extends: "normal",
            commands: [
              {
                key: "w",
                label: "Toggle walls mode",
                run: runAndKeepFocus(() => setMode("wall")),
              },
              {
                key: "s",
                label: "Place start mode",
                run: runAndKeepFocus(() => setMode("start")),
              },
              {
                key: "e",
                label: "Place exit mode",
                run: runAndKeepFocus(() => setMode("exit")),
              },
              {
                key: "r",
                label: "Random maze",
                run: runAndKeepFocus(() => applyRandomMaze()),
              },
              {
                key: "c",
                label: "Toggle hover coordinates",
                run: runAndKeepFocus(() =>
                  setShowHoverCoords((current) => !current),
                ),
              },
              {
                key: "arrowleft",
                label: "Decrease cols",
                run: runAndKeepFocus(() => resizeCols(-1)),
              },
              {
                key: "arrowright",
                label: "Increase cols",
                run: runAndKeepFocus(() => resizeCols(1)),
              },
              {
                key: "arrowup",
                label: "Decrease rows",
                run: runAndKeepFocus(() => resizeRows(-1)),
              },
              {
                key: "arrowdown",
                label: "Increase rows",
                run: runAndKeepFocus(() => resizeRows(1)),
              },
              {
                key: "f",
                label: "Toggle fullscreen",
                run: runAndKeepFocus(() => toggleFullscreen()),
              },
              {
                key: "escape",
                label: "Exit map controls",
                run: () => root.blur(),
              },
            ],
          });
        } else {
          vm.popMode("gold-mine-map-editor");
        }
      });
    };

    const keepRootFocus = () => {
      requestAnimationFrame(() => {
        root.focus({ preventScroll: true });
        syncMode();
      });
    };

    const restoreFocusAfterFullscreenChange = () => {
      const fullscreenRoot = rootRef.current;
      const activeFullscreen = getActiveFullscreen();
      if (activeFullscreen && activeFullscreen !== fullscreenRoot) return;

      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          root.focus({ preventScroll: true });
          syncMode();
        });
      });
    };

    const runAndKeepFocus = (action: () => void) => () => {
      action();
      keepRootFocus();
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
    document.addEventListener(
      "fullscreenchange",
      restoreFocusAfterFullscreenChange,
    );
    document.addEventListener(
      "webkitfullscreenchange",
      restoreFocusAfterFullscreenChange,
    );
    syncMode();

    return () => {
      root.removeEventListener("pointerdown", focusRoot, true);
      root.removeEventListener("focusin", syncMode);
      root.removeEventListener("focusout", syncMode);
      document.removeEventListener(
        "fullscreenchange",
        restoreFocusAfterFullscreenChange,
      );
      document.removeEventListener(
        "webkitfullscreenchange",
        restoreFocusAfterFullscreenChange,
      );
      getVimMode()?.popMode("gold-mine-map-editor");
    };
  }, [toggleFullscreen, applyRandomMaze, resizeCols, resizeRows]);

  return (
    <div
      ref={rootRef}
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "f" && !e.metaKey && !e.ctrlKey) {
          e.preventDefault();
          toggleFullscreen();
        }
      }}
      style={{ ...fullscreenRootStyle(isFullscreen), outline: "none" }}
    >
      <div
        style={{
          ...fullscreenInnerStyle(isFullscreen, maxWidth),
          margin: "2rem auto",
          display: "flex",
          flexDirection: "row",
          gap: 16,
          flexWrap: "wrap",
        }}
      >
        {/* --- Code panel --- */}
        <div style={{ flex: "1 1 300px", minWidth: 0 }}>
          <div
            style={{
              fontSize: 10,
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.1em",
              color: "var(--goldmine-label-fg)",
              marginBottom: 6,
              opacity: 0.7,
            }}
          >
            Python representation
          </div>
          <div
            style={{
              overflow: "hidden",
              border: `2px solid ${codeError ? "var(--goldmine-error-fg)" : "var(--goldmine-hud-border)"}`,
              transition: "border-color 0.2s",
            }}
          >
            <CodeMirror
              value={code}
              onChange={handleCodeChange}
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
          {codeError && (
            <div
              style={{
                fontSize: 11,
                color: "var(--goldmine-error-fg)",
                marginTop: 4,
                fontFamily: "monospace",
              }}
            >
              {codeError}
            </div>
          )}
        </div>

        {/* --- Visual panel --- */}
        <div
          ref={editorRootRef}
          tabIndex={0}
          style={{ flex: "1 1 300px", minWidth: 0, outline: "none" }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              marginBottom: 6,
            }}
          >
            <span
              style={{
                fontSize: 10,
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.1em",
                color: "var(--goldmine-label-fg)",
                opacity: 0.7,
              }}
            >
              Visual representation
            </span>
          </div>
          <MineMapViewer
            mapState={mapState}
          >
            <MineGridOverlay
              rows={mapState.rows}
              cols={mapState.cols}
              hover={hover}
              onHover={setHover}
              onClick={handleCellClick}
              onDrag={handleCellDrag}
              onDragEnd={() => {}}
              showHoverLabel={showHoverCoords}
              cursor={mode === "wall" ? "pointer" : "crosshair"}
            />
          </MineMapViewer>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              background: hudBackground,
              border: `2px solid ${HUD_THEME.border}`,
              borderTop: "none",
              boxSizing: "border-box",
              padding: "7px 12px",
              fontFamily: "monospace",
              fontSize: 11,
              color: HUD_THEME.text,
              userSelect: "none",
              minHeight: 34,
            }}
          >
            <EditorHudButton
              active={mode === "wall"}
              onClick={() => setMode("wall")}
              title="Toggle walls mode [W]"
              background={hudBackground}
              activeBackground={panelBackground}
            >
              <ShortcutLabel hotkey="W" label="alls" />
            </EditorHudButton>
            <EditorHudButton
              active={mode === "start"}
              onClick={() => setMode("start")}
              title="Place start mode [S]"
              background={hudBackground}
              activeBackground={panelBackground}
            >
              <ShortcutLabel hotkey="S" label="tart" />
            </EditorHudButton>
            <EditorHudButton
              active={mode === "exit"}
              onClick={() => setMode("exit")}
              title="Place exit mode [E]"
              background={hudBackground}
              activeBackground={panelBackground}
            >
              <ShortcutLabel hotkey="E" label="xit" />
            </EditorHudButton>
            <EditorHudButton
              onClick={applyRandomMaze}
              title="Generate random DFS maze with 5% extra openings [R]"
              background={hudBackground}
              activeBackground={panelBackground}
            >
              <ShortcutLabel hotkey="R" label="andom" />
            </EditorHudButton>
          </div>
        </div>
      </div>
    </div>
  );
};

const EditorHudButton: React.FC<{
  active?: boolean;
  onClick: () => void;
  title?: string;
  background: string;
  activeBackground: string;
  children: React.ReactNode;
}> = ({
  active = false,
  onClick,
  title,
  background,
  activeBackground,
  children,
}) => (
  <button
    type="button"
    onClick={onClick}
    title={title}
    style={{
      display: "inline-flex",
      alignItems: "center",
      gap: 3,
      padding: "3px 8px",
      fontSize: 10,
      fontWeight: 700,
      fontFamily: "monospace",
      cursor: "pointer",
      border: `1px solid ${HUD_THEME.border}`,
      background: active ? activeBackground : background,
      color: active ? HUD_THEME.activeText : HUD_THEME.text,
      whiteSpace: "nowrap",
    }}
  >
    {children}
  </button>
);

const ShortcutLabel: React.FC<{ hotkey: string; label: string }> = ({
  hotkey,
  label,
}) => (
  <span style={{ display: "inline-flex", alignItems: "baseline" }}>
    <span style={{ fontWeight: 800, textDecoration: "underline" }}>
      {hotkey}
    </span>
    <span style={{ marginLeft: "-0.04em" }}>{label}</span>
  </span>
);
