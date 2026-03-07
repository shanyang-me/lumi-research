"use client";

import { useState, useCallback } from "react";
import { Sidebar } from "@/components/Sidebar";
import { Dashboard } from "@/components/Dashboard";
import { ProjectView } from "@/components/ProjectView";
import { AgentChat } from "@/components/AgentChat";
import { CreateDialog } from "@/components/CreateDialog";

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

  const handleCreateProject = async (data: Record<string, string | string[]>) => {
    await fetch("/api/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    refresh();
  };

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar
        activeView={activeView}
        activeProjectId={activeProjectId}
        onNavigate={navigate}
        onNewProject={() => setShowNewProject(true)}
        refreshKey={refreshKey}
      />

      <main className="flex-1 overflow-auto bg-white">
        {activeView === "dashboard" && (
          <Dashboard
            onSelectProject={(id) => navigate("project", id)}
            refreshKey={refreshKey}
          />
        )}
        {activeView === "project" && activeProjectId && (
          <ProjectView projectId={activeProjectId} onRefresh={refresh} />
        )}
        {activeView === "agent" && <AgentChat />}
      </main>

      <CreateDialog
        open={showNewProject}
        onClose={() => setShowNewProject(false)}
        title="New Research Project"
        fields={[
          { name: "name", label: "Project Name", type: "text", required: true, placeholder: "e.g., World Model Learning" },
          { name: "description", label: "Description", type: "textarea", placeholder: "Brief description of the research project" },
        ]}
        onSubmit={handleCreateProject}
      />
    </div>
  );
}
