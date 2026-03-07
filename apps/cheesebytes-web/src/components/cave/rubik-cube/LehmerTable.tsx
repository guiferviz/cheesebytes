import React, { useState, useEffect, useRef } from "react";
import { FACE_COLORS, textColor } from "./lehmerColors";
import {
  toLehmer,
  lehmerToIndex,
  allPermutations,
  factorial,
} from "./lehmerMath";
import { CheeseSlideContainer } from "../shared";

interface LehmerTableProps {
  initialN?: number;
  showNSelector?: boolean;
  maxHeight?: number;
  highlightIndex?: number | null;
}

export const LehmerTable: React.FC<LehmerTableProps> = ({
  initialN = 3,
  showNSelector = true,
  maxHeight = 520,
  highlightIndex = null,
}) => {
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
    <CheeseSlideContainer>
      {showNSelector && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 10,
            marginBottom: 20,
            fontFamily: "monospace",
            fontSize: 16,
            color: "#ccc",
          }}
        >
          <span style={{ color: "#aaa" }}>n =</span>
          <input
            type="text"
            value={nString}
            onChange={(e) => {
              const val = e.target.value.replace(/[^0-9]/g, "");
              setNString(val);
              const num = parseInt(val, 10);
              if (!isNaN(num) && num >= 1 && num <= 9) setN(num);
            }}
            style={{
              width: 48,
              height: 38,
              borderRadius: 6,
              border: "2px solid #555",
              background: "#2a2a2a",
              color: "#e07830",
              fontWeight: 700,
              textAlign: "center",
              fontFamily: "monospace",
              fontSize: 18,
              outline: "none",
              transition: "all 0.15s",
            }}
            onFocus={(e) => (e.target.style.borderColor = "#e07830")}
            onBlur={(e) => {
              setNString(n.toString());
              e.target.style.borderColor = "#555";
            }}
          />
          <span style={{ fontSize: 13, color: "#666", paddingLeft: 8 }}>
            ({factorial(n)} permutations)
          </span>
        </div>
      )}

      {perms.length > 0 && (
        <div
          ref={scrollRef}
          style={{
            maxHeight,
            overflowY: "auto",
            borderRadius: 10,
            border: "1px solid #3a3a3a",
            width: "100%",
          }}
        >
          <table
            style={{
              borderCollapse: "collapse",
              fontFamily: "monospace",
              fontSize: 13,
              width: "100%",
            }}
          >
            <thead>
              <tr
                style={{
                  position: "sticky",
                  top: 0,
                  background: "#161616",
                  zIndex: 1,
                }}
              >
                <th style={thStyle}>Index</th>
                <th style={thStyle}>Permutation</th>
                <th style={thStyle}>Lehmer Code</th>
                <th style={thStyle}>Computation</th>
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
                        : rowIdx % 2 === 0
                          ? "rgba(255,255,255,0.02)"
                          : "transparent",
                    }}
                  >
                    <td
                      style={{
                        ...tdStyle,
                        fontWeight: 700,
                        color: "#fff",
                        fontSize: 14,
                      }}
                    >
                      {idx}
                    </td>
                    <td style={tdStyle}>
                      <div
                        style={{
                          display: "flex",
                          gap,
                          justifyContent: "center",
                        }}
                      >
                        {p.map((cIdx, j) => (
                          <div
                            key={j}
                            style={{
                              width: cellSize,
                              height: cellSize,
                              borderRadius: 6,
                              background: FACE_COLORS[cIdx].hex,
                              border: "2px solid #111",
                              boxShadow: "inset 0 1px 0 rgba(255,255,255,0.15)",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              fontSize: 11,
                              fontWeight: 700,
                              color: textColor(FACE_COLORS[cIdx].hex),
                            }}
                          >
                            {cIdx}
                          </div>
                        ))}
                      </div>
                    </td>
                    <td style={tdStyle}>
                      <span style={{ color: "#e07830" }}>
                        [{lc.join(", ")}]
                      </span>
                    </td>
                    <td style={{ ...tdStyle, color: "#999", fontSize: 11 }}>
                      {lc.map((v, i) => {
                        const f = factorial(n - 1 - i);
                        return (
                          <React.Fragment key={i}>
                            {i > 0 && (
                              <span style={{ color: "#555" }}> + </span>
                            )}
                            <span>
                              <span style={{ color: "#e07830" }}>{v}</span>
                              <span style={{ color: "#555" }}>×</span>
                              {f}!
                            </span>
                          </React.Fragment>
                        );
                      })}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </CheeseSlideContainer>
  );
};

const thStyle: React.CSSProperties = {
  padding: "8px 14px",
  textAlign: "center",
  color: "#999",
  borderBottom: "1px solid #444",
  fontWeight: 600,
  whiteSpace: "nowrap",
};

const tdStyle: React.CSSProperties = {
  padding: "5px 12px",
  textAlign: "center",
  borderBottom: "1px solid #2a2a2a",
  verticalAlign: "middle",
};
