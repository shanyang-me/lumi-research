"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PixelWorld } from "./PixelWorld";
import {
  Search,
  FlaskConical,
  Play,
  Square,
  Zap,
  Wifi,
  WifiOff,
  Sparkles,
  BookOpen,
  Beaker,
  TrendingUp,
  AlertTriangle,
  Lightbulb,
  Database,
  Brain,
  CheckCircle2,
  XCircle,
  Clock,
  BarChart3,
} from "lucide-react";

interface LogEntry {
  text: string;
  type: string;
  timestamp: number;
}

interface AgentState {
  status: "idle" | "booting" | "searching" | "analyzing" | "processing" | "synthesizing" | "generating" | "planning" | "configuring" | "preparing_data" | "loading_models" | "running" | "complete" | "error";
  message: string;
  progress: number;
  progressLabel: string;
  logs: LogEntry[];
  findings: Record<string, unknown[]>;
}

const AGENT_CONFIG = {
  research: {
    name: "SCOUT",
    subtitle: "Research Intelligence",
    icon: Search,
    color: "cyan",
    gradient: "from-cyan-500 to-blue-600",
    glowColor: "rgba(6, 182, 212, 0.5)",
    borderColor: "border-cyan-500/30",
    bgColor: "bg-cyan-950/30",
    textColor: "text-cyan-400",
    accentBg: "bg-cyan-500/10",
  },
  experiment: {
    name: "FORGE",
    subtitle: "Experiment Engine",
    icon: FlaskConical,
    color: "amber",
    gradient: "from-amber-500 to-orange-600",
    glowColor: "rgba(245, 158, 11, 0.5)",
    borderColor: "border-amber-500/30",
    bgColor: "bg-amber-950/30",
    textColor: "text-amber-400",
    accentBg: "bg-amber-500/10",
  },
};

const STATUS_ICONS: Record<string, React.ReactNode> = {
  booting: <Zap className="w-3.5 h-3.5" />,
  searching: <Search className="w-3.5 h-3.5" />,
  analyzing: <Brain className="w-3.5 h-3.5" />,
  processing: <BarChart3 className="w-3.5 h-3.5" />,
  synthesizing: <TrendingUp className="w-3.5 h-3.5" />,
  generating: <Sparkles className="w-3.5 h-3.5" />,
  planning: <BookOpen className="w-3.5 h-3.5" />,
  configuring: <Beaker className="w-3.5 h-3.5" />,
  preparing_data: <Database className="w-3.5 h-3.5" />,
  loading_models: <Brain className="w-3.5 h-3.5" />,
  running: <FlaskConical className="w-3.5 h-3.5" />,
  complete: <CheckCircle2 className="w-3.5 h-3.5" />,
  error: <XCircle className="w-3.5 h-3.5" />,
  idle: <Clock className="w-3.5 h-3.5" />,
};

function AgentAvatar({ type, state }: { type: "research" | "experiment"; state: string }) {
  const config = AGENT_CONFIG[type];
  const isActive = state !== "idle";
  const isComplete = state === "complete";

  return (
    <div className="relative w-20 h-20 mx-auto">
      {/* Orbiting particles when active */}
      {isActive && !isComplete && (
        <>
          <div className="absolute inset-0 animate-orbit">
            <div className={`w-2 h-2 rounded-full bg-gradient-to-r ${config.gradient} opacity-80`} />
          </div>
          <div className="absolute inset-0 animate-orbit" style={{ animationDelay: "-1.3s" }}>
            <div className={`w-1.5 h-1.5 rounded-full bg-gradient-to-r ${config.gradient} opacity-60`} />
          </div>
          <div className="absolute inset-0 animate-orbit" style={{ animationDelay: "-2.6s" }}>
            <div className={`w-1 h-1 rounded-full bg-gradient-to-r ${config.gradient} opacity-40`} />
          </div>
        </>
      )}

      {/* Main avatar */}
      <div
        className={`relative w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br ${config.gradient} flex items-center justify-center transition-all duration-500 ${isActive ? "animate-float" : ""} ${isComplete ? "scale-105" : ""}`}
        style={isActive ? { boxShadow: `0 0 20px ${config.glowColor}, 0 0 40px ${config.glowColor}` } : {}}
      >
        <config.icon className="w-8 h-8 text-white" />
        {/* Scan line effect when active */}
        {isActive && !isComplete && (
          <div className="absolute inset-0 rounded-2xl overflow-hidden pointer-events-none">
            <div className="w-full h-[2px] bg-white/30 animate-scan-line" />
          </div>
        )}
      </div>

      {/* Status dot */}
      <div className={`absolute -bottom-1 left-1/2 -translate-x-1/2 w-4 h-4 rounded-full border-2 border-gray-900 ${
        state === "idle" ? "bg-gray-500" :
        state === "error" ? "bg-red-500" :
        state === "complete" ? "bg-green-500" :
        `bg-${config.color}-500 animate-pulse`
      }`} />
    </div>
  );
}

