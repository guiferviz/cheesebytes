/**
 * VimMode — a global keyboard command system for Cheese Bytes.
 *
 * Architecture:
 *  - Two modes: NORMAL (keys trigger commands) and INSERT (keys type normally).
 *  - Insert mode is auto-detected when an editable element is focused.
 *  - Commands are registered in scoped layers. The global scope is the base;
 *    components can push/pop scopes to add or override commands contextually.
 *  - Pressing `h` opens a command palette listing all active commands.
 *  - Future: modifier keys, key sequences (e.g. `gg`), operator-motion combos.
 *
 * Usage (vanilla JS / Astro <script>):
 *   window.vimMode.register("t", { label: "Toggle theme", run: () => toggleTheme() });
 *
 * Usage (React component on focus):
 *   const scope = window.vimMode.pushScope("gold-mine", [
 *     { key: "z", label: "Zoom player", run: () => toggleZoom() },
 *   ]);
 *   // on blur:
 *   window.vimMode.popScope(scope);
 */

// ── Types ────────────────────────────────────────────────────────────

export interface VimCommand {
  key: string;
  label: string;
  run: () => void;
  /** Optional category for palette grouping */
  category?: string;
  /**
   * If true, the command is shown in the palette but VimMode does NOT
   * intercept the keypress — it lets the event propagate to native handlers.
   * Use this for keys owned by a component's own listener (e.g. WASD in a game)
   * that should still shadow global bindings and appear in the help overlay.
   */
  passthrough?: boolean;
  /** Alternative keys shown as extra badges (display only, not registered). */
  altKeys?: string[];
  /** If true, this command is hidden from the help palette (e.g. easter eggs). */
  hidden?: boolean;
  /** If true, this command is checked even in insert mode (without preventDefault). */
  insertMode?: boolean;
}

export interface VimScope {
  id: string;
  commands: Map<string, VimCommand>;
}

export type VimModeType = "normal" | "insert";

/**
 * A transient scope that auto-clears after a matching key, Escape, or timeout.
 * Used for key sequences (e.g. "cheese") and operator-pending modes (e.g. brush size).
 */
export interface PendingConfig {
  id: string;
  commands: VimCommand[];
  /** Whether parent scope commands remain active (default: true). */
  inherit?: boolean;
  /** Auto-cancel after this many ms of no matching key (0/undefined = no timeout). */
  timeout?: number;
  /** Called when the pending scope is cancelled. */
  onCancel?: () => void;
  /** If true, the pending scope tracks keys even in insert mode (without preventDefault). */
  insertMode?: boolean;
  /** Label shown in mode indicator while this pending scope is active. */
  label?: string;
}

export interface VimModeAPI {
  /** Register a command in the global scope. */
  register(key: string, cmd: Omit<VimCommand, "key">): void;
  /** Unregister a command from the global scope. */
  unregister(key: string): void;
  /** Push a new scope (returns scope id for removal). */
  pushScope(
    id: string,
    commands: Omit<VimCommand, "key">[] & { key: string }[],
  ): string;
  /** Pop a scope by id. */
  popScope(id: string): void;
  /** Push a transient pending scope (auto-clears on match, Escape, or timeout). */
  pushPending(config: PendingConfig): void;
  /** Register a key sequence (e.g. "cheese") that triggers a callback when fully typed. */
  registerSequence(
    word: string,
    config: {
      run: () => void;
      hidden?: boolean;
      insertMode?: boolean;
      timeout?: number;
      label?: string;
      category?: string;
    },
  ): void;
  /** Get all active commands (last scope wins for a given key). */
  activeCommands(): VimCommand[];
  /** Get current mode. */
  mode(): VimModeType;
  /** Show/hide the command palette. */
  togglePalette(): void;
  /** Programmatically close the palette. */
  closePalette(): void;
  /** Destroy the vim mode system. */
  destroy(): void;
}

// ── Editable element detection ───────────────────────────────────────

function isEditable(el: EventTarget | null): boolean {
  if (!(el instanceof HTMLElement)) return false;
  if (el.isContentEditable) return true;
  const tag = el.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT";
}

// ── Palette DOM ──────────────────────────────────────────────────────

