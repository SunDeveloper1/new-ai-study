import React, { useState, useEffect, useRef } from "react";
import { Sparkles, Brain, ChevronLeft, ChevronRight, RefreshCw, Lightbulb, Zap, X, AlertCircle } from "lucide-react";
import { RevisionShort } from "../types";

interface RevisionShortsProps {
  isOpen: boolean;
  onClose: () => void;
  workspaceId: string;
  workspaceName: string;
  authFetch: (url: string, options?: RequestInit) => Promise<Response>;
}

export const RevisionShorts: React.FC<RevisionShortsProps> = ({
  isOpen,
  onClose,
  workspaceId,
  workspaceName,
  authFetch,
}) => {
  const [shorts, setShorts] = useState<RevisionShort[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Load existing revision shorts from localStorage on component open/change
  useEffect(() => {
    if (isOpen && workspaceId) {
      const cached = localStorage.getItem(`shorts_${workspaceId}`);
      if (cached) {
        try {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setShorts(parsed);
            setCurrentIndex(0);
            setError(null);
            return;
          }
        } catch (e) {
          console.error("Failed to parse cached shorts:", e);
        }
      }
      // If none cached, reset list
      setShorts([]);
      setError(null);
    }
  }, [isOpen, workspaceId]);

  // Handle auto-sliding logic every 5000ms (5 seconds) as requested
  useEffect(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    if (isOpen && shorts.length > 1 && !isPaused && !isLoading) {
      timerRef.current = setInterval(() => {
        setCurrentIndex((prevIndex) => (prevIndex + 1) % shorts.length);
      }, 5000); // 5 seconds interval
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [isOpen, shorts, isPaused, isLoading]);

  // Listen to keyboard event to navigate or close the modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") prevShort();
      if (e.key === "ArrowRight") nextShort();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, shorts.length]);

  if (!isOpen) return null;

  // Generate Shorts via Express AI endpoint
  const generateShorts = async () => {
    if (!workspaceId) return;
    setIsLoading(true);
    setError(null);
    try {
      const response = await authFetch(`/api/workspaces/${workspaceId}/shorts`, {
        method: "POST"
      });
      if (response.ok) {
        const data = await response.json();
        if (Array.isArray(data) && data.length > 0) {
          setShorts(data);
          setCurrentIndex(0);
          // Cache to localStorage
          localStorage.setItem(`shorts_${workspaceId}`, JSON.stringify(data));
        } else {
          setError("The AI generated empty revision capsules. Please verify that your slides contain text.");
        }
      } else {
        const errData = await response.json().catch(() => ({}));
        setError(errData.error || "Failed to distill workspace. Verify your Gemini API key configuration.");
      }
    } catch (err: any) {
      console.error("Error generating shorts:", err);
      setError("Communication failed. Please check your network and retry.");
    } finally {
      setIsLoading(false);
    }
  };

  const prevShort = () => {
    if (shorts.length === 0) return;
    setCurrentIndex((prev) => (prev - 1 + shorts.length) % shorts.length);
  };

  const nextShort = () => {
    if (shorts.length === 0) return;
    setCurrentIndex((prev) => (prev + 1) % shorts.length);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Dark overlay with background blur */}
      <div 
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity" 
        onClick={onClose}
      />

      {/* Main Glassmorphism/Tech Dialog Box container */}
      <div className="bg-slate-950 text-white rounded-2xl border border-slate-800 w-full max-w-2xl overflow-hidden shadow-2xl relative z-10 font-sans transform scale-100 transition-all">
        
        {/* Subtle top horizontal color bar */}
        <div className="h-1.5 w-full bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-600" />

        {/* Modal Close Button */}
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-white hover:bg-slate-800/80 rounded-lg transition-colors cursor-pointer"
          title="Close dialog"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Ambient top right glow */}
        <div className="absolute top-0 right-0 w-44 h-44 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="p-6 sm:p-8">
          {/* Header */}
          <div className="flex items-center gap-3.5 mb-6 border-b border-slate-805/60 pb-5">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/10">
              <Brain className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-blue-400 bg-blue-500/10 px-2.5 py-0.5 rounded-full border border-blue-500/20">
                  AI Active Assistant
                </span>
              </div>
              <h3 className="text-lg font-extrabold tracking-tight text-white mt-1">
                Revision Shorts
              </h3>
              <p className="text-xs text-slate-400">
                Condensed recap study notes from <span className="text-indigo-400 font-semibold">{workspaceName}</span>
              </p>
            </div>
          </div>

          {/* Interactive display */}
          <div className="min-h-[160px] flex items-center justify-center relative my-4">
            
            {isLoading ? (
              <div className="text-center py-6 flex flex-col items-center justify-center">
                <div className="relative mb-3 flex items-center justify-center">
                  <div className="w-12 h-12 rounded-full border-2 border-indigo-500/25 border-t-indigo-500 animate-spin" />
                  <Sparkles className="w-5 h-5 text-yellow-400 absolute animate-pulse" />
                </div>
                <div className="text-sm font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-indigo-300">
                  Analyzing Workspace Materials...
                </div>
                <p className="text-[11px] text-slate-400 mt-1 max-w-sm font-mono leading-normal">
                  Our LLM is parsing slides, structuring key memory capsules, & rendering visual flash notes.
                </p>
              </div>
            ) : error ? (
              <div className="bg-rose-500/5 border border-rose-500/20 rounded-xl p-5 text-center max-w-md w-full mx-auto">
                <div className="w-9 h-9 rounded-full bg-rose-500/10 flex items-center justify-center mx-auto mb-2.5">
                  <AlertCircle className="w-5 h-5 text-rose-400" />
                </div>
                <p className="text-xs font-bold text-rose-300 font-mono mb-1">Could Not Distill Workspace</p>
                <p className="text-[11px] text-rose-200/80 leading-normal mb-3">{error}</p>
                <button
                  onClick={generateShorts}
                  className="px-4 py-1.5 bg-rose-600/30 hover:bg-rose-600 text-rose-200 hover:text-white rounded-lg text-xs font-bold transition border border-rose-500/20 cursor-pointer"
                >
                  Retry Analysis
                </button>
              </div>
            ) : shorts.length > 0 ? (
              <div className="w-full relative py-1 px-1 sm:px-10">
                
                {/* Fact Note Carousel display card */}
                <div
                  onMouseEnter={() => setIsPaused(true)}
                  onMouseLeave={() => setIsPaused(false)}
                  className="bg-slate-900/60 hover:bg-slate-900 border border-slate-800/80 p-6 sm:p-8 rounded-2xl shadow-xl transition-all duration-300 group hover:-translate-y-0.5 text-left relative overflow-hidden"
                >
                  {/* Decorative background visual */}
                  <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-indigo-500/5 to-purple-500/5 rounded-full blur-xl pointer-events-none" />

                  <div className="flex items-center justify-between mb-4">
                    <span className="bg-indigo-500/10 text-indigo-300 text-[10px] font-extrabold uppercase tracking-wider px-3 py-1 rounded-md border border-indigo-500/20 flex items-center gap-1.5 shadow-5xs">
                      {shorts[currentIndex].category}
                    </span>
                    <span className="text-[10px] text-slate-500 font-mono tracking-wider font-bold">
                      CAPSULE {currentIndex + 1} OF {shorts.length}
                    </span>
                  </div>

                  {/* Catchy flashy revision note text */}
                  <h4 className="text-base sm:text-lg leading-relaxed text-slate-100 font-normal tracking-wide italic select-text">
                    "{shorts[currentIndex].text}"
                  </h4>
                </div>

                {/* Left/Right controls */}
                <div className="absolute top-1/2 -translate-y-1/2 left-0 hidden sm:block">
                  <button
                    onClick={prevShort}
                    className="w-8 h-8 rounded-full bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white transition-all flex items-center justify-center border border-slate-800 cursor-pointer"
                    title="Previous Fact"
                  >
                    <ChevronLeft className="w-4.5 h-4.5" />
                  </button>
                </div>
                <div className="absolute top-1/2 -translate-y-1/2 right-0 hidden sm:block">
                  <button
                    onClick={nextShort}
                    className="w-8 h-8 rounded-full bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white transition-all flex items-center justify-center border border-slate-800 cursor-pointer"
                    title="Next Fact"
                  >
                    <ChevronRight className="w-4.5 h-4.5" />
                  </button>
                </div>

              </div>
            ) : (
              <div className="bg-slate-900/35 border border-dashed border-slate-800 rounded-xl p-8 text-center max-w-md w-full mx-auto flex flex-col items-center">
                <Lightbulb className="w-10 h-10 text-slate-500 mb-3 animate-pulse" />
                <p className="text-xs font-bold text-slate-300 mb-1">Knowledge Capsules Prearranged</p>
                <p className="text-[11px] text-slate-450 leading-normal max-w-xs mb-5">
                  Let Gemini process your presentation slides and map out key concepts into beautiful memory snippets.
                </p>
                <button
                  onClick={generateShorts}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-extrabold uppercase bg-blue-600 hover:bg-blue-500 text-white transition text-center rounded-lg cursor-pointer shadow-md shadow-blue-500/10"
                >
                  <Sparkles className="w-3.5 h-3.5 text-yellow-300 font-bold" />
                  <span>Distill with AI Now</span>
                </button>
              </div>
            )}
          </div>

          {/* Dots Indicator & Play status feedback */}
          {shorts.length > 0 && !isLoading && !error && (
            <div className="flex flex-col items-center gap-2 mt-5 select-none">
              <div className="flex justify-center gap-2">
                {shorts.map((_, idx) => (
                  <button
                    key={idx}
                    onClick={() => setCurrentIndex(idx)}
                    className={`h-1.5 rounded-full transition-all duration-200 cursor-pointer ${
                      currentIndex === idx ? "w-7 bg-blue-500" : "w-1.5 bg-slate-800 hover:bg-slate-700"
                    }`}
                    title={`Slide card ${idx + 1}`}
                  />
                ))}
              </div>

              <div className="flex items-center gap-4 mt-1 text-[9px] text-slate-500 font-mono tracking-widest uppercase">
                {isPaused ? (
                  <span className="text-yellow-500 font-bold">● Slide paused (Hovering)</span>
                ) : (
                  <span>⚡ Auto sliding: 5.0s</span>
                )}
                
                {/* Rapid regeneration shortcut */}
                <button 
                  onClick={generateShorts}
                  className="text-xs text-blue-400 hover:text-blue-300 hover:underline flex items-center gap-1 cursor-pointer font-bold lowercase tracking-normal bg-slate-900 px-2 py-0.5 rounded border border-slate-800 ml-1"
                >
                  <RefreshCw className="w-2.5 h-2.5" />
                  re-generate AI
                </button>
              </div>

              {/* Swipe support instruction on mobile */}
              <div className="sm:hidden flex items-center justify-center gap-3 mt-1 text-slate-450 font-sans text-[11px]">
                <button onClick={prevShort} className="px-2.5 py-1 bg-slate-900 rounded border border-slate-800 text-slate-300 font-bold">&larr; Prev</button>
                <span className="text-slate-700">|</span>
                <button onClick={nextShort} className="px-2.5 py-1 bg-slate-900 rounded border border-slate-800 text-slate-300 font-bold">Next &rarr;</button>
              </div>
            </div>
          )}
        </div>

        {/* Modal base frame credits / instruction */}
        <div className="bg-slate-950 px-6 py-4 border-t border-slate-900 text-center select-none flex items-center justify-between text-[10px] text-slate-550 font-mono uppercase tracking-wider">
          <span>ScribeSlide Learn Engine</span>
          <span className="text-slate-600">Press ESC to Exit</span>
        </div>
      </div>
    </div>
  );
};
