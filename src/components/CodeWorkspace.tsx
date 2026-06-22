import React, { useRef } from "react";
import { Heading1, List, Image as ImageIcon, Bold, Italic, Code, Sparkles } from "lucide-react";

interface CodeWorkspaceProps {
  value: string;
  onChange: (val: string) => void;
}

export default function CodeWorkspace({ value, onChange }: CodeWorkspaceProps) {
  const lineCount = value.split("\n").length;
  const lineNumbers = Array.from({ length: Math.max(lineCount, 1) }, (_, i) => i + 1);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const lineRef = useRef<HTMLDivElement>(null);

  // Scroll sync logic between lines indicator and textarea
  const handleScroll = () => {
    if (textareaRef.current && lineRef.current) {
      lineRef.current.scrollTop = textareaRef.current.scrollTop;
    }
  };

  // Helper insertion tools
  const insertText = (before: string, after: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const originalText = textarea.value;

    const selectedText = originalText.substring(start, end);
    const replacement = before + (selectedText || "text") + after;

    const newValue = originalText.substring(0, start) + replacement + originalText.substring(end);
    onChange(newValue);

    // Reposition cursor
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + before.length, start + before.length + (selectedText || "text").length);
    }, 50);
  };

  // Handle Paste events for Copy & Paste Images
  const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const items = e.clipboardData.items;
    let imageFound = false;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf("image") !== -1) {
        const blob = items[i].getAsFile();
        if (blob) {
          e.preventDefault();
          imageFound = true;
          const reader = new FileReader();
          reader.onload = (event) => {
            if (event.target?.result) {
              const base64Data = event.target.result as string;
              // Cleanly insert embedded image with custom label
              insertText(`![Pasted Image](${base64Data})`, "");
            }
          };
          reader.readAsDataURL(blob);
        }
      }
    }
  };

  // Handle Drag / Drop events for uploading images directly to position
  const handleDrop = (e: React.DragEvent<HTMLTextAreaElement>) => {
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      const file = files[0];
      if (file.type.startsWith("image/")) {
        e.preventDefault();
        const reader = new FileReader();
        reader.onload = (event) => {
          if (event.target?.result) {
            const base64Data = event.target.result as string;
            insertText(`![Dropped Image](${base64Data})`, "");
          }
        };
        reader.readAsDataURL(file);
      }
    }
  };

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Short quick formatting toolbar */}
      <div className="flex items-center gap-1 px-3 py-2 bg-slate-50 border-b border-slate-150 text-slate-600 overflow-x-auto select-none">
        
        <button
          onClick={() => insertText("# ", "")}
          title="Header"
          className="p-1 px-2.5 text-xs text-slate-700 font-semibold rounded hover:bg-slate-250 transition flex items-center gap-1"
        >
          <Heading1 className="w-3.5 h-3.5" />
          <span>Title</span>
        </button>

        <button
          onClick={() => insertText("**", "**")}
          title="Bold text"
          className="p-1 px-2 rounded hover:bg-slate-250 transition"
        >
          <Bold className="w-3.5 h-3.5 text-slate-600" />
        </button>

        <button
          onClick={() => insertText("*", "*")}
          title="Italic text"
          className="p-1 px-2 rounded hover:bg-slate-250 transition"
        >
          <Italic className="w-3.5 h-3.5 text-slate-600" />
        </button>

        <button
          onClick={() => insertText("```\n", "\n```")}
          title="Code block"
          className="p-1 px-2 rounded hover:bg-slate-250 transition"
        >
          <Code className="w-3.5 h-3.5 text-slate-600" />
        </button>

        <button
          onClick={() => insertText("- ", "")}
          title="Bullet Point List"
          className="p-1 px-2 rounded hover:bg-slate-250 transition"
        >
          <List className="w-3.5 h-3.5 text-slate-600" />
        </button>

        <button
          onClick={() => insertText("![Image Name](", ")")}
          title="Insert standard Image markdown"
          className="p-1 px-2 rounded hover:bg-slate-250 transition"
        >
          <ImageIcon className="w-3.5 h-3.5 text-slate-600" />
        </button>

        <div className="h-4 w-px bg-slate-200 mx-1.5" />

        <div className="ml-auto hidden md:flex items-center gap-1.5 text-[11px] text-indigo-600 bg-indigo-50/70 border border-indigo-100/60 px-2 py-0.5 rounded-full font-sans">
          <Sparkles className="w-3 h-3 text-indigo-500 animate-pulse" />
          <span>Copy & paste / Drag images into the editor!</span>
        </div>
      </div>

      {/* Code Text Workspace */}
      <div className="flex flex-1 overflow-hidden relative font-mono text-sm leading-6">
        {/* Line Numbers Column */}
        <div
          ref={lineRef}
          className="w-12 bg-slate-50/60 border-r border-slate-100 py-3 text-right pr-3 select-none text-slate-300 overflow-hidden font-mono text-xs"
        >
          {lineNumbers.map((num) => (
            <div key={num} className="h-6 pr-0.5">
              {num}
            </div>
          ))}
        </div>

        {/* Text Area */}
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onScroll={handleScroll}
          onPaste={handlePaste}
          onDrop={handleDrop}
          className="flex-1 p-3 h-full resize-none outline-none text-slate-705 leading-6 bg-transparent overflow-y-auto font-mono selection:bg-blue-100 placeholder:text-slate-350"
          placeholder={`# Slide Title\n\n- Write your slide points using markdown syntax.\n- Type text here or copy & paste / drag images directly here.`}
          spellCheck="false"
        />
      </div>
    </div>
  );
}

