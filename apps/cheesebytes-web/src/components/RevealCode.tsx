import React, { useMemo, useEffect, useRef, useState } from "react";
import hljs from "highlight.js";

type Animation = "fade" | "typing";

interface RevealCodeProps {
  code: string;
  language?: string;
  animation?: Animation;
  typingSpeed?: number;
}

interface CodeBlock {
  code: string;
  index: number;
  position: number;
}

function parseCode(code: string): CodeBlock[] {
  const lines = code.split("\n");
  const blocks: CodeBlock[] = [];
  const stepRegex = /^(\s*)#\s*STEP(?:-(\d+))?/i;

  let currentLines: string[] = [];
  let currentIndex: number | null = null;
  let autoIndex = 1;
  let position = 0;

  for (const line of lines) {
    const match = line.match(stepRegex);
    if (match) {
      if (currentLines.length > 0) {
        const blockCode = currentLines.join("\n");
        if (blockCode.trim()) {
          blocks.push({
            code: blockCode,
            index: currentIndex ?? 0,
            position: position++,
          });
        }
      }
      currentLines = [];
      const explicitIndex = match[2];
      currentIndex =
        explicitIndex !== undefined ? parseInt(explicitIndex, 10) : autoIndex++;
    } else {
      currentLines.push(line);
    }
  }

  if (currentLines.length > 0) {
    const blockCode = currentLines.join("\n");
    if (blockCode.trim()) {
      blocks.push({
        code: blockCode,
        index: currentIndex ?? 0,
        position: position,
      });
    }
  }

  return blocks;
}

