import React, { useRef, useState, useEffect, useCallback } from "react";

type Tool = "pen" | "rectangle" | "circle" | "eraser";
type MenuMode = "normal" | "color" | "tool" | "size" | "help";

interface Point {
  x: number;
  y: number;
}

interface DrawingOverlayProps {
  activationKey?: string; // Key to activate (default: 'p')
  disableCursorStyles?: boolean; // Disable cursor changes (useful when using custom cursor)
  enableKeyboardShortcut?: boolean; // Enable internal keyboard shortcut
}

// Color options with key bindings
const COLOR_OPTIONS = [
  { key: "r", color: "#ef4444", name: "Red" },
  { key: "o", color: "#f97316", name: "Orange" },
  { key: "y", color: "#eab308", name: "Yellow" },
  { key: "g", color: "#22c55e", name: "Green" },
  { key: "b", color: "#3b82f6", name: "Blue" },
  { key: "v", color: "#8b5cf6", name: "Violet" },
  { key: "i", color: "#ec4899", name: "pInk" },
  { key: "w", color: "#ffffff", name: "White" },
  { key: "k", color: "#000000", name: "blacK" },
];

// Tool options with key bindings
const TOOL_OPTIONS: { key: string; tool: Tool; name: string }[] = [
  { key: "p", tool: "pen", name: "Pen" },
  { key: "r", tool: "rectangle", name: "Rectangle" },
  { key: "c", tool: "circle", name: "Circle" },
  { key: "e", tool: "eraser", name: "Eraser" },
];

// Size options with key bindings
const SIZE_OPTIONS = [
  { key: "1", size: 2, name: "XS" },
  { key: "2", size: 4, name: "S" },
  { key: "3", size: 8, name: "M" },
  { key: "4", size: 12, name: "L" },
  { key: "5", size: 20, name: "XL" },
];

const MAX_HISTORY = 20;

