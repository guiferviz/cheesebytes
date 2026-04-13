/**
 * Pixel-mode: a hidden "retro" mode that replaces the site's body font
 * with the pixel font (BigBlueTerm437 Nerd Font Mono).
 *
 * State is persisted in localStorage under "pixel-mode-unlocked" and
 * "pixel-mode-active". The unlock flag is set the first time the user
 * reaches the pixel state in the LogoAnimation; once unlocked the `g`
 * vim key toggles the mode on/off.
 */

const STORAGE_UNLOCKED = "pixel-mode-unlocked";
const STORAGE_ACTIVE = "pixel-mode-active";
const CLASS_NAME = "pixel-mode";

function isUnlocked(): boolean {
  try {
    return localStorage.getItem(STORAGE_UNLOCKED) === "1";
  } catch {
    return false;
  }
}

function isActive(): boolean {
  try {
    return localStorage.getItem(STORAGE_ACTIVE) === "1";
  } catch {
    return false;
  }
}

function apply(active: boolean) {
  if (active) {
    document.documentElement.classList.add(CLASS_NAME);
  } else {
    document.documentElement.classList.remove(CLASS_NAME);
  }
}

/** Mark pixel mode as unlocked (persists across sessions). */
function unlock() {
  try {
    localStorage.setItem(STORAGE_UNLOCKED, "1");
  } catch {
    // Storage full or blocked — ignore.
  }
}

/** Activate pixel mode and persist. Requires prior unlock. */
function activate() {
  if (!isUnlocked()) return;
  try {
    localStorage.setItem(STORAGE_ACTIVE, "1");
  } catch {
    // ignore
  }
  apply(true);
  window.dispatchEvent(new CustomEvent("pixel-mode-change", { detail: true }));
}

/** Deactivate pixel mode and persist. */
function deactivate() {
  try {
    localStorage.setItem(STORAGE_ACTIVE, "0");
  } catch {
    // ignore
  }
  apply(false);
  window.dispatchEvent(new CustomEvent("pixel-mode-change", { detail: false }));
}

/** Toggle pixel mode on/off. Returns the new active state. */
function toggle(): boolean {
  if (!isUnlocked()) return false;
  const next = !isActive();
  if (next) activate();
  else deactivate();
  return next;
}

/** Restore persisted state on page load. */
function restore() {
  if (isUnlocked() && isActive()) {
    apply(true);
  }
}

export default {
  isUnlocked,
  isActive,
  unlock,
  activate,
  deactivate,
  toggle,
  restore,
};
