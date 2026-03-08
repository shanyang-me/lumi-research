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
  proposed: "#4c1d95",
  testing: "#78350f",
  supported: "#064e3b",
  refuted: "#7f1d1d",
  planned: "#1e293b",
  running: "#713f12",
  completed: "#064e3b",
  failed: "#7f1d1d",
  preliminary: "#713f12",
  validated: "#064e3b",
  published: "#1e3a5f",
  idea: "#3b0764",
  drafting: "#78350f",
  review: "#164e63",
  submitted: "#134e4a",
};

const STATUS_BORDER_COLORS: Record<string, string> = {
  proposed: "#7c3aed",
  testing: "#f59e0b",
  supported: "#10b981",
  refuted: "#ef4444",
  planned: "#475569",
  running: "#f59e0b",
  completed: "#10b981",
  failed: "#ef4444",
  preliminary: "#eab308",
  validated: "#10b981",
  published: "#3b82f6",
  idea: "#8b5cf6",
  drafting: "#f59e0b",
  review: "#06b6d4",
  submitted: "#14b8a6",
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

    const colLabels = ["IDEAS", "DATA", "MODELS", "EXPS", "RESULTS", "PAPERS"];

    colLabels.forEach((label, colIdx) => {
      nodes.push({
        id: `header-${colIdx}`,
        position: { x: colIdx * colWidth + 20, y: 0 },
        data: { label },
        type: "default",
        style: {
          background: "#0f0f23",
          border: "2px solid #374151",
          fontWeight: 700,
          fontSize: 9,
          fontFamily: "var(--font-pixel), monospace",
          letterSpacing: "0.1em",
          width: 180,
          textAlign: "center" as const,
          color: "#a78bfa",
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
            background: STATUS_NODE_COLORS[item.status] || "#111827",
            border: `2px solid ${STATUS_BORDER_COLORS[item.status] || "#374151"}`,
            fontSize: 10,
            width: 180,
            padding: "6px 10px",
            color: "#e5e7eb",
            fontFamily: "var(--font-geist-mono), monospace",
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
          style: { stroke: "#7c3aed" },
        });
      }
      exp.datasets.forEach((d) => {
        edges.push({
          id: `d-e-${d.dataset.id}-${exp.id}`,
          source: `dataset-${d.dataset.id}`,
          target: `experiment-${exp.id}`,
          style: { stroke: "#3b82f6" },
        });
      });
      exp.models.forEach((m) => {
        edges.push({
          id: `m-e-${m.model.id}-${exp.id}`,
          source: `model-${m.model.id}`,
          target: `experiment-${exp.id}`,
          style: { stroke: "#ec4899" },
        });
      });
      exp.results.forEach((r) => {
        edges.push({
          id: `e-r-${exp.id}-${r.id}`,
          source: `experiment-${exp.id}`,
          target: `result-${r.id}`,
          style: { stroke: "#10b981" },
        });
      });
    });

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
      <div className="h-[400px] flex items-center justify-center pixel-border bg-[#111827]">
        <p className="font-pixel text-[8px] text-[#4b5563]">
          ADD ITEMS TO SEE THE QUEST MAP
        </p>
      </div>
    );
  }

  return (
    <div className="h-[500px] pixel-border overflow-hidden bg-[#0a0a1a]">
      <ReactFlow
        nodes={nodes}
        edges={edgesState}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onInit={onInit}
        fitView
        attributionPosition="bottom-left"
        style={{ background: "#0a0a1a" }}
      >
        <Background color="#1f2937" gap={16} size={1} />
        <Controls />
      </ReactFlow>
    </div>
  );
}
