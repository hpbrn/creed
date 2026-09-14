import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useReducer,
  useRef,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { toast } from "sonner";
import {
  initialCreedState,
  isAccentKey,
  richTextToMarkdown,
  buildVisibleCreedMarkdown,
  type CreedState,
  type CreedSection,
  type AccentKey,
  type AgentPermission,
  type ProposalDraft,
} from "@/lib/creed/creed-data";
import {
  restoreDraftFormatting,
  sectionMarkdownToHtml,
} from "@/lib/native/section-markdown";
import { getAgentDisplayName, getAgentIconKind } from "@/lib/agent-icon";
import { needsSourceEditor } from "@/lib/creed/markdown-capabilities";
import { reconcileSnapshot } from "@/lib/native/snapshot";
import {
  action,
  bodyMarkdown,
  fileName,
  flushEdits,
  refresh,
  registerFlush,
  useWorkspace,
  workspace,
  type Document,
  type Section,
} from "@/lib/native/workspace";

type Draft = { content: string; baseline: string; version: number };
const drafts = new Map<string, Draft>();
const timers = new Map<string, ReturnType<typeof setTimeout>>();
const saving = new Map<string, Promise<void>>();
const observers = new Set<() => void>();
let failed = false;
function notify() {
  for (const listener of observers) listener();
}
const draftKey = (documentId: string, sectionId: string) =>
  `creed:native-editor:${documentId}:${sectionId}`;
const sectionCache = new WeakMap<Section, CreedSection>();
const sectionContentCache = new Map<string, { body: string; content: string }>();
const recoveredDrafts = new Set<string>();
export function nativeSection(section: Section): CreedSection {
  const cached = sectionCache.get(section);
  if (cached) return cached;
  const previous = sectionContentCache.get(section.id);
  const content = previous?.body === section.body
    ? previous.content
    : sectionMarkdownToHtml(bodyMarkdown(section));
  sectionContentCache.set(section.id, { body: section.body, content });
  if (sectionContentCache.size > 512) {
    sectionContentCache.delete(sectionContentCache.keys().next().value!);
  }
  const mapped: CreedSection = {
    id: section.id,
    kind: "rich-text",
    template: "freeform",
    name: section.name,
    accent: isAccentKey(section.accent) ? section.accent : "mono",
    content,
    sourceOnly: needsSourceEditor(bodyMarkdown(section)),
    agentWritable:
      section.permission !== "read-only" && section.permission !== "hidden",
    agentPermission: section.permission,
    lastEditedBy: "You",
    lastEditedType: "user",
    lastEditedLabel: "",
    archived: section.archived,
  };
  sectionCache.set(section, mapped);
  return mapped;
}
function requireDocument(id: string): Document {
  const document = workspace().documents.find((item) => item.id === id);
  if (!document) throw new Error("This Creed is no longer open.");
  return document;
}
async function flushDraft(
  documentId: string,
  sectionId: string,
): Promise<void> {
  const key = draftKey(documentId, sectionId);
  clearTimeout(timers.get(key));
  timers.delete(key);
  if (saving.has(key)) await saving.get(key);
  const draft = drafts.get(key);
  if (!draft) return;
  if (workspace().documents.find((item) => item.id === documentId)?.missing)
    return;
  const task = (async () => {
    try {
      const result = await action(documentId, {
        kind: "body",
        sectionId,
        body: richTextToMarkdown(draft.content),
        expectedBody: draft.baseline,
      });
      const latest = drafts.get(key);
      if (latest?.version === draft.version) {
        const savedSection = workspace()
          .documents.find((item) => item.id === documentId)
          ?.sections.find((item) => item.id === sectionId);
        // Keep the editor's HTML on acknowledgement; a Markdown round trip can reset its selection.
        if (savedSection) {
          sectionCache.set(savedSection, {
            ...nativeSection(savedSection),
            content: draft.content,
          });
          sectionContentCache.set(savedSection.id, {
            body: savedSection.body,
            content: draft.content,
          });
        }
        drafts.delete(key);
        localStorage.removeItem(key);
        localStorage.removeItem(`creed:draft:${documentId}:${sectionId}`);
      } else if (latest) {
        latest.baseline = result.documents
          .find((item) => item.id === documentId)!
          .sections.find((item) => item.id === sectionId)!.body;
        localStorage.setItem(key, JSON.stringify(latest));
      }
      failed = false;
    } catch (error) {
      failed = true;
      throw error;
    } finally {
      saving.delete(key);
      notify();
    }
  })();
  saving.set(key, task);
  notify();
  await task;
  if (drafts.has(key)) await flushDraft(documentId, sectionId);
}
async function flushAllDrafts() {
  for (const key of drafts.keys()) {
    const [documentId, sectionId] = key
      .slice("creed:native-editor:".length)
      .split(":");
    await flushDraft(documentId, sectionId);
  }
}
function safe(promise: Promise<unknown>) {
  void promise.catch((error: unknown) => toast.error(String(error)));
}
function localValue<T>(key: string, fallback: T): T {
  try {
    return (JSON.parse(localStorage.getItem(key) ?? "null") as T) ?? fallback;
  } catch {
    return fallback;
  }
}
function setLocal(key: string, value: unknown) {
  localStorage.setItem(key, JSON.stringify(value));
  notify();
}

