/**
 * GoldMineNeighbors — interactive Python neighbors() exercise.
 *
 * Left panel:  CodeMirror editor with the `neighbors(grid, cell)` function.
 * Right panel: Map viewer. Click any walkable cell → run Python → highlight
 *              the returned neighbors on the grid.
 */
import React, { useCallback, useEffect, useRef, useState } from "react";
import CodeMirror, { EditorView } from "@uiw/react-codemirror";
import { python } from "@codemirror/lang-python";
import { oneDark } from "@codemirror/theme-one-dark";
import pyodideWorkerContext from "../../../utils/pyodideWorkerContext";
import { posKey } from "../dungeon-escape/types";
import { GoldMineGridOverlay } from "./GoldMineGridOverlay";
import { GoldMineMapViewer } from "./GoldMineMapViewer";
import { useArticleMap, getArticleMapPython } from "./gold-mine-article";

// ── Types ────────────────────────────────────────────────────────

interface Pos {
  r: number;
  c: number;
}

// ── Theme (matches GoldMineMapCodeEditor) ────────────────────────

const HUD_THEME = {
  bg: "linear-gradient(180deg,#3a2a1a,#2a1c10)",
  border: "#5a422e",
  text: "#d4b896",
  muted: "#a08060",
  accent: "#f6bd60",
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

// ── Default editable code ────────────────────────────────────────

const INITIAL_CODE = `UP = (-1,0)
RIGHT = (0,1)
DOWN = (1,0)
LEFT = (0,-1)
MOVES = [RIGHT, UP, DOWN, LEFT]

def neighbors(grid, cell):
    r, c = cell
    for dr, dc in MOVES:
        nr, nc = r + dr, c + dc
        if grid[nr][nc] != '#':
            yield (nr, nc)`;

// ═══════════════════════════════════════════════════════════════════
// GoldMineNeighbors — exported component
// ═══════════════════════════════════════════════════════════════════

export interface GoldMineNeighborsProps {
  maxWidth?: number;
}

export const GoldMineNeighbors: React.FC<GoldMineNeighborsProps> = ({
  maxWidth = 900,
}) => {
  const mapState = useArticleMap();
  const [code, setCode] = useState(INITIAL_CODE);
  const [hover, setHover] = useState<Pos | null>(null);
  const [selected, setSelected] = useState<Pos | null>(null);
  const [highlighted, setHighlighted] = useState<Set<string>>(new Set());
  const [stdout, setStdout] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [running, setRunning] = useState(false);
  const [engineReady, setEngineReady] = useState(() =>
    pyodideWorkerContext.isReady(),
  );
  const codeRef = useRef(code);
  codeRef.current = code;

  // Reset highlights when the map changes from the editor above.
  useEffect(() => {
    setSelected(null);
    setHighlighted(new Set());
    setStdout("");
    setError(null);
  }, [mapState]);

  // Start loading Pyodide on mount so the first click has less latency.
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
      setStdout("");
      setError(null);
      setRunning(true);

      try {
        const fullCode = [
          getArticleMapPython(),
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

        if (finalStdout) {
          setStdout(finalStdout);
        }

        const result = vars._result;
        const cells = new Set<string>();
        if (Array.isArray(result)) {
          for (const pair of result) {
            const r = Array.isArray(pair) ? pair[0] : pair.get?.(0);
            const c = Array.isArray(pair) ? pair[1] : pair.get?.(1);
            if (typeof r === "number" && typeof c === "number") {
              cells.add(posKey(r, c));
            }
          }
        }
        setHighlighted(cells);
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
  }, []);

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
            Python
          </div>
          <div
            style={{
              borderRadius: 10,
              overflow: "hidden",
              border: `2px solid ${error ? "#c0392b" : "#5a422e"}`,
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
                color: "#d4b896",
                marginTop: 8,
                fontFamily: "monospace",
                whiteSpace: "pre-wrap",
                background: "rgba(8,10,14,0.78)",
                border: "1px solid rgba(90,66,46,0.8)",
                borderRadius: 8,
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
                color: "#ff6b6b",
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

        {/* Right: Map viewer + overlay + HUD */}
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
            Click a cell to test
          </div>

          <div style={{ position: "relative" }}>
            <GoldMineMapViewer mapState={mapState} joinHudBottom />
            <GoldMineGridOverlay
              rows={mapState.rows}
              cols={mapState.cols}
              hover={hover}
              onHover={setHover}
              onClick={handleCellClick}
              selected={selected}
              highlightedKeys={highlighted}
              cursor="pointer"
            />
          </div>

          {/* HUD bar */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
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
                  <span style={{ color: HUD_THEME.muted, fontStyle: "italic" }}>
                    running…
                  </span>
                ) : error ? (
                  <span style={{ color: "#ff6b6b" }}>error</span>
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
          </div>
        </div>
      </div>
    </div>
  );
};
