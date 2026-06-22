import React, { useState, useEffect, useRef } from "react";
import {
  Layout,
  Plus,
  Play,
  Pause,
  RotateCcw,
  Sliders,
  Notebook,
  Trash2,
  Edit,
  FolderOpen,
  Volume2,
  Folder,
  ChevronLeft,
  Share2,
  Download,
  Check,
  Loader2,
  ExternalLink,
  Presentation,
  Grid,
  FileText,
  User as UserIcon,
  LogOut,
  Sparkles,
  VolumeX,
  FilePlus,
  ArrowRight,
  RefreshCw,
  HelpCircle,
  Maximize2,
  Minimize2,
  BookOpen,
  Eye,
  ChevronRight,
  Edit3,
  Palette
} from "lucide-react";
import { Workspace, Slide } from "./types";
import SlideRenderer from "./components/SlideRenderer";
import CodeWorkspace from "./components/CodeWorkspace";
import CanvasEditor from "./components/CanvasEditor";
import { RevisionShorts } from "./components/RevisionShorts";

export default function App() {
  const [activeUser, setActiveUser] = useState<{ id: string; username: string } | null>(() => {
    const stored = localStorage.getItem("scribeslide_user");
    if (stored) {
      try { return JSON.parse(stored); } catch (e) { return null; }
    }
    return null;
  });

  // Auth Form states
  const [authMode, setAuthMode] = useState<"LOGIN" | "REGISTER">("LOGIN");
  const [usernameInput, setUsernameInput] = useState("");
  const [pinInput, setPinInput] = useState("");
  const [isPinFocused, setIsPinFocused] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [authSuccess, setAuthSuccess] = useState<string | null>(null);
  const [authSubmitting, setAuthSubmitting] = useState(false);

  // App Workspace states
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [loadingWorkspaces, setLoadingWorkspaces] = useState(false);
  const [currentWorkspaceId, setCurrentWorkspaceId] = useState<string | null>(null);
  
  // Editor values
  const [workspaceName, setWorkspaceName] = useState("");
  const [editorMarkdown, setEditorMarkdown] = useState("");
  const [clientSlides, setClientSlides] = useState<Slide[]>([]);
  const [activeSlideIndex, setActiveSlideIndex] = useState(0);
  
  // View switches
  const [sidebarMode, setSidebarMode] = useState<"GRID" | "OUTLINE">("GRID");
  
  // Modals & Menu Dropdowns
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newWorkspaceName, setNewWorkspaceName] = useState("");
  const [isRenameModalOpen, setIsRenameModalOpen] = useState(false);
  const [workspaceToRename, setWorkspaceToRename] = useState<Workspace | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [activeDropdownId, setActiveDropdownId] = useState<string | null>(null);
  const [workspaceToDelete, setWorkspaceToDelete] = useState<Workspace | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [slideDeleteConfirm, setSlideDeleteConfirm] = useState(false);

  // AI Revision Shorts Dialog Modal states
  const [isShortsOpen, setIsShortsOpen] = useState(false);
  const [shortsWorkspaceId, setShortsWorkspaceId] = useState("");
  const [shortsWorkspaceName, setShortsWorkspaceName] = useState("");
  
  // TTS State Managers
  const [ttsPlaying, setTtsPlaying] = useState(false);
  const [ttsLoading, setTtsLoading] = useState(false);
  const [ttsPaused, setTtsPaused] = useState(false);
  const [ttsSpeed, setTtsSpeed] = useState<number>(1.0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Saving states
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");

  // Inline Slide Name renaming states
  const [editingSlideIdx, setEditingSlideIdx] = useState<number | null>(null);
  const [slideTitleInput, setSlideTitleInput] = useState<string>("");

  // Editor toggle state (Markdown vs Canvas drawings) sitting on local state if slide was just loaded, otherwise read from active slide
  const [activeEditorMode, setActiveEditorMode] = useState<"MARKDOWN" | "CANVAS">("MARKDOWN");

  // Resizable live preview and customizable modes
  const [previewWidth, setPreviewWidth] = useState<number>(420);
  const [isResizing, setIsResizing] = useState<boolean>(false);
  const [isReaderMode, setIsReaderMode] = useState<boolean>(false);
  const [readerTheme, setReaderTheme] = useState<"warm" | "light" | "dark">("warm");
  const [readerFontSize, setReaderFontSize] = useState<number>(18);
  const [readerFontFamily, setReaderFontFamily] = useState<"serif" | "sans" | "mono">("serif");
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  // drag resizer move and mouse-up listener hooks
  useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      // preview is on the right side - compute its width relative to window right edge
      const docWidth = window.innerWidth;
      const newWidth = docWidth - e.clientX;
      if (newWidth > 260 && newWidth < docWidth * 0.8) {
        setPreviewWidth(newWidth);
      }
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isResizing]);

  // Global Keyboard listener for arrow key navigation in preview and Esc to exit Fullscreen
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (isFullscreen) {
        if (e.key === "ArrowRight" || e.key === "PageDown" || e.key === "Space") {
          e.preventDefault();
          if (activeSlideIndex < clientSlides.length - 1) {
            setActiveSlideIndex((prev) => prev + 1);
          }
        } else if (e.key === "ArrowLeft" || e.key === "PageUp") {
          e.preventDefault();
          if (activeSlideIndex > 0) {
            setActiveSlideIndex((prev) => prev - 1);
          }
        } else if (e.key === "Escape") {
          e.preventDefault();
          setIsFullscreen(false);
        }
      }
    };

    window.addEventListener("keydown", handleGlobalKeyDown);
    return () => {
      window.removeEventListener("keydown", handleGlobalKeyDown);
    };
  }, [isFullscreen, activeSlideIndex, clientSlides.length]);

  // Helper to fetch endpoints appending active session ID
  const authFetch = async (url: string, options: RequestInit = {}) => {
    const headers = {
      "Content-Type": "application/json",
      ...(options.headers || {}),
      "x-user-id": activeUser ? activeUser.id : "default_user"
    };
    return fetch(url, { ...options, headers });
  };

  // Fetch workspaces on component load or user change
  useEffect(() => {
    if (activeUser) {
      fetchWorkspaces();
    } else {
      setWorkspaces([]);
    }
  }, [activeUser]);

  // Fetch workspaces list from Express REST API
  const fetchWorkspaces = async () => {
    setLoadingWorkspaces(true);
    try {
      const response = await authFetch("/api/workspaces");
      if (response.ok) {
        const data = await response.json();
        setWorkspaces(data);
      }
    } catch (err) {
      console.error("Failed to load workspaces:", err);
    } finally {
      setLoadingWorkspaces(false);
    }
  };

  // Switch to new Username & Pin credentials
  const handleAuthSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setAuthError(null);
    setAuthSuccess(null);

    const trimmedUsername = usernameInput.trim();
    if (!trimmedUsername) {
      setAuthError("Username is required");
      return;
    }
    if (trimmedUsername.length < 3) {
      setAuthError("Username must be at least 3 characters");
      return;
    }
    if (!/^\d{4}$/.test(pinInput)) {
      setAuthError("PIN must be exactly 4 digits");
      return;
    }

    setAuthSubmitting(true);
    try {
      const endpoint = authMode === "LOGIN" ? "/api/auth/login" : "/api/auth/register";
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: trimmedUsername, pin: pinInput })
      });

      const data = await response.json();
      if (!response.ok) {
        setAuthError(data.error || "Authentication failed");
        setPinInput(""); // Reset PIN to let user try again immediately
      } else {
        if (authMode === "REGISTER") {
          setAuthSuccess("Account created successfully! Loading your workspace...");
          setTimeout(() => {
            localStorage.setItem("scribeslide_user", JSON.stringify(data.user));
            setActiveUser(data.user);
            setPinInput("");
            setUsernameInput("");
          }, 1200);
        } else {
          localStorage.setItem("scribeslide_user", JSON.stringify(data.user));
          setActiveUser(data.user);
          setPinInput("");
          setUsernameInput("");
        }
      }
    } catch (err) {
      console.error("Auth submit error:", err);
      setAuthError("Failed to reach server database. Please verify connections.");
      setPinInput(""); // Reset PIN to let user try again immediately
    } finally {
      setAuthSubmitting(false);
    }
  };

  // Automatically submit once the 4-digit PIN is reached
  useEffect(() => {
    if (pinInput.length === 4 && usernameInput.trim().length >= 3 && !authSubmitting) {
      handleAuthSubmit();
    }
  }, [pinInput, usernameInput, authSubmitting]);

  // Exit current workspace and return to dashboard
  const handleLogout = async () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
      setTtsPlaying(false);
    }
    setCurrentWorkspaceId(null);
  };

  // Absolute user switch log-out action
  const handleDeauthenticate = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
      setTtsPlaying(false);
    }
    localStorage.removeItem("scribeslide_user");
    setActiveUser(null);
    setCurrentWorkspaceId(null);
  };

  // Create Workspace REST endpoint call
  const handleCreateWorkspace = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWorkspaceName.trim()) return;

    try {
      const response = await authFetch("/api/workspaces", {
        method: "POST",
        body: JSON.stringify({ name: newWorkspaceName.trim() })
      });

      if (response.ok) {
        const created = await response.json();
        setWorkspaces((prev) => [created, ...prev]);
        setIsCreateModalOpen(false);
        setNewWorkspaceName("");
        // Route to visual editor immediately
        openWorkspace(created);
      }
    } catch (err) {
      console.error("Failed to create workspace:", err);
    }
  };

  // Trigger custom confirmation modal for deleting workspaces
  const openDeleteModal = (workspace: Workspace, e: React.MouseEvent) => {
    e.stopPropagation();
    setWorkspaceToDelete(workspace);
    setIsDeleteModalOpen(true);
    setActiveDropdownId(null);
  };

  // Rename Slide item inside Left Sidebar
  const startEditingSlideTitle = (e: React.MouseEvent, index: number, currentTitle: string) => {
    e.stopPropagation();
    setEditingSlideIdx(index);
    setSlideTitleInput(currentTitle);
  };

  const saveSlideTitle = (index: number, newTitle: string) => {
    setClientSlides((prev) => {
      const updated = [...prev];
      if (updated[index]) {
        updated[index] = {
          ...updated[index],
          title: newTitle.trim() || undefined
        };
      }
      return updated;
    });
    setEditingSlideIdx(null);
  };

  // Delete Workspace via REST API
  const handleDeleteWorkspace = async () => {
    if (!workspaceToDelete) return;

    try {
      const response = await authFetch(`/api/workspaces/${workspaceToDelete.id}`, {
        method: "DELETE"
      });

      if (response.ok) {
        setWorkspaces((prev) => prev.filter((w) => w.id !== workspaceToDelete.id));
        if (currentWorkspaceId === workspaceToDelete.id) {
          setCurrentWorkspaceId(null);
        }
        setIsDeleteModalOpen(false);
        setWorkspaceToDelete(null);
      }
    } catch (err) {
      console.error("Failed to delete project:", err);
    }
  };

  // Rename modal wrapper
  const openRenameModal = (workspace: Workspace, e: React.MouseEvent) => {
    e.stopPropagation();
    setWorkspaceToRename(workspace);
    setRenameValue(workspace.name);
    setIsRenameModalOpen(true);
    setActiveDropdownId(null);
  };

  const handleRenameWorkspace = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!workspaceToRename || !renameValue.trim()) return;

    try {
      const response = await authFetch(`/api/workspaces/${workspaceToRename.id}`, {
        method: "PUT",
        body: JSON.stringify({
          name: renameValue.trim(),
          markdownText: workspaceToRename.markdownText
        })
      });

      if (response.ok) {
        setWorkspaces((prev) =>
          prev.map((w) => (w.id === workspaceToRename.id ? { ...w, name: renameValue.trim() } : w))
        );
        setIsRenameModalOpen(false);
        setWorkspaceToRename(null);
        if (currentWorkspaceId === workspaceToRename.id) {
          setWorkspaceName(renameValue.trim());
        }
      }
    } catch (err) {
      console.error("Failed to rename workspace:", err);
    }
  };

  // Load single workspace detail screen
  const openWorkspace = async (workspace: Workspace) => {
    setCurrentWorkspaceId(workspace.id);
    setWorkspaceName(workspace.name);
    setActiveSlideIndex(0);
    setSaveStatus("idle");

    try {
      const response = await authFetch(`/api/workspaces/${workspace.id}`);
      if (response.ok) {
        const data = await response.json();
        const slides = data.slides || [];
        setClientSlides(slides);
        if (slides.length > 0) {
          setEditorMarkdown(slides[0].markdownContent);
          setActiveEditorMode(slides[0].activeEditor || "MARKDOWN");
        } else {
          setEditorMarkdown("");
          setActiveEditorMode("MARKDOWN");
        }
      }
    } catch (err) {
      console.error("Error fetching full workspace detail:", err);
    }
  };

  // Switch to slide and update state cleanly
  const selectSlide = (index: number) => {
    handleStopSpeech();
    setActiveSlideIndex(index);
    if (clientSlides[index]) {
      setEditorMarkdown(clientSlides[index].markdownContent);
      setActiveEditorMode(clientSlides[index].activeEditor || "MARKDOWN");
    } else {
      setEditorMarkdown("");
      setActiveEditorMode("MARKDOWN");
    }
  };

  // Handle active slide editor text changes
  const handleEditorChange = (val: string) => {
    setEditorMarkdown(val);
    setClientSlides((prev) => {
      const updated = [...prev];
      if (updated[activeSlideIndex]) {
        updated[activeSlideIndex] = {
          ...updated[activeSlideIndex],
          markdownContent: val
        };
      }
      return updated;
    });
  };

  // Handle active slide canvas data changes and auto-save
  const handleCanvasChange = (dataString: string) => {
    setClientSlides((prev) => {
      const updated = [...prev];
      if (updated[activeSlideIndex]) {
        updated[activeSlideIndex] = {
          ...updated[activeSlideIndex],
          canvasData: dataString
        };
      }
      return updated;
    });
  };

  const toggleEditorMode = (mode: "MARKDOWN" | "CANVAS") => {
    setActiveEditorMode(mode);
    setClientSlides((prev) => {
      const updated = [...prev];
      if (updated[activeSlideIndex]) {
        updated[activeSlideIndex] = {
          ...updated[activeSlideIndex],
          activeEditor: mode
        };
      }
      return updated;
    });
  };

  // Debounced Auto-Saving sequence (saves the raw markdown and triggers slide splitting on backend)
  useEffect(() => {
    if (!currentWorkspaceId) return;

    setSaveStatus("saving");
    const saveDelay = setTimeout(async () => {
      try {
        const response = await authFetch(`/api/workspaces/${currentWorkspaceId}`, {
          method: "PUT",
          body: JSON.stringify({
            name: workspaceName,
            slides: clientSlides
          })
        });

        if (response.ok) {
          setSaveStatus("saved");
          // Refresh dashboard list entries to sync name and dates in the background
          fetchWorkspaces();
        } else {
          setSaveStatus("error");
        }
      } catch (err) {
        console.error("Auto-save sync failure:", err);
        setSaveStatus("error");
      }
    }, 1000); // 1-second auto-save debounce delay

    return () => clearTimeout(saveDelay);
  }, [clientSlides, workspaceName, currentWorkspaceId]);

  // Helper parsing title of a slide for Left Sidebar list items
  const getSlideTitle = (slide: Slide, index: number): string => {
    if (slide.title) return slide.title;
    const content = slide.markdownContent || "";
    if (!content) return `Slide ${index + 1}`;
    const lines = content.split("\n");
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.startsWith("# ") || trimmed.startsWith("## ") || trimmed.startsWith("### ")) {
        return trimmed.replace(/^#+ /, "").replace(/[#*`_~]/g, "").substring(0, 36);
      }
    }
    return `Slide ${index + 1}`;
  };

  // Stop vocal speech playback
  const handleStopSpeech = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    setTtsPlaying(false);
    setTtsPaused(false);
  };

  // Pause vocal speech playback
  const handlePauseSpeech = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      setTtsPlaying(false);
      setTtsPaused(true);
    }
  };

  // Resume vocal speech playback
  const handleResumeSpeech = () => {
    if (audioRef.current) {
      audioRef.current.playbackRate = ttsSpeed;
      audioRef.current.play().catch((playErr) => {
        console.error("Audio playback interrupted by browser constraints:", playErr);
        setTtsPlaying(false);
        setTtsPaused(false);
      });
      setTtsPlaying(true);
      setTtsPaused(false);
    }
  };

  // Stop speech when switching workspaces or slides, and clean up on unmount
  useEffect(() => {
    handleStopSpeech();
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, [activeSlideIndex, currentWorkspaceId]);

  // Indian Accent Natural Vocal Synthesizer Executor
  const handleGenerateTTS = async (textToPlay: string) => {
    if (!textToPlay.trim()) return;

    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }

    try {
      setTtsPlaying(true);
      setTtsLoading(true);
      setTtsPaused(false);

      const response = await authFetch("/api/tts", {
        method: "POST",
        body: JSON.stringify({ text: textToPlay })
      });

      if (!response.ok) {
        throw new Error("Failed to capture TTS audio chunk from endpoint");
      }

      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);

      const audio = new Audio(audioUrl);
      audioRef.current = audio;

      // Trigger standard HTML5 media behaviors with secure play triggers
      audio.oncanplaythrough = () => {
        setTtsLoading(false);
        audio.playbackRate = ttsSpeed;
        audio.play().catch((playErr) => {
          console.error("Audio playback interrupted by browser constraints:", playErr);
          setTtsPlaying(false);
          setTtsPaused(false);
        });
      };

      audio.onended = () => {
        setTtsPlaying(false);
        setTtsPaused(false);
        audioRef.current = null;
      };

      audio.onerror = () => {
        setTtsPlaying(false);
        setTtsPaused(false);
        setTtsLoading(false);
        audioRef.current = null;
        alert("Audio rendering resource error occurred.");
      };
    } catch (err) {
      console.error("Speech process engine failed:", err);
      setTtsPlaying(false);
      setTtsLoading(false);
      setTtsPaused(false);
    }
  };

  const handleSpeedChange = (newSpeed: number) => {
    setTtsSpeed(newSpeed);
    if (audioRef.current) {
      audioRef.current.playbackRate = newSpeed;
    }
  };

  // Add new slide index in client manually
  const addNewSlide = () => {
    const newSlideNumber = clientSlides.length + 1;
    const newSlide = {
      id: `slide_${Math.random().toString(36).substring(2, 9)}`,
      workspaceId: currentWorkspaceId || "",
      slideNumber: newSlideNumber,
      markdownContent: `# Slide ${newSlideNumber}\n\n- Paste or write your content for slide ${newSlideNumber} here.`,
      audioUrl: ""
    };

    const updated = [...clientSlides, newSlide];
    setClientSlides(updated);
    setActiveSlideIndex(clientSlides.length);
    setEditorMarkdown(newSlide.markdownContent);
  };

  // Remove active selected slide
  const deleteActiveSlide = () => {
    if (clientSlides.length <= 1) return;

    const updated = [...clientSlides];
    updated.splice(activeSlideIndex, 1);

    // Re-index remaining slide numbers
    const reindexed = updated.map((sl, idx) => ({
      ...sl,
      slideNumber: idx + 1
    }));

    const nextIndex = Math.max(0, activeSlideIndex - 1);
    setClientSlides(reindexed);
    setActiveSlideIndex(nextIndex);
    if (reindexed[nextIndex]) {
      setEditorMarkdown(reindexed[nextIndex].markdownContent);
    }
  };

  // Format date helper
  const formatDate = (isoStr: string) => {
    try {
      const d = new Date(isoStr);
      return d.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit"
      });
    } catch (e) {
      return "Recently";
    }
  };

  // Shared app download markdown document raw format
  const downloadMarkdown = () => {
    const compiled = clientSlides.map(s => s.markdownContent).join("\n\n---\n\n");
    const blob = new Blob([compiled], { type: "text/markdown;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `${workspaceName.toLowerCase().replace(/\s+/g, "_")}_presentation.md`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // --- RENDERING LANDING / AUTHENTICATION SCREEN ---
  if (!activeUser) {
    return (
      <div className="min-h-screen bg-linear-to-br from-slate-950 via-slate-900 to-indigo-950 text-slate-100 flex flex-col items-center justify-center p-4 md:p-6 select-none font-sans relative overflow-hidden transition-all duration-300">
        
        {/* Ambient abstract glowing blur bubbles */}
        <div className="absolute top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 w-72 h-72 bg-blue-600/10 rounded-full blur-3xl pointer-events-none animate-pulse duration-[8000ms]" />
        <div className="absolute bottom-1/4 right-1/4 translate-x-1/2 translate-y-1/2 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none animate-pulse duration-[6000ms]" />

        <div className="w-full max-w-md bg-slate-900/80 backdrop-blur-md rounded-2xl border border-slate-850 shadow-2xl p-6 sm:p-8 relative z-10 hover:border-slate-800 transition duration-300 flex flex-col gap-6">
          
          {/* Logo & Headline */}
          <div className="text-center">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-950/60 border border-blue-900/60 rounded-full text-blue-400 text-xs font-semibold mb-4 tracking-wider uppercase">
              <Sparkles className="w-3.5 h-3.5 text-blue-400 animate-pulse" />
              <span>ScribeSlide AI Keypad Access</span>
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-white via-slate-100 to-slate-350 bg-clip-text text-transparent leading-none drop-shadow-sm mb-1.5 flex items-center justify-center gap-2">
              <Presentation className="w-7 h-7 text-blue-500" />
              <span>ScribeSlide</span>
            </h1>
            <p className="text-[11px] text-slate-400 font-mono uppercase tracking-widest mt-1">
              Secure Presentation Board Room
            </p>
          </div>

          {/* Toggle Tabs */}
          <div className="grid grid-cols-2 p-1 bg-slate-950 rounded-xl border border-slate-850">
            <button
              type="button"
              onClick={() => {
                setAuthMode("LOGIN");
                setAuthError(null);
                setAuthSuccess(null);
              }}
              className={`py-2 text-xs font-extrabold rounded-lg tracking-wider uppercase transition cursor-pointer ${
                authMode === "LOGIN"
                  ? "bg-blue-600 text-white shadow"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-900/40"
              }`}
            >
              Log In
            </button>
            <button
              type="button"
              onClick={() => {
                setAuthMode("REGISTER");
                setAuthError(null);
                setAuthSuccess(null);
              }}
              className={`py-2 text-xs font-extrabold rounded-lg tracking-wider uppercase transition cursor-pointer ${
                authMode === "REGISTER"
                  ? "bg-blue-600 text-white shadow"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-900/40"
              }`}
            >
              Sign Up
            </button>
          </div>

          {/* Error and Success Feedback Alerts */}
          {authError && (
            <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 px-4 py-3 rounded-xl text-xs flex items-center gap-2 animate-bounce">
              <span className="font-bold">⚠️</span>
              <span>{authError}</span>
            </div>
          )}
          {authSuccess && (
            <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-4 py-3 rounded-xl text-xs flex items-center gap-2">
              <span className="font-bold">✨</span>
              <span>{authSuccess}</span>
            </div>
          )}

          {/* Form */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleAuthSubmit();
            }}
            className="flex flex-col gap-4 text-left"
          >
            {/* Input fields */}
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1 font-mono">
                Creator Username
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 text-xs font-bold">
                  @
                </span>
                <input
                  type="text"
                  maxLength={25}
                  placeholder="e.g. prashant"
                  value={usernameInput}
                  onChange={(e) => setUsernameInput(e.target.value.toLowerCase().replace(/[^a-z0-0_]/g, ""))}
                  className="w-full bg-slate-950 border border-slate-850 hover:border-slate-800 focus:border-blue-500 p-3 pl-8 text-sm text-slate-100 rounded-xl outline-none transition"
                  required
                />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1 font-mono flex justify-between items-center">
                <span>4-Digit Security PIN</span>
                <span className="text-[9px] text-slate-500 tracking-wide font-sans normal-case">Numbers only</span>
              </label>
              
              {/* Masked PIN Slot Indicators */}
              <div 
                className={`flex justify-between items-center gap-3 bg-slate-950 border p-3 px-4 rounded-xl relative transition-all duration-200 ${
                  isPinFocused ? "border-blue-500 ring-2 ring-blue-500/15" : "border-slate-850"
                }`}
              >
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="\d*"
                  maxLength={4}
                  placeholder="••••"
                  value={pinInput}
                  onChange={(e) => setPinInput(e.target.value.replace(/\D/g, "").slice(0, 4))}
                  onFocus={() => setIsPinFocused(true)}
                  onBlur={() => setIsPinFocused(false)}
                  className="absolute inset-0 opacity-0 cursor-text w-full h-full z-20 outline-none"
                  required
                />
                
                {/* Visual PIN Lights */}
                <div className="flex gap-4.5 mx-auto justify-center select-none py-1 relative z-10 pointer-events-none">
                  {[0, 1, 2, 3].map((idx) => {
                    const hasVal = pinInput.length > idx;
                    const isCurrent = pinInput.length === idx && isPinFocused;
                    return (
                      <div
                        key={idx}
                        className={`w-11 h-11 border rounded-xl flex items-center justify-center font-bold font-mono text-lg transition duration-150 ${
                          hasVal
                            ? "border-blue-500 bg-blue-950/40 text-blue-450 shadow-sm shadow-blue-500/20"
                            : isCurrent
                            ? "border-blue-400 bg-slate-950 text-slate-400"
                            : "border-slate-850 bg-slate-950/70 text-slate-600"
                        } ${hasVal ? "animate-[pulse_1.5s_infinite]" : ""}`}
                      >
                        {hasVal ? "•" : isCurrent ? "_" : ""}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Interactive Numpad Pad Controller */}
            <div className="bg-slate-950/65 p-3 rounded-2xl border border-slate-850/60 grid grid-cols-3 gap-2 mt-1">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                <button
                  key={num}
                  type="button"
                  onClick={() => {
                    if (pinInput.length < 4) setPinInput((p) => p + num);
                  }}
                  className="py-2.5 bg-slate-900 hover:bg-slate-850 text-slate-200 text-sm font-bold font-mono rounded-xl border border-slate-850/60 active:scale-95 transition-all text-center cursor-pointer"
                >
                  {num}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setPinInput("")}
                className="py-2.5 bg-rose-950/40 hover:bg-rose-900/30 text-rose-450 border border-rose-900/30 text-xs font-bold rounded-xl active:scale-95 transition-all text-center cursor-pointer"
              >
                Clear
              </button>
              <button
                type="button"
                onClick={() => {
                  if (pinInput.length < 4) setPinInput((p) => p + "0");
                }}
                className="py-2.5 bg-slate-900 hover:bg-slate-850 text-slate-200 text-sm font-bold font-mono rounded-xl border border-slate-850/60 active:scale-95 transition-all text-center cursor-pointer"
              >
                0
              </button>
              <button
                type="button"
                onClick={() => setPinInput((p) => p.slice(0, -1))}
                className="py-2.5 bg-slate-800/80 hover:bg-slate-750 text-slate-350 text-xs font-bold rounded-xl active:scale-95 transition-all text-center cursor-pointer"
              >
                Del
              </button>
            </div>

            {/* Action Submit Indicator (Rendered only when submitting since button is removed) */}
            {authSubmitting && (
              <div className="mt-2 w-full py-3.5 bg-blue-600/20 border border-blue-500/30 rounded-xl flex items-center justify-center gap-2 text-blue-400 text-xs font-semibold uppercase tracking-wider animate-pulse">
                <Loader2 className="w-4 h-4 text-blue-400 animate-spin" />
                <span>Verifying PIN Code...</span>
              </div>
            )}
          </form>

          {/* Prompt footer */}
          <p className="text-[10px] text-slate-500 leading-normal text-center mt-1 pl-1 italic">
            PIN authentication is entirely saved in local cloud-secured workspaces. Keep your 4-digit numeric code safely on backup.
          </p>
        </div>
      </div>
    );
  }

  // --- RENDERING APP WORKSPACE (authenticated user) ---
  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col font-sans">
      
      {/* ────────────────────────────────────────────────────────────────────────
          SCREEN 1: DASHBOARD VIEW
          ──────────────────────────────────────────────────────────────────────── */}
      {currentWorkspaceId === null ? (
        <div className="flex-1 flex flex-col selection:bg-blue-100">
          {/* Main Dashboard Navbar */}
          <header className="bg-slate-900 text-white shadow-xl shadow-slate-900/10 px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Presentation className="w-7 h-7 text-blue-400" />
              <div>
                <h1 className="font-extrabold text-xl tracking-tight leading-none bg-gradient-to-r from-white to-slate-200 bg-clip-text text-transparent">
                  ScribeSlide AI Dashboard
                </h1>
                <p className="text-[10px] text-blue-300/80 font-mono mt-1 tracking-wider uppercase">Slide Workspace Controller</p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div
                onClick={handleDeauthenticate}
                className="flex items-center gap-2.5 bg-slate-800/60 hover:bg-slate-800 border border-slate-700/50 hover:border-slate-600 px-3.5 py-1.5 rounded-full cursor-pointer transition select-none group"
                title="Deauthorise / Switch User Account"
              >
                <div className="w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center font-bold text-xxs text-white">
                  {activeUser?.username?.slice(0, 2).toUpperCase()}
                </div>
                <div className="flex flex-col text-left">
                  <span className="text-[11px] font-extrabold text-slate-100 group-hover:text-blue-300 transition leading-none">
                    @{activeUser?.username}
                  </span>
                  <span className="text-[8px] font-mono text-slate-400 tracking-wider">
                    Switch Account / PIN
                  </span>
                </div>
              </div>
            </div>
          </header>

          <main className="flex-1 max-w-6xl w-full mx-auto p-6 md:p-8">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
              <div>
                <h2 className="text-2xl font-extrabold tracking-tight text-slate-900">My Slide Presentations</h2>
                <p className="text-sm text-slate-500">Edit, manage, and render multi-page documents instantly.</p>
              </div>
              <button
                onClick={() => setIsCreateModalOpen(true)}
                className="flex items-center gap-2 px-4.5 py-2.5 text-sm font-semibold bg-blue-600 hover:bg-blue-500 transition text-white rounded-lg shadow-md shadow-blue-600/15"
              >
                <Plus className="w-4 h-4" />
                <span>Create New Workspace</span>
              </button>
            </div>

            {loadingWorkspaces ? (
              <div className="flex flex-col items-center justify-center py-20 bg-white rounded-xl border border-slate-200 shadow-xs">
                <Loader2 className="w-10 h-10 text-blue-600 animate-spin mb-3" />
                <p className="text-sm text-slate-500 font-mono">Querying Active Presentations...</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 font-sans">
                
                {/* DOTTED CREATE BUTTON CARD */}
                <div
                  onClick={() => setIsCreateModalOpen(true)}
                  className="group relative cursor-pointer border-2 border-dashed border-slate-250 hover:border-blue-400 rounded-xl bg-slate-50/30 hover:bg-blue-50/20 flex flex-col items-center justify-center py-10 px-5 transition duration-155 text-center min-h-[176px]"
                >
                  <div className="w-10 h-10 rounded-full border border-slate-200 bg-white flex items-center justify-center shadow-xs group-hover:scale-105 group-hover:border-blue-200 group-hover:bg-blue-50 transition mb-3">
                    <Plus className="w-5 h-5 text-slate-400 group-hover:text-blue-500 transition animate-pulse" />
                  </div>
                  <span className="font-bold text-slate-850 leading-snug group-hover:text-blue-600 transition text-sm">
                    Create New Workspace
                  </span>
                  <span className="text-[11px] text-slate-400 mt-1">Initialize raw slide templates</span>
                </div>

                {/* WORKSPACE SECTIONS */}
                {workspaces.map((ws) => (
                  <div
                    key={ws.id}
                    onClick={() => openWorkspace(ws)}
                    className="relative cursor-pointer bg-white border border-slate-200 hover:border-blue-500 hover:shadow-md rounded-xl overflow-hidden transition duration-155 flex flex-col h-44 justify-between p-5"
                  >
                    {/* Top layout */}
                    <div className="flex justify-between items-start">
                      <div className="w-9 h-9 rounded-lg bg-blue-50 border border-blue-105 flex items-center justify-center">
                        <Notebook className="w-4.5 h-4.5 text-blue-600" />
                      </div>

                      {/* Dropdown 3 dots workspace buttons container */}
                      <div className="relative">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveDropdownId(activeDropdownId === ws.id ? null : ws.id);
                          }}
                          className="p-1 px-2 text-slate-400 hover:text-slate-800 rounded bg-slate-50 hover:bg-slate-100 transition text-xs font-bold leading-normal"
                          title="Options"
                        >
                          &bull;&bull;&bull;
                        </button>

                        {activeDropdownId === ws.id && (
                          <div
                            onClick={(e) => e.stopPropagation()}
                            className="absolute right-0 mt-1 w-32 bg-white border border-slate-200 rounded-lg shadow-lg py-1 z-30 font-sans text-xs"
                          >
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                e.preventDefault();
                                openRenameModal(ws, e);
                              }}
                              className="w-full flex items-center gap-2 px-3 py-2 text-slate-750 hover:bg-slate-50 text-left transition"
                            >
                              <Edit className="w-3.5 h-3.5 text-slate-400" />
                              <span>Rename</span>
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                e.preventDefault();
                                openDeleteModal(ws, e);
                              }}
                              className="w-full flex items-center gap-2 px-3 py-2 text-rose-600 hover:bg-rose-50 text-left transition"
                            >
                              <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                              <span>Delete</span>
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Middle layout */}
                    <div>
                      <h3 className="font-bold text-slate-900 text-base leading-tight mt-2 mb-1 truncate block hover:text-blue-600">
                        {ws.name}
                      </h3>
                      <p className="text-[11px] text-slate-400 flex items-center gap-1 font-mono">
                        <span>Edited {formatDate(ws.updatedAt)}</span>
                      </p>
                    </div>

                    {/* Clean base design footer */}
                    <div className="border-t border-slate-100 pt-2.5 flex items-center justify-between text-[10px] text-slate-500 font-mono uppercase tracking-wider">
                      <span>{ws.slidesCount || 1} Slides</span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setShortsWorkspaceId(ws.id);
                          setShortsWorkspaceName(ws.name);
                          setIsShortsOpen(true);
                        }}
                        className="flex items-center gap-1 bg-indigo-50 border border-indigo-100 hover:bg-indigo-100 text-indigo-700 px-2.5 py-1 rounded-lg text-[9px] font-bold tracking-normal uppercase transition cursor-pointer shadow-4xs shrink-0"
                        title="View AI Revision Shorts"
                      >
                        <Sparkles className="w-2.5 h-2.5 text-yellow-550 fill-yellow-500 animate-pulse" />
                        <span>AI Shorts</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </main>
        </div>
      ) : (
        /* ────────────────────────────────────────────────────────────────────────
          SCREEN 2: POWERPOINT WORKSPACE EDITOR VIEW
          ──────────────────────────────────────────────────────────────────────── */
        <div className="flex-1 flex flex-col h-screen overflow-hidden selection:bg-blue-100">
          
          {/* Workspace Presentation Header Toolbar */}
          <header className="bg-slate-900 text-white shadow-md border-b border-slate-800 px-4 py-3 flex items-center justify-between shrink-0 select-none">
            <div className="flex items-center gap-3 min-w-0">
              <button
                onClick={() => {
                  handleStopSpeech();
                  setCurrentWorkspaceId(null);
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded bg-slate-800 hover:bg-slate-700 hover:text-white transition"
                title="Go back to dashboard"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Dashboard</span>
              </button>
              
              <div className="h-5 w-px bg-slate-755 mx-1" />
              
              <div className="flex items-center gap-2 min-w-0">
                <FolderOpen className="w-4 h-4 text-sky-400 shrink-0" />
                <span className="font-extrabold text-sm sm:text-base tracking-tight truncate block">
                  {workspaceName}
                </span>
                
                {/* Synced AutoSave Notification Bar */}
                <span className="shrink-0 flex items-center gap-1.5 text-[10px] uppercase font-mono px-2 py-0.5 rounded-md bg-slate-800 font-medium">
                  {saveStatus === "saving" && (
                    <>
                      <Loader2 className="w-2.5 h-2.5 text-amber-400 animate-spin" />
                      <span className="text-amber-400">Syncing...</span>
                    </>
                  )}
                  {saveStatus === "saved" && (
                    <>
                      <Check className="w-2.5 h-2.5 text-emerald-400" />
                      <span className="text-emerald-400">Synced</span>
                    </>
                  )}
                  {saveStatus === "idle" && <span className="text-slate-400">Idle</span>}
                  {saveStatus === "error" && <span className="text-rose-400">Sync Error</span>}
                </span>
              </div>
            </div>

            {/* Top Toolbar right control buttons */}
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={downloadMarkdown}
                title="Download RAW markdown Presentation file"
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold uppercase bg-slate-800 hover:bg-slate-700 hover:text-white transition rounded"
              >
                <Download className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Export MD</span>
              </button>

              <button
                onClick={() => {
                  alert(`Presenter Link: ${window.location.origin}/workspace/${currentWorkspaceId}`);
                }}
                title="Share presentation outline link"
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold uppercase bg-blue-600 hover:bg-blue-500 text-white transition rounded shadow"
              >
                <Share2 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Share Pitch</span>
              </button>
            </div>
          </header>

          {/* Core Workplace Body (3-Column Layout Workspace) */}
          <div className="flex-1 flex overflow-hidden bg-slate-50 font-sans">
            
            {/* 1. LEFT COLUMN: SLIDES SELECTION */}
            <aside className="w-[200px] bg-slate-100 border-r border-slate-200 flex flex-col shrink-0 select-none">
              
              {/* Grid vs Outline Switch Toolbar */}
              <div className="p-3 border-b border-slate-200">
                <div className="flex bg-slate-200 p-1 rounded-md text-[10px] font-bold uppercase tracking-wider">
                  <button
                    onClick={() => setSidebarMode("GRID")}
                    className={`flex-1 py-1 px-2 rounded-sm transition text-center cursor-pointer ${
                      sidebarMode === "GRID"
                        ? "bg-white text-slate-900 shadow-xs"
                        : "text-slate-500 hover:text-slate-900"
                    }`}
                  >
                    Grid
                  </button>
                  <button
                    onClick={() => setSidebarMode("OUTLINE")}
                    className={`flex-1 py-1 px-2 rounded-sm transition text-center cursor-pointer ${
                      sidebarMode === "OUTLINE"
                        ? "bg-white text-slate-900 shadow-xs"
                        : "text-slate-500 hover:text-slate-900"
                    }`}
                  >
                    Outline
                  </button>
                </div>
              </div>

              {/* Sequential slide scrolling indices */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {clientSlides.map((slide, sIdx) => {
                  const isActive = sIdx === activeSlideIndex;
                  return (
                    <div
                      key={slide.id}
                      onClick={() => {
                        selectSlide(sIdx);
                      }}
                      className="space-y-1 cursor-pointer group"
                    >
                      <div className={`text-[10px] uppercase font-bold mb-1 tracking-wider flex items-center justify-between ${isActive ? "text-blue-600" : "text-slate-400 group-hover:text-slate-600"}`}>
                        <div className="flex items-center gap-1.5 truncate flex-1 mr-2">
                          <span className="shrink-0 font-mono">S{sIdx + 1}:</span>
                          {editingSlideIdx === sIdx ? (
                            <input
                              type="text"
                              autoFocus
                              className="text-[10px] font-bold font-sans text-slate-900 border border-blue-500 rounded px-1.5 py-0.5 bg-white outline-none w-full max-w-[125px]"
                              value={slideTitleInput}
                              onChange={(e) => setSlideTitleInput(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  saveSlideTitle(sIdx, slideTitleInput);
                                } else if (e.key === "Escape") {
                                  setEditingSlideIdx(null);
                                }
                              }}
                              onClick={(e) => e.stopPropagation()}
                              onBlur={() => saveSlideTitle(sIdx, slideTitleInput)}
                            />
                          ) : (
                            <span 
                              onDoubleClick={(e) => startEditingSlideTitle(e, sIdx, getSlideTitle(slide, sIdx))}
                              className="truncate font-semibold cursor-pointer max-w-[130px] hover:underline"
                              title="Double click to rename"
                            >
                              {getSlideTitle(slide, sIdx)}
                            </span>
                          )}
                        </div>
                        {editingSlideIdx !== sIdx && (
                          <button
                            onClick={(e) => startEditingSlideTitle(e, sIdx, getSlideTitle(slide, sIdx))}
                            className="opacity-0 group-hover:opacity-100 p-0.5 text-slate-400 hover:text-blue-600 hover:bg-slate-200 rounded transition shrink-0 cursor-pointer"
                            title="Rename slide title"
                          >
                            <Edit3 className="w-2.5 h-2.5" />
                          </button>
                        )}
                      </div>

                      {sidebarMode === "GRID" ? (
                        /* GRID THEME CARD - VISUAL THUMBNAIL PREVIEW restored! */
                        <div
                          className={`aspect-video bg-white rounded-lg border transition-all overflow-hidden relative shadow-3xs ${
                            isActive
                              ? "border-blue-600 ring-2 ring-blue-500/10 shadow-sm"
                              : "border-slate-250 opacity-80 hover:opacity-100 hover:border-slate-400"
                          }`}
                        >
                          {/* Mini visual renderer wrapper */}
                          <div className="absolute inset-0 origin-top-left scale-[0.45] w-[222%] h-[222%] overflow-hidden pointer-events-none select-none p-2 text-[8px] leading-relaxed">
                            <SlideRenderer
                              content={slide.markdownContent}
                              canvasData={slide.canvasData || ""}
                              isReaderMode={isReaderMode}
                              readerTheme={readerTheme}
                              readerFontSize={10}
                              readerFontFamily={readerFontFamily}
                            />
                          </div>
                        </div>
                      ) : (
                        /* OUTLINE STRIP WITH SIMPLE ACCENT */
                        <div
                          className={`py-2 px-3 rounded-md border text-[11px] text-left transition truncate font-mono flex items-center justify-between ${
                            isActive
                              ? "border-blue-600 bg-blue-50/40 text-blue-950 font-bold"
                              : "border-slate-200 bg-white hover:bg-slate-50 text-slate-600"
                          }`}
                        >
                          <span className="truncate block flex-1">{getSlideTitle(slide, sIdx)}</span>
                          <span className="text-[9px] text-slate-400 shrink-0 select-none">#{sIdx + 1}</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Sticky bottom panel tool adding or deleting slides */}
              <div className="p-3 border-t border-slate-200 flex flex-col gap-2">
                <button
                  onClick={addNewSlide}
                  className="w-full py-3.5 border-2 border-dashed border-slate-300 hover:border-slate-450 rounded-lg flex flex-col items-center justify-center gap-1 text-slate-400 hover:text-slate-700 transition-colors uppercase text-[10px] font-bold cursor-pointer"
                >
                  <Plus className="w-5 h-5 text-slate-450 shrink-0" />
                  <span>New Slide</span>
                </button>
                <button
                  disabled={clientSlides.length <= 1}
                  onClick={() => {
                    if (slideDeleteConfirm) {
                      deleteActiveSlide();
                      setSlideDeleteConfirm(false);
                    } else {
                      setSlideDeleteConfirm(true);
                      setTimeout(() => {
                        setSlideDeleteConfirm(false);
                      }, 4050);
                    }
                  }}
                  title="Remove Selected slide"
                  className={`w-full py-2.5 text-xs font-semibold border rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
                    slideDeleteConfirm 
                      ? "bg-rose-600 hover:bg-rose-700 text-white border-rose-700 animate-pulse font-bold" 
                      : "bg-rose-50 hover:bg-rose-100 text-rose-600 border-rose-200"
                  }`}
                >
                  <Trash2 className={`w-3.5 h-3.5 ${slideDeleteConfirm ? "text-white" : "text-rose-550"}`} />
                  <span>{slideDeleteConfirm ? "Click Again to Confirm" : "Delete active Slide"}</span>
                </button>
              </div>
            </aside>

            {/* 2. MIDDLE COLUMN: MARKDOWN CODE EDITOR & WHITEBOARD CANVAS WORKSPACE */}
            <section className="flex-1 bg-white border-r border-slate-200 flex flex-col overflow-hidden">
              <div className="h-12 border-b border-slate-150 flex items-center px-4 justify-between bg-slate-50/80 shrink-0">
                <div className="flex bg-slate-200/60 p-0.5 rounded-lg border border-slate-250">
                  <button
                    onClick={() => toggleEditorMode("MARKDOWN")}
                    className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all duration-150 flex items-center gap-1.5 cursor-pointer ${
                      activeEditorMode === "MARKDOWN"
                        ? "bg-white text-slate-850 shadow-xs ring-1 ring-slate-200"
                        : "text-slate-500 hover:text-slate-900"
                    }`}
                  >
                    <Edit3 className="w-3.5 h-3.5 text-blue-600" />
                    <span>Markdown Editor</span>
                  </button>
                  <button
                    onClick={() => toggleEditorMode("CANVAS")}
                    className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all duration-150 flex items-center gap-1.5 cursor-pointer ${
                      activeEditorMode === "CANVAS"
                        ? "bg-white text-slate-850 shadow-xs ring-1 ring-slate-200"
                        : "text-slate-500 hover:text-slate-900"
                    }`}
                  >
                    <Palette className="w-3.5 h-3.5 text-indigo-600 animate-pulse" />
                    <span>Canvas Sketchpad</span>
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono font-bold text-slate-400 bg-white border border-slate-150 px-2.5 py-0.5 rounded-full select-none shadow-2xs">
                    {activeEditorMode === "CANVAS" ? "Vector Graphics Sketch" : "Markdown Text Presentation"}
                  </span>
                </div>
              </div>
              
              <div className="flex-1 overflow-hidden flex flex-col">
                {activeEditorMode === "CANVAS" ? (
                  <CanvasEditor
                    canvasDataString={clientSlides[activeSlideIndex]?.canvasData || ""}
                    onChange={handleCanvasChange}
                  />
                ) : (
                  <CodeWorkspace
                    value={editorMarkdown}
                    onChange={handleEditorChange}
                  />
                )}
              </div>
            </section>

            {activeEditorMode === "MARKDOWN" && (
              <>
                {/* Resizer divider drag handle */}
                <div
                  onMouseDown={(e) => {
                    e.preventDefault();
                    setIsResizing(true);
                  }}
                  className={`w-2.5 bg-slate-100 hover:bg-indigo-300 border-l border-r border-slate-200 cursor-col-resize transition-all flex items-center justify-center shrink-0 relative ${
                    isResizing ? "bg-indigo-400 border-indigo-400 shadow-inner z-10" : ""
                  }`}
                  title="Drag horizontally to resize Live Preview"
                >
                  <div className="absolute flex flex-col gap-1 items-center justify-center select-none pointer-events-none">
                    <div className="w-[3px] h-[3px] rounded-full bg-slate-400" />
                    <div className="w-[3px] h-[3px] rounded-full bg-slate-400" />
                    <div className="w-[3px] h-[3px] rounded-full bg-slate-400" />
                    <div className="w-[3px] h-[3px] rounded-full bg-slate-400" />
                  </div>
                </div>

                {/* 3. RIGHT COLUMN: LIVE PREVIEWER CONTAINER */}
                <section
                  style={{ width: `${previewWidth}px` }}
                  className="bg-slate-100 flex flex-col shrink-0 overflow-hidden select-none border-l border-slate-200 shadow-xs"
                >
                  {/* Option Selector Toggle Bar */}
                  <div className="p-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between gap-3 shrink-0">
                    <div className="flex bg-slate-200/90 p-0.5 rounded-lg border border-slate-250">
                      <button
                        onClick={() => setIsReaderMode(false)}
                        className={`px-3 py-1.5 text-[11px] font-bold rounded-md transition duration-150 flex items-center gap-1.5 ${
                          !isReaderMode
                            ? "bg-white text-slate-800 shadow-xs border border-transparent"
                            : "text-slate-500 hover:text-slate-800"
                        }`}
                      >
                        <Presentation className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Card View</span>
                      </button>
                      <button
                        onClick={() => setIsReaderMode(true)}
                        className={`px-3 py-1.5 text-[11px] font-bold rounded-md transition duration-150 flex items-center gap-1.5 ${
                          isReaderMode
                            ? "bg-white text-slate-800 shadow-xs border border-transparent"
                            : "text-slate-500 hover:text-slate-800"
                        }`}
                      >
                        <BookOpen className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Reader View</span>
                      </button>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => setIsFullscreen(true)}
                        className="p-1.5 text-slate-400 hover:text-slate-700 rounded-md hover:bg-slate-200 transition cursor-pointer"
                        title="Fullscreen Mode"
                      >
                        <Maximize2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Reader mode Customization Panel */}
                  {isReaderMode && (
                    <div className="px-4 py-2.5 bg-amber-50/50 border-b border-amber-100/50 flex flex-wrap items-center justify-between gap-3 shrink-0">
                      {/* Theme Colors */}
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] uppercase font-bold text-slate-400 mr-1.5 font-mono">Theme</span>
                        <button
                          onClick={() => setReaderTheme("warm")}
                          className={`w-4.5 h-4.5 rounded-full border bg-[#FAF6EF] transition ${
                            readerTheme === "warm" ? "ring-2 ring-amber-500 scale-110 border-transparent" : "border-slate-350"
                          }`}
                          title="Warm Book Sepia"
                        />
                        <button
                          onClick={() => setReaderTheme("light")}
                          className={`w-4.5 h-4.5 rounded-full border bg-white transition ${
                            readerTheme === "light" ? "ring-2 ring-indigo-500 scale-110 border-transparent" : "border-slate-350"
                          }`}
                          title="Classic White"
                        />
                        <button
                          onClick={() => setReaderTheme("dark")}
                          className={`w-4.5 h-4.5 rounded-full border bg-[#1E2022] transition ${
                            readerTheme === "dark" ? "ring-2 ring-rose-500 scale-110 border-transparent" : "border-slate-350"
                          }`}
                          title="Eyes-ease Midnight"
                        />
                      </div>

                      {/* Font Face Picker */}
                      <div className="flex items-center gap-1">
                        <span className="text-[10px] uppercase font-bold text-slate-400 mr-1.5 font-mono">Font</span>
                        <select
                          value={readerFontFamily}
                          onChange={(e) => setReaderFontFamily(e.target.value as any)}
                          className="text-[11px] bg-white border border-slate-200 py-0.5 px-2 rounded-md outline-none font-sans font-medium text-slate-600 focus:border-indigo-400"
                        >
                          <option value="serif">Serif (Classic)</option>
                          <option value="sans">Sans (Inter)</option>
                          <option value="mono">Mono (Tech)</option>
                        </select>
                      </div>

                      {/* Font Size adjustable controls */}
                      <div className="flex items-center gap-1 bg-white border border-slate-200 rounded p-0.5">
                        <button
                          onClick={() => setReaderFontSize(prev => Math.max(12, prev - 1))}
                          className="w-5 h-5 text-[10px] font-bold text-slate-500 hover:text-slate-800 hover:bg-slate-50 rounded transition"
                          title="Smaller letters"
                        >
                          A-
                        </button>
                        <span className="text-[9px] font-mono font-bold text-slate-400 px-1 select-none">
                          {readerFontSize}
                        </span>
                        <button
                          onClick={() => setReaderFontSize(prev => Math.min(28, prev + 1))}
                          className="w-5 h-5 text-[10px] font-bold text-slate-500 hover:text-slate-800 hover:bg-slate-50 rounded transition"
                          title="Larger letters"
                        >
                          A+
                        </button>
                      </div>
                    </div>
                  )}

                  {/* TTS Narrator Control Bar (Above Live Preview) with speed control slider */}
                  <div className="px-4 py-3 bg-white border-b border-slate-200 flex flex-col gap-2 shrink-0 shadow-3xs">
                    <div className="flex items-center justify-between gap-3">
                      {/* Audio Controls */}
                      <div className="flex items-center gap-2">
                        {/* Listen/Loading/Pause/Resume Button */}
                        {(() => {
                          if (ttsLoading) {
                            return (
                              <button
                                disabled
                                className="px-3 py-2.5 rounded-lg text-xs font-bold transition flex items-center gap-2 border shadow-4xs bg-blue-50 border-blue-200 text-blue-700 opacity-60 cursor-not-allowed"
                              >
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                <span>Loading Voice...</span>
                              </button>
                            );
                          }
                          
                          if (ttsPlaying && !ttsPaused) {
                            // Currently playing: Show Pause
                            return (
                              <button
                                onClick={handlePauseSpeech}
                                className="px-3 py-2.5 rounded-lg text-xs font-bold transition flex items-center gap-2 cursor-pointer border shadow-4xs bg-indigo-50 border-indigo-200 text-indigo-700 hover:bg-indigo-100"
                                title="Pause Vocal Narration"
                              >
                                <Pause className="w-3.5 h-3.5" />
                                <span>Pause</span>
                              </button>
                            );
                          }

                          if (ttsPaused) {
                            // Paused: Show Resume
                            return (
                              <button
                                onClick={handleResumeSpeech}
                                className="px-3 py-2.5 rounded-lg text-xs font-bold transition flex items-center gap-2 cursor-pointer border shadow-4xs bg-emerald-50 border-emerald-250 text-emerald-700 hover:bg-emerald-100"
                                title="Resume Vocal Narration"
                              >
                                <Play className="w-3.5 h-3.5" />
                                <span>Resume</span>
                              </button>
                            );
                          }

                          // Default: Idle (Show Listen Slide)
                          return (
                            <button
                              disabled={!clientSlides[activeSlideIndex]?.markdownContent.trim()}
                              onClick={() => {
                                handleGenerateTTS(
                                  clientSlides[activeSlideIndex]?.markdownContent || "Welcome to ScribeSlide AI presentation unit"
                                );
                              }}
                              className="px-3 py-2.5 rounded-lg text-xs font-bold transition flex items-center gap-2 cursor-pointer border shadow-4xs bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100 disabled:opacity-50 disabled:cursor-not-allowed"
                              title="Listen via Neural Text-to-Speech"
                            >
                              <Volume2 className="w-3.5 h-3.5 shrink-0" />
                              <span>Listen Slide</span>
                            </button>
                          );
                        })()}

                        {/* Stop Button (only visible if playing or paused) */}
                        {(ttsPlaying || ttsPaused) && (
                          <button
                            onClick={handleStopSpeech}
                            className="px-3 py-2.5 rounded-lg text-xs font-bold transition flex items-center gap-2 cursor-pointer border shadow-4xs bg-rose-50 border-rose-250 text-rose-700 hover:bg-rose-100"
                            title="Stop Vocal Narration"
                          >
                            <VolumeX className="w-3.5 h-3.5" />
                            <span>Stop</span>
                          </button>
                        )}
                      </div>

                      {/* Speed Slider / Rate Control */}
                      <div className="flex items-center gap-2.5 bg-slate-50 border border-slate-200 px-2.5 py-1.5 rounded-lg flex-1 max-w-[220px]">
                        <span className="text-[9px] font-bold font-mono text-slate-400 uppercase select-none">Speed</span>
                        <input
                          type="range"
                          min="0.5"
                          max="2.0"
                          step="0.1"
                          value={ttsSpeed}
                          onChange={(e) => handleSpeedChange(Number(e.target.value))}
                          className="w-full h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-605 focus:outline-none"
                        />
                        <span className="text-[10px] font-mono font-bold text-slate-600 bg-white border border-slate-200 px-1.5 py-0.5 rounded shadow-3xs min-w-[34px] text-center">
                          {ttsSpeed.toFixed(1)}x
                        </span>
                      </div>
                    </div>

                    {/* Wave animation indicator while vocal is actively playing */}
                    {ttsPlaying && !ttsLoading && (
                      <div className="flex items-center gap-2 px-1 py-0.5 border-t border-slate-100 mt-1 pt-1.5">
                        <span className="text-[9px] font-mono text-slate-400 uppercase tracking-widest shrink-0">Playing narration</span>
                        <div className="flex items-end gap-0.5 h-3.5 overflow-hidden">
                          <div className="w-0.5 bg-blue-500 animate-[bounce_0.8s_infinite] h-20" style={{ height: "8px" }} />
                          <div className="w-0.5 bg-blue-400 animate-[bounce_0.5s_infinite_0.1s]" style={{ height: "14px" }} />
                          <div className="w-0.5 bg-blue-500 animate-[bounce_0.6s_infinite_0.2s]" style={{ height: "11px" }} />
                          <div className="w-0.5 bg-blue-400 animate-[bounce_0.4s_infinite_0.15s]" style={{ height: "6px" }} />
                          <div className="w-0.5 bg-blue-500 animate-[bounce_0.7s_infinite_0.3s]" style={{ height: "10px" }} />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Main Preview Slide Card Body Frame */}
                  <div className="flex-1 p-6 sm:p-8 overflow-y-auto bg-slate-200/60">
                    <div
                      className={`flex flex-col p-8 sm:p-12 min-h-[460px] h-full justify-between rounded-2xl shadow-xl transition-all duration-305 ${
                        isReaderMode
                          ? readerTheme === "warm"
                            ? "bg-[#FAF6EF] text-[#2C2417] border border-[#e8dfcf]"
                            : readerTheme === "dark"
                            ? "bg-[#1E2022] text-[#E0E2E4] border border-slate-800"
                            : "bg-white text-slate-800 border border-slate-200"
                          : "bg-white rounded-2xl shadow-xl text-slate-800 border border-slate-200"
                      }`}
                    >
                      {/* Dynamic parsed slide visual elements */}
                      <div className="flex-1 overflow-y-auto pr-1">
                        {clientSlides[activeSlideIndex] ? (
                          <SlideRenderer
                            content={clientSlides[activeSlideIndex].markdownContent}
                            canvasData={clientSlides[activeSlideIndex].canvasData || ""}
                            isReaderMode={isReaderMode}
                            readerTheme={readerTheme}
                            readerFontSize={readerFontSize}
                            readerFontFamily={readerFontFamily}
                          />
                        ) : (
                          <div className="text-slate-400 text-center py-20 font-mono text-xs leading-relaxed">
                            No active slide content found. Create a slide page first.
                          </div>
                        )}
                      </div>

                      {/* Card synchronized footer */}
                      <div className={`mt-10 flex justify-between items-end border-t pt-5 shrink-0 ${
                        isReaderMode
                          ? readerTheme === "warm"
                            ? "border-[#ebdcc3] text-[#a89679]/90 font-serif"
                            : readerTheme === "dark"
                            ? "border-slate-800 text-slate-500"
                            : "border-slate-100 text-slate-400"
                          : "border-slate-100 text-slate-400"
                      }`}>
                        <div className="text-[10px] font-mono">
                          Slide {activeSlideIndex + 1} / {clientSlides.length || 1}
                        </div>
                        <div className="text-[9px] font-bold uppercase tracking-widest opacity-60">
                          {isReaderMode ? "Reader Feed" : "ScribeSlide"}
                        </div>
                      </div>
                    </div>
                  </div>
                </section>
              </>
            )}

          </div>
        </div>
      )}

      {/* ────────────────────────────────────────────────────────────────────────
          GLOBAL WORKSPACE OVERLAY MODALS
          ──────────────────────────────────────────────────────────────────────── */}
      
      {/* 1. CREATE WORKSPACE MODAL */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4 select-none">
          <div className="relative bg-white w-full max-w-md rounded-2xl border border-slate-200 shadow-2xl p-6 overflow-hidden">
            <h2 className="text-xl font-extrabold text-slate-900 mb-1 tracking-tight">Create Workspace</h2>
            <p className="text-xs text-slate-500 mb-6">Enter a neat name for your next presentation template.</p>
            
            <form onSubmit={handleCreateWorkspace} className="space-y-5">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5 font-mono select-none">
                  Workspace Presentation Name
                </label>
                <input
                  type="text"
                  required
                  value={newWorkspaceName}
                  onChange={(e) => setNewWorkspaceName(e.target.value)}
                  placeholder="e.g. Q3 Product Launch Roadmap"
                  className="w-full text-sm border border-slate-250 rounded-xl px-4 py-3 outline-none focus:border-blue-500 text-slate-800 bg-slate-50/50"
                  autoFocus
                />
              </div>

              <div className="flex gap-3 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsCreateModalOpen(false);
                    setNewWorkspaceName("");
                  }}
                  className="px-4 py-2 text-xs font-semibold hover:bg-slate-100 rounded-lg text-slate-500 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 tracking-wider uppercase transition rounded-lg shadow-md shadow-blue-600/10"
                >
                  Initialize Hub
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 2. RENAME WORKSPACE MODAL */}
      {isRenameModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4 select-none">
          <div className="relative bg-white w-full max-w-md rounded-2xl border border-slate-200 shadow-2xl p-6 overflow-hidden">
            <h2 className="text-xl font-extrabold text-slate-900 mb-1 tracking-tight">Rename Presentation</h2>
            <p className="text-xs text-slate-500 mb-6">Modify the workspace presentation title.</p>
            
            <form onSubmit={handleRenameWorkspace} className="space-y-4">
              <div>
                <input
                  type="text"
                  required
                  value={renameValue}
                  onChange={(e) => setRenameValue(e.target.value)}
                  placeholder="New workspace title"
                  className="w-full text-sm border border-slate-250 rounded-xl px-4 py-3 outline-none focus:border-blue-500 text-slate-800"
                  autoFocus
                />
              </div>

              <div className="flex gap-3 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsRenameModalOpen(false);
                    setWorkspaceToRename(null);
                  }}
                  className="px-4 py-2 text-xs font-semibold hover:bg-slate-100 rounded-lg text-slate-500 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4.5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 tracking-wider uppercase transition rounded-lg"
                >
                  Apply Rename
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 3. CONFIRM DELETE WORKSPACE MODAL */}
      {isDeleteModalOpen && workspaceToDelete && (
        <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center bg-slate-900/45 backdrop-blur-xs p-4 select-none">
          <div className="relative bg-white w-full max-w-md rounded-2xl border border-slate-200 shadow-2xl p-6 overflow-hidden">
            <h2 className="text-xl font-extrabold text-slate-900 mb-1 tracking-tight text-rose-600 flex items-center gap-2">
              <Trash2 className="w-5 h-5 text-rose-500" />
              <span>Delete Presentation</span>
            </h2>
            <p className="text-xs text-slate-500 mb-6 mt-1 leading-relaxed">
              Are you sure you want to permanently delete <strong className="text-slate-800 font-bold">"{workspaceToDelete.name}"</strong>? This will discard all {workspaceToDelete.slidesCount || "its"} slides and audio narration tracks permanently. This action cannot be undone.
            </p>
            
            <div className="flex gap-3 justify-end">
              <button
                type="button"
                onClick={() => {
                  setIsDeleteModalOpen(false);
                  setWorkspaceToDelete(null);
                }}
                className="px-4 py-2 text-xs font-semibold hover:bg-slate-100 rounded-lg text-slate-500 transition cursor-pointer"
               >
                No, Keep it
              </button>
              <button
                type="button"
                onClick={handleDeleteWorkspace}
                className="px-4.5 py-2.5 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 tracking-wider uppercase transition rounded-lg shadow-sm cursor-pointer"
              >
                Permanently Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* AI REVISION SHORTS MODAL DIALOG */}
      <RevisionShorts
        isOpen={isShortsOpen}
        onClose={() => setIsShortsOpen(false)}
        workspaceId={shortsWorkspaceId}
        workspaceName={shortsWorkspaceName}
        authFetch={authFetch}
      />

      {/* FULLSCREEN IMMERSIVE PRESENTER & READER MODE */}
      {isFullscreen && (
        <div className="fixed inset-0 z-50 flex flex-col bg-slate-900/98 select-none transition-all duration-300">
          {/* Top Control Header */}
          <header className="h-16 px-6 bg-slate-950 border-b border-slate-800 flex items-center justify-between shrink-0 text-white shadow-xl">
            <div className="flex items-center gap-3">
              <span className="text-[11px] font-bold text-indigo-400 uppercase tracking-widest font-mono">Slideshow Playback</span>
              <div className="h-4 w-px bg-slate-800" />
              <span className="text-sm font-semibold text-slate-200 font-mono truncate max-w-xs sm:max-w-md">
                {workspaceName || "Untitled Pitch"}
              </span>
            </div>

            {/* In-view settings control Panel */}
            <div className="flex items-center gap-4">
              {/* Card vs Reader Mode Toggle in Fullscreen! */}
              <div className="flex bg-slate-800/80 p-0.5 rounded-lg border border-slate-750">
                <button
                  onClick={() => setIsReaderMode(false)}
                  className={`px-3 py-1.5 text-xs font-bold rounded-md transition duration-150 flex items-center gap-1.5 ${
                    !isReaderMode
                      ? "bg-indigo-600 text-white"
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  <Presentation className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Card Layout</span>
                </button>
                <button
                  onClick={() => setIsReaderMode(true)}
                  className={`px-3 py-1.5 text-xs font-bold rounded-md transition duration-150 flex items-center gap-1.5 ${
                    isReaderMode
                      ? "bg-indigo-600 text-white"
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  <BookOpen className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Reader Layout</span>
                </button>
              </div>

              {/* Reader customization choices in Fullscreen! */}
              {isReaderMode && (
                <div className="hidden lg:flex items-center gap-4 bg-slate-800/50 border border-slate-750/80 rounded-xl px-4 py-1">
                  {/* Theme indicator */}
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => setReaderTheme("warm")}
                      className={`w-4.5 h-4.5 rounded-full border bg-[#FAF6EF] transition ${
                        readerTheme === "warm" ? "ring-2 ring-amber-500 scale-110 border-transparent" : "border-slate-600"
                      }`}
                    />
                    <button
                      onClick={() => setReaderTheme("light")}
                      className={`w-4.5 h-4.5 rounded-full border bg-white transition ${
                        readerTheme === "light" ? "ring-2 ring-indigo-500 scale-110 border-transparent" : "border-slate-600"
                      }`}
                    />
                    <button
                      onClick={() => setReaderTheme("dark")}
                      className={`w-4.5 h-4.5 rounded-full border bg-[#1E2022] transition ${
                        readerTheme === "dark" ? "ring-2 ring-rose-500 scale-110 border-transparent" : "border-slate-600"
                      }`}
                    />
                  </div>

                  <div className="h-4 w-px bg-slate-750" />

                  {/* Font dropdown */}
                  <select
                    value={readerFontFamily}
                    onChange={(e) => setReaderFontFamily(e.target.value as any)}
                    className="text-xs bg-slate-900 border border-slate-750 py-0.5 px-2 rounded-md outline-none text-slate-300 font-sans"
                  >
                    <option value="serif">Serif Font</option>
                    <option value="sans">Sans Font</option>
                    <option value="mono">Mono Font</option>
                  </select>

                  <div className="h-4 w-px bg-slate-750" />

                  {/* Font Size controls */}
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setReaderFontSize(prev => Math.max(12, prev - 1))}
                      className="w-5 h-5 text-xs font-semibold text-slate-400 hover:text-white rounded transition hover:bg-slate-700"
                    >
                      A-
                    </button>
                    <span className="text-xs font-mono font-bold text-slate-400">
                      {readerFontSize}
                    </span>
                    <button
                      onClick={() => setReaderFontSize(prev => Math.min(32, prev + 1))}
                      className="w-5 h-5 text-xs font-semibold text-slate-400 hover:text-white rounded transition hover:bg-slate-700"
                    >
                      A+
                    </button>
                  </div>
                </div>
              )}

              <div className="h-6 w-px bg-slate-800" />

              {/* Close Fullscreen Button */}
              <button
                onClick={() => setIsFullscreen(false)}
                className="flex items-center gap-1 px-3 py-1.5 bg-rose-600/90 hover:bg-rose-500 text-white rounded-lg text-xs font-bold transition shadow-lg shrink-0 cursor-pointer"
                title="Press ESC key to exit"
              >
                <Minimize2 className="w-3.5 h-3.5" />
                <span>Exit</span>
              </button>
            </div>
          </header>

          {/* Core Player Slide Presentation Center Stage */}
          <main className="flex-1 flex items-center justify-between px-8 sm:px-12 relative">
            {/* LEFT NAVIGATION COLUMN */}
            <button
              disabled={activeSlideIndex === 0}
              onClick={() => {
                if (activeSlideIndex > 0) {
                  setActiveSlideIndex(prev => prev - 1);
                }
              }}
              className="w-12 h-12 rounded-full border border-slate-800 bg-slate-950/60 hover:bg-slate-950 text-slate-400 hover:text-white flex items-center justify-center transition shadow-lg shrink-0 disabled:opacity-20 disabled:cursor-not-allowed group cursor-pointer"
            >
              <ChevronLeft className="w-6 h-6 transform transition group-hover:-translate-x-0.5" />
            </button>

            {/* CENTER SLIDE HOLDER */}
            <div className="flex-1 max-w-4xl mx-8 py-8 h-full flex flex-col justify-center items-center">
              <div
                className={`w-full max-h-[75vh] min-h-[460px] aspect-video rounded-2xl shadow-2xl flex flex-col p-12 relative overflow-hidden transition-all duration-300 border ${
                  isReaderMode
                    ? readerTheme === "warm"
                      ? "bg-[#FAF6EF] text-[#2C2417] border-[#e8dfcf] shadow-xl"
                      : readerTheme === "dark"
                      ? "bg-[#1E2022] text-[#E0E2E4] border-slate-800 shadow-xl"
                      : "bg-white text-slate-800 border-slate-200 shadow-xl"
                    : "bg-white text-slate-800 border-slate-250 shadow-2xl"
                }`}
              >
                {/* Dynamically parsed slide contents inside fullscreen stage */}
                <div className="flex-1 overflow-y-auto pr-1">
                  {clientSlides[activeSlideIndex] ? (
                    <SlideRenderer
                      content={clientSlides[activeSlideIndex].markdownContent}
                      canvasData={clientSlides[activeSlideIndex].canvasData || ""}
                      isReaderMode={isReaderMode}
                      readerTheme={readerTheme}
                      readerFontSize={readerFontSize}
                      readerFontFamily={readerFontFamily}
                    />
                  ) : (
                    <div className="text-slate-400 text-center py-20 font-mono text-sm leading-normal">
                      No active slide content found. Create a slide page first.
                    </div>
                  )}
                </div>

                {/* Footer section of center slide */}
                <div className={`mt-auto flex justify-between items-end border-t pt-6 ${
                  isReaderMode
                    ? readerTheme === "warm"
                      ? "border-[#ebdcc3] text-[#a89679]"
                      : readerTheme === "dark"
                      ? "border-slate-800 text-slate-500"
                      : "border-slate-100 text-slate-400"
                    : "border-slate-150 text-slate-350"
                }`}>
                  <div className="text-xs font-mono font-bold">
                    Slide {activeSlideIndex + 1} / {clientSlides.length || 1}
                  </div>
                  <div className="text-[10px] font-sans font-bold uppercase tracking-widest opacity-60">
                    {isReaderMode ? "ScribeSlide Fullscreen Reader" : "ScribeSlide Presentation"}
                  </div>
                </div>
              </div>
            </div>

            {/* RIGHT NAVIGATION COLUMN */}
            <button
              disabled={activeSlideIndex === clientSlides.length - 1}
              onClick={() => {
                if (activeSlideIndex < clientSlides.length - 1) {
                  setActiveSlideIndex(prev => prev + 1);
                }
              }}
              className="w-12 h-12 rounded-full border border-slate-800 bg-slate-950/60 hover:bg-slate-950 text-slate-400 hover:text-white flex items-center justify-center transition shadow-lg shrink-0 disabled:opacity-20 disabled:cursor-not-allowed group cursor-pointer"
            >
              <ChevronRight className="w-6 h-6 transform transition group-hover:translate-x-0.5" />
            </button>
          </main>

          {/* Bottom Keyboard Guide Strip */}
          <footer className="h-10 bg-slate-950 border-t border-slate-850 text-[11px] text-slate-500 flex items-center justify-center font-mono gap-1 shrink-0 select-none uppercase tracking-wide">
            <span>Arrow Keys ◀ / ▶ or Spacebar to change slides • Escape to exit fullscreen</span>
          </footer>
        </div>
      )}

    </div>
  );
}
