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
import pyodideWorkerContext from "../../../utils/pyodideWorkerContext";
import { posKey } from "../dungeon-escape/types";
import { GoldMineGridOverlay } from "./GoldMineGridOverlay";
import { GoldMineMapViewer } from "./GoldMineMapViewer";
import {
  useGoldMineFullscreen,
  fullscreenRootStyle,
  fullscreenInnerStyle,
} from "./useGoldMineFullscreen";
import {
  getArticleMapPython,
  getArticleMarkersPython,
  getArticleNeighborsPython,
  useArticleMap,
} from "./gold-mine-article";

interface Pos {
  r: number;
  c: number;
}

interface ReplayFrame {
  step: number;
  visited: Pos[];
  path: Pos[];
  current: Pos | null;
}

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
const DEFAULT_STEP_DELAY_MS = 220;
const MIN_STEP_DELAY_MS = 1;
const MAX_STEP_DELAY_MS = 1000;
const VIZ_PREFIX = "__DFS_VIZ__";
const PLAY_BUTTON_WIDTH_PX = 54;
const SPEED_BUTTON_HOLD_DELAY_MS = 260;
const SPEED_BUTTON_REPEAT_INTERVAL_MS = 45;

const REPLAY_PRELUDE = `import json

_viz_step = 0

def show_state(visited, path, current=None):
    global _viz_step
    _viz_step += 1
    visible_visited = [] if visited is None else [list(cell) for cell in sorted(visited)]
    print("${VIZ_PREFIX}" + json.dumps({
        "step": _viz_step,
        "visited": visible_visited,
        "path": [list(cell) for cell in path],
        "current": None if current is None else list(current),
    }))`;

function clampPlaybackDelay(value: number): number {
  return Math.min(Math.max(value, MIN_STEP_DELAY_MS), MAX_STEP_DELAY_MS);
}

function toPos(value: unknown): Pos | null {
  if (!Array.isArray(value) || value.length < 2) return null;
  const [r, c] = value;
  if (typeof r !== "number" || typeof c !== "number") return null;
  return { r, c };
}

function parseFrame(line: string): ReplayFrame | null {
  if (!line.startsWith(VIZ_PREFIX)) return null;
  try {
    const raw = JSON.parse(line.slice(VIZ_PREFIX.length)) as {
      step: number;
      visited: unknown[];
      path: unknown[];
      current: unknown;
    };
    return {
      step: raw.step,
      visited: raw.visited.map(toPos).filter(Boolean) as Pos[],
      path: raw.path.map(toPos).filter(Boolean) as Pos[],
      current: toPos(raw.current),
    };
  } catch {
    return null;
  }
}

function samePos(left: Pos | null, right: Pos | null): boolean {
  if (left === right) return true;
  if (!left || !right) return false;
  return left.r === right.r && left.c === right.c;
}

function samePath(left: Pos[], right: Pos[]): boolean {
  if (left.length !== right.length) return false;
  for (let index = 0; index < left.length; index += 1) {
    if (left[index].r !== right[index].r || left[index].c !== right[index].c) {
      return false;
    }
  }
  return true;
}

function compressFrames(frames: ReplayFrame[]): ReplayFrame[] {
  const compressed: ReplayFrame[] = [];

  for (const frame of frames) {
    const previous = compressed[compressed.length - 1];
    const hasVisiblePath = frame.path.length > 0 || frame.current !== null;
    if (!hasVisiblePath) continue;

    if (
      previous &&
      samePath(previous.path, frame.path) &&
      samePos(previous.current, frame.current)
    ) {
      compressed[compressed.length - 1] = {
        ...frame,
        step: previous.step,
      };
      continue;
    }

    compressed.push({
      ...frame,
      step: compressed.length + 1,
    });
  }

  return compressed;
}

function addInitialFrame(frames: ReplayFrame[]): ReplayFrame[] {
  return [
    {
      step: 0,
      visited: [],
      path: [],
      current: null,
    },
    ...frames,
  ];
}

const HudButton: React.FC<{
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
  title?: string;
  minWidth?: number;
  children: React.ReactNode;
}> = ({
  active = false,
  disabled = false,
  onClick,
  title,
  minWidth,
  children,
}) => (
  <button
    type="button"
    tabIndex={-1}
    onMouseDown={(event) => {
      event.preventDefault();
    }}
    onClick={onClick}
    disabled={disabled}
    title={title}
    style={{
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      gap: 3,
      padding: "3px 8px",
      borderRadius: 4,
      fontSize: 10,
      fontWeight: 700,
      fontFamily: "monospace",
      cursor: disabled ? "default" : "pointer",
      opacity: disabled ? 0.45 : 1,
      border: `1px solid ${HUD_THEME.border}`,
      background: active ? HUD_THEME.activeBg : HUD_THEME.btnBg,
      color: active ? HUD_THEME.activeText : HUD_THEME.text,
      whiteSpace: "nowrap",
      minWidth,
    }}
  >
    {children}
  </button>
);

