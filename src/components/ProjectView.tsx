"use client";

import { useState, useEffect, useCallback } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { STATUS_COLORS } from "@/lib/types";
import { PipelineFlow } from "./PipelineFlow";
import { EntityTable } from "./EntityTable";
import { CreateDialog } from "./CreateDialog";
import {
  Lightbulb,
  Database,
  Brain,
  FlaskConical,
  BarChart3,
  FileText,
  Plus,
  GitBranch,
} from "lucide-react";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ProjectData = any;

export function ProjectView({
  projectId,
  onRefresh,
}: {
  projectId: string;
  onRefresh: () => void;
}) {
  const [project, setProject] = useState<ProjectData>(null);
  const [createType, setCreateType] = useState<string | null>(null);

  const loadProject = useCallback(() => {
    fetch(`/api/projects/${projectId}`)
      .then((r) => r.json())
      .then(setProject);
  }, [projectId]);

  useEffect(() => {
    loadProject();
  }, [loadProject]);

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
    return <div className="p-6 text-muted-foreground">Loading...</div>;
  }

  const statusOptions = (statuses: readonly string[]) =>
    statuses.map((s) => ({ value: s, label: s }));

  const stats = [
    { label: "Hypotheses", count: project.hypotheses.length, icon: Lightbulb, color: "text-amber-600" },
    { label: "Datasets", count: project.datasets.length, icon: Database, color: "text-blue-600" },
    { label: "Models", count: project.models.length, icon: Brain, color: "text-pink-600" },
    { label: "Experiments", count: project.experiments.length, icon: FlaskConical, color: "text-green-600" },
    {
      label: "Results",
      count: project.experiments.reduce(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (sum: number, e: any) => sum + e.results.length,
        0
      ),
      icon: BarChart3,
      color: "text-cyan-600",
    },
    { label: "Papers", count: project.papers.length, icon: FileText, color: "text-orange-600" },
  ];

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h2 className="text-2xl font-bold">{project.name}</h2>
            <Badge className={STATUS_COLORS[project.status]}>{project.status}</Badge>
          </div>
          {project.description && (
            <p className="text-muted-foreground">{project.description}</p>
          )}
        </div>
        <select
          className="border rounded px-2 py-1 text-sm"
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
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-6 gap-3 mb-6">
        {stats.map((s) => (
          <Card key={s.label}>
            <CardContent className="p-3 text-center">
              <s.icon className={`w-5 h-5 mx-auto mb-1 ${s.color}`} />
              <div className="text-xl font-bold">{s.count}</div>
              <div className="text-xs text-muted-foreground">{s.label}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="pipeline">
        <TabsList className="mb-4">
          <TabsTrigger value="pipeline">
            <GitBranch className="w-4 h-4 mr-1" /> Pipeline
          </TabsTrigger>
          <TabsTrigger value="hypotheses">
            <Lightbulb className="w-4 h-4 mr-1" /> Hypotheses
          </TabsTrigger>
          <TabsTrigger value="datasets">
            <Database className="w-4 h-4 mr-1" /> Datasets
          </TabsTrigger>
          <TabsTrigger value="models">
            <Brain className="w-4 h-4 mr-1" /> Models
          </TabsTrigger>
          <TabsTrigger value="experiments">
            <FlaskConical className="w-4 h-4 mr-1" /> Experiments
          </TabsTrigger>
          <TabsTrigger value="papers">
            <FileText className="w-4 h-4 mr-1" /> Papers
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pipeline">
          <PipelineFlow project={project} />
        </TabsContent>

        <TabsContent value="hypotheses">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-semibold">Hypotheses</h3>
            <Button size="sm" onClick={() => setCreateType("hypotheses")}>
              <Plus className="w-4 h-4 mr-1" /> Add Hypothesis
            </Button>
          </div>
          <EntityTable
            entityType="hypotheses"
            columns={[
              { key: "title", label: "Title" },
              { key: "description", label: "Description" },
              { key: "status", label: "Status" },
              {
                key: "confidence",
                label: "Confidence",
                render: (v) => (v != null ? `${Math.round((v as number) * 100)}%` : "-"),
              },
            ]}
            data={project.hypotheses}
            onDelete={(id) => handleDelete("hypotheses", id)}
            onEdit={(id) => {
              const newStatus = prompt("New status (proposed/testing/supported/refuted/revised):");
              if (newStatus) handleStatusChange("hypotheses", id, newStatus);
            }}
          />
        </TabsContent>

        <TabsContent value="datasets">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-semibold">Datasets</h3>
            <Button size="sm" onClick={() => setCreateType("datasets")}>
              <Plus className="w-4 h-4 mr-1" /> Add Dataset
            </Button>
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
              const newName = prompt("New name:");
              if (newName)
                fetch(`/api/entities/datasets/${id}`, {
                  method: "PATCH",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ name: newName }),
                }).then(loadProject);
            }}
          />
        </TabsContent>

        <TabsContent value="models">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-semibold">Models</h3>
            <Button size="sm" onClick={() => setCreateType("models")}>
              <Plus className="w-4 h-4 mr-1" /> Add Model
            </Button>
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
              const newName = prompt("New name:");
              if (newName)
                fetch(`/api/entities/models/${id}`, {
                  method: "PATCH",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ name: newName }),
                }).then(loadProject);
            }}
          />
        </TabsContent>

        <TabsContent value="experiments">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-semibold">Experiments</h3>
            <Button size="sm" onClick={() => setCreateType("experiments")}>
              <Plus className="w-4 h-4 mr-1" /> Add Experiment
            </Button>
          </div>
          <EntityTable
            entityType="experiments"
            columns={[
              { key: "name", label: "Name" },
              {
                key: "hypothesis",
                label: "Hypothesis",
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                render: (_v, row: any) => row.hypothesis?.title || "-",
              },
              { key: "status", label: "Status" },
              {
                key: "results",
                label: "Results",
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                render: (_v, row: any) => `${row.results?.length || 0} results`,
              },
            ]}
            data={project.experiments}
            onDelete={(id) => handleDelete("experiments", id)}
            onEdit={(id) => {
              const newStatus = prompt("New status (planned/running/completed/failed):");
              if (newStatus) handleStatusChange("experiments", id, newStatus);
            }}
          />

          {/* Quick add result */}
          {project.experiments.length > 0 && (
            <div className="mt-4">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setCreateType("results")}
              >
                <Plus className="w-4 h-4 mr-1" /> Add Result to Experiment
              </Button>
            </div>
          )}
        </TabsContent>

        <TabsContent value="papers">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-semibold">Papers</h3>
            <Button size="sm" onClick={() => setCreateType("papers")}>
              <Plus className="w-4 h-4 mr-1" /> Add Paper
            </Button>
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
              const newStatus = prompt("New status (idea/drafting/review/submitted/published):");
              if (newStatus) handleStatusChange("papers", id, newStatus);
            }}
          />
        </TabsContent>
      </Tabs>

      {/* Create Dialogs */}
      <CreateDialog
        open={createType === "hypotheses"}
        onClose={() => setCreateType(null)}
        title="New Hypothesis"
        fields={[
          { name: "title", label: "Title", type: "text", required: true },
          { name: "description", label: "Description", type: "textarea", required: true },
          {
            name: "status",
            label: "Status",
            type: "select",
            options: statusOptions(["proposed", "testing", "supported", "refuted", "revised"]),
          },
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
          { name: "source", label: "Source (URL/path)", type: "text" },
          { name: "size", label: "Size (e.g., 10k samples)", type: "text" },
          { name: "format", label: "Format (e.g., CSV, JSON)", type: "text" },
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
          { name: "architecture", label: "Architecture", type: "text", placeholder: "e.g., Transformer, CNN" },
          { name: "framework", label: "Framework", type: "text", placeholder: "e.g., PyTorch, JAX" },
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
          {
            name: "hypothesisId",
            label: "Hypothesis",
            type: "select",
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            options: project.hypotheses.map((h: any) => ({ value: h.id, label: h.title })),
          },
          {
            name: "datasetIds",
            label: "Datasets",
            type: "multiselect",
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            options: project.datasets.map((d: any) => ({ value: d.id, label: d.name })),
          },
          {
            name: "modelIds",
            label: "Models",
            type: "multiselect",
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            options: project.models.map((m: any) => ({ value: m.id, label: m.name })),
          },
        ]}
        onSubmit={(data) => handleCreate("experiments", data)}
      />

      <CreateDialog
        open={createType === "results"}
        onClose={() => setCreateType(null)}
        title="New Result"
        fields={[
          { name: "name", label: "Name", type: "text", required: true },
          {
            name: "experimentId",
            label: "Experiment",
            type: "select",
            required: true,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            options: project.experiments.map((e: any) => ({ value: e.id, label: e.name })),
          },
          { name: "notes", label: "Notes", type: "textarea" },
          {
            name: "status",
            label: "Status",
            type: "select",
            options: statusOptions(["preliminary", "validated", "published"]),
          },
        ]}
        onSubmit={(data) => handleCreate("results", data)}
      />

      <CreateDialog
        open={createType === "papers"}
        onClose={() => setCreateType(null)}
        title="New Paper"
        fields={[
          { name: "title", label: "Title", type: "text", required: true },
          { name: "abstract", label: "Abstract", type: "textarea" },
          {
            name: "status",
            label: "Status",
            type: "select",
            options: statusOptions(["idea", "drafting", "review", "submitted", "published"]),
          },
          { name: "venue", label: "Venue", type: "text", placeholder: "e.g., NeurIPS 2026" },
          { name: "url", label: "URL", type: "text" },
          {
            name: "hypothesisIds",
            label: "Related Hypotheses",
            type: "multiselect",
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            options: project.hypotheses.map((h: any) => ({ value: h.id, label: h.title })),
          },
        ]}
        onSubmit={(data) => handleCreate("papers", data)}
      />
    </div>
  );
}
