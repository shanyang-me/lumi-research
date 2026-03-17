"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Badge } from "@/components/ui/badge";
import { STATUS_COLORS } from "@/lib/types";
import { QuestMap } from "./QuestMap";
import { EntityTable } from "./EntityTable";
import { CreateDialog } from "./CreateDialog";
import { Blackboard } from "./Blackboard";
import { MeetingRoom } from "./MeetingRoom";
import { ConsolePanel } from "./ConsolePanel";
import type { LogEntry } from "./ConsolePanel";
import { OraclePanel } from "./OraclePanel";
import { PixelWorld } from "./PixelWorld";
import type { AgentStatus } from "./PixelWorld";
import { AGENT_ROLES, PIPELINE_STAGES } from "@/lib/pipeline";
import type { AgentRole } from "@/lib/pipeline";
import {
  Lightbulb,
  Database,
  Brain,
  FlaskConical,
  FileText,
  Plus,
  Scroll,
  Map,
  Package,
  PenLine,
  Monitor,
  Coffee,
  Swords,
  Loader2,
  Bot,
  X,
  Trash2,
  ChevronDown,
  Users,
  Terminal,
  Github,
  BookOpen,
  ExternalLink,
  Link,
} from "lucide-react";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ProjectData = any;

interface PipelineTask {
  id: string;
  title: string;
  stage: string;
  status: string;
  agentRole: string | null;
}

interface CustomAgentData {
  id: string;
  name: string;
  title: string;
  description: string;
  color: string;
  systemPrompt: string;
  stage: string | null;
}

const AGENT_COLORS = [
  "#8b5cf6", "#ec4899", "#14b8a6", "#f97316", "#84cc16",
  "#e879f9", "#22d3ee", "#facc15", "#f43f5e", "#a3e635",
];

