/**
 * VimMode — a modal keyboard command system for Cheese Bytes.
 *
 * Architecture:
 *  - Named modes: "normal" (default), "insert" (auto), "iframe" (auto), custom (manual).
 *  - Modes form an inheritance chain: e.g. "game" extends "normal".
 *  - Auto-detected passive modes: insert (editable focused), iframe (iframe focused).
 *  - Manual modes are pushed/popped by components (e.g. game mode on focus).
 *  - Pressing `?` opens a multi-column palette showing the mode chain.
 *  - Pending key sequences (e.g. "cheese") show trail in the indicator.
 *
 * Usage (vanilla JS / Astro <script>):
 *   window.vimMode.register("t", { label: "Toggle theme", run: () => toggleTheme() });
 *
 * Usage (React component on focus):
 *   window.vimMode.pushMode("game", {
 *     label: "Game",
 *     extends: "normal",
 *     commands: [{ key: "z", label: "Zoom player", run: () => toggleZoom() }],
 *   });
 *   // on blur:
 *   window.vimMode.popMode("game");
 */

// ── Types ────────────────────────────────────────────────────────────

export interface VimCommand {
  key: string;
  label: string;
  run: () => void;
  /** Optional category (legacy, not used for palette grouping). */
  category?: string;
  /**
   * If true, the command is shown in the palette but VimMode does NOT
   * intercept the keypress — it lets the event propagate to native handlers.
   */
  passthrough?: boolean;
  /** Alternative keys shown as extra badges (display only, not registered). */
  altKeys?: string[];
  /** If true, hidden from the help palette (e.g. easter eggs). */
  hidden?: boolean;
  /** If true, checked even in passive modes (without preventDefault). */
  insertMode?: boolean;
}

export interface VimModeConfig {
  /** Display label for palette column header and indicator. */
  label: string;
  /** Parent mode to inherit commands from (e.g. "normal"). */
  extends?: string;
  /** Commands defined in this mode. */
  commands: VimCommand[];
  /** If true, keys pass through without interception (like insert mode). */
  passive?: boolean;
}

/**
 * A transient scope that auto-clears after a matching key, Escape, or timeout.
 */
export interface PendingConfig {
  id: string;
  commands: VimCommand[];
  /** Whether parent commands remain active (default: true). */
  inherit?: boolean;
  /** Auto-cancel after this many ms (0/undefined = no timeout). */
  timeout?: number;
  /** Called when cancelled. */
  onCancel?: () => void;
  /** If true, tracks keys even in passive modes (without preventDefault). */
  insertMode?: boolean;
  /** Label shown in indicator while active. */
  label?: string;
  /** Optional trail shown in the indicator instead of appending to the prior trail. */
  trail?: string;
}

export interface VimModeAPI {
  /** Register a command in the normal mode. */
  register(key: string, cmd: Omit<VimCommand, "key">, modeId?: string): void;
  /** Unregister a command from the normal mode. */
  unregister(key: string, modeId?: string): void;
  /** Register + activate a named mode. */
  pushMode(id: string, config: VimModeConfig): void;
  /** Deactivate a named mode. */
  popMode(id: string): void;
  /** Push a transient pending scope (auto-clears on match/Escape/timeout). */
  pushPending(config: PendingConfig): void;
  /** Cancel any active pending scope. */
  cancelPending(): void;
  /** Register a key sequence (e.g. "cheese") that triggers a callback. */
  registerSequence(
    word: string,
    config: {
      run: () => void;
      hidden?: boolean;
      insertMode?: boolean;
      timeout?: number;
      label?: string;
      category?: string;
      modes?: string[];
    },
  ): void;
  /** All active (non-hidden) commands across the mode chain. */
  activeCommands(): VimCommand[];
  /** Current effective mode id. */
  mode(): string;
  /** Show/hide the command palette. */
  togglePalette(): void;
  /** Programmatically close the palette. */
  closePalette(): void;
  /** Destroy the vim mode system. */
  destroy(): void;
}

// ── Helpers ──────────────────────────────────────────────────────────

function isEditable(el: EventTarget | null): boolean {
  if (!(el instanceof HTMLElement)) return false;
  if (el.isContentEditable) return true;
  const tag = el.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT";
}

function isIframe(el: Element | null): boolean {
  return el instanceof HTMLIFrameElement;
}

