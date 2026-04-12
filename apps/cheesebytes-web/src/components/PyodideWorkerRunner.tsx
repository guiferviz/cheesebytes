/**
 * PyodideWorkerRunner.tsx
 *
 * A drop-in upgrade of PyodideCodeRunner that executes Python code in a
 * dedicated Web Worker instead of the main thread, so heavy computations
 * never freeze the UI.
 *
 * Props are intentionally aligned with PyodideCodeRunner so components can
 * switch between the two with minimal effort.
 */
import React, {
  forwardRef,
  useCallback,
  useImperativeHandle,
  useState,
  useEffect,
  useRef,
  useMemo,
} from "react";
import CodeMirror, { EditorView } from "@uiw/react-codemirror";
import { python } from "@codemirror/lang-python";
import { oneDark } from "@codemirror/theme-one-dark";
import pyodideWorkerContext, {
  type RunResult,
  type MemoryStats,
  type RunOptions,
} from "../utils/pyodideWorkerContext";

// ── Font override for CodeMirror ─────────────────────────────────────────────
const FONT = "'IosevkaTermSlab Nerd Font Mono', monospace";
const fontTheme = EditorView.theme({
  "&": { fontFamily: FONT },
  ".cm-content": { fontFamily: FONT },
  ".cm-gutters": { fontFamily: FONT },
});

// ── Types ────────────────────────────────────────────────────────────────────

export type WorkerStatus = "idle" | "loading" | "ready" | "running" | "error";

export type PyodideWorkerRunnerHandle = {
  /** Run the current editor content (or a custom snippet) in the worker. */
  run: (customCode?: string) => Promise<RunResult>;
};

export type PyodideWorkerRunnerProps = {
  /** Initial Python source shown in the editor. */
  initialCode?: string;
  /** Initial editor height in pixels. If omitted, the component may auto-fit. */
  initialEditorHeight?: number;
  /** Grow the editor to fit its content until the user manually resizes it. */
  fitToContent?: boolean;
  /**
   * Kick off execution automatically.
   * - `false` (default): manual only.
   * - `true`: re-run on every code change.
   * - `"once"`: run on mount, then manual.
   */
  autoRun?: boolean | "once";
  /** Debounce delay (ms) used together with `autoRun`. Default 500. */
  runDelay?: number;
  /**
   * JS object whose entries are injected as Python globals before each run.
   * Values must be JSON-serialisable.
   */
  context?: Record<string, unknown>;
  /**
   * Show the worker loading / ready status badge.
   * Default: true.
   */
  showWorkerStatus?: boolean;
  /**
   * Render the built-in "▶ Run" button.
   * Set to `false` when the parent provides its own run trigger.
   * Default: true.
   */
  showRunButton?: boolean;
  /**
   * Python variable names to read back from the worker namespace after each
   * execution. Their values are included in `RunResult.vars`.
   */
  returnVars?: string[];
  /**
   * Show a live memory bar while the worker is running (Chromium only).
   * Default: true.
   */
  showMemory?: boolean;
  /** Called after every successful execution. */
  onResult?: (result: RunResult) => void;
  /** Called when the worker emits an error. */
  onError?: (error: Error) => void;
};

// ── Design tokens ─────────────────────────────────────────────────────────────

const STATUS_LABEL: Record<WorkerStatus, string> = {
  idle: "idle",
  loading: "loading…",
  ready: "ready",
  running: "running…",
  error: "error",
};

const STATUS_COLOR: Record<WorkerStatus, string> = {
  idle: "#6b7280",
  loading: "#f59e0b",
  ready: "#10b981",
  running: "#3b82f6",
  error: "#ef4444",
};

// ── Status dot + label ────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: WorkerStatus }) {
  const color = STATUS_COLOR[status];
  const isAnimated = status === "loading" || status === "running";
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "0.4em",
        fontSize: "0.72rem",
        fontFamily: "'IosevkaTermSlab Nerd Font Mono', monospace",
        color,
        userSelect: "none",
      }}
    >
      <span
        style={{
          width: 7,
          height: 7,
          borderRadius: "50%",
          backgroundColor: color,
          flexShrink: 0,
          animation: isAnimated ? "pulse 1.2s ease-in-out infinite" : "none",
        }}
      />
      {STATUS_LABEL[status]}
    </span>
  );
}

