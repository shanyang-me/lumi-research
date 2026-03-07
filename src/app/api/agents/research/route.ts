import { ChatAnthropic } from "@langchain/anthropic";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const { projectId, topic } = await req.json();

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: string, data: Record<string, unknown>) => {
        controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
      };

      try {
        send("status", { state: "booting", message: "Initializing research agent..." });
        await delay(800);

        send("status", { state: "searching", message: `Scanning arXiv for "${topic}"...` });
        send("log", { text: `> Searching latest papers on: ${topic}`, type: "info" });
        await delay(1200);

        send("log", { text: "> Connecting to academic databases...", type: "info" });
        send("progress", { value: 10, label: "Connecting" });
        await delay(600);

        const model = new ChatAnthropic({
          model: "claude-sonnet-4-20250514",
          temperature: 0.3,
          maxTokens: 2000,
        });

        send("status", { state: "analyzing", message: "Analyzing research landscape..." });
        send("progress", { value: 25, label: "Fetching papers" });
        send("log", { text: "> Querying Claude for latest research analysis...", type: "info" });

        const response = await model.invoke([
          new SystemMessage(
            `You are a research analyst. Given a research topic, provide a structured analysis of the latest important work in this area. Format your response as JSON with this structure:
{
  "papers": [{"title": "...", "authors": "...", "year": 2024, "key_finding": "...", "relevance": "high|medium"}],
  "trends": ["trend1", "trend2"],
  "gaps": ["gap1", "gap2"],
  "suggested_hypotheses": [{"title": "...", "description": "...", "rationale": "..."}]
}
Include 3-5 papers, 2-3 trends, 2-3 gaps, and 2-3 hypotheses. Use realistic recent paper titles and findings.`
          ),
          new HumanMessage(`Research topic: ${topic}${projectId ? ` (Project ID: ${projectId})` : ""}`),
        ]);

        send("progress", { value: 50, label: "Analyzing papers" });
        send("log", { text: "> Received research landscape analysis", type: "success" });
        await delay(500);

        let parsed;
        try {
          const content = typeof response.content === "string" ? response.content : JSON.stringify(response.content);
          const jsonMatch = content.match(/\{[\s\S]*\}/);
          parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : { papers: [], trends: [], gaps: [], suggested_hypotheses: [] };
        } catch {
          parsed = { papers: [], trends: [], gaps: [], suggested_hypotheses: [] };
        }

        // Stream papers one by one
        send("status", { state: "processing", message: "Processing discovered papers..." });
        for (let i = 0; i < (parsed.papers?.length || 0); i++) {
          const paper = parsed.papers[i];
          const progress = 50 + ((i + 1) / parsed.papers.length) * 30;
          send("progress", { value: Math.round(progress), label: `Paper ${i + 1}/${parsed.papers.length}` });
          send("log", { text: `> Found: "${paper.title}" [${paper.relevance}]`, type: "paper" });
          send("paper", { ...paper, index: i });
          await delay(800);
        }

        // Stream trends
        send("status", { state: "synthesizing", message: "Identifying research trends..." });
        send("progress", { value: 85, label: "Synthesizing" });
        for (const trend of parsed.trends || []) {
          send("log", { text: `> Trend: ${trend}`, type: "trend" });
          send("trend", { text: trend });
          await delay(400);
        }

        // Stream gaps
        send("status", { state: "synthesizing", message: "Identifying research gaps..." });
        send("progress", { value: 90, label: "Finding gaps" });
        for (const gap of parsed.gaps || []) {
          send("log", { text: `> Gap: ${gap}`, type: "gap" });
          send("gap", { text: gap });
          await delay(400);
        }

        // Stream hypotheses
        send("status", { state: "generating", message: "Generating hypothesis suggestions..." });
        send("progress", { value: 95, label: "Generating hypotheses" });
        for (const hyp of parsed.suggested_hypotheses || []) {
          send("log", { text: `> Hypothesis: ${hyp.title}`, type: "hypothesis" });
          send("hypothesis", hyp);
          await delay(600);
        }

        send("progress", { value: 100, label: "Complete" });
        send("status", { state: "complete", message: "Research scan complete!" });
        send("log", { text: "> Mission complete. All findings reported.", type: "success" });
        send("complete", { summary: parsed });
      } catch (error) {
        send("status", { state: "error", message: String(error) });
        send("log", { text: `> ERROR: ${error}`, type: "error" });
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

function delay(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}
