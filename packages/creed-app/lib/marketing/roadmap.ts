// Only issues carrying the configured public-roadmap label can reach this
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
  priority?: unknown;
  sortOrder?: unknown;
  createdAt?: unknown;
  state?: { type?: unknown } | null;
  labels?: unknown;
};

type MappedTask = {
  task: RoadmapTask;
  stateType: string;
  sortOrder: number;
  priority: number;
  createdAt: number;
};

const PUBLIC_CARD_LABELS = new Set(["feature", "improvement"]);

function toMappedTask(
  raw: LinearIssue,
  publicRoadmapLabelId: string,
): MappedTask | null {
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
  const isPublic = rawLabels.some(
    (label) => label.id === publicRoadmapLabelId,
  );
  if (!title || !stateType || !isPublic) return null;

  return {
    stateType,
    sortOrder:
      typeof raw.sortOrder === "number"
        ? raw.sortOrder
        : Number.POSITIVE_INFINITY,
    priority:
      typeof raw.priority === "number" && raw.priority > 0
        ? raw.priority
        : Number.POSITIVE_INFINITY,
    createdAt:
      typeof raw.createdAt === "string"
        ? Date.parse(raw.createdAt)
        : Number.POSITIVE_INFINITY,
    task: {
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
  for (const raw of list) {
    const mapped = toMappedTask(raw as LinearIssue, publicRoadmapLabelId);
    if (!mapped) continue;
    const column = STATE_TYPE_TO_COLUMN[mapped.stateType];
    if (!column) continue;
    buckets[column].push(mapped);
  }

  return COLUMN_META.map((meta) => ({
    ...meta,
    tasks: buckets[meta.id]
      .sort(
        (a, b) =>
          a.sortOrder - b.sortOrder ||
          a.priority - b.priority ||
          a.createdAt - b.createdAt,
      )
      .map((mapped) => mapped.task),
  }));
}
