import React, {
  forwardRef,
  useImperativeHandle,
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
} from "react";
import CodeMirror from "@uiw/react-codemirror";
import { python } from "@codemirror/lang-python";
import { oneDark } from "@codemirror/theme-one-dark";
import pyodideContext from "../utils/pyodideContext";

// ── Shared sub-components (mirrors PyodideWorkerRunner style) ─────────────────

type RunStatus = "idle" | "running" | "error";

function RunButton({
  status,
  onClick,
  isDark,
}: {
  status: RunStatus;
  onClick: () => void;
  isDark: boolean;
}) {
  const disabled = status === "running";
  const isRunning = status === "running";
  const bg = isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.05)";
  const bgHover = isDark ? "rgba(255,255,255,0.11)" : "rgba(0,0,0,0.09)";
  const border = isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.12)";
  const color = isDark ? "#e2e8f0" : "#1e293b";
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "0.4em",
        padding: "0.25rem 0.7rem",
        fontSize: "0.72rem",
        fontFamily: "monospace",
        fontWeight: 500,
        color: disabled ? (isDark ? "#4b5563" : "#9ca3af") : color,
        background: bg,
        border: `1px solid ${border}`,
        borderRadius: "4px",
        cursor: disabled ? "not-allowed" : "pointer",
        transition: "background 0.15s ease",
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
        <svg
          width="9"
          height="9"
          viewBox="0 0 10 10"
          fill="currentColor"
          style={{ animation: "spin 1s linear infinite" }}
        >
          <rect x="1" y="1" width="8" height="8" rx="1.5" />
        </svg>
      ) : (
        <svg width="9" height="10" viewBox="0 0 9 10" fill="currentColor">
          <polygon points="0,0 9,5 0,10" />
        </svg>
      )}
      {isRunning ? "running…" : "Run"}
    </button>
  );
}

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
        fontFamily: "monospace",
        color,
        background: bg,
        border: "1px solid transparent",
        borderRadius: "4px",
        cursor: "pointer",
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

// ── Component ─────────────────────────────────────────────────────────────────

