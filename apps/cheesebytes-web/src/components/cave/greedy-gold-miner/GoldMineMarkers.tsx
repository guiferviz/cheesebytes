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
  getArticleMapPython,
  getArticleMarkersPython,
  setArticleMarkersPython,
  useArticleMap,
} from "./gold-mine-article";

interface Pos {
  r: number;
  c: number;
}

const HUD_THEME = {
  bg: "linear-gradient(180deg,#3a2a1a,#2a1c10)",
  border: "#5a422e",
  text: "#d4b896",
  muted: "#a08060",
  accent: "#f6bd60",
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

export interface GoldMineMarkersProps {
  maxWidth?: number;
}

export const GoldMineMarkers: React.FC<GoldMineMarkersProps> = ({
  maxWidth = 900,
}) => {
  const mapState = useArticleMap();
  const [code, setCode] = useState(() => getArticleMarkersPython());
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
        if (finalStdout) {
          setStdout(finalStdout);
        }

        setStart(toPos(vars.START));
        setEnd(toPos(vars.END));
      } catch (err) {
        if (!cancelled) {
          setStart(null);
          setEnd(null);
          setError(String(err));
        }
      } finally {
        if (!cancelled) {
          setRunning(false);
        }
      }
    }, 180);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [code, engineReady, mapState]);

  const handleCodeChange = useCallback((value: string) => {
    setCode(value);
    setArticleMarkersPython(value);
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
    <div style={{ maxWidth, margin: "2rem auto" }}>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 16,
          alignItems: "start",
        }}
      >
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
            Resolved constants
          </div>

          <div
            style={{
              borderRadius: "10px 10px 0 0",
              border: `2px solid ${HUD_THEME.border}`,
              background:
                "radial-gradient(circle at top left, rgba(246,189,96,0.12), transparent 45%), rgba(20,14,10,0.85)",
              padding: "18px 20px",
              display: "grid",
              gap: 12,
              minHeight: 160,
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
  );
};
