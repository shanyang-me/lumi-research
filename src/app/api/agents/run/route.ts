import { spawn } from "child_process";
import { prisma } from "@/lib/db";
import { appendAgentProgress } from "@/lib/notion";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

const AGENT_PROMPTS: Record<string, string> = {
  scout: `You are the SCOUT agent - a literature research specialist. Your job is to:
1. Search for and analyze state-of-the-art papers relevant to the research problem
2. Identify key trends in the field
3. Find research gaps that could be exploited
4. Summarize the most relevant related work

Respond ONLY with JSON (no markdown, no code fences):
{
  "papers": [{"title": "...", "authors": "...", "year": 2024, "key_finding": "...", "relevance": "high|medium"}],
  "trends": ["trend1", "trend2"],
  "gaps": ["gap1", "gap2"],
  "summary": "Overall landscape summary"
}
Include 4-6 papers, 3-4 trends, and 2-3 gaps. Use realistic recent papers.`,

  theorist: `You are the THEORIST agent - a hypothesis generation specialist. Based on the research problem and any survey findings, your job is to:
1. Formulate testable hypotheses
2. Rank them by impact and feasibility
3. Provide rationale for each hypothesis

Respond ONLY with JSON (no markdown, no code fences):
{
  "hypotheses": [
    {"title": "...", "description": "...", "rationale": "...", "test_approach": "...", "impact": "high|medium|low", "feasibility": "high|medium|low"}
  ]
}
Include 3-5 hypotheses ranked by priority.`,

  architect: `You are the ARCHITECT agent - an experiment design specialist. Based on the hypotheses, your job is to:
1. Design concrete experiments to test each hypothesis
2. Define baselines for comparison
3. Specify metrics and evaluation criteria

Respond ONLY with JSON (no markdown, no code fences):
{
  "experiments": [
    {"name": "...", "hypothesis": "...", "description": "...", "baselines": ["..."], "metrics": ["..."], "resources": "...", "estimated_duration": "..."}
  ],
  "ablations": [{"name": "...", "variable": "...", "description": "..."}],
  "evaluation_plan": "..."
}`,

  coder: `You are the CODER agent - an implementation specialist. Based on the experiment designs, your job is to:
1. Create a detailed implementation plan
2. List the key modules/components needed
3. Identify libraries and frameworks to use

Respond ONLY with JSON (no markdown, no code fences):
{
  "implementation_plan": "...",
  "modules": [{"name": "...", "description": "...", "dependencies": ["..."]}],
  "tech_stack": {"language": "...", "framework": "...", "libraries": ["..."]},
  "challenges": ["..."]
}`,

  datasmith: `You are the DATA SMITH agent - a dataset engineering specialist. Based on the experiment requirements, your job is to:
1. Define the datasets needed for training and evaluation
2. Specify data collection or generation strategies
3. Define data preprocessing pipelines

Respond ONLY with JSON (no markdown, no code fences):
{
  "datasets": [
    {"name": "...", "purpose": "train|eval|test", "size": "...", "source": "...", "format": "...", "collection_strategy": "..."}
  ],
  "preprocessing": ["step1", "step2"],
  "augmentation": ["strategy1", "strategy2"],
  "validation_checks": ["check1", "check2"]
}`,

  commander: `You are the COMMANDER agent - the mission coordinator. Your job is to:
1. Assess overall project progress
2. Identify bottlenecks and blockers
3. Suggest next priorities

Respond ONLY with JSON (no markdown, no code fences):
{
  "assessment": "...",
  "bottlenecks": ["..."],
  "priorities": [{"task": "...", "reason": "...", "urgency": "high|medium|low"}],
  "recommendations": ["..."]
}`,

  documenter: `You are the DOCUMENTER agent - a documentation specialist. Your job is to:
1. Review the entire project state and identify what needs documenting
2. Summarize key decisions, findings, and progress
3. Flag any undocumented areas or missing information
4. Suggest documentation improvements

Respond ONLY with JSON (no markdown, no code fences):
{
  "summary": "Current project documentation status",
  "documented": ["well-documented areas"],
  "gaps": ["areas lacking documentation"],
  "suggestions": ["how to improve docs"],
  "changelog": ["recent changes that should be noted"]
}`,
};

function runClaude(prompt: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const env = { ...process.env, FORCE_COLOR: "0" };
    delete (env as Record<string, string | undefined>).CLAUDECODE;
    const child = spawn("claude", ["-p", prompt], {
      env,
      stdio: ["ignore", "pipe", "pipe"],
    });

    let stdout = "";
    let stderr = "";
    let settled = false;
    const finish = (fn: typeof resolve | typeof reject, val: string | Error) => {
      if (settled) return;
      settled = true;
      (fn as (v: string | Error) => void)(val);
    };

    child.stdout.on("data", (data: Buffer) => {
      stdout += data.toString();
    });

    child.stderr.on("data", (data: Buffer) => {
      stderr += data.toString();
    });

    child.on("close", (code: number | null) => {
      clearTimeout(timer);
      if (code === 0) {
        finish(resolve, stdout.trim());
      } else {
        finish(reject, new Error(stderr || `claude exited with code ${code}`));
      }
    });

    child.on("error", (err: Error) => {
      finish(reject, err);
    });

    // Timeout after 60 seconds
    const timer = setTimeout(() => {
      child.kill("SIGKILL");
      finish(reject, new Error("Agent timed out after 60s"));
    }, 60000);
  });
}