// ── Memory indicator ──────────────────────────────────────────────────────────

function formatMB(bytes: number) {
  return (bytes / 1024 / 1024).toFixed(0) + " MB";
}

// Two-layer bar: background = full 2 GB scale (grey ghost), foreground = actual usage (color-coded).
// The foreground color transitions green → yellow → red as usage approaches the 2 GB WASM limit.
function MemoryPill({
  stats,
  isDark,
}: {
  stats: MemoryStats;
  isDark: boolean;
}) {
  const HARD_MAX = 2 * 1024 * 1024 * 1024; // 2 GB WASM limit
  const pct = Math.min(100, (stats.heapUsed / HARD_MAX) * 100);
  const barColor = pct > 70 ? "#ef4444" : pct > 40 ? "#f59e0b" : "#10b981";
  const trackBg = isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.07)";
  const ghostBg = isDark ? "rgba(255,255,255,0.13)" : "rgba(0,0,0,0.13)";
  const dimColor = isDark ? "#4b5563" : "#9ca3af";
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "0.45em",
        fontSize: "0.72rem",
        fontFamily: "'IosevkaTermSlab Nerd Font Mono', monospace",
      }}
    >
      {/* Bar: outer = full 2 GB ghost track, inner = actual usage fill */}
      <span
        style={{
          position: "relative",
          display: "inline-block",
          width: 64,
          height: 5,
          borderRadius: 3,
          background: trackBg,
          verticalAlign: "middle",
          overflow: "hidden",
        }}
      >
        {/* Ghost: shows full 2 GB context */}
        <span
          style={{
            position: "absolute",
            inset: 0,
            borderRadius: 3,
            background: ghostBg,
            opacity: 0.35,
          }}
        />
        {/* Live fill */}
        <span
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            bottom: 0,
            width: `${pct}%`,
            background: barColor,
            borderRadius: 3,
            transition: "width 0.2s ease, background 0.2s ease",
          }}
        />
      </span>
      {/* Current usage (colored) */}
      <span style={{ color: barColor }}>{formatMB(stats.heapUsed)}</span>
      {/* Total cap (muted) */}
      <span style={{ color: dimColor, fontSize: "0.65rem" }}>
        / {formatMB(HARD_MAX)}
      </span>
    </span>
  );
}

// ── Clear output button ──────────────────────────────────────────────────────

function ClearButton({
  onClick,
  isDark,
}: {
  onClick: () => void;
  isDark: boolean;
}) {
  const bg = "transparent";
  const bgHover = isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.05)";
  const color = isDark ? "#6b7280" : "#9ca3af";
  const colorHover = isDark ? "#94a3b8" : "#64748b";
  return (
    <button
      onClick={onClick}
      title="Clear output"
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "0.35em",
        padding: "0.25rem 0.55rem",
        fontSize: "0.72rem",
        fontFamily: "'IosevkaTermSlab Nerd Font Mono', monospace",
        color,
        background: bg,
        border: "1px solid transparent",
        borderRadius: "4px",
        transition: "background 0.15s ease, color 0.15s ease",
        lineHeight: 1,
      }}
      onMouseEnter={(e) => {
        const el = e.currentTarget as HTMLButtonElement;
        el.style.background = bgHover;
        el.style.color = colorHover;
      }}
      onMouseLeave={(e) => {
        const el = e.currentTarget as HTMLButtonElement;
        el.style.background = bg;
        el.style.color = color;
      }}
    >
      {/* X icon */}
      <svg
        width="9"
        height="9"
        viewBox="0 0 10 10"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      >
        <line x1="1" y1="1" x2="9" y2="9" />
        <line x1="9" y1="1" x2="1" y2="9" />
      </svg>
      clear
    </button>
  );
}

// ── Run button ────────────────────────────────────────────────────────────────

