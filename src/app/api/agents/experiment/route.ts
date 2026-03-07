import { ChatAnthropic } from "@langchain/anthropic";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const { hypothesis, projectId } = await req.json();

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: string, data: Record<string, unknown>) => {
        controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
      };

      try {
        send("status", { state: "booting", message: "Initializing experiment agent..." });
        await delay(600);

        send("status", { state: "planning", message: "Designing experiment plan..." });
        send("log", { text: `> Hypothesis: "${hypothesis}"`, type: "info" });
        send("log", { text: "> Designing experiment methodology...", type: "info" });
        send("progress", { value: 10, label: "Planning" });
        await delay(800);

        const model = new ChatAnthropic({
          model: "claude-sonnet-4-20250514",
          temperature: 0.3,
          maxTokens: 2000,
        });

        send("progress", { value: 20, label: "Consulting Claude" });
        send("log", { text: "> Generating experiment design with Claude...", type: "info" });

        const response = await model.invoke([
          new SystemMessage(
            `You are an experiment design AI. Given a hypothesis, design a complete experiment plan. Format your response as JSON:
{
  "experiment_name": "...",
  "methodology": "...",
  "datasets_needed": [{"name": "...", "description": "...", "source": "...", "size": "..."}],
  "models_to_test": [{"name": "...", "architecture": "...", "config": "..."}],
  "metrics": ["metric1", "metric2"],
  "steps": [{"step": 1, "name": "...", "description": "...", "duration": "..."}],
  "expected_results": {"baseline": "...", "hypothesis_outcome": "..."},
  "risks": ["risk1", "risk2"]
}
Be specific and realistic with 2-3 datasets, 2-3 models, 4-6 steps.`
          ),
          new HumanMessage(`Design experiment for hypothesis: "${hypothesis}"${projectId ? ` (Project: ${projectId})` : ""}`),
        ]);

        send("progress", { value: 40, label: "Received plan" });
        send("log", { text: "> Experiment plan received from Claude", type: "success" });
        await delay(300);

        let plan;
        try {
          const content = typeof response.content === "string" ? response.content : JSON.stringify(response.content);
          const jsonMatch = content.match(/\{[\s\S]*\}/);
          plan = jsonMatch ? JSON.parse(jsonMatch[0]) : {};
        } catch {
          plan = {};
        }

        // Stream experiment name
        send("status", { state: "configuring", message: `Experiment: ${plan.experiment_name || "Unnamed"}` });
        send("experiment_name", { name: plan.experiment_name });
        await delay(400);

        // Stream datasets
        send("status", { state: "preparing_data", message: "Preparing datasets..." });
        for (let i = 0; i < (plan.datasets_needed?.length || 0); i++) {
          const ds = plan.datasets_needed[i];
          const progress = 40 + ((i + 1) / plan.datasets_needed.length) * 10;
          send("progress", { value: Math.round(progress), label: `Dataset ${i + 1}` });
          send("log", { text: `> Loading dataset: ${ds.name} (${ds.size})`, type: "data" });
          send("dataset", { ...ds, index: i });
          await delay(600);
        }

        // Stream models
        send("status", { state: "loading_models", message: "Configuring models..." });
        for (let i = 0; i < (plan.models_to_test?.length || 0); i++) {
          const mdl = plan.models_to_test[i];
          const progress = 50 + ((i + 1) / plan.models_to_test.length) * 10;
          send("progress", { value: Math.round(progress), label: `Model ${i + 1}` });
          send("log", { text: `> Configuring model: ${mdl.name} (${mdl.architecture})`, type: "model" });
          send("model", { ...mdl, index: i });
          await delay(600);
        }

        // Stream experiment steps (simulate execution)
        send("status", { state: "running", message: "Running experiment..." });
        for (let i = 0; i < (plan.steps?.length || 0); i++) {
          const step = plan.steps[i];
          const progress = 60 + ((i + 1) / plan.steps.length) * 30;
          send("progress", { value: Math.round(progress), label: `Step ${step.step}` });
          send("log", { text: `> [Step ${step.step}] ${step.name}: ${step.description}`, type: "step" });
          send("step", { ...step, index: i, total: plan.steps.length });
          await delay(1000);

          // Simulate metrics at each step
          if (i > 0) {
            const mockMetrics: Record<string, number> = {};
            for (const metric of plan.metrics || []) {
              mockMetrics[metric] = parseFloat((Math.random() * 0.4 + 0.5).toFixed(3));
            }
            send("metrics", { step: step.step, values: mockMetrics });
            send("log", {
              text: `> Metrics: ${Object.entries(mockMetrics).map(([k, v]) => `${k}=${v}`).join(", ")}`,
              type: "metric",
            });
            await delay(400);
          }
        }

        // Final results
        send("progress", { value: 95, label: "Analyzing results" });
        send("status", { state: "analyzing", message: "Analyzing experiment results..." });
        send("log", { text: "> Computing final metrics and analysis...", type: "info" });
        await delay(800);

        const finalMetrics: Record<string, number> = {};
        for (const metric of plan.metrics || []) {
          finalMetrics[metric] = parseFloat((Math.random() * 0.3 + 0.65).toFixed(3));
        }
        send("final_results", {
          metrics: finalMetrics,
          expected: plan.expected_results,
          risks: plan.risks,
        });
        send("log", {
          text: `> Final: ${Object.entries(finalMetrics).map(([k, v]) => `${k}=${v}`).join(", ")}`,
          type: "success",
        });

        send("progress", { value: 100, label: "Complete" });
        send("status", { state: "complete", message: "Experiment complete!" });
        send("log", { text: "> Experiment finished. Results ready for review.", type: "success" });
        send("complete", { plan, finalMetrics });
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