function createPalette(): {
  root: HTMLElement;
  list: HTMLElement;
  show: (cmds: VimCommand[]) => void;
  hide: () => void;
  visible: () => boolean;
} {
  const root = document.createElement("div");
  root.id = "vim-palette";
  root.setAttribute("role", "dialog");
  root.setAttribute("aria-label", "Command palette");
  root.style.cssText = `
    position: fixed; top: 0; right: 0; bottom: 0; left: 0;
    z-index: 99999;
    display: none;
    align-items: flex-start;
    justify-content: center;
    padding-top: min(20vh, 120px);
    background: rgba(0,0,0,0.45);
    backdrop-filter: blur(4px);
    font-family: 'JetBrains Mono', 'Fira Code', ui-monospace, monospace;
  `;

  const panel = document.createElement("div");
  panel.style.cssText = `
    background: var(--vim-palette-bg, #1a1a2e);
    color: var(--vim-palette-fg, #e0e0e0);
    border: 1px solid var(--vim-palette-border, #333);
    border-radius: 12px;
    padding: 16px 0;
    min-width: 320px;
    max-width: 480px;
    width: 90vw;
    max-height: 60vh;
    overflow-y: auto;
    box-shadow: 0 8px 32px rgba(0,0,0,0.5);
  `;

  const title = document.createElement("div");
  title.style.cssText = `
    padding: 0 20px 12px;
    font-size: 13px;
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    opacity: 0.5;
    border-bottom: 1px solid var(--vim-palette-border, #333);
    margin-bottom: 8px;
  `;
  title.textContent = "Commands";

  const list = document.createElement("div");
  list.style.cssText = `padding: 0;`;

  panel.appendChild(title);
  panel.appendChild(list);
  root.appendChild(panel);

  // Prevent palette clicks from interfering with other pointer capture systems
  root.addEventListener(
    "pointerdown",
    (e) => {
      e.stopPropagation();
    },
    true,
  );

  // Click backdrop to close
  root.addEventListener("mousedown", (e) => {
    if (e.target === root) hide();
  });

  document.body.appendChild(root);

  let savedFocus: Element | null = null;

  function show(cmds: VimCommand[]) {
    savedFocus = document.activeElement;
    list.innerHTML = "";
    // Group by category
    const grouped = new Map<string, VimCommand[]>();
    for (const cmd of cmds) {
      const cat = cmd.category || "General";
      if (!grouped.has(cat)) grouped.set(cat, []);
      grouped.get(cat)!.push(cmd);
    }

    for (const [cat, items] of grouped) {
      if (grouped.size > 1) {
        const catEl = document.createElement("div");
        catEl.style.cssText = `
          padding: 8px 20px 4px;
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          opacity: 0.4;
        `;
        catEl.textContent = cat;
        list.appendChild(catEl);
      }

      for (const cmd of items) {
        const isPassthrough = !!cmd.passthrough;
        const row = document.createElement("div");
        row.style.cssText = `
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 8px 20px;
          cursor: ${isPassthrough ? "default" : "pointer"};
          transition: background 0.1s;
          ${isPassthrough ? "opacity: 0.6;" : ""}
        `;
        if (!isPassthrough) {
          row.addEventListener("mouseenter", () => {
            row.style.background =
              "var(--vim-palette-hover, rgba(255,255,255,0.06))";
          });
          row.addEventListener("mouseleave", () => {
            row.style.background = "transparent";
          });
          row.addEventListener("click", () => {
            hide();
            cmd.run();
          });
        }

        const keysContainer = document.createElement("span");
        keysContainer.style.cssText = `display: inline-flex; align-items: center; gap: 4px; flex-shrink: 0;`;

        const badgeStyle = `
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-width: 24px;
          height: 24px;
          padding: 0 6px;
          border-radius: 5px;
          font-size: 12px;
          font-weight: 700;
          font-family: inherit;
          background: var(--vim-key-bg, rgba(255,255,255,0.1));
          border: 1px solid var(--vim-key-border, rgba(255,255,255,0.15));
          color: var(--vim-key-fg, #f6bd60);
        `;

        const keyBadge = document.createElement("kbd");
        keyBadge.textContent = cmd.key.toUpperCase();
        keyBadge.style.cssText = badgeStyle;
        keysContainer.appendChild(keyBadge);

        if (cmd.altKeys?.length) {
          for (const alt of cmd.altKeys) {
            const sep = document.createElement("span");
            sep.textContent = "/";
            sep.style.cssText = `font-size: 10px; opacity: 0.4;`;
            keysContainer.appendChild(sep);

            const altBadge = document.createElement("kbd");
            altBadge.textContent = alt;
            altBadge.style.cssText = badgeStyle;
            keysContainer.appendChild(altBadge);
          }
        }

        const label = document.createElement("span");
        label.textContent = cmd.label;
        label.style.cssText = `font-size: 13px; flex: 1;`;

        row.appendChild(keysContainer);
        row.appendChild(label);
        list.appendChild(row);
      }
    }

    root.style.display = "flex";
  }

  function hide() {
    root.style.display = "none";
    if (
      savedFocus &&
      savedFocus instanceof HTMLElement &&
      document.contains(savedFocus)
    ) {
      savedFocus.focus({ preventScroll: true });
    }
    savedFocus = null;
  }

  function visible() {
    return root.style.display !== "none";
  }

  return { root, list, show, hide, visible };
}