function isModifierOnlyKey(key: string): boolean {
  return (
    key === "shift" ||
    key === "control" ||
    key === "alt" ||
    key === "meta" ||
    key === "capslock"
  );
}

// ── Palette (multi-column) ───────────────────────────────────────────

interface PaletteColumn {
  label: string;
  commands: VimCommand[];
  /** Keys in this column that are overridden by a child mode. */
  overriddenKeys?: Set<string>;
  /** Pending columns are temporary follow-up input, not real modes. */
  kind?: "mode" | "pending";
}

function keyboardEventInitFor(key: string): KeyboardEventInit | null {
  const lower = key.toLowerCase();
  if (/^[a-z]$/.test(lower)) {
    const upper = lower.toUpperCase();
    const code = `Key${upper}`;
    const keyCode = upper.charCodeAt(0);
    return {
      key: lower,
      code,
      keyCode,
      which: keyCode,
      bubbles: true,
      cancelable: true,
      composed: true,
    };
  }
  if (
    lower === "arrowup" ||
    lower === "arrowdown" ||
    lower === "arrowleft" ||
    lower === "arrowright"
  ) {
    const keyCodeMap: Record<string, number> = {
      arrowup: 38,
      arrowdown: 40,
      arrowleft: 37,
      arrowright: 39,
    };
    return {
      key: lower.replace(/^arrow/, "Arrow"),
      code: lower.replace(/^arrow/, "Arrow"),
      keyCode: keyCodeMap[lower],
      which: keyCodeMap[lower],
      bubbles: true,
      cancelable: true,
      composed: true,
    };
  }
  return null;
}

