"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { PIPELINE_STAGES, AGENT_ROLES } from "@/lib/pipeline";
import type { AgentRole } from "@/lib/pipeline";
import {
  Bot,
  Check,
  ChevronRight,
  Loader2,
  Play,
  Plus,
  Search,
  Lightbulb,
  FlaskConical,
  Code,
  Database,
  Flame,
  Target,
  Scroll,
  Shield,
  Swords,
  Trash2,
  Crown,
} from "lucide-react";

interface PipelineTask {
  id: string;
  title: string;
  description: string | null;
  stage: string;
  status: string;
  type: string;
  agentRole: string | null;
  output: string | null;
  order: number;
}

interface ProjectData {
  id: string;
  name: string;
  description: string | null;
  problem: string | null;
  currentStage: string;
  status: string;
}

const STAGE_ICONS: Record<string, typeof Search> = {
  define: Target,
  survey: Search,
  plan: Scroll,
  hypothesize: Lightbulb,
  design: FlaskConical,
  implement: Code,
  data_prep: Database,
  execute: Flame,
};

const STATUS_STYLE: Record<string, { bg: string; border: string; text: string; glow: string }> = {
  todo: { bg: "bg-[#1a1a2e]", border: "border-[#374151]", text: "text-[#6b7280]", glow: "" },
  active: { bg: "bg-[#1a1a2e]", border: "border-[#f59e0b]", text: "text-[#f59e0b]", glow: "shadow-[0_0_8px_rgba(245,158,11,0.3)]" },
  done: { bg: "bg-[#064e3b]/40", border: "border-[#10b981]", text: "text-[#34d399]", glow: "" },
  blocked: { bg: "bg-[#7f1d1d]/30", border: "border-[#ef4444]", text: "text-[#ef4444]", glow: "" },
};

