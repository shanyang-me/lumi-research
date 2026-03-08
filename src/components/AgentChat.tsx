"use client";

import { useState, useRef, useEffect } from "react";
import { Bot, Send, User, Loader2 } from "lucide-react";

interface Message {
  role: "user" | "assistant";
  content: string;
}

export function AgentChat() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content:
        "Greetings, researcher. I am the ORACLE. I can help you manage quests, analyze progress, suggest next steps, and forge hypotheses. What would you like to do?",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const send = async () => {
    if (!input.trim() || loading) return;
    const userMsg = input.trim();
    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: userMsg }]);
    setLoading(true);

    try {
      const res = await fetch("/api/agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: userMsg,
          history: messages.filter((m) => m.role !== "assistant" || messages.indexOf(m) !== 0),
        }),
      });
      const data = await res.json();
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: data.response || data.error || "No response" },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "ERROR: Connection lost. Please try again." },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full max-w-3xl mx-auto p-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <div className="w-8 h-8 bg-[#7c3aed] border-2 border-[#a78bfa] flex items-center justify-center">
          <Bot className="w-4 h-4 text-white" />
        </div>
        <div>
          <h2 className="font-pixel text-[11px] text-[#a78bfa] tracking-wider">ORACLE</h2>
          <p className="text-[9px] text-[#6b7280]">Research AI Assistant</p>
        </div>
        <div className="flex-1 pixel-divider" />
      </div>

      {/* Chat area */}
      <div className="flex-1 pixel-border bg-[#111827] flex flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto p-4 space-y-3" ref={scrollRef}>
          {messages.map((msg, i) => (
            <div
              key={i}
              className={`flex gap-3 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              {msg.role === "assistant" && (
                <div className="w-7 h-7 bg-[#7c3aed] border border-[#a78bfa] flex items-center justify-center shrink-0">
                  <Bot className="w-3.5 h-3.5 text-white" />
                </div>
              )}
              <div
                className={`max-w-[80%] px-3 py-2 text-xs whitespace-pre-wrap ${
                  msg.role === "user"
                    ? "bg-[#1a1a2e] border-2 border-[#4cc9f0] text-[#e5e7eb]"
                    : "bg-[#0f0f23] border-2 border-[#374151] text-[#9ca3af]"
                }`}
              >
                {msg.content}
              </div>
              {msg.role === "user" && (
                <div className="w-7 h-7 bg-[#1f2937] border border-[#4b5563] flex items-center justify-center shrink-0">
                  <User className="w-3.5 h-3.5 text-[#9ca3af]" />
                </div>
              )}
            </div>
          ))}
          {loading && (
            <div className="flex gap-3">
              <div className="w-7 h-7 bg-[#7c3aed] border border-[#a78bfa] flex items-center justify-center shrink-0">
                <Bot className="w-3.5 h-3.5 text-white" />
              </div>
              <div className="bg-[#0f0f23] border-2 border-[#374151] px-3 py-2">
                <Loader2 className="w-4 h-4 animate-spin text-[#a78bfa]" />
              </div>
            </div>
          )}
        </div>

        {/* Input */}
        <div className="border-t-2 border-[#374151] p-3">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              send();
            }}
            className="flex gap-2"
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask the Oracle..."
              disabled={loading}
              className="flex-1 bg-[#0a0a1a] border-2 border-[#374151] text-[#e5e7eb] text-xs px-3 py-2 focus:border-[#a78bfa] focus:outline-none placeholder:text-[#374151] disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="pixel-btn bg-[#7c3aed] border-[#a78bfa] px-3 py-2 text-white disabled:opacity-50"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