function RunButton({
  status,
  onRun,
  onStop,
  isDark,
}: {
  status: WorkerStatus;
  onRun: () => void;
  onStop: () => void;
  isDark: boolean;
}) {
  const isRunning = status === "running";
  const disabled = status === "loading";
  const bg = isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.05)";
  const bgHover = isDark ? "rgba(255,255,255,0.11)" : "rgba(0,0,0,0.09)";
  const border = isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.12)";
  const color = isDark ? "#e2e8f0" : "#1e293b";
  const stopColor = "#ef4444";

  return (
    <button
      onClick={isRunning ? onStop : onRun}
      disabled={disabled}
      title={isRunning ? "Stop execution" : "Run code"}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "0.4em",
        padding: "0.25rem 0.7rem",
        fontSize: "0.72rem",
        fontFamily: "'IosevkaTermSlab Nerd Font Mono', monospace",
        fontWeight: 500,
        color: disabled
          ? isDark
            ? "#4b5563"
            : "#9ca3af"
          : isRunning
            ? stopColor
            : color,
        background: bg,
        border: `1px solid ${isRunning ? stopColor + "44" : border}`,
        borderRadius: "4px",
        transition:
          "background 0.15s ease, color 0.15s ease, border 0.15s ease",
        lineHeight: 1,
      }}
      onMouseEnter={(e) => {
        if (!disabled)
          (e.currentTarget as HTMLButtonElement).style.background = bgHover;
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLButtonElement).style.background = bg;
      }}
    >
      {isRunning ? (
        // Stop square (solid, no spin)
        <svg width="9" height="9" viewBox="0 0 10 10" fill="currentColor">
          <rect x="1" y="1" width="8" height="8" rx="1.5" />
        </svg>
      ) : (
        // Clean play triangle
        <svg width="9" height="10" viewBox="0 0 9 10" fill="currentColor">
          <polygon points="0,0 9,5 0,10" />
        </svg>
      )}
      {isRunning ? "Stop" : "Run"}
    </button>
  );
}

// ── Component ────────────────────────────────────────────────────────────────

const PyodideWorkerRunner = forwardRef<
  PyodideWorkerRunnerHandle,
  PyodideWorkerRunnerProps