function WaveVisualizer({ active, color }: { active: boolean; color: string }) {
  return (
    <div className="flex items-end gap-[2px] h-4">
      {Array.from({ length: 12 }).map((_, i) => (
        <div
          key={i}
          className={`w-[3px] rounded-full transition-all duration-300 ${active ? `bg-${color}-400` : "bg-gray-700"}`}
          style={{
            height: active ? `${Math.random() * 12 + 4}px` : "4px",
            animation: active ? `wave 0.8s ease-in-out infinite` : "none",
            animationDelay: `${i * 0.06}s`,
          }}
        />
      ))}
    </div>
  );
}

function LogTerminal({ logs, color }: { logs: LogEntry[]; color: string }) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs]);

  const typeColors: Record<string, string> = {
    info: "text-gray-400",
    success: `text-green-400`,
    error: "text-red-400",
    paper: `text-${color}-300`,
    trend: "text-purple-400",
    gap: "text-yellow-400",
    hypothesis: "text-emerald-400",
    data: "text-blue-400",
    model: "text-pink-400",
    step: `text-${color}-400`,
    metric: "text-teal-400",
  };

  return (
    <div
      ref={scrollRef}
      className="h-44 overflow-y-auto scrollbar-thin font-mono text-xs p-3 bg-black/40 rounded-lg border border-white/5"
    >
      {logs.length === 0 && (
        <div className="text-gray-600 flex items-center gap-2">
          <span className="animate-pulse">_</span> Awaiting commands...
        </div>
      )}
      {logs.map((log, i) => (
        <div
          key={i}
          className={`${typeColors[log.type] || "text-gray-400"} animate-fade-in-up leading-relaxed`}
          style={{ animationDelay: `${i * 0.02}s` }}
        >
          <span className="text-gray-600 mr-2">
            {new Date(log.timestamp).toLocaleTimeString("en-US", { hour12: false })}
          </span>
          {log.text}
        </div>
      ))}
    </div>
  );
}

function ProgressBar({ value, label, color }: { value: number; label: string; color: string }) {
  return (
    <div className="space-y-1.5">
      <div className="flex justify-between text-xs">
        <span className="text-gray-400">{label}</span>
        <span className={`text-${color}-400 font-mono font-bold`}>{value}%</span>
      </div>
      <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
        <div
          className={`h-full bg-gradient-to-r ${
            color === "cyan" ? "from-cyan-500 to-blue-500" : "from-amber-500 to-orange-500"
          } rounded-full transition-all duration-700 ease-out progress-shine`}
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  );
}

function FindingsBadge({ icon: Icon, count, label, color }: { icon: React.ElementType; count: number; label: string; color: string }) {
  return (
    <div className={`flex items-center gap-1.5 px-2 py-1 rounded-md bg-${color}-500/10 text-${color}-400 text-xs`}>
      <Icon className="w-3 h-3" />
      <span className="font-mono font-bold">{count}</span>
      <span className="text-gray-500">{label}</span>
    </div>
  );
}

