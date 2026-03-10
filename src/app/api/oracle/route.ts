import { NextResponse } from "next/server";
import { ChatAnthropic } from "@langchain/anthropic";
import { StateGraph, Annotation, END, START } from "@langchain/langgraph";
import { HumanMessage, AIMessage, BaseMessage, SystemMessage } from "@langchain/core/messages";
import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { ToolNode } from "@langchain/langgraph/prebuilt";

export const maxDuration = 120;

const AgentState = Annotation.Root({
  messages: Annotation<BaseMessage[]>({
    reducer: (a, b) => [...a, ...b],
    default: () => [],
  }),
});

// ── Project tools ──────────────────────────────────────────────

const getProjectDetails = tool(
  async ({ projectId }) => {
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        hypotheses: true,
        datasets: true,
        models: true,
        experiments: { include: { results: true, hypothesis: true } },
        papers: true,
        pipelineTasks: true,
        customAgents: true,
      },
    });
    if (!project) return "Project not found";
    return JSON.stringify(project, null, 2);
  },
  {
    name: "get_project",
    description: "Get full project details including hypotheses, datasets, models, experiments, papers, pipeline tasks, and custom agents",
    schema: z.object({ projectId: z.string() }),
  }
);

const updateProject = tool(
  async ({ projectId, name, problem, description, approach, successCriteria, status }) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data: Record<string, any> = {};
    if (name !== undefined) data.name = name;
    if (problem !== undefined) data.problem = problem;
    if (description !== undefined) data.description = description;
    if (approach !== undefined) data.approach = approach;
    if (successCriteria !== undefined) data.successCriteria = successCriteria;
    if (status !== undefined) data.status = status;
    const p = await prisma.project.update({ where: { id: projectId }, data });
    return JSON.stringify(p);
  },
  {
    name: "update_project",
    description: "Update project fields (name, problem, description, approach, successCriteria, status)",
    schema: z.object({
      projectId: z.string(),
      name: z.string().optional(),
      problem: z.string().optional(),
      description: z.string().optional(),
      approach: z.string().optional(),
      successCriteria: z.string().optional(),
      status: z.string().optional(),
    }),
  }
);

// ── Entity CRUD tools ──────────────────────────────────────────

const createHypothesis = tool(
  async ({ projectId, title, description }) => {
    const h = await prisma.hypothesis.create({ data: { projectId, title, description } });
    return JSON.stringify(h);
  },
  {
    name: "create_hypothesis",
    description: "Create a new hypothesis",
    schema: z.object({ projectId: z.string(), title: z.string(), description: z.string() }),
  }
);

const updateHypothesis = tool(
  async ({ id, status, confidence }) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data: Record<string, any> = {};
    if (status) data.status = status;
    if (confidence !== undefined) data.confidence = confidence;
    const h = await prisma.hypothesis.update({ where: { id }, data });
    return JSON.stringify(h);
  },
  {
    name: "update_hypothesis",
    description: "Update hypothesis status (proposed/testing/supported/refuted/revised) or confidence (0-1)",
    schema: z.object({
      id: z.string(),
      status: z.string().optional(),
      confidence: z.number().optional(),
    }),
  }
);

const createDataset = tool(
  async ({ projectId, name, source, size, format }) => {
    const d = await prisma.dataset.create({ data: { projectId, name, source, size, format } });
    return JSON.stringify(d);
  },
  {
    name: "create_dataset",
    description: "Create a new dataset entry",
    schema: z.object({
      projectId: z.string(),
      name: z.string(),
      source: z.string().optional(),
      size: z.string().optional(),
      format: z.string().optional(),
    }),
  }
);

const createExperiment = tool(
  async ({ projectId, name, description, hypothesisId }) => {
    const e = await prisma.experiment.create({
      data: { projectId, name, description, hypothesisId },
    });
    return JSON.stringify(e);
  },
  {
    name: "create_experiment",
    description: "Create a new experiment, optionally linked to a hypothesis",
    schema: z.object({
      projectId: z.string(),
      name: z.string(),
      description: z.string().optional(),
      hypothesisId: z.string().optional(),
    }),
  }
);

const updateExperiment = tool(
  async ({ id, status }) => {
    const e = await prisma.experiment.update({ where: { id }, data: { status } });
    return JSON.stringify(e);
  },
  {
    name: "update_experiment",
    description: "Update experiment status (planned/running/completed/failed)",
    schema: z.object({ id: z.string(), status: z.string() }),
  }
);

const addResult = tool(
  async ({ experimentId, name, metrics, notes }) => {
    const r = await prisma.result.create({ data: { experimentId, name, metrics, notes } });
    return JSON.stringify(r);
  },
  {
    name: "add_result",
    description: "Add a result to an experiment",
    schema: z.object({
      experimentId: z.string(),
      name: z.string().describe("Name of this result"),
      metrics: z.string().optional().describe("Metrics as a string, e.g. 'accuracy: 0.95, F1: 0.92'"),
      notes: z.string().optional(),
    }),
  }
);

