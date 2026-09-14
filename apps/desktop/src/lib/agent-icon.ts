// Maps a free-text agent / client name to one of the fixed brand icon kinds.
// Lives in lib (not the "use client" agent-icon-stack) so server components,
// like the OAuth consent screen, can resolve a connecting client's icon too.
import type { AgentIconKind } from "@/lib/creed/creed-data";
import { customAgent } from "@/lib/custom-agents";

export const CLI_ATTRIBUTABLE_AGENT_IDS = [
  "chatgpt",
  "claude",
  "grok",
  "grokbot",
  "whirl",
  "claudecode",
  "codex",
  "cursor",
  "opencode",
  "devin",
  "replit",
  "v0",
  "factory",
  "openclaw",
  "hermes",
  "manus",
  "goose",
  "custom",
] as const satisfies readonly AgentIconKind[];

export type CliAttributableAgentId =
  (typeof CLI_ATTRIBUTABLE_AGENT_IDS)[number];

export function isCliAttributableAgentId(
  value: string,
): value is CliAttributableAgentId {
  return (CLI_ATTRIBUTABLE_AGENT_IDS as readonly string[]).includes(value);
}

// Order matters: the first alias whose substring is found wins. More specific
// multi-word names ("claude code") must come before their broader prefixes
// ("claude"), and broad substrings ("v0") sit last so exact names match first.
const agentAliases: Array<[AgentIconKind, string[]]> = [
  ["cli", ["creed cli", "creed-cli", "creed_cli"]],
  ["claudecode", ["claude code", "claude-code", "claude_code", "claudecode"]],
  ["chatgpt", ["chatgpt", "chat gpt", "chat-gpt"]],
  ["claude", ["claude"]],
  ["codex", ["codex", "creed"]],
  ["cursor", ["cursor"]],
  ["replit", ["replit"]],
  ["devin", ["devin"]],
  ["whirl", ["whirl"]],
  ["grokbot", ["grok bot", "grok-bot", "grok_bot", "grokbot"]],
  ["grok", ["grok"]],
  ["goose", ["goose"]],
  ["opencode", ["opencode", "open code", "open-code"]],
  ["openclaw", ["openclaw", "open claw", "open-claw", "clawdius", "claw"]],
  ["hermes", ["hermes"]],
  ["factory", ["factory", "droid"]],
  ["manus", ["manus"]],
  ["v0", ["v0"]],
];

function normalizeAgentName(value?: string | null) {
  const normalized = value?.toLowerCase().trim() ?? "";
  // Shared attribution renders as "[member]'s [agent]". Icon detection should
  // inspect the actual agent suffix, so "Alex's Codex" and "Alex's Creed"
  // do not fall back to the generic custom-agent glyph.
  return normalized.replace(/^.+?'s\s+/, "");
}

const AGENT_DISPLAY_NAMES: Record<string, string> = {
  custom: "Unknown",
  customagent: "Unknown",
  unknown: "Unknown",
  localagent: "Unknown",
  codex: "Codex",
  chatgpt: "ChatGPT",
  claude: "Claude",
  claudecode: "Claude Code",
  cursor: "Cursor",
  opencode: "OpenCode",
  devin: "Devin",
  replit: "Replit",
  goose: "Goose",
  grok: "Grok",
  grokbot: "Grok Bot",
  openclaw: "OpenClaw",
  hermes: "Hermes",
  manus: "Manus",
  factory: "Factory",
  whirl: "Whirl",
  v0: "v0",
  creed: "Creed",
  creedcli: "Creed CLI",
};

export function getAgentDisplayName(value: string): string {
  const name = value.trim();
  if (name.startsWith("custom:")) return customAgent(name)?.name ?? "Unknown";
  if (!name) return "Unknown";
  return (
    AGENT_DISPLAY_NAMES[name.toLowerCase().replace(/[\s_-]+/g, "")] ?? name
  );
}

export function getAgentIconKind(value?: string | null): AgentIconKind {
  if (value?.startsWith("custom:"))
    return customAgent(value) ? (value as `custom:${string}`) : "custom";
  const normalized = normalizeAgentName(value);
  const match = agentAliases.find(([, aliases]) =>
    aliases.some((alias) => normalized.includes(alias)),
  );

  return match?.[0] ?? "custom";
}

export type AgentConnectionKind =
  "connected" | "not-connected" | "disconnected";

export const AGENT_STATUS_FILTER_ITEMS: {
  key: AgentConnectionKind | "all";
  label: string;
}[] = [
  { key: "all", label: "All statuses" },
  { key: "connected", label: "Connected" },
  { key: "not-connected", label: "Not connected" },
  { key: "disconnected", label: "Disconnected" },
];
