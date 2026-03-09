"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { AGENT_ROLES } from "@/lib/pipeline";
import {
  Bot,
  X,
  Play,
  Loader2,
  Users,
  MessageSquare,
  ChevronDown,
  Trash2,
  History,
} from "lucide-react";

interface MeetingMessage {
  id: string;
  role: string;
  name: string;
  color: string;
  content: string;
  createdAt: string;
}

interface Meeting {
  id: string;
  topic: string;
  status: string;
  createdAt: string;
  messages: MeetingMessage[];
}

interface CustomAgent {
  id: string;
  name: string;
  color: string;
}

interface MeetingRoomProps {
  projectId: string;
  customAgents: CustomAgent[];
  onClose: () => void;
}

export function MeetingRoom({ projectId, customAgents, onClose }: MeetingRoomProps) {
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [activeMeeting, setActiveMeeting] = useState<Meeting | null>(null);
  const [liveMessages, setLiveMessages] = useState<MeetingMessage[]>([]);
  const [thinkingAgent, setThinkingAgent] = useState<{ name: string; color: string } | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  // New meeting form
  const [topic, setTopic] = useState("");
  const [selectedAgents, setSelectedAgents] = useState<Set<string>>(new Set());
  const [rounds, setRounds] = useState(1);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // All available agents
  const allAgents = [
    ...Object.entries(AGENT_ROLES).map(([key, role]) => ({
      key,
      name: role.name,
      color: role.color,
    })),
    ...customAgents.map((ca) => ({
      key: ca.id,
      name: ca.name,
      color: ca.color,
    })),
  ];

  const loadMeetings = useCallback(async () => {
    const res = await fetch(`/api/projects/${projectId}/meetings`);
    const data = await res.json();
    setMeetings(Array.isArray(data) ? data : []);
  }, [projectId]);

  useEffect(() => {
    loadMeetings();
  }, [loadMeetings]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [liveMessages, thinkingAgent]);

  const toggleAgent = (key: string) => {
    setSelectedAgents((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const startMeeting = async () => {
    if (!topic.trim() || selectedAgents.size < 2) return;
    setIsRunning(true);
    setLiveMessages([]);
    setActiveMeeting(null);
    setThinkingAgent(null);
    setShowHistory(false);

    try {
      const response = await fetch(`/api/projects/${projectId}/meetings`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic,
          agents: Array.from(selectedAgents),
          rounds,
        }),
      });

      if (!response.ok || !response.body) throw new Error("Failed to start meeting");

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        let eventType = "";
        for (const line of lines) {
          if (line.startsWith("event: ")) {
            eventType = line.slice(7).trim();
          } else if (line.startsWith("data: ") && eventType) {
            try {
              const data = JSON.parse(line.slice(6));
              if (eventType === "agent_thinking") {
                setThinkingAgent({ name: data.name, color: data.color });
              } else if (eventType === "agent_message") {
                setThinkingAgent(null);
                setLiveMessages((prev) => [...prev, data as MeetingMessage]);
              } else if (eventType === "meeting_end") {
                setThinkingAgent(null);
                loadMeetings();
              } else if (eventType === "error") {
                setLiveMessages((prev) => [
                  ...prev,
                  { id: "err", role: "system", name: "System", color: "#ef4444", content: data.text, createdAt: new Date().toISOString() },
                ]);
              }
            } catch { /* skip */ }
            eventType = "";
          }
        }
      }
    } catch (err) {
      setLiveMessages((prev) => [
        ...prev,
        { id: "err", role: "system", name: "System", color: "#ef4444", content: `Error: ${err}`, createdAt: new Date().toISOString() },
      ]);
    } finally {
      setIsRunning(false);
      setThinkingAgent(null);
    }
  };

  const deleteMeeting = async (meetingId: string) => {
    await fetch(`/api/meetings/${meetingId}`, { method: "DELETE" });
    loadMeetings();
    if (activeMeeting?.id === meetingId) setActiveMeeting(null);
  };

  const displayMessages = activeMeeting ? activeMeeting.messages : liveMessages;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="w-full max-w-4xl max-h-[90vh] bg-[#0a0a1a] border-2 border-[#374151] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-2 bg-[#111827] border-b-2 border-[#374151]">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-[#fbbf24]" />
            <span className="font-pixel text-[9px] text-[#fbbf24] tracking-wider">MEETING ROOM</span>
            {(activeMeeting || liveMessages.length > 0) && (
              <span className="text-[9px] text-[#6b7280]">
                - {activeMeeting?.topic || topic}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => { setShowHistory(!showHistory); setActiveMeeting(null); }}
              className={`flex items-center gap-1 px-2 py-1 text-[8px] transition-colors ${
                showHistory ? "text-[#fbbf24]" : "text-[#6b7280] hover:text-[#fbbf24]"
              }`}
            >
              <History className="w-3 h-3" />
              <span className="font-pixel text-[6px]">HISTORY</span>
              {meetings.length > 0 && (
                <span className="text-[6px] text-[#4b5563]">({meetings.length})</span>
              )}
            </button>
            <button
              onClick={onClose}
              className="p-1 hover:bg-[#1f2937] transition-colors text-[#6b7280] hover:text-[#e5e7eb]"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="flex flex-1 min-h-0">
          {/* Left panel: setup or history */}
          <div className="w-64 border-r-2 border-[#374151] bg-[#0f0f23] flex flex-col overflow-y-auto">
            {showHistory ? (
              <div className="p-3 space-y-2">
                <div className="font-pixel text-[7px] text-[#6b7280] tracking-wider mb-2">PAST MEETINGS</div>
                {meetings.length === 0 && (
                  <p className="text-[9px] text-[#4b5563]">No meetings yet</p>
                )}
                {meetings.map((m) => (
                  <button
                    key={m.id}
                    onClick={() => { setActiveMeeting(m); setLiveMessages([]); }}
                    className={`w-full text-left p-2 border transition-colors group ${
                      activeMeeting?.id === m.id
                        ? "border-[#fbbf24] bg-[#1a1a2e]"
                        : "border-[#374151] hover:border-[#4b5563]"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-[#e5e7eb] truncate flex-1">{m.topic}</span>
                      <button
                        onClick={(e) => { e.stopPropagation(); deleteMeeting(m.id); }}
                        className="p-0.5 text-[#374151] hover:text-[#ef4444] opacity-0 group-hover:opacity-100 transition-all"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                    <div className="flex items-center gap-1 mt-1">
                      <MessageSquare className="w-3 h-3 text-[#4b5563]" />
                      <span className="text-[8px] text-[#4b5563]">{m.messages.length} messages</span>
                    </div>
                    <div className="text-[7px] text-[#374151] mt-1">
                      {new Date(m.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                    </div>
                  </button>
                ))}
                <button
                  onClick={() => { setShowHistory(false); setActiveMeeting(null); }}
                  className="w-full mt-2 py-1.5 text-[9px] text-[#fbbf24] border border-dashed border-[#374151] hover:border-[#fbbf24] transition-colors font-pixel text-[7px]"
                >
                  + NEW MEETING
                </button>
              </div>
            ) : (
              <div className="p-3 space-y-3">
                <div className="font-pixel text-[7px] text-[#fbbf24] tracking-wider">NEW MEETING</div>

                {/* Topic */}
                <div>
                  <label className="font-pixel text-[6px] text-[#6b7280] block mb-1">TOPIC</label>
                  <input
                    type="text"
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    placeholder="What should we discuss?"
                    className="w-full bg-[#111827] border-2 border-[#374151] text-[#e5e7eb] text-[10px] px-2 py-1.5 outline-none focus:border-[#fbbf24] placeholder:text-[#374151]"
                  />
                </div>

                {/* Agent selection */}
                <div>
                  <label className="font-pixel text-[6px] text-[#6b7280] block mb-1">
                    INVITE AGENTS ({selectedAgents.size} selected)
                  </label>
                  <div className="space-y-1 max-h-48 overflow-y-auto">
                    {allAgents.map((agent) => (
                      <button
                        key={agent.key}
                        onClick={() => toggleAgent(agent.key)}
                        className={`w-full flex items-center gap-2 px-2 py-1.5 border transition-colors text-left ${
                          selectedAgents.has(agent.key)
                            ? "border-[#4b5563] bg-[#1a1a2e]"
                            : "border-[#374151] hover:border-[#4b5563]"
                        }`}
                      >
                        <div
                          className="w-4 h-4 border flex items-center justify-center"
                          style={{
                            borderColor: selectedAgents.has(agent.key) ? agent.color : "#374151",
                            background: selectedAgents.has(agent.key) ? `${agent.color}30` : "transparent",
                          }}
                        >
                          {selectedAgents.has(agent.key) && (
                            <div className="w-2 h-2" style={{ background: agent.color }} />
                          )}
                        </div>
                        <Bot className="w-3 h-3" style={{ color: agent.color }} />
                        <span className="text-[9px] font-pixel text-[7px]" style={{ color: agent.color }}>
                          {agent.name.toUpperCase()}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Rounds */}
                <div>
                  <label className="font-pixel text-[6px] text-[#6b7280] block mb-1">ROUNDS</label>
                  <div className="relative">
                    <select
                      value={rounds}
                      onChange={(e) => setRounds(Number(e.target.value))}
                      className="w-full appearance-none bg-[#111827] border-2 border-[#374151] text-[#e5e7eb] text-[10px] px-2 py-1.5 pr-8 outline-none focus:border-[#fbbf24]"
                    >
                      <option value={1}>1 round (quick sync)</option>
                      <option value={2}>2 rounds (deeper discussion)</option>
                      <option value={3}>3 rounds (thorough debate)</option>
                    </select>
                    <ChevronDown className="w-3 h-3 text-[#6b7280] absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                </div>

                {/* Start button */}
                <button
                  onClick={startMeeting}
                  disabled={isRunning || !topic.trim() || selectedAgents.size < 2}
                  className="w-full pixel-btn px-3 py-2 flex items-center justify-center gap-2 disabled:opacity-40"
                  style={{
                    background: "#fbbf2420",
                    borderColor: "#fbbf24",
                    color: "#fbbf24",
                  }}
                >
                  {isRunning ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span className="font-pixel text-[7px]">IN SESSION...</span>
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4" />
                      <span className="font-pixel text-[7px]">START MEETING</span>
                    </>
                  )}
                </button>

                {selectedAgents.size < 2 && selectedAgents.size > 0 && (
                  <p className="text-[8px] text-[#f59e0b]">Select at least 2 agents</p>
                )}
              </div>
            )}
          </div>

          {/* Right panel: conversation */}
          <div className="flex-1 flex flex-col min-h-0 bg-[#0a0a1a]">
            {displayMessages.length === 0 && !thinkingAgent ? (
              <div className="flex-1 flex flex-col items-center justify-center text-[#374151]">
                <Users className="w-12 h-12 mb-3 opacity-30" />
                <span className="font-pixel text-[8px]">
                  {showHistory ? "SELECT A MEETING" : "SET UP A MEETING TO BEGIN"}
                </span>
                <span className="text-[9px] text-[#4b5563] mt-2 max-w-[280px] text-center">
                  Agents will discuss the topic in turns, building on each other&apos;s contributions
                </span>
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {displayMessages.map((msg) => (
                  <div key={msg.id} className="flex gap-3">
                    {/* Agent avatar */}
                    <div
                      className="w-8 h-8 shrink-0 flex items-center justify-center border-2"
                      style={{ borderColor: msg.color, background: `${msg.color}15` }}
                    >
                      <Bot className="w-4 h-4" style={{ color: msg.color }} />
                    </div>
                    {/* Message */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-pixel text-[8px] tracking-wider" style={{ color: msg.color }}>
                          {msg.name.toUpperCase()}
                        </span>
                        <span className="text-[7px] text-[#374151]">
                          {new Date(msg.createdAt).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}
                        </span>
                      </div>
                      <div
                        className="text-[11px] leading-relaxed whitespace-pre-wrap border-l-2 pl-3 py-1"
                        style={{ color: "#c8d0e0", borderColor: `${msg.color}40` }}
                      >
                        {msg.content}
                      </div>
                    </div>
                  </div>
                ))}

                {/* Thinking indicator */}
                {thinkingAgent && (
                  <div className="flex gap-3 items-center">
                    <div
                      className="w-8 h-8 shrink-0 flex items-center justify-center border-2"
                      style={{ borderColor: thinkingAgent.color, background: `${thinkingAgent.color}15` }}
                    >
                      <Loader2 className="w-4 h-4 animate-spin" style={{ color: thinkingAgent.color }} />
                    </div>
                    <div>
                      <span className="font-pixel text-[8px] tracking-wider" style={{ color: thinkingAgent.color }}>
                        {thinkingAgent.name.toUpperCase()}
                      </span>
                      <span className="text-[9px] text-[#6b7280] ml-2">is thinking...</span>
                    </div>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