>(
  (
    {
      initialCode = "",
      initialEditorHeight,
      fitToContent = false,
      autoRun = false,
      runDelay = 500,
      context = {},
      showWorkerStatus = true,
      showRunButton = true,
      showMemory = true,
      returnVars = [],
      onResult,
      onError,
    },
    ref,
  ) => {
    const [code, setCode] = useState(initialCode);
    const [output, setOutput] = useState("");
    const [memoryStats, setMemoryStats] = useState<MemoryStats | null>(null);
    const [elapsedMs, setElapsedMs] = useState<number | null>(null);
    const startTimeRef = useRef<number>(0);
    const elapsedRafRef = useRef<number | null>(null);
    const [status, setStatus] = useState<WorkerStatus>(() =>
      pyodideWorkerContext.isReady() ? "ready" : "loading",
    );
    const [editorHeight, setEditorHeight] = useState(
      initialEditorHeight ?? 300,
    );
    const rootRef = useRef<HTMLDivElement>(null);
    const isDragging = useRef(false);
    const dragStartY = useRef(0);
    const dragStartH = useRef(0);
    const hasManualEditorHeight = useRef(initialEditorHeight != null);

    // ── Cleanup RAF on unmount ──────────────────────────────────────────────
    useEffect(() => {
      return () => {
        if (elapsedRafRef.current !== null)
          cancelAnimationFrame(elapsedRafRef.current);
      };
    }, []);

    // ── Inject keyframes once ──────────────────────────────────────────────
    useEffect(() => {
      const id = "pyodide-runner-styles";
      if (document.getElementById(id)) return;
      const s = document.createElement("style");
      s.id = id;
      s.textContent = `
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `;
      document.head.appendChild(s);
    }, []);

    // ── Dark-mode detection ────────────────────────────────────────────────
    const [isDark, setIsDark] = useState(
      () =>
        typeof document !== "undefined" &&
        document.documentElement.classList.contains("dark"),
    );

    useEffect(() => {
      const obs = new MutationObserver(() => {
        setIsDark(document.documentElement.classList.contains("dark"));
      });
      obs.observe(document.documentElement, {
        attributes: true,
        attributeFilter: ["class"],
      });
      return () => obs.disconnect();
    }, []);

    const theme = isDark ? oneDark : undefined;
    const extensions = useMemo(() => [python(), fontTheme], []);

    // ── Worker readiness ───────────────────────────────────────────────────
    useEffect(() => {
      if (pyodideWorkerContext.isReady()) {
        setStatus("ready");
        return;
      }
      setStatus("loading");
      const unsub = pyodideWorkerContext.onReady(() => setStatus("ready"));
      return unsub;
    }, []);

    // ── Core run logic ─────────────────────────────────────────────────────
    const runCode = useCallback(
      async (customCode?: string): Promise<RunResult> => {
        const src = customCode !== undefined ? customCode : code;
        setStatus("running");
        setOutput(""); // clear previous output before new run
        setMemoryStats(null);

        // Start real-time elapsed timer on main thread
        if (elapsedRafRef.current !== null)
          cancelAnimationFrame(elapsedRafRef.current);
        startTimeRef.current = performance.now();
        const tick = () => {
          setElapsedMs(performance.now() - startTimeRef.current);
          elapsedRafRef.current = requestAnimationFrame(tick);
        };
        elapsedRafRef.current = requestAnimationFrame(tick);
        const opts: RunOptions = {
          context,
          returnVars,
          onStdoutChunk: (chunk) => setOutput((prev) => prev + chunk),
          onMemoryStats: showMemory ? setMemoryStats : undefined,
        };
        try {
          const runResult = await pyodideWorkerContext.run(src, opts);
          // stdout is already fully painted via chunks; no need to set again
          // unless the component was freshly mounted with a pre-existing result.
          if (elapsedRafRef.current !== null) {
            cancelAnimationFrame(elapsedRafRef.current);
            elapsedRafRef.current = null;
          }
          setElapsedMs(performance.now() - startTimeRef.current);
          setStatus("ready");
          onResult?.(runResult);
          return runResult;
        } catch (err) {
          const error = err instanceof Error ? err : new Error(String(err));
          // Gracefully swallow abort — the UI already handles the state reset.
          if (elapsedRafRef.current !== null) {
            cancelAnimationFrame(elapsedRafRef.current);
            elapsedRafRef.current = null;
          }
          setElapsedMs(performance.now() - startTimeRef.current);
          if (error.message === "Aborted") {
            setOutput((prev) => (prev ? prev + "\n[Aborted]" : "[Aborted]"));
            setStatus("loading"); // worker is restarting
            return { stdout: "", result: undefined, vars: {} } as RunResult;
          }
          setOutput((prev) => prev + "\n" + error.message);
          setStatus("error");
          onError?.(error);
          throw error;
        }
      },
      [code, context, returnVars, showMemory, onResult, onError],
    );

    // ── Imperative handle (compatible with PyodideCodeRunner) ──────────────
    useImperativeHandle(ref, () => ({ run: runCode }), [runCode]);

    // ── Clear output ────────────────────────────────────────────────────────
    const clearOutput = useCallback(() => {
      setOutput("");
      setMemoryStats(null);
      setElapsedMs(null);
      setStatus((s) => (s === "error" ? "ready" : s));
    }, []);

    // ── Resize handle drag ─────────────────────────────────────────────────
    const editorContainerRef = useRef<HTMLDivElement>(null);
    const editorHeightRef = useRef(editorHeight);
    editorHeightRef.current = editorHeight;

    const syncEditorHeightToContent = useCallback(() => {
      if (!fitToContent || hasManualEditorHeight.current) return;

      const container = editorContainerRef.current;
      if (!container) return;

      const scroller = container.querySelector(".cm-scroller");
      if (!(scroller instanceof HTMLElement)) return;

      const nextHeight = Math.max(80, Math.ceil(scroller.scrollHeight + 2));
      if (Math.abs(nextHeight - editorHeightRef.current) > 1) {
        setEditorHeight(nextHeight);
      }
    }, [fitToContent]);

    const onResizeMouseDown = useCallback((e: React.MouseEvent) => {
      e.preventDefault();
      isDragging.current = true;
      hasManualEditorHeight.current = true;
      dragStartY.current = e.clientY;
      const renderedHeight =
        editorContainerRef.current?.getBoundingClientRect().height;
      dragStartH.current = renderedHeight ?? editorHeightRef.current;

      const getMaxHeight = () => {
        const contentHeight =
          editorContainerRef.current?.scrollHeight ?? dragStartH.current;
        return Math.max(80, contentHeight);
      };

      // Lock cursor & disable text selection globally so CodeMirror can't
      // steal the cursor while the pointer passes over its surface.
      const prevCursor = document.body.style.cursor;
      const prevSelect = document.body.style.userSelect;
      document.body.style.cursor = "ns-resize";
      document.body.style.userSelect = "none";

      const onMove = (ev: MouseEvent) => {
        if (!isDragging.current) return;
        const delta = ev.clientY - dragStartY.current;
        const maxH = getMaxHeight();
        const newH = Math.min(maxH, Math.max(80, dragStartH.current + delta));
        // Apply directly to DOM for zero-lag feedback
        if (editorContainerRef.current) {
          editorContainerRef.current.style.maxHeight = newH + "px";
        }
      };
      const onUp = (ev: MouseEvent) => {
        isDragging.current = false;
        document.body.style.cursor = prevCursor;
        document.body.style.userSelect = prevSelect;
        // Sync final height to React state
        const delta = ev.clientY - dragStartY.current;
        const maxH = getMaxHeight();
        setEditorHeight(
          Math.min(maxH, Math.max(80, dragStartH.current + delta)),
        );
        document.removeEventListener("mousemove", onMove);
        document.removeEventListener("mouseup", onUp);
      };
      document.addEventListener("mousemove", onMove);
      document.addEventListener("mouseup", onUp);
    }, []);

    useEffect(() => {
      if (!fitToContent || hasManualEditorHeight.current) return;

      // Immediate attempt
      syncEditorHeightToContent();

      // Retry after rAF (CodeMirror may not have laid out yet)
      const frame = requestAnimationFrame(() => {
        syncEditorHeightToContent();
      });

      // Also observe the container for child-list changes so we catch
      // CodeMirror mounting its DOM after the initial render.
      const container = editorContainerRef.current;
      let obs: MutationObserver | undefined;
      if (container) {
        obs = new MutationObserver(() => syncEditorHeightToContent());
        obs.observe(container, { childList: true, subtree: true });
      }

      return () => {
        cancelAnimationFrame(frame);
        obs?.disconnect();
      };
    }, [code, fitToContent, syncEditorHeightToContent]);

    // ── Auto-run on code change ────────────────────────────────────────────
    const autoRunTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const runCodeRef = useRef(runCode);
    runCodeRef.current = runCode;
    const autoRunFiredRef = useRef(false);

    useEffect(() => {
      if (!autoRun) return;

      // "once" mode: only fire on mount, skip subsequent code changes
      if (autoRun === "once") {
        if (autoRunFiredRef.current) return;
        autoRunFiredRef.current = true;
      }

      autoRunTimerRef.current = setTimeout(() => {
        runCodeRef.current().catch(() => {});
      }, runDelay);

      return () => {
        if (autoRunTimerRef.current) clearTimeout(autoRunTimerRef.current);
      };
      // Only re-trigger when the user actually changes code, not when runCode identity changes
    }, [code, autoRun, runDelay]);

    // ── Ask Reveal to recompute slide layout when this runner resizes ─────
    useEffect(() => {
      const element = rootRef.current;
      if (!element || typeof ResizeObserver === "undefined") return;

      let frame: number | null = null;
      const scheduleLayout = () => {
        if (frame !== null) cancelAnimationFrame(frame);
        frame = requestAnimationFrame(() => {
          const reveal = (
            window as typeof window & {
              Reveal?: { layout?: () => void };
            }
          ).Reveal;
          reveal?.layout?.();
        });
      };

      const observer = new ResizeObserver(() => {
        scheduleLayout();
      });
      observer.observe(element);
      scheduleLayout();

      return () => {
        observer.disconnect();
        if (frame !== null) cancelAnimationFrame(frame);
      };
    }, []);

    // ── Render ─────────────────────────────────────────────────────────────
    const cardBorder = isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)";
    const toolbarBg = isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.03)";
    const toolbarBorder = isDark
      ? "rgba(255,255,255,0.07)"
      : "rgba(0,0,0,0.07)";
    const outputBg = isDark ? "#1f2430" : "#f8fafc";
    const outputColor = isDark ? "#dbe4f0" : "#334155";
    const outputBorder = isDark
      ? "rgba(255,255,255,0.08)"
      : "rgba(148,163,184,0.25)";
    const outputShadow = isDark
      ? "inset 0 1px 0 rgba(255,255,255,0.03)"
      : "inset 0 1px 0 rgba(255,255,255,0.7)";

    return (
      <div
        ref={rootRef}
        style={{
          textAlign: "left",
          border: `1px solid ${cardBorder}`,
          borderRadius: "8px",
          overflow: "hidden",
          fontFamily: "'IosevkaTermSlab Nerd Font Mono', monospace",
        }}
      >
        {/* ── Code editor ─────────────────────────────────────────────── */}
        <div
          ref={editorContainerRef}
          style={{ height: editorHeight, overflowY: "auto" }}
        >
          <CodeMirror
            value={code}
            extensions={extensions}
            theme={theme}
            onChange={setCode}
            indentWithTab
            basicSetup={{ tabSize: 4 }}
          />
        </div>

        {/* ── Resize handle ───────────────────────────────────────────── */}
        <div
          onMouseDown={onResizeMouseDown}
          style={{
            height: 5,
            cursor: "ns-resize",
            background: toolbarBorder,
            opacity: 0.6,
            transition: "opacity 0.15s",
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLDivElement).style.opacity = "1";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLDivElement).style.opacity = "0.6";
          }}
        />

        {/* ── Toolbar: status + memory + clear + run ───────────────────── */}
        {(autoRun !== true || showWorkerStatus) && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.6rem",
              padding: "0.35rem 0.75rem",
              background: toolbarBg,
              borderTop: `1px solid ${toolbarBorder}`,
            }}
          >
            {showWorkerStatus && <StatusBadge status={status} />}

            {showMemory && memoryStats && (
              <MemoryPill stats={memoryStats} isDark={isDark} />
            )}

            {elapsedMs !== null && (
              <span
                style={{
                  fontSize: "0.72rem",
                  fontFamily: "'IosevkaTermSlab Nerd Font Mono', monospace",
                  color:
                    status === "running"
                      ? isDark
                        ? "#60a5fa"
                        : "#2563eb"
                      : isDark
                        ? "#6b7280"
                        : "#9ca3af",
                  minWidth: "4.5ch",
                  textAlign: "right",
                  transition: "color 0.2s ease",
                  userSelect: "none",
                }}
              >
                {elapsedMs < 1000
                  ? `${Math.round(elapsedMs)} ms`
                  : `${(elapsedMs / 1000).toFixed(3)} s`}
              </span>
            )}

            <div style={{ flex: 1 }} />

            {/* Clear only visible when there is output */}
            {output && <ClearButton isDark={isDark} onClick={clearOutput} />}

            {autoRun !== true && showRunButton && (
              <RunButton
                status={status}
                isDark={isDark}
                onRun={() => runCode().catch(() => {})}
                onStop={() => {
                  pyodideWorkerContext
                    .abort()
                    .then(() => setStatus("ready"))
                    .catch(() => {});
                }}
              />
            )}
          </div>
        )}

        {/* ── Output ──────────────────────────────────────────────────── */}
        {output && (
          <pre
            style={{
              margin: 0,
              padding: "0.75rem 1rem",
              fontSize: "0.8rem",
              lineHeight: 1.6,
              color: outputColor,
              background: outputBg,
              borderTop: `1px solid ${outputBorder}`,
              boxShadow: outputShadow,
              maxHeight: "min(28vh, 16rem)",
              overflowX: "auto",
              overflowY: "auto",
              whiteSpace: "pre-wrap",
              wordBreak: "break-word",
            }}
          >
            {output}
          </pre>
        )}
      </div>
    );
  },
);

PyodideWorkerRunner.displayName = "PyodideWorkerRunner";

export default PyodideWorkerRunner;