function createPalette(): {
  root: HTMLElement;
  show: (columns: PaletteColumn[]) => void;
  hide: () => void;
  visible: () => boolean;
  destroy: () => void;
} {
  const root = document.createElement("div");
  root.id = "vim-palette";
  root.setAttribute("role", "dialog");
  root.setAttribute("aria-label", "Command palette");
  root.style.cssText = `
    position: fixed; inset: 0;
    z-index: 99999;
    display: none;
    align-items: flex-start;
    justify-content: center;
    padding-top: min(18vh, 110px);
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
    padding: 14px;
    max-height: 60vh;
    overflow-y: auto;
    box-shadow: 0 8px 32px rgba(0,0,0,0.5);
  `;

  root.appendChild(panel);

  const onWindowPointerDownCapture = (e: PointerEvent) => {
    const target = e.target;
    if (!(target instanceof Node)) return;
    if (!root.contains(target)) return;
    // Shield palette interactions from all lower capture handlers.
    e.stopPropagation();
    e.stopImmediatePropagation();
  };

  window.addEventListener("pointerdown", onWindowPointerDownCapture, true);

  root.addEventListener("pointerdown", (e) => e.stopPropagation(), true);
  root.addEventListener("mousedown", (e) => {
    e.preventDefault();
    if (e.target === root) hide();
  });

  document.body.appendChild(root);

  let savedFocus: Element | null = null;

  const badgeCSS = `
    display: inline-flex; align-items: center; justify-content: center;
    min-width: 20px; height: 20px; padding: 0 4px;
    border-radius: 4px; font-size: 11px; font-weight: 700;
    background: var(--vim-key-bg, rgba(255,255,255,0.1));
    border: 1px solid var(--vim-key-border, rgba(255,255,255,0.15));
    color: var(--vim-key-fg, #f6bd60);
  `;

  function renderRow(
    cmd: VimCommand,
    overridden: boolean,
    savedFocusRef: { value: Element | null },
  ): HTMLElement {
    const isPass = !!cmd.passthrough;
    const keyEventInit = isPass ? keyboardEventInitFor(cmd.key) : null;
    const canSimulate = !!keyEventInit;
    const dimmed = overridden && !isPass;
    const row = document.createElement("div");
    row.style.cssText = `
      display: flex; align-items: center; gap: 8px;
      padding: 3px 6px; border-radius: 4px;
      cursor: ${!isPass || canSimulate ? "pointer" : "default"};
      transition: background 0.1s;
      ${dimmed ? "opacity: 0.55;" : ""}
    `;
    row.addEventListener("mouseenter", () => {
      row.style.background = "var(--vim-palette-hover, rgba(255,255,255,0.06))";
    });
    row.addEventListener("mouseleave", () => {
      row.style.background = "transparent";
    });
    row.addEventListener("click", () => {
      if (cmd.key === "?") {
        cmd.run();
        return;
      }
      hide();
      if (isPass) {
        if (!keyEventInit) return;
        if (
          savedFocusRef.value instanceof HTMLElement &&
          document.contains(savedFocusRef.value)
        ) {
          savedFocusRef.value.focus({ preventScroll: true });
        }
        // Dispatch on document because the game listens there in capture mode.
        document.dispatchEvent(new KeyboardEvent("keydown", keyEventInit));
        document.dispatchEvent(new KeyboardEvent("keyup", keyEventInit));
      } else {
        cmd.run();
      }
    });

    const badges = document.createElement("span");
    badges.style.cssText =
      "display: inline-flex; align-items: center; gap: 3px; flex-shrink: 0;";

    const kbd = document.createElement("kbd");
    kbd.textContent = cmd.key.toUpperCase();
    kbd.style.cssText = badgeCSS;
    badges.appendChild(kbd);

    if (cmd.altKeys?.length) {
      for (const alt of cmd.altKeys) {
        const sep = document.createElement("span");
        sep.textContent = "/";
        sep.style.cssText = "font-size: 9px; opacity: 0.35;";
        badges.appendChild(sep);
        const ak = document.createElement("kbd");
        ak.textContent = alt;
        ak.style.cssText = badgeCSS;
        badges.appendChild(ak);
      }
    }

    const lbl = document.createElement("span");
    lbl.textContent = cmd.label;
    lbl.style.cssText = `font-size: 11px; flex: 1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;${
      overridden && !isPass ? " opacity: 0.6;" : ""
    }`;

    row.appendChild(badges);
    row.appendChild(lbl);
    return row;
  }

  function show(columns: PaletteColumn[]) {
    savedFocus = document.activeElement;
    const savedFocusRef = { value: savedFocus };
    panel.innerHTML = "";

    // Auto-size panel width based on column count
    const colCount = columns.length;
    panel.style.maxWidth = `min(90vw, ${Math.max(280, colCount * 260)}px)`;
    panel.style.minWidth = `${Math.min(280, colCount * 260)}px`;

    const grid = document.createElement("div");
    grid.style.cssText = `
      display: grid;
      grid-template-columns: repeat(${colCount}, 1fr);
      gap: 14px;
    `;

    for (const col of columns) {
      const colEl = document.createElement("div");
      if (col.kind === "pending") {
        colEl.style.cssText = `
          padding: 8px;
          border-radius: 10px;
          border: 1px dashed var(--vim-pending-border, rgba(246,189,96,0.45));
          background: var(--vim-pending-bg, rgba(246,189,96,0.08));
          box-shadow: inset 0 0 0 1px rgba(246,189,96,0.06);
        `;
      }

      const header = document.createElement("div");
      header.textContent = col.label.toUpperCase();
      header.style.cssText = `
        font-size: 10px; font-weight: 800;
        letter-spacing: 0.1em;
        opacity: ${col.kind === "pending" ? "0.9" : "0.4"};
        padding: 0 6px 5px;
        border-bottom: 1px ${col.kind === "pending" ? "dashed var(--vim-pending-border, rgba(246,189,96,0.45))" : "solid var(--vim-palette-border, #333)"};
        margin-bottom: 4px;
        color: ${col.kind === "pending" ? "var(--vim-pending-fg, #f6bd60)" : "inherit"};
      `;
      if (col.kind === "pending") {
        const badge = document.createElement("span");
        badge.textContent = "TEMP";
        badge.style.cssText = `
          margin-left: 6px;
          padding: 1px 5px;
          border-radius: 999px;
          border: 1px solid var(--vim-pending-border, rgba(246,189,96,0.45));
          background: rgba(246,189,96,0.14);
          color: var(--vim-pending-fg, #f6bd60);
          font-size: 9px;
          letter-spacing: 0.08em;
          vertical-align: middle;
        `;
        header.appendChild(badge);
      }
      colEl.appendChild(header);

      for (const cmd of col.commands) {
        const isOverridden =
          col.overriddenKeys?.has(cmd.key.toLowerCase()) ?? false;
        colEl.appendChild(renderRow(cmd, isOverridden, savedFocusRef));
      }

      grid.appendChild(colEl);
    }

    panel.appendChild(grid);
    root.style.display = "flex";
  }

  function hide() {
    root.style.display = "none";
    if (savedFocus instanceof HTMLElement && document.contains(savedFocus)) {
      savedFocus.focus({ preventScroll: true });
    }
    savedFocus = null;
  }

  function visible() {
    return root.style.display !== "none";
  }

  function destroy() {
    window.removeEventListener("pointerdown", onWindowPointerDownCapture, true);
    root.remove();
  }

  return { root, show, hide, visible, destroy };
}