export function ProjectView({
  projectId,
  onRefresh,
  onDelete,
}: {
  projectId: string;
  onRefresh: () => void;
  onDelete?: () => void;
}) {
  const [project, setProject] = useState<ProjectData>(null);
  const [createType, setCreateType] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"quest" | "inventory">("quest");
  const [showBoard, setShowBoard] = useState(false);
  const [showMeeting, setShowMeeting] = useState(false);
  const [notionUrl, setNotionUrl] = useState<string | null>(null);

  // Arena state
  const [tasks, setTasks] = useState<PipelineTask[]>([]);
  const [runningAgents, setRunningAgents] = useState<Set<string>>(new Set());
  const [agentMessages, setAgentMessages] = useState<Record<string, string>>({});
  const [meetingAgents, setMeetingAgents] = useState<Set<string>>(new Set());

  // Console & Oracle
  const [consoleLogs, setConsoleLogs] = useState<LogEntry[]>([]);
  const [showConsole, setShowConsole] = useState(true);
  const [consoleCollapsed, setConsoleCollapsed] = useState(false);
  const [showOracle, setShowOracle] = useState(true);
  const [oracleCollapsed, setOracleCollapsed] = useState(false);
  const logIdRef = useRef(0);

  const addLog = useCallback((level: LogEntry["level"], source: string, message: string) => {
    const id = ++logIdRef.current;
    setConsoleLogs((prev) => {
      const next = [...prev, { id, timestamp: new Date(), level, source, message }];
      // Keep last 500 lines
      return next.length > 500 ? next.slice(-500) : next;
    });
  }, []);

  // Custom agents
  const [customAgents, setCustomAgents] = useState<CustomAgentData[]>([]);
  const [showAddAgent, setShowAddAgent] = useState(false);

  const loadProject = useCallback(() => {
    fetch(`/api/projects/${projectId}`)
      .then((r) => r.json())
      .then(setProject);
  }, [projectId]);

  useEffect(() => {
    loadProject();
  }, [loadProject]);

  // Load Notion page URL
  useEffect(() => {
    fetch(`/api/projects/${projectId}/notion-url`)
      .then((r) => r.json())
      .then((d) => setNotionUrl(d.url || null))
      .catch(() => {});
  }, [projectId]);

  // Load custom agents
  const loadCustomAgents = useCallback(async () => {
    const res = await fetch(`/api/projects/${projectId}/agents`);
    const data = await res.json();
    setCustomAgents(Array.isArray(data) ? data : []);
  }, [projectId]);

  useEffect(() => {
    loadCustomAgents();
  }, [loadCustomAgents]);

  // Load pipeline tasks
  const loadTasks = useCallback(async () => {
    const res = await fetch(`/api/projects/${projectId}/pipeline`);
    const data = await res.json();
    setTasks(Array.isArray(data) ? data : []);
  }, [projectId]);

  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  // Initial console log
  useEffect(() => {
    addLog("system", "init", "Lumi Research Manager v1.0 initialized");
    addLog("info", "init", `Project ${projectId.slice(0, 8)}... loaded`);
    addLog("debug", "init", "Console ready — all agent activity will be logged here");
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  // Build merged agent roles (built-in + custom)
  const allAgentRoles: Record<string, { name: string; title: string; description: string; color: string; stage: string | null; custom?: boolean }> = {};
  for (const [key, role] of Object.entries(AGENT_ROLES)) {
    allAgentRoles[key] = { ...role, stage: role.stage ?? null };
  }
  for (const ca of customAgents) {
    allAgentRoles[ca.id] = { name: ca.name, title: ca.title, description: ca.description, color: ca.color, stage: ca.stage, custom: true };
  }

  // Build agent statuses for PixelWorld
  const agentStatuses: AgentStatus[] = Object.entries(allAgentRoles)
    .filter(([key]) => key !== "commander" && key !== "documenter")
    .map(([key, role]) => {
      const isRunning = runningAgents.has(key);
      const inMeeting = meetingAgents.has(key);

      let state: AgentStatus["state"] = "idle";
      if (inMeeting) state = "meeting";
      else if (isRunning) state = "working";

      let message = "On break";
      if (inMeeting) message = agentMessages[key] || "In meeting...";
      else if (isRunning) message = agentMessages[key] || "Working...";

      return { id: key, name: role.name, color: role.color, state, message };
    });

  // Add documenter
  const documenterRunning = runningAgents.has("documenter");
  agentStatuses.push({
    id: "documenter",
    name: "Documenter",
    color: AGENT_ROLES.documenter.color,
    state: documenterRunning ? "working" : "idle",
    message: documenterRunning ? agentMessages["documenter"] || "Syncing to Notion..." : "Standing by",
  });

  // Add commander
  const commanderRunning = runningAgents.has("commander");
  agentStatuses.push({
    id: "commander",
    name: "Commander",
    color: AGENT_ROLES.commander.color,
    state: commanderRunning ? "working" : "idle",
    message: commanderRunning ? "Coordinating..." : "Overseeing",
  });

  const runDocumenter = async () => {
    setRunningAgents((prev) => new Set(prev).add("documenter"));
    setAgentMessages((prev) => ({ ...prev, documenter: "Syncing to Notion..." }));
    addLog("system", "Documenter", "Starting Notion sync...");
    addLog("debug", "api", "POST /api/projects/.../doc-sync");
    try {
      const res = await fetch(`/api/projects/${projectId}/doc-sync`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setAgentMessages((prev) => ({ ...prev, documenter: data.error || "Sync failed" }));
        addLog("error", "Documenter", data.error || "Sync failed");
      } else {
        const msg = `${data.action === "created" ? "Created" : "Updated"} Notion page`;
        setAgentMessages((prev) => ({ ...prev, documenter: msg }));
        addLog("system", "Documenter", `${msg} → ${data.url || "done"}`);
      }
    } catch (err) {
      setAgentMessages((prev) => ({ ...prev, documenter: `Error: ${err}` }));
      addLog("error", "Documenter", `${err}`);
    } finally {
      setRunningAgents((prev) => {
        const next = new Set(prev);
        next.delete("documenter");
        return next;
      });
    }
  };

  const runAgent = async (role: string) => {
    if (role === "documenter") return runDocumenter();

    const agentName = allAgentRoles[role]?.name || role;
    setRunningAgents((prev) => new Set(prev).add(role));
    setAgentMessages((prev) => ({ ...prev, [role]: "Starting..." }));
    addLog("system", "dispatch", `Spawning ${agentName} agent...`);
    addLog("debug", "cli", `claude -p "<${agentName} system prompt + project context>"`);

    const agentInfo = allAgentRoles[role];

    try {
      const response = await fetch("/api/agents/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          role,
          projectId,
          stage: agentInfo?.stage || "general",
          context: {},
        }),
      });

      if (!response.ok || !response.body) throw new Error("Failed");
      addLog("info", agentName, "SSE stream connected, waiting for response...");

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
              if (eventType === "log") {
                const text = data.text.replace(/^> /, "");
                const short = text.slice(0, 40);
                setAgentMessages((prev) => ({ ...prev, [role]: short }));
                addLog("agent", agentName, text);
              } else if (eventType === "task_update") {
                addLog("info", agentName, `Task ${data.taskId} → ${data.status}`);
                loadTasks();
              } else if (eventType === "complete") {
                addLog("system", agentName, "Agent run complete, processing output...");
                loadTasks();
              }
            } catch { /* skip */ }
            eventType = "";
          }
        }
      }
    } catch (err) {
      setAgentMessages((prev) => ({ ...prev, [role]: `Error: ${err}` }));
      addLog("error", agentName, `${err}`);
    } finally {
      setRunningAgents((prev) => {
        const next = new Set(prev);
        next.delete(role);
        return next;
      });
      setAgentMessages((prev) => ({ ...prev, [role]: "Done" }));
      addLog("system", agentName, "Agent finished");
      loadTasks();
      loadProject();
    }
  };

  // Oracle action handler — actions triggered by Oracle's tool calls
  const handleOracleAction = useCallback((action: { type: string; payload: Record<string, unknown> }) => {
    if (action.type === "run_agent") {
      const role = action.payload.role as string;
      addLog("system", "Oracle", `Dispatching agent: ${role}`);
      runAgent(role);
    } else if (action.type === "start_meeting") {
      addLog("system", "Oracle", `Starting meeting: ${action.payload.topic}`);
      setShowMeeting(true);
      // The meeting room will be opened; actual meeting start happens in the MeetingRoom component
    } else if (action.type === "sync_notion") {
      addLog("system", "Oracle", "Triggering Notion sync...");
      runAgent("documenter");
    }
    // Refresh project data after any action
    setTimeout(() => { loadProject(); loadTasks(); }, 1000);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [addLog, loadProject, loadTasks]);

  // Scene click handler
  const handleSceneClick = (item: string) => {
    if (item === "whiteboard") {
      setShowBoard(true);
      addLog("info", "scene", "Opened blackboard");
    } else if (item === "meeting_table") {
      setShowMeeting(true);
      addLog("info", "scene", "Opened meeting room");
    }
  };

  const handleDelete = async (type: string, id: string) => {
    if (!confirm("Delete this item?")) return;
    await fetch(`/api/entities/${type}/${id}`, { method: "DELETE" });
    loadProject();
    onRefresh();
  };

  const handleStatusChange = async (type: string, id: string, status: string) => {
    await fetch(`/api/entities/${type}/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    loadProject();
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleCreate = async (type: string, data: any) => {
    await fetch(`/api/projects/${projectId}/${type}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    loadProject();
    onRefresh();
  };

  if (!project) {
    return (
      <div className="p-6 flex items-center gap-2">
        <span className="animate-blink font-pixel text-[10px] text-[#a78bfa]">LOADING...</span>
      </div>
    );
  }

  const statusOptions = (statuses: readonly string[]) =>
    statuses.map((s) => ({ value: s, label: s }));

  const workingCount = agentStatuses.filter((a) => a.state === "working").length;
  const idleCount = agentStatuses.filter((a) => a.state === "idle").length;

  // Overall progress
  const totalTasks = tasks.length;
  const doneTasks = tasks.filter((t) => t.status === "done").length;
  const overallProgress = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;

  return (
    <div className="flex flex-col h-full">
      {/* Project header */}
      <div className="px-4 py-3 bg-[#111827] border-b-2 border-[#374151] flex items-center gap-3">
        <div className="w-8 h-8 bg-[#1a1a2e] border-2 border-[#a78bfa] flex items-center justify-center">
          <Scroll className="w-4 h-4 text-[#a78bfa]" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h2 className="font-pixel text-[10px] text-[#e5e7eb] tracking-wider truncate">
              {project.name.toUpperCase()}
            </h2>
            <Badge className={`font-pixel text-[6px] ${STATUS_COLORS[project.status]}`}>
              {project.status.toUpperCase()}
            </Badge>
          </div>
          {project.description && (
            <p className="text-[9px] text-[#6b7280] truncate">{project.description}</p>
          )}
        </div>

        {/* View mode toggle */}
        <div className="flex border-2 border-[#374151]">
          <button
            onClick={() => setViewMode("quest")}
            className={`px-2 py-1 flex items-center gap-1 text-[9px] ${
              viewMode === "quest"
                ? "bg-[#1a1a2e] text-[#a78bfa]"
                : "text-[#6b7280] hover:text-[#9ca3af]"
            }`}
          >
            <Map className="w-3 h-3" />
            <span className="font-pixel text-[6px]">QUEST</span>
          </button>
          <button
            onClick={() => setViewMode("inventory")}
            className={`px-2 py-1 flex items-center gap-1 text-[9px] border-l-2 border-[#374151] ${
              viewMode === "inventory"
                ? "bg-[#1a1a2e] text-[#a78bfa]"
                : "text-[#6b7280] hover:text-[#9ca3af]"
            }`}
          >
            <Package className="w-3 h-3" />
            <span className="font-pixel text-[6px]">INVENTORY</span>
          </button>
        </div>

        <select
          className="font-pixel text-[7px] w-24"
          value={project.status}
          onChange={(e) =>
            handleStatusChange("projects", project.id, e.target.value).then(() =>
              fetch(`/api/projects/${projectId}`)
                .then((r) => r.json())
                .then(setProject)
            )
          }
        >
          {["active", "paused", "completed", "archived"].map((s) => (
            <option key={s} value={s}>{s.toUpperCase()}</option>
          ))}
        </select>
        <button
          onClick={async () => {
            if (!confirm(`Delete project "${project.name}"? This cannot be undone.`)) return;
            await fetch(`/api/projects/${projectId}`, { method: "DELETE" });
            onDelete?.();
          }}
          className="p-1.5 border border-[#374151] text-[#4b5563] hover:border-[#ef4444] hover:text-[#ef4444] transition-colors"
          title="Delete project"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Integrations bar */}
      <div className="px-4 py-2 bg-[#111827] border-b-2 border-[#374151] flex items-center gap-4 text-[10px]">
        <span className="font-pixel text-[6px] text-[#6b7280] tracking-wider mr-1">LINKS</span>

        {/* GitHub */}
        <div className="flex items-center gap-1.5">
          <Github className="w-3.5 h-3.5 text-[#e5e7eb]" />
          {project.repoUrl ? (
            <a
              href={project.repoUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#60a5fa] hover:underline flex items-center gap-1"
            >
              {project.repoUrl.replace("https://github.com/", "")}
              <ExternalLink className="w-2.5 h-2.5" />
            </a>
          ) : (
            <button
              onClick={() => {
                const url = prompt("GitHub repo URL:");
                if (url) fetch(`/api/projects/${projectId}`, {
                  method: "PATCH",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ repoUrl: url }),
                }).then(loadProject);
              }}
              className="text-[#9ca3af] hover:text-[#60a5fa] flex items-center gap-1 border border-dashed border-[#374151] px-1.5 py-0.5 hover:border-[#60a5fa] transition-colors"
            >
              <Link className="w-2.5 h-2.5" />
              <span>Connect GitHub</span>
            </button>
          )}
        </div>

        <div className="w-px h-3 bg-[#374151]" />

        {/* Overleaf */}
        <div className="flex items-center gap-1.5">
          <BookOpen className="w-3 h-3 text-[#e879f9]" />
          {project.overleafId ? (() => {
            const oid = project.overleafId as string;
            const href = oid.startsWith("http") ? oid : `https://www.overleaf.com/project/${oid}`;
            return (
              <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#e879f9] hover:underline flex items-center gap-1"
              >
                Overleaf
                <ExternalLink className="w-2.5 h-2.5" />
              </a>
            );
          })() : (
            <button
              onClick={() => {
                const id = prompt("Overleaf URL or project ID:");
                if (id) fetch(`/api/projects/${projectId}`, {
                  method: "PATCH",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ overleafId: id }),
                }).then(loadProject);
              }}
              className="text-[#9ca3af] hover:text-[#e879f9] flex items-center gap-1 border border-dashed border-[#374151] px-1.5 py-0.5 hover:border-[#e879f9] transition-colors"
            >
              <Link className="w-2.5 h-2.5" />
              <span>Connect Overleaf</span>
            </button>
          )}
        </div>

        <div className="w-px h-3 bg-[#374151]" />

        {/* Notion */}
        <div className="flex items-center gap-1.5">
          <FileText className="w-3.5 h-3.5 text-[#f59e0b]" />
          {notionUrl ? (
            <a
              href={notionUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#f59e0b] hover:underline flex items-center gap-1"
            >
              Notion
              <ExternalLink className="w-2.5 h-2.5" />
            </a>
          ) : (
            <span className="text-[#4b5563]">Notion (run Documenter to create)</span>
          )}
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 overflow-y-auto bg-[#0a0a1a]">
        {/* Status bar */}
        <div className="px-4 py-2 bg-[#0f0f23] border-b border-[#1f2937] flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="font-pixel text-[6px] text-[#6b7280]">PROGRESS</span>
            <div className="w-24 h-2.5 bg-[#1a1a2e] border border-[#374151]">
              <div
                className="h-full bg-[#a78bfa] transition-all duration-500"
                style={{ width: `${overallProgress}%` }}
              />
            </div>
            <span className="font-pixel text-[7px] text-[#a78bfa]">{overallProgress}%</span>
            <span className="text-[9px] text-[#6b7280]">{doneTasks}/{totalTasks}</span>
          </div>
          <div className="flex-1" />
          <div className="flex items-center gap-3 text-[9px]">
            {workingCount > 0 && (
              <span className="flex items-center gap-1 text-[#10b981]">
                <Monitor className="w-3 h-3" /> {workingCount} working
              </span>
            )}
            {idleCount > 0 && (
              <span className="flex items-center gap-1 text-[#6b7280]">
                <Coffee className="w-3 h-3" /> {idleCount} on break
              </span>
            )}
            <button
              onClick={() => { setShowConsole(s => !s); if (!showConsole) setConsoleCollapsed(false); }}
              className={`flex items-center gap-1 px-1.5 py-0.5 border transition-colors ${
                showConsole ? "border-[#10b981] text-[#10b981]" : "border-[#374151] text-[#4b5563] hover:text-[#10b981] hover:border-[#10b981]"
              }`}
              title="Toggle Console"
            >
              <Terminal className="w-3 h-3" />
            </button>
            <button
              onClick={() => { setShowOracle(s => !s); if (!showOracle) setOracleCollapsed(false); }}
              className={`flex items-center gap-1 px-1.5 py-0.5 border transition-colors ${
                showOracle ? "border-[#a78bfa] text-[#a78bfa]" : "border-[#374151] text-[#4b5563] hover:text-[#a78bfa] hover:border-[#a78bfa]"
              }`}
              title="Toggle Oracle"
            >
              <Bot className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* Pixel World + Console (left) | Team Roster (right) — hidden in inventory mode */}
        <div className={`flex gap-0${viewMode === "inventory" ? " hidden" : ""}`}>
          {/* Left: Pixel World + Console */}
          <div className="flex-1 min-w-0">
            <div className="px-4 pt-4">
              <PixelWorld agents={agentStatuses} onSceneClick={handleSceneClick} />
              <div className="text-center mt-1">
                <span className="text-[8px] text-[#4b5563]">
                  Click the blackboard for notes | Click the meeting table for team meetings
                </span>
              </div>
            </div>

            {/* Console + Oracle split */}
            {(showConsole || showOracle) && (
              <div className="px-4 pt-2 flex gap-2" style={{ height: "240px" }}>
                {showConsole && (
                  <div className={showOracle ? "flex-1 min-w-0" : "w-full"}>
                    <ConsolePanel
                      logs={consoleLogs}
                      isCollapsed={consoleCollapsed}
                      onToggleCollapse={() => setConsoleCollapsed(c => !c)}
                      onClose={() => setShowConsole(false)}
                    />
                  </div>
                )}
                {showOracle && (
                  <div className={showConsole ? "flex-1 min-w-0" : "w-full"}>
                    <OraclePanel
                      projectId={projectId}
                      isCollapsed={oracleCollapsed}
                      onToggleCollapse={() => setOracleCollapsed(c => !c)}
                      onClose={() => setShowOracle(false)}
                      onAction={handleOracleAction}
                    />
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Right: Team Roster */}
          <div className="w-56 shrink-0 border-l-2 border-[#374151] bg-[#0f0f23] overflow-y-auto">
            <div className="p-3">
              <div className="flex items-center gap-2 mb-3">
                <Bot className="w-3.5 h-3.5 text-[#a78bfa]" />
                <span className="font-pixel text-[7px] text-[#a78bfa] tracking-wider">TEAM ROSTER</span>
                <div className="flex-1" />
                <button
                  onClick={() => setShowAddAgent(true)}
                  className="p-1 border border-dashed border-[#4b5563] text-[#6b7280] hover:border-[#a78bfa] hover:text-[#a78bfa] transition-colors"
                  title="Hire Agent"
                >
                  <Plus className="w-3 h-3" />
                </button>
              </div>

              <div className="space-y-2">
                {Object.entries(allAgentRoles).map(([key, role]) => {
                  const isRunning = runningAgents.has(key);
                  const inMeeting = meetingAgents.has(key);
                  const msg = agentMessages[key];
                  const isCustom = "custom" in role && role.custom;

                  return (
                    <div
                      key={key}
                      className="group border bg-[#111827] p-2 transition-all relative"
                      style={{
                        borderColor: isRunning || inMeeting ? role.color : "#374151",
                        boxShadow: isRunning ? `0 0 8px ${role.color}20` : "none",
                      }}
                    >
                      {/* Delete button for custom agents */}
                      {isCustom && !isRunning && (
                        <button
                          onClick={async () => {
                            if (!confirm(`Remove ${role.name}?`)) return;
                            await fetch(`/api/agents/custom/${key}`, { method: "DELETE" });
                            loadCustomAgents();
                          }}
                          className="absolute top-1 right-1 p-0.5 text-[#374151] hover:text-[#ef4444] opacity-0 group-hover:opacity-100 transition-all"
                        >
                          <Trash2 className="w-2.5 h-2.5" />
                        </button>
                      )}

                      <div className="flex items-center gap-1.5 mb-1">
                        <div
                          className="w-5 h-5 flex items-center justify-center border"
                          style={{ borderColor: role.color, background: `${role.color}15` }}
                        >
                          <Bot className="w-3 h-3" style={{ color: role.color }} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1">
                            <span className="font-pixel text-[6px] tracking-wider" style={{ color: role.color }}>
                              {role.name.toUpperCase()}
                            </span>
                            {isCustom && (
                              <span className="font-pixel text-[5px] px-0.5 border border-[#374151] text-[#6b7280]">
                                C
                              </span>
                            )}
                          </div>
                        </div>
                        {isRunning ? (
                          <Loader2 className="w-3 h-3 animate-spin text-[#10b981]" />
                        ) : inMeeting ? (
                          <Users className="w-3 h-3 text-[#fbbf24]" />
                        ) : (
                          <Coffee className="w-2.5 h-2.5 text-[#374151]" />
                        )}
                      </div>

                      {(isRunning || inMeeting) && msg && (
                        <div className="text-[7px] text-[#6b7280] truncate mb-1 pl-6">{msg}</div>
                      )}

                      <button
                        onClick={() => runAgent(key)}
                        disabled={isRunning || inMeeting}
                        className="w-full pixel-btn px-1.5 py-1 flex items-center justify-center gap-1 disabled:opacity-30 text-[8px]"
                        style={{
                          background: isRunning ? `${role.color}15` : `${role.color}08`,
                          borderColor: role.color,
                          color: role.color,
                        }}
                      >
                        {isRunning ? (
                          <>
                            <Loader2 className="w-2.5 h-2.5 animate-spin" />
                            <span className="font-pixel text-[5px]">WORKING...</span>
                          </>
                        ) : (
                          <>
                            <Swords className="w-2.5 h-2.5" />
                            <span className="font-pixel text-[5px]">SUMMON</span>
                          </>
                        )}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Quest / Inventory content below */}
        {viewMode === "quest" ? (
          <QuestMap project={project} onRefresh={loadProject} />
        ) : (
        <div className="flex-1 overflow-y-auto p-4 max-w-6xl mx-auto w-full">
          {/* Inventory view - entities */}
          <div className="space-y-6">
            {/* Hypotheses */}
            <div>
              <div className="flex justify-between items-center mb-3">
                <div className="flex items-center gap-2">
                  <Lightbulb className="w-4 h-4 text-[#fbbf24]" />
                  <span className="font-pixel text-[8px] text-[#fbbf24] tracking-wider">HYPOTHESES</span>
                  <span className="text-[9px] text-[#6b7280]">({project.hypotheses.length})</span>
                </div>
                <button
                  onClick={() => setCreateType("hypotheses")}
                  className="pixel-btn bg-[#1a1a2e] px-2 py-1 flex items-center gap-1 text-[9px] text-[#a78bfa]"
                >
                  <Plus className="w-3 h-3" />
                  <span className="font-pixel text-[6px]">ADD</span>
                </button>
              </div>
              <EntityTable
                entityType="hypotheses"
                columns={[
                  { key: "title", label: "Title" },
                  { key: "description", label: "Description" },
                  { key: "status", label: "Status" },
                  { key: "confidence", label: "Conf", render: (v) => (v != null ? `${Math.round((v as number) * 100)}%` : "-") },
                ]}
                data={project.hypotheses}
                onDelete={(id) => handleDelete("hypotheses", id)}
                onEdit={(id) => {
                  const s = prompt("Status (proposed/testing/supported/refuted/revised):");
                  if (s) handleStatusChange("hypotheses", id, s);
                }}
              />
            </div>

            {/* Datasets */}
            <div>
              <div className="flex justify-between items-center mb-3">
                <div className="flex items-center gap-2">
                  <Database className="w-4 h-4 text-[#60a5fa]" />
                  <span className="font-pixel text-[8px] text-[#60a5fa] tracking-wider">DATASETS</span>
                  <span className="text-[9px] text-[#6b7280]">({project.datasets.length})</span>
                </div>
                <button
                  onClick={() => setCreateType("datasets")}
                  className="pixel-btn bg-[#1a1a2e] px-2 py-1 flex items-center gap-1 text-[9px] text-[#a78bfa]"
                >
                  <Plus className="w-3 h-3" />
                  <span className="font-pixel text-[6px]">ADD</span>
                </button>
              </div>
              <EntityTable
                entityType="datasets"
                columns={[
                  { key: "name", label: "Name" },
                  { key: "source", label: "Source" },
                  { key: "size", label: "Size" },
                  { key: "format", label: "Format" },
                ]}
                data={project.datasets}
                onDelete={(id) => handleDelete("datasets", id)}
                onEdit={(id) => {
                  const n = prompt("New name:");
                  if (n) fetch(`/api/entities/datasets/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: n }) }).then(loadProject);
                }}
              />
            </div>

            {/* Models */}
            <div>
              <div className="flex justify-between items-center mb-3">
                <div className="flex items-center gap-2">
                  <Brain className="w-4 h-4 text-[#f472b6]" />
                  <span className="font-pixel text-[8px] text-[#f472b6] tracking-wider">MODELS</span>
                  <span className="text-[9px] text-[#6b7280]">({project.models.length})</span>
                </div>
                <button
                  onClick={() => setCreateType("models")}
                  className="pixel-btn bg-[#1a1a2e] px-2 py-1 flex items-center gap-1 text-[9px] text-[#a78bfa]"
                >
                  <Plus className="w-3 h-3" />
                  <span className="font-pixel text-[6px]">ADD</span>
                </button>
              </div>
              <EntityTable
                entityType="models"
                columns={[
                  { key: "name", label: "Name" },
                  { key: "architecture", label: "Architecture" },
                  { key: "framework", label: "Framework" },
                  { key: "description", label: "Description" },
                ]}
                data={project.models}
                onDelete={(id) => handleDelete("models", id)}
                onEdit={(id) => {
                  const n = prompt("New name:");
                  if (n) fetch(`/api/entities/models/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: n }) }).then(loadProject);
                }}
              />
            </div>

            {/* Experiments */}
            <div>
              <div className="flex justify-between items-center mb-3">
                <div className="flex items-center gap-2">
                  <FlaskConical className="w-4 h-4 text-[#34d399]" />
                  <span className="font-pixel text-[8px] text-[#34d399] tracking-wider">EXPERIMENTS</span>
                  <span className="text-[9px] text-[#6b7280]">({project.experiments.length})</span>
                </div>
                <button
                  onClick={() => setCreateType("experiments")}
                  className="pixel-btn bg-[#1a1a2e] px-2 py-1 flex items-center gap-1 text-[9px] text-[#a78bfa]"
                >
                  <Plus className="w-3 h-3" />
                  <span className="font-pixel text-[6px]">ADD</span>
                </button>
              </div>
              <EntityTable
                entityType="experiments"
                columns={[
                  { key: "name", label: "Name" },
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  { key: "hypothesis", label: "Hypothesis", render: (_v, row: any) => row.hypothesis?.title || "-" },
                  { key: "status", label: "Status" },
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  { key: "results", label: "Results", render: (_v, row: any) => `${row.results?.length || 0}` },
                ]}
                data={project.experiments}
                onDelete={(id) => handleDelete("experiments", id)}
                onEdit={(id) => {
                  const s = prompt("Status (planned/running/completed/failed):");
                  if (s) handleStatusChange("experiments", id, s);
                }}
              />
            </div>

            {/* Papers */}
            <div>
              <div className="flex justify-between items-center mb-3">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-[#fb923c]" />
                  <span className="font-pixel text-[8px] text-[#fb923c] tracking-wider">PAPERS</span>
                  <span className="text-[9px] text-[#6b7280]">({project.papers.length})</span>
                </div>
                <button
                  onClick={() => setCreateType("papers")}
                  className="pixel-btn bg-[#1a1a2e] px-2 py-1 flex items-center gap-1 text-[9px] text-[#a78bfa]"
                >
                  <Plus className="w-3 h-3" />
                  <span className="font-pixel text-[6px]">ADD</span>
                </button>
              </div>
              <EntityTable
                entityType="papers"
                columns={[
                  { key: "title", label: "Title" },
                  { key: "status", label: "Status" },
                  { key: "venue", label: "Venue" },
                  { key: "url", label: "URL" },
                ]}
                data={project.papers}
                onDelete={(id) => handleDelete("papers", id)}
                onEdit={(id) => {
                  const s = prompt("Status (idea/drafting/review/submitted/published):");
                  if (s) handleStatusChange("papers", id, s);
                }}
              />
            </div>
          </div>
        </div>
        )}
      </div>

      {/* Blackboard overlay */}
      {showBoard && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="relative w-full max-w-3xl max-h-[85vh] overflow-hidden flex flex-col bg-[#0a0a1a] border-2 border-[#374151]">
            {/* Overlay header */}
            <div className="flex items-center justify-between px-4 py-2 bg-[#111827] border-b-2 border-[#374151]">
              <div className="flex items-center gap-2">
                <PenLine className="w-4 h-4 text-[#10b981]" />
                <span className="font-pixel text-[9px] text-[#10b981] tracking-wider">BLACKBOARD</span>
                <span className="text-[9px] text-[#6b7280]">- {project.name}</span>
              </div>
              <button
                onClick={() => setShowBoard(false)}
                className="p-1 hover:bg-[#1f2937] transition-colors text-[#6b7280] hover:text-[#e5e7eb]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            {/* Blackboard content */}
            <div className="flex-1 overflow-y-auto">
              <Blackboard projectId={projectId} />
            </div>
          </div>
        </div>
      )}

      {/* Meeting Room overlay */}
      {showMeeting && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="relative w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col bg-[#0a0a1a] border-2 border-[#374151]">
            <div className="flex items-center justify-between px-4 py-2 bg-[#111827] border-b-2 border-[#374151]">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-[#a78bfa]" />
                <span className="font-pixel text-[9px] text-[#a78bfa] tracking-wider">MEETING ROOM</span>
                <span className="text-[9px] text-[#6b7280]">- {project.name}</span>
              </div>
              <button
                onClick={() => { setShowMeeting(false); setMeetingAgents(new Set()); }}
                className="p-1 hover:bg-[#1f2937] transition-colors text-[#6b7280] hover:text-[#e5e7eb]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">
              <MeetingRoom
                projectId={projectId}
                customAgents={customAgents}
                onClose={() => { setShowMeeting(false); setMeetingAgents(new Set()); }}
                onMeetingAgentsChange={setMeetingAgents}
                onAgentMessage={(key, msg) => setAgentMessages(prev => ({ ...prev, [key]: msg }))}
                onLog={addLog}
                onRefresh={loadProject}
              />
            </div>
          </div>
        </div>
      )}

      {/* Add Agent overlay */}
      {showAddAgent && (
        <AddAgentDialog
          projectId={projectId}
          onClose={() => setShowAddAgent(false)}
          onCreated={() => {
            setShowAddAgent(false);
            loadCustomAgents();
          }}
        />
      )}

      {/* Create Dialogs */}
      <CreateDialog
        open={createType === "hypotheses"}
        onClose={() => setCreateType(null)}
        title="New Hypothesis"
        fields={[
          { name: "title", label: "Title", type: "text", required: true },
          { name: "description", label: "Description", type: "textarea", required: true },
          { name: "status", label: "Status", type: "select", options: statusOptions(["proposed", "testing", "supported", "refuted", "revised"]) },
        ]}
        onSubmit={(data) => handleCreate("hypotheses", data)}
      />
      <CreateDialog
        open={createType === "datasets"}
        onClose={() => setCreateType(null)}
        title="New Dataset"
        fields={[
          { name: "name", label: "Name", type: "text", required: true },
          { name: "description", label: "Description", type: "textarea" },
          { name: "source", label: "Source", type: "text" },
          { name: "size", label: "Size", type: "text" },
          { name: "format", label: "Format", type: "text" },
        ]}
        onSubmit={(data) => handleCreate("datasets", data)}
      />
      <CreateDialog
        open={createType === "models"}
        onClose={() => setCreateType(null)}
        title="New Model"
        fields={[
          { name: "name", label: "Name", type: "text", required: true },
          { name: "description", label: "Description", type: "textarea" },
          { name: "architecture", label: "Architecture", type: "text" },
          { name: "framework", label: "Framework", type: "text" },
        ]}
        onSubmit={(data) => handleCreate("models", data)}
      />
      <CreateDialog
        open={createType === "experiments"}
        onClose={() => setCreateType(null)}
        title="New Experiment"
        fields={[
          { name: "name", label: "Name", type: "text", required: true },
          { name: "description", label: "Description", type: "textarea" },
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          { name: "hypothesisId", label: "Hypothesis", type: "select", options: project.hypotheses.map((h: any) => ({ value: h.id, label: h.title })) },
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          { name: "datasetIds", label: "Datasets", type: "multiselect", options: project.datasets.map((d: any) => ({ value: d.id, label: d.name })) },
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          { name: "modelIds", label: "Models", type: "multiselect", options: project.models.map((m: any) => ({ value: m.id, label: m.name })) },
        ]}
        onSubmit={(data) => handleCreate("experiments", data)}
      />
      <CreateDialog
        open={createType === "papers"}
        onClose={() => setCreateType(null)}
        title="New Paper"
        fields={[
          { name: "title", label: "Title", type: "text", required: true },
          { name: "abstract", label: "Abstract", type: "textarea" },
          { name: "status", label: "Status", type: "select", options: statusOptions(["idea", "drafting", "review", "submitted", "published"]) },
          { name: "venue", label: "Venue", type: "text" },
          { name: "url", label: "URL", type: "text" },
        ]}
        onSubmit={(data) => handleCreate("papers", data)}
      />
    </div>
  );
}

// ---- Add Agent Dialog ----
function AddAgentDialog({
  projectId,
  onClose,
  onCreated,
}: {
  projectId: string;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [name, setName] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [color, setColor] = useState(AGENT_COLORS[0]);
  const [stage, setStage] = useState("");
  const [systemPrompt, setSystemPrompt] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSubmit = async () => {
    if (!name.trim() || !systemPrompt.trim()) return;
    setSaving(true);
    await fetch(`/api/projects/${projectId}/agents`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        title: title || `${name} Helper`,
        description: description || `Custom ${name} agent`,
        color,
        systemPrompt,
        stage: stage || null,
      }),
    });
    setSaving(false);
    onCreated();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="w-full max-w-lg bg-[#0a0a1a] border-2 border-[#374151] flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-2 bg-[#111827] border-b-2 border-[#374151]">
          <div className="flex items-center gap-2">
            <Bot className="w-4 h-4 text-[#a78bfa]" />
            <span className="font-pixel text-[9px] text-[#a78bfa] tracking-wider">HIRE NEW AGENT</span>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-[#1f2937] transition-colors text-[#6b7280] hover:text-[#e5e7eb]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Name + Color */}
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="font-pixel text-[7px] text-[#6b7280] tracking-wider block mb-1">NAME *</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Reviewer"
                className="w-full bg-[#111827] border-2 border-[#374151] text-[#e5e7eb] text-[11px] px-2 py-1.5 outline-none focus:border-[#a78bfa] placeholder:text-[#374151]"
              />
            </div>
            <div>
              <label className="font-pixel text-[7px] text-[#6b7280] tracking-wider block mb-1">COLOR</label>
              <div className="flex gap-1 flex-wrap max-w-[120px]">
                {AGENT_COLORS.map((c) => (
                  <button
                    key={c}
                    onClick={() => setColor(c)}
                    className="w-5 h-5 border-2 transition-all"
                    style={{
                      background: c,
                      borderColor: color === c ? "#e5e7eb" : "transparent",
                      boxShadow: color === c ? `0 0 6px ${c}` : "none",
                    }}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Title */}
          <div>
            <label className="font-pixel text-[7px] text-[#6b7280] tracking-wider block mb-1">TITLE</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Paper Reviewer"
              className="w-full bg-[#111827] border-2 border-[#374151] text-[#e5e7eb] text-[11px] px-2 py-1.5 outline-none focus:border-[#a78bfa] placeholder:text-[#374151]"
            />
          </div>

          {/* Description */}
          <div>
            <label className="font-pixel text-[7px] text-[#6b7280] tracking-wider block mb-1">DESCRIPTION</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What this agent does (shown in roster)"
              className="w-full bg-[#111827] border-2 border-[#374151] text-[#e5e7eb] text-[11px] px-2 py-1.5 outline-none focus:border-[#a78bfa] placeholder:text-[#374151]"
            />
          </div>

          {/* Stage */}
          <div>
            <label className="font-pixel text-[7px] text-[#6b7280] tracking-wider block mb-1">PIPELINE STAGE (optional)</label>
            <div className="relative">
              <select
                value={stage}
                onChange={(e) => setStage(e.target.value)}
                className="w-full appearance-none bg-[#111827] border-2 border-[#374151] text-[#e5e7eb] text-[11px] px-2 py-1.5 pr-8 outline-none focus:border-[#a78bfa]"
              >
                <option value="">No specific stage</option>
                {PIPELINE_STAGES.map((s) => (
                  <option key={s.id} value={s.id}>{s.label}</option>
                ))}
              </select>
              <ChevronDown className="w-3 h-3 text-[#6b7280] absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>

          {/* System Prompt */}
          <div>
            <label className="font-pixel text-[7px] text-[#6b7280] tracking-wider block mb-1">SYSTEM PROMPT *</label>
            <textarea
              value={systemPrompt}
              onChange={(e) => setSystemPrompt(e.target.value)}
              rows={8}
              placeholder={"You are a specialist agent. Your job is to:\n1. ...\n2. ...\n\nRespond ONLY with JSON:\n{\n  \"findings\": [...],\n  \"summary\": \"...\"\n}"}
              className="w-full bg-[#111827] border-2 border-[#374151] text-[#e5e7eb] text-[10px] px-2 py-2 outline-none focus:border-[#a78bfa] placeholder:text-[#374151] font-mono resize-y"
            />
            <p className="text-[8px] text-[#4b5563] mt-1">
              Define what this agent does. It will receive the project context automatically.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="px-4 py-3 border-t-2 border-[#374151] flex items-center justify-between">
          {/* Preview */}
          <div className="flex items-center gap-2">
            <div
              className="w-6 h-6 flex items-center justify-center border"
              style={{ borderColor: color, background: `${color}15` }}
            >
              <Bot className="w-3.5 h-3.5" style={{ color }} />
            </div>
            <span className="font-pixel text-[7px] tracking-wider" style={{ color }}>
              {name ? name.toUpperCase() : "AGENT"}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-3 py-1.5 text-[9px] text-[#6b7280] hover:text-[#e5e7eb] transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={!name.trim() || !systemPrompt.trim() || saving}
              className="pixel-btn px-4 py-1.5 flex items-center gap-1.5 disabled:opacity-40"
              style={{
                background: `${color}20`,
                borderColor: color,
                color,
              }}
            >
              {saving ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : (
                <Plus className="w-3 h-3" />
              )}
              <span className="font-pixel text-[7px]">HIRE</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
