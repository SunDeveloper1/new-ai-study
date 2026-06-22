import React, { useRef, useState, useEffect } from "react";
import {
  RotateCcw,
  Trash2,
  Type,
  Square,
  Circle,
  TrendingUp,
  Eraser,
  PenTool,
  Grid,
  Check,
  Undo2,
  Sparkles
} from "lucide-react";

interface CanvasEditorProps {
  canvasDataString?: string;
  onChange: (dataString: string) => void;
}

type Point = { x: number; y: number };

type CanvasElement =
  | {
      id: string;
      type: "pencil" | "line" | "rect" | "ellipse" | "eraser";
      points: Point[];
      color: string;
      width: number;
      brushStyle?: "pencil" | "crayon" | "watercolor" | "marker" | "highlighter";
    }
  | {
      id: string;
      type: "text";
      x: number;
      y: number;
      text: string;
      color: string;
      fontSize: number;
    };

const CURATED_COLORS = [
  "#2563eb", // Royal Blue
  "#1e293b", // Slate Black
  "#e11d48", // Rose Red
  "#0d9488", // Bright Teal
  "#d97706", // Warm Amber
  "#059669", // Emerald Green
  "#7c3aed", // Indigo Purple
  "#ea580c", // Coral Orange
];

export default function CanvasEditor({ canvasDataString, onChange }: CanvasEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  const [elements, setElements] = useState<CanvasElement[]>([]);
  const [undoStack, setUndoStack] = useState<CanvasElement[][]>([]);
  
  const [currentTool, setCurrentTool] = useState<"pencil" | "line" | "rect" | "ellipse" | "text" | "eraser">("pencil");
  const [brushStyle, setBrushStyle] = useState<"pencil" | "crayon" | "watercolor" | "marker" | "highlighter">("pencil");
  const [autoCorrect, setAutoCorrect] = useState<boolean>(false);
  const [bgColor, setBgColor] = useState<string>("white");
  const [currentColor, setCurrentColor] = useState<string>("#2563eb");
  const [currentWidth, setCurrentWidth] = useState<number>(6);
  const [showGrid, setShowGrid] = useState<boolean>(true);
  
  // Interactive drawing states
  const [isDrawing, setIsDrawing] = useState<boolean>(false);
  const [startPoint, setStartPoint] = useState<Point>({ x: 0, y: 0 });
  const [currentPoints, setCurrentPoints] = useState<Point[]>([]);
  const [textInputState, setTextInputState] = useState<{ x: number; y: number; value: string } | null>(null);

  // Parse initial canvas data on mount/slide change
  useEffect(() => {
    if (canvasDataString) {
      try {
        const parsed = JSON.parse(canvasDataString);
        if (parsed && typeof parsed === "object" && "elements" in parsed) {
          setElements(parsed.elements || []);
          setBgColor(parsed.bgColor || "white");
          setUndoStack([]); // Reset stack on distinct slides
        } else if (Array.isArray(parsed)) {
          setElements(parsed);
          setBgColor("white");
          setUndoStack([]);
        } else {
          setElements([]);
          setBgColor("white");
        }
      } catch (e) {
        setElements([]);
        setBgColor("white");
      }
    } else {
      setElements([]);
      setBgColor("white");
    }
  }, [canvasDataString]);

  // Handle saving
  const saveState = (newElements: CanvasElement[]) => {
    setUndoStack((prev) => [...prev.slice(-19), elements]);
    setElements(newElements);
    
    const payload = {
      elements: newElements,
      bgColor,
    };
    onChange(JSON.stringify(payload));
  };

  // Resize handler to match container
  useEffect(() => {
    const handleResize = () => {
      const canvas = canvasRef.current;
      const container = containerRef.current;
      if (!canvas || !container) return;
      
      const rect = container.getBoundingClientRect();
      // Ensure we have a spacious, high-DPI canvas
      canvas.width = rect.width * 2;
      canvas.height = Math.max(520, rect.height) * 2;
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${Math.max(520, rect.height)}px`;
    };

    window.addEventListener("resize", handleResize);
    // Initial paint delay to ensure parent dimensions are accurately computed
    const timer = setTimeout(() => {
      handleResize();
    }, 150);

    return () => {
      window.removeEventListener("resize", handleResize);
      clearTimeout(timer);
    };
  }, [containerRef.current]);

  // Redraw loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Whiteboard background style and grid matching
    let canvasBgColor = "#ffffff";
    let gridDotColor = "#cbd5e1";
    if (bgColor === "warm") {
      canvasBgColor = "#faf6ef";
      gridDotColor = "#e6decb";
    } else if (bgColor === "slate") {
      canvasBgColor = "#1e293b";
      gridDotColor = "#334155";
    } else if (bgColor === "blueprint") {
      canvasBgColor = "#0f172a";
      gridDotColor = "#1e293b";
    }

    // Clear and fill the canvas background with the chosen color
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    ctx.scale(2, 2);

    ctx.fillStyle = canvasBgColor;
    ctx.fillRect(0, 0, canvas.width / 2, canvas.height / 2);

    // Dotted whiteboard grid background
    if (showGrid) {
      ctx.fillStyle = gridDotColor;
      const dotSpacing = 24;
      const containerWidth = canvas.width / 2;
      const containerHeight = canvas.height / 2;
      
      for (let x = dotSpacing; x < containerWidth; x += dotSpacing) {
        for (let y = dotSpacing; y < containerHeight; y += dotSpacing) {
          ctx.beginPath();
          ctx.arc(x, y, 1.1, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }

    // Apply different brush configurations to rendering context
    const applyBrushConfig = (
      context: CanvasRenderingContext2D,
      style: "pencil" | "crayon" | "watercolor" | "marker" | "highlighter",
      color: string,
      width: number
    ) => {
      context.strokeStyle = color;
      context.lineCap = "round";
      context.lineJoin = "round";
      context.setLineDash([]);
      context.shadowBlur = 0;
      context.globalAlpha = 1.0;

      if (style === "crayon") {
        context.globalAlpha = 0.55;
        context.lineWidth = width;
        context.setLineDash([1, 3]);
        context.shadowBlur = 1;
        context.shadowColor = color;
      } else if (style === "watercolor") {
        context.globalAlpha = 0.12;
        context.lineWidth = width * 2.2;
        context.shadowBlur = 10;
        context.shadowColor = color;
      } else if (style === "highlighter") {
        context.globalAlpha = 0.32;
        context.lineWidth = width * 1.8;
      } else if (style === "marker") {
        context.globalAlpha = 0.88;
        context.lineWidth = width;
      } else {
        // Standard high-fidelity pencil
        context.globalAlpha = 0.95;
        context.lineWidth = width;
      }
    };

    // Draw a smoothed curve with Bezier interpolation
    const drawSmoothedPath = (context: CanvasRenderingContext2D, points: Point[]) => {
      if (points.length < 2) return;
      context.beginPath();
      context.moveTo(points[0].x, points[0].y);
      if (points.length === 2) {
        context.lineTo(points[1].x, points[1].y);
      } else {
        for (let i = 1; i < points.length - 1; i++) {
          const xc = (points[i].x + points[i + 1].x) / 2;
          const yc = (points[i].y + points[i + 1].y) / 2;
          context.quadraticCurveTo(points[i].x, points[i].y, xc, yc);
        }
        context.lineTo(points[points.length - 1].x, points[points.length - 1].y);
      }
      context.stroke();
    };

    // Draw saved actions / items
    const drawItem = (elem: CanvasElement) => {
      if (elem.type === "text") {
        ctx.fillStyle = elem.color;
        ctx.font = `650 ${elem.fontSize}px "Inter", system-ui, sans-serif`;
        ctx.textBaseline = "top";
        ctx.fillText(elem.text, elem.x, elem.y);
        return;
      }

      if (elem.points.length < 2) return;

      if (elem.type === "eraser") {
        ctx.strokeStyle = canvasBgColor;
        ctx.lineWidth = elem.width;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        ctx.globalAlpha = 1.0;
        ctx.setLineDash([]);
        ctx.shadowBlur = 0;
        drawSmoothedPath(ctx, elem.points);
        return;
      }

      const style = elem.brushStyle || "pencil";
      applyBrushConfig(ctx, style, elem.color, elem.width);

      if (elem.type === "pencil") {
        drawSmoothedPath(ctx, elem.points);
      } else if (elem.type === "line") {
        ctx.beginPath();
        ctx.moveTo(elem.points[0].x, elem.points[0].y);
        ctx.lineTo(elem.points[1].x, elem.points[1].y);
        ctx.stroke();
      } else if (elem.type === "rect") {
        const start = elem.points[0];
        const end = elem.points[1];
        ctx.strokeRect(start.x, start.y, end.x - start.x, end.y - start.y);
      } else if (elem.type === "ellipse") {
        const start = elem.points[0];
        const end = elem.points[1];
        const cx = (start.x + end.x) / 2;
        const cy = (start.y + end.y) / 2;
        const rx = Math.abs(end.x - start.x) / 2;
        const ry = Math.abs(end.y - start.y) / 2;
        ctx.beginPath();
        ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
        ctx.stroke();
      }
    };

    // Render all elements sequentially
    elements.forEach(drawItem);

    // Draw active live preview stroke if drawing
    if (isDrawing && currentPoints.length > 0) {
      if (currentTool === "eraser") {
        ctx.strokeStyle = canvasBgColor;
        ctx.lineWidth = currentWidth;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        ctx.globalAlpha = 1.0;
        ctx.setLineDash([]);
        ctx.shadowBlur = 0;
        drawSmoothedPath(ctx, currentPoints);
      } else if (currentTool === "pencil") {
        applyBrushConfig(ctx, brushStyle, currentColor, currentWidth);
        drawSmoothedPath(ctx, currentPoints);
      } else {
        applyBrushConfig(ctx, brushStyle, currentColor, currentWidth);
        ctx.beginPath();
        if (currentTool === "line" && currentPoints.length >= 2) {
          ctx.moveTo(currentPoints[0].x, currentPoints[0].y);
          ctx.lineTo(currentPoints[1].x, currentPoints[1].y);
          ctx.stroke();
        } else if (currentTool === "rect" && currentPoints.length >= 2) {
          const start = currentPoints[0];
          const end = currentPoints[1];
          ctx.strokeRect(start.x, start.y, end.x - start.x, end.y - start.y);
        } else if (currentTool === "ellipse" && currentPoints.length >= 2) {
          const start = currentPoints[0];
          const end = currentPoints[1];
          const cx = (start.x + end.x) / 2;
          const cy = (start.y + end.y) / 2;
          const rx = Math.abs(end.x - start.x) / 2;
          const ry = Math.abs(end.y - start.y) / 2;
          ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
          ctx.stroke();
        }
      }
    }

    ctx.restore();
  }, [elements, isDrawing, currentPoints, currentTool, currentColor, currentWidth, showGrid, bgColor, brushStyle]);

  // Compute local coordinates
  const getCanvasCoords = (e: React.MouseEvent<HTMLCanvasElement>): Point => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const coords = getCanvasCoords(e);
    
    if (currentTool === "text") {
      setTextInputState({
        x: coords.x,
        y: coords.y,
        value: "",
      });
      return;
    }

    setIsDrawing(true);
    setStartPoint(coords);
    
    if (currentTool === "pencil" || currentTool === "eraser") {
      setCurrentPoints([coords]);
    } else {
      setCurrentPoints([coords, coords]);
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const coords = getCanvasCoords(e);

    if (currentTool === "pencil" || currentTool === "eraser") {
      setCurrentPoints((prev) => [...prev, coords]);
    } else {
      setCurrentPoints([startPoint, coords]);
    }
  };

  const handleMouseUp = () => {
    if (!isDrawing) return;
    setIsDrawing(false);

    if (currentPoints.length < 1) return;

    // Filter tiny operations
    if (currentTool === "pencil" && currentPoints.length < 2) return;

    const id = `elem_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`;
    let finalElement: CanvasElement = {
      id,
      type: currentTool as any,
      points: currentPoints,
      color: currentTool === "eraser" ? "#ffffff" : currentColor,
      width: currentWidth,
    };

    // Auto-Correct logic
    if (autoCorrect && currentTool === "pencil" && currentPoints.length >= 6) {
      const start = currentPoints[0];
      const end = currentPoints[currentPoints.length - 1];
      const dist = Math.hypot(end.x - start.x, end.y - start.y);
      
      let minX = currentPoints[0].x;
      let maxX = currentPoints[0].x;
      let minY = currentPoints[0].y;
      let maxY = currentPoints[0].y;
      let totalLength = 0;
      
      for (let i = 0; i < currentPoints.length; i++) {
        const pt = currentPoints[i];
        if (pt.x < minX) minX = pt.x;
        if (pt.x > maxX) maxX = pt.x;
        if (pt.y < minY) minY = pt.y;
        if (pt.y > maxY) maxY = pt.y;
        if (i > 0) {
          totalLength += Math.hypot(pt.x - currentPoints[i - 1].x, pt.y - currentPoints[i - 1].y);
        }
      }
      
      const widthBox = maxX - minX;
      const heightBox = maxY - minY;
      
      // Line recognition
      if (dist / totalLength > 0.85) {
        finalElement = {
          id,
          type: "line",
          points: [start, end],
          color: currentColor,
          width: currentWidth,
        };
      }
      // Ellipse/Circle or Rectangle recognition
      else if (dist < 50 && totalLength > 85) {
        const ratio = widthBox / heightBox;
        if (ratio > 0.7 && ratio < 1.45) {
          finalElement = {
            id,
            type: "ellipse",
            points: [{ x: minX, y: minY }, { x: maxX, y: maxY }],
            color: currentColor,
            width: currentWidth,
          };
        } else {
          finalElement = {
            id,
            type: "rect",
            points: [{ x: minX, y: minY }, { x: maxX, y: maxY }],
            color: currentColor,
            width: currentWidth,
          };
        }
      } else {
        finalElement = {
          id,
          type: "pencil",
          points: currentPoints,
          color: currentColor,
          width: currentWidth,
          brushStyle: brushStyle,
        };
      }
    } else if (currentTool === "pencil") {
      finalElement = {
        id,
        type: "pencil",
        points: currentPoints,
        color: currentColor,
        width: currentWidth,
        brushStyle: brushStyle,
      };
    }

    saveState([...elements, finalElement]);
    setCurrentPoints([]);
  };

  const handleUndo = () => {
    if (undoStack.length === 0) return;
    const previous = undoStack[undoStack.length - 1];
    setUndoStack((prev) => prev.slice(0, -1));
    setElements(previous);
    onChange(JSON.stringify(previous));
  };

  const handleClear = () => {
    if (confirm("Are you sure you want to clear your drawing? This cannot be undone.")) {
      saveState([]);
    }
  };

  const handleTextSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!textInputState || !textInputState.value.trim()) {
      setTextInputState(null);
      return;
    }

    const textElem: CanvasElement = {
      id: `elem_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
      type: "text",
      x: textInputState.x,
      y: textInputState.y,
      text: textInputState.value.trim(),
      color: currentColor,
      fontSize: currentWidth * 2.5 + 12, // scaled based on brush sizes nicely
    };

    saveState([...elements, textElem]);
    setTextInputState(null);
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-50 relative pointer-events-auto select-none">
      {/* 1. Control Palette Header Row */}
      <div className="px-4 py-3 bg-white border-b border-slate-200 flex flex-wrap items-center justify-between gap-4 shrink-0 shadow-2xs">
        
        {/* Draw Tools Switcher */}
        <div className="flex bg-slate-100 p-0.5 rounded-lg border border-slate-200/80">
          <button
            onClick={() => {
              setCurrentTool("pencil");
              setTextInputState(null);
            }}
            className={`p-2 rounded-md transition cursor-pointer ${
              currentTool === "pencil" ? "bg-white text-blue-600 shadow-xs" : "text-slate-500 hover:text-slate-800"
            }`}
            title="Pencil / Brush Tool"
          >
            <PenTool className="w-4 h-4" />
          </button>
          
          <button
            onClick={() => {
              setCurrentTool("line");
              setTextInputState(null);
            }}
            className={`p-2 rounded-md transition cursor-pointer ${
              currentTool === "line" ? "bg-white text-blue-600 shadow-xs" : "text-slate-500 hover:text-slate-800"
            }`}
            title="Draw straight Line"
          >
            <TrendingUp className="w-4 h-4" />
          </button>

          <button
            onClick={() => {
              setCurrentTool("rect");
              setTextInputState(null);
            }}
            className={`p-2 rounded-md transition cursor-pointer ${
              currentTool === "rect" ? "bg-white text-blue-600 shadow-xs" : "text-slate-500 hover:text-slate-800"
            }`}
            title="Draw Rectangle"
          >
            <Square className="w-4 h-4" />
          </button>

          <button
            onClick={() => {
              setCurrentTool("ellipse");
              setTextInputState(null);
            }}
            className={`p-2 rounded-md transition cursor-pointer ${
              currentTool === "ellipse" ? "bg-white text-blue-600 shadow-xs" : "text-slate-500 hover:text-slate-800"
            }`}
            title="Draw Circle/Ellipse"
          >
            <Circle className="w-4 h-4" />
          </button>

          <button
            onClick={() => {
              setCurrentTool("text");
            }}
            className={`p-2 rounded-md transition cursor-pointer ${
              currentTool === "text" ? "bg-white text-blue-600 shadow-xs" : "text-slate-500 hover:text-slate-800"
            }`}
            title="Add text annotation"
          >
            <Type className="w-4 h-4" />
          </button>

          <button
            onClick={() => {
              setCurrentTool("eraser");
              setTextInputState(null);
            }}
            className={`p-2 rounded-md transition cursor-pointer ${
              currentTool === "eraser" ? "bg-white text-rose-600 shadow-xs" : "text-slate-500 hover:text-slate-800"
            }`}
            title="Precise Eraser"
          >
            <Eraser className="w-4 h-4" />
          </button>
        </div>

        {/* Brush Styles sub-toolbar (only show when Pencil tool is active) */}
        {currentTool === "pencil" && (
          <div className="flex bg-slate-100 p-0.5 rounded-lg border border-slate-200">
            <button
              onClick={() => setBrushStyle("pencil")}
              className={`px-2 py-1 text-[11px] font-bold rounded transition flex items-center gap-1 cursor-pointer ${
                brushStyle === "pencil" ? "bg-white text-blue-650 shadow-2xs" : "text-slate-500 hover:text-slate-800"
              }`}
              title="Graphite Pencil (Fine Solid)"
            >
              <span>✏️</span>
              <span className="hidden sm:inline">Pencil</span>
            </button>
            <button
              onClick={() => setBrushStyle("crayon")}
              className={`px-2 py-1 text-[11px] font-bold rounded transition flex items-center gap-1 cursor-pointer ${
                brushStyle === "crayon" ? "bg-white text-blue-650 shadow-2xs" : "text-slate-500 hover:text-slate-800"
              }`}
              title="Textured Crayon (Rough Stroke)"
            >
              <span>🖍️</span>
              <span className="hidden sm:inline">Crayon</span>
            </button>
            <button
              onClick={() => setBrushStyle("watercolor")}
              className={`px-2 py-1 text-[11px] font-bold rounded transition flex items-center gap-1 cursor-pointer ${
                brushStyle === "watercolor" ? "bg-white text-blue-650 shadow-2xs" : "text-slate-500 hover:text-slate-800"
              }`}
              title="Watercolor Wash (Diluted Bleeding)"
            >
              <span>💧</span>
              <span className="hidden sm:inline">Water</span>
            </button>
            <button
              onClick={() => setBrushStyle("marker")}
              className={`px-2 py-1 text-[11px] font-bold rounded transition flex items-center gap-1 cursor-pointer ${
                brushStyle === "marker" ? "bg-white text-blue-650 shadow-2xs" : "text-slate-500 hover:text-slate-800"
              }`}
              title="Felt Marker (Smooth Semi-opaque)"
            >
              <span>✒️</span>
              <span className="hidden sm:inline">Marker</span>
            </button>
            <button
              onClick={() => setBrushStyle("highlighter")}
              className={`px-2 py-1 text-[11px] font-bold rounded transition flex items-center gap-1 cursor-pointer ${
                brushStyle === "highlighter" ? "bg-white text-blue-650 shadow-2xs" : "text-slate-500 hover:text-slate-800"
              }`}
              title="Transparent Highlighter"
            >
              <span>✨</span>
              <span className="hidden sm:inline">Highlight</span>
            </button>
          </div>
        )}

        {/* Dynamic Color Palette Picker (hidden for eraser) */}
        {currentTool !== "eraser" && (
          <div className="flex items-center gap-1 bg-slate-50 p-1 rounded-lg border border-slate-200">
            {CURATED_COLORS.map((col) => (
              <button
                key={col}
                onClick={() => setCurrentColor(col)}
                style={{ backgroundColor: col }}
                className={`w-5.5 h-5.5 rounded-full border transition-transform flex items-center justify-center cursor-pointer ${
                  currentColor === col ? "scale-115 shadow-xs border-indigo-400" : "border-transparent opacity-85 hover:opacity-100"
                }`}
                title={`Use color ${col}`}
              >
                {currentColor === col && (
                  <Check className="w-3 h-3 text-white drop-shadow-sm stroke-[3]" />
                )}
              </button>
            ))}
          </div>
        )}

        {/* Dynamic Brush Size Slider */}
        <div className="flex items-center gap-2.5 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 min-w-[140px]">
          <span className="text-[10px] font-bold font-mono text-slate-400 uppercase select-none">Size</span>
          <input
            type="range"
            min="1"
            max="50"
            value={currentWidth}
            onChange={(e) => setCurrentWidth(Number(e.target.value))}
            className="w-16 sm:w-24 h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600 focus:outline-none"
          />
          <span className="text-[10px] font-mono font-bold text-slate-600 bg-white border border-slate-200 px-1.5 py-0.5 rounded shadow-2xs min-w-[28px] text-center">
            {currentWidth}px
          </span>
        </div>

        {/* Shape auto-correct feature toggle with magic wand icon */}
        {currentTool === "pencil" && (
          <button
            onClick={() => setAutoCorrect(!autoCorrect)}
            className={`p-2 rounded-lg border transition cursor-pointer flex items-center gap-1.5 ${
              autoCorrect
                ? "bg-amber-50 border-amber-300 text-amber-700 font-bold hover:bg-amber-100"
                : "bg-white border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-slate-800"
            }`}
            title="Auto-Correct Shape (Snaps drawings to clean circles/rectangles/lines)"
          >
            <Sparkles className={`w-3.5 h-3.5 ${autoCorrect ? "animate-bounce text-amber-500" : ""}`} />
            <span className="text-[9px] uppercase font-bold tracking-wider hidden sm:inline">Auto-Correct</span>
          </button>
        )}

        {/* Canvas Background Color Picker (Whiteboard Backdrop) */}
        <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1">
          <span className="text-[9px] font-bold font-mono text-slate-405 uppercase select-none">Canvas</span>
          <div className="flex gap-1">
            <button
              onClick={() => {
                setBgColor("white");
                const payload = { elements, bgColor: "white" };
                onChange(JSON.stringify(payload));
              }}
              className={`w-5 h-5 rounded border shadow-3xs transition cursor-pointer bg-white ${
                bgColor === "white" ? "ring-2 ring-blue-500 border-transparent scale-110" : "border-slate-300 hover:border-slate-400"
              }`}
              title="Classic White"
            />
            <button
              onClick={() => {
                setBgColor("warm");
                const payload = { elements, bgColor: "warm" };
                onChange(JSON.stringify(payload));
              }}
              className={`w-5 h-5 rounded border shadow-3xs transition cursor-pointer bg-[#faf6ef] ${
                bgColor === "warm" ? "ring-2 ring-amber-500 border-transparent scale-110" : "border-slate-350 hover:border-slate-450"
              }`}
              title="Warm Sepia"
            />
            <button
              onClick={() => {
                setBgColor("slate");
                const payload = { elements, bgColor: "slate" };
                onChange(JSON.stringify(payload));
              }}
              className={`w-5 h-5 rounded border shadow-3xs transition cursor-pointer bg-[#1e293b] ${
                bgColor === "slate" ? "ring-2 ring-indigo-400 border-transparent scale-110" : "border-slate-750 hover:border-slate-700"
              }`}
              title="Dark Chalkboard"
            />
            <button
              onClick={() => {
                setBgColor("blueprint");
                const payload = { elements, bgColor: "blueprint" };
                onChange(JSON.stringify(payload));
              }}
              className={`w-5 h-5 rounded border shadow-3xs transition cursor-pointer bg-[#0f172a] ${
                bgColor === "blueprint" ? "ring-2 ring-indigo-500 border-transparent scale-110" : "border-slate-800 hover:border-slate-700"
              }`}
              title="Blueprint Grid"
            />
          </div>
        </div>

        {/* Undo, Grid, and Clear layout controls */}
        <div className="flex items-center gap-1.5 ml-auto">
          <button
            onClick={() => setShowGrid(!showGrid)}
            className={`p-2 rounded-lg border transition cursor-pointer ${
              showGrid
                ? "bg-indigo-50 border-indigo-200 text-indigo-700 hover:bg-indigo-100"
                : "bg-white border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-slate-800"
            }`}
            title="Toggle Whiteboard grid"
          >
            <Grid className="w-4 h-4" />
          </button>

          <button
            onClick={handleUndo}
            disabled={undoStack.length === 0}
            className="p-2 bg-white hover:bg-slate-50 text-slate-600 disabled:opacity-40 disabled:hover:bg-white border border-slate-200 rounded-lg transition cursor-pointer"
            title="Undo stroke"
          >
            <Undo2 className="w-4 h-4" />
          </button>

          <button
            onClick={handleClear}
            disabled={elements.length === 0}
            className="p-2 bg-rose-50 hover:bg-rose-100 hover:text-rose-700 text-rose-600 disabled:opacity-40 border border-rose-100 rounded-lg transition-colors cursor-pointer"
            title="Reset slide canvas sketch"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 2. Interactive Canvas container */}
      <div
        ref={containerRef}
        className="flex-1 w-full relative overflow-hidden select-none min-h-[480px]"
        style={{ cursor: "default" }}
      >
        <canvas
          ref={canvasRef}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          className="block absolute top-0 left-0 w-full h-full"
        />

        {/* Floating text input input container */}
        {textInputState && (
          <form
            onSubmit={handleTextSubmit}
            style={{ left: `${textInputState.x}px`, top: `${textInputState.y}px` }}
            className="absolute z-20 bg-white border-2 border-indigo-500 shadow-2xl rounded-lg p-1 flex items-center gap-1.5"
          >
            <input
              type="text"
              autoFocus
              value={textInputState.value}
              onChange={(e) => setTextInputState({ ...textInputState, value: e.target.value })}
              className="px-2.5 py-1 text-sm outline-none border-none font-sans font-medium text-slate-800 w-48 sm:w-64"
              placeholder="Type label here... (Press Enter)"
              onKeyDown={(e) => {
                if (e.key === "Escape") setTextInputState(null);
              }}
              onBlur={() => {
                if (textInputState.value.trim()) {
                  const textElem: CanvasElement = {
                    id: `elem_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
                    type: "text",
                    x: textInputState.x,
                    y: textInputState.y,
                    text: textInputState.value.trim(),
                    color: currentColor,
                    fontSize: currentWidth * 2.5 + 12,
                  };
                  saveState([...elements, textElem]);
                }
                setTextInputState(null);
              }}
            />
          </form>
        )}

        {/* Hint bar overlays */}
        {currentTool === "text" && !textInputState && (
          <div className="absolute left-4 bottom-4 z-10 bg-slate-900/90 text-white rounded-md text-xs px-3 py-1.5 font-sans font-medium pointer-events-none shadow-md">
            Click anywhere on the whiteboard to place a text label!
          </div>
        )}
      </div>
    </div>
  );
}
