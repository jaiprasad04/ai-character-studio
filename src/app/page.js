"use client";

import { useSession, signIn } from "next-auth/react";
import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import CustomSelect from "@/components/CustomSelect";
import {
  FaUserFriends,
  FaMagic,
  FaCopy,
  FaCheck,
  FaSpinner,
  FaPaperPlane,
  FaCoins,
  FaComments,
  FaCommentDots,
  FaUserAlt,
  FaGoogle,
} from "react-icons/fa";

const RATIOS = [
  { id: "1:1", name: "1:1 (Square)", emoji: "⏹️" },
  { id: "16:9", name: "16:9 (Widescreen)", emoji: "🌅" },
  { id: "9:16", name: "9:16 (Portrait)", emoji: "📱" },
  { id: "4:3", name: "4:3 (Classic)", emoji: "📺" },
  { id: "3:4", name: "3:4 (Standard)", emoji: "🖼️" },
  { id: "3:2", name: "3:2 (Camera)", emoji: "📸" },
  { id: "2:3", name: "2:3 (Photo)", emoji: "🎞️" },
];

const RESOLUTIONS = [
  { id: "1k", name: "1K Quality", emoji: "📺" },
  { id: "2k", name: "2K Quality", emoji: "🎬" },
  { id: "4k", name: "4K Quality", emoji: "💎" },
];

