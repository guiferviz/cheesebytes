/**
 * Shared cheese-cursor module.
 *
 * Manages a floating `<img>` element that replaces the browser cursor with the
 * Cheese Bytes cheese wedge.  Works on any page — the PresentationLayout
 * enables it by default; other layouts can toggle it with a single call.
 */

const CURSOR_ID = "customCursor";
const STYLE_ID = "cheese-cursor-hide";
const CURSOR_SRC = "/cursors/cursor_64.svg";
const CURSOR_Z_INDEX = "10001";
const ACCESSORY_Z_INDEX = "10002";
const NORMAL_CURSOR_HOTSPOT = { x: 0, y: 0 } as const;
const FULLSCREEN_CURSOR_HOTSPOT = { x: 0, y: 32 } as const;
const PAINT_PALETTE_ACCESSORY_ID = "cheese-cursor-paint-palette";

interface CursorBasePosition {
  mode: "fixed" | "absolute";
  x: number;
  y: number;
}

export interface CursorOffset {
  x: number;
  y: number;
}

export interface CursorAccessoryConfig {
  id: string;
  src: string;
  alt: string;
  width: number;
  height: number;
  normalOffset: CursorOffset;
  fullscreenOffset: CursorOffset;
  transform?: string;
  transformOrigin?: string;
  zIndex?: string;
}

const PAINT_PALETTE_ACCESSORY: CursorAccessoryConfig = {
  id: PAINT_PALETTE_ACCESSORY_ID,
  src: "/cursors/palette.png",
  alt: "Drawing mode active",
  width: 48,
  height: 48,
  normalOffset: { x: -8, y: 18 },
  fullscreenOffset: { x: -8, y: -14 },
  transform: "rotate(-25deg)",
  transformOrigin: "bottom right",
  zIndex: ACCESSORY_Z_INDEX,
};

interface CursorDocument extends Document {
  webkitFullscreenElement?: Element | null;
}

let _active = false;
let _visible = true;
let _scale = 1;
let _cursorEl: HTMLImageElement | null = null;
let _accessoryEl: HTMLImageElement | null = null;
let _accessoryConfig: CursorAccessoryConfig | null = null;
let _tracking = false;
let _fullscreenSyncing = false;
let _position = { x: 0, y: 0 };
let _hasPosition = false;
let _positionedHost: {
  element: HTMLElement;
  previousPosition: string;
} | null = null;

/* ------------------------------------------------------------------ */
/*  Internal helpers                                                   */
/* ------------------------------------------------------------------ */

function currentCursorHost(): HTMLElement {
  const doc = document as CursorDocument;
  const fullscreenElement =
    doc.fullscreenElement ?? doc.webkitFullscreenElement ?? null;
  return fullscreenElement instanceof HTMLElement
    ? fullscreenElement
    : document.body;
}

function restorePositionedHost() {
  if (!_positionedHost) return;
  _positionedHost.element.style.position = _positionedHost.previousPosition;
  _positionedHost = null;
}

function ensureCursorHostPosition(host: HTMLElement) {
  if (host === document.body) {
    restorePositionedHost();
    return;
  }

  if (_positionedHost && _positionedHost.element !== host) {
    restorePositionedHost();
  }

  if (getComputedStyle(host).position !== "static") {
    return;
  }

  _positionedHost = {
    element: host,
    previousPosition: host.style.position,
  };
  host.style.position = "relative";
}

function cursorBasePosition() {
  const host = currentCursorHost();
  if (host === document.body) {
    return {
      mode: "fixed",
      x: _position.x,
      y: _position.y,
    } as const;
  }

  const rect = host.getBoundingClientRect();
  return {
    mode: "absolute",
    x: _position.x - rect.left + host.scrollLeft,
    y: _position.y - rect.top + host.scrollTop,
  } as const;
}

function getOrCreateCursor(): HTMLImageElement {
  let el = document.getElementById(CURSOR_ID) as HTMLImageElement | null;
  if (!el) {
    el = document.createElement("img");
    el.id = CURSOR_ID;
    el.src = CURSOR_SRC;
    el.alt = "Custom Cheese Cursor";
    el.width = 64;
    el.height = 64;
    currentCursorHost().appendChild(el);
  }
  // Ensure positioning styles (may already exist from static HTML)
  Object.assign(el.style, {
    position: "fixed",
    top: "0",
    left: "0",
    pointerEvents: "none",
    zIndex: CURSOR_Z_INDEX,
    transition: "opacity 0.3s linear",
    transformOrigin: "top left",
    willChange: "transform",
  });
  _cursorEl = el;
  return el;
}

function getOrCreateAccessory(config: CursorAccessoryConfig): HTMLImageElement {
  let el = document.getElementById(config.id) as HTMLImageElement | null;
  if (!el) {
    el = document.createElement("img");
    el.id = config.id;
    currentCursorHost().appendChild(el);
  }

  el.src = config.src;
  el.alt = config.alt;
  el.width = config.width;
  el.height = config.height;

  Object.assign(el.style, {
    position: "fixed",
    top: "0",
    left: "0",
    width: `${config.width}px`,
    height: `${config.height}px`,
    pointerEvents: "none",
    zIndex: config.zIndex ?? ACCESSORY_Z_INDEX,
    transition: "opacity 0.2s linear",
    transformOrigin: config.transformOrigin ?? "top left",
    willChange: "transform",
  });

  _accessoryEl = el;
  return el;
}

function syncCursorHost() {
  if (!_cursorEl && !_accessoryEl) return;
  const host = currentCursorHost();
  ensureCursorHostPosition(host);
  if (_cursorEl && _cursorEl.parentElement !== host) {
    host.appendChild(_cursorEl);
  }
  if (_accessoryEl && _accessoryEl.parentElement !== host) {
    host.appendChild(_accessoryEl);
  }
}

