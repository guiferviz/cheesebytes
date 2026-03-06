import React, { useState } from "react";
import { Probador } from "./Probador";
import type { Action, DisplayMode } from "./types";

const CHAR_TO_ACTION: Record<string, Action> = {
  "(": { type: "PUT", garment: "T" },
  ")": { type: "TAKE_OFF", garment: "T" },
  "[": { type: "PUT", garment: "S" },
  "]": { type: "TAKE_OFF", garment: "S" },
  "{": { type: "PUT", garment: "J" },
  "}": { type: "TAKE_OFF", garment: "J" },
};

function sequenceToActions(text: string): Action[] {
  return text
    .split("")
    .map((c) => CHAR_TO_ACTION[c])
    .filter(Boolean);
}

interface ProbadorWithInputProps {
  defaultSequence?: string;
  displayMode?: DisplayMode;
  showParentheses?: boolean;
  showTypeCounters?: boolean;
  autoPlay?: boolean;
  showControls?: boolean;
}

export const ProbadorWithInput: React.FC<ProbadorWithInputProps> = ({
  defaultSequence = "([{}])",
  displayMode = "stack",
  showParentheses = true,
  showTypeCounters = false,
  autoPlay = false,
  showControls = true,
}) => {
  const [input, setInput] = useState(defaultSequence);

  const handleChange = (value: string) => {
    const filtered = value.replace(/[^()[\]{}]/g, "");
    setInput(filtered);
  };

  const actions = sequenceToActions(input);

  return (
    <div className="flex flex-col items-center gap-6 w-full">
      <div className="w-full max-w-2xl">
        <input
          type="text"
          value={input}
          onChange={(e) => handleChange(e.target.value)}
          placeholder="Type parentheses here… ( ) [ ] { }"
          className="w-full text-4xl font-mono text-center p-4 rounded-xl border-2 outline-none transition-colors
            bg-white dark:bg-gray-800
            border-gray-300 dark:border-gray-600
            text-amber-600 dark:text-amber-300
            focus:border-amber-500 dark:focus:border-amber-400"
        />
      </div>
      <Probador
        key={input}
        actions={actions}
        displayMode={displayMode}
        showParentheses={showParentheses}
        showTypeCounters={showTypeCounters}
        autoPlay={autoPlay}
        showControls={showControls}
      />
    </div>
  );
};