export function QuestMap({ project, onRefresh }: { project: ProjectData; onRefresh: () => void }) {
  const [tasks, setTasks] = useState<PipelineTask[]>([]);
  const [selectedStage, setSelectedStage] = useState<string>(project.currentStage || "define");
  const [runningAgent, setRunningAgent] = useState<string | null>(null);
  const [agentLogs, setAgentLogs] = useState<string[]>([]);
  const [showCommander, setShowCommander] = useState(false);
  const logsRef = useRef<HTMLDivElement>(null);

  const loadTasks = useCallback(async () => {
    const res = await fetch(`/api/projects/${project.id}/pipeline`);
    const data = await res.json();
    if (data.length === 0) {
      const initRes = await fetch(`/api/projects/${project.id}/pipeline`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "init" }),
      });
      const initData = await initRes.json();
      setTasks(Array.isArray(initData) ? initData : []);
    } else {
      setTasks(data);
    }
  }, [project.id]);

  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  useEffect(() => {
    if (logsRef.current) {
      logsRef.current.scrollTop = logsRef.current.scrollHeight;
    }
  }, [agentLogs]);

  const stageInfo = PIPELINE_STAGES.find((s) => s.id === selectedStage)! as {
    id: string; label: string; color: string; description: string; agent?: string;
  };
  const stageTasks = tasks.filter((t) => t.stage === selectedStage);

  const getStageProgress = (stageId: string) => {
    const st = tasks.filter((t) => t.stage === stageId);
    if (st.length === 0) return 0;
    return Math.round((st.filter((t) => t.status === "done").length / st.length) * 100);
  };

  const toggleTask = async (task: PipelineTask) => {
    const newStatus = task.status === "done" ? "todo" : "done";
    await fetch(`/api/pipeline/${task.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });
    loadTasks();
  };

  const deleteTask = async (taskId: string) => {
    await fetch(`/api/pipeline/${taskId}`, { method: "DELETE" });
    loadTasks();
  };

  const addTask = async () => {
    const title = prompt("Task name:");
    if (!title) return;
    await fetch(`/api/projects/${project.id}/pipeline`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title,
        stage: selectedStage,
        order: stageTasks.length,
      }),
    });
    loadTasks();
  };

  const runAgent = async (role: AgentRole) => {
    setRunningAgent(role);
    setAgentLogs([`> Summoning ${AGENT_ROLES[role].name}...`]);

    try {
      const response = await fetch("/api/agents/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          role,
          projectId: project.id,
          stage: selectedStage,
          context: {
            problem: project.problem,
            description: project.description,
          },
        }),
      });

      if (!response.ok || !response.body) throw new Error("Failed to connect to agent");

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
                setAgentLogs((prev) => [...prev, data.text]);
              } else if (eventType === "task_update") {
                loadTasks();
              } else if (eventType === "complete") {
                setAgentLogs((prev) => [...prev, "> Mission complete."]);
                loadTasks();
              }
            } catch { /* skip */ }
            eventType = "";
          }
        }
      }
    } catch (err) {
      setAgentLogs((prev) => [...prev, `> ERROR: ${err}`]);
    } finally {
      setRunningAgent(null);
    }
  };

  // Commander summary
  const overallProgress = Math.round(
    PIPELINE_STAGES.reduce((sum, s) => sum + getStageProgress(s.id), 0) / PIPELINE_STAGES.length
  );
  const doneTasks = tasks.filter((t) => t.status === "done").length;

  return (
    <div className="flex flex-col h-full">
      {/* Commander Bar */}
      <div className="px-4 py-2 bg-[#0f0f23] border-b-2 border-[#374151] flex items-center gap-4">
        <button
          onClick={() => setShowCommander(!showCommander)}
          className={`flex items-center gap-2 px-2 py-1 transition-colors ${
            showCommander ? "text-[#a78bfa]" : "text-[#6b7280] hover:text-[#a78bfa]"
          }`}
        >
          <Crown className="w-4 h-4" />
          <span className="font-pixel text-[7px] tracking-wider">COMMANDER</span>
        </button>
        <div className="flex-1 flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="font-pixel text-[6px] text-[#6b7280]">PROGRESS</span>
            <div className="w-32 h-3 bg-[#1a1a2e] border border-[#374151] overflow-hidden">
              <div
                className="h-full bg-[#a78bfa] transition-all duration-500"
                style={{ width: `${overallProgress}%` }}
              />
            </div>
            <span className="font-pixel text-[7px] text-[#a78bfa]">{overallProgress}%</span>
          </div>
          <div className="text-[9px] text-[#6b7280]">
            {doneTasks}/{tasks.length} tasks
          </div>
          {runningAgent && (
            <div className="flex items-center gap-1 text-[9px] text-[#f59e0b]">
              <Loader2 className="w-3 h-3 animate-spin" />
              {AGENT_ROLES[runningAgent as AgentRole]?.name || runningAgent} working
            </div>
          )}
        </div>
      </div>

      {/* Commander Panel (expandable) */}
      {showCommander && (
        <div className="px-4 py-3 bg-[#0a0a1a] border-b-2 border-[#374151]">
          <div className="grid grid-cols-3 gap-3">
            {Object.entries(AGENT_ROLES).filter(([k]) => k !== "commander").map(([key, agent]) => {
              const agentTasks = tasks.filter((t) => t.agentRole === key);
              const agentDone = agentTasks.filter((t) => t.status === "done").length;
              const isRunning = runningAgent === key;
              return (
                <div
                  key={key}
                  className="p-2 border-2 bg-[#111827] cursor-pointer hover:bg-[#1a1a2e] transition-colors"
                  style={{ borderColor: isRunning ? agent.color : "#374151" }}
                  onClick={() => {
                    if (agent.stage) setSelectedStage(agent.stage);
                  }}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <Bot className="w-3.5 h-3.5" style={{ color: agent.color }} />
                    <span className="font-pixel text-[7px] tracking-wider" style={{ color: agent.color }}>
                      {agent.name.toUpperCase()}
                    </span>
                    {isRunning && <Loader2 className="w-3 h-3 animate-spin ml-auto" style={{ color: agent.color }} />}
                  </div>
                  <div className="text-[8px] text-[#6b7280] mb-1">{agent.title}</div>
                  <div className="flex items-center gap-1">
                    <div className="flex-1 h-1.5 bg-[#1a1a2e] border border-[#374151]">
                      <div
                        className="h-full transition-all"
                        style={{
                          width: agentTasks.length ? `${(agentDone / agentTasks.length) * 100}%` : "0%",
                          background: agent.color,
                        }}
                      />
                    </div>
                    <span className="text-[7px] text-[#6b7280]">{agentDone}/{agentTasks.length}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="flex flex-1 min-h-0">
        {/* Quest Map - Stage Progression (no locking) */}
        <div className="w-56 border-r-2 border-[#374151] bg-[#0f0f23] overflow-y-auto py-3">
          {PIPELINE_STAGES.map((stage, i) => {
            const Icon = STAGE_ICONS[stage.id] || Target;
            const progress = getStageProgress(stage.id);
            const isSelected = selectedStage === stage.id;
            const isComplete = progress === 100;
            const hasAgent = "agent" in stage;

            return (
              <div key={stage.id}>
                {/* Connector line */}
                {i > 0 && (
                  <div className="flex justify-center">
                    <div
                      className="w-0.5 h-4"
                      style={{
                        background: getStageProgress(PIPELINE_STAGES[i - 1].id) > 0
                          ? stage.color
                          : "#374151",
                      }}
                    />
                  </div>
                )}

                {/* Stage node */}
                <button
                  onClick={() => setSelectedStage(stage.id)}
                  className={`w-full px-3 py-2 flex items-center gap-2 transition-all ${
                    isSelected
                      ? "bg-[#1a1a2e]"
                      : "hover:bg-[#111827]"
                  }`}
                >
                  {/* Stage icon */}
                  <div
                    className="w-8 h-8 flex items-center justify-center border-2 shrink-0"
                    style={
                      isSelected
                        ? { borderColor: stage.color, boxShadow: `0 0 8px ${stage.color}40`, background: isComplete ? "#064e3b40" : "#111827" }
                        : { borderColor: isComplete ? "#10b981" : "#374151", background: isComplete ? "#064e3b40" : "#111827" }
                    }
                  >
                    {isComplete ? (
                      <Check className="w-3.5 h-3.5 text-[#34d399]" />
                    ) : (
                      <Icon className="w-3.5 h-3.5" style={{ color: isSelected ? stage.color : "#6b7280" }} />
                    )}
                  </div>

                  <div className="flex-1 text-left min-w-0">
                    <div className="flex items-center gap-1">
                      <span
                        className="font-pixel text-[7px] tracking-wider"
                        style={{ color: isSelected ? stage.color : "#9ca3af" }}
                      >
                        {stage.label}
                      </span>
                      {/* Agent indicator */}
                      {hasAgent && (
                        <Bot className="w-3 h-3 shrink-0" style={{ color: isSelected ? stage.color : "#4b5563" }} />
                      )}
                      {isSelected && (
                        <ChevronRight className="w-3 h-3 ml-auto shrink-0" style={{ color: stage.color }} />
                      )}
                    </div>
                    {/* Mini progress bar */}
                    <div className="mt-1 h-1 bg-[#1a1a2e] border border-[#374151]/50">
                      <div
                        className="h-full transition-all duration-300"
                        style={{ width: `${progress}%`, background: stage.color }}
                      />
                    </div>
                  </div>
                </button>
              </div>
            );
          })}
        </div>

        {/* Stage Detail Panel */}
        <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
          {/* Stage header */}
          <div className="px-4 py-3 border-b-2 border-[#374151] bg-[#111827]">
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 flex items-center justify-center border-2"
                style={{ borderColor: stageInfo.color, boxShadow: `0 0 12px ${stageInfo.color}30` }}
              >
                {(() => {
                  const Icon = STAGE_ICONS[selectedStage] || Target;
                  return <Icon className="w-5 h-5" style={{ color: stageInfo.color }} />;
                })()}
              </div>
              <div className="flex-1">
                <h3 className="font-pixel text-[10px] tracking-wider" style={{ color: stageInfo.color }}>
                  {stageInfo.label}
                </h3>
                <p className="text-[10px] text-[#6b7280]">{stageInfo.description}</p>
              </div>
              <div className="text-right">
                <span className="font-pixel text-[7px] text-[#6b7280]">PROGRESS</span>
                <div className="flex items-center gap-2">
                  <div className="w-20 h-2 bg-[#1a1a2e] border border-[#374151]">
                    <div
                      className="h-full transition-all"
                      style={{ width: `${getStageProgress(selectedStage)}%`, background: stageInfo.color }}
                    />
                  </div>
                  <span className="font-pixel text-[8px]" style={{ color: stageInfo.color }}>
                    {getStageProgress(selectedStage)}%
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Agent Summon Bar - always visible for agent stages */}
          {stageInfo.agent && (
            <div
              className="px-4 py-3 border-b-2 flex items-center gap-3"
              style={{ borderColor: `${stageInfo.color}40`, background: `${stageInfo.color}08` }}
            >
              <Bot className="w-5 h-5 shrink-0" style={{ color: stageInfo.color }} />
              <div className="flex-1">
                <div className="font-pixel text-[8px] tracking-wider" style={{ color: stageInfo.color }}>
                  {AGENT_ROLES[stageInfo.agent as AgentRole].title.toUpperCase()}
                </div>
                <div className="text-[9px] text-[#6b7280]">
                  {AGENT_ROLES[stageInfo.agent as AgentRole].description}
                </div>
              </div>
              <button
                onClick={() => runAgent(stageInfo.agent as AgentRole)}
                disabled={runningAgent !== null}
                className="pixel-btn px-4 py-2 flex items-center gap-2 disabled:opacity-50"
                style={{
                  background: `${stageInfo.color}25`,
                  borderColor: stageInfo.color,
                  color: stageInfo.color,
                  boxShadow: `0 0 12px ${stageInfo.color}20`,
                }}
              >
                {runningAgent === stageInfo.agent ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span className="font-pixel text-[8px] tracking-wider">WORKING...</span>
                  </>
                ) : (
                  <>
                    <Swords className="w-4 h-4" />
                    <span className="font-pixel text-[8px] tracking-wider">
                      SUMMON {AGENT_ROLES[stageInfo.agent as AgentRole].name.toUpperCase()}
                    </span>
                  </>
                )}
              </button>
            </div>
          )}

          {/* Tasks list */}
          <div className="flex-1 overflow-y-auto p-4">
            <div className="space-y-1.5">
              {stageTasks.map((task) => {
                const style = STATUS_STYLE[task.status] || STATUS_STYLE.todo;
                return (
                  <div
                    key={task.id}
                    className={`flex items-center gap-3 px-3 py-2 border-2 ${style.border} ${style.bg} ${style.glow} group transition-all`}
                  >
                    {/* Checkbox */}
                    <button
                      onClick={() => toggleTask(task)}
                      className={`w-5 h-5 border-2 flex items-center justify-center shrink-0 transition-colors ${
                        task.status === "done"
                          ? "border-[#10b981] bg-[#10b981]/20"
                          : "border-[#374151] hover:border-[#6b7280]"
                      }`}
                    >
                      {task.status === "done" && <Check className="w-3 h-3 text-[#34d399]" />}
                    </button>

                    {/* Task info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-[11px] ${task.status === "done" ? "line-through text-[#4b5563]" : "text-[#e5e7eb]"}`}
                        >
                          {task.title}
                        </span>
                        {task.type === "agent" && task.agentRole && (
                          <span
                            className="font-pixel text-[5px] px-1.5 py-0.5 border tracking-wider"
                            style={{
                              borderColor: AGENT_ROLES[task.agentRole as AgentRole]?.color || "#6b7280",
                              color: AGENT_ROLES[task.agentRole as AgentRole]?.color || "#6b7280",
                            }}
                          >
                            {(AGENT_ROLES[task.agentRole as AgentRole]?.name || task.agentRole).toUpperCase()}
                          </span>
                        )}
                      </div>
                      {task.description && (
                        <p className="text-[9px] text-[#6b7280] mt-0.5">{task.description}</p>
                      )}
                    </div>

                    {/* Agent run button for individual agent tasks */}
                    {task.type === "agent" && task.agentRole && task.status !== "done" && (
                      <button
                        onClick={() => runAgent(task.agentRole as AgentRole)}
                        disabled={runningAgent !== null}
                        title={`Run ${AGENT_ROLES[task.agentRole as AgentRole]?.name || task.agentRole}`}
                        className="px-2 py-1 hover:bg-[#1f2937] transition-colors opacity-0 group-hover:opacity-100 disabled:opacity-50"
                        style={{ color: AGENT_ROLES[task.agentRole as AgentRole]?.color }}
                      >
                        <Play className="w-3 h-3" />
                      </button>
                    )}

                    {/* Delete button */}
                    <button
                      onClick={() => deleteTask(task.id)}
                      className="px-1 py-1 text-[#374151] hover:text-[#ef4444] transition-colors opacity-0 group-hover:opacity-100"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                );
              })}

              {stageTasks.length === 0 && (
                <div className="text-center py-8">
                  <Shield className="w-8 h-8 mx-auto mb-2 text-[#374151]" />
                  <p className="font-pixel text-[7px] text-[#4b5563]">NO OBJECTIVES</p>
                </div>
              )}
            </div>

            {/* Add task button */}
            <button
              onClick={addTask}
              className="mt-3 w-full py-2 border-2 border-dashed border-[#374151] text-[#4b5563] hover:border-[#6b7280] hover:text-[#6b7280] flex items-center justify-center gap-2 transition-colors"
            >
              <Plus className="w-3 h-3" />
              <span className="text-[10px]">Add objective</span>
            </button>
          </div>

          {/* Agent Log (when running or has logs) */}
          {agentLogs.length > 0 && (
            <div className="border-t-2 border-[#374151] bg-[#0a0a1a]">
              <div className="px-3 py-1.5 border-b border-[#1f2937] flex items-center gap-2">
                <Bot className="w-3 h-3 text-[#a78bfa]" />
                <span className="font-pixel text-[6px] text-[#a78bfa] tracking-wider">AGENT LOG</span>
                {runningAgent && <Loader2 className="w-3 h-3 animate-spin text-[#a78bfa] ml-auto" />}
                {!runningAgent && (
                  <button
                    onClick={() => setAgentLogs([])}
                    className="ml-auto text-[8px] text-[#4b5563] hover:text-[#6b7280]"
                  >
                    CLEAR
                  </button>
                )}
              </div>
              <div ref={logsRef} className="h-32 overflow-y-auto p-2 font-mono text-[10px]">
                {agentLogs.map((log, i) => (
                  <div
                    key={i}
                    className={`leading-relaxed ${
                      log.includes("ERROR") ? "text-[#ef4444]" :
                      log.includes("complete") || log.includes("Completed") ? "text-[#34d399]" :
                      log.includes("Summoning") ? "text-[#a78bfa]" :
                      "text-[#6b7280]"
                    }`}
                  >
                    {log}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
