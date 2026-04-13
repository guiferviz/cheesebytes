async function bootMermaid() {
  if (!document.querySelector("pre.mermaid")) {
    return;
  }

  const { initMermaid } = await import("./initMermaid");
  await initMermaid();
}

function scheduleMermaidBoot() {
  void bootMermaid();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", scheduleMermaidBoot, {
    once: true,
  });
} else {
  scheduleMermaidBoot();
}

document.addEventListener("astro:page-load", scheduleMermaidBoot);
