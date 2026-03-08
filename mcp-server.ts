#!/usr/bin/env npx tsx

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import Database from "better-sqlite3";
import { z } from "zod";
import { randomUUID } from "crypto";

const DB_PATH = "/Users/shanyang/research-manager/prisma/dev.db";

const db = new Database(DB_PATH);
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

// Helper: current ISO timestamp
function now(): string {
  return new Date().toISOString();
}

// Helper: run a query and return JSON-safe results
function queryAll(sql: string, params: Record<string, unknown> = {}): unknown[] {
  return db.prepare(sql).all(params);
}

function queryGet(sql: string, params: Record<string, unknown> = {}): unknown {
  return db.prepare(sql).get(params);
}

function run(sql: string, params: Record<string, unknown> = {}): Database.RunResult {
  return db.prepare(sql).run(params);
}

// ─── Server Setup ───────────────────────────────────────────────────────────

const server = new McpServer({
  name: "lumi-research",
  version: "1.0.0",
});

// ─── Project Tools ──────────────────────────────────────────────────────────

server.tool(
  "list_projects",
  "List all research projects with entity counts (hypotheses, datasets, models, experiments, papers)",
  {},
  async () => {
    const projects = queryAll(`
      SELECT
        p.*,
        (SELECT COUNT(*) FROM Hypothesis h WHERE h.projectId = p.id) as hypothesisCount,
        (SELECT COUNT(*) FROM Dataset d WHERE d.projectId = p.id) as datasetCount,
        (SELECT COUNT(*) FROM Model m WHERE m.projectId = p.id) as modelCount,
        (SELECT COUNT(*) FROM Experiment e WHERE e.projectId = p.id) as experimentCount,
        (SELECT COUNT(*) FROM Paper pa WHERE pa.projectId = p.id) as paperCount
      FROM Project p
      ORDER BY p.updatedAt DESC
    `);
    return { content: [{ type: "text", text: JSON.stringify(projects, null, 2) }] };
  }
);

server.tool(
  "get_project",
  "Get full project details including all entities (hypotheses, datasets, models, experiments with results, papers)",
  {
    projectId: z.string().describe("Project UUID"),
  },
  async ({ projectId }) => {
    const project = queryGet(`SELECT * FROM Project WHERE id = :projectId`, { projectId });
    if (!project) {
      return { content: [{ type: "text", text: `Project not found: ${projectId}` }], isError: true };
    }

    const hypotheses = queryAll(`SELECT * FROM Hypothesis WHERE projectId = :projectId ORDER BY createdAt DESC`, { projectId });
    const datasets = queryAll(`SELECT * FROM Dataset WHERE projectId = :projectId ORDER BY createdAt DESC`, { projectId });
    const models = queryAll(`SELECT * FROM Model WHERE projectId = :projectId ORDER BY createdAt DESC`, { projectId });

    const experiments = queryAll(`SELECT * FROM Experiment WHERE projectId = :projectId ORDER BY createdAt DESC`, { projectId });
    // Enrich experiments with their linked datasets, models, and results
    const enrichedExperiments = (experiments as Record<string, unknown>[]).map((exp) => {
      const expDatasets = queryAll(
        `SELECT d.* FROM Dataset d JOIN ExperimentDataset ed ON d.id = ed.datasetId WHERE ed.experimentId = :experimentId`,
        { experimentId: exp.id as string }
      );
      const expModels = queryAll(
        `SELECT m.* FROM Model m JOIN ExperimentModel em ON m.id = em.modelId WHERE em.experimentId = :experimentId`,
        { experimentId: exp.id as string }
      );
      const results = queryAll(
        `SELECT * FROM Result WHERE experimentId = :experimentId ORDER BY createdAt DESC`,
        { experimentId: exp.id as string }
      );
      return { ...exp, datasets: expDatasets, models: expModels, results };
    });

    const papers = queryAll(`SELECT * FROM Paper WHERE projectId = :projectId ORDER BY createdAt DESC`, { projectId });
    const enrichedPapers = (papers as Record<string, unknown>[]).map((paper) => {
      const paperHypotheses = queryAll(
        `SELECT h.* FROM Hypothesis h JOIN PaperHypothesis ph ON h.id = ph.hypothesisId WHERE ph.paperId = :paperId`,
        { paperId: paper.id as string }
      );
      const paperResults = queryAll(
        `SELECT r.* FROM Result r JOIN PaperResult pr ON r.id = pr.resultId WHERE pr.paperId = :paperId`,
        { paperId: paper.id as string }
      );
      return { ...paper, hypotheses: paperHypotheses, results: paperResults };
    });

    const result = {
      ...project as Record<string, unknown>,
      hypotheses,
      datasets,
      models,
      experiments: enrichedExperiments,
      papers: enrichedPapers,
    };

    return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
  }
);

