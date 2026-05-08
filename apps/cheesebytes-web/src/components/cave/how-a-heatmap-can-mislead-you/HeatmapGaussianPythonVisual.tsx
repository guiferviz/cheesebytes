import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties } from "react";

import type { VimCommand } from "../../../utils/vim-mode";
import pyodideWorkerContext from "../../../utils/pyodideWorkerContext";
import {
  fullscreenInnerStyle,
  fullscreenRootStyle,
  useFullscreen,
} from "../../pathfinding-gold-mine/useFullscreen";

import { HeatmapCanvas } from "./HeatmapCanvas";
import { buildSquareMatrix, matrixToSquareCellValues } from "./heatmap-core";
import {
  useHeatmapArticlePoints,
  useHeatmapPointState,
} from "./heatmap-article";
import { HeatmapHudButton } from "./shared";
import type { Origin } from "./types";
import { useScopedVimMode } from "./useScopedVimMode";

const FONT = "'IosevkaTermSlab Nerd Font Mono', monospace";

const MARKER = "__HEATMAP_JSON__";
const FILTER_ORIGIN: Origin = { x: 10, y: 4 };
const FILTER_CELL_SIZE = 48;
const FILTER_ORIENTATION = 0;
const GAUSSIAN_KERNEL = [
  [1, 2, 1],
  [2, 4, 2],
  [1, 2, 1],
] as const;
const MINIMAL_BUTTON_STYLE = {
  borderRadius: 0,
  border: "1px solid var(--heatmapviz-panel-edge)",
  boxShadow: "none",
} as const;
const INITIAL_CODE = `KERNEL = [
    [1, 2, 1],
    [2, 4, 2],
    [1, 2, 1],
]


def gaussian_filter(grid):
    rows = len(grid)
    cols = len(grid[0]) if rows else 0
    result = [[0.0 for _ in range(cols)] for _ in range(rows)]

    for r in range(rows):
        for c in range(cols):
            acc = 0.0
            weight = 0.0

            for kr in range(-1, 2):
                for kc in range(-1, 2):
                    rr = r + kr
                    cc = c + kc
                    if 0 <= rr < rows and 0 <= cc < cols:
                        w = KERNEL[kr + 1][kc + 1]
                        acc += grid[rr][cc] * w
                        weight += w

            result[r][c] = acc / weight if weight else 0.0

    return result


def solve(grid):
    return gaussian_filter(grid)
`;

function fullscreenCanvasStyle(
  isFullscreen: boolean,
  dimensions: { width: number; height: number },
): CSSProperties | undefined {
  if (!isFullscreen) {
    return undefined;
  }
  const size = "min(40vw, 78vh, 820px)";
  const isLandscape = dimensions.width >= dimensions.height;
  const ratio = isLandscape
    ? dimensions.height / dimensions.width
    : dimensions.width / dimensions.height;

  return {
    width: isLandscape ? size : `calc(${size} * ${ratio.toFixed(4)})`,
    height: isLandscape ? `calc(${size} * ${ratio.toFixed(4)})` : size,
  };
}

function buildPrelude(matrix: number[][]) {
  return [
    "import json",
    `RAW_GRID = ${JSON.stringify(matrix)}`,
    "",
    "def show_state(grid):",
    `    print('${MARKER}' + json.dumps({'grid': grid}))`,
    "",
  ].join("\n");
}

function stripMarkerLines(text: string) {
  return text
    .split(/\r?\n/)
    .filter((line) => !line.startsWith(MARKER))
    .join("\n")
    .trim();
}

function parseMatrixPayload(stdout: string) {
  const markerLine = stdout
    .split(/\r?\n/)
    .find((line) => line.startsWith(MARKER));

  if (!markerLine) {
    throw new Error("Python code did not emit a heatmap frame.");
  }

  const payload = JSON.parse(markerLine.slice(MARKER.length)) as {
    grid?: unknown;
  };

  if (!Array.isArray(payload.grid) || payload.grid.length === 0) {
    throw new Error("Expected a 2D numeric grid from solve(grid).");
  }

  return payload.grid.map((row) => {
    if (!Array.isArray(row)) {
      throw new Error("Expected every row in the result grid to be an array.");
    }
    return row.map((value) => {
      const numericValue = Number(value);
      if (!Number.isFinite(numericValue)) {
        throw new Error("Result grid must contain only finite numbers.");
      }
      return numericValue;
    });
  });
}