// ── Mode indicator ───────────────────────────────────────────────────

function createIndicator(onClickFn: () => void): {
  el: HTMLElement;
  update: (
    label: string,
    pending: string,
    passive: boolean,
    modeId: string,
  ) => void;
  destroy: () => void;
} {
  const el = document.createElement("div");
  el.id = "vim-mode-indicator";
  el.style.cssText = `
    position: fixed; bottom: 8px; right: 8px;
    z-index: 99998;
    padding: 2px 8px;
    border-radius: 4px;
    font-family: 'JetBrains Mono', ui-monospace, monospace;
    font-size: 10px; font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    pointer-events: auto;
    cursor: pointer;
    transition: opacity 0.2s, background 0.2s, color 0.2s;
    opacity: 0.7;
  `;
  el.addEventListener("mousedown", (e) => {
    e.preventDefault();
    e.stopPropagation();
    onClickFn();
  });
  document.body.appendChild(el);

  let hideTimer: ReturnType<typeof setTimeout> | null = null;

  function update(
    label: string,
    pending: string,
    passive: boolean,
    modeId: string,
  ) {
    if (hideTimer) clearTimeout(hideTimer);
    el.style.opacity = "0.85";

    if (pending) {
      el.innerHTML =
        label +
        ' <span style="opacity:0.45">\u00b7</span> ' +
        '<span style="opacity:0.7;letter-spacing:0.12em">' +
        pending +
        "</span>";
    } else {
      el.textContent = label;
    }

    if (passive) {
      el.style.background = "var(--vim-ind-insert-bg, #7b2d26)";
      el.style.color = "var(--vim-ind-insert-fg, #f4a3a0)";
    } else {
      el.style.background = "var(--vim-ind-normal-bg, #2d6a4f)";
      el.style.color = "var(--vim-ind-normal-fg, #b7e4c7)";
    }

    // Tooltip
    if (modeId === "insert") {
      el.title = `Keyboard mode: ${label}.\nPress Escape to return to normal mode.`;
    } else if (modeId === "iframe") {
      el.title = `Keyboard mode: ${label}.\nClick here or anywhere else on the page to switch to normal mode.`;
    } else {
      el.title = `Keyboard mode: ${label}.\nPress ? or click here to see the command list.`;
    }

    hideTimer = setTimeout(
      () => {
        el.style.opacity = pending ? "0.65" : "0.3";
      },
      pending ? 2000 : 1000,
    );
  }

  function destroy() {
    if (hideTimer) clearTimeout(hideTimer);
    el.remove();
  }

  return { el, update, destroy };
}

// ── VimMode singleton ────────────────────────────────────────────────

