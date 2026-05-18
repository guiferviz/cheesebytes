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
import pyodideWorkerContext from "../../../utils/pyodideWorkerContext";
import {
  useArticleMap,
  getArticleMapPython,
} from "../../pathfinding-gold-mine";
import {
  useFullscreen,
  fullscreenRootStyle,
  fullscreenInnerStyle,
} from "../shared/useFullscreen";
import type { Pos } from "../../pathfinding-gold-mine";

export const DEFAULT_MARKERS_PYTHON = `type Cell = tuple[int, int]

def find_marker(
    grid: list[str], marker: str
) -> Cell:
    for r, row in enumerate(grid):
        for c, ch in enumerate(row):
            if ch == marker:
                return (r, c)
    raise ValueError(
        f"marker {marker!r} not found"
    )

START = find_marker(MINE_MAP, "S")
END = find_marker(MINE_MAP, "E")`;

const HUD_THEME = {
  border: "var(--goldmine-hud-border)",
  text: "var(--goldmine-hud-text)",
  muted: "var(--goldmine-hud-muted)",
  accent: "var(--goldmine-hud-accent)",
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

function toPos(value: unknown): Pos | null {
  const tuple = Array.isArray(value)
    ? value
    : typeof value === "object" && value !== null && "get" in value
      ? [
          (value as { get: (index: number) => unknown }).get(0),
          (value as { get: (index: number) => unknown }).get(1),
        ]
      : null;
  if (!tuple || tuple.length < 2) return null;
  const [r, c] = tuple;
  if (typeof r !== "number" || typeof c !== "number") return null;
  return { r, c };
}

export interface MineMarkersVisualProps {
  maxWidth?: number;
}

export const MineMarkersVisual: React.FC<MineMarkersVisualProps> = ({
  maxWidth = 900,
}) => {
  const rootRef = useRef<HTMLDivElement>(null);
  const mapState = useArticleMap();
  const { isFullscreen, toggleFullscreen } = useFullscreen(rootRef);
  const [code, setCode] = useState(DEFAULT_MARKERS_PYTHON);
  const [stdout, setStdout] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [start, setStart] = useState<Pos | null>(null);
  const [end, setEnd] = useState<Pos | null>(null);
  const [running, setRunning] = useState(false);
  const [engineReady, setEngineReady] = useState(() =>
    pyodideWorkerContext.isReady(),
  );
  const codeRef = useRef(code);
  codeRef.current = code;

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
    const unsubscribe = pyodideWorkerContext.onReady(() => {
      setEngineReady(true);
    });
    return unsubscribe;
  }, []);

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
    if (!engineReady) return;

    let cancelled = false;
    const timer = window.setTimeout(async () => {
      setRunning(true);
      setStdout("");
      setError(null);

      try {
        const fullCode = [getArticleMapPython(), "", codeRef.current].join(
          "\n",
        );

        const { stdout: finalStdout, vars } = await pyodideWorkerContext.run(
          fullCode,
          {
            returnVars: ["START", "END"],
            onStdoutChunk: (chunk) => {
              if (!cancelled) {
                setStdout((current) => current + chunk);
              }
            },
          },
        );

        if (cancelled) return;
        if (finalStdout) setStdout(finalStdout);

        setStart(toPos(vars.START));
        setEnd(toPos(vars.END));
      } catch (err) {
        if (!cancelled) {
          setStart(null);
          setEnd(null);
          setError(String(err));
        }
      } finally {
        if (!cancelled) setRunning(false);
      }
    }, 180);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [code, engineReady, mapState]);

  const handleCodeChange = useCallback((value: string) => {
    setCode(value);
  }, []);

  const startLabel = useMemo(() => {
    if (!start) return "?";
    return `(${start.r}, ${start.c})`;
  }, [start]);

  const endLabel = useMemo(() => {
    if (!end) return "?";
    return `(${end.r}, ${end.c})`;
  }, [end]);

  return (
    <div
      ref={rootRef}
      tabIndex={0}
      onKeyDown={(e) => {
        if (
          e.key === "f" &&
          !e.metaKey &&
          !e.ctrlKey &&
          !(e.target instanceof HTMLTextAreaElement) &&
          !(e.target instanceof HTMLInputElement) &&
          !(e.target as HTMLElement)?.closest?.(".cm-editor")
        ) {
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
        }}
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
              Python
            </div>
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
                  background: "rgba(8,10,14,0.78)",
                  border: "1px solid rgba(90,66,46,0.8)",
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
              Resolved constants
            </div>

            <div
              style={{
                border: `2px solid ${HUD_THEME.border}`,
                background: panelBackground,
                padding: "14px 18px",
                boxSizing: "border-box",
                display: "flex",
                flexDirection: "column",
                gap: 8,
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "baseline",
                  gap: 10,
                  fontFamily: "monospace",
                  fontSize: 16,
                }}
              >
                <span style={{ color: HUD_THEME.muted }}>START =</span>
                <span style={{ color: HUD_THEME.accent, fontWeight: 700 }}>
                  {startLabel}
                </span>
              </div>
              <div
                style={{
                  display: "flex",
                  alignItems: "baseline",
                  gap: 10,
                  fontFamily: "monospace",
                  fontSize: 16,
                }}
              >
                <span style={{ color: HUD_THEME.muted }}>END =</span>
                <span style={{ color: HUD_THEME.accent, fontWeight: 700 }}>
                  {endLabel}
                </span>
              </div>
            </div>

            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
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
              <span style={{ color: HUD_THEME.muted }}>
                {!engineReady
                  ? "Warming up Python engine..."
                  : running
                    ? "Running Python..."
                    : error
                      ? "Python returned an error"
                      : "START and END are computed from the code on the left"}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