const createPaper = tool(
  async ({ projectId, title, status, venue, url }) => {
    const p = await prisma.paper.create({ data: { projectId, title, status, venue, url } });
    return JSON.stringify(p);
  },
  {
    name: "create_paper",
    description: "Create a paper entry",
    schema: z.object({
      projectId: z.string(),
      title: z.string(),
      status: z.string().optional(),
      venue: z.string().optional(),
      url: z.string().optional(),
    }),
  }
);

// ── Agent execution tools ──────────────────────────────────────

const AVAILABLE_AGENTS = [
  "scout", "theorist", "architect", "coder", "datasmith", "documenter", "commander",
];

const runAgent = tool(
  async ({ projectId, role }) => {
    // Validate the role
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: { customAgents: true },
    });
    if (!project) return "Project not found";

    const isBuiltin = AVAILABLE_AGENTS.includes(role);
    const isCustom = project.customAgents.some((a) => a.id === role || a.name.toLowerCase() === role.toLowerCase());

    if (!isBuiltin && !isCustom) {
      return `Unknown agent "${role}". Available: ${AVAILABLE_AGENTS.join(", ")}${project.customAgents.length ? ", " + project.customAgents.map((a) => a.name).join(", ") : ""}`;
    }

    // Resolve custom agent ID from name if needed
    let resolvedRole = role;
    if (!isBuiltin) {
      const ca = project.customAgents.find((a) => a.id === role || a.name.toLowerCase() === role.toLowerCase());
      if (ca) resolvedRole = ca.id;
    }

    return JSON.stringify({
      __action: "run_agent",
      role: resolvedRole,
      projectId,
      message: `Triggered ${role} agent. The agent will run in the background — watch the console for progress.`,
    });
  },
  {
    name: "run_agent",
    description: `Run a specialist AI agent on the current project. Available built-in agents: ${AVAILABLE_AGENTS.join(", ")}. Custom agents can also be referenced by name.`,
    schema: z.object({
      projectId: z.string(),
      role: z.string().describe("Agent role key (e.g. scout, theorist, architect, coder, datasmith, documenter, commander) or custom agent name"),
    }),
  }
);

const startMeeting = tool(
  async ({ projectId, topic, agents, rounds }) => {
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: { customAgents: true },
    });
    if (!project) return "Project not found";

    // Validate agents
    const validAgents: string[] = [];
    for (const agent of agents) {
      if (AVAILABLE_AGENTS.includes(agent)) {
        validAgents.push(agent);
      } else {
        const ca = project.customAgents.find((a) => a.id === agent || a.name.toLowerCase() === agent.toLowerCase());
        if (ca) validAgents.push(ca.id);
      }
    }

    if (validAgents.length < 2) {
      return `Need at least 2 valid agents. Got: ${validAgents.join(", ")}. Available: ${AVAILABLE_AGENTS.join(", ")}`;
    }

    return JSON.stringify({
      __action: "start_meeting",
      topic,
      agents: validAgents,
      rounds: rounds || 1,
      projectId,
      message: `Starting meeting on "${topic}" with ${validAgents.join(", ")} (${rounds || 1} rounds). Opening meeting room...`,
    });
  },
  {
    name: "start_meeting",
    description: "Start a multi-agent team meeting to discuss a topic. Agents will debate in rounds.",
    schema: z.object({
      projectId: z.string(),
      topic: z.string().describe("The discussion topic"),
      agents: z.array(z.string()).describe("Agent roles to participate (min 2). e.g. ['scout', 'theorist', 'architect']"),
      rounds: z.number().optional().describe("Number of discussion rounds (default 1)"),
    }),
  }
);

const syncToNotion = tool(
  async ({ projectId }) => {
    return JSON.stringify({
      __action: "sync_notion",
      projectId,
      message: "Triggered Notion sync. The documenter will update the project page.",
    });
  },
  {
    name: "sync_to_notion",
    description: "Sync the current project documentation to Notion",
    schema: z.object({ projectId: z.string() }),
  }
);

// ── Pipeline tools ─────────────────────────────────────────────

const getPipelineStatus = tool(
  async ({ projectId }) => {
    const tasks = await prisma.pipelineTask.findMany({
      where: { projectId },
      orderBy: { createdAt: "asc" },
    });
    const stages = ["survey", "hypotheses", "experiment_design", "implementation", "data", "evaluation", "writing"];
    const summary = stages.map((stage) => {
      const stageTasks = tasks.filter((t) => t.stage === stage);
      const done = stageTasks.filter((t) => t.status === "done").length;
      return `${stage}: ${done}/${stageTasks.length} done`;
    });
    return summary.join("\n") + `\n\nTotal: ${tasks.filter((t) => t.status === "done").length}/${tasks.length} tasks done`;
  },
  {
    name: "get_pipeline_status",
    description: "Get the pipeline progress across all stages",
    schema: z.object({ projectId: z.string() }),
  }
);