const DrawingOverlay: React.FC<DrawingOverlayProps> = ({
  disableCursorStyles = false,
  enableKeyboardShortcut = true,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isActive, setIsActive] = useState(false);
  const [menuMode, setMenuMode] = useState<MenuMode>("normal");
  const [currentTool, setCurrentTool] = useState<Tool>("pen");
  const [strokeColor, setStrokeColor] = useState("#ef4444");
  const [strokeWidth, setStrokeWidth] = useState(4);
  const [mousePos, setMousePos] = useState<Point>({ x: 0, y: 0 });

  // Use refs for drawing state to avoid re-renders during drawing
  const isDrawingRef = useRef(false);
  const startPointRef = useRef<Point | null>(null);
  const lastPointRef = useRef<Point | null>(null);

  // Cache canvas context and rect to avoid repeated lookups
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const canvasRectRef = useRef<DOMRect | null>(null);

  // Performance refs for interaction
  const cursorRef = useRef<HTMLImageElement>(null);
  const menuModeRef = useRef(menuMode);
  const mousePosRef = useRef<Point>({ x: 0, y: 0 });

  // Performace refs for state access inside event listeners
  const strokeColorRef = useRef(strokeColor);
  const strokeWidthRef = useRef(strokeWidth);
  const currentToolRef = useRef(currentTool);

  // Sync state to refs
  useEffect(() => {
    strokeColorRef.current = strokeColor;
  }, [strokeColor]);

  useEffect(() => {
    strokeWidthRef.current = strokeWidth;
  }, [strokeWidth]);

  useEffect(() => {
    currentToolRef.current = currentTool;
  }, [currentTool]);

  // Sync menuMode ref
  useEffect(() => {
    menuModeRef.current = menuMode;
  }, [menuMode]);

  // Undo/Redo history
  const historyRef = useRef<ImageData[]>([]);
  const historyIndexRef = useRef(-1);

  // Store current drawing state
  const drawingsRef = useRef<ImageData | null>(null);

  // Track mouse position globally
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const x = e.clientX;
      const y = e.clientY;

      // Always update ref for sync
      mousePosRef.current = { x, y };

      // Direct DOM update for cursor to avoid re-renders in normal mode
      if (cursorRef.current) {
        cursorRef.current.style.left = `${x - 10}px`;
        cursorRef.current.style.top = `${y}px`;
      }

      // Only force re-render if we need to update the menu position
      if (menuModeRef.current !== "normal") {
        setMousePos({ x, y });
      }
    };
    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  // Sync cursor position when overlay becomes active
  useEffect(() => {
    if (isActive && cursorRef.current) {
      const { x, y } = mousePosRef.current;
      cursorRef.current.style.left = `${x - 10}px`;
      cursorRef.current.style.top = `${y}px`;
    }
  }, [isActive]);

  // Save state to history
  const saveToHistory = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!ctx || !canvas) return;

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

    // Remove any redo states
    historyRef.current = historyRef.current.slice(
      0,
      historyIndexRef.current + 1,
    );

    // Add new state
    historyRef.current.push(imageData);

    // Limit history size
    if (historyRef.current.length > MAX_HISTORY) {
      historyRef.current.shift();
    } else {
      historyIndexRef.current++;
    }
  }, []);

  // Undo
  const undo = useCallback(() => {
    if (historyIndexRef.current <= 0) return;

    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!ctx || !canvas) return;

    historyIndexRef.current--;
    const imageData = historyRef.current[historyIndexRef.current];
    if (imageData) {
      ctx.putImageData(imageData, 0, 0);
      drawingsRef.current = imageData;
    }
  }, []);

  // Redo
  const redo = useCallback(() => {
    if (historyIndexRef.current >= historyRef.current.length - 1) return;

    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!ctx || !canvas) return;

    historyIndexRef.current++;
    const imageData = historyRef.current[historyIndexRef.current];
    if (imageData) {
      ctx.putImageData(imageData, 0, 0);
      drawingsRef.current = imageData;
    }
  }, []);

  // Resize canvas to window size
  const resizeCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (ctx && canvas.width > 0 && canvas.height > 0) {
      drawingsRef.current = ctx.getImageData(0, 0, canvas.width, canvas.height);
    }

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    if (ctx && drawingsRef.current) {
      ctx.putImageData(drawingsRef.current, 0, 0);
    }

    // Cache context and rect after resize
    ctxRef.current = ctx;
    canvasRectRef.current = canvas.getBoundingClientRect();
  }, []);

  // Clear canvas
  const clearCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (ctx && canvas) {
      // Save current state before clearing (async)
      saveToHistory();
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      drawingsRef.current = null;
    }
  }, [saveToHistory]);

  // Initialize canvas and event listeners
  useEffect(() => {
    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);

    // Handler for keys WHILE drawing mode is active (always registered)
    const handleDrawingKeys = (e: KeyboardEvent) => {
      // Only handle when drawing mode is active
      if (!isActive) return;

      const key = e.key.toLowerCase();

      // CRITICAL: Stop propagation to prevent Reveal.js from capturing our keys
      e.stopPropagation();
      e.stopImmediatePropagation();
      e.preventDefault();

      // Handle keys based on current menu mode
      switch (menuMode) {
        case "normal":
          if (key === "c") {
            setMousePos(mousePosRef.current);
            setMenuMode("color");
          } else if (key === "t") {
            setMousePos(mousePosRef.current);
            setMenuMode("tool");
          } else if (key === "d")
            clearCanvas(); // D directly clears all
          else if (key === "s") {
            setMousePos(mousePosRef.current);
            setMenuMode("size");
          } else if (key === "h") {
            setMousePos(mousePosRef.current);
            setMenuMode("help");
          } else if (key === "u") undo();
          else if (key === "r") redo();
          else if (key === "p" || key === "escape") {
            setIsActive(false);
            setMenuMode("normal");
          }
          break;

        case "color":
          if (key === "escape") {
            setMenuMode("normal");
          } else {
            const colorOption = COLOR_OPTIONS.find((opt) => opt.key === key);
            if (colorOption) {
              setStrokeColor(colorOption.color);
              setMenuMode("normal");
            }
          }
          break;

        case "tool":
          if (key === "escape") {
            setMenuMode("normal");
          } else {
            const toolOption = TOOL_OPTIONS.find((opt) => opt.key === key);
            if (toolOption) {
              setCurrentTool(toolOption.tool);
              setMenuMode("normal");
            }
          }
          break;

        case "size":
          if (key === "escape") {
            setMenuMode("normal");
          } else {
            const sizeOption = SIZE_OPTIONS.find((opt) => opt.key === key);
            if (sizeOption) {
              setStrokeWidth(sizeOption.size);
              setMenuMode("normal");
            }
          }
          break;

        case "help":
          if (key === "escape" || key === "h") {
            setMenuMode("normal");
          }
          break;
      }
    };

    // Handler for activation key (only if enableKeyboardShortcut is true)
    const handleActivationKey = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      if (key === "p" && !e.ctrlKey && !e.metaKey && !isActive) {
        e.preventDefault();
        e.stopPropagation();
        setIsActive(true);
      }
    };

    // Listen for custom toggle event from outside (e.g. Reveal.js)
    const handleToggleEvent = () => {
      setIsActive((prev) => {
        if (prev) {
          setMenuMode("normal");
        } else {
          // Save initial state when activating drawing mode
          requestAnimationFrame(() => {
            const canvas = canvasRef.current;
            const ctx = canvas?.getContext("2d");
            if (ctx && canvas && historyRef.current.length === 0) {
              const imageData = ctx.getImageData(
                0,
                0,
                canvas.width,
                canvas.height,
              );
              historyRef.current.push(imageData);
              historyIndexRef.current = 0;
            }
          });
        }
        return !prev;
      });
    };

    // ALWAYS register drawing keys handler when component mounts (capture phase)
    window.addEventListener("keydown", handleDrawingKeys, { capture: true });

    // Only register activation key if enabled
    if (enableKeyboardShortcut) {
      window.addEventListener("keydown", handleActivationKey, {
        capture: true,
      });
    }
    window.addEventListener("toggle-drawing", handleToggleEvent);

    return () => {
      window.removeEventListener("resize", resizeCanvas);
      window.removeEventListener("keydown", handleDrawingKeys, {
        capture: true,
      });
      if (enableKeyboardShortcut) {
        window.removeEventListener("keydown", handleActivationKey, {
          capture: true,
        });
      }
      window.removeEventListener("toggle-drawing", handleToggleEvent);
    };
  }, [
    isActive,
    menuMode,
    resizeCanvas,
    clearCanvas,
    undo,
    redo,
    enableKeyboardShortcut,
  ]);

  // Drawing handlers - use refs to avoid re-renders during drawing
  const startDrawing = useCallback(
    (e: PointerEvent) => {
      if (!isActive || menuModeRef.current !== "normal") return;

      // Ensure we capture pointer events for tracking outside canvas if needed
      (e.target as HTMLElement).setPointerCapture(e.pointerId);

      const ctx = ctxRef.current;
      const rect = canvasRectRef.current;
      if (!ctx || !rect) return;

      const coords = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      };

      isDrawingRef.current = true;
      startPointRef.current = coords;
      lastPointRef.current = coords;

      const tool = currentToolRef.current;
      const color = strokeColorRef.current;
      const width = strokeWidthRef.current;

      if (tool === "pen" || tool === "eraser") {
        ctx.beginPath();
        ctx.moveTo(coords.x, coords.y);
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        ctx.strokeStyle = tool === "eraser" ? "rgba(0,0,0,1)" : color;
        ctx.lineWidth = tool === "eraser" ? width * 3 : width;
        ctx.globalCompositeOperation =
          tool === "eraser" ? "destination-out" : "source-over";

        // Draw initial dot
        ctx.lineTo(coords.x, coords.y);
        ctx.stroke();
      } else {
        // For shapes, save current canvas state (unavoidable for shape preview)
        const canvas = canvasRef.current;
        if (canvas) {
          drawingsRef.current = ctx.getImageData(
            0,
            0,
            canvas.width,
            canvas.height,
          );
        }
      }
    },
    [isActive],
  );

  const draw = useCallback(
    (e: PointerEvent) => {
      if (
        !isDrawingRef.current ||
        !isActive ||
        menuModeRef.current !== "normal"
      )
        return;

      const ctx = ctxRef.current;
      const rect = canvasRectRef.current;
      if (!ctx || !rect || !startPointRef.current) return;

      // Process coalesced events for smoother curves if available
      const events = e.getCoalescedEvents ? e.getCoalescedEvents() : [e];

      const tool = currentToolRef.current;
      const color = strokeColorRef.current;
      const width = strokeWidthRef.current;

      if (tool === "pen" || tool === "eraser") {
        // Draw all coalesced points
        for (const event of events) {
          const coords = {
            x: event.clientX - rect.left,
            y: event.clientY - rect.top,
          };

          const lastPoint = lastPointRef.current || coords;
          const distance = Math.sqrt(
            Math.pow(coords.x - lastPoint.x, 2) +
              Math.pow(coords.y - lastPoint.y, 2),
          );

          if (distance > 2) {
            // quadratic curve usually better but linear interpolate is okay for high freq
            ctx.lineTo(coords.x, coords.y);
          } else {
            ctx.lineTo(coords.x, coords.y);
          }

          lastPointRef.current = coords;
        }
        ctx.stroke();

        // Begin new path from last point to ensure continuity without gaps
        if (lastPointRef.current) {
          ctx.beginPath();
          ctx.moveTo(lastPointRef.current.x, lastPointRef.current.y);
        }
      } else {
        // Shapes logic remains similar but uses the latest event
        const coords = {
          x: e.clientX - rect.left,
          y: e.clientY - rect.top,
        };

        // For shapes, restore and draw preview
        if (drawingsRef.current) {
          ctx.putImageData(drawingsRef.current, 0, 0);
        }

        ctx.beginPath();
        ctx.strokeStyle = color;
        ctx.lineWidth = width;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        ctx.globalCompositeOperation = "source-over";

        const startPoint = startPointRef.current;
        if (tool === "rectangle") {
          const width = coords.x - startPoint.x;
          const height = coords.y - startPoint.y;
          ctx.strokeRect(startPoint.x, startPoint.y, width, height);
        } else if (tool === "circle") {
          const radius = Math.sqrt(
            Math.pow(coords.x - startPoint.x, 2) +
              Math.pow(coords.y - startPoint.y, 2),
          );
          ctx.arc(startPoint.x, startPoint.y, radius, 0, Math.PI * 2);
          ctx.stroke();
        }
      }
    },
    [isActive],
  );

  const stopDrawing = useCallback(
    (e: PointerEvent) => {
      if (!isDrawingRef.current) return;

      isDrawingRef.current = false;
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);

      const canvas = canvasRef.current;
      const ctx = ctxRef.current;
      if (ctx && canvas) {
        ctx.globalCompositeOperation = "source-over";
        ctx.beginPath(); // Close any open path

        // Save to history AFTER stroke is complete (async to not block)
        drawingsRef.current = ctx.getImageData(
          0,
          0,
          canvas.width,
          canvas.height,
        );
        requestAnimationFrame(() => {
          saveToHistory();
        });
      }
    },
    [saveToHistory],
  );

  // Attach Native Pointer Events for performance
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.addEventListener("pointerdown", startDrawing, { passive: false });
    canvas.addEventListener("pointermove", draw, { passive: false });
    canvas.addEventListener("pointerup", stopDrawing);
    canvas.addEventListener("pointercancel", stopDrawing);
    canvas.addEventListener("pointerleave", stopDrawing); // Optional

    return () => {
      canvas.removeEventListener("pointerdown", startDrawing);
      canvas.removeEventListener("pointermove", draw);
      canvas.removeEventListener("pointerup", stopDrawing);
      canvas.removeEventListener("pointercancel", stopDrawing);
      canvas.removeEventListener("pointerleave", stopDrawing);
    };
  }, [startDrawing, draw, stopDrawing]);

  // Render radial menu options in a fan shape
  const renderRadialMenu = () => {
    let options: {
      key: string;
      label: string;
      color?: string;
      active?: boolean;
      tool?: Tool;
    }[] = [];
    let title = "";

    switch (menuMode) {
      case "color":
        title = "Color";
        options = COLOR_OPTIONS.map((opt) => ({
          key: opt.key,
          label: opt.name,
          color: opt.color,
          active: strokeColor === opt.color,
        }));
        break;
      case "tool":
        title = "Tool";
        options = TOOL_OPTIONS.map((opt) => ({
          key: opt.key,
          label: opt.name,
          tool: opt.tool,
          active: currentTool === opt.tool,
        }));
        break;
      case "size":
        title = "Size";
        options = SIZE_OPTIONS.map((opt) => ({
          key: opt.key,
          label: opt.name,
          active: strokeWidth === opt.size,
        }));
        break;
      case "help":
        title = "Help";
        options = [
          { key: "c", label: "Color" },
          { key: "t", label: "Tool" },
          { key: "s", label: "Size" },
          { key: "d", label: "Delete All" },
          { key: "u", label: "Undo" },
          { key: "r", label: "Redo" },
          { key: "p", label: "Exit" },
        ];
        break;
      default:
        return null;
    }

    // Tool icons as SVG
    const ToolIcon = ({ tool }: { tool: Tool }) => {
      switch (tool) {
        case "pen":
          return (
            <svg
              viewBox="0 0 24 24"
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M12 19l7-7 3 3-7 7-3-3z" />
              <path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z" />
              <path d="M2 2l7.586 7.586" />
              <circle cx="11" cy="11" r="2" />
            </svg>
          );
        case "rectangle":
          return (
            <svg
              viewBox="0 0 24 24"
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <rect x="3" y="3" width="18" height="18" rx="2" />
            </svg>
          );
        case "circle":
          return (
            <svg
              viewBox="0 0 24 24"
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <circle cx="12" cy="12" r="9" />
            </svg>
          );
        case "eraser":
          return (
            <svg
              viewBox="0 0 24 24"
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M20 20H7L3 16c-.6-.6-.6-1.5 0-2.1l10-10c.6-.6 1.5-.6 2.1 0l6.9 6.9c.6.6.6 1.5 0 2.1L15 20" />
              <path d="M6 11l4 4" />
            </svg>
          );
      }
    };

    // Calculate positions in a fan/arc on the right side of cursor
    // Cursor tip is approximately 64px below mousePos
    const cursorTipOffset = 32; // Offset to cursor tip area
    const radius = 120; // Larger radius for more spacing
    const startAngle = -70; // degrees from horizontal
    const endAngle = 70;
    const angleStep =
      options.length > 1 ? (endAngle - startAngle) / (options.length - 1) : 0;

    return (
      <div
        className="fixed z-[10003] pointer-events-none"
        style={{
          left: mousePos.x,
          top: mousePos.y + cursorTipOffset,
        }}
      >
        {/* Title badge - LEFT side of cursor */}
        <div
          className="absolute bg-gray-900/95 text-white text-sm font-bold px-3 py-1.5 rounded-lg backdrop-blur-sm border border-gray-600 shadow-xl"
          style={{
            right: 40, // Closer to cursor
            top: 0,
            transform: "translateY(-50%)",
            whiteSpace: "nowrap",
          }}
        >
          {title}
          <span className="text-gray-400 text-xs ml-2">(Esc)</span>
        </div>

        {/* Options in arc */}
        {options.map((opt, index) => {
          const angle =
            options.length === 1 ? 0 : startAngle + index * angleStep;
          const radian = (angle * Math.PI) / 180;
          const x = Math.cos(radian) * radius;
          const y = Math.sin(radian) * radius;

          const isColorMenu = menuMode === "color";
          const isToolMenu = menuMode === "tool";

          // Smaller size for color circles
          const circleSize = isColorMenu ? "w-7 h-7" : "w-12 h-12";
          const badgeSize = isColorMenu
            ? "w-5 h-5 text-[10px]"
            : "w-6 h-6 text-xs";

          return (
            <div
              key={opt.key}
              className={`absolute flex items-center transition-all duration-150 ${
                opt.active ? "scale-110" : ""
              }`}
              style={{
                left: x,
                top: y,
                transform: "translate(-50%, -50%)",
              }}
            >
              {/* Main circle with integrated key badge */}
              <div className="relative">
                {/* Color circle or tool icon container */}
                <div
                  className={`${circleSize} rounded-full flex items-center justify-center shadow-xl border-2 ${
                    opt.active
                      ? "border-white ring-2 ring-white/50 ring-offset-2 ring-offset-black"
                      : "border-gray-500/50"
                  }`}
                  style={{
                    backgroundColor:
                      opt.color || (opt.active ? "#3b82f6" : "#1f2937"),
                  }}
                >
                  {isToolMenu && opt.tool ? (
                    <span className="text-white">
                      <ToolIcon tool={opt.tool} />
                    </span>
                  ) : (
                    !isColorMenu && (
                      <span className="text-white text-sm font-bold">
                        {opt.label.slice(0, 2)}
                      </span>
                    )
                  )}
                </div>
                {/* Key badge - attached to the circle */}
                <div
                  className={`absolute -bottom-1 -right-1 ${badgeSize} rounded-md flex items-center justify-center font-mono font-bold uppercase shadow-lg ${
                    opt.active
                      ? "bg-white text-gray-900"
                      : "bg-gray-700 text-white border border-gray-500"
                  }`}
                >
                  {opt.key}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <>
      {/* Canvas overlay */}
      <canvas
        ref={canvasRef}
        className={`fixed inset-0 z-[10000] transition-opacity duration-200 ${
          isActive
            ? "opacity-100 pointer-events-auto"
            : "opacity-0 pointer-events-none"
        }`}
        style={{
          cursor: disableCursorStyles ? "none" : "crosshair",
          touchAction: "none",
        }}
        // Event listeners are now attached via useEffect for better performance
      />

      {/* Palette indicator - top-left of cursor, tilted as if held */}
      {isActive && (
        <img
          ref={cursorRef}
          src="/cursors/palette.png"
          alt="Drawing mode active"
          className="fixed z-[10002] pointer-events-none w-14 h-14 transition-opacity duration-200"
          style={{
            opacity: 1,
            transform: "rotate(-25deg)",
            transformOrigin: "bottom right",
          }}
        />
      )}

      {/* Radial menu (including help mode) */}
      {isActive && menuMode !== "normal" && renderRadialMenu()}
    </>
  );
};

export default DrawingOverlay;
