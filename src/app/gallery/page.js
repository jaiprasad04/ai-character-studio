"use client";

import { useSession, signIn } from "next-auth/react";
import { useState, useEffect, useRef } from "react";
import Navbar from "@/components/Navbar";
import {
  FaImages,
  FaMagic,
  FaCopy,
  FaCheck,
  FaSpinner,
  FaTimes,
  FaGoogle,
  FaUserFriends,
  FaComments,
  FaPaperPlane,
  FaCommentDots,
  FaUserAlt,
} from "react-icons/fa";

function StatusDot({ status }) {
  if (status === "processing")
    return <span className="w-2 h-2 rounded-full bg-magenta-400 animate-pulse-dot inline-block" />;
  if (status === "completed")
    return <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />;
  return <span className="w-2 h-2 rounded-full bg-red-500 inline-block" />;
}

export default function GalleryPage() {
  const { data: session, status: authStatus } = useSession();
  const [creations, setCreations] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Modal states
  const [selectedItem, setSelectedItem] = useState(null);
  const [copiedId, setCopiedId] = useState(null);
  const [modalChatMode, setModalChatMode] = useState(false);
  const [modalChatMessages, setModalChatMessages] = useState([]);
  const [modalChatInput, setModalChatInput] = useState("");
  const [modalSendingMsg, setModalSendingMsg] = useState(false);

  const chatBottomRef = useRef(null);

  const fetchAll = async () => {
    if (!session?.user) return;
    try {
      const res = await fetch("/api/creations");
      if (res.ok) setCreations(await res.json());
    } catch {}
    setLoading(false);
  };

  useEffect(() => {
    if (!session?.user) return;
    fetchAll();
    const interval = setInterval(fetchAll, 5000);
    return () => clearInterval(interval);
  }, [session]);

  useEffect(() => {
    if (chatBottomRef.current) {
      chatBottomRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [modalChatMessages, modalSendingMsg]);

  const handleCopyPrompt = (id, text) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const startModalChat = (item) => {
    setModalChatMode(true);
    setModalChatMessages([
      { role: "assistant", content: item.greeting || `Greetings! I am ${item.name}. Let us converse!` },
    ]);
  };

  const handleSendModalMessage = async (e) => {
    e.preventDefault();
    if (!modalChatInput.trim() || modalSendingMsg || !selectedItem) return;

    const userMsg = modalChatInput.trim();
    setModalChatInput("");
    setModalChatMessages((prev) => [...prev, { role: "user", content: userMsg }]);
    setModalSendingMsg(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          systemPrompt: selectedItem.systemPrompt,
          messages: [...modalChatMessages, { role: "user", content: userMsg }],
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setModalChatMessages((prev) => [...prev, { role: "assistant", content: data.reply }]);
      } else {
        setModalChatMessages((prev) => [
          ...prev,
          { role: "assistant", content: "My connection fluctuered. Please say it again!" },
        ]);
      }
    } catch {
      setModalChatMessages((prev) => [
        ...prev,
        { role: "assistant", content: "I couldn't hear you. Check your network connection." },
      ]);
    } finally {
      setModalSendingMsg(false);
    }
  };

  if (authStatus === "unauthenticated") {
    return (
      <div className="min-h-screen bg-zinc-950 flex flex-col">
        <Navbar />
        <div className="flex-1 flex flex-col items-center justify-center px-4 text-center gap-6 animate-float">
          <FaImages className="text-5xl text-zinc-700" />
          <div>
            <h1 className="text-2xl font-bold text-zinc-300 mb-2">Character Gallery</h1>
            <p className="text-zinc-500 text-sm mb-6">Sign in to see all your generated custom AI characters and chat partners.</p>
          </div>
          <button
            onClick={() => signIn("google")}
            className="flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-magenta-500 to-violet-600 text-white font-bold text-sm shadow-lg hover:shadow-magenta-500/20 transition-all cursor-pointer"
          >
            <FaGoogle />
            Sign in with Google
          </button>
        </div>
      </div>
    );
  }

  const completed = creations.filter((c) => c.status === "completed");
  const processing = creations.filter((c) => c.status === "processing");

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col">
      <Navbar />
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 py-6">
        
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <FaImages className="text-magenta-500" />
              Character Gallery
            </h1>
            <p className="text-zinc-500 text-sm mt-1">{creations.length} character{creations.length !== 1 ? "s" : ""} assembled</p>
          </div>
          <div className="hidden sm:flex items-center gap-3">
            {processing.length > 0 && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-magenta-500/10 border border-magenta-500/20 text-magenta-400 text-xs font-medium animate-pulse-border">
                <FaSpinner className="animate-spin text-[10px]" />
                {processing.length} assembling
              </div>
            )}
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-24">
            <div className="flex flex-col items-center gap-3">
              <FaSpinner className="animate-spin text-magenta-500 text-2xl" />
              <p className="text-zinc-500 text-sm">Loading your studio creations…</p>
            </div>
          </div>
        ) : creations.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-20 h-20 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center mb-4">
              <FaMagic className="text-3xl text-zinc-700 animate-float" />
            </div>
            <h2 className="text-lg font-semibold text-zinc-400 mb-2">No characters assembled yet</h2>
            <p className="text-zinc-600 text-sm mb-6">Assemble your first custom AI character portrait and backstory in the Studio.</p>
            <Link
              href="/"
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-magenta-500 to-violet-600 text-white text-sm font-bold shadow-lg"
            >
              Go to Studio →
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {creations.map((c) => {
              const isCopied = copiedId === c.id;
              return (
                <div
                  key={c.id}
                  className="group relative rounded-xl border border-zinc-800 hover:border-magenta-500/40 transition-all cursor-pointer bg-zinc-900 flex flex-col overflow-hidden"
                  onClick={() => {
                    if (c.status === "completed") {
                      setSelectedItem(c);
                      setModalChatMode(false);
                      setModalChatMessages([]);
                    }
                  }}
                >
                  {/* Portrait Avatar Container */}
                  <div className="relative aspect-square w-full bg-zinc-950 overflow-hidden shrink-0">
                    {c.status === "processing" ? (
                      <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
                        <FaSpinner className="animate-spin text-magenta-500 text-lg" />
                        <span className="text-[9px] text-zinc-500 font-medium">Assembling portrait...</span>
                      </div>
                    ) : c.status === "completed" ? (
                      <img
                        src={c.avatarImage}
                        alt={c.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-all duration-350"
                      />
                    ) : (
                      <div className="absolute inset-0 flex flex-col items-center justify-center p-3 text-center gap-1">
                        <span className="text-red-500 text-xs">⚠️ Assembly failed</span>
                        <p className="text-[8px] text-zinc-600 leading-normal mt-1">{c.error || "Model error"}</p>
                      </div>
                    )}

                    {/* Top status badges */}
                    <div className="absolute top-2 left-2 right-2 flex items-center justify-between pointer-events-none">
                      <span className="text-[8px] px-1.5 py-0.5 rounded bg-black/75 text-zinc-300 border border-zinc-800/80 font-bold backdrop-blur-sm">
                        {c.aspectRatio}
                      </span>
                      <div className="flex items-center gap-1">
                        <StatusDot status={c.status} />
                      </div>
                    </div>
                  </div>

                  {/* Character Meta Details */}
                  <div className="p-3.5 flex flex-col justify-between flex-1 gap-2">
                    <div>
                      <h3 className="text-xs font-bold text-white truncate">{c.name}</h3>
                      <p className="text-[10px] text-zinc-500 line-clamp-2 mt-1 leading-normal">
                        {c.backstory}
                      </p>
                    </div>
                    
                    <div className="flex items-center justify-between border-t border-zinc-800 pt-2 shrink-0">
                      <span className="text-[8px] px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400 font-semibold">{c.resolution.toUpperCase()}</span>
                      <span className="text-[7px] text-zinc-600">{new Date(c.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Detail & Chat Modal Overlay */}
      {selectedItem && (
        <div
          className="fixed inset-0 z-[300] bg-black/90 backdrop-blur-md flex items-center justify-center p-4"
          onClick={() => setSelectedItem(null)}
        >
          <div
            className="relative max-w-lg w-full rounded-2xl overflow-hidden border border-zinc-700 shadow-2xl bg-zinc-900 p-6 flex flex-col gap-4 animate-slide-up"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setSelectedItem(null)}
              className="absolute top-4 right-4 z-10 p-2 rounded-xl bg-black/70 hover:bg-red-600 text-white transition-all cursor-pointer"
            >
              <FaTimes className="text-xs" />
            </button>
            <h3 className="text-sm font-bold text-white mb-1 flex items-center gap-2">
              <FaUserFriends className="text-magenta-500 text-xs" />
              Character Studio Details
            </h3>

            {!modalChatMode ? (
              /* Profile Details View */
              <div className="flex flex-col gap-4">
                <div className="flex flex-col sm:flex-row gap-4 items-center sm:items-start">
                  <img
                    src={selectedItem.avatarImage}
                    alt={selectedItem.name}
                    className="w-28 h-28 rounded-2xl object-cover border border-zinc-700 shadow-lg shrink-0"
                  />
                  <div className="flex-1 flex flex-col gap-1.5 text-center sm:text-left">
                    <h4 className="text-sm font-bold text-white">{selectedItem.name}</h4>
                    <div className="flex items-center justify-center sm:justify-start gap-2 mt-0.5">
                      <span className="px-2 py-0.5 rounded bg-zinc-800 text-zinc-400 font-bold text-[8px]">RATIO: {selectedItem.aspectRatio}</span>
                      <span className="px-2 py-0.5 rounded bg-magenta-500/10 border border-magenta-500/20 text-magenta-400 font-semibold text-[8px]">{selectedItem.resolution.toUpperCase()}</span>
                    </div>
                    <div className="border-t border-zinc-800/80 my-1" />
                    <span className="text-[8px] font-bold text-zinc-500 uppercase tracking-widest text-left">Character Biography</span>
                    <p className="text-[10px] text-zinc-400 leading-normal text-left">{selectedItem.backstory}</p>
                  </div>
                </div>

                {/* System prompt preview */}
                <div className="flex flex-col gap-1.5">
                  <span className="text-[8px] font-bold text-zinc-500 uppercase tracking-widest">Compiled Persona Instructions</span>
                  <div className="border border-zinc-800 bg-zinc-950 p-3 rounded-xl max-h-24 overflow-y-auto overscroll-contain text-[10px] text-zinc-300 leading-relaxed font-mono relative">
                    {selectedItem.systemPrompt}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center justify-between border-t border-zinc-800 pt-4 mt-2">
                  <button
                    onClick={() => handleCopyPrompt(selectedItem.id, selectedItem.systemPrompt)}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-semibold border border-zinc-700 transition-colors cursor-pointer animate-pulse-border"
                  >
                    {copiedId === selectedItem.id ? <FaCheck className="text-emerald-400" /> : <FaCopy />}
                    {copiedId === selectedItem.id ? "Copied System Prompt!" : "Copy System Prompt"}
                  </button>
                  
                  <button
                    onClick={() => startModalChat(selectedItem)}
                    className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-gradient-to-r from-magenta-500 to-violet-600 hover:from-magenta-400 hover:to-violet-500 text-white font-bold text-xs shadow-lg cursor-pointer"
                  >
                    <FaComments className="text-[10px]" />
                    Initiate Chat Dialogue
                  </button>
                </div>
              </div>
            ) : (
              /* Interactive Chat Dialogue Hub Mode */
              <div className="border border-zinc-800 bg-zinc-950/40 rounded-2xl flex flex-col overflow-hidden min-h-[300px]">
                {/* Chat Header inside modal */}
                <div className="px-4 py-2.5 border-b border-zinc-800 bg-zinc-900/60 flex items-center justify-between shrink-0">
                  <span className="text-[9px] font-bold text-magenta-400 uppercase tracking-widest">Active Dialogue with {selectedItem.name}</span>
                  <button
                    onClick={() => setModalChatMode(false)}
                    className="text-[8px] text-zinc-500 hover:text-white"
                  >
                    View Biography Profile
                  </button>
                </div>

                {/* Dialog Messages list */}
                <div className="flex-1 p-4 overflow-y-auto overscroll-contain flex flex-col gap-2.5 max-h-[220px]">
                  {modalChatMessages.map((msg, idx) => {
                    const isAssistant = msg.role === "assistant";
                    return (
                      <div
                        key={idx}
                        className={`flex gap-2 max-w-[85%] ${
                          isAssistant ? "self-start" : "self-end flex-row-reverse"
                        }`}
                      >
                        {isAssistant ? (
                          <img
                            src={selectedItem.avatarImage}
                            alt=""
                            className="w-5 h-5 rounded-full object-cover shrink-0 border border-zinc-700"
                          />
                        ) : (
                          <div className="w-5 h-5 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center shrink-0">
                            <FaUserAlt className="text-zinc-500 text-[6px]" />
                          </div>
                        )}
                        <div className="flex flex-col gap-0.5">
                          <span className="text-[6px] text-zinc-500 font-semibold ml-0.5">
                            {isAssistant ? selectedItem.name : "You"}
                          </span>
                          <div
                            className={`rounded-xl px-3 py-2 text-[11px] leading-relaxed leading-normal ${
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

                  {modalSendingMsg && (
                    <div className="flex gap-2 max-w-[80%] self-start">
                      <img
                        src={selectedItem.avatarImage}
                        alt=""
                        className="w-5 h-5 rounded-full object-cover border border-zinc-700"
                      />
                      <div className="flex flex-col gap-0.5">
                        <span className="text-[6px] text-zinc-500 font-semibold ml-0.5">{selectedItem.name}</span>
                        <div className="rounded-xl px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-tl-none flex items-center justify-center">
                          <FaCommentDots className="text-magenta-500 text-xs animate-bounce" />
                        </div>
                      </div>
                    </div>
                  )}

                  <div ref={chatBottomRef} />
                </div>

                {/* Dialog message trigger form */}
                <form onSubmit={handleSendModalMessage} className="p-2.5 border-t border-zinc-800 bg-zinc-900/60 flex gap-2 shrink-0">
                  <input
                    type="text"
                    value={modalChatInput}
                    onChange={(e) => setModalChatInput(e.target.value)}
                    placeholder={`Talk to ${selectedItem.name}...`}
                    disabled={modalSendingMsg}
                    className="flex-1 px-3 py-2 rounded-xl border border-zinc-800 bg-zinc-950 text-[11px] text-zinc-300 placeholder-zinc-700 focus:border-magenta-500 focus:outline-none transition-colors"
                  />
                  <button
                    type="submit"
                    disabled={modalSendingMsg || !modalChatInput.trim()}
                    className="px-3 py-2 rounded-xl bg-magenta-600 hover:bg-magenta-500 text-white text-[10px] font-bold transition-all shadow-md cursor-pointer flex items-center justify-center shrink-0"
                  >
                    <FaPaperPlane />
                  </button>
                </form>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