const suggestNextSteps = tool(
  async ({ projectId }) => {
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        hypotheses: true,
        experiments: { include: { results: true } },
        papers: true,
        pipelineTasks: true,
      },
    });
    if (!project) return "Project not found";

    const suggestions: string[] = [];
    const untestedH = project.hypotheses.filter((h) => h.status === "proposed");
    const failedE = project.experiments.filter((e) => e.status === "failed");
    const completedE = project.experiments.filter((e) => e.status === "completed" && e.results.length > 0);
    const pendingTasks = project.pipelineTasks.filter((t) => t.status !== "done");

    if (!project.problem) suggestions.push("Define the research problem statement");
    if (project.hypotheses.length === 0) suggestions.push("No hypotheses yet — run the Theorist agent or formulate research questions");
    if (untestedH.length > 0) suggestions.push(`${untestedH.length} untested hypotheses need experiments: ${untestedH.map((h) => h.title).join(", ")}`);
    if (failedE.length > 0) suggestions.push(`${failedE.length} failed experiments may need revision`);
    if (completedE.length > 0 && project.papers.length === 0) suggestions.push("Completed experiments with results — consider starting a paper");
    if (pendingTasks.length > 0) suggestions.push(`${pendingTasks.length} pipeline tasks pending`);

    return suggestions.length > 0 ? suggestions.join("\n") : "Project looks on track!";
  },
  {
    name: "suggest_next_steps",
    description: "Analyze the project and suggest research priorities",
    schema: z.object({ projectId: z.string() }),
  }
);

// ── Assemble ───────────────────────────────────────────────────

const tools = [
  getProjectDetails, updateProject,
  createHypothesis, updateHypothesis,
  createDataset,
  createExperiment, updateExperiment, addResult,
  createPaper,
  runAgent, startMeeting, syncToNotion,
  getPipelineStatus, suggestNextSteps,
];

function shouldContinue(state: typeof AgentState.State) {
  const lastMessage = state.messages[state.messages.length - 1];
  if (lastMessage instanceof AIMessage && lastMessage.tool_calls?.length) {
    return "tools";
  }
  return END;
}

async function callModel(state: typeof AgentState.State) {
  const model = new ChatAnthropic({
    model: "claude-sonnet-4-20250514",
    temperature: 0,
  }).bindTools(tools);

  const response = await model.invoke([
    new SystemMessage(
      `You are Oracle, the AI command center for Lumi Research Manager. You have full control over the research project.

Your capabilities:
- **Query & analyze** project data (hypotheses, experiments, datasets, models, papers, pipeline)
- **Create & update** entities (hypotheses, experiments, datasets, papers)
- **Run specialist agents** (scout=literature, theorist=hypotheses, architect=experiments, coder=implementation, datasmith=data, documenter=docs, commander=coordination)
- **Start team meetings** between agents on any topic
- **Sync to Notion** for documentation
- **Suggest next steps** based on project state

IMPORTANT: The user is currently working on a specific project. Use the projectId provided in context.
Be concise, action-oriented, and proactive. When the user describes what they want, take action — don't just describe what you could do.
When running agents or starting meetings, always confirm what you're doing.`
    ),
    ...state.messages,
  ]);
  return { messages: [response] };
}

const toolNode = new ToolNode(tools);

const workflow = new StateGraph(AgentState)
  .addNode("agent", callModel)
  .addNode("tools", toolNode)
  .addEdge(START, "agent")
  .addConditionalEdges("agent", shouldContinue)
  .addEdge("tools", "agent");

const app = workflow.compile();

export async function POST(req: Request) {
  try {
    const { message, projectId, history = [] } = await req.json();

    // Inject project context into the user message
    const contextualMessage = projectId
      ? `[Current project ID: ${projectId}]\n\n${message}`
      : message;

    const messages = [
      ...history.map((m: { role: string; content: string }) =>
        m.role === "user" ? new HumanMessage(m.content) : new AIMessage(m.content)
      ),
      new HumanMessage(contextualMessage),
    ];

    const result = await app.invoke({ messages });

    const lastMessage = result.messages[result.messages.length - 1];
    const response = typeof lastMessage.content === "string"
      ? lastMessage.content
      : JSON.stringify(lastMessage.content);

    // Scan tool outputs for frontend actions
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const actions: any[] = [];
    for (const msg of result.messages) {
      if (msg.content && typeof msg.content === "string") {
        try {
          const parsed = JSON.parse(msg.content);
          if (parsed.__action) {
            actions.push({ type: parsed.__action, payload: parsed });
          }
        } catch { /* not JSON */ }
      }
    }

    await prisma.agentLog.create({
      data: {
        action: "oracle",
        input: message,
        output: response,
      },
    });

    return NextResponse.json({ response, actions });
  } catch (error) {
    console.error("Oracle error:", error);
    return NextResponse.json(
      { error: `Oracle failed: ${error}` },
      { status: 500 }
    );
  }
}
