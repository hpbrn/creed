import { nativeRequest as fetch } from "@/lib/native/request";

import { useEffect, useMemo, useState } from "react";
import { AnimatedCheckmark } from "@/components/ui/animated-checkmark";
import { ConnectIcon } from "@/components/ui/connect";
import { CopyIcon } from "@/components/ui/copy";
import { AgentIconStack } from "@/components/creed/agent-icon-stack";
import { AnimatedIconButton } from "@/components/creed/animated-icon-action";
import { useAnimatedIconControls } from "@/components/creed/animated-icon-controls";
import { ConnectionCard } from "@/components/creed/connection-card";
import {
  Dropdown,
  McpHealthDashboard,
} from "@/components/creed/mcp-health-dashboard";
import { useCreed } from "@/components/creed/creed-provider";
import {
  AGENT_STATUS_FILTER_ITEMS,
  type AgentConnectionKind,
} from "@/lib/agent-icon";
import { splitConnectionClients } from "@/lib/connection-actions";
import { resolveConnectionStatus } from "@/lib/mcp-connection-status";
import type { AgentIconKind } from "@/lib/creed/creed-data";
import { SwapLabel } from "@/components/creed/swap-label";
import { cn } from "@/components/ui/utils";
import { AddAgent } from "@/components/creed/add-agent-dialog";
import { customAgentUrl } from "@/lib/custom-agents";

function agentsFilterEmptyLabel(status: string) {
  if (status === "all") {
    return "No agents yet.";
  }
  if (status === "not-connected") {
    return "No agents that aren't connected.";
  }
  const statusPhrase = status === "disconnected" ? "disconnected" : "connected";
  return `No ${statusPhrase} agents.`;
}

function AgentsFilterEmpty({ status }: { status: string }) {
  const { iconRef, start, settle } = useAnimatedIconControls(
    120,
    undefined,
    1800,
  );
  return (
    <div
      className="flex min-h-[156px] flex-col items-center justify-center gap-2 rounded-lg border border-[var(--creed-border)] bg-[var(--creed-surface)] px-4 text-center text-[13px] text-[var(--creed-text-tertiary)] lg:col-span-2"
      onMouseEnter={start}
      onMouseLeave={settle}
    >
      <ConnectIcon ref={iconRef} size={20} className="opacity-60" />
      <span className="font-medium opacity-60">
        {agentsFilterEmptyLabel(status)}
      </span>
    </div>
  );
}

