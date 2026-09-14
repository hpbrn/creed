import type { ConnectionAction, McpClient } from "@/lib/creed/creed-data";

export type ConnectionPresentation = {
  hint?: string;
  primary?: ConnectionAction;
  secondary?: ConnectionAction;
};

export function splitConnectionClients(clients: McpClient[]) {
  return {
    mcp: clients.filter((client) => client.icon !== "cli"),
    cli: clients.filter((client) => client.icon === "cli"),
  };
}

export function getCliConnectionPresentation(
  connectionId: string,
  connectionName: string,
): ConnectionPresentation {
  const command = `npx creed-cli --agent ${connectionId} call read_creed --json`;
  return {
    hint: `Use Creed CLI with ${connectionName}. The first run opens the Creed OAuth screen, then the same command reads your live context whenever the agent needs it.`,
    primary: {
      kind: "copy",
      label: "Copy command",
      value: command,
    },
  };
}

export function getConnectionPresentation(
  connectionId: string,
  mcpUrl: string,
): ConnectionPresentation {
  if (connectionId.startsWith("custom:")) {
    return {
      primary: {
        kind: "copy",
        label: "Copy MCP",
        value: mcpUrl,
      },
    };
  }
  const copyUrl: ConnectionAction = {
    kind: "copy",
    label: "Copy URL",
    value: mcpUrl,
  };
  switch (connectionId) {
    case "cursor": {
      const config = btoa(JSON.stringify({ type: "http", url: mcpUrl }));
      return {
        primary: {
          kind: "install",
          label: "Add MCP",
          href: `https://cursor.com/install-mcp?name=creed&config=${encodeURIComponent(config)}`,
        },
        secondary: {
          kind: "copy",
          label: "Copy JSON",
          value: JSON.stringify(
            { mcpServers: { creed: { type: "http", url: mcpUrl } } },
            null,
            2,
          ),
        },
      };
    }
    case "claudecode":
      return {
        hint: "Run the command below in a terminal, then keep Creed running.",
        primary: {
          kind: "copy",
          label: "Copy command",
          value: `claude mcp add --transport http creed ${mcpUrl} --scope user`,
        },
        secondary: {
          kind: "copy",
          label: "Copy JSON",
          value: JSON.stringify(
            { mcpServers: { creed: { type: "http", url: mcpUrl } } },
            null,
            2,
          ),
        },
      };
    case "codex":
      return {
        hint: "Run the command below in a terminal, then keep Creed running.",
        primary: {
          kind: "copy",
          label: "Copy command",
          value: `codex mcp add creed --url ${mcpUrl}`,
        },
        secondary: {
          kind: "copy",
          label: "Copy TOML",
          value: `[mcp_servers.creed]\nurl = "${mcpUrl}"`,
        },
      };
    case "opencode":
      return {
        hint: "Run the command below in a terminal, then keep Creed running.",
        primary: {
          kind: "copy",
          label: "Copy command",
          value: `opencode mcp add creed --url ${mcpUrl}`,
        },
        secondary: {
          kind: "copy",
          label: "Copy JSON",
          value: JSON.stringify(
            {
              mcp: {
                servers: { creed: { type: "remote", url: mcpUrl } },
              },
            },
            null,
            2,
          ),
        },
      };
    case "factory":
      return {
        hint: "Run the command below, keep Creed running.",
        primary: {
          kind: "copy",
          label: "Copy command",
          value: `droid mcp add creed ${mcpUrl} --type http`,
        },
        secondary: {
          kind: "copy",
          label: "Copy JSON",
          value: JSON.stringify(
            { mcpServers: { creed: { type: "http", url: mcpUrl } } },
            null,
            2,
          ),
        },
      };
    case "goose":
      return {
        hint: "Add Creed as a remote Streamable HTTP extension, keep Creed running.",
        primary: {
          kind: "install",
          label: "Add MCP",
          href: `goose://extension?url=${encodeURIComponent(mcpUrl)}&type=streamable_http&timeout=300&id=creed&name=Creed&description=${encodeURIComponent("Personal context for every Goose session")}`,
        },
        secondary: copyUrl,
      };
    case "openclaw":
      return {
        hint: "Run the command below to save Creed in OpenClaw's MCP registry.",
        primary: {
          kind: "copy",
          label: "Copy command",
          value: `openclaw mcp add creed --url ${mcpUrl} --transport streamable-http`,
        },
      };
    case "hermes":
      return {
        hint: "Add this remote server to your Hermes config, then reload MCP servers.",
        primary: {
          kind: "copy",
          label: "Copy config",
          value: `mcp_servers:\n  creed:\n    url: "${mcpUrl}"`,
        },
      };
    case "grokbot":
      return {
        primary: {
          kind: "copy",
          label: "Copy config",
          value: `[mcp_servers.creed]\nurl = "${mcpUrl}"`,
        },
      };
    case "devin":
      return {
        primary: {
          kind: "copy",
          label: "Copy config",
          value: JSON.stringify(
            {
              transport: "HTTP",
              url: mcpUrl,
            },
            null,
            2,
          ),
        },
      };
    case "custom":
      return { primary: copyUrl };
    default:
      return {};
  }
}
