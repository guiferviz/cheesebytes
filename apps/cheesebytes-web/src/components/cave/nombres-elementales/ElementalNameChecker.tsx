import React, { useState, useEffect, useRef, useCallback } from "react";
import pyodideContext from "../../../utils/pyodideContext";
import { CheeseTickIcon, CheeseCrossIcon } from "../../icons/CheeseIcons";

/* ── Python code ──────────────────────────────────────────────────────── */

const PYTHON_SETUP = `
ELEMENTS = set(i.lower() for i in {
    'H','He',
    'Li','Be','B','C','N','O','F','Ne',
    'Na','Mg','Al','Si','P','S','Cl','Ar',
    'K','Ca','Sc','Ti','V','Cr','Mn','Fe','Co','Ni','Cu','Zn',
    'Ga','Ge','As','Se','Br','Kr',
    'Rb','Sr','Y','Zr','Nb','Mo','Tc','Ru','Rh','Pd','Ag','Cd',
    'In','Sn','Sb','Te','I','Xe',
    'Cs','Ba','La','Ce','Pr','Nd','Pm','Sm','Eu','Gd','Tb','Dy',
    'Ho','Er','Tm','Yb','Lu',
    'Hf','Ta','W','Re','Os','Ir','Pt','Au','Hg','Tl','Pb','Bi',
    'Po','At','Rn',
    'Fr','Ra','Ac','Th','Pa','U','Np','Pu','Am','Cm','Bk','Cf',
    'Es','Fm','Md','No','Lr',
    'Rf','Db','Sg','Bh','Hs','Mt','Ds','Rg','Cn','Fl','Lv','Ts','Og'
})

def is_elemental(name: str) -> bool:
    if name == "":
        return True
    name = name.lower()
    if name[:1] in ELEMENTS and is_elemental(name[1:]):
        return True
    if len(name) >= 2 and name[:2] in ELEMENTS and is_elemental(name[2:]):
        return True
    return False

def _is_elemental_memo(name, memo):
    if name in memo:
        return memo[name]
    if name == "":
        return True
    if name[:1] in ELEMENTS and _is_elemental_memo(name[1:], memo):
        memo[name] = True
        return True
    if len(name) >= 2 and name[:2] in ELEMENTS and _is_elemental_memo(name[2:], memo):
        memo[name] = True
        return True
    memo[name] = False
    return False

def is_elemental_memo(name: str) -> bool:
    return _is_elemental_memo(name.lower(), {})
`;

/* ── useDebounce hook ─────────────────────────────────────────────────── */

function useDebounce<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(id);
  }, [value, delayMs]);
  return debounced;
}

/* ── Types ────────────────────────────────────────────────────────────── */

type Status = "idle" | "loading-python" | "running" | "done" | "error";

interface ElementalNameCheckerProps {
  initialValue?: string;
  debounceMs?: number;
  autoRun?: boolean;
  /** Show a toggle to switch between naive and memoized implementations */
  showMemoToggle?: boolean;
}

/* ── Component ────────────────────────────────────────────────────────── */

