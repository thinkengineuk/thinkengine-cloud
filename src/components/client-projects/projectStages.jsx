export const STAGES = [
  { key: "Project Commencement", label: "Project Commencement", pct: 0 },
  { key: "Part 1 - Client Requirements Call", label: "Part 1 — Client Requirements Call", pct: 14 },
  { key: "Part 2 - SoW Sign Off / Homepage Design", label: "Part 2 — SoW Sign Off / Homepage Design", pct: 28 },
  { key: "Part 3 - Main Development", label: "Part 3 — Main Development", pct: 42 },
  { key: "Part 4 - Client Testing & Refinement", label: "Part 4 — Client Testing & Refinement", pct: 57 },
  { key: "Part 5 - Changes from Client Testing", label: "Part 5 — Changes from Client Testing", pct: 71 },
  { key: "Part 6 - Go Live Planning / DNS", label: "Part 6 — Go Live Planning / DNS", pct: 85 },
  { key: "Part 7 - Go Live & Handover", label: "Part 7 — Go Live & Handover", pct: 100 },
  { key: "Completed", label: "Completed", pct: 100 },
];

export function getStagePct(stageKey) {
  const s = STAGES.find(s => s.key === stageKey);
  return s ? s.pct : 0;
}

/**
 * Given a project, estimate the end date based on the velocity so far.
 * If less than 14% done (i.e. only commencement), return null.
 */
export function estimateEndDate(project) {
  const pct = getStagePct(project.current_stage);
  if (!project.start_date || pct < 14 || pct >= 100) return null;

  const start = new Date(project.start_date);
  const now = new Date();
  const daysElapsed = Math.max(1, Math.floor((now - start) / (1000 * 60 * 60 * 24)));
  const totalEstimatedDays = Math.round((daysElapsed / pct) * 100);
  const estimatedEnd = new Date(start);
  estimatedEnd.setDate(estimatedEnd.getDate() + totalEstimatedDays);
  return estimatedEnd;
}

export const STAGE_COLUMNS = [
  "Project Commencement",
  "Part 1 - Client Requirements Call",
  "Part 2 - SoW Sign Off / Homepage Design",
  "Part 3 - Main Development",
  "Part 4 - Client Testing & Refinement",
  "Part 5 - Changes from Client Testing",
  "Part 6 - Go Live Planning / DNS",
  "Part 7 - Go Live & Handover",
  "Completed",
];

export const COLOR_MAP = {
  blue: "from-blue-400 to-blue-600",
  purple: "from-purple-400 to-purple-600",
  green: "from-green-400 to-green-600",
  orange: "from-orange-400 to-orange-600",
  pink: "from-pink-400 to-pink-600",
  teal: "from-teal-400 to-teal-600",
  indigo: "from-indigo-400 to-indigo-600",
  red: "from-red-400 to-red-600",
};

export const PROGRESS_COLOR = {
  blue: "bg-blue-500",
  purple: "bg-purple-500",
  green: "bg-green-500",
  orange: "bg-orange-500",
  pink: "bg-pink-500",
  teal: "bg-teal-500",
  indigo: "bg-indigo-500",
  red: "bg-red-500",
};