const SpeedButton: React.FC<{
  disabled?: boolean;
  onClick: () => void;
  title: string;
  children: React.ReactNode;
}> = ({ disabled = false, onClick, title, children }) => {
  const holdTimeoutRef = useRef<number | null>(null);
  const repeatIntervalRef = useRef<number | null>(null);

  const clearRepeat = useCallback(() => {
    if (holdTimeoutRef.current !== null) {
      window.clearTimeout(holdTimeoutRef.current);
      holdTimeoutRef.current = null;
    }
    if (repeatIntervalRef.current !== null) {
      window.clearInterval(repeatIntervalRef.current);
      repeatIntervalRef.current = null;
    }
  }, []);

  useEffect(() => clearRepeat, [clearRepeat]);

  return (
    <button
      type="button"
      tabIndex={-1}
      onPointerDown={(event) => {
        event.preventDefault();
        if (disabled) return;
        event.currentTarget.setPointerCapture(event.pointerId);
        onClick();
        holdTimeoutRef.current = window.setTimeout(() => {
          repeatIntervalRef.current = window.setInterval(() => {
            onClick();
          }, SPEED_BUTTON_REPEAT_INTERVAL_MS);
        }, SPEED_BUTTON_HOLD_DELAY_MS);
      }}
      onPointerUp={(event) => {
        clearRepeat();
        if (event.currentTarget.hasPointerCapture(event.pointerId)) {
          event.currentTarget.releasePointerCapture(event.pointerId);
        }
      }}
      onPointerCancel={clearRepeat}
      onLostPointerCapture={clearRepeat}
      disabled={disabled}
      title={title}
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: 20,
        height: 20,
        borderRadius: 4,
        fontSize: 11,
        fontWeight: 800,
        fontFamily: "monospace",
        cursor: disabled ? "default" : "pointer",
        opacity: disabled ? 0.45 : 1,
        border: `1px solid ${HUD_THEME.border}`,
        background: HUD_THEME.btnBg,
        color: HUD_THEME.text,
        padding: 0,
      }}
    >
      {children}
    </button>
  );
};

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

export interface GoldMineReplayExplorerProps {
  maxWidth?: number;
  title: string;
  vimModeId: string;
  vimModeLabel: string;
  initialCode: string;
}

