import React from "react";
import { motion } from "motion/react";

interface SlideRendererProps {
  content: string;
  canvasData?: string;
  isReaderMode?: boolean;
  readerTheme?: "warm" | "light" | "dark";
  readerFontSize?: number;
  readerFontFamily?: "serif" | "sans" | "mono";
}

export default function SlideRenderer({
  content,
  canvasData,
  isReaderMode = false,
  readerTheme = "warm",
  readerFontSize = 18,
  readerFontFamily = "serif"
}: SlideRendererProps) {
  const lines = content.split("\n");

  // Determine typeface family
  let fontFamilyStr = '"Inter", sans-serif';
  if (readerFontFamily === "serif") {
    fontFamilyStr = '"Merriweather", Georgia, Cambria, serif';
  } else if (readerFontFamily === "mono") {
    fontFamilyStr = '"JetBrains Mono", monospace';
  }

  // Theme-specific colors for reader mode
  const isDark = readerTheme === "dark";
  const isWarm = readerTheme === "warm";

  // Parse canvas elements and background characteristics
  let canvasElements: any[] = [];
  let boardBg = "transparent";
  if (canvasData) {
    try {
      const parsed = JSON.parse(canvasData);
      if (parsed && typeof parsed === "object" && "elements" in parsed) {
        canvasElements = parsed.elements || [];
        if (parsed.bgColor === "warm") boardBg = "#faf6ef";
        else if (parsed.bgColor === "slate") boardBg = "#1e293b";
        else if (parsed.bgColor === "blueprint") boardBg = "#0f172a";
        else if (parsed.bgColor === "white") boardBg = "#ffffff";
      } else if (Array.isArray(parsed)) {
        canvasElements = parsed;
      }
    } catch (e) {}
  }

  const textColorClass = isReaderMode
    ? isDark
      ? "text-slate-200"
      : isWarm
      ? "text-[#2e261a]"
      : "text-slate-800"
    : "text-slate-800";

  const strongColorClass = isReaderMode
    ? isDark
      ? "text-white"
      : isWarm
      ? "text-[#181105]"
      : "text-slate-900"
    : "text-slate-900";

  const italicColorClass = isReaderMode
    ? isDark
      ? "text-slate-300"
      : isWarm
      ? "text-[#3d3323]"
      : "text-slate-700"
    : "text-slate-700";

  // Helper to parse bold, italic, and inline code in text safely
  const parseInlineStyles = (text: string) => {
    // Escape HTML to prevent code execution
    let clean = text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");

    // Replace bold **text** or __text__
    clean = clean.replace(
      /\*\*([^*]+)\*\*/g,
      `<strong class="font-bold ${strongColorClass}">$1</strong>`
    );
    clean = clean.replace(
      /__([^_]+)__/g,
      `<strong class="font-bold ${strongColorClass}">$1</strong>`
    );

    // Replace italic *text* or _text_
    clean = clean.replace(
      /\*([^*]+)\*/g,
      `<em class="italic ${italicColorClass}">$1</em>`
    );
    clean = clean.replace(
      /_([^_]+)_/g,
      `<em class="italic ${italicColorClass}">$1</em>`
    );

    // Replace inline code `code`
    const codeBg = isDark
      ? "bg-slate-800/80 border-slate-750 text-rose-400"
      : isWarm
      ? "bg-[#efe9dc] border-[#e0d3b6] text-amber-900"
      : "bg-slate-100 border-slate-200 text-rose-500";

    clean = clean.replace(
      /`([^`]+)`/g,
      `<code class="${codeBg} border px-1.5 py-0.5 rounded text-xs font-mono font-medium">$1</code>`
    );

    return <span dangerouslySetInnerHTML={{ __html: clean }} />;
  };

  // Convert markdown elements cleanly line by line
  const renderedElements = lines.map((line, idx) => {
    const trimmed = line.trim();
    if (!trimmed) {
      return (
        <div
          key={idx}
          className={isReaderMode ? "h-3" : "h-1"}
        />
      );
    }

    // Image Pattern Check: ![alt](url)
    const imgMatch = trimmed.match(/^!\[([^\]]*)\]\(([^)]+)\)$/);
    if (imgMatch) {
      return (
        <div key={idx} className="my-5 flex flex-col items-center">
          <img
            src={imgMatch[2]}
            alt={imgMatch[1] || "Illustration"}
            referrerPolicy="no-referrer"
            className="max-h-72 object-contain rounded-lg border border-slate-200/65 shadow-md max-w-full"
          />
          {imgMatch[1] && (
            <span className="mt-2 text-xs italic opacity-60 text-center font-mono">
              {imgMatch[1]}
            </span>
          )}
        </div>
      );
    }

    // Title 1: # Title
    if (trimmed.startsWith("# ")) {
      const headerBorder = isDark
        ? "border-rose-500/30"
        : isWarm
        ? "border-amber-750/30"
        : "border-blue-500";
      return (
        <h1
          key={idx}
          style={isReaderMode ? { fontSize: "2.1em", lineHeight: "1.25" } : {}}
          className={`font-extrabold ${strongColorClass} mb-6 border-b-4 ${headerBorder} pb-2.5 inline-block ${
            isReaderMode ? "" : "text-3xl sm:text-4xl"
          }`}
        >
          {parseInlineStyles(trimmed.substring(2))}
        </h1>
      );
    }

    // Title 2: ## Subtitle
    if (trimmed.startsWith("## ")) {
      const headerBorder = isDark
        ? "border-rose-500/25"
        : isWarm
        ? "border-amber-700/25"
        : "border-blue-500";
      return (
        <h2
          key={idx}
          style={isReaderMode ? { fontSize: "1.65em", lineHeight: "1.3" } : {}}
          className={`font-semibold ${strongColorClass} mb-5 border-b-2 ${headerBorder} pb-1.5 mt-5 inline-block ${
            isReaderMode ? "" : "text-xl sm:text-2xl"
          }`}
        >
          {parseInlineStyles(trimmed.substring(3))}
        </h2>
      );
    }

    // Title 3: ### Heading
    if (trimmed.startsWith("### ")) {
      return (
        <h3
          key={idx}
          style={isReaderMode ? { fontSize: "1.35em", lineHeight: "1.4" } : {}}
          className={`font-bold tracking-tight ${strongColorClass} mt-4 mb-2.5 ${
            isReaderMode ? "" : "text-lg sm:text-xl"
          }`}
        >
          {parseInlineStyles(trimmed.substring(4))}
        </h3>
      );
    }

    // List item: - Bullet
    if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
      const bulletColor = isDark
        ? "bg-rose-450"
        : isWarm
        ? "bg-amber-800"
        : "bg-blue-500";
      return (
        <li
          key={idx}
          style={isReaderMode ? { fontSize: "1.05em", lineHeight: "1.65" } : {}}
          className={`flex items-start gap-3.5 my-3 pl-0.5 list-none ${textColorClass}`}
        >
          <div className={`w-2 h-2 rounded-full ${bulletColor} mr-0.5 mt-2 shrink-0`} />
          <div className={isReaderMode ? "" : "text-base sm:text-lg"}>
            {parseInlineStyles(trimmed.substring(2))}
          </div>
        </li>
      );
    }

    // Number list item: 1. Item
    const numMatch = trimmed.match(/^(\d+)\.\s(.*)$/);
    if (numMatch) {
      const numColor = isDark
        ? "text-rose-450"
        : isWarm
        ? "text-amber-800"
        : "text-sky-600";
      return (
        <div
          key={idx}
          style={isReaderMode ? { fontSize: "1.05em", lineHeight: "1.65" } : {}}
          className={`ml-5 my-2 flex gap-3 ${textColorClass}`}
        >
          <span className={`font-semibold ${numColor} font-mono shrink-0`}>
            {numMatch[1]}.
          </span>
          <div>{parseInlineStyles(numMatch[2])}</div>
        </div>
      );
    }

    // Code blocks indicator (just skipping backticks to keep view elegant)
    if (trimmed.startsWith("```")) {
      return null;
    }

    // Standard body text paragraph
    return (
      <p
        key={idx}
        style={isReaderMode ? { fontSize: "1.05em", lineHeight: "1.7" } : {}}
        className={`leading-relaxed my-2.5 ${textColorClass} ${
          isReaderMode ? "" : "text-sm sm:text-base"
        }`}
      >
        {parseInlineStyles(trimmed)}
      </p>
    );
  });

  // Background/eraser color
  const eraserColor = isReaderMode
    ? isDark
      ? "#1E2022"
      : isWarm
      ? "#FAF6EF"
      : "#ffffff"
    : "#ffffff";

  return (
    <motion.div
      key={content + (canvasElements.length > 0 ? "_canvas_" + canvasElements.length : "") + (isReaderMode ? `_reader_${readerTheme}_${readerFontSize}_${readerFontFamily}` : "_slide")}
      initial={{ opacity: 0, y: 7 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -7 }}
      transition={{ duration: 0.18, ease: "easeOut" }}
      style={isReaderMode ? { fontSize: `${readerFontSize}px`, fontFamily: fontFamilyStr } : {}}
      className={`slide-content select-none py-1 text-left w-full h-full flex flex-col justify-start`}
    >
      {canvasElements.length > 0 ? (
        <div className="flex-1 flex flex-col gap-6 items-center justify-center min-h-[360px] w-full">
          {/* Responsive vector graphic wrapper with custom whiteboard color background */}
          <div 
            className="w-full relative aspect-video flex-1 flex items-center justify-center rounded-xl overflow-hidden border border-slate-205/85 shadow-sm"
            style={{ backgroundColor: boardBg !== "transparent" ? boardBg : undefined }}
          >
            <svg
              className="w-full h-full max-h-[480px] bg-transparent pointer-events-none"
              viewBox="0 0 800 500"
              preserveAspectRatio="xMidYMid meet"
            >
              {canvasElements.map((el, index) => {
                if (el.type === "text") {
                  return (
                    <text
                      key={el.id || index}
                      x={el.x}
                      y={el.y}
                      fill={isDark && el.color === "#1e293b" ? "#ffffff" : el.color}
                      fontSize={el.fontSize || 16}
                      fontWeight="bold"
                      fontFamily='"Inter", sans-serif'
                      dominantBaseline="hanging"
                    >
                      {el.text}
                    </text>
                  );
                }
                if (!el.points || el.points.length < 2) return null;
                
                if (el.type === "pencil" || el.type === "eraser") {
                  // Generate bezier smooth path data in slide renderer SVG too for ultimate smoothness!
                  const smoothPathData = el.points.reduce((acc: string, pt: any, i: number, arr: any[]) => {
                    if (i === 0) return `M ${pt.x} ${pt.y}`;
                    if (i === arr.length - 1) return `${acc} L ${pt.x} ${pt.y}`;
                    const xc = (pt.x + arr[i + 1].x) / 2;
                    const yc = (pt.y + arr[i + 1].y) / 2;
                    return `${acc} Q ${pt.x} ${pt.y} ${xc} ${yc}`;
                  }, "");

                  // Determine brush styles
                  let strokeOpacity = 1.0;
                  let strokeDashArray: string | undefined = undefined;
                  let strokeWidthVal = el.width;

                  if (el.type === "eraser") {
                    const finalEraserStroke = boardBg !== "transparent" ? boardBg : eraserColor;
                    return (
                      <path
                        key={el.id || index}
                        d={smoothPathData}
                        fill="none"
                        stroke={finalEraserStroke}
                        strokeWidth={strokeWidthVal}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    );
                  }

                  const style = el.brushStyle || "pencil";
                  if (style === "crayon") {
                    strokeOpacity = 0.55;
                    strokeDashArray = "1, 3";
                  } else if (style === "watercolor") {
                    strokeOpacity = 0.15;
                    strokeWidthVal = el.width * 2.2;
                  } else if (style === "highlighter") {
                    strokeOpacity = 0.32;
                    strokeWidthVal = el.width * 1.8;
                  } else if (style === "marker") {
                    strokeOpacity = 0.88;
                  } else {
                    strokeOpacity = 0.95;
                  }

                  return (
                    <path
                      key={el.id || index}
                      d={smoothPathData}
                      fill="none"
                      stroke={isDark && el.color === "#1e293b" ? "#ffffff" : el.color}
                      strokeWidth={strokeWidthVal}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeDasharray={strokeDashArray}
                      strokeOpacity={strokeOpacity}
                    />
                  );
                }
                if (el.type === "line") {
                  const p1 = el.points[0];
                  const p2 = el.points[1];
                  return (
                    <line
                      key={el.id || index}
                      x1={p1.x}
                      y1={p1.y}
                      x2={p2.x}
                      y2={p2.y}
                      stroke={isDark && el.color === "#1e293b" ? "#ffffff" : el.color}
                      strokeWidth={el.width}
                      strokeLinecap="round"
                    />
                  );
                }
                if (el.type === "rect") {
                  const p1 = el.points[0];
                  const p2 = el.points[1];
                  const x = Math.min(p1.x, p2.x);
                  const y = Math.min(p1.y, p2.y);
                  const w = Math.abs(p2.x - p1.x);
                  const h = Math.abs(p2.y - p1.y);
                  return (
                    <rect
                      key={el.id || index}
                      x={x}
                      y={y}
                      width={w}
                      height={h}
                      fill="none"
                      stroke={isDark && el.color === "#1e293b" ? "#ffffff" : el.color}
                      strokeWidth={el.width}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  );
                }
                if (el.type === "ellipse") {
                  const p1 = el.points[0];
                  const p2 = el.points[1];
                  const cx = (p1.x + p2.x) / 2;
                  const cy = (p1.y + p2.y) / 2;
                  const rx = Math.abs(p2.x - p1.x) / 2;
                  const ry = Math.abs(p2.y - p1.y) / 2;
                  return (
                    <ellipse
                      key={el.id || index}
                      cx={cx}
                      cy={cy}
                      rx={rx}
                      ry={ry}
                      fill="none"
                      stroke={isDark && el.color === "#1e293b" ? "#ffffff" : el.color}
                      strokeWidth={el.width}
                    />
                  );
                }
                return null;
              })}
            </svg>
          </div>
          {/* Also render titles or headings from markdown content overlaying bottom if present */}
          {renderedElements.filter(el => {
            // only keep headings to avoid overlay clutter
            return el.type === "h1" || el.type === "h2";
          })}
        </div>
      ) : (
        renderedElements
      )}
    </motion.div>
  );
}