function actionsFor(documentId: string) {
  const perform = async (operation: Record<string, unknown>) => {
    await flushAllDrafts();
    return action(documentId, operation);
  };
  const sectionOperation = (kind: string, sectionId: string, data = {}) =>
    safe(
      perform({ kind, sectionId, ...data }).then(() => {
        if (kind === "archive") toast.success("Section archived.");
        if (kind === "restore") toast.success("Section restored.");
      }),
    );
  function addSection(name: string, _starter?: string): CreedSection {
    const section: CreedSection = {
      id: crypto.randomUUID(),
      kind: "rich-text",
      template: "freeform",
      name,
      accent: "stack",
      content: "",
      agentWritable: true,
      agentPermission: "propose",
      lastEditedBy: "You",
      lastEditedType: "user",
      lastEditedLabel: "just now",
    };
    safe(perform({ kind: "create", sectionId: section.id, name, body: "" }));
    return section;
  }
  const reject = (proposalId: string) =>
    safe(perform({ kind: "review", proposalId, accept: false }));
  return {
    startLocalSave: (_id: string) => {
      notify();
    },
    finishLocalSave: (_id: string, _at: number | null) => {
      notify();
    },
    toggleLock: () => {
      const key = `creed:lock:${documentId}`;
      setLocal(key, !localValue(key, false));
      setLocal(`creed:lock-overrides:${documentId}`, []);
    },
    toggleSectionLock: (sectionId: string) => {
      const key = `creed:lock-overrides:${documentId}`;
      const current = localValue<string[]>(key, []);
      setLocal(
        key,
        current.includes(sectionId)
          ? current.filter((id) => id !== sectionId)
          : [...current, sectionId],
      );
    },
    updateRichTextSection: (sectionId: string, content: string) => {
      if (!documentId) return;
      const section = requireDocument(documentId).sections.find(
        (item) => item.id === sectionId,
      );
      if (!section) {
        toast.error("This section is no longer in the file.");
        return;
      }
      const key = draftKey(documentId, sectionId);
      const previous = drafts.get(key);
      if (!previous && content === nativeSection(section).content) return;
      const draft = {
        content,
        baseline: previous?.baseline ?? section.body,
        version: (previous?.version ?? 0) + 1,
      };
      drafts.set(key, draft);
      localStorage.setItem(key, JSON.stringify(draft));
      clearTimeout(timers.get(key));
      timers.set(
        key,
        setTimeout(() => safe(flushDraft(documentId, sectionId)), 650),
      );
      notify();
    },
    reorderSections: (ids: string[]) =>
      safe(
        (async () => {
          await flushAllDrafts();
          for (let index = ids.length - 1; index >= 0; index--)
            await action(documentId, {
              kind: "reorder",
              sectionId: ids[index],
              beforeId: ids[index + 1] ?? "",
            });
        })(),
      ),
    addSection,
    addSectionAfter: (
      afterSectionId: string,
      name: string,
      _starter?: string,
    ) =>
      safe(
        (async () => {
          const current = requireDocument(documentId).sections.filter(
            (section) => !section.archived,
          );
          const nextId =
            current[
              current.findIndex((section) => section.id === afterSectionId) + 1
            ]?.id ?? "";
          const sectionId = crypto.randomUUID();
          await perform({ kind: "create", sectionId, name, body: "" });
          await action(documentId, {
            kind: "reorder",
            sectionId,
            beforeId: nextId,
          });
        })(),
      ),
    renameSection: (sectionId: string, name: string) =>
      sectionOperation("rename", sectionId, { name }),
    setSectionAccent: (sectionId: string, accent: AccentKey) =>
      sectionOperation("accent", sectionId, { accent }),
    duplicateSection: (sectionId: string) => {
      const section = requireDocument(documentId).sections.find(
        (item) => item.id === sectionId,
      );
      if (section)
        safe(
          perform({
            kind: "create",
            name: `${section.name} copy`,
            body: bodyMarkdown(section),
          }),
        );
    },
    deleteSection: (sectionId: string) => sectionOperation("delete", sectionId),
    archiveSection: (sectionId: string) =>
      sectionOperation("archive", sectionId),
    restoreSection: (sectionId: string) =>
      sectionOperation("restore", sectionId),
    archiveCreed: () =>
      safe(
        (async () => {
          for (const section of requireDocument(documentId).sections.filter(
            (section) => !section.archived,
          ))
            await perform({ kind: "archive", sectionId: section.id });
          toast.success("All sections archived.");
        })(),
      ),
    clearSections: () =>
      safe(
        perform({
          kind: "save-source",
          baseline: requireDocument(documentId).revision,
          source: "",
        }),
      ),
    acceptProposal: async (proposalId: string) => {
      await perform({ kind: "review", proposalId, accept: true });
    },
    acceptProposals: (ids: string[]) =>
      safe(perform({ kind: "review-many", proposalIds: ids })),
    rejectProposal: reject,
    dismissProposal: reject,
    withdrawProposal: reject,
    fileProposalEdit: (_sectionId: string, _content: string) => false,
    editProposalDraft: (_proposalId: string, _draft: ProposalDraft) => {
      throw new Error(
        "Connected-agent proposals cannot be rewritten by the viewer.",
      );
    },
    setSectionPermission: (sectionId: string, permission: AgentPermission) =>
      sectionOperation("permission", sectionId, { permission }),
    setAllSectionPermissions: (
      permission: "read-only" | "propose" | "direct",
    ) => safe(perform({ kind: "permissions", permission })),
    setVersionControlConfig: (
      _patch: Partial<CreedState["settings"]["versionControl"]>,
    ) => {
      throw new Error("Git is managed outside Creed.");
    },
    setDisplayName: async (name: string) => {
      await perform({ kind: "rename-file", name });
      return true;
    },
    setProfileAvatar: (url: string, _scope: "personal" | "shared" | "creed") =>
      setLocal(`creed:avatar:${documentId}`, url),
    refreshState: refresh,
    switchCreed: async (id: string) => {
      try {
        await flushEdits();
        await action(id, { kind: "switch" });
        return { ok: true };
      } catch (error) {
        await refresh().catch(() => undefined);
        return { ok: false, error: String(error) };
      }
    },
    importSections: async (sections: CreedSection[]) => {
      await perform({
        kind: "save-source",
        baseline: requireDocument(documentId).revision,
        source: buildVisibleCreedMarkdown(sections),
      });
    },
    signOut: () => {
      throw new Error("Creed has no accounts.");
    },
    deleteAccount: async () => {
      throw new Error("Creed has no accounts.");
    },
    exportMarkdown: () => requireDocument(documentId).source,
    exportActivityJson: () =>
      JSON.stringify(requireDocument(documentId).activity, null, 2),
    exportAllDataJson: () =>
      JSON.stringify(requireDocument(documentId), null, 2),
    markGettingStartedStep: (step: string) => {
      const key = `creed:started:${documentId}`;
      setLocal(key, {
        ...localValue<Record<string, boolean>>(key, {}),
        [step]: true,
      });
    },
    dismissGettingStarted: () =>
      setLocal(
        `creed:started-dismissed:${documentId}`,
        new Date().toISOString(),
      ),
  };
}
export type CreedActions = ReturnType<typeof actionsFor>;
export type CreedSyncStatus =
  "saved-locally" | "syncing" | "synced" | "offline" | "failed" | "unsaved";