function AgentPanel({
  type,
  state,
  onStart,
  inputValue,
  onInputChange,
  inputPlaceholder,
  isRunning,
}: {
  type: "research" | "experiment";
  state: AgentState;
  onStart: () => void;
  inputValue: string;
  onInputChange: (v: string) => void;
  inputPlaceholder: string;
  isRunning: boolean;
}) {
  const config = AGENT_CONFIG[type];

  return (
    <div className={`flex-1 rounded-xl border ${config.borderColor} ${config.bgColor} backdrop-blur-sm overflow-hidden`}>
      {/* Header */}
      <div className="p-4 border-b border-white/5">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <AgentAvatar type={type} state={state.status} />
            <div>
              <h3 className={`font-bold text-lg ${config.textColor} tracking-wide`}>
                {config.name}
              </h3>
              <p className="text-xs text-gray-500">{config.subtitle}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <WaveVisualizer active={isRunning} color={config.color} />
            {isRunning ? (
              <Wifi className={`w-4 h-4 ${config.textColor} animate-pulse`} />
            ) : (
              <WifiOff className="w-4 h-4 text-gray-600" />
            )}
          </div>
        </div>

        {/* Status badge */}
        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg ${config.accentBg} ${config.textColor} text-xs`}>
          {STATUS_ICONS[state.status]}
          <span className="font-medium">{state.message || "Standing by"}</span>
        </div>
      </div>

      {/* Input + Controls */}
      <div className="p-4 border-b border-white/5">
        <div className="flex gap-2">
          <Input
            value={inputValue}
            onChange={(e) => onInputChange(e.target.value)}
            placeholder={inputPlaceholder}
            className="bg-black/30 border-white/10 text-white placeholder:text-gray-600 text-sm"
            disabled={isRunning}
          />
          <Button
            onClick={onStart}
            disabled={isRunning || !inputValue.trim()}
            className={`bg-gradient-to-r ${config.gradient} hover:opacity-90 text-white px-4`}
          >
            {isRunning ? (
              <Square className="w-4 h-4" />
            ) : (
              <Play className="w-4 h-4" />
            )}
          </Button>
        </div>
      </div>

      {/* Progress */}
      <div className="px-4 pt-3">
        <ProgressBar value={state.progress} label={state.progressLabel} color={config.color} />
      </div>

      {/* Findings summary */}
      {Object.keys(state.findings).length > 0 && (
        <div className="px-4 pt-3 flex flex-wrap gap-1.5">
          {type === "research" ? (
            <>
              <FindingsBadge icon={BookOpen} count={state.findings.papers?.length || 0} label="papers" color="cyan" />
              <FindingsBadge icon={TrendingUp} count={state.findings.trends?.length || 0} label="trends" color="purple" />
              <FindingsBadge icon={AlertTriangle} count={state.findings.gaps?.length || 0} label="gaps" color="yellow" />
              <FindingsBadge icon={Lightbulb} count={state.findings.hypotheses?.length || 0} label="ideas" color="emerald" />
            </>
          ) : (
            <>
              <FindingsBadge icon={Database} count={state.findings.datasets?.length || 0} label="datasets" color="blue" />
              <FindingsBadge icon={Brain} count={state.findings.models?.length || 0} label="models" color="pink" />
              <FindingsBadge icon={Beaker} count={state.findings.steps?.length || 0} label="steps" color="amber" />
              <FindingsBadge icon={BarChart3} count={state.findings.metrics?.length || 0} label="metrics" color="teal" />
            </>
          )}
        </div>
      )}

      {/* Terminal */}
      <div className="p-4">
        <LogTerminal logs={state.logs} color={config.color} />
      </div>
    </div>
  );
}

const defaultAgentState: AgentState = {
  status: "idle",
  message: "Standing by",
  progress: 0,
  progressLabel: "Idle",
  logs: [],
  findings: {},
};

export function AgentArena() {
  const [researchState, setResearchState] = useState<AgentState>({ ...defaultAgentState });
  const [experimentState, setExperimentState] = useState<AgentState>({ ...defaultAgentState });
  const [researchInput, setResearchInput] = useState("");
  const [experimentInput, setExperimentInput] = useState("");
  const [researchRunning, setResearchRunning] = useState(false);
  const [experimentRunning, setExperimentRunning] = useState(false);
  const abortResearch = useRef<AbortController | null>(null);
  const abortExperiment = useRef<AbortController | null>(null);

  const runAgent = useCallback(
    async (
      type: "research" | "experiment",
      input: string,
      setState: React.Dispatch<React.SetStateAction<AgentState>>,
      setRunning: React.Dispatch<React.SetStateAction<boolean>>,
      abortRef: React.MutableRefObject<AbortController | null>
    ) => {
      abortRef.current = new AbortController();
      setRunning(true);
      setState({ ...defaultAgentState, status: "booting", message: "Initializing..." });

      try {
        const endpoint = type === "research" ? "/api/agents/research" : "/api/agents/experiment";
        const body =
          type === "research"
            ? { topic: input }
            : { hypothesis: input };

        const response = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
          signal: abortRef.current.signal,
        });

        if (!response.ok || !response.body) throw new Error("Failed to connect");

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
                setState((prev) => {
                  const next = { ...prev };
                  switch (eventType) {
                    case "status":
                      next.status = data.state;
                      next.message = data.message;
                      break;
                    case "progress":
                      next.progress = data.value;
                      next.progressLabel = data.label;
                      break;
                    case "log":
                      next.logs = [...prev.logs, { ...data, timestamp: Date.now() }];
                      break;
                    case "paper":
                      next.findings = { ...prev.findings, papers: [...(prev.findings.papers || []), data] };
                      break;
                    case "trend":
                      next.findings = { ...prev.findings, trends: [...(prev.findings.trends || []), data] };
                      break;
                    case "gap":
                      next.findings = { ...prev.findings, gaps: [...(prev.findings.gaps || []), data] };
                      break;
                    case "hypothesis":
                      next.findings = { ...prev.findings, hypotheses: [...(prev.findings.hypotheses || []), data] };
                      break;
                    case "dataset":
                      next.findings = { ...prev.findings, datasets: [...(prev.findings.datasets || []), data] };
                      break;
                    case "model":
                      next.findings = { ...prev.findings, models: [...(prev.findings.models || []), data] };
                      break;
                    case "step":
                      next.findings = { ...prev.findings, steps: [...(prev.findings.steps || []), data] };
                      break;
                    case "metrics":
                      next.findings = { ...prev.findings, metrics: [...(prev.findings.metrics || []), data] };
                      break;
                  }
                  return next;
                });
              } catch { /* skip parse errors */ }
              eventType = "";
            }
          }
        }
      } catch (err) {
        if ((err as Error).name !== "AbortError") {
          setState((prev) => ({
            ...prev,
            status: "error",
            message: String(err),
            logs: [...prev.logs, { text: `> ERROR: ${err}`, type: "error", timestamp: Date.now() }],
          }));
        }
      } finally {
        setRunning(false);
      }
    },
    []
  );

  const startResearch = () => {
    runAgent("research", researchInput, setResearchState, setResearchRunning, abortResearch);
  };

  const startExperiment = () => {
    runAgent("experiment", experimentInput, setExperimentState, setExperimentRunning, abortExperiment);
  };

  // Auto-pass research hypothesis to experiment agent
  useEffect(() => {
    const hypotheses = researchState.findings.hypotheses as Array<{ title: string }> | undefined;
    if (
      researchState.status === "complete" &&
      hypotheses?.length &&
      !experimentInput
    ) {
      setExperimentInput(hypotheses[0].title);
    }
  }, [researchState.status, researchState.findings.hypotheses, experimentInput]);

  const totalProgress = Math.round((researchState.progress + experimentState.progress) / 2);
  const anyRunning = researchRunning || experimentRunning;

  return (
    <div className="h-full bg-gray-950 text-white overflow-auto">
      {/* Top bar */}
      <div className="border-b border-white/5 bg-black/40 backdrop-blur-sm px-6 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <div>
              <h1 className="font-bold text-sm tracking-wider uppercase text-gray-200">
                Agent Arena
              </h1>
              <p className="text-[10px] text-gray-500 uppercase tracking-widest">
                Lumi Mission Control
              </p>
            </div>
          </div>

          {/* Global progress */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-xs text-gray-400">
              <div className={`w-2 h-2 rounded-full ${anyRunning ? "bg-green-500 animate-pulse" : "bg-gray-600"}`} />
              {anyRunning ? "AGENTS ACTIVE" : "ALL SYSTEMS IDLE"}
            </div>
            <div className="w-48">
              <div className="flex justify-between text-[10px] text-gray-500 mb-1">
                <span>MISSION PROGRESS</span>
                <span className="font-mono">{totalProgress}%</span>
              </div>
              <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-violet-500 to-indigo-500 rounded-full transition-all duration-500"
                  style={{ width: `${totalProgress}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Pixel World */}
      <div className="px-4 pt-4">
        <PixelWorld
          scoutStatus={{ id: "scout", state: researchState.status, message: researchState.message, progress: researchState.progress }}
          forgeStatus={{ id: "forge", state: experimentState.status, message: experimentState.message, progress: experimentState.progress }}
        />
      </div>

      {/* Agent panels */}
      <div className="p-4 flex gap-4 flex-1 min-h-0">
        <AgentPanel
          type="research"
          state={researchState}
          onStart={startResearch}
          inputValue={researchInput}
          onInputChange={setResearchInput}
          inputPlaceholder="Enter research topic (e.g., world models for robotics)"
          isRunning={researchRunning}
        />

        {/* Center connector */}
        <div className="flex flex-col items-center justify-center gap-2 px-1">
          <div className="w-[1px] flex-1 bg-gradient-to-b from-transparent via-white/10 to-transparent" />
          <div className={`w-10 h-10 rounded-full border-2 flex items-center justify-center transition-all duration-500 ${
            anyRunning
              ? "border-violet-500 bg-violet-500/20 animate-pulse"
              : "border-gray-700 bg-gray-800/50"
          }`}>
            <Zap className={`w-4 h-4 ${anyRunning ? "text-violet-400" : "text-gray-600"}`} />
          </div>
          <div className="text-[9px] text-gray-600 uppercase tracking-widest"
            style={{ writingMode: "vertical-rl" }}>
            SYNC
          </div>
          <div className="w-[1px] flex-1 bg-gradient-to-b from-transparent via-white/10 to-transparent" />
        </div>

        <AgentPanel
          type="experiment"
          state={experimentState}
          onStart={startExperiment}
          inputValue={experimentInput}
          onInputChange={setExperimentInput}
          inputPlaceholder="Enter hypothesis to test"
          isRunning={experimentRunning}
        />
      </div>
    </div>
  );
}
