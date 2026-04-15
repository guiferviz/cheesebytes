import React, { useEffect, useMemo, useRef, useState } from "react";
import type { VimModeAPI } from "../../../utils/vim-mode";
import { CheeseSlideContainer } from "../shared";
import { GoldMineMapViewer } from "./GoldMineMapViewer";
import { enumerateEscapePaths, parseRawMap } from "./gold-mine-viewer-shared";
import { mediumMap } from "./maps";
import { useGoldMineFullscreen } from "./useGoldMineFullscreen";

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export const GoldMinePathGallery: React.FC<{ rawMap?: string[] }> = ({
  rawMap = mediumMap,
}) => {
  const mapState = useMemo(() => parseRawMap(rawMap), [rawMap]);
  const paths = useMemo(() => enumerateEscapePaths(mapState), [mapState]);
  const aspect = useMemo(
    () => mapState.cols / mapState.rows,
    [mapState.cols, mapState.rows],
  );
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [viewerSize, setViewerSize] = useState({ width: 0, height: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const mapAreaRef = useRef<HTMLDivElement>(null);
  const wheelAccum = useRef(0);
  const { toggleFullscreen } = useGoldMineFullscreen(containerRef);

  useEffect(() => {
    setSelectedIndex((current) =>
      clamp(current, 0, Math.max(paths.length - 1, 0)),
    );
  }, [paths.length]);

  const currentPath = paths[selectedIndex] ?? [];
  const currentSteps = Math.max(0, currentPath.length - 1);
  const shortest = Math.max(0, (paths[0]?.length ?? 1) - 1);
  const longest = Math.max(0, (paths[paths.length - 1]?.length ?? 1) - 1);

  const moveSelection = (delta: number) => {
    setSelectedIndex((current) =>
      clamp(current + delta, 0, Math.max(paths.length - 1, 0)),
    );
  };

  // Throttled wheel handler — accumulate delta, step every 80px
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const THRESHOLD = 80;
    const handler = (e: WheelEvent) => {
      e.preventDefault();
      wheelAccum.current += e.deltaY;
      if (Math.abs(wheelAccum.current) >= THRESHOLD) {
        const steps = Math.sign(wheelAccum.current) < 0 ? 1 : -1;
        moveSelection(steps);
        wheelAccum.current = 0;
      }
    };
    el.addEventListener("wheel", handler, { passive: false });
    return () => el.removeEventListener("wheel", handler);
  }, [paths.length]);

  useEffect(() => {
    const root = containerRef.current;
    if (!root) return;

    const getVimMode = (): VimModeAPI | undefined =>
      (window as Window & { vimMode?: VimModeAPI }).vimMode;

    const setGalleryMode = (inside: boolean) => {
      const vm = getVimMode();
      if (!vm) return;
      if (inside) {
        vm.pushMode("gold-mine-path-gallery", {
          label: "Paths",
          extends: "normal",
          commands: [
            {
              key: "arrowup",
              label: "Next path",
              run: () => moveSelection(1),
            },
            {
              key: "arrowdown",
              label: "Previous path",
              run: () => moveSelection(-1),
            },
            {
              key: "f",
              label: "Toggle fullscreen",
              run: () => toggleFullscreen(),
            },
            {
              key: "escape",
              label: "Exit path controls",
              run: () => root.blur(),
            },
          ],
        });
      } else {
        vm.popMode("gold-mine-path-gallery");
      }
    };

    const focusRoot = () => {
      root.focus({ preventScroll: true });
      setGalleryMode(true);
    };

    const syncMode = () => {
      requestAnimationFrame(() => {
        setGalleryMode(root.contains(document.activeElement));
      });
    };

    root.addEventListener("pointerdown", focusRoot, true);
    root.addEventListener("focusin", syncMode);
    root.addEventListener("focusout", syncMode);

    return () => {
      root.removeEventListener("pointerdown", focusRoot, true);
      root.removeEventListener("focusin", syncMode);
      root.removeEventListener("focusout", syncMode);
      getVimMode()?.popMode("gold-mine-path-gallery");
    };
  }, [paths.length, toggleFullscreen]);

  useEffect(() => {
    const mapArea = mapAreaRef.current;
    if (!mapArea) return;

    const updateViewerSize = () => {
      const availableWidth = mapArea.clientWidth;
      const availableHeight = mapArea.clientHeight - 10;
      if (availableWidth <= 0 || availableHeight <= 0) return;

      const widthFromHeight = availableHeight * aspect;
      const nextWidth = Math.min(availableWidth, widthFromHeight);
      const nextHeight = nextWidth / aspect;
      setViewerSize({
        width: Math.floor(nextWidth),
        height: Math.floor(nextHeight),
      });
    };

    updateViewerSize();

    const observer = new ResizeObserver(updateViewerSize);
    observer.observe(mapArea);
    return () => observer.disconnect();
  }, [aspect]);

  return (
    <CheeseSlideContainer>
      <div
        ref={containerRef}
        tabIndex={0}
        style={{
          width: "100%",
          maxWidth: 1100,
          height: "100%",
          maxHeight: "100%",
          margin: "0 auto",
          display: "grid",
          gridTemplateRows: "auto 1fr",
          gap: 10,
          overflow: "hidden",
          outline: "none",
        }}
      >
        {/* ── Top bar: sentence + stats ── */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "clamp(120px, 14vw, 200px)",
            flexWrap: "wrap",
            width: "100%",
            margin: "0 auto",
          }}
        >
          {/* Path sentence with inline arrows */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              fontSize: 15,
              color: "#c4a882",
              fontWeight: 600,
            }}
          >
            <span>Path</span>
            <span style={{ fontWeight: 800, fontSize: 18, color: "#e8d5b7" }}>
              {paths.length === 0 ? 0 : selectedIndex + 1}
            </span>
            {/* Up/down arrows */}
            <span
              style={{
                display: "inline-flex",
                flexDirection: "column",
                lineHeight: 1,
              }}
            >
              <button
                onClick={() => moveSelection(1)}
                disabled={selectedIndex >= paths.length - 1}
                aria-label="Next path"
                style={{
                  background: "none",
                  border: "none",
                  padding: "0 2px",
                  cursor:
                    selectedIndex >= paths.length - 1 ? "default" : "pointer",
                  color:
                    selectedIndex >= paths.length - 1
                      ? "rgba(180,160,130,0.2)"
                      : "rgba(200,175,140,0.5)",
                  fontSize: 11,
                  lineHeight: 1,
                  transition: "color 0.15s",
                }}
              >
                ▲
              </button>
              <button
                onClick={() => moveSelection(-1)}
                disabled={selectedIndex <= 0}
                aria-label="Previous path"
                style={{
                  background: "none",
                  border: "none",
                  padding: "0 2px",
                  cursor: selectedIndex <= 0 ? "default" : "pointer",
                  color:
                    selectedIndex <= 0
                      ? "rgba(180,160,130,0.2)"
                      : "rgba(200,175,140,0.5)",
                  fontSize: 11,
                  lineHeight: 1,
                  transition: "color 0.15s",
                }}
              >
                ▼
              </button>
            </span>
            <span
              style={{
                color: "rgba(180,160,130,0.4)",
                fontWeight: 500,
                fontSize: 14,
              }}
            >
              /{paths.length}
            </span>
            <span
              style={{
                color: "rgba(180,160,130,0.5)",
                fontWeight: 500,
                fontSize: 14,
                marginLeft: 4,
              }}
            >
              has{" "}
              <span style={{ fontWeight: 700, color: "#c4a882" }}>
                {currentSteps}
              </span>{" "}
              steps
            </span>
          </div>

          {/* Min/max stats */}
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <StatChip label="Shortest" value={shortest} />
            <StatChip label="Longest" value={longest} />
          </div>
        </div>

        {/* ── Map viewer ── */}
        <div
          ref={mapAreaRef}
          style={{
            height: "100%",
            minHeight: 0,
            overflow: "hidden",
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "center",
            paddingBottom: 10,
            boxSizing: "border-box",
          }}
        >
          <GoldMineMapViewer
            mapState={mapState}
            pathCells={currentPath}
            width={viewerSize.width > 0 ? viewerSize.width : "100%"}
            height={viewerSize.height > 0 ? viewerSize.height : undefined}
            maxWidth={viewerSize.width > 0 ? viewerSize.width : "100%"}
          />
        </div>
      </div>
    </CheeseSlideContainer>
  );
};

const StatChip: React.FC<{ label: string; value: number }> = ({
  label,
  value,
}) => (
  <div
    style={{
      minWidth: 70,
      padding: "5px 10px",
      borderRadius: 8,
      background: "rgba(30, 27, 22, 0.7)",
      border: "1px solid rgba(180, 155, 120, 0.12)",
      color: "#dac9a8",
    }}
  >
    <div
      style={{
        fontSize: 9,
        fontWeight: 600,
        opacity: 0.55,
        letterSpacing: "0.08em",
        textTransform: "uppercase",
      }}
    >
      {label}
    </div>
    <div
      style={{
        fontSize: 16,
        fontWeight: 800,
        lineHeight: 1.2,
      }}
    >
      {value}
    </div>
  </div>
);
