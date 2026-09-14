import type { Document } from "./workspace";
import { getAgentDisplayName, getAgentIconKind } from "@/lib/agent-icon";
import type {
  McpHealthSummary,
  McpHealthDay,
  McpHealthRange,
} from "@/components/creed/mcp-health-preload";

export function healthSummary(
  document: Document,
  requestedRange: string,
  now = Date.now(),
): McpHealthSummary {
  const range: McpHealthRange = ["7d", "30d", "90d", "all"].includes(
    requestedRange,
  )
    ? (requestedRange as McpHealthRange)
    : "30d";
  const since = range === "all" ? 0 : now - Number.parseInt(range) * 86_400_000;
  const activity = document.activity.filter(
    (entry) => entry.agent && entry.timestamp >= since,
  );
  const proposals = document.proposals.filter(
    (entry) => entry.createdAt >= since,
  );
  const agentGroups = new Map<
    string,
    { clientId: string; aliases: Set<string> }
  >();
  for (const name of [
    ...document.connections.map((entry) => entry.agent),
    ...activity.map((entry) => entry.agent!),
    ...proposals.map((entry) => entry.agent),
  ]) {
    const identity = getAgentDisplayName(name).trim().toLocaleLowerCase();
    const group = agentGroups.get(identity) ?? {
      clientId: name,
      aliases: new Set<string>(),
    };
    group.aliases.add(name);
    agentGroups.set(identity, group);
  }
  const days = new Map<string, McpHealthDay>();
  const sections = new Map<string, McpHealthSummary["sections"][number]>();
  const agents = [...agentGroups.values()].map(({ clientId, aliases }) => {
    const connections = document.connections.filter(
      (entry) => aliases.has(entry.agent),
    );
    const entries = activity.filter((entry) => aliases.has(entry.agent!));
    const pending = proposals.filter((entry) => aliases.has(entry.agent));
    const accepted = entries.filter(
      (entry) => entry.status === "accepted",
    ).length;
    const rejected = entries.filter(
      (entry) => entry.status === "rejected",
    ).length;
    const lastSeen = Math.max(
      0,
      ...connections.map((entry) => entry.last_seen),
      ...entries.map((entry) => entry.timestamp),
    );
    return {
      clientId,
      name: getAgentDisplayName(clientId),
      icon: getAgentIconKind(clientId),
      lastSeen: lastSeen ? new Date(lastSeen).toISOString() : undefined,
      reads: entries.filter((entry) => entry.reason === "Agent read").length,
      directs: entries.filter((entry) => entry.status === "direct").length,
      proposals: pending.length + accepted + rejected,
      accepted,
      rejected,
      pending: pending.length,
    };
  });
  const clientIdFor = (agent: string) =>
    agentGroups.get(getAgentDisplayName(agent).trim().toLocaleLowerCase())!
      .clientId;
  function record(
    timestamp: number,
    agent: string,
    metric: "reads" | "directs" | "accepted" | "rejected" | "pending",
    sectionId?: string,
  ) {
    const date = new Date(timestamp).toISOString().slice(0, 10);
    const day = days.get(date) ?? {
      date,
      reads: 0,
      directs: 0,
      proposals: 0,
      accepted: 0,
      rejected: 0,
      pending: 0,
      readsByAgent: {},
      directsByAgent: {},
      proposalsByAgent: {},
      acceptedByAgent: {},
      rejectedByAgent: {},
      pendingByAgent: {},
    };
    day[metric]++;
    const byAgent = day[`${metric}ByAgent`];
    byAgent[agent] = (byAgent[agent] ?? 0) + 1;
    if (["accepted", "rejected", "pending"].includes(metric)) {
      day.proposals++;
      day.proposalsByAgent[agent] = (day.proposalsByAgent[agent] ?? 0) + 1;
    }
    days.set(date, day);
    if (sectionId && metric !== "reads") {
      const section = document.sections.find((entry) => entry.id === sectionId);
      const value = sections.get(sectionId) ?? {
        sectionId,
        sectionName: section?.name ?? "Removed section",
        accent: section?.accent ?? "stack",
        count: 0,
        byAgent: {},
      };
      value.count++;
      value.byAgent[agent] = (value.byAgent[agent] ?? 0) + 1;
      sections.set(sectionId, value);
    }
  }
  for (const entry of activity) {
    const metric =
      entry.reason === "Agent read"
        ? "reads"
        : entry.status === "direct"
          ? "directs"
          : entry.status;
    if (metric)
      record(
        entry.timestamp,
        clientIdFor(entry.agent!),
        metric,
        entry.sectionId,
      );
  }
  for (const entry of proposals)
    record(
      entry.createdAt,
      clientIdFor(entry.agent),
      "pending",
      entry.sectionId,
    );
  const sum = (
    metric:
      "reads" | "directs" | "proposals" | "accepted" | "rejected" | "pending",
  ) => agents.reduce((total, agent) => total + agent[metric], 0);
  const accepted = sum("accepted"),
    rejected = sum("rejected");
  return {
    range,
    totals: {
      agents: agents.length,
      newAgents: 0,
      reads: sum("reads"),
      directs: sum("directs"),
      proposals: sum("proposals"),
      accepted,
      rejected,
      pending: sum("pending"),
      acceptRate: accepted + rejected ? accepted / (accepted + rejected) : null,
    },
    days: [...days.values()].sort((a, b) => a.date.localeCompare(b.date)),
    agents,
    sections: [...sections.values()].sort((a, b) => b.count - a.count),
  };
}