export default function StudioPage() {
  const { data: session, status: authStatus } = useSession();
  const [prompt, setPrompt] = useState("");
  const [aspectRatio, setAspectRatio] = useState("1:1");
  const [resolution, setResolution] = useState("1k");
  const [inputImage, setInputImage] = useState(null);
  const [uploading, setUploading] = useState(false);

  // Studio states
  const [generating, setGenerating] = useState(false);
  const [requestId, setRequestId] = useState(null);
  const [currentCreation, setCurrentCreation] = useState(null);
  const [copiedText, setCopiedText] = useState(false);

  // Chat Hub states
  const [chatMode, setChatMode] = useState(false);
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState("");
  const [sendingMsg, setSendingMsg] = useState(false);

  const pollInterval = useRef(null);
  const chatBottomRef = useRef(null);

  // Clean polling on unmount
  useEffect(() => {
    return () => {
      if (pollInterval.current) clearInterval(pollInterval.current);
    };
  }, []);

  // Auto-scroll chat to bottom
  useEffect(() => {
    if (chatBottomRef.current) {
      chatBottomRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [chatMessages, sendingMsg]);

  // Upload Reference Photo
  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const formData = new FormData();
    formData.append("file", file);
    try {
      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });
      if (res.ok) {
        const data = await res.json();
        setInputImage(data.url);
      } else {
        alert("Image upload failed");
      }
    } catch (err) {
      console.error(err);
      alert("Image upload failed");
    } finally {
      setUploading(false);
    }
  };

  // Submit generation
  const handleGenerate = async (e) => {
    e.preventDefault();
    if (!session?.user) return;
    if (generating) return;

    if (!prompt.trim()) return;

    setGenerating(true);
    setRequestId(null);
    setCurrentCreation(null);
    setChatMode(false);
    setChatMessages([]);

    try {
      const res = await fetch("/api/creations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt,
          aspectRatio,
          resolution,
          inputImage,
        }),
      });

      if (!res.ok) {
        const errText = await res.text();
        alert(errText);
        setGenerating(false);
        return;
      }

      const creation = await res.json();
      setCurrentCreation(creation);
      setRequestId(creation.requestId);

      // Start polling
      startPolling(creation.requestId);
    } catch (err) {
      console.error(err);
      setGenerating(false);
    }
  };

  // Poll status
  const startPolling = (reqId) => {
    if (pollInterval.current) clearInterval(pollInterval.current);

    pollInterval.current = setInterval(async () => {
      try {
        const res = await fetch(`/api/creations?requestId=${reqId}`);
        if (!res.ok) return;

        const data = await res.json();
        if (data.status === "completed") {
          clearInterval(pollInterval.current);
          setGenerating(false);
          setCurrentCreation(data.creation);

          // Setup initial chat message from character greeting dialog
          setChatMessages([
            { role: "assistant", content: data.creation.greeting || `Hello! I am ${data.creation.name}. Speak with me!` },
          ]);
        } else if (data.status === "failed") {
          clearInterval(pollInterval.current);
          setGenerating(false);
          alert(data.error || "Character generation failed");
        }
      } catch (err) {
        console.error(err);
      }
    }, 3000);
  };

  const handleCopyPrompt = () => {
    if (!currentCreation?.systemPrompt) return;
    navigator.clipboard.writeText(currentCreation.systemPrompt);
    setCopiedText(true);
    setTimeout(() => setCopiedText(false), 2000);
  };

  // Send message in Chat Hub
  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!chatInput.trim() || sendingMsg || !currentCreation) return;

    const userMsg = chatInput.trim();
    setChatInput("");
    setChatMessages((prev) => [...prev, { role: "user", content: userMsg }]);
    setSendingMsg(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          systemPrompt: currentCreation.systemPrompt,
          messages: [...chatMessages, { role: "user", content: userMsg }],
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setChatMessages((prev) => [...prev, { role: "assistant", content: data.reply }]);
      } else {
        setChatMessages((prev) => [
          ...prev,
          { role: "assistant", content: "I apologize, but my neural connection flickered. Speak once more!" },
        ]);
      }
    } catch {
      setChatMessages((prev) => [
        ...prev,
        { role: "assistant", content: "I couldn't hear you. Please check your networks!" },
      ]);
    } finally {
      setSendingMsg(false);
    }
  };

  const currentCost = resolution === "4k" ? 36 : 24;

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col">
      <Navbar />
      <main className="flex-1 flex flex-col md:flex-row md:h-[calc(100vh-3.5rem)] md:overflow-hidden overflow-y-auto">
        
        {/* LEFT PANEL: Character Configurator Panel */}
        <section className="w-full md:w-5/12 border-r border-zinc-800 bg-zinc-950/40 p-6 md:overflow-y-auto overflow-visible flex flex-col gap-6">
          <div>
            <h1 className="text-xl font-extrabold text-white tracking-tight flex items-center gap-2">
              <FaUserFriends className="text-magenta-500 text-sm animate-float" />
              Character Studio
            </h1>
            <p className="text-zinc-500 text-xs mt-1">Describe character details to generate custom avatars and converse in real-time.</p>
          </div>

          <form onSubmit={handleGenerate} className="flex flex-col gap-4">
            {/* Character prompt description */}
            <div className="flex flex-col gap-1.5">
              <span className="text-xs font-semibold text-zinc-400">Backstory & Appearance Prompt</span>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Describe your character's backstory, appearance, details, and Motivations..."
                required
                rows={5}
                className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-800 bg-zinc-900 text-xs text-zinc-300 placeholder-zinc-600 focus:border-magenta-500 focus:outline-none transition-colors resize-none leading-relaxed"
              />
            </div>

            {/* Reference Image Dropzone */}
            <div className="flex flex-col gap-1.5">
              <span className="text-xs font-semibold text-zinc-400">Reference Avatar Image (Optional)</span>
              {inputImage ? (
                <div className="relative w-full rounded-xl border border-zinc-800 bg-zinc-900 p-2 flex items-center gap-3">
                  <img
                    src={inputImage}
                    alt="Reference Avatar"
                    className="w-12 h-12 rounded-lg object-cover border border-zinc-700 shadow-md"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] text-zinc-400 truncate">Reference photo selected</p>
                    <span className="text-[8px] text-magenta-400 uppercase tracking-widest font-bold">Refinement Model Active</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setInputImage(null)}
                    className="px-2.5 py-1.5 rounded-lg bg-red-600/10 hover:bg-red-600/20 text-red-400 text-[10px] font-bold transition-all border border-red-500/10"
                  >
                    Remove
                  </button>
                </div>
              ) : (
                <label className="w-full flex flex-col items-center justify-center border border-dashed border-zinc-800 bg-zinc-900/60 rounded-xl py-4 hover:border-zinc-700 cursor-pointer transition-colors">
                  {uploading ? (
                    <div className="flex flex-col items-center gap-1.5 text-zinc-400">
                      <FaSpinner className="animate-spin text-sm" />
                      <span className="text-[10px]">Uploading reference...</span>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-1 text-zinc-500">
                      <FaMagic className="text-sm animate-float" />
                      <span className="text-[10px]">Click or drag photo here to guide styling</span>
                      <span className="text-[8px] opacity-60">PNG, JPG up to 5MB</span>
                    </div>
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    disabled={uploading}
                    className="hidden"
                  />
                </label>
              )}
            </div>

            {/* Select Grid */}
            <div className="grid grid-cols-2 gap-3">
              <CustomSelect
                label="Aspect Ratio"
                options={RATIOS}
                value={aspectRatio}
                onChange={setAspectRatio}
              />
              <CustomSelect
                label="Output Quality"
                options={RESOLUTIONS}
                value={resolution}
                onChange={setResolution}
              />
            </div>

            {/* Submit Action */}
            {authStatus === "authenticated" ? (
              <button
                type="submit"
                disabled={generating || !prompt.trim()}
                className="w-full flex items-center justify-center gap-2 mt-2 py-3 rounded-xl bg-gradient-to-r from-magenta-500 to-violet-600 hover:from-magenta-400 hover:to-violet-500 disabled:from-zinc-900 disabled:to-zinc-900 disabled:border-zinc-800 disabled:text-zinc-600 border border-transparent text-white font-bold text-xs shadow-lg hover:shadow-magenta-500/20 transition-all cursor-pointer"
              >
                {generating ? (
                  <>
                    <FaSpinner className="animate-spin text-sm" />
                    Generating Character...
                  </>
                ) : (
                  <>
                    <FaMagic className="text-[10px]" />
                    Assemble Character ({currentCost} Credits)
                  </>
                )}
              </button>
            ) : authStatus === "loading" ? (
              <button
                type="button"
                disabled
                className="w-full flex items-center justify-center gap-2 mt-2 py-3 rounded-xl bg-zinc-900 text-zinc-600 text-xs font-bold border border-zinc-800"
              >
                <FaSpinner className="animate-spin" />
                Loading Session...
              </button>
            ) : (
              <button
                type="button"
                onClick={() => signIn("google")}
                className="w-full flex items-center justify-center gap-2 mt-2 py-3 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-700 text-zinc-300 font-bold text-xs transition-colors"
              >
                <FaGoogle className="text-[10px] text-zinc-400" />
                Sign in with Google to Start
              </button>
            )}
          </form>
        </section>

        {/* RIGHT PANEL: Character Display & Chat Hub Panel */}
        <section className="w-full md:w-7/12 p-6 md:overflow-y-auto overflow-visible bg-zinc-950/20 flex flex-col gap-6">
          <div>
            <h2 className="text-sm font-bold text-white tracking-tight flex items-center gap-2">
              <FaComments className="text-magenta-500 text-xs" />
              Studio Output & Companion Chat
            </h2>
            <p className="text-zinc-500 text-[10px] mt-0.5">Explore generated avatar visuals and engage in custom dialogue chats.</p>
          </div>

          <div className="flex-1 flex flex-col gap-4 min-h-[350px]">
            {generating && !currentCreation ? (
              /* Shimmer Loading State */
              <div className="flex-1 border border-zinc-800 bg-zinc-900/30 rounded-2xl p-6 flex flex-col gap-4 animate-pulse-border">
                <div className="flex items-center gap-2 shrink-0">
                  <div className="w-2.5 h-2.5 rounded-full bg-magenta-400 animate-pulse-dot" />
                  <span className="text-[10px] font-bold text-magenta-400 uppercase tracking-widest">Illustrating character portrait...</span>
                </div>
                <div className="aspect-square max-w-[280px] w-full rounded-2xl shimmer shrink-0 mx-auto" />
                <div className="border-t border-zinc-800 my-1 shrink-0" />
                <div className="h-4 w-1/3 rounded shimmer shrink-0" />
                <div className="h-4 w-full rounded shimmer" />
              </div>
            ) : currentCreation && currentCreation.status === "completed" ? (
              /* Completed Output Layout */
              <div className="flex-1 flex flex-col gap-4 animate-slide-up">
                
                {/* Visual Header Detail Card */}
                {!chatMode ? (
                  <div className="border border-zinc-800 bg-zinc-900/30 rounded-2xl p-4 flex flex-col sm:flex-row gap-4 items-center sm:items-start">
                    {/* Portrait Photo */}
                    <img
                      src={currentCreation.avatarImage}
                      alt={currentCreation.name}
                      className="w-32 h-32 rounded-2xl object-cover border border-zinc-700 shadow-xl glow-magenta shrink-0 animate-float"
                    />
                    {/* Profile details */}
                    <div className="flex-1 flex flex-col gap-2 text-center sm:text-left">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div>
                          <h3 className="text-base font-bold text-white leading-snug">{currentCreation.name}</h3>
                          <span className="inline-block mt-1 px-2.5 py-0.5 rounded-full bg-magenta-500/10 border border-magenta-500/20 text-magenta-400 font-semibold text-[8px]">
                            COMPANION
                          </span>
                        </div>
                        <button
                          onClick={() => setChatMode(true)}
                          className="flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-magenta-500 to-violet-600 hover:from-magenta-400 hover:to-violet-500 text-white font-bold text-xs shadow-lg transition-all"
                        >
                          <FaComments className="text-[10px]" />
                          Chat with Character
                        </button>
                      </div>
                      <div className="border-t border-zinc-800/80 my-1" />
                      <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">Backstory & Design Settings</span>
                      <p className="text-[11px] text-zinc-400 leading-relaxed normal-case">{currentCreation.backstory}</p>
                    </div>
                  </div>
                ) : (
                  /* Live Interactive Chat Hub Dashboard Wrapper */
                  <div className="flex-1 border border-zinc-800 bg-zinc-900/20 rounded-2xl flex flex-col overflow-hidden min-h-[300px]">
                    {/* Chat Header */}
                    <div className="px-4 py-3 border-b border-zinc-800 bg-zinc-900/60 flex items-center justify-between shrink-0">
                      <div className="flex items-center gap-2.5">
                        <img
                          src={currentCreation.avatarImage}
                          alt={currentCreation.name}
                          className="w-7 h-7 rounded-full object-cover border border-zinc-700 shrink-0"
                        />
                        <div>
                          <h4 className="text-xs font-bold text-white leading-tight">{currentCreation.name}</h4>
                          <span className="text-[8px] font-medium text-magenta-400 uppercase tracking-widest">Companion</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={handleCopyPrompt}
                          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-[9px] font-bold transition-all border border-zinc-700"
                        >
                          {copiedText ? <FaCheck className="text-emerald-400" /> : <FaCopy />}
                          {copiedText ? "Copied Prompt" : "Copy Prompt"}
                        </button>
                        <button
                          onClick={() => setChatMode(false)}
                          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-red-600/10 hover:bg-red-600/20 text-red-400 text-[9px] font-bold transition-all border border-red-500/10"
                        >
                          Show Portrait
                        </button>
                      </div>
                    </div>

                    {/* Chat dialog bubble lists */}
                    <div className="flex-1 p-4 overflow-y-auto overscroll-contain flex flex-col gap-3 relative max-h-[350px]">
                      {chatMessages.map((msg, idx) => {
                        const isAssistant = msg.role === "assistant";
                        return (
                          <div
                            key={idx}
                            className={`flex gap-2 max-w-[85%] ${
                              isAssistant ? "self-start" : "self-end flex-row-reverse"
                            }`}
                          >
                            {/* Avatar bubble photo */}
                            {isAssistant ? (
                              <img
                                src={currentCreation.avatarImage}
                                alt={currentCreation.name}
                                className="w-6 h-6 rounded-full object-cover shrink-0 border border-zinc-700"
                              />
                            ) : (
                              <div className="w-6 h-6 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center shrink-0">
                                <FaUserAlt className="text-zinc-500 text-[8px]" />
                              </div>
                            )}
                            {/* Speech bubble */}
                            <div className="flex flex-col gap-0.5">
                              <span className="text-[7px] text-zinc-500 font-semibold ml-1">
                                {isAssistant ? currentCreation.name : "You"}
                              </span>
                              <div
                                className={`rounded-2xl px-3.5 py-2.5 text-xs leading-relaxed ${
                                  isAssistant
                                    ? "bg-zinc-900 text-zinc-200 border border-zinc-800 rounded-tl-none font-mono"
                                    : "bg-magenta-600 text-white rounded-tr-none"
                                }`}
                              >
                                {msg.content}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                      
                      {sendingMsg && (
                        <div className="flex gap-2 max-w-[80%] self-start">
                          <img
                            src={currentCreation.avatarImage}
                            alt=""
                            className="w-6 h-6 rounded-full object-cover border border-zinc-700"
                          />
                          <div className="flex flex-col gap-0.5">
                            <span className="text-[7px] text-zinc-500 font-semibold ml-1">{currentCreation.name}</span>
                            <div className="rounded-2xl px-3.5 py-2.5 bg-zinc-900 border border-zinc-800 rounded-tl-none flex items-center justify-center">
                              <FaCommentDots className="text-magenta-500 text-xs animate-bounce" />
                            </div>
                          </div>
                        </div>
                      )}
                      
                      <div ref={chatBottomRef} />
                    </div>

                    {/* Chat Form message sender */}
                    <form onSubmit={handleSendMessage} className="p-3 border-t border-zinc-800 bg-zinc-900/60 flex gap-2 shrink-0">
                      <input
                        type="text"
                        value={chatInput}
                        onChange={(e) => setChatInput(e.target.value)}
                        placeholder={`Talk to ${currentCreation.name}...`}
                        disabled={sendingMsg}
                        className="flex-1 px-3.5 py-2.5 rounded-xl border border-zinc-800 bg-zinc-950 text-xs text-zinc-200 placeholder-zinc-700 focus:border-magenta-500 focus:outline-none transition-colors"
                      />
                      <button
                        type="submit"
                        disabled={sendingMsg || !chatInput.trim()}
                        className="px-4 py-2.5 rounded-xl bg-magenta-600 hover:bg-magenta-500 text-white text-xs font-bold transition-all shadow-md hover:shadow-magenta-500/10 cursor-pointer flex items-center justify-center shrink-0"
                      >
                        <FaPaperPlane />
                      </button>
                    </form>
                  </div>
                )}
              </div>
            ) : (
              /* Empty Placeholder State */
              <div className="flex-1 border border-dashed border-zinc-800 bg-zinc-900/10 rounded-2xl p-8 flex flex-col items-center justify-center text-center gap-4 animate-float">
                <div className="w-16 h-16 rounded-2xl bg-zinc-900/80 border border-zinc-800 flex items-center justify-center shadow-lg">
                  <FaUserFriends className="text-2xl text-zinc-700" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-zinc-400">Workspace is empty</h3>
                  <p className="text-[10px] text-zinc-600 mt-1 max-w-xs leading-normal">
                    Enter the character prompt details on the left, choose your aspect ratio & quality, and click assemble to generate portraits.
                  </p>
                </div>
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