export const ElementalNameChecker: React.FC<ElementalNameCheckerProps> = ({
  initialValue = "",
  debounceMs = 200,
  autoRun = true,
  showMemoToggle = false,
}) => {
  const [input, setInput] = useState(initialValue);
  const [status, setStatus] = useState<Status>("idle");
  const [result, setResult] = useState<boolean | null>(null);
  const [timeMs, setTimeMs] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pyReady, setPyReady] = useState(false);
  const [memoEnabled, setMemoEnabled] = useState(false);

  const lastRanRef = useRef<string | null>(null);
  const runIdRef = useRef(0);

  const debouncedInput = useDebounce(input, debounceMs);

  /* ── Initialize Pyodide + define Python function ── */
  useEffect(() => {
    let cancelled = false;
    setStatus("loading-python");

    (async () => {
      try {
        await pyodideContext.init();
        await pyodideContext.run(PYTHON_SETUP);
        if (!cancelled) {
          setPyReady(true);
          setStatus("idle");
        }
      } catch (err) {
        if (!cancelled) {
          setError(`Failed to load Python: ${err}`);
          setStatus("error");
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  /* ── Run is_elemental via Pyodide ── */
  const runCheck = useCallback(
    async (name: string) => {
      if (!pyReady) return;

      // Don't re-run for the same input
      if (lastRanRef.current === name) return;
      lastRanRef.current = name;

      const id = ++runIdRef.current;
      setError(null);
      setStatus("running");
      setResult(null);
      setTimeMs(null);

      try {
        // Escape the name for safe embedding in Python
        const escaped = name.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
        const fn = memoEnabled ? "is_elemental_memo" : "is_elemental";

        const t0 = performance.now();
        const pyResult = await pyodideContext.run(`${fn}('${escaped}')`);
        const t1 = performance.now();

        // Only apply if this is still the latest run
        if (id === runIdRef.current) {
          setResult(Boolean(pyResult));
          setTimeMs(Math.round((t1 - t0) * 100) / 100);
          setStatus("done");
        }
      } catch (err) {
        if (id === runIdRef.current) {
          setError(`${err}`);
          setStatus("error");
        }
      }
    },
    [pyReady, memoEnabled],
  );

  /* ── Force re-run when memoEnabled toggles ── */
  useEffect(() => {
    lastRanRef.current = null;
  }, [memoEnabled]);

  /* ── Auto-run on debounced input change ── */
  useEffect(() => {
    if (!autoRun || !pyReady) return;

    if (debouncedInput.trim() === "") {
      lastRanRef.current = null;
      setResult(null);
      setTimeMs(null);
      setStatus("idle");
      return;
    }

    runCheck(debouncedInput.trim());
  }, [debouncedInput, autoRun, pyReady, runCheck]);

  /* ── Handle Enter key (manual run) ── */
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && input.trim() !== "") {
      lastRanRef.current = null; // force re-run
      runCheck(input.trim());
    }
  };

  /* ── Render helpers ── */
  const renderStatus = () => {
    if (status === "loading-python") {
      return (
        <div className="flex items-center gap-3 text-amber-600 dark:text-amber-400 animate-pulse">
          <span className="text-lg">⏳</span>
          <span className="font-mono text-lg">Loading Python…</span>
        </div>
      );
    }

    if (status === "running") {
      return (
        <div className="flex items-center gap-3 text-amber-600 dark:text-amber-400 animate-pulse">
          <span className="text-lg">⏳</span>
          <span className="font-mono text-lg">Running…</span>
        </div>
      );
    }

    if (status === "done" && result !== null) {
      return (
        <div className="flex items-center gap-2">
          {result ? (
            <CheeseTickIcon className="w-8 h-8" />
          ) : (
            <CheeseCrossIcon className="w-8 h-8" />
          )}
          <span
            className={`font-mono text-base font-semibold ${
              result
                ? "text-green-700 dark:text-green-400"
                : "text-red-600 dark:text-red-400"
            }`}
          >
            {result ? "Elemental" : "Not elemental"}
          </span>
        </div>
      );
    }

    if (status === "idle" && input.trim() === "") {
      return (
        <div className="flex items-center gap-3 text-slate-500 dark:text-gray-500">
          <span className="font-mono text-lg">Type a name…</span>
        </div>
      );
    }

    return null;
  };

  return (
    <div className="flex flex-col items-center gap-8 w-full max-w-3xl mx-auto">
      {/* Input */}
      <input
        type="text"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Enter a name…"
        spellCheck={false}
        autoComplete="off"
        className="w-full text-center text-3xl font-mono px-6 py-4 rounded-xl
          bg-white/95 dark:bg-gray-900/60 border-2 border-amber-500/35 dark:border-amber-500/40
          text-slate-900 dark:text-amber-100 placeholder-slate-400 dark:placeholder-gray-600
          outline-none focus:border-amber-500 dark:focus:border-amber-400 focus:shadow-[0_0_20px_rgba(245,158,11,0.12)] dark:focus:shadow-[0_0_20px_rgba(245,158,11,0.15)]
          transition-all duration-200"
      />

      {/* Memo toggle */}
      {showMemoToggle && (
        <button
          onClick={() => setMemoEnabled((v) => !v)}
          className="group flex items-center gap-4 focus:outline-none"
        >
          <span
            className={`inline-block w-14 h-8 rounded-full relative transition-colors duration-200 ${
              memoEnabled
                ? "bg-green-600 dark:bg-green-600"
                : "bg-slate-300 group-hover:bg-slate-400 dark:bg-gray-700/50 dark:group-hover:bg-gray-700"
            }`}
          >
            <span
              className={`absolute top-1 left-1 w-6 h-6 rounded-full bg-white shadow-sm transition-transform duration-200 ${
                memoEnabled ? "translate-x-6" : "translate-x-0"
              }`}
            />
          </span>
          <span
            className={`font-mono text-lg transition-colors duration-200 ${
              memoEnabled
                ? "text-green-700 dark:text-green-400"
                : "text-slate-500 group-hover:text-slate-700 dark:text-gray-500 dark:group-hover:text-gray-400"
            }`}
          >
            memo
          </span>
        </button>
      )}

      {/* Time — the star of the show */}
      {status === "done" && timeMs !== null && (
        <div className="flex flex-col items-center gap-1">
          <span className="font-mono text-7xl font-bold tabular-nums text-amber-600 dark:text-amber-400">
            {timeMs}
            <span className="text-3xl font-normal text-amber-700/70 dark:text-amber-500/70 ml-2">
              ms
            </span>
          </span>
        </div>
      )}

      {/* Result */}
      <div
        className="flex flex-col items-center gap-2"
        style={{ minHeight: 40 }}
      >
        {renderStatus()}
      </div>

      {/* Error area */}
      {error && (
        <div className="w-full px-4 py-2 rounded-lg bg-red-100 border border-red-300 text-red-700 dark:bg-red-900/30 dark:border-red-700/50 dark:text-red-300 text-xs font-mono break-all">
          {error}
        </div>
      )}
    </div>
  );
};

export default ElementalNameChecker;
