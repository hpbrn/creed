import type { Workspace } from "./workspace";

export function timestampMilliseconds(value: number): number {
  return value > 0 && value < 100_000_000_000 ? value * 1000 : value;
}

export function normalizeWorkspaceTimestamps(workspace: Workspace): Workspace {
  return {
    ...workspace,
    documents: workspace.documents.map((document) => ({
      ...document,
      history: document.history.map((entry) => ({
        ...entry,
        timestamp: timestampMilliseconds(entry.timestamp),
      })),
      activity: document.activity.map((entry) => ({
        ...entry,
        timestamp: timestampMilliseconds(entry.timestamp),
      })),
      proposals: document.proposals.map((entry) => ({
        ...entry,
        createdAt: timestampMilliseconds(entry.createdAt),
      })),
      connections: document.connections.map((entry) => ({
        ...entry,
        last_seen: timestampMilliseconds(entry.last_seen),
      })),
    })),
  };
}