const PyodideCodeRunner = forwardRef(
  (
    {
      initialCode = "",
      autoRun = false,
      runDelay = 300,
      onAfterRun,
      initialEditorHeight = 300,
    }: {
      initialCode?: string;
      autoRun?: boolean;
      runDelay?: number;
      /** Called after a successful run with the result value. */
      onAfterRun?: (result: any) => void | Promise<void>;
      /** Starting height for the code editor in pixels. */
      initialEditorHeight?: number;
    },
    ref,
  ) => {
    const [code, setCode] = useState(initialCode);
    const [output, setOutput] = useState("");
    const [status, setStatus] = useState<RunStatus>("idle");
    const [editorHeight, setEditorHeight] = useState(initialEditorHeight);
    const onAfterRunRef = useRef(onAfterRun);
    onAfterRunRef.current = onAfterRun;
    const isDragging = useRef(false);
    const dragStartY = useRef(0);
    const dragStartH = useRef(0);

    // ── Keyframes ──────────────────────────────────────────────────────────
    useEffect(() => {
      const id = "pyodide-runner-styles";
      if (document.getElementById(id)) return;
      const s = document.createElement("style");
      s.id = id;
      s.textContent = `
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.3} }
        @keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
      `;
      document.head.appendChild(s);
    }, []);

    // ── Theme ──────────────────────────────────────────────────────────────
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
    const theme = isDark ? oneDark : undefined;
    const extensions = useMemo(() => [python()], []);

    // ── Run ────────────────────────────────────────────────────────────────
    const runCode = useCallback(
      async (customCode?: string) => {
        const src = customCode !== undefined ? customCode : code;
        setStatus("running");
        setOutput("");
        try {
          // Redirect stdout/stderr so print() output is captured
          await pyodideContext.run(
            "import sys as _sys, io as _io\n" +
              "_captured_out = _io.StringIO()\n" +
              "_old_stdout, _old_stderr = _sys.stdout, _sys.stderr\n" +
              "_sys.stdout = _sys.stderr = _captured_out",
          );
          const result = await pyodideContext.run(src);
          // Restore and collect captured output
          await pyodideContext.run(
            "_sys.stdout, _sys.stderr = _old_stdout, _old_stderr",
          );
          const captured = await pyodideContext.get("_captured_out");
          const stdout =
            typeof captured?.getvalue === "function" ? captured.getvalue() : "";

          const parts: string[] = [];
          if (stdout) parts.push(stdout);
          if (result != null && String(result)) parts.push(String(result));
          setOutput(parts.join(""));
          setStatus("idle");
          try {
            await onAfterRunRef.current?.(result);
          } catch {
            /* callback errors don't affect status */
          }
          return result;
        } catch (err) {
          // Restore stdout on error too
          try {
            await pyodideContext.run(
              "_sys.stdout, _sys.stderr = _old_stdout, _old_stderr",
            );
          } catch {
            /* ignore */
          }
          setOutput(String(err));
          setStatus("error");
          throw err;
        }
      },
      [code],
    );

    // ── Imperative handle ──────────────────────────────────────────────────
    useImperativeHandle(
      ref,
      () => ({
        run: runCode,
        getGlobal: (name: string) => pyodideContext.get(name),
        runPython: (expr: string) => pyodideContext.runSync(expr),
      }),
      [runCode],
    );

    // ── Auto-run ───────────────────────────────────────────────────────────
    useEffect(() => {
      if (!autoRun) return;
      const handle = setTimeout(() => runCode().catch(() => {}), runDelay);
      return () => clearTimeout(handle);
    }, [code, autoRun, runDelay, runCode]);

    // ── Clear ──────────────────────────────────────────────────────────────
    const clearOutput = useCallback(() => {
      setOutput("");
      setStatus((s) => (s === "error" ? "idle" : s));
    }, []);

    // ── Resize handle ──────────────────────────────────────────────────────
    const editorContainerRef = useRef<HTMLDivElement>(null);
    const editorHeightRef = useRef(editorHeight);
    editorHeightRef.current = editorHeight;

    const onResizeMouseDown = useCallback((e: React.MouseEvent) => {
      e.preventDefault();
      isDragging.current = true;
      dragStartY.current = e.clientY;
      const renderedHeight =
        editorContainerRef.current?.getBoundingClientRect().height;
      dragStartH.current = renderedHeight ?? editorHeightRef.current;

      const getMaxHeight = () => {
        const contentHeight =
          editorContainerRef.current?.scrollHeight ?? dragStartH.current;
        return Math.max(80, contentHeight);
      };

      const prevCursor = document.body.style.cursor;
      const prevSelect = document.body.style.userSelect;
      document.body.style.cursor = "ns-resize";
      document.body.style.userSelect = "none";

      const onMove = (ev: MouseEvent) => {
        if (!isDragging.current) return;
        const delta = ev.clientY - dragStartY.current;
        const maxH = getMaxHeight();
        const newH = Math.min(maxH, Math.max(80, dragStartH.current + delta));
        if (editorContainerRef.current) {
          editorContainerRef.current.style.maxHeight = newH + "px";
        }
      };

      const onUp = (ev: MouseEvent) => {
        isDragging.current = false;
        document.body.style.cursor = prevCursor;
        document.body.style.userSelect = prevSelect;
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

    // ── Tokens ────────────────────────────────────────────────────────────
    const cardBorder = isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)";
    const toolbarBg = isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.03)";
    const toolbarBorder = isDark
      ? "rgba(255,255,255,0.07)"
      : "rgba(0,0,0,0.07)";
    const outputBg = isDark ? "rgba(0,0,0,0.25)" : "rgba(0,0,0,0.03)";
    const outputColor = isDark ? "#cbd5e1" : "#334155";
    const outputBorder = isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.07)";

    // ── Render ─────────────────────────────────────────────────────────────
    return (
      <div
        style={{
          textAlign: "left",
          border: `1px solid ${cardBorder}`,
          borderRadius: "8px",
          overflow: "hidden",
          fontFamily: "monospace",
        }}
      >
        {/* Editor */}
        <div
          ref={editorContainerRef}
          style={{ maxHeight: editorHeight, overflowY: "auto" }}
        >
          <CodeMirror
            value={code}
            extensions={extensions}
            theme={theme}
            onChange={setCode}
          />
        </div>

        {/* Resize handle */}
        <div
          onMouseDown={onResizeMouseDown}
          style={{
            height: 3,
            cursor: "ns-resize",
            background: isDark ? "rgba(255,255,255,0.12)" : toolbarBorder,
            opacity: 0.5,
            transition: "opacity 0.15s",
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLDivElement).style.opacity = "1";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLDivElement).style.opacity = "0.5";
          }}
        />

        {/* Toolbar */}
        {!autoRun && (
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
            <div style={{ flex: 1 }} />
            {output && <ClearButton isDark={isDark} onClick={clearOutput} />}
            <RunButton
              status={status}
              isDark={isDark}
              onClick={() => runCode().catch(() => {})}
            />
          </div>
        )}

        {/* Output */}
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
              overflowX: "auto",
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

export default PyodideCodeRunner;
