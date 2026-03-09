"use client";

import { useState, useCallback } from "react";
import { Sidebar } from "@/components/Sidebar";
import { Dashboard } from "@/components/Dashboard";
import { ProjectView } from "@/components/ProjectView";
import { AgentChat } from "@/components/AgentChat";
import { AgentArena } from "@/components/AgentArena";
import { NewProjectForm } from "@/components/NewProjectForm";

export default function Home() {
  const [activeView, setActiveView] = useState("dashboard");
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  const [showNewProject, setShowNewProject] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const refresh = useCallback(() => setRefreshKey((k) => k + 1), []);

  const navigate = (view: string, projectId?: string) => {
    setActiveView(view);
    if (projectId) setActiveProjectId(projectId);
    else if (view !== "project") setActiveProjectId(null);
  };

  const handleCreateProject = async (data: Record<string, string>) => {
    const res = await fetch("/api/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    const project = await res.json();
    refresh();
    navigate("project", project.id);
  };

  return (
    <div className="flex h-screen overflow-hidden bg-[#0a0a1a]">
      <Sidebar
        activeView={activeView}
        activeProjectId={activeProjectId}
        onNavigate={navigate}
        onNewProject={() => setShowNewProject(true)}
        refreshKey={refreshKey}
      />

      <main className="flex-1 overflow-auto bg-[#0a0a1a]">
        {activeView === "dashboard" && (
          <Dashboard
            onSelectProject={(id) => navigate("project", id)}
            onNewProject={() => setShowNewProject(true)}
            refreshKey={refreshKey}
          />
        )}
        {activeView === "project" && activeProjectId && (
          <ProjectView
            projectId={activeProjectId}
            onRefresh={refresh}
            onDelete={() => { setActiveProjectId(null); setActiveView("dashboard"); refresh(); }}
          />
        )}
        {activeView === "arena" && <AgentArena />}
        {activeView === "agent" && <AgentChat />}
      </main>

      <NewProjectForm
        open={showNewProject}
        onClose={() => setShowNewProject(false)}
        onSubmit={handleCreateProject}
      />
    </div>
  );
}