// ── Mode indicator ───────────────────────────────────────────────────

function createIndicator(): {
  el: HTMLElement;
  update: (mode: VimModeType) => void;
  destroy: () => void;
} {
  const el = document.createElement("div");
  el.id = "vim-mode-indicator";
  el.style.cssText = `
    position: fixed;
    bottom: 8px;
    right: 8px;
    z-index: 99998;
    padding: 2px 8px;
    border-radius: 4px;
    font-family: 'JetBrains Mono', ui-monospace, monospace;
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    pointer-events: none;
    transition: opacity 0.2s, background 0.2s, color 0.2s;
    opacity: 0.7;
  `;
  document.body.appendChild(el);

  let hideTimer: ReturnType<typeof setTimeout> | null = null;

  function update(mode: VimModeType) {
    if (hideTimer) clearTimeout(hideTimer);
    el.style.opacity = "0.85";
    if (mode === "normal") {
      el.textContent = "NORMAL";
      el.style.background = "var(--vim-ind-normal-bg, #2d6a4f)";
      el.style.color = "var(--vim-ind-normal-fg, #b7e4c7)";
    } else {
      el.textContent = "INSERT";
      el.style.background = "var(--vim-ind-insert-bg, #7b2d26)";
      el.style.color = "var(--vim-ind-insert-fg, #f4a3a0)";
    }
    // Fade out after a bit
    hideTimer = setTimeout(() => {
      el.style.opacity = "0.3";
    }, 1500);
  }

  function destroy() {
    if (hideTimer) clearTimeout(hideTimer);
    el.remove();
  }

  return { el, update, destroy };
}

// ── VimMode singleton ────────────────────────────────────────────────

