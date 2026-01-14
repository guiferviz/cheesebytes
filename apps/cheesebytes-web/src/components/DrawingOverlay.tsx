import React, { useRef, useState, useEffect, useCallback } from 'react';

type Tool = 'pen' | 'rectangle' | 'circle' | 'eraser';

interface Point {
  x: number;
  y: number;
}

interface DrawingOverlayProps {
  activationKey?: string; // Key to activate (default: 'p')
  disableCursorStyles?: boolean; // Disable cursor changes (useful when using custom cursor)
}

const COLORS = [
  '#ef4444', // red
  '#f97316', // orange
  '#eab308', // yellow
  '#22c55e', // green
  '#3b82f6', // blue
  '#8b5cf6', // violet
  '#ec4899', // pink
  '#ffffff', // white
  '#000000', // black
];

const STROKE_WIDTHS = [2, 4, 8, 12, 20];

const DrawingOverlay: React.FC<DrawingOverlayProps> = ({ activationKey = 'p', disableCursorStyles = false }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isActive, setIsActive] = useState(false);
  const [isToolbarOpen, setIsToolbarOpen] = useState(false);
  const [currentTool, setCurrentTool] = useState<Tool>('pen');
  const [strokeColor, setStrokeColor] = useState('#ef4444');
  const [strokeWidth, setStrokeWidth] = useState(4);
  const [isDrawing, setIsDrawing] = useState(false);
  const [startPoint, setStartPoint] = useState<Point | null>(null);
  const [isDarkMode, setIsDarkMode] = useState(true);
  
  // Store all drawings to redraw on resize
  const drawingsRef = useRef<ImageData | null>(null);
  
  // For smooth lines - store last point
  const lastPointRef = useRef<Point | null>(null);

  // Detect theme changes
  useEffect(() => {
    const checkTheme = () => {
      const isDark = document.documentElement.classList.contains('dark');
      setIsDarkMode(isDark);
    };
    
    // Initial check
    checkTheme();
    
    // Observe class changes on html element
    const observer = new MutationObserver(checkTheme);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    
    return () => observer.disconnect();
  }, []);

  // Resize canvas to window size
  const resizeCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    // Save current drawing
    const ctx = canvas.getContext('2d');
    if (ctx && canvas.width > 0 && canvas.height > 0) {
      drawingsRef.current = ctx.getImageData(0, 0, canvas.width, canvas.height);
    }
    
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    
    // Restore drawing
    if (ctx && drawingsRef.current) {
      ctx.putImageData(drawingsRef.current, 0, 0);
    }
  }, []);

  // Initialize canvas and event listeners
  useEffect(() => {
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    
    const handleKeyDown = (e: KeyboardEvent) => {
      // Toggle with activation key
      if (e.key.toLowerCase() === activationKey.toLowerCase() && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        setIsActive(prev => {
          if (prev) setIsToolbarOpen(false); // Close toolbar when deactivating
          return !prev;
        });
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    
    return () => {
      window.removeEventListener('resize', resizeCanvas);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [activationKey, isActive, resizeCanvas]);

  // Get coordinates from event
  const getCoords = (e: React.MouseEvent | React.TouchEvent): Point => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    
    if ('touches' in e) {
      return {
        x: e.touches[0].clientX - rect.left,
        y: e.touches[0].clientY - rect.top,
      };
    }
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  };

  // Interpolate points for smoother lines
  const interpolatePoints = (p1: Point, p2: Point, steps: number): Point[] => {
    const points: Point[] = [];
    for (let i = 1; i <= steps; i++) {
      const t = i / steps;
      points.push({
        x: p1.x + (p2.x - p1.x) * t,
        y: p1.y + (p2.y - p1.y) * t,
      });
    }
    return points;
  };

  // Drawing handlers
  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isActive) return;
    
    const coords = getCoords(e);
    setIsDrawing(true);
    setStartPoint(coords);
    lastPointRef.current = coords;
    
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!ctx || !canvas) return;
    
    if (currentTool === 'pen' || currentTool === 'eraser') {
      ctx.beginPath();
      ctx.moveTo(coords.x, coords.y);
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.strokeStyle = currentTool === 'eraser' ? 'rgba(0,0,0,1)' : strokeColor;
      ctx.lineWidth = currentTool === 'eraser' ? strokeWidth * 3 : strokeWidth;
      if (currentTool === 'eraser') {
        ctx.globalCompositeOperation = 'destination-out';
      } else {
        ctx.globalCompositeOperation = 'source-over';
      }
    } else {
      // Para shapes, guardamos el estado actual del canvas
      drawingsRef.current = ctx.getImageData(0, 0, canvas.width, canvas.height);
    }
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing || !isActive) return;
    
    const coords = getCoords(e);
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!ctx || !canvas || !startPoint) return;
    
    if (currentTool === 'pen' || currentTool === 'eraser') {
      const lastPoint = lastPointRef.current || coords;
      
      // Calculate distance between points
      const distance = Math.sqrt(
        Math.pow(coords.x - lastPoint.x, 2) + Math.pow(coords.y - lastPoint.y, 2)
      );
      
      // Interpolate if distance is large (for smoother curves)
      if (distance > 2) {
        const steps = Math.min(Math.ceil(distance / 2), 10);
        const interpolated = interpolatePoints(lastPoint, coords, steps);
        
        for (const point of interpolated) {
          ctx.lineTo(point.x, point.y);
        }
      } else {
        ctx.lineTo(coords.x, coords.y);
      }
      
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(coords.x, coords.y);
      
      lastPointRef.current = coords;
    } else {
      // Para shapes, restauramos y dibujamos la preview
      if (drawingsRef.current) {
        ctx.putImageData(drawingsRef.current, 0, 0);
      }
      
      ctx.beginPath();
      ctx.strokeStyle = strokeColor;
      ctx.lineWidth = strokeWidth;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.globalCompositeOperation = 'source-over';
      
      if (currentTool === 'rectangle') {
        const width = coords.x - startPoint.x;
        const height = coords.y - startPoint.y;
        ctx.strokeRect(startPoint.x, startPoint.y, width, height);
      } else if (currentTool === 'circle') {
        const radius = Math.sqrt(
          Math.pow(coords.x - startPoint.x, 2) + Math.pow(coords.y - startPoint.y, 2)
        );
        ctx.arc(startPoint.x, startPoint.y, radius, 0, Math.PI * 2);
        ctx.stroke();
      }
    }
  };

  const stopDrawing = () => {
    if (!isDrawing) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (ctx) {
      ctx.globalCompositeOperation = 'source-over';
      // Guardar estado final
      if (canvas) {
        drawingsRef.current = ctx.getImageData(0, 0, canvas.width, canvas.height);
      }
    }
    
    setIsDrawing(false);
    setStartPoint(null);
    lastPointRef.current = null;
  };

  // Clear canvas
  const clearCanvas = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (ctx && canvas) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      drawingsRef.current = null;
    }
  };

  // Tool icons as SVG
  const ToolIcon = ({ tool }: { tool: Tool }) => {
    switch (tool) {
      case 'pen':
        return (
          <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 19l7-7 3 3-7 7-3-3z" />
            <path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z" />
            <path d="M2 2l7.586 7.586" />
            <circle cx="11" cy="11" r="2" />
          </svg>
        );
      case 'rectangle':
        return (
          <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="3" width="18" height="18" rx="2" />
          </svg>
        );
      case 'circle':
        return (
          <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="9" />
          </svg>
        );
      case 'eraser':
        return (
          <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M20 20H7L3 16c-.6-.6-.6-1.5 0-2.1l10-10c.6-.6 1.5-.6 2.1 0l6.9 6.9c.6.6.6 1.5 0 2.1L15 20" />
            <path d="M6 11l4 4" />
          </svg>
        );
    }
  };

  return (
    <>
      {/* Canvas overlay */}
      <canvas
        ref={canvasRef}
        className={`fixed inset-0 z-[10000] transition-opacity duration-200 ${
          isActive ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        style={{ 
          cursor: disableCursorStyles 
            ? 'none'
            : isActive 
              ? currentTool === 'eraser' 
                ? 'cell' 
                : 'crosshair' 
              : 'default',
          touchAction: 'none',
        }}
        onMouseDown={startDrawing}
        onMouseMove={draw}
        onMouseUp={stopDrawing}
        onMouseLeave={stopDrawing}
        onTouchStart={startDrawing}
        onTouchMove={draw}
        onTouchEnd={stopDrawing}
      />

      {/* FAB Button - Bottom right corner */}
      <button
        onClick={() => setIsToolbarOpen(true)}
        className={`fixed bottom-6 right-6 z-[10001] w-14 h-14 rounded-full shadow-lg flex items-center justify-center transition-all duration-300 bg-gradient-to-br from-yellow-400 to-orange-500 text-white hover:scale-105 ${
          isActive && !isToolbarOpen ? 'opacity-100 scale-100' : 'opacity-0 scale-75 pointer-events-none'
        }`}
        style={{ cursor: disableCursorStyles ? 'none' : 'pointer' }}
        title="Open drawing tools"
      >
        <svg viewBox="0 0 24 24" className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M12 19l7-7 3 3-7 7-3-3z" />
          <path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z" />
          <path d="M2 2l7.586 7.586" />
        </svg>
      </button>

      {/* Toolbar Panel - Bottom center */}
      <div
        className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-[10001] transition-all duration-300 ${
          isActive && isToolbarOpen ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-4 scale-95 pointer-events-none'
        }`}
      >
        {/* Main toolbar container */}
        <div className={`flex items-center gap-3 p-3 backdrop-blur-sm rounded-2xl shadow-2xl border transition-colors duration-300 ${
          isDarkMode 
            ? 'bg-gray-900/95 border-gray-700/50' 
            : 'bg-white/95 border-gray-200'
        }`}>
          {/* Close button */}
          <button
            onClick={() => setIsToolbarOpen(false)}
            className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-200 ${
              isDarkMode
                ? 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white'
                : 'bg-gray-100 text-gray-500 hover:bg-gray-200 hover:text-gray-700'
            }`}
            title="Close toolbar"
          >
            <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18" />
              <path d="M6 6l12 12" />
            </svg>
          </button>

          <div className={`w-px h-8 ${isDarkMode ? 'bg-gray-700' : 'bg-gray-200'}`} />

          {/* Tools section */}
          <div className={`flex items-center gap-1.5 pr-3 border-r ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
            {(['pen', 'rectangle', 'circle', 'eraser'] as Tool[]).map((tool) => (
              <button
                key={tool}
                onClick={() => setCurrentTool(tool)}
                className={`w-11 h-11 rounded-xl flex items-center justify-center transition-all duration-200 ${
                  currentTool === tool
                    ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/30 scale-105'
                    : isDarkMode
                      ? 'bg-gray-800 text-gray-300 hover:bg-gray-700 hover:text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200 hover:text-gray-800'
                }`}
                title={tool.charAt(0).toUpperCase() + tool.slice(1)}
              >
                <ToolIcon tool={tool} />
              </button>
            ))}
          </div>

          {/* Colors section */}
          <div className={`flex items-center gap-2 px-3 border-r ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
            <span className={`text-xs font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Color</span>
            <div className="flex items-center gap-1.5">
              {COLORS.map((color) => (
                <button
                  key={color}
                  onClick={() => setStrokeColor(color)}
                  className={`w-7 h-7 rounded-full transition-all duration-200 hover:scale-110 ${
                    strokeColor === color 
                      ? isDarkMode
                        ? 'ring-2 ring-white ring-offset-2 ring-offset-gray-900 scale-110'
                        : 'ring-2 ring-gray-800 ring-offset-2 ring-offset-white scale-110'
                      : isDarkMode
                        ? 'ring-1 ring-gray-600'
                        : 'ring-1 ring-gray-300'
                  }`}
                  style={{ backgroundColor: color }}
                  title={color}
                />
              ))}
            </div>
          </div>

          {/* Stroke width section */}
          <div className={`flex items-center gap-2 px-3 border-r ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
            <span className={`text-xs font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Size</span>
            <div className="flex items-center gap-1">
              {STROKE_WIDTHS.map((width) => (
                <button
                  key={width}
                  onClick={() => setStrokeWidth(width)}
                  className={`w-9 h-9 rounded-lg flex items-center justify-center transition-all duration-200 ${
                    strokeWidth === width
                      ? isDarkMode ? 'bg-gray-700' : 'bg-gray-200'
                      : isDarkMode ? 'hover:bg-gray-800' : 'hover:bg-gray-100'
                  }`}
                  title={`${width}px`}
                >
                  <div
                    className="rounded-full"
                    style={{
                      width: `${Math.min(width * 1.5 + 4, 20)}px`,
                      height: `${Math.min(width, 12)}px`,
                      backgroundColor: strokeColor,
                    }}
                  />
                </button>
              ))}
            </div>
          </div>

          {/* Clear button */}
          <button
            onClick={clearCanvas}
            className="w-11 h-11 rounded-xl bg-red-500/20 text-red-400 flex items-center justify-center hover:bg-red-500/30 hover:text-red-300 transition-all duration-200"
            title="Clear all"
          >
            <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 6h18" />
              <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
              <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
              <line x1="10" y1="11" x2="10" y2="17" />
              <line x1="14" y1="11" x2="14" y2="17" />
            </svg>
          </button>
        </div>
      </div>

      {/* Indicator when drawing mode is active */}
      <div
        className={`fixed top-4 left-1/2 -translate-x-1/2 z-[10001] px-4 py-2 rounded-full text-sm font-medium transition-all duration-300 ${
          isDarkMode ? 'bg-black/70 text-white' : 'bg-white/90 text-gray-800 shadow-lg border border-gray-200'
        } ${
          isActive ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4 pointer-events-none'
        }`}
      >
        🎨 Drawing mode · <kbd className={`px-1.5 py-0.5 rounded text-xs ${isDarkMode ? 'bg-white/20' : 'bg-gray-200'}`}>P</kbd> to exit
      </div>
    </>
  );
};

export default DrawingOverlay;
