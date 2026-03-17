// Pipeline stage definitions and default tasks

export const PIPELINE_STAGES = [
  { id: "define", label: "DEFINE", color: "#a78bfa", description: "Define the research problem" },
  { id: "survey", label: "SURVEY", color: "#4cc9f0", description: "Literature review & SOTA", agent: "scout" },
  { id: "plan", label: "PLAN", color: "#34d399", description: "Implementation plan & baselines", agent: "planner" },
  { id: "hypothesize", label: "HYPOTHESIZE", color: "#fbbf24", description: "Form testable hypotheses", agent: "theorist" },
  { id: "design", label: "DESIGN", color: "#f472b6", description: "Design experiments", agent: "architect" },
  { id: "implement", label: "IMPLEMENT", color: "#fb923c", description: "Code implementation", agent: "coder" },
  { id: "data_prep", label: "DATA PREP", color: "#06b6d4", description: "Build & prepare datasets", agent: "datasmith" },
  { id: "execute", label: "EXECUTE", color: "#ef4444", description: "Run experiments & analyze" },
  { id: "write", label: "WRITE", color: "#e879f9", description: "Write & publish paper", agent: "writer" },
] as const;

export type StageId = (typeof PIPELINE_STAGES)[number]["id"];

export const AGENT_ROLES = {
  scout: {
    name: "Scout",
    title: "Literature Scout",
    description: "Searches and analyzes SOTA papers, identifies trends and gaps",
    color: "#4cc9f0",
    stage: "survey",
  },
  planner: {
    name: "Planner",
    title: "Implementation Planner",
    description: "Plans data prep, baseline experiments, and golden test sets",
    color: "#34d399",
    stage: "plan",
  },
  theorist: {
    name: "Theorist",
    title: "Hypothesis Theorist",
    description: "Formulates testable hypotheses from survey findings",
    color: "#fbbf24",
    stage: "hypothesize",
  },
  architect: {
    name: "Architect",
    title: "Experiment Architect",
    description: "Designs experiment plans, baselines, and ablation studies",
    color: "#f472b6",
    stage: "design",
  },
  coder: {
    name: "Coder",
    title: "Implementation Coder",
    description: "Plans and writes code for experiments",
    color: "#fb923c",
    stage: "implement",
  },
  datasmith: {
    name: "Data Smith",
    title: "Dataset Engineer",
    description: "Builds, curates, and validates training datasets",
    color: "#06b6d4",
    stage: "data_prep",
  },
  writer: {
    name: "Writer",
    title: "Paper Writer",
    description: "Writes and updates LaTeX paper sections directly on Overleaf",
    color: "#e879f9",
    stage: "write",
  },
  documenter: {
    name: "Documenter",
    title: "Documentation Agent",
    description: "Continuously syncs project documentation to Notion",
    color: "#f59e0b",
    stage: null,
  },
  commander: {
    name: "Commander",
    title: "Mission Commander",
    description: "Coordinates all agents and tracks overall progress",
    color: "#a78bfa",
    stage: null,
  },
} as const;

export type AgentRole = keyof typeof AGENT_ROLES;

export const DEFAULT_TASKS: Array<{
  title: string;
  stage: StageId;
  type: "manual" | "agent";
  agentRole?: AgentRole;
  order: number;
}> = [
  // DEFINE
  { title: "Write problem statement", stage: "define", type: "manual", order: 0 },
  { title: "Define research scope", stage: "define", type: "manual", order: 1 },
  { title: "Set motivation & impact", stage: "define", type: "manual", order: 2 },
  // SURVEY
  { title: "Literature review", stage: "survey", type: "agent", agentRole: "scout", order: 0 },
  { title: "SOTA analysis", stage: "survey", type: "agent", agentRole: "scout", order: 1 },
  { title: "Identify research gaps", stage: "survey", type: "agent", agentRole: "scout", order: 2 },
  // PLAN
  { title: "Plan data preparation pipeline", stage: "plan", type: "agent", agentRole: "planner", order: 0 },
  { title: "Design baseline experiments", stage: "plan", type: "agent", agentRole: "planner", order: 1 },
  { title: "Define golden test set", stage: "plan", type: "agent", agentRole: "planner", order: 2 },
  { title: "Define success criteria & metrics", stage: "plan", type: "agent", agentRole: "planner", order: 3 },
  // HYPOTHESIZE
  { title: "Generate hypotheses", stage: "hypothesize", type: "agent", agentRole: "theorist", order: 0 },
  { title: "Prioritize hypotheses", stage: "hypothesize", type: "manual", order: 1 },
  // DESIGN
  { title: "Design experiments", stage: "design", type: "agent", agentRole: "architect", order: 0 },
  { title: "Define baselines", stage: "design", type: "agent", agentRole: "architect", order: 1 },
  { title: "Plan ablation studies", stage: "design", type: "manual", order: 2 },
  // IMPLEMENT
  { title: "Implementation plan", stage: "implement", type: "agent", agentRole: "coder", order: 0 },
  { title: "Core implementation", stage: "implement", type: "agent", agentRole: "coder", order: 1 },
  { title: "Code review", stage: "implement", type: "manual", order: 2 },
  // DATA PREP
  { title: "Build training dataset", stage: "data_prep", type: "agent", agentRole: "datasmith", order: 0 },
  { title: "Data validation", stage: "data_prep", type: "agent", agentRole: "datasmith", order: 1 },
  { title: "Data augmentation", stage: "data_prep", type: "manual", order: 2 },
  // EXECUTE
  { title: "Run experiments", stage: "execute", type: "manual", order: 0 },
  { title: "Analyze results", stage: "execute", type: "manual", order: 1 },
  { title: "Document findings", stage: "execute", type: "manual", order: 2 },
  // WRITE
  { title: "Draft introduction & related work", stage: "write", type: "agent", agentRole: "writer", order: 0 },
  { title: "Write method section", stage: "write", type: "agent", agentRole: "writer", order: 1 },
  { title: "Write experiments & results", stage: "write", type: "agent", agentRole: "writer", order: 2 },
  { title: "Write abstract & conclusion", stage: "write", type: "agent", agentRole: "writer", order: 3 },
];
