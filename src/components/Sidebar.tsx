"use client";

import { useState, useEffect } from "react";
import {
  Lightbulb,
  FolderOpen,
  Plus,
  ChevronRight,
  Bot,
  LayoutDashboard,
  Swords,
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface Project {
  id: string;
  name: string;
  status: string;
}

interface SidebarProps {
  activeView: string;
  activeProjectId: string | null;
  onNavigate: (view: string, projectId?: string) => void;
  onNewProject: () => void;
  refreshKey: number;
}

export function Sidebar({
  activeView,
  activeProjectId,
  onNavigate,
  onNewProject,
  refreshKey,
}: SidebarProps) {
  const [projects, setProjects] = useState<Project[]>([]);

  useEffect(() => {
    fetch("/api/projects")
      .then((r) => r.json())
      .then(setProjects);
  }, [refreshKey]);

  return (
    <div className="w-64 border-r bg-gray-50/50 h-screen flex flex-col">
      <div className="p-4 border-b">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center">
            <Lightbulb className="w-4 h-4 text-white" />
          </div>
          <div>
            <h1 className="font-semibold text-lg leading-tight">Lumi</h1>
            <p className="text-xs text-muted-foreground">Research Manager</p>
          </div>
        </div>
      </div>

      <div className="p-2 flex-1 overflow-auto">
        <Button
          variant={activeView === "dashboard" ? "secondary" : "ghost"}
          className="w-full justify-start mb-1"
          onClick={() => onNavigate("dashboard")}
        >
          <LayoutDashboard className="w-4 h-4 mr-2" />
          Dashboard
        </Button>
        <Button
          variant={activeView === "arena" ? "secondary" : "ghost"}
          className="w-full justify-start mb-1"
          onClick={() => onNavigate("arena")}
        >
          <Swords className="w-4 h-4 mr-2" />
          Agent Arena
        </Button>
        <Button
          variant={activeView === "agent" ? "secondary" : "ghost"}
          className="w-full justify-start mb-3"
          onClick={() => onNavigate("agent")}
        >
          <Bot className="w-4 h-4 mr-2" />
          AI Assistant
        </Button>

        <div className="flex items-center justify-between px-2 mb-1">
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Projects
          </span>
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onNewProject}>
            <Plus className="w-3 h-3" />
          </Button>
        </div>

        {projects.map((project) => (
          <Button
            key={project.id}
            variant={activeProjectId === project.id ? "secondary" : "ghost"}
            className="w-full justify-start text-sm"
            onClick={() => onNavigate("project", project.id)}
          >
            <FolderOpen className="w-4 h-4 mr-2 shrink-0" />
            <span className="truncate">{project.name}</span>
            <ChevronRight className="w-3 h-3 ml-auto shrink-0 opacity-50" />
          </Button>
        ))}

        {projects.length === 0 && (
          <p className="text-xs text-muted-foreground px-2 py-4 text-center">
            No projects yet. Create one to get started.
          </p>
        )}
      </div>

      <div className="p-3 border-t text-xs text-muted-foreground text-center">
        Powered by LangGraph + Claude
      </div>
    </div>
  );
}
