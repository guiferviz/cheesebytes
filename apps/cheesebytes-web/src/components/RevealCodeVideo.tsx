import React, { useMemo } from "react";
import hljs from "highlight.js";

import { defineVideoVisual } from "@guiferviz/cheese-bytes-video/actions";
import { useVideoVisual } from "@guiferviz/cheese-bytes-video/react";

type RevealCodeVideoState = {
  progress: number;
};

export const revealCodeVideoDefinition =
  defineVideoVisual<RevealCodeVideoState>()({
    type: "reveal-code",
    actions: {
      reveal: {
        timing: "animated",
        label: "Reveal code",
        apply: (state, _params, { progress }) => ({ ...state, progress }),
      },
    },
  });

type Block = {
  step: number;
  code: string;
};

function splitSteps(source: string): Block[] {
  const lines = source.split("\n");
  const blocks: Block[] = [];
  let currentStep = 0;
  let current: string[] = [];

  const flush = () => {
    if (!current.length) return;
    blocks.push({ step: currentStep, code: current.join("\n") });
    current = [];
  };

  for (const line of lines) {
    const match = /^\s*#\s*STEP-(\d+)\s*$/.exec(line);
    if (match) {
      flush();
      currentStep = Number(match[1]);
      continue;
    }
    current.push(line);
  }
  flush();
  return blocks;
}

export default function RevealCodeVideo({
  code,
  language = "python",
}: {
  code: string;
  language?: string;
}) {
  const { ref, state } = useVideoVisual(revealCodeVideoDefinition, {
    progress: 0,
  });

  const blocks = useMemo(() => splitSteps(code), [code]);
  const maxStep = Math.max(0, ...blocks.map((block) => block.step));
  const visibleStep =
    maxStep === 0 ? 0 : Math.min(maxStep, Math.floor(state.progress * (maxStep + 1)));

  const visible = blocks
    .filter((block) => block.step === 0 || block.step <= visibleStep)
    .map((block) => block.code)
    .join("\n");

  const highlighted = useMemo(() => {
    try {
      if (language && hljs.getLanguage(language)) {
        return hljs.highlight(visible, { language }).value;
      }
      return hljs.highlightAuto(visible).value;
    } catch {
      return visible.replace(/</g, "&lt;").replace(/>/g, "&gt;");
    }
  }, [language, visible]);

  return (
    <div
      ref={ref}
      className="grid h-full w-full place-items-center"
      style={{ fontFamily: "'IosevkaTermSlab Nerd Font Mono', monospace" }}
    >
      <pre className="m-0 text-left text-lg">
        <code
          className={`hljs language-${language} rounded-lg`}
          dangerouslySetInnerHTML={{ __html: highlighted }}
        />
      </pre>
    </div>
  );
}