function delay(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

export async function POST(req: Request) {
  const { role, projectId, stage, context } = await req.json();

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: string, data: Record<string, unknown>) => {
        controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
      };

      try {
        let agentPrompt = AGENT_PROMPTS[role];

        // Check for custom agent if not a built-in role
        let customAgentName: string | null = null;
        if (!agentPrompt && projectId) {
          const customAgent = await prisma.customAgent.findFirst({
            where: { id: role, projectId },
          });
          if (customAgent) {
            agentPrompt = customAgent.systemPrompt;
            customAgentName = customAgent.name;
          }
        }

        if (!agentPrompt) {
          send("log", { text: `> ERROR: Unknown agent role: ${role}` });
          controller.close();
          return;
        }

        send("log", { text: `> ${(customAgentName || role).toUpperCase()} agent initialized` });
        send("log", { text: `> Analyzing project context...` });

        // Gather project context
        let projectContext = "";
        let projectName = "";
        if (projectId) {
          const project = await prisma.project.findUnique({
            where: { id: projectId },
            include: {
              hypotheses: true,
              datasets: true,
              models: true,
              experiments: { include: { results: true } },
              pipelineTasks: { where: { status: "done" } },
            },
          });
          if (project) {
            projectName = project.name;
            projectContext = `
Project: ${project.name}
Problem: ${project.problem || "Not yet defined"}
Description: ${project.description || "N/A"}
Success Criteria: ${project.successCriteria || "Not yet defined"}
Approach: ${project.approach || "Not yet defined"}
Completed tasks: ${project.pipelineTasks.map((t) => t.title).join(", ") || "None"}
Hypotheses: ${project.hypotheses.map((h) => `${h.title} (${h.status})`).join(", ") || "None"}
Datasets: ${project.datasets.map((d) => d.name).join(", ") || "None"}
Experiments: ${project.experiments.map((e) => `${e.name} (${e.status})`).join(", ") || "None"}`;
          }
        }

        send("log", { text: `> Calling Claude (using your subscription)...` });

        const fullPrompt = `${agentPrompt}\n\n---\n\n${projectContext}\n\nCurrent stage: ${stage || "general"}\nAdditional context: ${JSON.stringify(context || {})}\n\nPlease analyze and provide your structured JSON output.`;

        // Call claude CLI
        const rawOutput = await runClaude(fullPrompt);

        send("log", { text: `> Response received, processing...` });
        await delay(200);

        // Parse JSON from response
        let parsed;
        try {
          const jsonMatch = rawOutput.match(/\{[\s\S]*\}/);
          parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : {};
        } catch {
          // If JSON parsing fails, wrap raw output
          parsed = { raw_output: rawOutput };
          send("log", { text: `> Warning: Could not parse structured output, storing raw` });
        }

        // Stream findings
        const findings = Object.entries(parsed);
        for (const [key, value] of findings) {
          if (key === "raw_output") {
            send("log", { text: `> ${(value as string).slice(0, 300)}` });
            continue;
          }
          if (Array.isArray(value)) {
            for (const item of value) {
              const text = typeof item === "string"
                ? item
                : (item as Record<string, string>).title || (item as Record<string, string>).name || JSON.stringify(item);
              send("log", { text: `> [${key}] ${text}` });
              await delay(150);
            }
          } else if (typeof value === "string") {
            send("log", { text: `> [${key}] ${value.slice(0, 200)}` });
            await delay(150);
          }
        }

        // Mark relevant pipeline tasks as done
        if (projectId && stage) {
          const agentTasks = await prisma.pipelineTask.findMany({
            where: { projectId, stage, agentRole: role, status: { not: "done" } },
          });
          for (const task of agentTasks) {
            await prisma.pipelineTask.update({
              where: { id: task.id },
              data: {
                status: "done",
                output: JSON.stringify(parsed),
              },
            });
            send("task_update", { taskId: task.id, status: "done" });
            send("log", { text: `> Completed: ${task.title}` });
            await delay(100);
          }
        }

        // Log to DB
        await prisma.agentLog.create({
          data: {
            action: `agent:${role}`,
            input: JSON.stringify({ projectId, stage, context }),
            output: JSON.stringify(parsed),
          },
        });

        // Append progress to Notion (fire and forget)
        if (projectName) {
          const AGENT_PAGE_TITLES: Record<string, string> = {
            scout: "Literature Survey — Scout",
            theorist: "Hypothesis Generation — Theorist",
            architect: "Experiment Design — Architect",
            coder: "Implementation Plan — Coder",
            datasmith: "Dataset Engineering — Data Smith",
            documenter: "Documentation — Documenter",
            commander: "Mission Coordination — Commander",
          };
          const agentLabel = AGENT_PAGE_TITLES[role] || (customAgentName ? `Custom Agent — ${customAgentName}` : role);
          send("log", { text: `> Syncing to Notion...` });
          appendAgentProgress(projectName, agentLabel, parsed).catch(() => {});
        }

        send("complete", { role, output: parsed });
      } catch (error) {
        send("log", { text: `> ERROR: ${error}` });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