export function createVimMode(): VimModeAPI {
  // ── Mode registry ────────────────────────────────────────────────

  interface ModeEntry {
    id: string;
    label: string;
    extends?: string;
    commands: Map<string, VimCommand>;
    passive: boolean;
  }

  const modes = new Map<string, ModeEntry>();

  // Built-in modes
  modes.set("normal", {
    id: "normal",
    label: "Normal",
    commands: new Map(),
    passive: false,
  });
  modes.set("insert", {
    id: "insert",
    label: "Insert",
    commands: new Map(),
    passive: true,
  });
  modes.set("iframe", {
    id: "iframe",
    label: "Iframe",
    commands: new Map(),
    passive: true,
  });

  // Manually activated mode stack
  const modeStack: string[] = [];

  const palette = createPalette();
  const indicator = createIndicator(() => {
    const entry = getEntry(effectiveMode());
    if (!entry.passive) api.togglePalette();
  });

  // ── Pending state ────────────────────────────────────────────────

  let activePending: {
    config: PendingConfig;
    scope: Map<string, VimCommand>;
    timer: ReturnType<typeof setTimeout> | null;
  } | null = null;

  let pendingTrail = "";

  function cancelPending() {
    if (!activePending) return;
    if (activePending.timer) clearTimeout(activePending.timer);
    const onCancel = activePending.config.onCancel;
    activePending = null;
    pendingTrail = "";
    onCancel?.();
  }

  function doPushPending(config: PendingConfig) {
    // Clear previous timer but preserve trail (we might be chaining steps)
    if (activePending?.timer) clearTimeout(activePending.timer);
    if (typeof config.trail === "string") {
      pendingTrail = config.trail;
    }

    const scope = new Map(
      config.commands.map((c) => [
        c.key.toLowerCase(),
        { ...c, key: c.key.toLowerCase() },
      ]),
    );
    let timer: ReturnType<typeof setTimeout> | null = null;
    if (config.timeout && config.timeout > 0) {
      timer = setTimeout(() => {
        cancelPending();
        syncIndicator();
      }, config.timeout);
    }
    activePending = { config, scope, timer };
  }

  // ── Mode helpers ─────────────────────────────────────────────────

  function autoMode(): string {
    const active = document.activeElement;
    if (isEditable(active)) return "insert";
    if (isIframe(active)) return "iframe";
    return "normal";
  }

  function effectiveMode(): string {
    const auto = autoMode();
    // Passive auto-modes always win
    if (auto === "insert" || auto === "iframe") return auto;
    // Manual mode stack
    if (modeStack.length > 0) return modeStack[modeStack.length - 1];
    return "normal";
  }

  function getEntry(id: string): ModeEntry {
    return modes.get(id) || modes.get("normal")!;
  }

  /** Walk extends chain → [root, ..., leaf] */
  function modeChain(modeId: string): ModeEntry[] {
    const chain: ModeEntry[] = [];
    const visited = new Set<string>();
    let cur: string | undefined = modeId;
    while (cur && !visited.has(cur)) {
      visited.add(cur);
      const m = modes.get(cur);
      if (!m) break;
      chain.unshift(m);
      cur = m.extends;
    }
    return chain;
  }

  /** Resolve a key through the mode chain (leaf wins). */
  function resolveKey(key: string): VimCommand | undefined {
    const chain = modeChain(effectiveMode());
    // Walk from leaf to root (last entry = leaf)
    for (let i = chain.length - 1; i >= 0; i--) {
      const cmd = chain[i].commands.get(key);
      if (cmd) return cmd;
    }
    return undefined;
  }

  /** Resolve insert-mode commands (checked in passive modes). */
  function resolveInsert(key: string): VimCommand | undefined {
    const chain = modeChain(effectiveMode());
    for (let i = chain.length - 1; i >= 0; i--) {
      const cmd = chain[i].commands.get(key);
      if (cmd?.insertMode) return cmd;
    }
    return undefined;
  }

  /** Build palette columns for current mode. */
  function paletteColumns(): PaletteColumn[] {
    const mode = effectiveMode();
    const entry = modes.get(mode);
    if (!entry || entry.passive) return [];

    const chain = modeChain(mode);
    const nonPassive = chain.filter((m) => !m.passive);

    // Collect all keys defined in child modes to mark parent overrides
    const childKeys = new Map<string, Set<string>>();
    for (let i = 0; i < nonPassive.length; i++) {
      const overridden = new Set<string>();
      for (let j = i + 1; j < nonPassive.length; j++) {
        for (const k of nonPassive[j].commands.keys()) {
          overridden.add(k);
        }
      }
      childKeys.set(nonPassive[i].id, overridden);
    }

    const columns: PaletteColumn[] = [];
    for (const m of nonPassive) {
      const cmds = Array.from(m.commands.values()).filter((c) => !c.hidden);
      // Always show ? in the normal column
      if (m.id === "normal" && !m.commands.has("?")) {
        cmds.push({
          key: "?",
          label: "Show / hide this help",
          run: () => api.togglePalette(),
        });
      }
      const column: PaletteColumn = {
        label: m.label,
        commands: cmds,
        overriddenKeys: childKeys.get(m.id),
        kind: "mode",
      };
      columns.push(column);
    }

    if (activePending) {
      const pendingCommands = Array.from(activePending.scope.values()).filter(
        (c) => !c.hidden,
      );
      if (pendingCommands.length > 0) {
        const pendingColumn: PaletteColumn = {
          label: activePending.config.label || "Awaiting input",
          commands: pendingCommands,
          overriddenKeys: undefined,
          kind: "pending",
        };
        columns.push(pendingColumn);
      }
    }

    return columns;
  }

  // ── Sync ─────────────────────────────────────────────────────────

  function syncIndicator() {
    const mode = effectiveMode();
    const entry = getEntry(mode);
    indicator.update(
      entry.label.toUpperCase(),
      pendingTrail,
      entry.passive,
      mode,
    );
  }

  let lastMode = "";
  function syncMode() {
    const mode = effectiveMode();
    if (mode !== lastMode) {
      lastMode = mode;
      syncIndicator();
    }
  }

  // ── Key handler ──────────────────────────────────────────────────

  function onKeyDown(e: KeyboardEvent) {
    if (e.ctrlKey || e.metaKey || e.altKey) return;

    syncMode();
    const key = e.key.toLowerCase();
    const entry = getEntry(effectiveMode());
    const passive = entry.passive;

    // ── Active pending scope ───────────────────────────────────────
    if (activePending) {
      const pending = activePending;

      if (passive && !pending.config.insertMode) {
        cancelPending();
        syncIndicator();
      } else {
        const cmd = pending.scope.get(key);
        if (cmd) {
          if (pending.timer) clearTimeout(pending.timer);
          pendingTrail += key;
          activePending = null; // clear before run (run may push new pending)
          if (!passive) {
            e.preventDefault();
            e.stopPropagation();
          }
          cmd.run();
          if (!activePending) pendingTrail = ""; // sequence done
          syncIndicator();
          if (palette.visible()) palette.show(paletteColumns());
          return;
        }

        if (key === "escape") {
          e.preventDefault();
          e.stopPropagation();
          e.stopImmediatePropagation();
          cancelPending();
          syncIndicator();
          if (palette.visible()) palette.show(paletteColumns());
          return;
        }

        if (isModifierOnlyKey(key)) {
          return;
        }

        // `?` should NOT cancel pending — let it fall through to the
        // palette toggle below so it gets preventDefault + stopPropagation.
        if (key !== "?") {
          if (pending.config.inherit === false) {
            cancelPending();
            syncIndicator();
            // Fall through — key is still processed normally
          }
        }
      }
    }

    // ── Passive mode ──────────────────────────────────────────────
    if (passive) {
      if (key === "escape") {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        const active = document.activeElement;
        if (isEditable(active) && active instanceof HTMLElement) {
          active.blur();
          syncMode();
        }
        return;
      }

      const cmd = resolveInsert(key);
      if (cmd) {
        pendingTrail = key;
        cmd.run();
        if (!activePending) pendingTrail = "";
        syncIndicator();
        if (palette.visible()) palette.show(paletteColumns());
      }
      return;
    }

    // ── Palette toggle ────────────────────────────────────────────
    if (key === "?") {
      e.preventDefault();
      e.stopPropagation();
      if (palette.visible()) palette.hide();
      else palette.show(paletteColumns());
      return;
    }

    // ── Escape — always swallow to prevent Reveal.js overview toggle
    if (key === "escape") {
      e.preventDefault();
      e.stopPropagation();
      const paletteWasOpen = palette.visible();
      // Let mode commands handle Escape first (e.g. paint exit → game)
      const cmd = resolveKey("escape");
      if (cmd && !cmd.passthrough) {
        cmd.run();
        syncIndicator();
        // If palette was open, refresh it to show the next active mode in the stack.
        if (paletteWasOpen) {
          palette.show(paletteColumns());
        }
        return;
      }
      // Fallback: pop top manual mode if present
      if (modeStack.length > 0) {
        const top = modeStack[modeStack.length - 1];
        api.popMode(top);
        if (paletteWasOpen) {
          palette.show(paletteColumns());
        }
        return;
      }
      // With no manual mode to pop, Escape does not dismiss the help palette.
      if (paletteWasOpen) {
        palette.show(paletteColumns());
      }
      return;
    }

    if (palette.visible()) {
      const cmd = resolveKey(key);
      if (cmd) {
        e.preventDefault();
        e.stopPropagation();
        palette.hide();
        if (!cmd.passthrough) cmd.run();
        return;
      }
    }

    // ── Normal command dispatch ────────────────────────────────────
    const cmd = resolveKey(key);
    if (cmd) {
      if (cmd.passthrough) return;
      e.preventDefault();
      e.stopPropagation();
      pendingTrail = key; // start trail (in case cmd pushes pending)
      cmd.run();
      if (!activePending) pendingTrail = ""; // cmd didn't push pending
      syncIndicator();
    }
  }

  // ── Focus tracking ───────────────────────────────────────────────

  function onFocusChange() {
    syncMode();
  }

  function onWindowFocusChange() {
    syncMode();
  }

  // ── Theme ────────────────────────────────────────────────────────

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

  window.addEventListener("keydown", onKeyDown, true);
  document.addEventListener("focusin", onFocusChange);
  document.addEventListener("focusout", onFocusChange);
  document.addEventListener("themeChanged", syncThemeVars);
  window.addEventListener("focus", onWindowFocusChange, true);
  window.addEventListener("blur", onWindowFocusChange, true);

  const themeObs = new MutationObserver(syncThemeVars);
  themeObs.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["class"],
  });

  syncThemeVars();
  syncMode();
  syncIndicator();

  // ── Public API ───────────────────────────────────────────────────

  const api: VimModeAPI = {
    register(key, cmd, modeId = "normal") {
      const k = key.toLowerCase();
      const target = modes.get(modeId);
      if (!target) return;
      target.commands.set(k, { ...cmd, key: k });
    },

    unregister(key, modeId = "normal") {
      modes.get(modeId)?.commands.delete(key.toLowerCase());
    },

    pushMode(id, config) {
      const entry: ModeEntry = {
        id,
        label: config.label,
        extends: config.extends,
        commands: new Map(
          config.commands.map((c) => [
            c.key.toLowerCase(),
            { ...c, key: c.key.toLowerCase() },
          ]),
        ),
        passive: config.passive ?? false,
      };
      modes.set(id, entry);

      // Activate: push to stack (deduplicate first)
      const idx = modeStack.indexOf(id);
      if (idx >= 0) modeStack.splice(idx, 1);
      modeStack.push(id);
      syncMode();
      syncIndicator();
    },

    popMode(id) {
      const idx = modeStack.indexOf(id);
      if (idx >= 0) modeStack.splice(idx, 1);
      syncMode();
      syncIndicator();
    },

    pushPending(config) {
      doPushPending(config);
      syncIndicator();
      if (palette.visible()) palette.show(paletteColumns());
    },

    cancelPending() {
      cancelPending();
      syncIndicator();
      if (palette.visible()) palette.show(paletteColumns());
    },

    registerSequence(word, config) {
      const keys = word.toLowerCase().split("");
      const timeout = config.timeout ?? 400;
      const targetModes = config.modes?.length ? config.modes : ["normal"];

      const buildStep = (step: number): (() => void) => {
        if (step === keys.length - 1) return config.run;
        return () => {
          const live = getEntry(effectiveMode()).passive ? 0 : timeout;
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
            timeout: live,
            insertMode: config.insertMode,
          });
        };
      };

      for (const modeId of targetModes) {
        api.register(
          keys[0],
          {
            label: config.label || `${word} sequence`,
            category: config.category,
            hidden: config.hidden ?? true,
            insertMode: config.insertMode,
            run: buildStep(0),
          },
          modeId,
        );
      }
    },

    activeCommands() {
      const chain = modeChain(effectiveMode());
      const merged = new Map<string, VimCommand>();
      for (const m of chain) {
        for (const [k, cmd] of m.commands) {
          merged.set(k, cmd);
        }
      }
      return Array.from(merged.values()).filter((c) => !c.hidden);
    },

    mode: () => effectiveMode(),

    togglePalette() {
      if (palette.visible()) palette.hide();
      else palette.show(paletteColumns());
    },

    closePalette() {
      palette.hide();
    },

    destroy() {
      window.removeEventListener("keydown", onKeyDown, true);
      document.removeEventListener("focusin", onFocusChange);
      document.removeEventListener("focusout", onFocusChange);
      document.removeEventListener("themeChanged", syncThemeVars);
      window.removeEventListener("focus", onWindowFocusChange, true);
      window.removeEventListener("blur", onWindowFocusChange, true);
      themeObs.disconnect();
      palette.destroy();
      indicator.destroy();
    },
  };

  return api;
}
