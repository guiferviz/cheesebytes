import React, { useState, useEffect, useRef } from "react";
import { FACE_COLORS, textColor } from "./lehmerColors";
import {
  toLehmer,
  lehmerToIndex,
  allPermutations,
  factorial,
} from "./lehmerMath";

interface LehmerTableProps {
  initialN?: number;
  showNSelector?: boolean;
  highlightIndex?: number | null;
  /** Which optional columns to show: "lehmer" and/or "computation". */
  showColumns?: ("lehmer" | "computation")[];
  /** Max height of the component. Use a fixed value like "24em" in blog posts,
   *  or leave as default "100%" for slides where the parent has a defined height. */
  maxHeight?: string;
}

export const LehmerTable: React.FC<LehmerTableProps> = ({
  initialN = 3,
  showNSelector = true,
  highlightIndex = null,
  showColumns = ["lehmer", "computation"],
  maxHeight = "100%",
}) => {
  const showLehmer = showColumns.includes("lehmer");
  const showComputation = showColumns.includes("computation");
  const [nString, setNString] = useState<string>(initialN.toString());
  const [n, setN] = useState(Math.max(1, Math.min(9, initialN)));
  const [perms, setPerms] = useState<number[][]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const total = factorial(n);
    if (total > 720) {
      setPerms([]);
      return;
    }
    requestAnimationFrame(() => setPerms(allPermutations(n)));
  }, [n]);

  useEffect(() => {
    if (highlightIndex !== null && scrollRef.current) {
      const row = scrollRef.current.querySelector(
        `[data-idx="${highlightIndex}"]`,
      );
      row?.scrollIntoView({ block: "center", behavior: "smooth" });
    }
  }, [highlightIndex, perms]);

  const cellSize = 32;
  const gap = 4;

  return (
    <div
      style={{
        width: "100%",
        maxHeight,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 16,
        overflow: "hidden",
        fontFamily: "monospace",
        userSelect: "none",
      }}
      className="not-prose"
    >
      {showNSelector && (
        <div
          style={{ flexShrink: 0 }}
          className="flex items-center justify-center gap-3 font-mono text-base text-gray-500 dark:text-gray-400"
        >
          <span className="text-gray-500 dark:text-gray-500">n =</span>
          <input
            type="text"
            value={nString}
            onChange={(e) => {
              const val = e.target.value.replace(/[^0-9]/g, "");
              setNString(val);
              const num = parseInt(val, 10);
              if (!isNaN(num) && num >= 1 && num <= 9) setN(num);
            }}
            onBlur={() => setNString(n.toString())}
            className="w-12 h-10 rounded-md border-2 border-gray-300 bg-gray-100 text-center font-mono text-lg font-bold outline-none transition-colors focus:border-orange-500 dark:border-gray-600 dark:bg-gray-800"
            style={{ color: "#e07830" }}
          />
          <span className="text-sm text-gray-400 dark:text-gray-600 pl-2">
            ({factorial(n)} permutations)
          </span>
        </div>
      )}

      {perms.length > 0 && (
        <div
          ref={scrollRef}
          className="w-full max-w-lg rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-black"
          style={{
            flex: "0 1 auto",
            minHeight: 0,
            overflowY: "auto",
            overflowX: "hidden",
            isolation: "isolate",
          }}
        >
          <table className="w-full border-separate border-spacing-0 font-mono text-sm">
            <thead>
              <tr>
                <th
                  className={`${thCls} sticky top-0 z-10 bg-gray-100 dark:bg-gray-900`}
                >
                  Index
                </th>
                <th
                  className={`${thCls} sticky top-0 z-10 bg-gray-100 dark:bg-gray-900`}
                >
                  Permutation
                </th>
                {showLehmer && (
                  <th
                    className={`${thCls} sticky top-0 z-10 bg-gray-100 dark:bg-gray-900`}
                  >
                    Lehmer Code
                  </th>
                )}
                {showComputation && (
                  <th
                    className={`${thCls} sticky top-0 z-10 bg-gray-100 dark:bg-gray-900`}
                  >
                    Computation
                  </th>
                )}
              </tr>
            </thead>
            <tbody>
              {perms.map((p, rowIdx) => {
                const lc = toLehmer(p);
                const idx = lehmerToIndex(lc);
                const isHighlighted = highlightIndex === idx;
                return (
                  <tr
                    key={rowIdx}
                    data-idx={idx}
                    style={{
                      background: isHighlighted
                        ? "rgba(224,120,48,0.18)"
                        : undefined,
                    }}
                    className={
                      !isHighlighted
                        ? rowIdx % 2 === 0
                          ? "bg-white dark:bg-transparent"
                          : "bg-gray-50 dark:bg-white/[0.02]"
                        : ""
                    }
                  >
                    <td
                      className={`${tdCls} font-bold text-gray-900 dark:text-white text-sm`}
                    >
                      {idx}
                    </td>
                    <td className={tdCls}>
                      <div className="flex justify-center" style={{ gap }}>
                        {p.map((cIdx, j) => (
                          <div
                            key={j}
                            className="flex items-center justify-center font-mono font-bold shrink-0"
                            style={{
                              width: cellSize,
                              height: cellSize,
                              borderRadius: 6,
                              background: FACE_COLORS[cIdx].hex,
                              border: "2px solid rgba(0,0,0,0.12)",
                              boxShadow:
                                "inset 0 1px 0 rgba(255,255,255,0.2), 0 1px 3px rgba(0,0,0,0.15)",
                              fontSize: 11,
                              color: textColor(FACE_COLORS[cIdx].hex),
                            }}
                          >
                            {cIdx}
                          </div>
                        ))}
                      </div>
                    </td>
                    {showLehmer && (
                      <td className={tdCls}>
                        <span style={{ color: "#e07830" }}>
                          [{lc.join(", ")}]
                        </span>
                      </td>
                    )}
                    {showComputation && (
                      <td
                        className={`${tdCls} text-gray-400 dark:text-gray-500 text-xs`}
                      >
                        {lc.map((v, i) => {
                          const f = factorial(n - 1 - i);
                          return (
                            <React.Fragment key={i}>
                              {i > 0 && (
                                <span className="text-gray-300 dark:text-gray-600">
                                  {" "}
                                  +{" "}
                                </span>
                              )}
                              <span>
                                <span style={{ color: "#e07830" }}>{v}</span>
                                <span className="text-gray-300 dark:text-gray-600">
                                  ×
                                </span>
                                {f}!
                              </span>
                            </React.Fragment>
                          );
                        })}
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

const thCls =
  "px-3.5 py-2 text-center text-sm font-semibold text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-700 whitespace-nowrap";

const tdCls =
  "px-3 py-1.5 text-center border-b border-gray-100 dark:border-gray-800 align-middle";