export const RevealCode: React.FC<RevealCodeProps> = ({
  code,
  language = "python",
  animation = "fade",
  typingSpeed = 30,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [visibleIndices, setVisibleIndices] = useState<Set<number>>(
    new Set([0])
  );
  const [typingProgress, setTypingProgress] = useState<Map<number, number>>(
    new Map()
  );
  const [startedTyping, setStartedTyping] = useState<Set<number>>(new Set());

  const blocks = useMemo(() => parseCode(code), [code]);
  const maxIndex = useMemo(
    () => Math.max(...blocks.map((b) => b.index), 0),
    [blocks]
  );
  const sortedBlocks = useMemo(
    () => [...blocks].sort((a, b) => a.position - b.position),
    [blocks]
  );

  // Full code highlighted for the ghost (layout reservation)
  const ghostHtml = useMemo(() => {
    const fullCode = sortedBlocks.map((b) => b.code).join("\n");
    try {
      if (language && hljs.getLanguage(language)) {
        return hljs.highlight(fullCode, { language }).value;
      }
      return hljs.highlightAuto(fullCode).value;
    } catch {
      return fullCode.replace(/</g, "&lt;").replace(/>/g, "&gt;");
    }
  }, [sortedBlocks, language]);

  // Force Reveal.js to recalculate layout after mount
  useEffect(() => {
    // Small delay to ensure the component is fully rendered
    const timer = setTimeout(() => {
      // @ts-expect-error - Reveal is global
      if (typeof window !== "undefined" && window.Reveal) {
        // @ts-expect-error - Reveal is global
        window.Reveal.layout();
      }
    }, 50);
    return () => clearTimeout(timer);
  }, []);

  // Watch for fragment visibility changes
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Check if we are inside a Reveal.js slide

    const checkFragments = () => {
      const fragments = container.querySelectorAll(".rc-frag");
      const visibleSet = new Set<number>([0]);

      fragments.forEach((f) => {
        if (f.classList.contains("visible")) {
          const idx = parseInt(f.getAttribute("data-idx") || "0", 10);
          visibleSet.add(idx);
        }
      });

      // Update startedTyping:
      // 1. Add currently visible indices that haven't started yet (if typing)
      // 2. Remove indices that are no longer visible (reset)
      setStartedTyping((prev) => {
        const next = new Set(prev);
        // Note: We don't remove 0 usually, but 0 is always in visibleSet.

        // Remove invisible ones (reset state for them)
        for (const idx of prev) {
          if (!visibleSet.has(idx)) {
            next.delete(idx);
          }
        }

        // Add new visible ones
        if (animation === "typing") {
          for (const idx of visibleSet) {
            if (!prev.has(idx)) {
              next.add(idx);
            }
          }
        }
        return next;
      });

      // Reset progress for invisible ones or initialize new ones
      setTypingProgress((prev) => {
        const next = new Map(prev);

        // Cleanup invisible
        for (const idx of prev.keys()) {
          if (!visibleSet.has(idx)) {
            next.delete(idx);
          }
        }

        // Initialize new visible (if typing)
        if (animation === "typing") {
          for (const idx of visibleSet) {
            if (!prev.has(idx)) {
              next.set(idx, 0);
            }
          }
        }
        return next;
      });

      setVisibleIndices(visibleSet);
    };

    const observer = new MutationObserver(checkFragments);
    observer.observe(container, {
      attributes: true,
      attributeFilter: ["class"],
      subtree: true,
    });
    checkFragments();

    return () => observer.disconnect();
  }, [animation]); // removed startedTyping dependency to avoid cycles/stale closures, handled safely inside updater

  // Typing animation
  useEffect(() => {
    if (animation !== "typing" || typingProgress.size === 0) return;

    const activeTyping = Array.from(typingProgress.entries()).filter(
      ([idx]) => {
        const block = blocks.find((b) => b.index === idx);
        // Ensure we haven't exceeded length
        return block && (typingProgress.get(idx) ?? 0) < block.code.length;
      }
    );

    if (activeTyping.length === 0) return;

    const timer = setTimeout(() => {
      setTypingProgress((prev) => {
        const next = new Map(prev);
        activeTyping.forEach(([idx, progress]) => {
          // Double check visibility in case it changed rapidly?
          // Not strictly necessary if the other effect cleans up,
          // but good for safety.
          next.set(idx, progress + 1);
        });
        return next;
      });
    }, typingSpeed);

    return () => clearTimeout(timer);
  }, [typingProgress, blocks, typingSpeed, animation]);

  // Build final code and highlight it
  const highlightedHtml = useMemo(() => {
    const parts: string[] = [];

    for (const block of sortedBlocks) {
      if (!visibleIndices.has(block.index)) continue;

      let displayCode = block.code;
      // Only apply typing animation to non-zero indices (STEP-0 appears instantly)
      if (
        animation === "typing" &&
        block.index !== 0 &&
        typingProgress.has(block.index)
      ) {
        const progress = typingProgress.get(block.index) ?? 0;
        displayCode = block.code.slice(0, progress);
      }
      parts.push(displayCode);
    }

    const fullCode = parts.join("\n");

    try {
      if (language && hljs.getLanguage(language)) {
        return hljs.highlight(fullCode, { language }).value;
      }
      return hljs.highlightAuto(fullCode).value;
    } catch {
      return fullCode.replace(/</g, "&lt;").replace(/>/g, "&gt;");
    }
  }, [sortedBlocks, visibleIndices, typingProgress, animation, language]);

  // For fade animation: highlight each block separately
  const blockHighlights = useMemo(() => {
    if (animation !== "fade") return [];

    return sortedBlocks.map((block) => {
      try {
        if (language && hljs.getLanguage(language)) {
          return hljs.highlight(block.code, { language }).value;
        }
        return hljs.highlightAuto(block.code).value;
      } catch {
        return block.code.replace(/</g, "&lt;").replace(/>/g, "&gt;");
      }
    });
  }, [sortedBlocks, animation, language]);

  // CSS for fade animation
  const fadeStyles = `
    @keyframes rc-fade-in {
      from { opacity: 0; }
      to { opacity: 1; }
    }
    .rc-fade-block {
      animation: rc-fade-in 0.5s ease-in-out;
    }
  `;

  return (
    <div
      ref={containerRef}
      style={{
        display: "grid",
        placeItems: "center",
        width: "100%",
        height: "100%",
      }}
    >
      {animation === "fade" && <style>{fadeStyles}</style>}
      <div style={{ display: "grid" }}>
        {/* Ghost Element to Reserve Space (row 1, col 1) */}
        <pre
          style={{
            gridArea: "1 / 1",
            margin: 0,
            textAlign: "left",
            visibility: "hidden",
          }}
        >
          <code
            className={`hljs language-${language}`}
            dangerouslySetInnerHTML={{ __html: ghostHtml }}
          />
        </pre>

        {/* Actual Content (row 1, col 1 - overlaps ghost) */}
        <pre style={{ gridArea: "1 / 1", margin: 0, textAlign: "left" }}>
          {animation === "fade" ? (
            <code className={`hljs language-${language}`}>
              {sortedBlocks.map(
                (block, i) =>
                  visibleIndices.has(block.index) && (
                    <span
                      key={`${block.index}-${block.position}`}
                      className={block.index !== 0 ? "rc-fade-block" : ""}
                      dangerouslySetInnerHTML={{
                        __html: (i > 0 ? "\n" : "") + blockHighlights[i],
                      }}
                    />
                  )
              )}
            </code>
          ) : (
            <code
              className={`hljs language-${language}`}
              dangerouslySetInnerHTML={{ __html: highlightedHtml }}
            />
          )}
        </pre>

        {Array.from({ length: maxIndex }, (_, i) => (
          <span
            key={i + 1}
            className="fragment rc-frag"
            data-idx={i + 1}
            style={{ display: "none" }}
          />
        ))}
      </div>
    </div>
  );
};

export default RevealCode;