function buildGaussianPreviewMatrix(matrix: number[][]) {
  const rows = matrix.length;
  const columns = matrix[0]?.length ?? 0;

  return matrix.map((row, rowIndex) =>
    row.map((_, columnIndex) => {
      let acc = 0;
      let weight = 0;

      for (let kernelRow = -1; kernelRow <= 1; kernelRow += 1) {
        for (let kernelColumn = -1; kernelColumn <= 1; kernelColumn += 1) {
          const sourceRow = rowIndex + kernelRow;
          const sourceColumn = columnIndex + kernelColumn;
          if (
            sourceRow >= 0 &&
            sourceRow < rows &&
            sourceColumn >= 0 &&
            sourceColumn < columns
          ) {
            const kernelWeight =
              GAUSSIAN_KERNEL[kernelRow + 1][kernelColumn + 1];
            acc += matrix[sourceRow][sourceColumn] * kernelWeight;
            weight += kernelWeight;
          }
        }
      }

      return weight ? acc / weight : 0;
    }),
  );
}

function useWorkerStatus() {
  const [status, setStatus] = useState<"loading" | "ready">(() =>
    pyodideWorkerContext.isReady() ? "ready" : "loading",
  );

  useEffect(() => {
    if (pyodideWorkerContext.isReady()) {
      setStatus("ready");
      return;
    }
    const unsubscribe = pyodideWorkerContext.onReady(() => setStatus("ready"));
    return unsubscribe;
  }, []);

  return [status, setStatus] as const;
}

