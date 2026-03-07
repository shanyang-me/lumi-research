"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { STATUS_COLORS } from "@/lib/types";
import {
  FolderOpen,
  Lightbulb,
  Database,
  Brain,
  FlaskConical,
  BarChart3,
  FileText,
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

  const statCards = [
    { label: "Projects", value: projects.length, icon: FolderOpen, color: "text-violet-600" },
    { label: "Hypotheses", value: totalStats.hypotheses, icon: Lightbulb, color: "text-amber-600" },
    { label: "Datasets", value: totalStats.datasets, icon: Database, color: "text-blue-600" },
    { label: "Models", value: totalStats.models, icon: Brain, color: "text-pink-600" },
    { label: "Experiments", value: totalStats.experiments, icon: FlaskConical, color: "text-green-600" },
    { label: "Papers", value: totalStats.papers, icon: FileText, color: "text-orange-600" },
  ];

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h2 className="text-2xl font-bold mb-6">Dashboard</h2>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
        {statCards.map((stat) => (
          <Card key={stat.label}>
            <CardContent className="p-4 text-center">
              <stat.icon className={`w-6 h-6 mx-auto mb-2 ${stat.color}`} />
              <div className="text-2xl font-bold">{stat.value}</div>
              <div className="text-xs text-muted-foreground">{stat.label}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <h3 className="text-lg font-semibold mb-4">All Projects</h3>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {projects.map((project) => (
          <Card
            key={project.id}
            className="cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => onSelectProject(project.id)}
          >
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between">
                <CardTitle className="text-base">{project.name}</CardTitle>
                <Badge className={STATUS_COLORS[project.status]}>{project.status}</Badge>
              </div>
            </CardHeader>
            <CardContent>
              {project.description && (
                <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                  {project.description}
                </p>
              )}
              <div className="flex gap-3 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Lightbulb className="w-3 h-3" /> {project._count.hypotheses}
                </span>
                <span className="flex items-center gap-1">
                  <FlaskConical className="w-3 h-3" /> {project._count.experiments}
                </span>
                <span className="flex items-center gap-1">
                  <BarChart3 className="w-3 h-3" /> {project._count.papers}
                </span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {projects.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          <FolderOpen className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>No projects yet. Create your first research project to get started.</p>
        </div>
      )}
    </div>
  );
}
