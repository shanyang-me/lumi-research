"use client";

import { useState, useRef, useEffect } from "react";
import { Bot, Send, Loader2, Minimize2, Maximize2, X } from "lucide-react";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface OraclePanelProps {
  projectId: string;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  onClose: () => void;
  onAction?: (action: { type: string; payload: Record<string, unknown> }) => void;
}

export function OraclePanel({ projectId, isCollapsed, onToggleCollapse, onClose, onAction }: OraclePanelProps) {
  const [messages, setMessages] = useState<Message[]>([
    { role: "assistant", content: "I'm the Oracle. I can run agents, start meetings, manage entities, and analyze this project. What would you like?" },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current && !isCollapsed) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isCollapsed]);

  const send = async () => {
    if (!input.trim() || loading) return;
    const userMsg = input.trim();
    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: userMsg }]);
    setLoading(true);

    try {
      const res = await fetch("/api/oracle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: userMsg,
          projectId,
          history: messages.slice(1), // skip initial greeting
        }),
      });
      const data = await res.json();
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: data.response || data.error || "No response" },
      ]);
      // Handle actions the Oracle wants to trigger on the frontend
      if (data.actions && onAction) {
        for (const action of data.actions) {
          onAction(action);
        }
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Connection error. Try again." },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="border-2 border-[#374151] bg-[#0a0a0f] flex flex-col transition-all duration-200"
      style={{ height: isCollapsed ? "32px" : "100%", fontFamily: "'JetBrains Mono', 'Fira Code', 'SF Mono', monospace" }}
    >
      {/* Title bar */}
      <div
        className="flex items-center justify-between px-3 py-1 bg-[#111827] border-b border-[#374151] shrink-0 cursor-pointer select-none"
        onClick={onToggleCollapse}
      >
        <div className="flex items-center gap-2">
          <Bot className="w-3 h-3 text-[#a78bfa]" />
          <span className="text-[9px] text-[#a78bfa] tracking-wider" style={{ fontFamily: "inherit" }}>
            ORACLE
          </span>
          {loading && <span className="w-1.5 h-1.5 rounded-full bg-[#a78bfa] animate-pulse" />}
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={(e) => { e.stopPropagation(); onToggleCollapse(); }}
            className="p-0.5 text-[#4b5563] hover:text-[#e5e7eb] transition-colors"
          >
            {isCollapsed ? <Maximize2 className="w-3 h-3" /> : <Minimize2 className="w-3 h-3" />}
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onClose(); }}
            className="p-0.5 text-[#4b5563] hover:text-[#ef4444] transition-colors"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Chat area */}
      {!isCollapsed && (
        <>
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-2 space-y-2">
            {messages.map((msg, i) => (
              <div key={i} className={`text-[10px] leading-[15px] ${msg.role === "user" ? "text-right" : ""}`}>
                {msg.role === "assistant" ? (
                  <div className="flex gap-1.5 items-start">
                    <Bot className="w-3 h-3 text-[#a78bfa] shrink-0 mt-0.5" />
                    <span className="text-[#9ca3af] whitespace-pre-wrap">{msg.content}</span>
                  </div>
                ) : (
                  <span className="inline-block bg-[#1a1a2e] border border-[#4cc9f0] text-[#e5e7eb] px-2 py-1 whitespace-pre-wrap">
                    {msg.content}
                  </span>
                )}
              </div>
            ))}
            {loading && (
              <div className="flex gap-1.5 items-center">
                <Bot className="w-3 h-3 text-[#a78bfa]" />
                <Loader2 className="w-3 h-3 animate-spin text-[#a78bfa]" />
              </div>
            )}
          </div>

          {/* Input */}
          <form
            onSubmit={(e) => { e.preventDefault(); send(); }}
            className="flex gap-1 p-1.5 border-t border-[#374151]"
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask Oracle..."
              disabled={loading}
              className="flex-1 bg-[#0a0a1a] border border-[#374151] text-[#e5e7eb] text-[10px] px-2 py-1 focus:border-[#a78bfa] focus:outline-none placeholder:text-[#374151] disabled:opacity-50"
              style={{ fontFamily: "inherit" }}
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="px-1.5 py-1 bg-[#7c3aed] border border-[#a78bfa] text-white disabled:opacity-30"
            >
              <Send className="w-3 h-3" />
            </button>
          </form>
        </>
      )}
    </div>
  );
}
