export const PROJECT_STATUSES = ["active", "paused", "completed", "archived"] as const;
export const HYPOTHESIS_STATUSES = ["proposed", "testing", "supported", "refuted", "revised"] as const;
export const EXPERIMENT_STATUSES = ["planned", "running", "completed", "failed"] as const;
export const RESULT_STATUSES = ["preliminary", "validated", "published"] as const;
export const PAPER_STATUSES = ["idea", "drafting", "review", "submitted", "published"] as const;

export type ProjectStatus = (typeof PROJECT_STATUSES)[number];
export type HypothesisStatus = (typeof HYPOTHESIS_STATUSES)[number];
export type ExperimentStatus = (typeof EXPERIMENT_STATUSES)[number];
export type ResultStatus = (typeof RESULT_STATUSES)[number];
export type PaperStatus = (typeof PAPER_STATUSES)[number];

export const STATUS_COLORS: Record<string, string> = {
  // Project
  active: "bg-green-100 text-green-800",
  paused: "bg-yellow-100 text-yellow-800",
  completed: "bg-blue-100 text-blue-800",
  archived: "bg-gray-100 text-gray-800",
  // Hypothesis
  proposed: "bg-purple-100 text-purple-800",
  testing: "bg-orange-100 text-orange-800",
  supported: "bg-green-100 text-green-800",
  refuted: "bg-red-100 text-red-800",
  revised: "bg-indigo-100 text-indigo-800",
  // Experiment
  planned: "bg-slate-100 text-slate-800",
  running: "bg-amber-100 text-amber-800",
  failed: "bg-red-100 text-red-800",
  // Result
  preliminary: "bg-yellow-100 text-yellow-800",
  validated: "bg-emerald-100 text-emerald-800",
  published: "bg-blue-100 text-blue-800",
  // Paper
  idea: "bg-violet-100 text-violet-800",
  drafting: "bg-orange-100 text-orange-800",
  review: "bg-cyan-100 text-cyan-800",
  submitted: "bg-teal-100 text-teal-800",
};

export const PIPELINE_STAGES = [
  { key: "hypotheses", label: "Hypotheses", icon: "Lightbulb" },
  { key: "datasets", label: "Datasets", icon: "Database" },
  { key: "models", label: "Models", icon: "Brain" },
  { key: "experiments", label: "Experiments", icon: "FlaskConical" },
  { key: "results", label: "Results", icon: "BarChart3" },
  { key: "papers", label: "Papers", icon: "FileText" },
] as const;