server.tool(
  "create_project",
  "Create a new research project",
  {
    name: z.string().describe("Project name"),
    description: z.string().optional().describe("Project description"),
    problem: z.string().optional().describe("What problem are we trying to solve?"),
    successCriteria: z.string().optional().describe("How do we know we've succeeded?"),
    motivation: z.string().optional().describe("Why is this important?"),
    approach: z.string().optional().describe("High-level approach / methodology"),
    timeline: z.string().optional().describe("Target timeline"),
  },
  async ({ name, description, problem, successCriteria, motivation, approach, timeline }) => {
    const id = randomUUID();
    const timestamp = now();
    run(
      `INSERT INTO Project (id, name, description, problem, successCriteria, motivation, approach, timeline, status, createdAt, updatedAt)
       VALUES (:id, :name, :description, :problem, :successCriteria, :motivation, :approach, :timeline, 'active', :createdAt, :updatedAt)`,
      {
        id,
        name,
        description: description ?? null,
        problem: problem ?? null,
        successCriteria: successCriteria ?? null,
        motivation: motivation ?? null,
        approach: approach ?? null,
        timeline: timeline ?? null,
        createdAt: timestamp,
        updatedAt: timestamp,
      }
    );
    const project = queryGet(`SELECT * FROM Project WHERE id = :id`, { id });
    return { content: [{ type: "text", text: JSON.stringify(project, null, 2) }] };
  }
);

server.tool(
  "update_project",
  "Update project fields including status",
  {
    projectId: z.string().describe("Project UUID"),
    name: z.string().optional(),
    description: z.string().optional(),
    problem: z.string().optional(),
    successCriteria: z.string().optional(),
    motivation: z.string().optional(),
    approach: z.string().optional(),
    timeline: z.string().optional(),
    status: z.string().optional().describe("e.g. active, paused, completed, archived"),
  },
  async ({ projectId, ...fields }) => {
    const existing = queryGet(`SELECT * FROM Project WHERE id = :projectId`, { projectId });
    if (!existing) {
      return { content: [{ type: "text", text: `Project not found: ${projectId}` }], isError: true };
    }

    const updates: string[] = [];
    const params: Record<string, unknown> = { projectId, updatedAt: now() };

    for (const [key, value] of Object.entries(fields)) {
      if (value !== undefined) {
        updates.push(`${key} = :${key}`);
        params[key] = value;
      }
    }
    updates.push(`updatedAt = :updatedAt`);

    if (updates.length > 1) {
      run(`UPDATE Project SET ${updates.join(", ")} WHERE id = :projectId`, params);
    }

    const project = queryGet(`SELECT * FROM Project WHERE id = :projectId`, { projectId });
    return { content: [{ type: "text", text: JSON.stringify(project, null, 2) }] };
  }
);

// ─── Entity Tools ───────────────────────────────────────────────────────────

server.tool(
  "add_hypothesis",
  "Add a hypothesis to a project",
  {
    projectId: z.string().describe("Project UUID"),
    title: z.string().describe("Hypothesis title"),
    description: z.string().describe("Hypothesis description"),
    status: z.string().optional().describe("e.g. proposed, testing, supported, refuted (default: proposed)"),
    confidence: z.number().optional().describe("Confidence score 0-1"),
  },
  async ({ projectId, title, description, status, confidence }) => {
    const id = randomUUID();
    const timestamp = now();
    run(
      `INSERT INTO Hypothesis (id, title, description, status, confidence, projectId, createdAt, updatedAt)
       VALUES (:id, :title, :description, :status, :confidence, :projectId, :createdAt, :updatedAt)`,
      {
        id,
        title,
        description,
        status: status ?? "proposed",
        confidence: confidence ?? null,
        projectId,
        createdAt: timestamp,
        updatedAt: timestamp,
      }
    );
    // Also update project updatedAt
    run(`UPDATE Project SET updatedAt = :updatedAt WHERE id = :projectId`, { updatedAt: timestamp, projectId });
    const hypothesis = queryGet(`SELECT * FROM Hypothesis WHERE id = :id`, { id });
    return { content: [{ type: "text", text: JSON.stringify(hypothesis, null, 2) }] };
  }
);