export function HeatmapGaussianPythonVisual() {
  const rootRef = useRef<HTMLDivElement>(null);
  const runVersionRef = useRef(0);
  const { isFullscreen, toggleFullscreen } = useFullscreen(rootRef);
  const [workerStatus, setWorkerStatus] = useWorkerStatus();
  const [runStatus, setRunStatus] = useState<"idle" | "running" | "error">(
    "idle",
  );
  const [code, setCode] = useState(INITIAL_CODE);
  const [stdout, setStdout] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [showPoints, setShowPoints] = useState(true);
  const [origin, setOrigin] = useState(FILTER_ORIGIN);
  const [cellValues, setCellValues] = useState(() => new Map());
  const { canvasWidth, canvasHeight } = useHeatmapPointState();
  const points = useHeatmapArticlePoints();
  const { matrix, range } = useMemo(
    () =>
      buildSquareMatrix(points, {
        gridType: "square",
        cellSize: FILTER_CELL_SIZE,
        orientation: FILTER_ORIENTATION,
        origin,
        canvasSize: canvasWidth,
        canvasWidth,
        canvasHeight,
      }),
    [canvasHeight, canvasWidth, origin, points],
  );

  const runCode = useCallback(
    async (version = runVersionRef.current) => {
      setRunStatus("running");
      setError(null);
      setStdout("");

      let rawStdout = "";

      try {
        const result = await pyodideWorkerContext.run(
          [
            buildPrelude(matrix),
            code,
            "",
            "_heatmap_result = solve(RAW_GRID)",
            "show_state(_heatmap_result)",
          ].join("\n"),
          {
            onStdoutChunk: (chunk) => {
              rawStdout += chunk;
              setStdout(stripMarkerLines(rawStdout));
            },
          },
        );

        const payloadGrid = parseMatrixPayload(result.stdout || rawStdout);
        if (version !== runVersionRef.current) {
          return;
        }
        setCellValues(matrixToSquareCellValues(payloadGrid, range));
        setStdout(stripMarkerLines(result.stdout || rawStdout));
        setRunStatus("idle");
      } catch (runError) {
        if (version !== runVersionRef.current) {
          return;
        }
        const message =
          runError instanceof Error ? runError.message : String(runError);
        if (message === "Aborted") {
          setWorkerStatus("loading");
          setRunStatus("idle");
          setStdout((previous) =>
            previous ? previous + "\n[aborted]" : "[aborted]",
          );
          return;
        }
        setRunStatus("error");
        setError(message);
      }
    },
    [code, matrix, range, setWorkerStatus],
  );

  useEffect(() => {
    const version = (runVersionRef.current += 1);
    const previewMatrix = buildGaussianPreviewMatrix(matrix);
    setCellValues(matrixToSquareCellValues(previewMatrix, range));

    if (workerStatus !== "ready") {
      return;
    }

    const timer = window.setTimeout(() => {
      void runCode(version);
    }, 160);

    return () => window.clearTimeout(timer);
  }, [matrix, range, runCode, workerStatus]);

  const commands = useMemo<VimCommand[]>(
    () => [
      {
        key: "r",
        label: "Run Python",
        run: () => {
          void runCode();
        },
      },
      {
        key: "f",
        label: "Toggle fullscreen",
        run: toggleFullscreen,
      },
      {
        key: "p",
        label: "Toggle point overlay",
        run: () => setShowPoints((current) => !current),
      },
      {
        key: "x",
        label: "Abort current run",
        run: () => {
          void pyodideWorkerContext.abort();
        },
      },
    ],
    [runCode, toggleFullscreen],
  );
  useScopedVimMode({
    rootRef,
    modeId: "heatmap-python-filter",
    label: "Gaussian Filter",
    commands,
  });

  return (
    <div
      ref={rootRef}
      style={{
        ...fullscreenRootStyle(isFullscreen),
        background: "transparent",
        outline: "none",
      }}
    >
      <div style={fullscreenInnerStyle(isFullscreen, 1120)}>
        <div
          style={{
            display: "grid",
            gap: 12,
          }}
        >
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            <HeatmapHudButton
              disabled={workerStatus !== "ready" || runStatus === "running"}
              onClick={() => void runCode()}
              style={MINIMAL_BUTTON_STYLE}
            >
              Run
            </HeatmapHudButton>
            <HeatmapHudButton
              disabled={runStatus !== "running"}
              onClick={() => {
                void pyodideWorkerContext.abort();
              }}
              style={MINIMAL_BUTTON_STYLE}
            >
              Stop
            </HeatmapHudButton>
            <HeatmapHudButton
              onClick={() => setCode(INITIAL_CODE)}
              style={MINIMAL_BUTTON_STYLE}
            >
              Reset code
            </HeatmapHudButton>
            <HeatmapHudButton
              onClick={() => setShowPoints((current) => !current)}
              style={MINIMAL_BUTTON_STYLE}
            >
              {showPoints ? "Hide points" : "Show points"}
            </HeatmapHudButton>
          </div>

          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 18,
              alignItems: "start",
            }}
          >
            <div
              style={{
                flex: "1 1 430px",
                minWidth: 320,
                display: "grid",
                gap: 10,
              }}
            >
              <div
                style={{
                  overflow: "hidden",
                  border: "1px solid var(--heatmapviz-panel-edge)",
                  background: "var(--heatmapviz-code-bg)",
                }}
              >
                <textarea
                  value={code}
                  onChange={(event) => setCode(event.target.value)}
                  spellCheck={false}
                  aria-label="Python code editor"
                  style={{
                    display: "block",
                    width: "100%",
                    minHeight: isFullscreen ? "min(72vh, 760px)" : 420,
                    padding: "16px 18px",
                    border: "none",
                    outline: "none",
                    resize: "vertical",
                    background: "transparent",
                    color: "#f8fafc",
                    fontFamily: FONT,
                    fontSize: "0.92rem",
                    lineHeight: 1.55,
                    whiteSpace: "pre",
                    tabSize: 4,
                  }}
                />
              </div>
            </div>

            <div
              style={{
                flex: "1 1 360px",
                minWidth: 320,
                display: "grid",
                gap: 12,
                justifyItems: "center",
              }}
            >
              <HeatmapCanvas
                points={points}
                canvasWidth={canvasWidth}
                canvasHeight={canvasHeight}
                gridType="square"
                cellSize={FILTER_CELL_SIZE}
                orientation={FILTER_ORIENTATION}
                origin={origin}
                interactive={true}
                showAggregation={true}
                showBackdrop={false}
                showBorder={false}
                showOrigin={false}
                showPoints={showPoints}
                cellValues={cellValues}
                onOriginChange={setOrigin}
                style={fullscreenCanvasStyle(isFullscreen, {
                  width: canvasWidth,
                  height: canvasHeight,
                })}
              />

              {(stdout || error) && (
                <div
                  style={{
                    width: "100%",
                    padding: 12,
                    background: error
                      ? "rgba(214, 70, 62, 0.14)"
                      : "rgba(255,255,255,0.24)",
                    border: "1px solid var(--heatmapviz-panel-edge)",
                    fontFamily: FONT,
                    fontSize: "0.85rem",
                    whiteSpace: "pre-wrap",
                    color: "var(--heatmapviz-ink)",
                  }}
                >
                  {error ?? stdout}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
