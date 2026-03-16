import { prisma } from "@/lib/db";
import { getNotionClient, markdownToBlocks } from "@/lib/notion";
import { NextResponse } from "next/server";
import { PIPELINE_STAGES } from "@/lib/pipeline";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

function formatDate(d: Date | string): string {
  return new Date(d).toLocaleString("en-US", {
    year: "numeric", month: "short", day: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

function buildProjectMarkdown(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  project: any,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  tasks: any[],
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  notes: any[],
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  meetings: any[],
): string {
  const lines: string[] = [];

  lines.push(`Last synced: ${formatDate(new Date())}`);
  lines.push(`Status: ${project.status} | Stage: ${project.currentStage}`);
  lines.push("");

  // Overview
  lines.push("## Overview");
  if (project.problem) lines.push(`**Problem:** ${project.problem}`);
  if (project.description) lines.push(`**Description:** ${project.description}`);
  if (project.motivation) lines.push(`**Motivation:** ${project.motivation}`);
  if (project.approach) lines.push(`**Approach:** ${project.approach}`);
  if (project.successCriteria) lines.push(`**Success Criteria:** ${project.successCriteria}`);
  if (project.timeline) lines.push(`**Timeline:** ${project.timeline}`);
  lines.push("");

  // Pipeline Progress
  lines.push("## Pipeline Progress");
  for (const stage of PIPELINE_STAGES) {
    const stageTasks = tasks.filter((t) => t.stage === stage.id);
    const done = stageTasks.filter((t) => t.status === "done").length;
    const pct = stageTasks.length > 0 ? Math.round((done / stageTasks.length) * 100) : 0;
    lines.push(`- ${stage.label}: ${pct}% (${done}/${stageTasks.length} tasks)`);
    for (const t of stageTasks) {
      const icon = t.status === "done" ? "[x]" : t.status === "active" ? "[~]" : "[ ]";
      lines.push(`  - ${icon} ${t.title}${t.output ? " - " + t.output.slice(0, 100) : ""}`);
    }
  }
  lines.push("");

  // Hypotheses
  if (project.hypotheses.length > 0) {
    lines.push("## Hypotheses");
    for (const h of project.hypotheses) {
      lines.push(`### ${h.title} (${h.status})`);
      lines.push(h.description);
      if (h.confidence != null) lines.push(`Confidence: ${Math.round(h.confidence * 100)}%`);
      lines.push("");
    }
  }

  // Datasets
  if (project.datasets.length > 0) {
    lines.push("## Datasets");
    for (const d of project.datasets) {
      lines.push(`- **${d.name}**${d.source ? ` (${d.source})` : ""}${d.size ? ` - ${d.size}` : ""}${d.format ? ` [${d.format}]` : ""}`);
      if (d.description) lines.push(`  ${d.description}`);
    }
    lines.push("");
  }

  // Models
  if (project.models.length > 0) {
    lines.push("## Models");
    for (const m of project.models) {
      lines.push(`- **${m.name}**${m.architecture ? ` (${m.architecture})` : ""}${m.framework ? ` - ${m.framework}` : ""}`);
      if (m.description) lines.push(`  ${m.description}`);
    }
    lines.push("");
  }

  // Experiments & Results
  if (project.experiments.length > 0) {
    lines.push("## Experiments");
    for (const e of project.experiments) {
      lines.push(`### ${e.name} (${e.status})`);
      if (e.description) lines.push(e.description);
      if (e.hypothesis) lines.push(`Hypothesis: ${e.hypothesis.title}`);
      if (e.results && e.results.length > 0) {
        lines.push("**Results:**");
        for (const r of e.results) {
          lines.push(`- ${r.name} (${r.status})${r.metrics ? `: ${r.metrics}` : ""}`);
          if (r.notes) lines.push(`  ${r.notes}`);
        }
      }
      lines.push("");
    }
  }

  // Papers
  if (project.papers.length > 0) {
    lines.push("## Papers");
    for (const p of project.papers) {
      lines.push(`- **${p.title}** (${p.status})${p.venue ? ` - ${p.venue}` : ""}`);
      if (p.abstract) lines.push(`  ${p.abstract.slice(0, 200)}`);
    }
    lines.push("");
  }

  // Board Notes
  if (notes.length > 0) {
    lines.push("## Board Notes");
    const cats = ["machine", "dataset", "cloud", "credentials", "general"];
    for (const cat of cats) {
      const catNotes = notes.filter((n) => n.category === cat);
      if (catNotes.length === 0) continue;
      lines.push(`### ${cat.charAt(0).toUpperCase() + cat.slice(1)}`);
      for (const n of catNotes) {
        lines.push(`- **${n.title}**${n.pinned ? " (pinned)" : ""}`);
        lines.push(`  ${n.content}`);
      }
      lines.push("");
    }
  }

  // Recent Meetings
  if (meetings.length > 0) {
    lines.push("## Recent Meetings");
    const recent = meetings.slice(0, 5);
    for (const m of recent) {
      lines.push(`### ${m.topic} (${formatDate(m.createdAt)})`);
      lines.push(`Status: ${m.status}`);
      if (m.messages && m.messages.length > 0) {
        for (const msg of m.messages) {
          lines.push(`**${msg.name}:** ${msg.content.slice(0, 300)}`);
        }
      }
      lines.push("");
    }
  }

  // Custom Agents
  if (project.customAgents && project.customAgents.length > 0) {
    lines.push("## Custom Agents");
    for (const a of project.customAgents) {
      lines.push(`- **${a.name}** (${a.title}): ${a.description}`);
    }
    lines.push("");
  }

  return lines.join("\n");
}

// POST: sync project documentation to Notion
export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: projectId } = await params;

  const notion = getNotionClient();
  if (!notion) {
    return NextResponse.json(
      { error: "NOTION_API_KEY not configured" },
      { status: 500 }
    );
  }

  const parentPageId = process.env.NOTION_DOC_PAGE_ID;
  if (!parentPageId) {
    return NextResponse.json(
      { error: "NOTION_DOC_PAGE_ID not configured" },
      { status: 500 }
    );
  }

  // Load full project data
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: {
      hypotheses: true,
      datasets: true,
      models: true,
      experiments: { include: { results: true, hypothesis: true } },
      papers: true,
      customAgents: true,
    },
  });

  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  const tasks = await prisma.pipelineTask.findMany({
    where: { projectId },
    orderBy: [{ stage: "asc" }, { order: "asc" }],
  });

  const notes = await prisma.boardNote.findMany({
    where: { projectId },
    orderBy: { createdAt: "desc" },
  });

  const meetings = await prisma.meeting.findMany({
    where: { projectId },
    include: { messages: { orderBy: { createdAt: "asc" } } },
    orderBy: { createdAt: "desc" },
    take: 5,
  });

  const markdown = buildProjectMarkdown(project, tasks, notes, meetings);
  const blocks = markdownToBlocks(markdown);
  const searchTitle = `[Lumi] ${project.name}`;

  try {
    // Search for existing page
    const search = await notion.search({
      query: searchTitle,
      filter: { property: "object", value: "page" },
      page_size: 5,
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let pageId: string | null = null;
    for (const result of search.results) {
      if (result.object === "page" && "properties" in result) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const titleProp = (result.properties as any).title;
        if (titleProp?.title?.[0]?.plain_text === searchTitle) {
          pageId = result.id;
          break;
        }
      }
    }

    if (pageId) {
      // Delete existing content blocks but preserve agent sub-pages
      const existingBlocks = await notion.blocks.children.list({ block_id: pageId, page_size: 100 });
      for (const block of existingBlocks.results) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        if ((block as any).type === "child_page") continue;
        await notion.blocks.delete({ block_id: block.id });
      }

      for (let i = 0; i < blocks.length; i += 100) {
        await notion.blocks.children.append({
          block_id: pageId,
          children: blocks.slice(i, i + 100),
        });
      }

      return NextResponse.json({ ok: true, pageId, action: "updated" });
    } else {
      // Create new page
      const page = await notion.pages.create({
        parent: { page_id: parentPageId },
        properties: {
          title: { title: [{ text: { content: searchTitle } }] },
        },
        children: blocks.slice(0, 100),
      });

      for (let i = 100; i < blocks.length; i += 100) {
        await notion.blocks.children.append({
          block_id: page.id,
          children: blocks.slice(i, i + 100),
        });
      }

      return NextResponse.json({ ok: true, pageId: page.id, action: "created" });
    }
  } catch (error) {
    console.error("Notion sync error:", error);
    return NextResponse.json(
      { error: `Notion sync failed: ${error}` },
      { status: 500 }
    );
  }
}
