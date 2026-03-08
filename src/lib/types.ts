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
  active: "bg-green-900/60 text-green-400 border border-green-700",
  paused: "bg-yellow-900/60 text-yellow-400 border border-yellow-700",
  completed: "bg-blue-900/60 text-blue-400 border border-blue-700",
  archived: "bg-gray-800/60 text-gray-400 border border-gray-600",
  // Hypothesis
  proposed: "bg-purple-900/60 text-purple-400 border border-purple-700",
  testing: "bg-orange-900/60 text-orange-400 border border-orange-700",
  supported: "bg-green-900/60 text-green-400 border border-green-700",
  refuted: "bg-red-900/60 text-red-400 border border-red-700",
  revised: "bg-indigo-900/60 text-indigo-400 border border-indigo-700",
  // Experiment
  planned: "bg-slate-800/60 text-slate-400 border border-slate-600",
  running: "bg-amber-900/60 text-amber-400 border border-amber-700",
  failed: "bg-red-900/60 text-red-400 border border-red-700",
  // Result
  preliminary: "bg-yellow-900/60 text-yellow-400 border border-yellow-700",
  validated: "bg-emerald-900/60 text-emerald-400 border border-emerald-700",
  published: "bg-blue-900/60 text-blue-400 border border-blue-700",
  // Paper
  idea: "bg-violet-900/60 text-violet-400 border border-violet-700",
  drafting: "bg-orange-900/60 text-orange-400 border border-orange-700",
  review: "bg-cyan-900/60 text-cyan-400 border border-cyan-700",
  submitted: "bg-teal-900/60 text-teal-400 border border-teal-700",
};

export const PIPELINE_STAGES = [
  { key: "hypotheses", label: "Hypotheses", icon: "Lightbulb" },
  { key: "datasets", label: "Datasets", icon: "Database" },
  { key: "models", label: "Models", icon: "Brain" },
  { key: "experiments", label: "Experiments", icon: "FlaskConical" },
  { key: "results", label: "Results", icon: "BarChart3" },
  { key: "papers", label: "Papers", icon: "FileText" },
] as const;
