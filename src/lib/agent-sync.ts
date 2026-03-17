/**
 * After an agent produces output, sync findings to the project inventory
 * (hypotheses, datasets, models, experiments, papers) and post a summary
 * to the blackboard (BoardNote).
 */
import { prisma } from "@/lib/db";

interface AgentOutput {
  // Scout
  papers?: { title: string; authors?: string; year?: number; key_finding?: string; relevance?: string }[];
  trends?: string[];
  gaps?: string[];
  summary?: string;
  // Theorist
  hypotheses?: { title: string; description?: string; rationale?: string; impact?: string; feasibility?: string }[];
  // Architect
  models?: { name: string; architecture?: string; description?: string; framework?: string }[];
  experiments?: { name: string; hypothesis?: string; description?: string; baselines?: string[]; metrics?: string[]; resources?: string; estimated_duration?: string }[];
  evaluation_plan?: string;
  ablations?: { name: string; variable?: string; description?: string }[];
  // Coder
  implementation_plan?: string;
  modules?: { name: string; description?: string; dependencies?: string[] }[];
  tech_stack?: { language?: string; framework?: string; libraries?: string[] };
  challenges?: string[];
  commit_message?: string;
  pushed?: boolean;
  // Datasmith
  datasets?: { name: string; purpose?: string; size?: string; source?: string; format?: string; collection_strategy?: string }[];
  preprocessing?: string[];
  augmentation?: string[];
  // Commander
  assessment?: string;
  bottlenecks?: string[];
  priorities?: { task: string; reason?: string; urgency?: string }[];
  recommendations?: string[];
  // Writer
  files_modified?: string[];
  sections_written?: string[];
  word_count_estimate?: number;
  next_steps?: string[];
  // Raw fallback
  raw_output?: string;
}

/**
 * Sync agent structured output into the project's inventory and blackboard.
 * Returns a short summary of what was created.
 */
