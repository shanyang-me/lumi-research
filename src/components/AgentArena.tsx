"use client";

import { useState, useEffect, useCallback } from "react";
import { PixelWorld } from "./PixelWorld";
import type { AgentStatus } from "./PixelWorld";
import { AGENT_ROLES } from "@/lib/pipeline";
import type { AgentRole } from "@/lib/pipeline";
import {
  Swords,
  Crown,
  Bot,
  Loader2,
  Coffee,
  Monitor,
} from "lucide-react";

interface PipelineTask {
  id: string;
  title: string;
  stage: string;
  status: string;
  agentRole: string | null;
}

interface ProjectSummary {
  id: string;
  name: string;
  status: string;
  _count: {
    pipelineTasks: number;
  };
}

export function AgentArena() {
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [selectedProject, setSelectedProject] = useState<string | null>(null);
  const [tasks, setTasks] = useState<PipelineTask[]>([]);
  const [runningAgents, setRunningAgents] = useState<Set<string>>(new Set());
  const [agentMessages, setAgentMessages] = useState<Record<string, string>>({});

  // Load projects
  useEffect(() => {
    fetch("/api/projects")
      .then((r) => r.json())
      .then((data) => {
        setProjects(data);
        if (data.length > 0 && !selectedProject) {
          setSelectedProject(data[0].id);
        }
      });
  }, [selectedProject]);

  // Load pipeline tasks for selected project
  const loadTasks = useCallback(async () => {
    if (!selectedProject) return;
    const res = await fetch(`/api/projects/${selectedProject}/pipeline`);
    const data = await res.json();
    setTasks(Array.isArray(data) ? data : []);
  }, [selectedProject]);

  useEffect(() => {
    loadTasks();
    const interval = setInterval(loadTasks, 5000); // Poll for updates
    return () => clearInterval(interval);
  }, [loadTasks]);

  // Build agent statuses from pipeline tasks
  const agentStatuses: AgentStatus[] = Object.entries(AGENT_ROLES)
    .filter(([key]) => key !== "commander")
    .map(([key, role]) => {
      const agentTasks = tasks.filter((t) => t.agentRole === key);
      const doneTasks = agentTasks.filter((t) => t.status === "done").length;
      const isRunning = runningAgents.has(key);
      const allDone = agentTasks.length > 0 && doneTasks === agentTasks.length;

      let state: AgentStatus["state"] = "idle";
      if (isRunning) state = "working";
      else if (allDone) state = "done";

      let message = "On break";
      if (isRunning) message = agentMessages[key] || "Working...";
      else if (allDone) message = "All tasks done";
      else if (agentTasks.length > 0) message = `${doneTasks}/${agentTasks.length} tasks`;

      return {
        id: key,
        name: role.name,
        color: role.color,
        state,
        message,
      };
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

  const runAgent = async (role: AgentRole) => {
    if (!selectedProject) return;
    setRunningAgents((prev) => new Set(prev).add(role));
    setAgentMessages((prev) => ({ ...prev, [role]: "Starting..." }));

    try {
      const response = await fetch("/api/agents/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          role,
          projectId: selectedProject,
          stage: AGENT_ROLES[role].stage || "general",
          context: {},
        }),
      });

      if (!response.ok || !response.body) throw new Error("Failed");

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
                const short = data.text.replace(/^> /, "").slice(0, 40);
                setAgentMessages((prev) => ({ ...prev, [role]: short }));
              } else if (eventType === "task_update" || eventType === "complete") {
                loadTasks();
              }
            } catch { /* skip */ }
            eventType = "";
          }
        }
      }
    } catch (err) {
      setAgentMessages((prev) => ({ ...prev, [role]: `Error: ${err}` }));
    } finally {
      setRunningAgents((prev) => {
        const next = new Set(prev);
        next.delete(role);
        return next;
      });
      setAgentMessages((prev) => ({ ...prev, [role]: "Done" }));
      loadTasks();
    }
  };

  const workingCount = agentStatuses.filter((a) => a.state === "working").length;
  const idleCount = agentStatuses.filter((a) => a.state === "idle").length;

  return (
    <div className="h-full bg-[#0a0a1a] text-white overflow-auto">
      {/* Header */}
      <div className="border-b-2 border-[#374151] bg-[#0f0f23] px-4 py-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 bg-[#7c3aed] border-2 border-[#a78bfa] flex items-center justify-center">
              <Crown className="w-3.5 h-3.5 text-white" />
            </div>
            <div>
              <h1 className="font-pixel text-[9px] tracking-wider text-[#a78bfa]">
                LUMI OFFICE
              </h1>
              <p className="text-[8px] text-[#6b7280]">Agent Mission Control</p>
            </div>
          </div>

          {/* Project selector */}
          <div className="flex items-center gap-3">
            <select
              className="font-pixel text-[7px] w-40"
              value={selectedProject || ""}
              onChange={(e) => setSelectedProject(e.target.value)}
            >
              <option value="">Select project...</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>

            <div className="flex items-center gap-2 text-[9px]">
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
            </div>
          </div>
        </div>
      </div>

      {/* Pixel World */}
      <div className="px-4 pt-4">
        <PixelWorld agents={agentStatuses} />
      </div>

      {/* Agent Control Grid */}
      <div className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <Bot className="w-4 h-4 text-[#a78bfa]" />
          <span className="font-pixel text-[8px] text-[#a78bfa] tracking-wider">TEAM ROSTER</span>
          <div className="flex-1 h-[2px] bg-[#374151]" />
        </div>

        <div className="grid grid-cols-3 gap-2">
          {Object.entries(AGENT_ROLES).map(([key, role]) => {
            const isRunning = runningAgents.has(key);
            const agentTasks = tasks.filter((t) => t.agentRole === key);
            const doneTasks = agentTasks.filter((t) => t.status === "done").length;
            const allDone = agentTasks.length > 0 && doneTasks === agentTasks.length;
            const msg = agentMessages[key];

            return (
              <div
                key={key}
                className="border-2 bg-[#111827] p-3 transition-all"
                style={{
                  borderColor: isRunning ? role.color : "#374151",
                  boxShadow: isRunning ? `0 0 12px ${role.color}30` : "none",
                }}
              >
                <div className="flex items-center gap-2 mb-2">
                  <div
                    className="w-6 h-6 flex items-center justify-center border"
                    style={{ borderColor: role.color, background: `${role.color}15` }}
                  >
                    <Bot className="w-3.5 h-3.5" style={{ color: role.color }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-pixel text-[7px] tracking-wider" style={{ color: role.color }}>
                      {role.name.toUpperCase()}
                    </div>
                    <div className="text-[8px] text-[#6b7280] truncate">{role.title}</div>
                  </div>
                  {/* Status indicator */}
                  <div className="flex items-center gap-1">
                    {isRunning ? (
                      <div className="flex items-center gap-1 text-[#10b981]">
                        <Monitor className="w-3 h-3" />
                        <Loader2 className="w-3 h-3 animate-spin" />
                      </div>
                    ) : allDone ? (
                      <div className="w-3 h-3 bg-[#3b82f6] flex items-center justify-center">
                        <span className="text-[6px] text-white font-bold">OK</span>
                      </div>
                    ) : (
                      <Coffee className="w-3 h-3 text-[#4b5563]" />
                    )}
                  </div>
                </div>

                {/* Task progress */}
                {agentTasks.length > 0 && (
                  <div className="mb-2">
                    <div className="flex items-center gap-1 mb-1">
                      <div className="flex-1 h-1.5 bg-[#1a1a2e] border border-[#374151]">
                        <div
                          className="h-full transition-all"
                          style={{
                            width: `${(doneTasks / agentTasks.length) * 100}%`,
                            background: role.color,
                          }}
                        />
                      </div>
                      <span className="text-[7px] text-[#6b7280]">{doneTasks}/{agentTasks.length}</span>
                    </div>
                  </div>
                )}

                {/* Status message */}
                {msg && isRunning && (
                  <div className="text-[8px] text-[#6b7280] truncate mb-2">{msg}</div>
                )}

                {/* Summon button */}
                <button
                  onClick={() => runAgent(key as AgentRole)}
                  disabled={isRunning || !selectedProject}
                  className="w-full pixel-btn px-2 py-1.5 flex items-center justify-center gap-1.5 disabled:opacity-40 text-[9px]"
                  style={{
                    background: isRunning ? `${role.color}15` : `${role.color}10`,
                    borderColor: role.color,
                    color: role.color,
                  }}
                >
                  {isRunning ? (
                    <>
                      <Loader2 className="w-3 h-3 animate-spin" />
                      <span className="font-pixel text-[6px]">WORKING...</span>
                    </>
                  ) : (
                    <>
                      <Swords className="w-3 h-3" />
                      <span className="font-pixel text-[6px]">SUMMON</span>
                    </>
                  )}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