server.tool(
  "add_dataset",
  "Add a dataset to a project",
  {
    projectId: z.string().describe("Project UUID"),
    name: z.string().describe("Dataset name"),
    description: z.string().optional(),
    source: z.string().optional().describe("Where the data comes from"),
    size: z.string().optional().describe("Dataset size (e.g. '10k samples', '2.3GB')"),
    format: z.string().optional().describe("Data format (e.g. CSV, JSON, Parquet)"),
  },
  async ({ projectId, name, description, source, size, format }) => {
    const id = randomUUID();
    const timestamp = now();
    run(
      `INSERT INTO Dataset (id, name, description, source, size, format, projectId, createdAt, updatedAt)
       VALUES (:id, :name, :description, :source, :size, :format, :projectId, :createdAt, :updatedAt)`,
      {
        id,
        name,
        description: description ?? null,
        source: source ?? null,
        size: size ?? null,
        format: format ?? null,
        projectId,
        createdAt: timestamp,
        updatedAt: timestamp,
      }
    );
    run(`UPDATE Project SET updatedAt = :updatedAt WHERE id = :projectId`, { updatedAt: timestamp, projectId });
    const dataset = queryGet(`SELECT * FROM Dataset WHERE id = :id`, { id });
    return { content: [{ type: "text", text: JSON.stringify(dataset, null, 2) }] };
  }
);

server.tool(
  "add_model",
  "Add a model to a project",
  {
    projectId: z.string().describe("Project UUID"),
    name: z.string().describe("Model name"),
    description: z.string().optional(),
    architecture: z.string().optional().describe("Model architecture (e.g. Transformer, CNN, GNN)"),
    framework: z.string().optional().describe("Framework (e.g. PyTorch, TensorFlow, JAX)"),
  },
  async ({ projectId, name, description, architecture, framework }) => {
    const id = randomUUID();
    const timestamp = now();
    run(
      `INSERT INTO Model (id, name, description, architecture, framework, projectId, createdAt, updatedAt)
       VALUES (:id, :name, :description, :architecture, :framework, :projectId, :createdAt, :updatedAt)`,
      {
        id,
        name,
        description: description ?? null,
        architecture: architecture ?? null,
        framework: framework ?? null,
        projectId,
        createdAt: timestamp,
        updatedAt: timestamp,
      }
    );
    run(`UPDATE Project SET updatedAt = :updatedAt WHERE id = :projectId`, { updatedAt: timestamp, projectId });
    const model = queryGet(`SELECT * FROM Model WHERE id = :id`, { id });
    return { content: [{ type: "text", text: JSON.stringify(model, null, 2) }] };
  }
);