export async function syncAgentOutput(
  projectId: string,
  role: string,
  parsed: AgentOutput,
): Promise<string[]> {
  const actions: string[] = [];

  // --- Inventory: Papers (from scout) ---
  if (parsed.papers?.length) {
    for (const p of parsed.papers) {
      const exists = await prisma.paper.findFirst({
        where: { projectId, title: p.title },
      });
      if (!exists) {
        await prisma.paper.create({
          data: {
            title: p.title,
            abstract: [p.key_finding, p.authors && `Authors: ${p.authors}`, p.year && `Year: ${p.year}`].filter(Boolean).join("\n"),
            status: "reference",
            projectId,
          },
        });
        actions.push(`+paper: ${p.title}`);
      }
    }
  }

  // --- Inventory: Hypotheses (from theorist) ---
  if (parsed.hypotheses?.length) {
    for (const h of parsed.hypotheses) {
      const exists = await prisma.hypothesis.findFirst({
        where: { projectId, title: h.title },
      });
      if (!exists) {
        await prisma.hypothesis.create({
          data: {
            title: h.title,
            description: [h.description, h.rationale && `Rationale: ${h.rationale}`].filter(Boolean).join("\n"),
            status: "proposed",
            confidence: h.impact === "high" ? 0.8 : h.impact === "medium" ? 0.5 : 0.3,
            projectId,
          },
        });
        actions.push(`+hypothesis: ${h.title}`);
      }
    }
  }

  // --- Inventory: Models (from architect) ---
  if (parsed.models?.length) {
    for (const m of parsed.models) {
      const exists = await prisma.model.findFirst({
        where: { projectId, name: m.name },
      });
      if (!exists) {
        await prisma.model.create({
          data: {
            name: m.name,
            description: m.description || null,
            architecture: m.architecture || null,
            framework: m.framework || null,
            projectId,
          },
        });
        actions.push(`+model: ${m.name}`);
      }
    }
  }

  // --- Inventory: Datasets (from datasmith) ---
  if (parsed.datasets?.length) {
    for (const d of parsed.datasets) {
      const exists = await prisma.dataset.findFirst({
        where: { projectId, name: d.name },
      });
      if (!exists) {
        await prisma.dataset.create({
          data: {
            name: d.name,
            description: [d.collection_strategy, d.purpose && `Purpose: ${d.purpose}`].filter(Boolean).join("\n") || null,
            source: d.source || null,
            size: d.size || null,
            format: d.format || null,
            projectId,
          },
        });
        actions.push(`+dataset: ${d.name}`);
      }
    }
  }

  // --- Inventory: Experiments (from architect) ---
  if (parsed.experiments?.length) {
    for (const e of parsed.experiments) {
      const exists = await prisma.experiment.findFirst({
        where: { projectId, name: e.name },
      });
      if (!exists) {
        await prisma.experiment.create({
          data: {
            name: e.name,
            description: [
              e.description,
              e.baselines?.length && `Baselines: ${e.baselines.join(", ")}`,
              e.metrics?.length && `Metrics: ${e.metrics.join(", ")}`,
              e.resources && `Resources: ${e.resources}`,
              e.estimated_duration && `Duration: ${e.estimated_duration}`,
            ].filter(Boolean).join("\n") || null,
            status: "planned",
            projectId,
          },
        });
        actions.push(`+experiment: ${e.name}`);
      }
    }
  }

  // --- Blackboard memo ---
  const memoLines: string[] = [];
  const timestamp = new Date().toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });

  if (parsed.summary) memoLines.push(parsed.summary);
  if (parsed.trends?.length) memoLines.push(`Trends: ${parsed.trends.join("; ")}`);
  if (parsed.gaps?.length) memoLines.push(`Gaps: ${parsed.gaps.join("; ")}`);
  if (parsed.evaluation_plan) memoLines.push(`Eval plan: ${parsed.evaluation_plan}`);
  if (parsed.implementation_plan) memoLines.push(`Impl plan: ${parsed.implementation_plan}`);
  if (parsed.tech_stack) {
    const ts = parsed.tech_stack;
    memoLines.push(`Stack: ${[ts.language, ts.framework, ts.libraries?.join(", ")].filter(Boolean).join(" / ")}`);
  }
  if (parsed.challenges?.length) memoLines.push(`Challenges: ${parsed.challenges.join("; ")}`);
  if (parsed.preprocessing?.length) memoLines.push(`Preprocessing: ${parsed.preprocessing.join(" → ")}`);
  if (parsed.assessment) memoLines.push(parsed.assessment);
  if (parsed.bottlenecks?.length) memoLines.push(`Bottlenecks: ${parsed.bottlenecks.join("; ")}`);
  if (parsed.priorities?.length) memoLines.push(`Priorities: ${parsed.priorities.map((p) => `${p.task} (${p.urgency || "?"})`).join("; ")}`);
  if (parsed.recommendations?.length) memoLines.push(`Recommendations: ${parsed.recommendations.join("; ")}`);
  if (parsed.commit_message) memoLines.push(`Git commit: ${parsed.commit_message}`);
  if (parsed.pushed) memoLines.push(`Pushed to GitHub`);
  if (parsed.files_modified?.length) memoLines.push(`Files modified: ${parsed.files_modified.join(", ")}`);
  if (parsed.sections_written?.length) memoLines.push(`Sections written: ${parsed.sections_written.join(", ")}`);
  if (parsed.word_count_estimate) memoLines.push(`~${parsed.word_count_estimate} words`);
  if (parsed.next_steps?.length) memoLines.push(`Next steps: ${parsed.next_steps.join("; ")}`);
  if (actions.length) memoLines.push(`\nInventory updated:\n${actions.join("\n")}`);
  if (parsed.raw_output) memoLines.push(parsed.raw_output.slice(0, 500));

  if (memoLines.length > 0) {
    await prisma.boardNote.create({
      data: {
        title: `${role.toUpperCase()} report — ${timestamp}`,
        content: memoLines.join("\n\n"),
        category: "general",
        pinned: false,
        projectId,
      },
    });
    actions.push("blackboard updated");
  }

  return actions;
}

/**
 * After a meeting ends, post a combined summary to the blackboard
 * and extract any structured data from the conversation.
 */
export async function syncMeetingOutput(
  projectId: string,
  topic: string,
  conversation: { name: string; content: string }[],
): Promise<string[]> {
  const actions: string[] = [];
  const timestamp = new Date().toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });

  // Post meeting summary to blackboard
  const summaryLines = conversation.map((m) => `**${m.name}:** ${m.content.slice(0, 400)}`);
  await prisma.boardNote.create({
    data: {
      title: `Meeting: ${topic} — ${timestamp}`,
      content: summaryLines.join("\n\n"),
      category: "general",
      pinned: false,
      projectId,
    },
  });
  actions.push("blackboard: meeting summary");

  // Try to extract structured items from each agent's response
  for (const msg of conversation) {
    try {
      const jsonMatch = msg.content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        const sub = await syncAgentOutput(projectId, msg.name.toLowerCase(), parsed);
        actions.push(...sub.filter((a) => a !== "blackboard updated"));
      }
    } catch {
      // Meeting messages are usually free-text, not JSON — that's fine
    }
  }

  return actions;
}
