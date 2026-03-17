import { spawn } from "child_process";
import { prisma } from "@/lib/db";
import { appendAgentProgress } from "@/lib/notion";
import { syncAgentOutput } from "@/lib/agent-sync";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 900;

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
4. List the models/architectures involved

Respond ONLY with JSON (no markdown, no code fences):
{
  "models": [
    {"name": "...", "architecture": "...", "description": "...", "framework": "..."}
  ],
  "experiments": [
    {"name": "...", "hypothesis": "...", "description": "...", "baselines": ["..."], "metrics": ["..."], "resources": "...", "estimated_duration": "..."}
  ],
  "ablations": [{"name": "...", "variable": "...", "description": "..."}],
  "evaluation_plan": "..."
}`,

  coder: `You are the CODER agent - an implementation specialist. You can write code directly to the project's GitHub repository.

If a GitHub repo URL is provided in the context:
1. Clone the repo (or pull if already cloned) to /tmp/lumi-repos/<repo-name>
2. Read existing code to understand the structure
3. Write or update code files based on experiment designs and hypotheses
4. Commit changes with a descriptive message
5. Push to the repo

If no repo URL is provided, just output an implementation plan.

After coding, respond with JSON (no markdown, no code fences):
{
  "implementation_plan": "...",
  "files_modified": ["path/to/file.py"],
  "modules": [{"name": "...", "description": "...", "dependencies": ["..."]}],
  "tech_stack": {"language": "...", "framework": "...", "libraries": ["..."]},
  "challenges": ["..."],
  "commit_message": "...",
  "pushed": true
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

  writer: `You are the WRITER agent - an academic paper writing specialist. You have access to Overleaf MCP tools that let you read and write LaTeX files directly in the project's Overleaf repository.

Your workflow:
1. First call sync_project to pull the latest version from Overleaf
2. Call list_files to see what .tex files exist
3. Read existing files to understand the paper structure
4. Write or update sections based on the project's research findings

Writing guidelines:
- Use proper LaTeX formatting, citations (\\cite{}), and cross-references (\\ref{}, \\label{})
- Write in formal academic style, concise and precise
- Structure content with \\section{}, \\subsection{} as appropriate
- Use edit_file for surgical edits to existing content, rewrite_file for major rewrites
- Use update_section to replace a specific section by its heading title
- Always sync_project before and after making changes

After writing, respond with JSON (no markdown, no code fences):
{
  "files_modified": ["main.tex", "sections/intro.tex"],
  "sections_written": ["Introduction", "Related Work"],
  "summary": "Brief description of what was written/updated",
  "word_count_estimate": 1500,
  "next_steps": ["Write Method section", "Add experiment tables"]
}`,
};

// MCP config for agents that need external tool access
const OVERLEAF_MCP_CONFIG = JSON.stringify({
  mcpServers: {
    overleaf: {
      command: "/Users/shanyang/Documents/overleaf_mcp/.venv/bin/overleaf-mcp",
      args: [],
      env: {
        OVERLEAF_CONFIG_FILE: "/Users/shanyang/Documents/overleaf_mcp/overleaf_config.json",
        OVERLEAF_TEMP_DIR: "/Users/shanyang/Documents/overleaf_mcp/overleaf_cache",
      },
    },
  },
});

const AGENTS_WITH_MCP: Record<string, string> = {
  writer: OVERLEAF_MCP_CONFIG,
};

// Agents that need filesystem/git access (bypassPermissions for non-interactive)
const AGENTS_WITH_TOOLS = new Set(["coder", "writer"]);

function runClaude(prompt: string, options?: { mcpConfig?: string; timeoutMs?: number; bypassPermissions?: boolean }): Promise<string> {
  return new Promise((resolve, reject) => {
    const env = { ...process.env, FORCE_COLOR: "0" };
    delete (env as Record<string, string | undefined>).CLAUDECODE;

    const args = ["-p", prompt];
    if (options?.mcpConfig) {
      args.push("--mcp-config", options.mcpConfig);
    }
    if (options?.bypassPermissions || options?.mcpConfig) {
      args.push("--permission-mode", "bypassPermissions");
    }

    const child = spawn("claude", args, {
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

    const timeout = options?.timeoutMs || 180000;
    const timer = setTimeout(() => {
      child.kill("SIGKILL");
      finish(reject, new Error(`Agent timed out after ${Math.round(timeout / 1000)}s`));
    }, timeout);
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
GitHub Repo: ${project.repoUrl || "Not configured"}
Overleaf Project: ${project.overleafId || "Not configured"}
Completed tasks: ${project.pipelineTasks.map((t) => t.title).join(", ") || "None"}
Hypotheses: ${project.hypotheses.map((h) => `${h.title} (${h.status})`).join(", ") || "None"}
Datasets: ${project.datasets.map((d) => d.name).join(", ") || "None"}
Experiments: ${project.experiments.map((e) => `${e.name} (${e.status})`).join(", ") || "None"}`;
          }
        }

        const mcpConfig = AGENTS_WITH_MCP[role];
        const needsTools = AGENTS_WITH_TOOLS.has(role);
        if (mcpConfig) {
          send("log", { text: `> Calling Claude with MCP tools (${role})...` });
        } else if (needsTools) {
          send("log", { text: `> Calling Claude with tool access (${role})...` });
        } else {
          send("log", { text: `> Calling Claude (using your subscription)...` });
        }

        let tailInstruction = "Please analyze and provide your structured JSON output.";
        if (role === "writer") {
          tailInstruction = "Use the Overleaf MCP tools to read/write the paper. Start by syncing the project, then list files, then write or update content.";
        } else if (role === "coder") {
          tailInstruction = "Use Bash and file tools to clone the repo, write code, commit and push. If no GitHub repo URL is configured, just output a plan.";
        }

        const fullPrompt = `${agentPrompt}\n\n---\n\n${projectContext}\n\nCurrent stage: ${stage || "general"}\nAdditional context: ${JSON.stringify(context || {})}\n\n${tailInstruction}`;

        // Call claude CLI (with MCP/tools access and longer timeout for tool-using agents)
        const rawOutput = await runClaude(fullPrompt, {
          mcpConfig,
          bypassPermissions: needsTools,
          timeoutMs: needsTools ? 600000 : 180000,
        });

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

        // Sync to inventory + blackboard
        if (projectId) {
          send("log", { text: `> Syncing to inventory & blackboard...` });
          const syncActions = await syncAgentOutput(projectId, role, parsed);
          for (const action of syncActions) {
            send("log", { text: `> ${action}` });
          }
        }

        // Append progress to Notion (fire and forget)
        if (projectName) {
          const AGENT_PAGE_TITLES: Record<string, string> = {
            scout: "Literature Survey — Scout",
            theorist: "Hypothesis Generation — Theorist",
            architect: "Experiment Design — Architect",
            coder: "Implementation & Code — Coder",
            datasmith: "Dataset Engineering — Data Smith",
            writer: "Paper Writing — Writer",
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