export type CreedSyncSnapshot = {
  status: CreedSyncStatus;
  localSaving: boolean;
  localSaveFailed: boolean;
  localSavedAt: number | null;
};
type CreedStateStore = {
  getSnapshot: () => CreedState;
  getServerSnapshot: () => CreedState;
  subscribe: (listener: () => void) => () => void;
};
const CreedStateStoreContext = createContext<CreedStateStore | null>(null);
const CreedActionsContext = createContext<CreedActions | null>(null);
const CreedSyncStatusContext = createContext<CreedSyncSnapshot | null>(null);
const sectionPresence: Record<string, string[]> = {};

export function CreedProvider({ children }: { children: ReactNode }) {
  const native = useWorkspace();
  const [tick, force] = useReducer((value: number) => value + 1, 0);
  useEffect(() => {
    observers.add(force);
    const unregister = registerFlush(flushAllDrafts);
    return () => {
      observers.delete(force);
      unregister();
    };
  }, []);
  const document = native.documents.find((item) => item.id === native.activeId);
  const documentId = document?.id ?? "";
  const actions = useMemo(() => actionsFor(documentId), [documentId]);
  const nextState = useMemo<CreedState>(() => {
    const sections = (document?.sections ?? []).map((section) => {
      const key = draftKey(documentId, section.id);
      if (!drafts.has(key) && !recoveredDrafts.has(key)) {
        recoveredDrafts.add(key);
        const previous = localValue<{ body: string; baseline: string } | null>(
          `creed:draft:${documentId}:${section.id}`,
          null,
        );
        const recovered =
          localValue<Draft | null>(key, null) ??
          (previous
            ? {
                content: sectionMarkdownToHtml(previous.body),
                baseline: previous.baseline,
                version: 1,
              }
            : null);
        if (recovered) drafts.set(key, recovered);
      }
      const mapped = nativeSection(section);
      return drafts.has(key)
        ? {
            ...mapped,
            content: restoreDraftFormatting(
              drafts.get(key)!.content,
              mapped.content,
            ),
          }
        : mapped;
    });
    const stamp = document
      ? parseInt(document.revision.slice(0, 12), 16) || 1
      : 1;
    const proposals: CreedState["proposals"] = (document?.proposals ?? []).map(
      (proposal) => {
        const section = sections.find((item) => item.id === proposal.sectionId);
        const operation = proposal.operation;
        const draft: ProposalDraft =
          operation.kind === "create"
            ? {
                kind: "new-section",
                name: operation.name ?? "Section",
                contentMarkdown: operation.body ?? "",
              }
            : operation.kind === "delete"
              ? { kind: "delete-section" }
              : operation.kind === "rename"
                ? { kind: "rename-section", name: operation.name ?? "Section" }
                : operation.kind === "accent"
                  ? {
                      kind: "recolor-section",
                      accent: isAccentKey(operation.accent)
                        ? operation.accent
                        : "stack",
                    }
                  : operation.kind === "reorder"
                    ? (() => {
                        const others = sections.filter(
                          (item) => item.id !== proposal.sectionId,
                        );
                        const index = others.findIndex(
                          (item) => item.id === operation.beforeId,
                        );
                        return index < 0
                          ? {
                              kind: "reorder-section" as const,
                              position: "last" as const,
                            }
                          : index === 0
                            ? {
                                kind: "reorder-section" as const,
                                position: "first" as const,
                              }
                            : {
                                kind: "reorder-section" as const,
                                afterSectionId: others[index - 1].id,
                              };
                      })()
                    : {
                        kind: "rich-text",
                        contentHtml: sectionMarkdownToHtml(
                          operation.body ?? "",
                        ),
                      };
        return {
          id: proposal.id,
          sectionId: proposal.sectionId,
          sectionName: section?.name ?? operation.name ?? "Section",
          accent: section?.accent ?? "stack",
          agentName: getAgentDisplayName(proposal.agent),
          agentIdentity: proposal.agent,
          createdAt: new Date(proposal.createdAt).toISOString(),
          timeLabel: "",
          changeType: "refines-existing",
          reason: proposal.reason,
          impact: "future-responses",
          confidence: "durable",
          draft,
          status:
            proposal.baseline === document?.revision ? "pending" : "stale",
          baseRevision: stamp,
          authorType: "agent",
        };
      },
    );
    const name = document ? fileName(document) : "Creed";
    return {
      ...initialCreedState,
      creedId: documentId,
      creedType: "personal",
      shared: undefined,
      user: {
        name,
        handle: "",
        email: "",
        avatarInitials: name[0]?.toUpperCase() ?? "C",
        avatarUrl: localValue<string | undefined>(
          `creed:avatar:${documentId}`,
          undefined,
        ),
      },
      creeds: native.documents
        .filter((item) => item.listed)
        .map((item) => ({
          id: item.id,
          name: fileName(item),
          type: "personal",
          role: "owner",
          avatarInitials: fileName(item)[0].toUpperCase(),
          avatarUrl: localValue<string | undefined>(
            `creed:avatar:${item.id}`,
            undefined,
          ),
        })),
      sections: document
        ? sections
        : [
            {
              id: "new-creed-identity",
              kind: "rich-text",
              template: "freeform",
              name: "Identity",
              accent: "stack",
              content: "",
              agentWritable: true,
              agentPermission: "propose",
              lastEditedBy: "You",
              lastEditedType: "user",
              lastEditedLabel: "",
            },
          ],
      proposals,
      sourcePreamble: document
        ? new TextDecoder().decode(
            new TextEncoder()
              .encode(document.source)
              .slice(
                0,
                document.sections.find((section) => !section.archived)?.start ??
                  undefined,
              ),
          )
        : "",
      locked:
        !document ||
        document.missing ||
        localValue(`creed:lock:${documentId}`, false),
      sectionLockOverrides: document?.missing
        ? []
        : localValue<string[]>(`creed:lock-overrides:${documentId}`, []),
      readUrl: "",
      readToken: "",
      writeToken: "",
      directEditToken: "",
      mcpUrl: document ? `http://127.0.0.1:38473/mcp/${document.id}` : "",
      mcpStatus: document?.connections.length ? "connected" : "waiting",
      mcpClients: (document?.connections ?? []).map((connection) => ({
        id: connection.id,
        name: getAgentDisplayName(connection.agent),
        icon: getAgentIconKind(connection.agent),
        lastUsed: new Date(connection.last_seen).toISOString(),
      })),
      connections: initialCreedState.connections
        .filter((connection) =>
          [
            "codex",
            "claudecode",
            "cursor",
            "opencode",
            "goose",
            "factory",
            "openclaw",
            "hermes",
            "grokbot",
            "devin",
          ].includes(connection.id),
        )
        .map((connection) => ({
          ...connection,
          description:
            connection.id === "grokbot" || connection.id === "devin"
              ? connection.description
              : `Connect ${connection.name} on this Mac.`,
          connectHint:
            connection.id === "grokbot" || connection.id === "devin"
              ? connection.connectHint
              : "Add the local MCP URL to your agent. Keep Creed running. No browser authorization is required.",
          status: document?.connections.some(
            (item) => getAgentIconKind(item.agent) === connection.icon,
          )
            ? ("connected" as const)
            : ("not-connected" as const),
        }))
        .concat(
          (native.customAgents ?? []).map((agent) => ({
            id: `custom:${agent.id}`,
            name: agent.name,
            icon: `custom:${agent.id}` as const,
            description: `Connect ${agent.name} on this Mac.`,
            connectHint:
              "Use this agent's connection URL to keep its attribution separate.",
            status: document?.connections.some(
              (connection) => connection.agent === `custom:${agent.id}`,
            )
              ? ("connected" as const)
              : ("not-connected" as const),
          })),
        ),
      activity: (document?.activity ?? [])
        .filter(
          (entry) =>
            entry.reason !== "AI request" && entry.reason !== "Agent read",
        )
        .map((entry) => ({
          id: entry.id,
          createdAt: new Date(entry.timestamp).toISOString(),
          dayLabel: new Date(entry.timestamp).toLocaleDateString(),
          sectionId: entry.sectionId ?? "",
          sectionName: entry.sectionName ?? "Creed",
          accent: isAccentKey(entry.accent) ? entry.accent : "stack",
          actor: entry.agent ? getAgentDisplayName(entry.agent) : "You",
          agentIdentity: entry.agent,
          actorType: entry.agent ? "agent" : "user",
          summary: entry.reason,
          timeLabel: new Date(entry.timestamp).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          }),
          status: entry.status ?? "direct",
          changeType: "refines-existing",
          reason: entry.detail ?? entry.reason,
          impact: "future-responses",
          confidence: "durable",
          beforeText: entry.beforeText,
          afterText: entry.afterText ?? "",
        })),
      saving: saving.size > 0,
      lastSavedAt: document?.history.at(-1)?.timestamp ?? null,
      mutationTick: tick,
      sectionRevisions: Object.fromEntries(
        sections.map((section) => [section.id, stamp]),
      ),
      gettingStarted: {
        steps: localValue(`creed:started:${documentId}`, {}),
        completedAt: null,
        dismissedAt: localValue(`creed:started-dismissed:${documentId}`, null),
      },
    };
  }, [native, document, documentId, tick]);
  const stateSnapshotRef = useRef(nextState);
  const state = reconcileSnapshot(stateSnapshotRef.current, nextState);
  stateSnapshotRef.current = state;
  const stateListenersRef = useRef(new Set<() => void>());
  const stateStore = useMemo<CreedStateStore>(
    () => ({
      getSnapshot: () => stateSnapshotRef.current,
      getServerSnapshot: () => stateSnapshotRef.current,
      subscribe: (listener) => {
        stateListenersRef.current.add(listener);
        return () => {
          stateListenersRef.current.delete(listener);
        };
      },
    }),
    [],
  );
  useLayoutEffect(() => {
    for (const listener of stateListenersRef.current) listener();
  }, [state]);
  const syncStatus: CreedSyncStatus = failed
    ? "failed"
    : saving.size
      ? "syncing"
      : drafts.size
        ? "syncing"
        : "synced";
  const syncSnapshot = useMemo<CreedSyncSnapshot>(
    () => ({
      status: syncStatus,
      localSaving: state.saving,
      localSaveFailed: syncStatus === "failed",
      localSavedAt: state.lastSavedAt,
    }),
    [syncStatus, state.saving, state.lastSavedAt],
  );
  return (
    <CreedStateStoreContext.Provider value={stateStore}>
      <CreedActionsContext.Provider value={actions}>
        <CreedSyncStatusContext.Provider value={syncSnapshot}>
          {children}
        </CreedSyncStatusContext.Provider>
      </CreedActionsContext.Provider>
    </CreedStateStoreContext.Provider>
  );
}
export function useCreed() {
  const state = useCreedStateSelector((snapshot) => snapshot);
  const actions = useCreedActions();
  return useMemo(
    () => ({ state, sectionPresence, ...actions }),
    [state, actions],
  );
}
export function useCreedActions() {
  const actions = useContext(CreedActionsContext);
  if (!actions) throw new Error("CreedProvider is required.");
  return actions;
}
export function useCreedStateSelector<T>(
  selector: (state: CreedState) => T,
  equals: (a: T, b: T) => boolean = Object.is,
): T {
  const store = useContext(CreedStateStoreContext);
  if (!store) throw new Error("CreedProvider is required.");
  const selectionRef = useRef<{
    state: CreedState;
    value: T;
    selector: (state: CreedState) => T;
    equals: (a: T, b: T) => boolean;
  } | null>(null);
  const getSelection = useCallback(() => {
    const snapshot = store.getSnapshot();
    const previous = selectionRef.current;
    if (
      previous?.state === snapshot &&
      previous.selector === selector &&
      previous.equals === equals
    )
      return previous.value;
    const selected = selector(snapshot);
    const value =
      previous && equals(previous.value, selected) ? previous.value : selected;
    selectionRef.current = { state: snapshot, value, selector, equals };
    return value;
  }, [store, selector, equals]);
  const getServerSelection = useCallback(
    () => selector(store.getServerSnapshot()),
    [store, selector],
  );
  return useSyncExternalStore(
    store.subscribe,
    getSelection,
    getServerSelection,
  );
}
export function useCreedSyncStatus(): CreedSyncSnapshot {
  const snapshot = useContext(CreedSyncStatusContext);
  if (!snapshot) throw new Error("CreedProvider is required.");
  return snapshot;
}
