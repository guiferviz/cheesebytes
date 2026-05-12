/**
 * pyodideWorkerContext.ts
 *
 * A singleton that owns exactly one Pyodide web worker for the current page
 * and exposes a clean Promise-based API to all consumers.
 *
 * Why a singleton?
 *   Pyodide is ~30 MB. Spinning up one instance per component would be
 *   wasteful. Every component that imports this module shares the same worker.
 *
 * Usage:
 *   import pyodideWorkerContext from '../utils/pyodideWorkerContext'
 *
 *   const { stdout, result } = await pyodideWorkerContext.run(`
 *     print("hello from a worker!")
 *   `)
 */

export type RunResult = {
  stdout: string;
  /** Serialised return value of the last expression, or null */
  result: unknown;
  /**
   * Named Python variables explicitly requested via `RunOptions.returnVars`.
   * Keys are the variable names; values are their JS-converted values.
   */
  vars: Record<string, unknown>;
};

export type MemoryStats = {
  /** Bytes currently used in the JS heap (Chromium only). */
  heapUsed: number;
  /** Maximum JS heap size reported by the browser (Chromium only). */
  heapTotal: number;
};

export type RunOptions = {
  /**
   * JS object whose entries are injected as Python globals before the run.
   * Values must be JSON-serialisable.
   */
  context?: Record<string, unknown>;
  /**
   * Python variable names to read back from the worker namespace after
   * execution. Their values are returned in `RunResult.vars`.
   */
  returnVars?: string[];
  /**
   * Called for every line that the Python code prints to stdout/stderr,
   * before the overall run completes. Useful for streaming long output.
   */
  onStdoutChunk?: (chunk: string) => void;
  /**
   * Called ~every 300 ms with the worker's current JS heap usage
   * (Chromium only; never called on other browsers).
   */
  onMemoryStats?: (stats: MemoryStats) => void;
};

type WorkerStatus = "idle" | "loading" | "ready" | "error";

type PendingRequest = {
  resolve: (value: RunResult) => void;
  reject: (reason: Error) => void;
  onStdoutChunk?: (chunk: string) => void;
  onMemoryStats?: (stats: MemoryStats) => void;
};

type ReadyListener = () => void;

// ── Internal state (module-level singleton) ──────────────────────────────────

let worker: Worker | null = null;
let status: WorkerStatus = "idle";
let nextId = 1;
let runQueue: Promise<unknown> = Promise.resolve();

const pending = new Map<number, PendingRequest>();
const readyListeners = new Set<ReadyListener>();

// ── Worker bootstrap ─────────────────────────────────────────────────────────

function ensureWorker(): Worker {
  if (worker) return worker;

  status = "loading";

  worker = new Worker("/workers/pyodide-worker.js");

  worker.onmessage = (event: MessageEvent) => {
    const {
      type,
      id,
      stdout,
      result,
      error,
      vars,
      chunk,
      heapUsed,
      heapTotal,
    } = event.data;

    if (type === "ready") {
      status = "ready";
      readyListeners.forEach((cb) => cb());
      readyListeners.clear();
      return;
    }

    const req = pending.get(id);
    if (!req) return;

    // Streaming messages — notify caller but keep the request alive.
    if (type === "stdout_chunk") {
      req.onStdoutChunk?.(chunk);
      return;
    }
    if (type === "memory") {
      req.onMemoryStats?.({ heapUsed, heapTotal });
      return;
    }

    // Terminal messages — settle the promise and clean up.
    pending.delete(id);
    if (type === "result") {
      req.resolve({
        stdout: stdout ?? "",
        result: result ?? null,
        vars: vars ?? {},
      });
    } else if (type === "error") {
      req.reject(new Error(error ?? "Unknown worker error"));
    }
  };

  worker.onerror = (event: ErrorEvent) => {
    status = "error";
    // Reject every in-flight request.
    const err = new Error(`Worker crashed: ${event.message}`);
    pending.forEach(({ reject }) => reject(err));
    pending.clear();
    worker = null; // allow re-creation on next call
  };

  return worker;
}

// ── Public API ───────────────────────────────────────────────────────────────

/**
 * Execute Python `code` in the worker thread.
 *
 * @param code    - Python source to execute.
 * @param options - Optional `RunOptions` controlling context injection,
 *                  variable retrieval, and streaming callbacks.
 */
function runImmediately(
  code: string,
  options: RunOptions = {},
): Promise<RunResult> {
  const {
    context = {},
    returnVars = [],
    onStdoutChunk,
    onMemoryStats,
  } = options;
  const w = ensureWorker();
  const id = nextId++;

  return new Promise<RunResult>((resolve, reject) => {
    pending.set(id, { resolve, reject, onStdoutChunk, onMemoryStats });
    w.postMessage({ type: "run", id, code, context, returnVars });
  });
}

function run(code: string, options: RunOptions = {}): Promise<RunResult> {
  const queuedRun = runQueue.then(() => runImmediately(code, options));
  runQueue = queuedRun.catch(() => {});
  return queuedRun;
}

/**
 * Register a one-shot callback that fires when the worker's Pyodide instance
 * has finished loading and is ready to accept `run()` calls.
 * If Pyodide is already ready the callback is invoked synchronously.
 *
 * @returns Unsubscribe function.
 */
function onReady(cb: ReadyListener): () => void {
  if (status === "ready") {
    cb();
    return () => {};
  }
  ensureWorker(); // trigger loading if not started yet
  readyListeners.add(cb);
  return () => readyListeners.delete(cb);
}

/** True once the worker's Pyodide instance is loaded and accepting requests. */
function isReady(): boolean {
  return status === "ready";
}

/** Current loading status: 'idle' | 'loading' | 'ready' | 'error' */
function getStatus(): WorkerStatus {
  return status;
}

/**
 * Tear down the worker. Useful during hot-reload in development.
 * Any in-flight requests will be rejected.
 */
function dispose(): void {
  if (worker) {
    const err = new Error("Worker disposed");
    pending.forEach(({ reject }) => reject(err));
    pending.clear();
    worker.terminate();
    worker = null;
    status = "idle";
    runQueue = Promise.resolve();
  }
}

/**
 * Abort the current execution by terminating the worker and spawning a
 * fresh one.  All in-flight requests are rejected with an "Aborted" error.
 *
 * Because synchronous WASM blocks the worker's event loop, there is no
 * way to send a polite "stop" message — the only option is to kill the
 * process and start over.  The new worker will begin loading Pyodide
 * immediately, so subsequent `run()` calls are queued until it's ready.
 *
 * @returns A Promise that resolves once the replacement worker is ready.
 */
function abort(): Promise<void> {
  // 1. Kill the old worker and reject pending promises.
  if (worker) {
    const err = new Error("Aborted");
    pending.forEach(({ reject }) => reject(err));
    pending.clear();
    worker.terminate();
    worker = null;
    status = "idle";
    runQueue = Promise.resolve();
  }

  // 2. Spin up a fresh worker and wait for it to report "ready".
  return new Promise<void>((resolve) => {
    onReady(() => resolve());
  });
}

// ── Named export ─────────────────────────────────────────────────────────────

const pyodideWorkerContext = {
  run,
  onReady,
  isReady,
  getStatus,
  dispose,
  abort,
} as const;

export default pyodideWorkerContext;
