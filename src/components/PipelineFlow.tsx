"use client";

import { useMemo, useCallback } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  Node,
  Edge,
  Position,
  useNodesState,
  useEdgesState,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

interface ProjectData {
  hypotheses: Array<{ id: string; title: string; status: string }>;
  datasets: Array<{ id: string; name: string }>;
  models: Array<{ id: string; name: string }>;
  experiments: Array<{
    id: string;
    name: string;
    status: string;
    hypothesisId: string | null;
    datasets: Array<{ dataset: { id: string } }>;
    models: Array<{ model: { id: string } }>;
    results: Array<{ id: string; name: string; status: string }>;
  }>;
  papers: Array<{
    id: string;
    title: string;
    status: string;
    hypotheses: Array<{ hypothesis: { id: string } }>;
    results: Array<{ result: { id: string } }>;
  }>;
}

const STATUS_NODE_COLORS: Record<string, string> = {
  proposed: "#e9d5ff",
  testing: "#fed7aa",
  supported: "#bbf7d0",
  refuted: "#fecaca",
  planned: "#e2e8f0",
  running: "#fef08a",
  completed: "#bbf7d0",
  failed: "#fecaca",
  preliminary: "#fef9c3",
  validated: "#a7f3d0",
  published: "#bfdbfe",
  idea: "#ede9fe",
  drafting: "#fed7aa",
  review: "#cffafe",
  submitted: "#99f6e4",
};

export function PipelineFlow({ project }: { project: ProjectData }) {
  const { initialNodes, initialEdges } = useMemo(() => {
    const nodes: Node[] = [];
    const edges: Edge[] = [];
    const colWidth = 220;
    const rowHeight = 80;

    const cols = [
      { items: project.hypotheses, type: "hypothesis", label: (i: { title?: string; name?: string }) => i.title || i.name || "" },
      { items: project.datasets, type: "dataset", label: (i: { title?: string; name?: string }) => i.name || "" },
      { items: project.models, type: "model", label: (i: { title?: string; name?: string }) => i.name || "" },
      { items: project.experiments, type: "experiment", label: (i: { title?: string; name?: string }) => i.name || "" },
      {
        items: project.experiments.flatMap((e) => e.results),
        type: "result",
        label: (i: { title?: string; name?: string }) => i.name || "",
      },
      { items: project.papers, type: "paper", label: (i: { title?: string; name?: string }) => i.title || "" },
    ];

    const colLabels = ["Hypotheses", "Datasets", "Models", "Experiments", "Results", "Papers"];

    colLabels.forEach((label, colIdx) => {
      nodes.push({
        id: `header-${colIdx}`,
        position: { x: colIdx * colWidth + 20, y: 0 },
        data: { label },
        type: "default",
        style: {
          background: "#f1f5f9",
          border: "1px solid #cbd5e1",
          borderRadius: 8,
          fontWeight: 600,
          fontSize: 12,
          width: 180,
          textAlign: "center" as const,
        },
        draggable: false,
        selectable: false,
        sourcePosition: Position.Right,
        targetPosition: Position.Left,
      });
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    cols.forEach((col, colIdx) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      col.items.forEach((item: any, rowIdx: number) => {
        const nodeId = `${col.type}-${item.id}`;
        nodes.push({
          id: nodeId,
          position: { x: colIdx * colWidth + 20, y: (rowIdx + 1) * rowHeight + 20 },
          data: { label: col.label(item) },
          sourcePosition: Position.Right,
          targetPosition: Position.Left,
          style: {
            background: STATUS_NODE_COLORS[item.status] || "#f8fafc",
            border: "1px solid #d1d5db",
            borderRadius: 8,
            fontSize: 11,
            width: 180,
            padding: "6px 10px",
          },
        });
      });
    });

    // Edges: hypothesis -> experiment
    project.experiments.forEach((exp) => {
      if (exp.hypothesisId) {
        edges.push({
          id: `h-e-${exp.hypothesisId}-${exp.id}`,
          source: `hypothesis-${exp.hypothesisId}`,
          target: `experiment-${exp.id}`,
          animated: exp.status === "running",
          style: { stroke: "#6366f1" },
        });
      }
      // dataset -> experiment
      exp.datasets.forEach((d) => {
        edges.push({
          id: `d-e-${d.dataset.id}-${exp.id}`,
          source: `dataset-${d.dataset.id}`,
          target: `experiment-${exp.id}`,
          style: { stroke: "#3b82f6" },
        });
      });
      // model -> experiment
      exp.models.forEach((m) => {
        edges.push({
          id: `m-e-${m.model.id}-${exp.id}`,
          source: `model-${m.model.id}`,
          target: `experiment-${exp.id}`,
          style: { stroke: "#ec4899" },
        });
      });
      // experiment -> results
      exp.results.forEach((r) => {
        edges.push({
          id: `e-r-${exp.id}-${r.id}`,
          source: `experiment-${exp.id}`,
          target: `result-${r.id}`,
          style: { stroke: "#10b981" },
        });
      });
    });

    // results/hypotheses -> papers
    project.papers.forEach((paper) => {
      paper.hypotheses?.forEach((h) => {
        edges.push({
          id: `h-p-${h.hypothesis.id}-${paper.id}`,
          source: `hypothesis-${h.hypothesis.id}`,
          target: `paper-${paper.id}`,
          style: { stroke: "#f59e0b", strokeDasharray: "5,5" },
        });
      });
      paper.results?.forEach((r) => {
        edges.push({
          id: `r-p-${r.result.id}-${paper.id}`,
          source: `result-${r.result.id}`,
          target: `paper-${paper.id}`,
          style: { stroke: "#f59e0b" },
        });
      });
    });

    return { initialNodes: nodes, initialEdges: edges };
  }, [project]);

  const [nodes, , onNodesChange] = useNodesState(initialNodes);
  const [edgesState, , onEdgesChange] = useEdgesState(initialEdges);

  const onInit = useCallback(() => {}, []);

  if (initialNodes.length <= 6) {
    return (
      <div className="h-[400px] flex items-center justify-center text-muted-foreground border rounded-lg">
        Add hypotheses, datasets, models, and experiments to see the pipeline flow.
      </div>
    );
  }

  return (
    <div className="h-[500px] border rounded-lg overflow-hidden">
      <ReactFlow
        nodes={nodes}
        edges={edgesState}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onInit={onInit}
        fitView
        attributionPosition="bottom-left"
      >
        <Background />
        <Controls />
      </ReactFlow>
    </div>
  );
}
