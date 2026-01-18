import React, { useState } from "react";

interface ParenthesesCounterProps {
  mode: "count" | "balance";
  title?: string;
}

export const ParenthesesCounter: React.FC<ParenthesesCounterProps> = ({
  mode,
  title,
}) => {
  const [input, setInput] = useState("");

  const handleChange = (value: string) => {
    // Filter to only parentheses
    const filtered = value.replace(/[^()[\]{}]/g, "");

    if (mode === "balance") {
      // Check if we go negative at any point
      let balance = 0;
      for (let i = 0; i < filtered.length; i++) {
        const char = filtered[i];
        if (char === "(" || char === "[" || char === "{") {
          balance++;
        } else {
          balance--;
        }
        if (balance < 0) {
          // Stop here, don't allow adding more but allow deletions
          setInput(filtered.slice(0, i + 1));
          return;
        }
      }
    }

    setInput(filtered);
  };

  // Count mode: just count opening and closing
  const openCount = (input.match(/[([{]/g) || []).length;
  const closeCount = (input.match(/[)\]}]/g) || []).length;

  // Balance mode: opening - closing (pending to close)
  const balance = openCount - closeCount;
  const isNegative = balance < 0;

  return (
    <div className="flex flex-col items-center gap-12 w-full max-w-2xl">
      {title && (
        <h1 className="text-3xl font-bold dark:text-gray-100 text-gray-800">
          {title}
        </h1>
      )}

      <div className="w-full">
        <input
          type="text"
          value={input}
          onChange={(e) => handleChange(e.target.value)}
          placeholder="Type parentheses here... ( ) [ ] { }"
          className={`w-full text-4xl font-mono text-center p-4 rounded-xl border-2 outline-none transition-colors 
            bg-white dark:bg-gray-800 
            ${
              isNegative
                ? "border-red-500 text-red-600 dark:text-red-400"
                : "border-gray-300 dark:border-gray-600 text-amber-600 dark:text-amber-300 focus:border-amber-500 dark:focus:border-amber-400"
            }`}
        />
      </div>

      {mode === "count" && (
        <div className="grid grid-cols-2 gap-8 text-center">
          <div className="p-6 rounded-xl border bg-green-50 border-green-200 dark:bg-green-900/30 dark:border-green-500/30">
            <div className="text-lg mb-2 text-green-600 dark:text-green-400">
              Opening
            </div>
            <div className="text-5xl font-bold text-green-700 dark:text-green-300">
              {openCount}
            </div>
          </div>
          <div className="p-6 rounded-xl border bg-red-50 border-red-200 dark:bg-red-900/30 dark:border-red-500/30">
            <div className="text-lg mb-2 text-red-600 dark:text-red-400">
              Closing
            </div>
            <div className="text-5xl font-bold text-red-700 dark:text-red-300">
              {closeCount}
            </div>
          </div>
        </div>
      )}

      {mode === "balance" && (
        <div className="flex flex-col items-center gap-4">
          <div
            className={`p-8 rounded-xl border-2 ${
              isNegative
                ? "bg-red-50 border-red-500 dark:bg-red-900/30"
                : balance === 0 && input.length > 0
                  ? "bg-green-50 border-green-500 dark:bg-green-900/30"
                  : "bg-amber-50 border-amber-200 dark:bg-amber-900/30 dark:border-amber-500/30"
            }`}
          >
            <div className="text-lg mb-2 text-center text-gray-600 dark:text-gray-300">
              Pending to close
            </div>
            <div
              className={`text-6xl font-bold text-center ${
                isNegative
                  ? "text-red-600 dark:text-red-400"
                  : balance === 0 && input.length > 0
                    ? "text-green-600 dark:text-green-400"
                    : "text-amber-600 dark:text-amber-300"
              }`}
            >
              {balance}
            </div>
          </div>

          {isNegative && (
            <div className="text-2xl font-bold flex items-center gap-2 text-red-600 dark:text-red-400">
              <span className="text-4xl">❌</span>
              IMPOSSIBLE!
            </div>
          )}

          {!isNegative && balance === 0 && input.length > 0 && (
            <div className="text-2xl font-bold flex items-center gap-2 text-green-600 dark:text-green-400">
              <span className="text-4xl">✅</span>
              BALANCED!
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ParenthesesCounter;