export const GoldMineReplayExplorer: React.FC<GoldMineReplayExplorerProps> = ({
  maxWidth = 980,
  title,
  vimModeId,
  vimModeLabel,
  initialCode,
}) => {
  const mapState = useArticleMap();
  const rootRef = useRef<HTMLDivElement>(null);
  const viewerRootRef = useRef<HTMLDivElement>(null);
  const { isFullscreen, toggleFullscreen } = useGoldMineFullscreen(rootRef);
  const [code, setCode] = useState(initialCode);
  const [stdout, setStdout] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [frames, setFrames] = useState<ReplayFrame[]>([]);
  const [frameIndex, setFrameIndex] = useState(0);
  const [running, setRunning] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [needsRun, setNeedsRun] = useState(true);
  const [stepDelayMs, setStepDelayMs] = useState(DEFAULT_STEP_DELAY_MS);
  const [hover, setHover] = useState<Pos | null>(null);
  const [showHoverCoords, setShowHoverCoords] = useState(true);
  const [engineReady, setEngineReady] = useState(() =>
    pyodideWorkerContext.isReady(),
  );
  const codeRef = useRef(code);
  const stdoutBufferRef = useRef("");
  const playbackRafRef = useRef<number | null>(null);
  const playbackLastTickRef = useRef<number | null>(null);
  codeRef.current = code;

  const keepViewerFocus = useCallback(() => {
    const root = viewerRootRef.current;
    if (!root) return;
    requestAnimationFrame(() => {
      root.focus({ preventScroll: true });
    });
  }, []);

  useEffect(() => {
    const unsubscribe = pyodideWorkerContext.onReady(() => {
      setEngineReady(true);
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    setFrames([]);
    setFrameIndex(0);
    setPlaying(false);
    setStdout("");
    setError(null);
    setNeedsRun(true);
  }, [mapState]);

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

  const appendStdoutLine = useCallback((line: string) => {
    setStdout((current) => current + line + "\n");
  }, []);

  const processChunk = useCallback(
    (chunk: string, nextFrames: ReplayFrame[]) => {
      stdoutBufferRef.current += chunk;
      let newlineIndex = stdoutBufferRef.current.indexOf("\n");
      while (newlineIndex !== -1) {
        const line = stdoutBufferRef.current.slice(0, newlineIndex);
        stdoutBufferRef.current = stdoutBufferRef.current.slice(
          newlineIndex + 1,
        );
        const frame = parseFrame(line);
        if (frame) {
          nextFrames.push(frame);
        } else {
          appendStdoutLine(line);
        }
        newlineIndex = stdoutBufferRef.current.indexOf("\n");
      }
    },
    [appendStdoutLine],
  );

  const flushStdout = useCallback(
    (nextFrames: ReplayFrame[]) => {
      if (!stdoutBufferRef.current) return;
      const line = stdoutBufferRef.current;
      stdoutBufferRef.current = "";
      const frame = parseFrame(line);
      if (frame) {
        nextFrames.push(frame);
      } else {
        appendStdoutLine(line);
      }
    },
    [appendStdoutLine],
  );

  const runReplay = useCallback(
    async (options?: { autoPlay?: boolean; initialFrameIndex?: number }) => {
      const autoPlay = options?.autoPlay ?? false;
      const initialFrameIndex = options?.initialFrameIndex ?? 0;
      setRunning(true);
      setPlaying(false);
      setFrames([]);
      setFrameIndex(0);
      setStdout("");
      setError(null);
      stdoutBufferRef.current = "";

      const nextFrames: ReplayFrame[] = [];

      try {
        const fullCode = [
          getArticleMapPython(),
          "",
          getArticleMarkersPython(),
          "",
          getArticleNeighborsPython(),
          "",
          REPLAY_PRELUDE,
          "",
          codeRef.current,
          "",
          "_result = solve()",
        ].join("\n");

        await pyodideWorkerContext.run(fullCode, {
          onStdoutChunk: (chunk) => {
            processChunk(chunk, nextFrames);
          },
        });

        flushStdout(nextFrames);
        const visibleFrames = addInitialFrame(compressFrames(nextFrames));
        setFrames(visibleFrames);
        setFrameIndex(
          Math.min(initialFrameIndex, Math.max(visibleFrames.length - 1, 0)),
        );
        setPlaying(autoPlay && visibleFrames.length > 1);
        setNeedsRun(false);
      } catch (err) {
        flushStdout(nextFrames);
        const visibleFrames = addInitialFrame(compressFrames(nextFrames));
        setFrames(visibleFrames);
        setFrameIndex(Math.max(visibleFrames.length - 1, 0));
        setError(String(err));
        setNeedsRun(false);
      } finally {
        setRunning(false);
      }
    },
    [flushStdout, processChunk],
  );

  const handleCodeChange = useCallback((value: string) => {
    setCode(value);
    setFrames([]);
    setFrameIndex(0);
    setPlaying(false);
    setStdout("");
    setError(null);
    setNeedsRun(true);
  }, []);

  const speedUp = useCallback(() => {
    setStepDelayMs((current) => clampPlaybackDelay(current - 1));
  }, []);

  const slowDown = useCallback(() => {
    setStepDelayMs((current) => clampPlaybackDelay(current + 1));
  }, []);

  const toggleHoverCoords = useCallback(() => {
    setShowHoverCoords((current) => !current);
  }, []);

  const handleSpeedChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const rawValue = event.target.value;
      if (rawValue.trim() === "") return;
      const nextValue = Number(rawValue);
      if (Number.isNaN(nextValue)) return;
      setStepDelayMs(clampPlaybackDelay(nextValue));
    },
    [],
  );

  const handleRestart = useCallback(async () => {
    if (running) return;
    await runReplay({ autoPlay: false, initialFrameIndex: 0 });
  }, [runReplay, running]);

  const handlePlayPause = useCallback(async () => {
    if (running) return;
    if (playing) {
      setPlaying(false);
      return;
    }
    if (needsRun || frames.length === 0) {
      await runReplay({ autoPlay: true, initialFrameIndex: 0 });
      return;
    }
    if (frameIndex >= frames.length - 1) {
      setFrameIndex(0);
    }
    setPlaying(frames.length > 1);
  }, [frameIndex, frames.length, needsRun, playing, runReplay, running]);

  const handleStep = useCallback(async () => {
    if (running) return;
    setPlaying(false);
    if (needsRun || frames.length === 0) {
      await runReplay({ autoPlay: false, initialFrameIndex: 1 });
      return;
    }
    setFrameIndex((current) =>
      Math.min(current + 1, Math.max(frames.length - 1, 0)),
    );
  }, [frames.length, needsRun, runReplay, running]);

  const handleStepBack = useCallback(() => {
    if (running) return;
    setPlaying(false);
    setFrameIndex((current) => Math.max(current - 1, 0));
  }, [running]);

  const handlersRef = useRef({
    handlePlayPause,
    handleStep,
    handleStepBack,
    handleRestart,
    speedUp,
    slowDown,
    toggleHoverCoords,
  });

  useEffect(() => {
    handlersRef.current = {
      handlePlayPause,
      handleStep,
      handleStepBack,
      handleRestart,
      speedUp,
      slowDown,
      toggleHoverCoords,
    };
  }, [
    handlePlayPause,
    handleStep,
    handleStepBack,
    handleRestart,
    speedUp,
    slowDown,
    toggleHoverCoords,
  ]);

  useEffect(() => {
    const root = viewerRootRef.current;
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
                key: "p",
                label: "Play or pause replay",
                run: () => {
                  void handlersRef.current.handlePlayPause();
                  keepViewerFocus();
                },
              },
              {
                key: "s",
                label: "Step replay",
                run: () => {
                  void handlersRef.current.handleStep();
                  keepViewerFocus();
                },
              },
              {
                key: "arrowright",
                label: "Advance one step",
                run: () => {
                  void handlersRef.current.handleStep();
                  keepViewerFocus();
                },
              },
              {
                key: "arrowleft",
                label: "Go back one step",
                run: () => {
                  handlersRef.current.handleStepBack();
                  keepViewerFocus();
                },
              },
              {
                key: "r",
                label: "Restart replay",
                run: () => {
                  void handlersRef.current.handleRestart();
                  keepViewerFocus();
                },
              },
              {
                key: "c",
                label: "Toggle hover coordinates",
                run: () => {
                  handlersRef.current.toggleHoverCoords();
                  keepViewerFocus();
                },
              },
              {
                key: "arrowup",
                label: "Faster replay",
                run: () => {
                  handlersRef.current.speedUp();
                  keepViewerFocus();
                },
              },
              {
                key: "arrowdown",
                label: "Slower replay",
                run: () => {
                  handlersRef.current.slowDown();
                  keepViewerFocus();
                },
              },
              {
                key: "f",
                label: "Toggle fullscreen",
                run: () => toggleFullscreen(),
              },
              {
                key: "escape",
                label: "Exit replay controls",
                run: () => root.blur(),
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
  }, [keepViewerFocus, vimModeId, vimModeLabel, toggleFullscreen]);

  useEffect(() => {
    if (!playing || frames.length === 0) return;
    if (frameIndex >= frames.length - 1) {
      setPlaying(false);
      return;
    }
    playbackLastTickRef.current = null;

    const tick = (timestamp: number) => {
      if (playbackLastTickRef.current === null) {
        playbackLastTickRef.current = timestamp;
        playbackRafRef.current = window.requestAnimationFrame(tick);
        return;
      }

      const elapsed = timestamp - playbackLastTickRef.current;
      if (elapsed < stepDelayMs) {
        playbackRafRef.current = window.requestAnimationFrame(tick);
        return;
      }

      const stepsToAdvance = Math.max(1, Math.floor(elapsed / stepDelayMs));
      playbackLastTickRef.current = timestamp;
      setFrameIndex((current) => {
        const next = Math.min(
          current + stepsToAdvance,
          Math.max(frames.length - 1, 0),
        );
        if (next >= frames.length - 1) {
          setPlaying(false);
        }
        return next;
      });
      playbackRafRef.current = window.requestAnimationFrame(tick);
    };

    playbackRafRef.current = window.requestAnimationFrame(tick);

    return () => {
      if (playbackRafRef.current !== null) {
        window.cancelAnimationFrame(playbackRafRef.current);
        playbackRafRef.current = null;
      }
      playbackLastTickRef.current = null;
    };
  }, [frameIndex, frames.length, playing, stepDelayMs]);

  const currentFrame = frames[frameIndex] ?? null;
  const visitedKeys = useMemo(() => {
    const keys = new Set<string>();
    if (!currentFrame) return keys;
    for (const cell of currentFrame.visited) {
      keys.add(posKey(cell.r, cell.c));
    }
    return keys;
  }, [currentFrame]);

  return (
    <div ref={rootRef} style={{ ...fullscreenRootStyle(isFullscreen) }}>
      <div
        style={{
          ...fullscreenInnerStyle(isFullscreen, maxWidth),
          margin: "2rem auto",
        }}
      >
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
                  maxHeight: 140,
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
                  marginTop: 8,
                  fontFamily: "monospace",
                  whiteSpace: "pre-wrap",
                  maxHeight: 100,
                  overflowY: "auto",
                }}
              >
                {error}
              </div>
            )}
          </div>

          <div ref={viewerRootRef} tabIndex={0} style={{ outline: "none" }}>
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
              {title}
            </div>

            <div style={{ position: "relative" }}>
              <GoldMineMapViewer
                mapState={mapState}
                pathCells={currentFrame?.path ?? []}
                joinHudBottom
              />
              <GoldMineGridOverlay
                rows={mapState.rows}
                cols={mapState.cols}
                hover={hover}
                onHover={setHover}
                showHoverLabel={showHoverCoords}
                selected={currentFrame?.current ?? null}
                highlightedKeys={visitedKeys}
              />
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateRows: "auto auto",
                gap: 8,
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
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 5,
                  flexWrap: "nowrap",
                }}
              >
                <HudButton
                  onClick={() => {
                    void handlePlayPause();
                    keepViewerFocus();
                  }}
                  minWidth={PLAY_BUTTON_WIDTH_PX}
                  disabled={
                    running || (!needsRun && frames.length === 1 && !playing)
                  }
                  active={playing}
                  title="Play or pause replay [P]"
                >
                  {playing ? (
                    <ShortcutLabel hotkey="P" label="ause" />
                  ) : (
                    <ShortcutLabel hotkey="P" label="lay" />
                  )}
                </HudButton>
                <HudButton
                  onClick={() => {
                    void handleStep();
                    keepViewerFocus();
                  }}
                  disabled={
                    running ||
                    (!needsRun && frames.length === 0) ||
                    (frameIndex >= frames.length - 1 && frames.length > 0)
                  }
                  title="Advance one step [S]"
                >
                  <ShortcutLabel hotkey="S" label="tep" />
                </HudButton>
                <HudButton
                  onClick={() => {
                    void handleRestart();
                    keepViewerFocus();
                  }}
                  disabled={running}
                  title="Restart replay [R]"
                >
                  <ShortcutLabel hotkey="R" label="estart" />
                </HudButton>
                <div
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 3,
                    padding: "2px 3px",
                    border: `1px solid ${HUD_THEME.border}`,
                    borderRadius: 5,
                    background: "rgba(0,0,0,0.14)",
                  }}
                >
                  <span style={{ color: HUD_THEME.muted, fontSize: 10 }}>
                    Speed
                  </span>
                  <SpeedButton
                    onClick={() => {
                      speedUp();
                      keepViewerFocus();
                    }}
                    disabled={stepDelayMs <= MIN_STEP_DELAY_MS}
                    title="Faster replay [ArrowUp]"
                  >
                    ▲
                  </SpeedButton>
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    value={stepDelayMs}
                    onChange={handleSpeedChange}
                    style={{
                      width: 44,
                      padding: "1px 3px",
                      borderRadius: 4,
                      border: `1px solid ${HUD_THEME.border}`,
                      background: "rgba(0,0,0,0.18)",
                      color: HUD_THEME.accent,
                      fontFamily: "monospace",
                      fontSize: 10,
                      fontWeight: 700,
                      textAlign: "right",
                      outline: "none",
                    }}
                  />
                  <span style={{ color: HUD_THEME.muted, fontSize: 9 }}>
                    ms
                  </span>
                  <SpeedButton
                    onClick={() => {
                      slowDown();
                      keepViewerFocus();
                    }}
                    disabled={stepDelayMs >= MAX_STEP_DELAY_MS}
                    title="Slower replay [ArrowDown]"
                  >
                    ▼
                  </SpeedButton>
                </div>
              </div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  flexWrap: "wrap",
                  minHeight: 20,
                }}
              >
                <span style={{ color: HUD_THEME.muted }}>
                  {!engineReady
                    ? "Warming up Python engine..."
                    : needsRun
                      ? "Press Play, Step, or Restart to run the search"
                      : frames.length === 0
                        ? "No frames captured"
                        : `Step ${currentFrame?.step ?? 0}/${frames[frames.length - 1]?.step ?? 0}`}
                </span>
                {currentFrame && (
                  <>
                    <span style={{ color: HUD_THEME.muted }}>Visited</span>
                    <span style={{ color: HUD_THEME.accent, fontWeight: 700 }}>
                      {currentFrame.visited.length}
                    </span>
                    <span style={{ color: HUD_THEME.muted }}>Path</span>
                    <span style={{ color: HUD_THEME.accent, fontWeight: 700 }}>
                      {currentFrame.path.length}
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
