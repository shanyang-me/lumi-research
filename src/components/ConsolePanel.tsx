"use client";

import { useEffect, useRef } from "react";
import { Terminal, X, Minimize2, Maximize2 } from "lucide-react";

export interface LogEntry {
  id: number;
  timestamp: Date;
  level: "info" | "agent" | "system" | "error" | "debug";
  source: string;
  message: string;
}

interface ConsolePanelProps {
  logs: LogEntry[];
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  onClose: () => void;
}

const LEVEL_COLORS: Record<LogEntry["level"], string> = {
  info: "#6b7280",
  agent: "#a78bfa",
  system: "#fbbf24",
  error: "#ef4444",
  debug: "#4b5563",
};

const LEVEL_PREFIX: Record<LogEntry["level"], string> = {
  info: "INFO",
  agent: "AGNT",
  system: " SYS",
  error: " ERR",
  debug: " DBG",
};

export function ConsolePanel({ logs, isCollapsed, onToggleCollapse, onClose }: ConsolePanelProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current && !isCollapsed) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs, isCollapsed]);

  const formatTime = (d: Date) =>
    d.toLocaleTimeString("en-US", { hour12: false, hour: "2-digit", minute: "2-digit", second: "2-digit" });

  return (
    <div
      className="border-2 border-[#374151] bg-[#0a0a0f] flex flex-col transition-all duration-200"
      style={{
        height: isCollapsed ? "32px" : "220px",
        fontFamily: "'JetBrains Mono', 'Fira Code', 'SF Mono', monospace",
      }}
    >
      {/* Title bar */}
      <div className="flex items-center justify-between px-3 py-1 bg-[#111827] border-b border-[#374151] shrink-0 cursor-pointer select-none"
        onClick={onToggleCollapse}
      >
        <div className="flex items-center gap-2">
          <Terminal className="w-3 h-3 text-[#10b981]" />
          <span className="text-[9px] text-[#10b981] tracking-wider" style={{ fontFamily: "inherit" }}>
            CONSOLE
          </span>
          {isCollapsed && logs.length > 0 && (
            <span className="text-[8px] text-[#4b5563]">
              ({logs.length} lines)
            </span>
          )}
          {/* Activity indicator */}
          {logs.length > 0 && Date.now() - logs[logs.length - 1].timestamp.getTime() < 3000 && (
            <span className="w-1.5 h-1.5 rounded-full bg-[#10b981] animate-pulse" />
          )}
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

      {/* Log output */}
      {!isCollapsed && (
        <div ref={scrollRef} className="flex-1 overflow-y-auto overflow-x-hidden p-2 space-y-0">
          {logs.length === 0 && (
            <div className="text-[10px] text-[#374151] py-4 text-center">
              Waiting for activity...
            </div>
          )}
          {logs.map((entry) => (
            <div key={entry.id} className="flex gap-2 py-[1px] text-[10px] leading-[16px] hover:bg-[#ffffff05]">
              <span className="text-[#374151] shrink-0">{formatTime(entry.timestamp)}</span>
              <span className="shrink-0" style={{ color: LEVEL_COLORS[entry.level] }}>
                [{LEVEL_PREFIX[entry.level]}]
              </span>
              <span className="text-[#6b7280] shrink-0 w-[70px] truncate" style={{ color: entry.level === "agent" ? "#a78bfa" : "#4b5563" }}>
                {entry.source}
              </span>
              <span
                className="flex-1 break-all"
                style={{
                  color: entry.level === "error" ? "#ef4444"
                    : entry.level === "agent" ? "#e5e7eb"
                    : entry.level === "system" ? "#fbbf24"
                    : "#9ca3af",
                }}
              >
                {entry.message}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
