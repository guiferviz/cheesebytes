/**
 * GoldMineMapRepresentation — two visuals for the "Map Representation" section:
 *
 * 1. GoldMineGridOverlay  — read-only map with grid lines; hovering shows (row, col).
 * 2. GoldMineMapCodeEditor — bidirectional code ↔ visual editor with CodeMirror.
 *
 * Both reuse GoldMineMapViewer for map rendering and add HTML overlays on top.
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
import type { VimModeAPI } from "../../../utils/vim-mode";
import { posKey } from "../dungeon-escape/types";
import type { GreedyMineMapState } from "./gold-mine-viewer-shared";
import {
  buildBorderWalls,
  generateGreedyMineDfsMaze,
} from "./GreedyGoldMineMapEditor";
import { setArticleMap } from "./gold-mine-article";
import { GoldMineGridOverlay as GoldMineGridLayer } from "./GoldMineGridOverlay";
import { GoldMineMapViewer } from "./GoldMineMapViewer";

// ── Local map helpers (not tied to global singleton) ────────────────

interface Pos {
  r: number;
  c: number;
}

function parseRawMap(raw: string[]): GreedyMineMapState {
  const rows = raw.length;
  const cols = raw[0]?.length ?? 0;
  const walls = new Set<string>();
  let start: Pos = { r: 0, c: 0 };
  let exit: Pos = { r: 0, c: 0 };
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < (raw[r]?.length ?? 0); c++) {
      const ch = raw[r][c];
      if (ch === "#") walls.add(posKey(r, c));
      if (ch === "S") start = { r, c };
      if (ch === "E") exit = { r, c };
    }
  }
  return { rows, cols, walls, start, exit, version: 0 };
}

function mapToStrings(map: GreedyMineMapState): string[] {
  const lines: string[] = [];
  for (let r = 0; r < map.rows; r++) {
    let row = "";
    for (let c = 0; c < map.cols; c++) {
      if (r === map.start.r && c === map.start.c) row += "S";
      else if (r === map.exit.r && c === map.exit.c) row += "E";
      else if (map.walls.has(posKey(r, c))) row += "#";
      else row += ".";
    }
    lines.push(row);
  }
  return lines;
}

function toPythonCode(lines: string[]): string {
  const rows = lines.map((l) => `    "${l}",`).join("\n");
  return `MINE_MAP = [\n${rows}\n]`;
}

function fromPythonCode(code: string): string[] | null {
  const match = code.match(/\[([^\]]*)\]/s);
  if (!match) return null;
  const inner = match[1];
  const strs: string[] = [];
  const re = /"([^"]*)"|'([^']*)'/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(inner))) {
    strs.push(m[1] ?? m[2]);
  }
  if (strs.length === 0) return null;
  const len = strs[0].length;
  if (strs.some((s) => s.length !== len)) return null;
  return strs;
}

function validateRawMap(lines: string[]): string | null {
  if (lines.length === 0) return "Invalid format — the map cannot be empty";

  const rows = lines.length;
  const cols = lines[0].length;
  const validChars = new Set(["#", ".", "S", "E"]);

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const ch = lines[r][c];
      if (!validChars.has(ch)) {
        return "Invalid map — use only #, ., S, and E";
      }
      const isBorder = r === 0 || r === rows - 1 || c === 0 || c === cols - 1;
      if (isBorder && ch !== "#") {
        return "Invalid map — the entire border must be walls (#)";
      }
    }
  }

  return null;
}

function clampInterior(value: number, limit: number): number {
  return Math.min(Math.max(value, 1), limit - 2);
}

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
  map: GreedyMineMapState,
  nextRows: number,
  nextCols: number,
): GreedyMineMapState {
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

  return {
    rows,
    cols,
    walls,
    start,
    exit,
    version: map.version + 1,
  };
}

// ═══════════════════════════════════════════════════════════════════
// 1. GoldMineGridOverlay — read-only map + grid + hover coordinates
// ═══════════════════════════════════════════════════════════════════

export interface GoldMineGridOverlayProps {
  rawMap: string[];
  maxWidth?: number;
}

export const GoldMineGridOverlay: React.FC<GoldMineGridOverlayProps> = ({
  rawMap,
  maxWidth = 600,
}) => {
  const mapState = useMemo(() => parseRawMap(rawMap), [rawMap]);
  const [hover, setHover] = useState<Pos | null>(null);

  return (
    <div style={{ maxWidth, margin: "2rem auto", userSelect: "none" }}>
      <div style={{ position: "relative" }}>
        <GoldMineMapViewer mapState={mapState} maxWidth={maxWidth} />
        <GoldMineGridLayer
          rows={mapState.rows}
          cols={mapState.cols}
          hover={hover}
          onHover={setHover}
        />
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════
// 2. GoldMineMapCodeEditor — CodeMirror ↔ visual editor
// ═══════════════════════════════════════════════════════════════════

export interface GoldMineMapCodeEditorProps {
  rawMap: string[];
  maxWidth?: number;
}

type ClickMode = "wall" | "start" | "exit";

const HUD_THEME = {
  bg: "linear-gradient(180deg,#3a2a1a,#2a1c10)",
  border: "#5a422e",
  text: "#d4b896",
  muted: "#a08060",
  accent: "#f6bd60",
  activeBg: "rgba(128,237,153,0.15)",
  activeText: "#b8d4a0",
  btnBg: "rgba(0,0,0,0.22)",
};

const cmSmallFont = EditorView.theme({
  "&": { fontSize: "11px" },
  ".cm-content": {
    fontFamily: "'JetBrains Mono', monospace",
    padding: "8px 0",
  },
  ".cm-gutters": { fontSize: "10px" },
});

const cmExtensions = [python(), cmSmallFont];

export const GoldMineMapCodeEditor: React.FC<GoldMineMapCodeEditorProps> = ({
  rawMap,
  maxWidth = 900,
}) => {
  const editorRootRef = useRef<HTMLDivElement>(null);
  const [mapState, setMapState] = useState(() => parseRawMap(rawMap));
  const mapStateRef = useRef(mapState);
  const [code, setCode] = useState(() => toPythonCode(rawMap));
  const [codeError, setCodeError] = useState<string | null>(null);
  const [mode, setMode] = useState<ClickMode>("wall");
  const [drawAction, setDrawAction] = useState<"add" | "remove">("add");
  const [hover, setHover] = useState<Pos | null>(null);
  const [isDark, setIsDark] = useState(
    () =>
      typeof document !== "undefined" &&
      document.documentElement.classList.contains("dark"),
  );

  mapStateRef.current = mapState;

  // Theme sync
  React.useEffect(() => {
    const obs = new MutationObserver(() =>
      setIsDark(document.documentElement.classList.contains("dark")),
    );
    obs.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });
    return () => obs.disconnect();
  }, []);

  // Sync visual → code → article store
  const updateMapAndCode = useCallback((newMap: GreedyMineMapState) => {
    setMapState(newMap);
    const lines = mapToStrings(newMap);
    setCode(toPythonCode(lines));
    setCodeError(null);
    setArticleMap(lines);
  }, []);

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

  // Sync code → visual (CodeMirror onChange)
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

    if (lines) {
      setMapState(parseRawMap(lines));
      setCodeError(null);
      setArticleMap(lines);
    }
  }, []);

  const isBorder = useCallback(
    (r: number, c: number) =>
      r === 0 || r === mapState.rows - 1 || c === 0 || c === mapState.cols - 1,
    [mapState.rows, mapState.cols],
  );

  // Click on map: set start/exit or start wall toggle
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

      // Wall toggle — determine action from first cell
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

  // Drag on map: continue wall painting
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
    [drawAction, isBorder, mapState.exit, mapState.start, mode],
  );

  useEffect(() => {
    const root = editorRootRef.current;
    if (!root) return;

    const getVimMode = (): VimModeAPI | undefined =>
      (window as Window & { vimMode?: VimModeAPI }).vimMode;

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
                label: "Generate random DFS maze",
                run: runAndKeepFocus(applyRandomMaze),
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

    const runAndKeepFocus = (action: () => void) => () => {
      action();
      keepRootFocus();
    };

    const focusRoot = () => {
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
      getVimMode()?.popMode("gold-mine-map-editor");
    };
  }, [applyRandomMaze, resizeCols, resizeRows]);

  return (
    <div style={{ maxWidth, margin: "2rem auto" }}>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 16,
          alignItems: "start",
        }}
      >
        {/* Left: CodeMirror editor */}
        <div>
          <div
            style={{
              fontSize: 10,
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.1em",
              color: "var(--vim-palette-fg, #a08060)",
              marginBottom: 6,
              opacity: 0.7,
            }}
          >
            Python representation
          </div>
          <div
            style={{
              borderRadius: 10,
              overflow: "hidden",
              border: `2px solid ${codeError ? "#c0392b" : "#5a422e"}`,
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
          {codeError && (
            <div
              style={{
                fontSize: 11,
                color: "#ff6b6b",
                marginTop: 4,
                fontFamily: "monospace",
              }}
            >
              {codeError}
            </div>
          )}
        </div>

        {/* Right: visual editor */}
        <div ref={editorRootRef} tabIndex={0} style={{ outline: "none" }}>
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
                color: "var(--vim-palette-fg, #a08060)",
                opacity: 0.7,
              }}
            >
              Visual representation
            </span>
          </div>

          <div style={{ position: "relative" }}>
            <GoldMineMapViewer mapState={mapState} joinHudBottom />
            <GoldMineGridLayer
              rows={mapState.rows}
              cols={mapState.cols}
              hover={hover}
              onHover={setHover}
              onClick={handleCellClick}
              onDrag={handleCellDrag}
              cursor={mode === "wall" ? "pointer" : "crosshair"}
            />
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              background: HUD_THEME.bg,
              border: `2px solid ${HUD_THEME.border}`,
              borderTop: "none",
              borderRadius: "0 0 10px 10px",
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
            >
              <ShortcutLabel hotkey="W" label="alls" />
            </EditorHudButton>
            <EditorHudButton
              active={mode === "start"}
              onClick={() => setMode("start")}
              title="Place start mode [S]"
            >
              <ShortcutLabel hotkey="S" label="tart" />
            </EditorHudButton>
            <EditorHudButton
              active={mode === "exit"}
              onClick={() => setMode("exit")}
              title="Place exit mode [E]"
            >
              <ShortcutLabel hotkey="E" label="xit" />
            </EditorHudButton>
            <EditorHudButton
              onClick={applyRandomMaze}
              title="Generate random DFS maze with 5% extra openings [R]"
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
  children: React.ReactNode;
}> = ({ active = false, onClick, title, children }) => (
  <button
    type="button"
    onClick={onClick}
    title={title}
    style={{
      display: "inline-flex",
      alignItems: "center",
      gap: 3,
      padding: "3px 8px",
      borderRadius: 4,
      fontSize: 10,
      fontWeight: 700,
      fontFamily: "monospace",
      cursor: "pointer",
      border: `1px solid ${HUD_THEME.border}`,
      background: active ? HUD_THEME.activeBg : HUD_THEME.btnBg,
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