function injectHideStyle() {
  if (document.getElementById(STYLE_ID)) return;
  const s = document.createElement("style");
  s.id = STYLE_ID;
  s.textContent =
    "html,body,*,*:hover,*:active,*:focus,*:focus-visible," +
    "*:focus-within,*::before,*::after{cursor:none!important}";
  document.head.appendChild(s);
}

function removeHideStyle() {
  document.getElementById(STYLE_ID)?.remove();
}

function renderCheeseCursor(base: CursorBasePosition) {
  if (!_cursorEl) return;
  const hotspot =
    base.mode === "fixed" ? NORMAL_CURSOR_HOTSPOT : FULLSCREEN_CURSOR_HOTSPOT;
  const x = base.x - hotspot.x * _scale;
  const y = base.y - hotspot.y * _scale;
  _cursorEl.style.position = base.mode;
  _cursorEl.style.display = _active ? "" : "none";
  _cursorEl.style.opacity = _active && _visible ? "1" : "0";
  _cursorEl.style.transform = `translate(${x}px,${y}px) scale(${_scale})`;
}

function renderAccessory(base: CursorBasePosition) {
  if (!_accessoryConfig) {
    if (_accessoryEl) {
      _accessoryEl.style.display = "none";
      _accessoryEl.style.opacity = "0";
    }
    return;
  }

  const el = _accessoryEl ?? getOrCreateAccessory(_accessoryConfig);
  const offset =
    base.mode === "fixed"
      ? _accessoryConfig.normalOffset
      : _accessoryConfig.fullscreenOffset;
  const transform = _accessoryConfig.transform
    ? ` ${_accessoryConfig.transform}`
    : "";

  el.style.position = base.mode;
  el.style.display = "";
  el.style.opacity = "1";
  el.style.transform = `translate(${base.x + offset.x}px,${base.y + offset.y}px)${transform}`;
}

function renderCursor() {
  const base = cursorBasePosition();
  renderCheeseCursor(base);
  renderAccessory(base);
}

function seedPosition() {
  if (_hasPosition) return;
  _position = {
    x: Math.round(window.innerWidth / 2),
    y: Math.round(window.innerHeight / 2),
  };
  _hasPosition = true;
}

function onMove(e: MouseEvent | PointerEvent) {
  _position = { x: e.clientX, y: e.clientY };
  _hasPosition = true;
  renderCursor();
}

function onFullscreenChange() {
  syncCursorHost();
  renderCursor();
}

function ensurePointerTracking() {
  if (_tracking) return;
  document.addEventListener("mousemove", onMove);
  document.addEventListener("pointermove", onMove);
  _tracking = true;
}

function addFullscreenListeners() {
  if (_fullscreenSyncing) return;
  document.addEventListener("fullscreenchange", onFullscreenChange);
  document.addEventListener("webkitfullscreenchange", onFullscreenChange);
  _fullscreenSyncing = true;
}

function removeFullscreenListeners() {
  if (!_fullscreenSyncing) return;
  document.removeEventListener("fullscreenchange", onFullscreenChange);
  document.removeEventListener("webkitfullscreenchange", onFullscreenChange);
  _fullscreenSyncing = false;
}

function stopRuntimeIfIdle() {
  if (_active || _accessoryConfig) return;
  removeFullscreenListeners();
  restorePositionedHost();
}

/* ------------------------------------------------------------------ */
/*  Public API                                                         */
/* ------------------------------------------------------------------ */

export function init() {
  ensurePointerTracking();
}

export function enable() {
  getOrCreateCursor();
  injectHideStyle();
  init();
  syncCursorHost();
  seedPosition();
  _active = true;
  addFullscreenListeners();
  renderCursor();
}

export function disable() {
  removeHideStyle();
  _active = false;
  renderCursor();
  stopRuntimeIfIdle();
}

export function toggle(): boolean {
  if (_active) {
    disable();
  } else {
    enable();
  }
  return _active;
}

export function isActive(): boolean {
  return _active;
}

/* ---- Size / visibility helpers (used by PresentationLayout's c menu) ---- */

export function toggleVisibility() {
  _visible = !_visible;
  renderCursor();
}

export function decreaseSize() {
  _scale = Math.max(_scale - 0.2, 0.4);
  renderCursor();
}

export function increaseSize() {
  _scale = Math.min(_scale + 0.2, 3);
  renderCursor();
}

export function resetSize() {
  _scale = 1;
  renderCursor();
}

export function setAccessory(config: CursorAccessoryConfig) {
  _accessoryConfig = config;
  getOrCreateAccessory(config);
  init();
  syncCursorHost();
  seedPosition();
  addFullscreenListeners();
  renderCursor();
}

export function clearAccessory(id?: string) {
  if (id && _accessoryConfig?.id !== id) return;
  _accessoryConfig = null;
  _accessoryEl?.remove();
  _accessoryEl = null;
  renderCursor();
  stopRuntimeIfIdle();
}

export function showPaintPalette() {
  setAccessory(PAINT_PALETTE_ACCESSORY);
}

export function hidePaintPalette() {
  clearAccessory(PAINT_PALETTE_ACCESSORY_ID);
}

const cheeseCursor = {
  init,
  enable,
  disable,
  toggle,
  isActive,
  toggleVisibility,
  decreaseSize,
  increaseSize,
  resetSize,
  setAccessory,
  clearAccessory,
  showPaintPalette,
  hidePaintPalette,
};

export default cheeseCursor;
