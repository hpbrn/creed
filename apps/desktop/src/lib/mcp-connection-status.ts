import type { ConnectionItem, McpClient } from "@/lib/creed/creed-data";
import {
  CLI_ATTRIBUTABLE_AGENT_IDS,
  getAgentIconKind,
  type AgentConnectionKind,
} from "./agent-icon.ts";

type OAuthTokenIdentity = {
  id: string;
  client_id: string;
};

export function getGrantedClientIds(
  activeTokens: OAuthTokenIdentity[],
  grantedTokenIds: ReadonlySet<string>,
) {
  return [
    ...new Set(
      activeTokens
        .filter((token) => grantedTokenIds.has(token.id))
        .map((token) => token.client_id),
    ),
  ];
}

export function hasActiveConnectionIcon({
  icon,
  oauthClientNames,
  rosterClientNames = [],
}: {
  icon: string;
  oauthClientNames: string[];
  rosterClientNames?: string[];
}) {
  if (oauthClientNames.some((name) => getAgentIconKind(name) === icon)) {
    return true;
  }

  const hasGenericClient = oauthClientNames.some(
    (name) => name.trim().toLowerCase() === "mcp client",
  );
  return (
    hasGenericClient &&
    rosterClientNames.some((name) => getAgentIconKind(name) === icon)
  );
}

export function listLiveConnectionIcons(
  oauthClientNames: string[],
  rosterClientNames: string[] = [],
) {
  const icons = new Set<string>();
  let hasGenericClient = false;
  for (const name of oauthClientNames) {
    if (name.trim().toLowerCase() === "mcp client") {
      hasGenericClient = true;
      continue;
    }
    icons.add(getAgentIconKind(name));
  }
  if (hasGenericClient) {
    for (const name of rosterClientNames) {
      icons.add(getAgentIconKind(name));
    }
  }
  return [...icons];
}

// Per-card MCP status. A live OAuth token (or the MCP roster before that
// check lands) is Connected. Revoke writes not-connected. Anything that used
// to be connected and then dropped off without revoke is Disconnected.
export function resolveConnectionStatus(
  connection: ConnectionItem,
  mcpClients: McpClient[],
  options?: { revoked?: boolean; liveIcons?: ReadonlySet<string> },
): {
  kind: AgentConnectionKind;
  isConnected: boolean;
  lastSeen?: string;
} {
  if (options?.revoked) {
    return { kind: "not-connected", isConnected: false };
  }
  const matched = mcpClients.find((client) => client.icon === connection.icon);
  const lastSeen = matched?.lastUsed ?? connection.lastUsed;
  const live = options?.liveIcons
    ? options.liveIcons.has(connection.icon)
    : Boolean(matched);
  if (live) {
    return { kind: "connected", isConnected: true, lastSeen };
  }
  if (connection.status === "not-connected") {
    return { kind: "not-connected", isConnected: false };
  }
  if (connection.status === "connected" || lastSeen) {
    return { kind: "disconnected", isConnected: false, lastSeen };
  }
  return { kind: "not-connected", isConnected: false };
}

export function resolveCliAgentStatuses(
  activeTokenIds: ReadonlySet<string>,
  rows: Array<{ clientId: string; lastSeenAt: string | null }>,
) {
  const agents: Record<string, { lastSeenAt: string | null }> = {};
  for (const row of rows) {
    if (!row.clientId.startsWith("cli-")) continue;
    const agentIcon = CLI_ATTRIBUTABLE_AGENT_IDS.find((id) =>
      row.clientId.endsWith(`-${id}`),
    );
    if (!agentIcon) continue;
    const suffix = `-${agentIcon}`;
    const tokenId = row.clientId.slice(4, -suffix.length);
    if (!activeTokenIds.has(tokenId)) continue;
    const existing = agents[agentIcon]?.lastSeenAt;
    if (!existing || (row.lastSeenAt && row.lastSeenAt > existing)) {
      agents[agentIcon] = { lastSeenAt: row.lastSeenAt };
    }
  }
  return agents;
}
