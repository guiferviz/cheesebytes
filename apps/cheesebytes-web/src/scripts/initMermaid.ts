import mermaid from "mermaid";

function getTheme(): "dark" | "default" {
  return document.documentElement.classList.contains("dark")
    ? "dark"
    : "default";
}

const originalSources = new WeakMap<Element, string>();
let themeListenerRegistered = false;

function getMermaidBlocks() {
  return Array.from(document.querySelectorAll<HTMLElement>("pre.mermaid"));
}

function storeOriginalSources(elements: Element[]) {
  elements.forEach((element) => {
    if (!originalSources.has(element)) {
      originalSources.set(element, element.textContent ?? "");
    }
  });
}

function restoreOriginalSources(elements: Element[]) {
  elements.forEach((element) => {
    const original = originalSources.get(element);
    if (original !== undefined) {
      element.removeAttribute("data-processed");
      element.textContent = original;
    }
  });
}

async function renderMermaid() {
  mermaid.initialize({
    startOnLoad: false,
    theme: getTheme(),
  });
  await mermaid.run({ querySelector: "pre.mermaid" });
}

export async function initMermaid() {
  const elements = getMermaidBlocks();
  if (elements.length === 0) {
    return;
  }

  storeOriginalSources(elements);

  try {
    await renderMermaid();
  } catch (error) {
    console.error("Failed to render Mermaid diagrams", error);
  }

  if (themeListenerRegistered) {
    return;
  }

  document.addEventListener("themeChanged", async () => {
    const currentElements = getMermaidBlocks();
    restoreOriginalSources(currentElements);

    try {
      await renderMermaid();
    } catch (error) {
      console.error("Failed to re-render Mermaid diagrams", error);
    }
  });

  themeListenerRegistered = true;
}