server.tool(
  "add_experiment",
  "Create an experiment linked to a hypothesis, datasets, and models",
  {
    projectId: z.string().describe("Project UUID"),
    name: z.string().describe("Experiment name"),
    description: z.string().optional(),
    hypothesisId: z.string().optional().describe("Hypothesis UUID to link"),
    datasetIds: z.array(z.string()).optional().describe("Dataset UUIDs to link"),
    modelIds: z.array(z.string()).optional().describe("Model UUIDs to link"),
    status: z.string().optional().describe("e.g. planned, running, completed, failed (default: planned)"),
    config: z.string().optional().describe("Experiment configuration as JSON string"),
  },
  async ({ projectId, name, description, hypothesisId, datasetIds, modelIds, status, config }) => {
    const id = randomUUID();
    const timestamp = now();

    const transaction = db.transaction(() => {
      run(
        `INSERT INTO Experiment (id, name, description, status, config, projectId, hypothesisId, createdAt, updatedAt)
         VALUES (:id, :name, :description, :status, :config, :projectId, :hypothesisId, :createdAt, :updatedAt)`,
        {
          id,
          name,
          description: description ?? null,
          status: status ?? "planned",
          config: config ?? null,
          projectId,
          hypothesisId: hypothesisId ?? null,
          createdAt: timestamp,
          updatedAt: timestamp,
        }
      );

      if (datasetIds && datasetIds.length > 0) {
        const insertED = db.prepare(`INSERT INTO ExperimentDataset (experimentId, datasetId) VALUES (:experimentId, :datasetId)`);
        for (const datasetId of datasetIds) {
          insertED.run({ experimentId: id, datasetId });
        }
      }

      if (modelIds && modelIds.length > 0) {
        const insertEM = db.prepare(`INSERT INTO ExperimentModel (experimentId, modelId) VALUES (:experimentId, :modelId)`);
        for (const modelId of modelIds) {
          insertEM.run({ experimentId: id, modelId });
        }
      }

      run(`UPDATE Project SET updatedAt = :updatedAt WHERE id = :projectId`, { updatedAt: timestamp, projectId });
    });

    transaction();

    const experiment = queryGet(`SELECT * FROM Experiment WHERE id = :id`, { id });
    const expDatasets = queryAll(
      `SELECT d.* FROM Dataset d JOIN ExperimentDataset ed ON d.id = ed.datasetId WHERE ed.experimentId = :id`,
      { id }
    );
    const expModels = queryAll(
      `SELECT m.* FROM Model m JOIN ExperimentModel em ON m.id = em.modelId WHERE em.experimentId = :id`,
      { id }
    );

    const result = {
      ...(experiment as Record<string, unknown>),
      datasets: expDatasets,
      models: expModels,
    };

    return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
  }
);

server.tool(
  "add_result",
  "Record an experiment result",
  {
    experimentId: z.string().describe("Experiment UUID"),
    name: z.string().describe("Result name"),
    metrics: z.string().optional().describe("Metrics as JSON string (e.g. '{\"accuracy\": 0.95, \"f1\": 0.92}')"),
    notes: z.string().optional(),
    status: z.string().optional().describe("e.g. preliminary, validated, final (default: preliminary)"),
  },
  async ({ experimentId, name, metrics, notes, status }) => {
    const experiment = queryGet(`SELECT * FROM Experiment WHERE id = :experimentId`, { experimentId }) as Record<string, unknown> | undefined;
    if (!experiment) {
      return { content: [{ type: "text", text: `Experiment not found: ${experimentId}` }], isError: true };
    }

    const id = randomUUID();
    const timestamp = now();
    run(
      `INSERT INTO Result (id, name, metrics, notes, status, experimentId, createdAt, updatedAt)
       VALUES (:id, :name, :metrics, :notes, :status, :experimentId, :createdAt, :updatedAt)`,
      {
        id,
        name,
        metrics: metrics ?? null,
        notes: notes ?? null,
        status: status ?? "preliminary",
        experimentId,
        createdAt: timestamp,
        updatedAt: timestamp,
      }
    );

    // Update experiment and project timestamps
    run(`UPDATE Experiment SET updatedAt = :updatedAt WHERE id = :experimentId`, { updatedAt: timestamp, experimentId });
    run(`UPDATE Project SET updatedAt = :updatedAt WHERE id = :projectId`, { updatedAt: timestamp, projectId: experiment.projectId });

    const result = queryGet(`SELECT * FROM Result WHERE id = :id`, { id });
    return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
  }
);

