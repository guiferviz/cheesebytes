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
const CURSOR_Z_INDEX = "2147483647";

interface CursorDocument extends Document {
  webkitFullscreenElement?: Element | null;
}

let _active = false;
let _visible = true;
let _scale = 1;
let _cursorEl: HTMLImageElement | null = null;
let _tracking = false;
let _fullscreenSyncing = false;
let _position = { x: 0, y: 0 };
let _hasPosition = false;

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

function syncCursorHost() {
  if (!_cursorEl) return;
  const host = currentCursorHost();
  if (_cursorEl.parentElement !== host) {
    host.appendChild(_cursorEl);
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

function renderCursor() {
  if (!_cursorEl) return;
  _cursorEl.style.display = _active ? "" : "none";
  _cursorEl.style.opacity = _active && _visible ? "1" : "0";
  _cursorEl.style.transform = `translate(${_position.x}px,${_position.y}px) scale(${_scale})`;
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
  removeFullscreenListeners();
  _active = false;
  renderCursor();
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
};

export default cheeseCursor;
