import { NextResponse } from "next/server";
import { ChatAnthropic } from "@langchain/anthropic";
import { StateGraph, Annotation, END, START } from "@langchain/langgraph";
import { HumanMessage, AIMessage, BaseMessage, SystemMessage } from "@langchain/core/messages";
import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { ToolNode } from "@langchain/langgraph/prebuilt";

const AgentState = Annotation.Root({
  messages: Annotation<BaseMessage[]>({
    reducer: (a, b) => [...a, ...b],
    default: () => [],
  }),
});

const listProjects = tool(
  async () => {
    const projects = await prisma.project.findMany({
      include: {
        _count: {
          select: { hypotheses: true, datasets: true, models: true, experiments: true, papers: true },
        },
      },
    });
    return JSON.stringify(projects, null, 2);
  },
  {
    name: "list_projects",
    description: "List all research projects with counts of related entities",
    schema: z.object({}),
  }
);

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
      },
    });
    return JSON.stringify(project, null, 2);
  },
  {
    name: "get_project_details",
    description: "Get full details of a project including all entities",
    schema: z.object({ projectId: z.string().describe("The project ID") }),
  }
);

const createHypothesis = tool(
  async ({ projectId, title, description }) => {
    const h = await prisma.hypothesis.create({
      data: { projectId, title, description },
    });
    return JSON.stringify(h);
  },
  {
    name: "create_hypothesis",
    description: "Create a new hypothesis in a project",
    schema: z.object({
      projectId: z.string(),
      title: z.string(),
      description: z.string(),
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
    description: "Create a new experiment in a project, optionally linked to a hypothesis",
    schema: z.object({
      projectId: z.string(),
      name: z.string(),
      description: z.string().optional(),
      hypothesisId: z.string().optional(),
    }),
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
      },
    });
    if (!project) return "Project not found";

    const untestedHypotheses = project.hypotheses.filter((h) => h.status === "proposed");
    const failedExperiments = project.experiments.filter((e) => e.status === "failed");
    const completedWithoutPaper = project.experiments.filter(
      (e) => e.status === "completed" && e.results.length > 0
    );

    const suggestions: string[] = [];
    if (untestedHypotheses.length > 0) {
      suggestions.push(
        `${untestedHypotheses.length} untested hypotheses need experiments: ${untestedHypotheses.map((h) => h.title).join(", ")}`
      );
    }
    if (failedExperiments.length > 0) {
      suggestions.push(
        `${failedExperiments.length} failed experiments may need revision: ${failedExperiments.map((e) => e.name).join(", ")}`
      );
    }
    if (completedWithoutPaper.length > 0 && project.papers.length === 0) {
      suggestions.push(
        `${completedWithoutPaper.length} completed experiments with results - consider starting a paper`
      );
    }
    if (project.hypotheses.length === 0) {
      suggestions.push("No hypotheses yet - consider formulating research questions");
    }

    return suggestions.length > 0 ? suggestions.join("\n") : "Project looks on track!";
  },
  {
    name: "suggest_next_steps",
    description: "Analyze a project and suggest next research steps",
    schema: z.object({ projectId: z.string() }),
  }
);

const tools = [listProjects, getProjectDetails, createHypothesis, createExperiment, suggestNextSteps];

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
      `You are Lumi, a research management AI assistant. You help researchers manage their projects, hypotheses, datasets, models, experiments, results, and papers. You can query the database to understand project status, create new entities, and suggest next steps. Be concise and helpful. When asked about project status, use the tools to fetch real data.`
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
    const { message, history = [] } = await req.json();

    const messages = [
      ...history.map((m: { role: string; content: string }) =>
        m.role === "user" ? new HumanMessage(m.content) : new AIMessage(m.content)
      ),
      new HumanMessage(message),
    ];

    const result = await app.invoke({ messages });

    const lastMessage = result.messages[result.messages.length - 1];
    const response = typeof lastMessage.content === "string"
      ? lastMessage.content
      : JSON.stringify(lastMessage.content);

    await prisma.agentLog.create({
      data: {
        action: "chat",
        input: message,
        output: response,
      },
    });

    return NextResponse.json({ response });
  } catch (error) {
    console.error("Agent error:", error);
    return NextResponse.json(
      { error: "Agent failed", details: String(error) },
      { status: 500 }
    );
  }
}