server.tool(
  "add_paper",
  "Track a paper linked to a project, optionally linked to hypotheses and results",
  {
    projectId: z.string().describe("Project UUID"),
    title: z.string().describe("Paper title"),
    abstract: z.string().optional(),
    status: z.string().optional().describe("e.g. idea, drafting, submitted, published (default: idea)"),
    venue: z.string().optional().describe("Target venue (e.g. NeurIPS, ICML, arXiv)"),
    url: z.string().optional(),
    hypothesisIds: z.array(z.string()).optional().describe("Hypothesis UUIDs to link"),
    resultIds: z.array(z.string()).optional().describe("Result UUIDs to link"),
  },
  async ({ projectId, title, abstract, status, venue, url, hypothesisIds, resultIds }) => {
    const id = randomUUID();
    const timestamp = now();

    const transaction = db.transaction(() => {
      run(
        `INSERT INTO Paper (id, title, abstract, status, venue, url, projectId, createdAt, updatedAt)
         VALUES (:id, :title, :abstract, :status, :venue, :url, :projectId, :createdAt, :updatedAt)`,
        {
          id,
          title,
          abstract: abstract ?? null,
          status: status ?? "idea",
          venue: venue ?? null,
          url: url ?? null,
          projectId,
          createdAt: timestamp,
          updatedAt: timestamp,
        }
      );

      if (hypothesisIds && hypothesisIds.length > 0) {
        const insertPH = db.prepare(`INSERT INTO PaperHypothesis (paperId, hypothesisId) VALUES (:paperId, :hypothesisId)`);
        for (const hypothesisId of hypothesisIds) {
          insertPH.run({ paperId: id, hypothesisId });
        }
      }

      if (resultIds && resultIds.length > 0) {
        const insertPR = db.prepare(`INSERT INTO PaperResult (paperId, resultId) VALUES (:paperId, :resultId)`);
        for (const resultId of resultIds) {
          insertPR.run({ paperId: id, resultId });
        }
      }

      run(`UPDATE Project SET updatedAt = :updatedAt WHERE id = :projectId`, { updatedAt: timestamp, projectId });
    });

    transaction();

    const paper = queryGet(`SELECT * FROM Paper WHERE id = :id`, { id });
    const paperHypotheses = queryAll(
      `SELECT h.* FROM Hypothesis h JOIN PaperHypothesis ph ON h.id = ph.hypothesisId WHERE ph.paperId = :id`,
      { id }
    );
    const paperResults = queryAll(
      `SELECT r.* FROM Result r JOIN PaperResult pr ON r.id = pr.resultId WHERE pr.paperId = :id`,
      { id }
    );

    const result = {
      ...(paper as Record<string, unknown>),
      hypotheses: paperHypotheses,
      results: paperResults,
    };

    return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
  }
);

// ─── Update / Delete Tools ──────────────────────────────────────────────────

const ENTITY_TABLES: Record<string, { table: string; fields: string[] }> = {
  hypotheses: {
    table: "Hypothesis",
    fields: ["title", "description", "status", "confidence"],
  },
  datasets: {
    table: "Dataset",
    fields: ["name", "description", "source", "size", "format"],
  },
  models: {
    table: "Model",
    fields: ["name", "description", "architecture", "framework"],
  },
  experiments: {
    table: "Experiment",
    fields: ["name", "description", "status", "config", "hypothesisId"],
  },
  results: {
    table: "Result",
    fields: ["name", "metrics", "notes", "status"],
  },
  papers: {
    table: "Paper",
    fields: ["title", "abstract", "status", "venue", "url"],
  },
};

server.tool(
  "update_entity",
  "Update any entity by type and id. Supported types: hypotheses, datasets, models, experiments, results, papers",
  {
    type: z.enum(["hypotheses", "datasets", "models", "experiments", "results", "papers"]).describe("Entity type"),
    id: z.string().describe("Entity UUID"),
    fields: z.string().describe("JSON object of fields to update, e.g. '{\"status\": \"completed\", \"name\": \"New name\"}'"),
  },
  async ({ type, id, fields: fieldsJson }) => {
    const entityDef = ENTITY_TABLES[type];
    const existing = queryGet(`SELECT * FROM ${entityDef.table} WHERE id = :id`, { id });
    if (!existing) {
      return { content: [{ type: "text", text: `${entityDef.table} not found: ${id}` }], isError: true };
    }

    let fields: Record<string, unknown>;
    try {
      fields = JSON.parse(fieldsJson);
    } catch {
      return { content: [{ type: "text", text: `Invalid JSON for fields: ${fieldsJson}` }], isError: true };
    }

    const updates: string[] = [];
    const params: Record<string, unknown> = { id, updatedAt: now() };

    for (const [key, value] of Object.entries(fields)) {
      if (entityDef.fields.includes(key)) {
        updates.push(`${key} = :${key}`);
        params[key] = value;
      }
    }

    // All entities with updatedAt
    if (entityDef.table !== "AgentLog") {
      updates.push(`updatedAt = :updatedAt`);
    }

    if (updates.length > 0) {
      run(`UPDATE ${entityDef.table} SET ${updates.join(", ")} WHERE id = :id`, params);
    }

    // Also update the parent project updatedAt
    const updated = queryGet(`SELECT * FROM ${entityDef.table} WHERE id = :id`, { id }) as Record<string, unknown>;
    if (updated.projectId) {
      run(`UPDATE Project SET updatedAt = :updatedAt WHERE id = :projectId`, { updatedAt: now(), projectId: updated.projectId });
    } else if (type === "results" && updated.experimentId) {
      const exp = queryGet(`SELECT projectId FROM Experiment WHERE id = :experimentId`, { experimentId: updated.experimentId }) as Record<string, unknown> | undefined;
      if (exp) {
        run(`UPDATE Project SET updatedAt = :updatedAt WHERE id = :projectId`, { updatedAt: now(), projectId: exp.projectId });
      }
    }

    return { content: [{ type: "text", text: JSON.stringify(updated, null, 2) }] };
  }
);