export function createVimMode(): VimModeAPI {
  const globalScope: VimScope = { id: "__global__", commands: new Map() };
  const scopes: VimScope[] = [globalScope];

  const palette = createPalette();
  const indicator = createIndicator();
  let currentMode: VimModeType = "normal";

  // ── Pending scope state ────────────────────────────────────────

  let activePending: {
    config: PendingConfig;
    scope: VimScope;
    timer: ReturnType<typeof setTimeout> | null;
  } | null = null;

  function cancelPending() {
    if (!activePending) return;
    if (activePending.timer) clearTimeout(activePending.timer);
    const onCancel = activePending.config.onCancel;
    activePending = null;
    onCancel?.();
  }

  function doPushPending(config: PendingConfig) {
    cancelPending();
    const scope: VimScope = {
      id: `__pending_${config.id}__`,
      commands: new Map(
        config.commands.map((c) => [
          c.key.toLowerCase(),
          { ...c, key: c.key.toLowerCase() },
        ]),
      ),
    };
    let timer: ReturnType<typeof setTimeout> | null = null;
    if (config.timeout && config.timeout > 0) {
      timer = setTimeout(() => cancelPending(), config.timeout);
    }
    activePending = { config, scope, timer };
  }

  // ── Helpers ────────────────────────────────────────────────────

  function getMode(): VimModeType {
    return isEditable(document.activeElement) ? "insert" : "normal";
  }

  function syncMode() {
    const m = getMode();
    if (m !== currentMode) {
      currentMode = m;
      indicator.update(m);
    }
  }

  /** Resolve from regular scopes only – used for insert-mode commands. */
  function resolveInsertMode(key: string): VimCommand | undefined {
    for (let i = scopes.length - 1; i >= 0; i--) {
      const cmd = scopes[i].commands.get(key);
      if (cmd?.insertMode) return cmd;
    }
    return undefined;
  }

  // Resolve commands: later scopes override earlier ones.
  function activeCommands(): VimCommand[] {
    const merged = new Map<string, VimCommand>();
    // Include normal scopes (unless non-inherit pending replaces them)
    if (!activePending || activePending.config.inherit !== false) {
      for (const scope of scopes) {
        for (const [key, cmd] of scope.commands) {
          merged.set(key, cmd);
        }
      }
    }
    // Include pending scope if active
    if (activePending) {
      for (const [key, cmd] of activePending.scope.commands) {
        merged.set(key, cmd);
      }
    }
    merged.set("h", {
      key: "h",
      label: "Show / hide this help",
      category: "General",
      run: () => {
        if (palette.visible()) palette.hide();
        else palette.show(activeCommands());
      },
    });
    // Filter out hidden commands from palette display
    return Array.from(merged.values()).filter((c) => !c.hidden);
  }

  function resolve(key: string): VimCommand | undefined {
    // Walk scopes in reverse to find the highest-priority binding
    for (let i = scopes.length - 1; i >= 0; i--) {
      const cmd = scopes[i].commands.get(key);
      if (cmd) return cmd;
    }
    return undefined;
  }

  // ── Key handler ──────────────────────────────────────────────────

  function onKeyDown(e: KeyboardEvent) {
    // Never intercept with modifiers (Ctrl, Meta, Alt) — those are browser/OS shortcuts
    if (e.ctrlKey || e.metaKey || e.altKey) return;

    syncMode();
    const key = e.key.toLowerCase();

    // ── Active pending scope (checked before mode / palette) ──────
    if (activePending) {
      const pending = activePending;

      // In insert mode but pending doesn't support it → cancel, fall through
      if (currentMode === "insert" && !pending.config.insertMode) {
        cancelPending();
      } else {
        const cmd = pending.scope.commands.get(key);
        if (cmd) {
          // Match – execute pending command
          if (pending.timer) clearTimeout(pending.timer);
          if (currentMode !== "insert") {
            e.preventDefault();
            e.stopPropagation();
          }
          activePending = null; // clear before run (run may push new pending)
          cmd.run();
          return;
        }

        // Escape always cancels
        if (key === "escape") {
          cancelPending();
          if (currentMode !== "insert") e.preventDefault();
          return;
        }

        // Non-matching key
        if (pending.config.inherit === false) {
          cancelPending();
          // Fall through so the key is still processed normally
        }
        // inherit (default): pending stays active, fall through
      }
    }

    // ── Insert mode ──────────────────────────────────────────────
    if (currentMode === "insert") {
      // Only process commands marked for insert mode (e.g. sequence starters)
      const cmd = resolveInsertMode(key);
      if (cmd) cmd.run();
      return;
    }

    // ── Palette toggle ───────────────────────────────────────────
    if (key === "h") {
      e.preventDefault();
      e.stopPropagation();
      if (palette.visible()) {
        palette.hide();
      } else {
        palette.show(activeCommands());
      }
      return;
    }

    // Escape closes palette
    if (key === "escape" && palette.visible()) {
      e.preventDefault();
      palette.hide();
      return;
    }

    // If palette is open, pressing a command key fires it and closes
    if (palette.visible()) {
      const cmd = resolve(key);
      if (cmd) {
        e.preventDefault();
        e.stopPropagation();
        palette.hide();
        if (!cmd.passthrough) cmd.run();
        return;
      }
    }

    // Normal command dispatch
    const cmd = resolve(key);
    if (cmd) {
      // Passthrough: shadow global bindings but let native handlers fire
      if (cmd.passthrough) return;
      e.preventDefault();
      e.stopPropagation();
      cmd.run();
    }
  }

  // ── Focus tracking for mode changes ──────────────────────────────

  function onFocusChange() {
    syncMode();
  }

  // ── Theme-aware palette vars ─────────────────────────────────────

  function syncThemeVars() {
    const isDark = document.documentElement.classList.contains("dark");
    const r = document.documentElement.style;
    if (isDark) {
      r.setProperty("--vim-palette-bg", "#1a1a2e");
      r.setProperty("--vim-palette-fg", "#e0e0e0");
      r.setProperty("--vim-palette-border", "#333");
      r.setProperty("--vim-palette-hover", "rgba(255,255,255,0.06)");
      r.setProperty("--vim-key-bg", "rgba(255,255,255,0.1)");
      r.setProperty("--vim-key-border", "rgba(255,255,255,0.15)");
      r.setProperty("--vim-key-fg", "#f6bd60");
      r.setProperty("--vim-ind-normal-bg", "#2d6a4f");
      r.setProperty("--vim-ind-normal-fg", "#b7e4c7");
      r.setProperty("--vim-ind-insert-bg", "#7b2d26");
      r.setProperty("--vim-ind-insert-fg", "#f4a3a0");
    } else {
      r.setProperty("--vim-palette-bg", "#faf8f4");
      r.setProperty("--vim-palette-fg", "#333");
      r.setProperty("--vim-palette-border", "#d4cfc4");
      r.setProperty("--vim-palette-hover", "rgba(0,0,0,0.04)");
      r.setProperty("--vim-key-bg", "rgba(0,0,0,0.06)");
      r.setProperty("--vim-key-border", "rgba(0,0,0,0.12)");
      r.setProperty("--vim-key-fg", "#996515");
      r.setProperty("--vim-ind-normal-bg", "#d4edda");
      r.setProperty("--vim-ind-normal-fg", "#2d6a4f");
      r.setProperty("--vim-ind-insert-bg", "#f8d7da");
      r.setProperty("--vim-ind-insert-fg", "#7b2d26");
    }
  }

  // ── Bootstrap ────────────────────────────────────────────────────

  document.addEventListener("keydown", onKeyDown, true);
  document.addEventListener("focusin", onFocusChange);
  document.addEventListener("focusout", onFocusChange);
  document.addEventListener("themeChanged", syncThemeVars);

  // Observe class changes on <html> for theme
  const themeObs = new MutationObserver(syncThemeVars);
  themeObs.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["class"],
  });

  syncThemeVars();
  syncMode();
  indicator.update(currentMode);

  // ── Public API ───────────────────────────────────────────────────

  const api: VimModeAPI = {
    register(key: string, cmd: Omit<VimCommand, "key">) {
      globalScope.commands.set(key.toLowerCase(), {
        ...cmd,
        key: key.toLowerCase(),
      });
    },

    unregister(key: string) {
      globalScope.commands.delete(key.toLowerCase());
    },

    pushScope(id: string, commands: VimCommand[]) {
      // Remove existing scope with same id if any (idempotent)
      const existingIdx = scopes.findIndex((s) => s.id === id);
      if (existingIdx > 0) scopes.splice(existingIdx, 1);

      const scope: VimScope = {
        id,
        commands: new Map(
          commands.map((c) => [
            c.key.toLowerCase(),
            { ...c, key: c.key.toLowerCase() },
          ]),
        ),
      };
      scopes.push(scope);
      return id;
    },

    popScope(id: string) {
      const idx = scopes.findIndex((s) => s.id === id);
      if (idx > 0) scopes.splice(idx, 1); // Never remove global (idx 0)
    },

    pushPending(config: PendingConfig) {
      doPushPending(config);
    },

    registerSequence(
      word: string,
      config: {
        run: () => void;
        hidden?: boolean;
        insertMode?: boolean;
        timeout?: number;
        label?: string;
        category?: string;
      },
    ) {
      const keys = word.toLowerCase().split("");
      const timeout = config.timeout ?? 400;

      // Build a chain: each key pushes a pending scope for the next key.
      const buildStep = (step: number): (() => void) => {
        if (step === keys.length - 1) return config.run;
        return () => {
          doPushPending({
            id: `seq-${word}-${step + 1}`,
            commands: [
              {
                key: keys[step + 1],
                label: config.label || word,
                run: buildStep(step + 1),
                hidden: true,
                insertMode: config.insertMode,
              },
            ],
            inherit: false,
            timeout,
            insertMode: config.insertMode,
          });
        };
      };

      // Register the first letter as a (hidden) command
      api.register(keys[0], {
        label: config.label || `${word} sequence`,
        category: config.category,
        hidden: config.hidden ?? true,
        insertMode: config.insertMode,
        run: buildStep(0),
      });
    },

    activeCommands,

    mode: () => currentMode,

    togglePalette() {
      if (palette.visible()) palette.hide();
      else palette.show(activeCommands());
    },

    closePalette() {
      palette.hide();
    },

    destroy() {
      document.removeEventListener("keydown", onKeyDown, true);
      document.removeEventListener("focusin", onFocusChange);
      document.removeEventListener("focusout", onFocusChange);
      document.removeEventListener("themeChanged", syncThemeVars);
      themeObs.disconnect();
      palette.root.remove();
      indicator.destroy();
    },
  };

  return api;
}