export function ConnectionsScreen({ active = true }: { active?: boolean }) {
  const { state, refreshState } = useCreed();
  const [copied, setCopied] = useState<string | null>(null);
  const [agentStatusFilter, setAgentStatusFilter] = useState<string>("all");
  const [liveIcons, setLiveIcons] = useState<Set<string> | null>(null);
  const [revokedIcons, setRevokedIcons] = useState<Set<AgentIconKind>>(
    () => new Set(),
  );

  async function copyValue(key: string, value: string) {
    await navigator.clipboard.writeText(value);
    setCopied(key);
    window.setTimeout(() => setCopied(null), 1600);
  }

  // Keep the optimistic disconnect until a later state payload actually
  // agrees. Immediate refresh can no-op because of the sync gap or an
  // unchanged creed tick.
  useEffect(() => {
    if (revokedIcons.size === 0) return;
    const live = splitConnectionClients(state.mcpClients).mcp;
    setRevokedIcons((current) => {
      if (current.size === 0) return current;
      const next = new Set(current);
      let changed = false;
      for (const icon of current) {
        const connection = state.connections.find((item) => item.icon === icon);
        const stillConnected = connection
          ? resolveConnectionStatus(connection, live).isConnected
          : false;
        if (!stillConnected) {
          next.delete(icon);
          changed = true;
        }
      }
      return changed ? next : current;
    });
  }, [revokedIcons, state.connections, state.mcpClients]);

  const mcpAgentClients = useMemo(() => {
    const clients = splitConnectionClients(state.mcpClients).mcp;
    if (revokedIcons.size === 0) return clients;
    return clients.filter((client) => !revokedIcons.has(client.icon));
  }, [state.mcpClients, revokedIcons]);
  const connected = mcpAgentClients.length > 0;
  const mcpStatusLabel = connected ? "Connected" : "Not connected";
  const showMcpStack = connected;

  useEffect(() => {
    if (!active || !state.creedId) return;
    let cancelled = false;
    const creedId = state.creedId;
    void fetch(`/api/app/mcp/live?creedId=${encodeURIComponent(creedId)}`)
      .then(async (response) => {
        const payload = (await response.json().catch(() => ({}))) as {
          icons?: string[];
        };
        if (cancelled || !response.ok) return;
        setLiveIcons(new Set(payload.icons ?? []));
      })
      .catch(() => {
        // Keep the roster fallback instead of marking every card disconnected.
      });
    return () => {
      cancelled = true;
    };
  }, [active, state.creedId, state.mcpClients, state.connections]);

  const connectionStatuses = useMemo(() => {
    const live = liveIcons ?? undefined;
    return new Map(
      state.connections.map((connection) => {
        const status = resolveConnectionStatus(connection, mcpAgentClients, {
          revoked: revokedIcons.has(connection.icon),
          liveIcons: live,
        });
        return [connection.id, status] as const;
      }),
    );
  }, [liveIcons, mcpAgentClients, revokedIcons, state.connections]);

  const visibleConnections = useMemo(
    () =>
      state.connections.filter((connection) => {
        if (agentStatusFilter === "all") return true;
        return (
          connectionStatuses.get(connection.id)?.kind ===
          (agentStatusFilter as AgentConnectionKind)
        );
      }),
    [agentStatusFilter, connectionStatuses, state.connections],
  );

  function openLogs(icon: AgentIconKind) {
    const client = state.mcpClients.find((c) => c.icon === icon);
    window.dispatchEvent(
      new CustomEvent("creed:mcp-health-focus-agent", {
        detail: { clientId: icon.startsWith("custom:") ? icon : client?.id },
      }),
    );
  }

  async function revokeAgent(icon: AgentIconKind) {
    setRevokedIcons((current) => {
      const next = new Set(current);
      next.add(icon);
      return next;
    });
    const response = await fetch("/api/app/mcp/revoke", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ icon }),
    });
    // Throw on failure so the card's confirm dialog stays open instead of
    // closing as if the revoke succeeded.
    if (!response.ok) {
      setRevokedIcons((current) => {
        const next = new Set(current);
        next.delete(icon);
        return next;
      });
      throw new Error("Could not revoke agent access.");
    }
    try {
      await refreshState();
    } catch {
      // Keep the optimistic disconnect. Polling reconciles once the bumped
      // sync tick lands.
    }
  }

  return (
    <div
      data-connections-scroll
      className="h-full min-h-0 overflow-x-hidden overflow-y-auto bg-[var(--creed-surface)] [overflow-anchor:none] creed-scrollbar"
    >
      <div className="mx-auto max-w-[960px] overflow-hidden px-4 py-8 md:px-12 md:py-10">
        <div className="max-w-3xl">
          <h1 className="font-heading text-[1.75rem] font-medium tracking-[-0.03em] text-[var(--creed-text-primary)]">
            Connections
          </h1>
        </div>

        <div className="mt-8">
          <h2 className="text-[16px] font-medium text-[var(--creed-text-primary)]">
            Setup
          </h2>
        </div>

        <div className="mt-5 grid items-start gap-4 lg:grid-cols-2">
          <div className="flex h-full flex-col rounded-lg border border-[var(--creed-border)] bg-[var(--creed-surface)] p-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                {/* MCP glyph recoloured by the cycling palette: the asset is a
                monochrome svg, so we mask the cycling background to its
                shape rather than tinting an <img>. */}
                <span
                  aria-hidden
                  className="creed-copy-cycle inline-block h-9 w-9 shrink-0"
                  style={{
                    WebkitMaskImage: "url(/assets/agents/mcp.svg)",
                    maskImage: "url(/assets/agents/mcp.svg)",
                    WebkitMaskRepeat: "no-repeat",
                    maskRepeat: "no-repeat",
                    WebkitMaskPosition: "center",
                    maskPosition: "center",
                    WebkitMaskSize: "contain",
                    maskSize: "contain",
                  }}
                />
                <div>
                  <div className="text-[15px] font-medium text-[var(--creed-text-primary)]">
                    MCP
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-[13px] text-[var(--creed-text-secondary)]">
                    <span
                      className={cn(
                        "h-2 w-2 rounded-[3px]",
                        connected
                          ? "bg-[#16A34A]"
                          : "bg-[var(--creed-border-strong)]",
                      )}
                    />
                    <span>{mcpStatusLabel}</span>
                    {showMcpStack ? (
                      <AgentIconStack
                        agents={mcpAgentClients}
                        variant="inline"
                        className="gap-1.5"
                        itemClassName="h-4 w-4"
                        maxVisible={3}
                      />
                    ) : null}
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-auto flex flex-wrap items-center gap-3 pt-4">
              <AnimatedIconButton
                icon={CopyIcon}
                showIcon={copied !== "mcp-url"}
                className="creed-copy-cycle w-fit max-w-full justify-center rounded-md px-2.5 text-white"
                onClick={() => {
                  void copyValue("mcp-url", state.mcpUrl);
                }}
              >
                {copied === "mcp-url" ? (
                  <AnimatedCheckmark className="h-4 w-4" size={16} />
                ) : null}
                <SwapLabel
                  value={copied === "mcp-url" ? "Copied" : "Copy URL"}
                  options={["Copy URL", "Copied"]}
                />
              </AnimatedIconButton>
            </div>
          </div>
        </div>

        <div className="mt-10 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-[16px] font-medium text-[var(--creed-text-primary)]">
            Agents
          </h2>
          <div className="flex min-w-0 max-w-full items-center gap-3">
            <Dropdown
              trigger={
                AGENT_STATUS_FILTER_ITEMS.find(
                  (item) => item.key === agentStatusFilter,
                )?.label ?? "All statuses"
              }
              items={AGENT_STATUS_FILTER_ITEMS}
              selectedKey={agentStatusFilter}
              onSelect={setAgentStatusFilter}
              align="end"
              menuWidthClass="min-w-36"
            />
          </div>
        </div>

        <div className="mt-5 grid items-start gap-4 lg:grid-cols-2">
          {visibleConnections.length === 0 ? (
            <AgentsFilterEmpty status={agentStatusFilter} />
          ) : (
            visibleConnections.map((connection) => {
              const status = connectionStatuses.get(connection.id);
              const kind = status?.kind ?? "not-connected";
              return (
                <ConnectionCard
                  key={connection.id}
                  connection={connection}
                  creedId={state.creedId}
                  mcpUrl={
                    connection.id.startsWith("custom:")
                      ? customAgentUrl(state.mcpUrl, connection.id)
                      : state.mcpUrl
                  }
                  isConnected={kind === "connected"}
                  statusKind={kind}
                  lastSeen={status?.lastSeen}
                  onRevoke={() => revokeAgent(connection.icon)}
                  onLogs={() => openLogs(connection.icon)}
                />
              );
            })
          )}
          {state.creedId ? (
            <AddAgent
              creedId={state.creedId}
              fillCard={visibleConnections.length % 2 === 1}
            />
          ) : null}
        </div>

        <McpHealthDashboard active={active} />
      </div>
    </div>
  );
}