server.tool(
  "delete_entity",
  "Delete any entity by type and id. Supported types: hypotheses, datasets, models, experiments, results, papers",
  {
    type: z.enum(["hypotheses", "datasets", "models", "experiments", "results", "papers"]).describe("Entity type"),
    id: z.string().describe("Entity UUID"),
  },
  async ({ type, id }) => {
    const entityDef = ENTITY_TABLES[type];
    const existing = queryGet(`SELECT * FROM ${entityDef.table} WHERE id = :id`, { id });
    if (!existing) {
      return { content: [{ type: "text", text: `${entityDef.table} not found: ${id}` }], isError: true };
    }

    run(`DELETE FROM ${entityDef.table} WHERE id = :id`, { id });

    return { content: [{ type: "text", text: `Deleted ${entityDef.table} ${id}` }] };
  }
);

// ─── Search Tool ────────────────────────────────────────────────────────────

server.tool(
  "search_entities",
  "Search across all entity types by keyword. Searches names, titles, descriptions, and abstracts.",
  {
    query: z.string().describe("Search keyword"),
    projectId: z.string().optional().describe("Limit search to a specific project"),
  },
  async ({ query, projectId }) => {
    const like = `%${query}%`;
    const projectFilter = projectId ? ` AND projectId = :projectId` : "";
    const params: Record<string, unknown> = { like, projectId: projectId ?? null };

    const projects = queryAll(
      `SELECT *, 'project' as _type FROM Project WHERE (name LIKE :like OR description LIKE :like OR problem LIKE :like OR approach LIKE :like)${projectId ? " AND id = :projectId" : ""}`,
      params
    );

    const hypotheses = queryAll(
      `SELECT *, 'hypothesis' as _type FROM Hypothesis WHERE (title LIKE :like OR description LIKE :like)${projectFilter}`,
      params
    );

    const datasets = queryAll(
      `SELECT *, 'dataset' as _type FROM Dataset WHERE (name LIKE :like OR description LIKE :like OR source LIKE :like)${projectFilter}`,
      params
    );

    const models = queryAll(
      `SELECT *, 'model' as _type FROM Model WHERE (name LIKE :like OR description LIKE :like OR architecture LIKE :like)${projectFilter}`,
      params
    );

    const experiments = queryAll(
      `SELECT *, 'experiment' as _type FROM Experiment WHERE (name LIKE :like OR description LIKE :like)${projectFilter}`,
      params
    );

    // Results don't have projectId directly; join through Experiment
    const resultProjectFilter = projectId
      ? ` AND r.experimentId IN (SELECT id FROM Experiment WHERE projectId = :projectId)`
      : "";
    const results = queryAll(
      `SELECT r.*, 'result' as _type FROM Result r WHERE (r.name LIKE :like OR r.metrics LIKE :like OR r.notes LIKE :like)${resultProjectFilter}`,
      params
    );

    const papers = queryAll(
      `SELECT *, 'paper' as _type FROM Paper WHERE (title LIKE :like OR abstract LIKE :like OR venue LIKE :like)${projectFilter}`,
      params
    );

    const allResults = {
      projects,
      hypotheses,
      datasets,
      models,
      experiments,
      results,
      papers,
      totalCount:
        projects.length +
        hypotheses.length +
        datasets.length +
        models.length +
        experiments.length +
        results.length +
        papers.length,
    };

    return { content: [{ type: "text", text: JSON.stringify(allResults, null, 2) }] };
  }
);

// ─── Start Server ───────────────────────────────────────────────────────────

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("[lumi-research] MCP server ready");
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
