import { spawn } from "child_process";
import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

const BUILTIN_PROMPTS: Record<string, string> = {
  scout: "You are Scout, a literature research specialist. You focus on papers, trends, and research gaps.",
  theorist: "You are Theorist, a hypothesis generation specialist. You formulate and evaluate testable hypotheses.",
  architect: "You are Architect, an experiment design specialist. You design experiments, baselines, and ablation studies.",
  coder: "You are Coder, an implementation specialist. You focus on code architecture, libraries, and technical implementation.",
  datasmith: "You are Data Smith, a dataset engineering specialist. You focus on data collection, preprocessing, and validation.",
  documenter: "You are Documenter, the documentation specialist. You track what needs to be recorded, ensure nothing important is missed, and suggest how to organize project documentation.",
  commander: "You are Commander, the mission coordinator. You synthesize everyone's input and suggest priorities.",
};

function runClaude(prompt: string, signal?: AbortSignal): Promise<string> {
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
    child.stdout.on("data", (d: Buffer) => { stdout += d.toString(); });
    child.stderr.on("data", (d: Buffer) => { stderr += d.toString(); });
    child.on("close", (code: number | null) => {
      if (code === 0) finish(resolve, stdout.trim());
      else finish(reject, new Error(stderr || `claude exited with code ${code}`));
    });
    child.on("error", (e) => finish(reject, e));
    // Timeout: kill after 60s
    const timer = setTimeout(() => {
      child.kill("SIGKILL");
      finish(reject, new Error("Agent timed out after 60s"));
    }, 60000);
    child.on("close", () => clearTimeout(timer));
    // Abort if client disconnects
    if (signal) {
      signal.addEventListener("abort", () => {
        child.kill("SIGKILL");
        finish(reject, new Error("Aborted"));
      });
    }
  });
}

// GET: list meetings
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const meetings = await prisma.meeting.findMany({
    where: { projectId: id },
    include: { messages: { orderBy: { createdAt: "asc" } } },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(meetings);
}

// POST: start a new meeting (streams agent responses via SSE)
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: projectId } = await params;
  const { topic, agents: agentKeys, rounds = 1 } = await req.json();

  // Gather project context
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: {
      hypotheses: true,
      datasets: true,
      experiments: { include: { results: true } },
      pipelineTasks: { where: { status: "done" } },
      customAgents: true,
    },
  });

  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  const projectContext = `Project: ${project.name}
Problem: ${project.problem || "Not defined"}
Description: ${project.description || "N/A"}
Success Criteria: ${project.successCriteria || "Not defined"}
Approach: ${project.approach || "Not defined"}
Hypotheses: ${project.hypotheses.map((h) => `${h.title} (${h.status})`).join(", ") || "None"}
Datasets: ${project.datasets.map((d) => d.name).join(", ") || "None"}
Experiments: ${project.experiments.map((e) => `${e.name} (${e.status})`).join(", ") || "None"}`;

  // Resolve agent info (built-in + custom)
  const agentInfo: { key: string; name: string; color: string; systemPrompt: string }[] = [];
  for (const key of agentKeys as string[]) {
    if (BUILTIN_PROMPTS[key]) {
      const builtinColors: Record<string, string> = {
        scout: "#4cc9f0", theorist: "#fbbf24", architect: "#f472b6",
        coder: "#fb923c", datasmith: "#06b6d4", documenter: "#f59e0b", commander: "#a78bfa",
      };
      agentInfo.push({
        key,
        name: key.charAt(0).toUpperCase() + key.slice(1),
        color: builtinColors[key] || "#6b7280",
        systemPrompt: BUILTIN_PROMPTS[key],
      });
    } else {
      const ca = project.customAgents.find((a) => a.id === key);
      if (ca) {
        agentInfo.push({ key: ca.id, name: ca.name, color: ca.color, systemPrompt: ca.systemPrompt });
      }
    }
  }

  if (agentInfo.length < 2) {
    return NextResponse.json({ error: "Need at least 2 agents" }, { status: 400 });
  }

  // Create meeting in DB
  const meeting = await prisma.meeting.create({
    data: { topic, projectId },
  });

  const encoder = new TextEncoder();
  const { readable, writable } = new TransformStream();
  const writer = writable.getWriter();

  const send = async (event: string, data: Record<string, unknown>) => {
    try {
      await writer.write(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
    } catch { /* stream closed */ }
  };

  // Run meeting in background — don't await
  (async () => {
    try {
      await send("meeting_start", { meetingId: meeting.id, topic, agents: agentInfo.map((a) => ({ key: a.key, name: a.name, color: a.color })) });

      const conversation: { name: string; content: string }[] = [];

      for (let round = 0; round < rounds; round++) {
        if (rounds > 1) {
          await send("system", { text: `--- Round ${round + 1} of ${rounds} ---` });
        }

        for (const agent of agentInfo) {
          await send("agent_thinking", { key: agent.key, name: agent.name, color: agent.color });

          const convText = conversation.length > 0
            ? conversation.map((m) => `[${m.name}]: ${m.content}`).join("\n\n")
            : "(No prior discussion yet)";

          const prompt = `${agent.systemPrompt}

You are in a team meeting to discuss: "${topic}"

Project context:
${projectContext}

Meeting discussion so far:
${convText}

${round > 0 ? `This is round ${round + 1}. Build on the previous discussion and refine ideas.` : ""}

Now it's your turn to contribute. Be concise (2-4 paragraphs). Address specific points raised by others if relevant. Speak naturally as yourself.`;

          const response = await runClaude(prompt);

          const msg = await prisma.meetingMessage.create({
            data: {
              role: agent.key,
              name: agent.name,
              color: agent.color,
              content: response,
              meetingId: meeting.id,
            },
          });

          conversation.push({ name: agent.name, content: response });

          await send("agent_message", {
            id: msg.id,
            key: agent.key,
            name: agent.name,
            color: agent.color,
            content: response,
          });
        }
      }

      await prisma.meeting.update({
        where: { id: meeting.id },
        data: { status: "completed" },
      });
      await send("meeting_end", { meetingId: meeting.id });
    } catch (error) {
      await send("error", { text: `Meeting error: ${error}` });
    } finally {
      try { await writer.close(); } catch { /* already closed */ }
    }
  })();

  return new Response(readable, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
