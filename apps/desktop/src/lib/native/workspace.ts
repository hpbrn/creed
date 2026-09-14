import { Channel, invoke } from "@tauri-apps/api/core";
import { aiEnabled, subscribeAiAvailability } from "./ai-availability";
import { useSyncExternalStore } from "react";
import { reconcileSnapshot } from "./snapshot";
import { normalizeWorkspaceTimestamps } from "./timestamps";
import { createWriteQueue } from "./write-queue";
import { setCustomAgents, type CustomAgent } from "@/lib/custom-agents";

export type Section = {
  id: string;
  name: string;
  body: string;
  accent: string;
  permission: "hidden" | "read-only" | "propose" | "direct";
  archived: boolean;
  start: number;
  bodyStart: number;
  end: number;
};
export type Proposal = {
  id: string;
  sectionId: string;
  agent: string;
  reason: string;
  baseline: string;
  operation: {
    kind: string;
    body?: string;
    name?: string;
    accent?: string;
    beforeId?: string;
  };
  createdAt: number;
};
export type Document = {
  id: string;
  path: string;
  source: string;
  revision: string;
  listed: boolean;
  missing: boolean;
  sections: Section[];
  proposals: Proposal[];
  history: {
    id: string;
    source: string;
    timestamp: number;
    reason: string;
    sections?: Section[];
  }[];
  activity: {
    id: string;
    timestamp: number;
    reason: string;
    agent?: string;
    cost?: number;
    feature?: "analysis" | "panel" | "tab" | "agent";
    sectionId?: string;
    sectionName?: string;
    accent?: string;
    beforeText?: string;
    afterText?: string;
    status?: "accepted" | "rejected" | "direct";
    detail?: string;
  }[];
  connections: {
    id: string;
    agent: string;
    transport: string;
    last_seen: number;
  }[];
  analysis: unknown;
  spend: number;
};
export type Workspace = {
  customAgents?: CustomAgent[];
  documents: Document[];
  activeId: string | null;
  model: string;
  version: number;
  mcpError?: string | null;
};
let state: Workspace = {
  documents: [],
  activeId: null,
  model: "openai/gpt-4.1-mini",
  version: 1,
};
const listeners = new Set<() => void>();
const writes = createWriteQueue();
let busy = 0;
let revision = 0;
function publish(next: Workspace) {
  const reconciled = reconcileSnapshot(
    state,
    normalizeWorkspaceTimestamps(next),
  );
  if (reconciled === state) return;
  state = reconciled;
  setCustomAgents(state.customAgents ?? []);
  for (const listener of listeners) listener();
}
export const workspace = () => state;
const flushers = new Map<() => Promise<void>, number>();
export function registerFlush(flush: () => Promise<void>, priority = 1) {
  flushers.set(flush, priority);
  return () => {
    flushers.delete(flush);
  };
}
export async function flushEdits() {
  for (const [flush] of [...flushers].sort((a, b) => a[1] - b[1]))
    await flush();
  await writes.idle();
}
const subscribe = (callback: () => void) => {
  listeners.add(callback);
  return () => {
    listeners.delete(callback);
  };
};
export const useWorkspace = () => useSyncExternalStore(subscribe, workspace);
let refreshing: Promise<void> | null = null;
export async function refresh() {
  if (busy) return;
  if (refreshing) return refreshing;
  const startedAt = revision;
  refreshing = invoke<Workspace>("get_workspace")
    .then((next) => {
      if (!busy && startedAt === revision) publish(next);
    })
    .finally(() => {
      refreshing = null;
    });
  return refreshing;
}
export async function pick(create: boolean, locate?: string) {
  await flushEdits();
  busy++;
  revision++;
  try {
    const next = await invoke<Workspace | null>("pick_document", {
      create,
      locate: locate ?? null,
    });
    if (next) publish(next);
    return next !== null;
  } finally {
    busy--;
  }
}
export async function openDocumentPath(path: string, create: boolean) {
  await flushEdits();
  busy++;
  revision++;
  try {
    publish(
      await invoke<Workspace>("open_document_path", {
        path,
        create,
        locate: null,
      }),
    );
  } finally {
    busy--;
  }
}
export function action(documentId: string, operation: Record<string, unknown>) {
  busy++;
  revision++;
  const result = writes.enqueue(() =>
    invoke<Workspace>("document_action", { documentId, action: operation })
      .then((next) => {
        publish(next);
        return next;
      })
      .finally(() => {
        busy--;
      }),
  );
  return result;
}
export async function ai(
  documentId: string,
  messages: { role: string; content: string }[],
  onDelta: (delta: string) => void = () => {},
  signal?: AbortSignal,
  feature: "analysis" | "panel" | "tab" | "agent" = "panel",
  responseFormat?: Record<string, unknown>,
) {
  signal?.throwIfAborted();
  if (!aiEnabled()) throw new Error("AI is disabled.");
  const requestId = crypto.randomUUID();
  const cancel = () => {
    void invoke("cancel_ai", { requestId }).catch(() => undefined);
  };
  signal?.addEventListener("abort", cancel, { once: true });
  let disabled = false;
  const unsubscribe = subscribeAiAvailability(() => {
    if (!aiEnabled()) {
      disabled = true;
      cancel();
    }
  });
  const channel = new Channel<string>();
  channel.onmessage = (delta) => { if (!disabled) onDelta(delta); };
  try {
    const result = await invoke<{
      text: string;
      baseline: string;
      usage: { cost?: number };
    }>("ai_request", {
      documentId,
      messages,
      requestId,
      channel,
      feature,
      responseFormat,
    });
    if (disabled) throw new DOMException("Request cancelled.", "AbortError");
    return result;
  } finally {
    unsubscribe();
    signal?.removeEventListener("abort", cancel);
  }
}
export const bodyMarkdown = (section: Section) =>
  section.body.replace(/<!--\s*creed:accent=[a-z-]+\s*-->\r?\n?/g, "").trim();
export const fileName = (document: Document) =>
  document.path.split(/[\\/]/).pop() ?? "creed.md";
