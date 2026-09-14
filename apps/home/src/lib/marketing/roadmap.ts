// Only issues carrying the configured public label can reach this
// mapper. Descriptions are published verbatim, so promotion into that label is
// a publication decision.

export type RoadmapColumnId = "shipped" | "in_progress" | "next";

const STATE_TYPE_TO_COLUMN: Record<string, RoadmapColumnId> = {
  completed: "shipped",
  started: "in_progress",
  backlog: "next",
  unstarted: "next",
};

export type RoadmapTask = {
  id: string;
  title: string;
  description: string | null;
  labels: string[];
  createdAt: number;
};

export type RoadmapColumn = {
  id: RoadmapColumnId;
  label: string;
  tasks: RoadmapTask[];
};

const COLUMN_META: Omit<RoadmapColumn, "tasks">[] = [
  { id: "next", label: "Next" },
  { id: "in_progress", label: "In Progress" },
  { id: "shipped", label: "Shipped" },
];

type LinearIssueLabel = {
  id?: unknown;
  name?: unknown;
};

type LinearIssue = {
  id?: unknown;
  title?: unknown;
  description?: unknown;
  createdAt?: unknown;
  state?: { type?: unknown } | null;
  labels?: unknown;
};

type MappedTask = {
  task: RoadmapTask;
  stateType: string;
};

const PUBLIC_CARD_LABELS = new Set(["feature", "improvement", "bug"]);

function toMappedTask(
  raw: LinearIssue,
  publicRoadmapLabelId: string,
): MappedTask | null {
  if (!raw || typeof raw !== "object") return null;
  const title = typeof raw.title === "string" ? raw.title.trim() : "";
  const stateType =
    raw.state && typeof raw.state.type === "string" ? raw.state.type : "";
  const rawLabels =
    raw.labels &&
    typeof raw.labels === "object" &&
    "nodes" in raw.labels &&
    Array.isArray(raw.labels.nodes)
      ? (raw.labels.nodes as LinearIssueLabel[])
      : [];
  const isPublic = rawLabels.some((label) => label.id === publicRoadmapLabelId);
  if (!title || !stateType || !isPublic) return null;

  return {
    stateType,
    task: {
      createdAt:
        typeof raw.createdAt === "string" &&
        Number.isFinite(Date.parse(raw.createdAt))
          ? Date.parse(raw.createdAt)
          : 0,
      id: typeof raw.id === "string" ? raw.id : `${stateType}-${title}`,
      title,
      description:
        typeof raw.description === "string" && raw.description.trim()
          ? raw.description.trim()
          : null,
      labels: rawLabels
        .map((label) =>
          typeof label.name === "string" ? label.name.toLocaleLowerCase() : "",
        )
        .filter((label) => PUBLIC_CARD_LABELS.has(label)),
    },
  };
}

export function groupLinearIssuesIntoColumns(
  rawIssues: unknown,
  publicRoadmapLabelId: string,
): RoadmapColumn[] {
  const buckets: Record<RoadmapColumnId, MappedTask[]> = {
    shipped: [],
    in_progress: [],
    next: [],
  };

  const list = Array.isArray(rawIssues) ? rawIssues : [];
  const seen = new Set<string>();
  const selected = list
    .map((raw) => toMappedTask(raw as LinearIssue, publicRoadmapLabelId))
    .filter((mapped): mapped is MappedTask =>
      Boolean(mapped && STATE_TYPE_TO_COLUMN[mapped.stateType]),
    )
    .sort(
      (a, b) =>
        b.task.createdAt - a.task.createdAt ||
        a.task.id.localeCompare(b.task.id),
    )
    .filter(({ task }) => {
      if (seen.has(task.id)) return false;
      seen.add(task.id);
      return true;
    })
    .slice(0, 3);
  for (const mapped of selected) {
    const column = STATE_TYPE_TO_COLUMN[mapped.stateType];
    if (!column) continue;
    buckets[column].push(mapped);
  }

  return COLUMN_META.map((meta) => ({
    ...meta,
    tasks: buckets[meta.id].map((mapped) => mapped.task),
  }));
}
