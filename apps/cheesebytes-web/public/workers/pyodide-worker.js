/**
 * Pyodide Web Worker
 *
 * Runs Python code in a dedicated thread so the main UI thread is never
 * blocked by long-running computations.
 *
 * Protocol (postMessage):
 *   Incoming  → { type: 'run', id: number, code: string,
 *                  context?: Record<string, unknown>, returnVars?: string[] }
 *   Outgoing  → { type: 'ready' }
 *             | { type: 'stdout_chunk', id: number, chunk: string }  ← streaming
 *             | { type: 'memory',       id: number, heapUsed: number, heapTotal: number }
 *             | { type: 'result', id: number, stdout: string, result: unknown, vars: object }
 *             | { type: 'error',  id: number, error: string }
 *
 * The worker is intended to be used as a singleton (one instance shared across
 * all consumers in the same page) via pyodideWorkerContext.ts.
 */

const PYODIDE_CDN = "https://cdn.jsdelivr.net/pyodide/v0.26.4/full/";

importScripts(`${PYODIDE_CDN}pyodide.js`);

// ── Boot: load Pyodide once, announce readiness ──────────────────────────────

const pyodideReadyPromise = loadPyodide({ indexURL: PYODIDE_CDN })
  .then((py) => {
    // Default to silent stdout/stderr between runs.
    py.setStdout({ batched: () => {} });
    py.setStderr({ batched: () => {} });
    self.postMessage({ type: "ready" });
    return py;
  })
  .catch((err) => {
    self.postMessage({ type: "error", id: -1, error: String(err) });
  });

// ── Helpers ──────────────────────────────────────────────────────────────────

/** 
 * Returns the memory API object.
 * In workers, performance.memory is often undefined even in Chromium.
 * However, Pyodide exposes its WASM memory directly via pyodide._module.HEAP8.length
 * We will use that as our primary memory metric since it represents the actual
 * memory consumed by the Python runtime.
 */
function getWasmMemory(pyodide) {
  if (!pyodide || !pyodide._module || !pyodide._module.HEAP8) return 0;
  return pyodide._module.HEAP8.length;
}

// ── Message handler ──────────────────────────────────────────────────────────

self.onmessage = async (event) => {
  const { type, id, code, context = {}, returnVars = [] } = event.data;
  if (type !== "run") return;

  const pyodide = await pyodideReadyPromise;
  if (!pyodide) {
    // Pyodide failed during boot; the error was already reported via a
    // { type: "error", id: -1 } message. Reject this specific request too.
    self.postMessage({ type: "error", id, error: "Pyodide failed to load" });
    return;
  }

  // Accumulate all output so the final RunResult.stdout is still complete.
  const stdoutChunks = [];

  // Stream every print() / sys.stdout.write() line to the main thread
  // immediately, before the computation finishes.
  pyodide.setStdout({
    batched: (line) => {
      const chunk = line + "\n";
      stdoutChunks.push(chunk);
      self.postMessage({ type: "stdout_chunk", id, chunk });
    },
  });
  pyodide.setStderr({
    batched: (line) => {
      const chunk = line + "\n";
      stdoutChunks.push(chunk);
      self.postMessage({ type: "stdout_chunk", id, chunk });
    },
  });

  // Poll memory.
  // We read the WASM linear memory size directly from Pyodide.
  let memoryInterval = null;
  const sendMemory = () => {
    const wasmMem = getWasmMemory(pyodide);
    // console.log("[Worker] sendMemory ejecutado. WASM Memory:", wasmMem);
    if (wasmMem > 0) {
      self.postMessage({
        type: "memory",
        id,
        heapUsed: wasmMem,
        // WASM memory can grow, but let's set a visual max of 2GB for the bar
        heapTotal: 2 * 1024 * 1024 * 1024, 
      });
    }
  };
  
  // Pre-run snapshot and start polling.
  sendMemory();
  memoryInterval = setInterval(sendMemory, 1000);

  try {
    // Auto-install any packages referenced in the code (e.g. "import numpy").
    await pyodide.loadPackagesFromImports(code);

    // Isolated namespace per execution – prevents state leaking between runs.
    const globals = pyodide.globals.get("dict")();

    // Inject caller-provided JS variables into the Python namespace.
    for (const [key, value] of Object.entries(context)) {
      globals.set(key, pyodide.toPy(value));
    }

    // Run the user's code in the isolated namespace.
    const rawResult = await pyodide.runPythonAsync(code, { globals });

    // Stop memory polling and send a final snapshot.
    if (memoryInterval) clearInterval(memoryInterval);
    sendMemory();

    // Safely convert PyProxy → JS. Primitives pass through unchanged.
    let result = null;
    if (rawResult !== null && rawResult !== undefined) {
      result =
        typeof rawResult.toJs === "function" ? rawResult.toJs() : String(rawResult);
      if (typeof rawResult.destroy === "function") rawResult.destroy();
    }

    // Read back any named variables the caller requested.
    const vars = {};
    for (const name of returnVars) {
      try {
        const proxy = globals.get(name);
        if (proxy !== undefined && proxy !== null) {
          vars[name] = typeof proxy.toJs === "function" ? proxy.toJs() : proxy;
          if (typeof proxy.destroy === "function") proxy.destroy();
        } else {
          vars[name] = null;
        }
      } catch {
        vars[name] = null;
      }
    }

    globals.destroy();

    self.postMessage({
      type: "result",
      id,
      stdout: stdoutChunks.join(""),
      result,
      vars,
    });
  } catch (err) {
    self.postMessage({ type: "error", id, error: err.message ?? String(err) });
  } finally {
    if (memoryInterval) clearInterval(memoryInterval);
    // Silence stdout/stderr between runs so stray output doesn't leak.
    pyodide.setStdout({ batched: () => {} });
    pyodide.setStderr({ batched: () => {} });
  }
};
