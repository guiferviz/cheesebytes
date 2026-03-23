import { useEffect, useRef } from "react";

export function useSlideActive(onActivate: () => void) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    let sectionEl: HTMLElement | null = el;
    while (sectionEl && sectionEl.tagName !== "SECTION") {
      sectionEl = sectionEl.parentElement;
    }
    if (!sectionEl) return;

    const section = sectionEl;
    const obs = new MutationObserver(() => {
      if (section.classList.contains("present")) {
        onActivate();
      }
    });
    obs.observe(section, { attributes: true, attributeFilter: ["class"] });

    if (section.classList.contains("present")) {
      onActivate();
    }

    return () => obs.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return containerRef;
}
