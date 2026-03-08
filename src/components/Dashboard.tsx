"use client";

import { useState, useEffect } from "react";
import { STATUS_COLORS } from "@/lib/types";
import {
  FolderOpen,
  Lightbulb,
  Database,
  Brain,
  FlaskConical,
  FileText,
  Scroll,
  Star,
  Shield,
  Sword,
  Heart,
  Gem,
} from "lucide-react";

interface ProjectWithCounts {
  id: string;
  name: string;
  description: string | null;
  status: string;
  updatedAt: string;
  _count: {
    hypotheses: number;
    datasets: number;
    models: number;
    experiments: number;
    papers: number;
  };
}

const STAT_CONFIG = [
  { label: "QUESTS", icon: Scroll, color: "#a78bfa", bgGlow: "rgba(167,139,250,0.1)" },
  { label: "IDEAS", icon: Lightbulb, color: "#fbbf24", bgGlow: "rgba(251,191,36,0.1)" },
  { label: "DATA", icon: Database, color: "#60a5fa", bgGlow: "rgba(96,165,250,0.1)" },
  { label: "MODELS", icon: Brain, color: "#f472b6", bgGlow: "rgba(244,114,182,0.1)" },
  { label: "EXPS", icon: FlaskConical, color: "#34d399", bgGlow: "rgba(52,211,153,0.1)" },
  { label: "PAPERS", icon: FileText, color: "#fb923c", bgGlow: "rgba(251,146,60,0.1)" },
];

const STATUS_ICON: Record<string, typeof Star> = {
  active: Sword,
  paused: Shield,
  completed: Star,
  archived: Gem,
};

export function Dashboard({
  onSelectProject,
  refreshKey,
}: {
  onSelectProject: (id: string) => void;
  refreshKey: number;
}) {
  const [projects, setProjects] = useState<ProjectWithCounts[]>([]);

  useEffect(() => {
    fetch("/api/projects")
      .then((r) => r.json())
      .then(setProjects);
  }, [refreshKey]);

  const totalStats = projects.reduce(
    (acc, p) => ({
      hypotheses: acc.hypotheses + p._count.hypotheses,
      datasets: acc.datasets + p._count.datasets,
      models: acc.models + p._count.models,
      experiments: acc.experiments + p._count.experiments,
      papers: acc.papers + p._count.papers,
    }),
    { hypotheses: 0, datasets: 0, models: 0, experiments: 0, papers: 0 }
  );

  const statValues = [
    projects.length,
    totalStats.hypotheses,
    totalStats.datasets,
    totalStats.models,
    totalStats.experiments,
    totalStats.papers,
  ];

  // Calculate "XP" - total research items
  const totalXP = Object.values(totalStats).reduce((a, b) => a + b, 0);

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Title bar */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-6 h-6 bg-[#a78bfa] flex items-center justify-center">
          <Heart className="w-3 h-3 text-white" />
        </div>
        <h2 className="font-pixel text-sm text-[#a78bfa] tracking-wider">
          HEADQUARTERS
        </h2>
        <div className="flex-1 pixel-divider" />
        <div className="flex items-center gap-2">
          <span className="font-pixel text-[8px] text-[#6b7280]">XP</span>
          <div className="w-32 pixel-bar">
            <div
              className="pixel-bar-fill bg-[#a78bfa]"
              style={{ width: `${Math.min(totalXP * 5, 100)}%` }}
            />
          </div>
          <span className="font-pixel text-[8px] text-[#a78bfa]">{totalXP}</span>
        </div>
      </div>

      {/* Stat grid - RPG inventory style */}
      <div className="grid grid-cols-6 gap-2 mb-8">
        {STAT_CONFIG.map((stat, i) => (
          <div
            key={stat.label}
            className="pixel-border p-3 bg-[#111827] text-center group hover:border-[#a78bfa] transition-colors"
          >
            <div
              className="w-8 h-8 mx-auto mb-2 flex items-center justify-center"
              style={{ color: stat.color }}
            >
              <stat.icon className="w-5 h-5" />
            </div>
            <div className="font-pixel text-lg text-[#e5e7eb]" style={{ color: stat.color }}>
              {statValues[i]}
            </div>
            <div className="font-pixel text-[6px] text-[#6b7280] tracking-wider mt-1">
              {stat.label}
            </div>
          </div>
        ))}
      </div>

      {/* Quest board */}
      <div className="flex items-center gap-2 mb-4">
        <Scroll className="w-4 h-4 text-[#f59e0b]" />
        <h3 className="font-pixel text-[10px] text-[#f59e0b] tracking-wider">
          QUEST BOARD
        </h3>
        <div className="flex-1 pixel-divider" />
      </div>

      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        {projects.map((project) => {
          const StatusIcon = STATUS_ICON[project.status] || Star;
          const total =
            project._count.hypotheses +
            project._count.datasets +
            project._count.models +
            project._count.experiments +
            project._count.papers;

          return (
            <div
              key={project.id}
              className="pixel-card p-0 cursor-pointer"
              onClick={() => onSelectProject(project.id)}
            >
              {/* Card header */}
              <div className="flex items-center gap-2 px-3 py-2 border-b-2 border-[#1f2937] bg-[#0f0f23]">
                <StatusIcon className="w-3.5 h-3.5 text-[#a78bfa]" />
                <span className="font-pixel text-[8px] text-[#e5e7eb] truncate flex-1">
                  {project.name.toUpperCase()}
                </span>
                <span className={`font-pixel text-[6px] px-1.5 py-0.5 ${STATUS_COLORS[project.status]}`}>
                  {project.status.toUpperCase()}
                </span>
              </div>

              {/* Card body */}
              <div className="p-3">
                {project.description && (
                  <p className="text-[11px] text-[#9ca3af] mb-3 line-clamp-2">
                    {project.description}
                  </p>
                )}

                {/* Mini inventory */}
                <div className="flex gap-2 text-[9px]">
                  <span className="flex items-center gap-1 text-[#fbbf24]">
                    <Lightbulb className="w-3 h-3" />
                    {project._count.hypotheses}
                  </span>
                  <span className="flex items-center gap-1 text-[#34d399]">
                    <FlaskConical className="w-3 h-3" />
                    {project._count.experiments}
                  </span>
                  <span className="flex items-center gap-1 text-[#fb923c]">
                    <FileText className="w-3 h-3" />
                    {project._count.papers}
                  </span>
                  <span className="ml-auto font-pixel text-[7px] text-[#6b7280]">
                    {total} ITEMS
                  </span>
                </div>

                {/* Progress bar */}
                <div className="mt-2 pixel-bar" style={{ height: 6, border: "1px solid #374151" }}>
                  <div
                    className="pixel-bar-fill"
                    style={{
                      width: `${Math.min(total * 8, 100)}%`,
                      background: project.status === "completed" ? "#34d399" : "#a78bfa",
                    }}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {projects.length === 0 && (
        <div className="pixel-border bg-[#111827] p-12 text-center">
          <FolderOpen className="w-12 h-12 mx-auto mb-4 text-[#374151]" />
          <p className="font-pixel text-[9px] text-[#6b7280] mb-2">
            NO QUESTS AVAILABLE
          </p>
          <p className="text-xs text-[#4b5563]">
            Begin your research journey by creating a new quest.
          </p>
        </div>
      )}
    </div>
  );
}
