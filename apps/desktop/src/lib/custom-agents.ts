export type CustomAgent = { id: string; name: string; icon: string | null };

let agents: readonly CustomAgent[] = [];

export function setCustomAgents(next: readonly CustomAgent[]) {
  agents = next;
}

export function customAgent(identity: string) {
  if (!identity.startsWith("custom:")) return undefined;
  return agents.find((agent) => `custom:${agent.id}` === identity);
}

export function customAgentUrl(url: string, identity: string) {
  return `${url}/agents/${encodeURIComponent(identity.slice("custom:".length))}`;
}
