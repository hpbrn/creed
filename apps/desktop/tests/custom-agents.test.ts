import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { customAgentUrl, setCustomAgents } from "../src/lib/custom-agents.ts";
import {
  getAgentDisplayName,
  getAgentIconKind,
} from "../src/lib/agent-icon.ts";
import { getConnectionPresentation } from "../src/lib/connection-actions.ts";

test("agent creation reuses the optional profile uploader", () => {
  const dialog = readFileSync(
    new URL("../src/components/creed/add-agent-dialog.tsx", import.meta.url),
    "utf8",
  );
  assert.match(dialog, /<EditableProfileAvatar/);
  assert.match(dialog, /size="input"/);
  assert.match(dialog, /name=\{name.trim\(\) \|\| "Agent icon"\}/);
  assert.match(dialog, /fallback=\{name.trim\(\) \? undefined : "#"\}/);
  assert.doesNotMatch(dialog, /IntegrationGlyph/);
  assert.match(dialog, /variant="outline"/);
  assert.match(
    dialog,
    /disabled=\{busy \|\| reading \|\| !name.trim\(\)\}/,
  );
  assert.match(dialog, /"Adding"/);
  assert.match(dialog, /"Save"/);
});

test("connection menus require a connected session and have no Open action", () => {
  const card = readFileSync(
    new URL("../src/components/creed/connection-card.tsx", import.meta.url),
    "utf8",
  );
  assert.match(card, /\(isConnected && onRevoke\) \|\| savedAgent/);
  assert.match(card, /<AddAgent\s+creedId=\{creedId\}\s+agent=\{savedAgent\}/);
  assert.match(card, /!connection.id.startsWith\("custom:"\)/);
  assert.doesNotMatch(card, /AGENT_OPEN_URLS|showMenu/);
});

test("the desktop roster includes cloud agents with tunnel-specific setup copy", () => {
  const provider = readFileSync(
    new URL("../src/components/creed/creed-provider.tsx", import.meta.url),
    "utf8",
  );
  assert.match(provider, /"grokbot"/);
  assert.match(provider, /"devin"/);
  assert.match(
    provider,
    /connection\.id === "grokbot" \|\| connection\.id === "devin"/,
  );
});

test("saved agents use stable identities, not their display names", () => {
  try {
    setCustomAgents([
      { id: "one", name: "Codex", icon: null },
      { id: "two", name: "Research", icon: null },
    ]);
    assert.equal(getAgentDisplayName("custom:one"), "Codex");
    assert.equal(getAgentIconKind("custom:one"), "custom:one");
    assert.equal(getAgentIconKind("Codex"), "codex");
    assert.equal(getAgentDisplayName("custom:missing"), "Unknown");
    assert.equal(getAgentIconKind("custom:missing"), "custom");
    setCustomAgents([{ id: "one", name: "Renamed", icon: null }]);
    assert.equal(getAgentDisplayName("custom:one"), "Renamed");
    const url = customAgentUrl("http://127.0.0.1:38473/mcp/file", "custom:one");
    const presentation = getConnectionPresentation("custom:one", url);
    assert.equal(url, "http://127.0.0.1:38473/mcp/file/agents/one");
    assert.equal(presentation.primary?.kind, "copy");
    if (presentation.primary?.kind === "copy")
      assert.equal(presentation.primary.value, url);
    assert.equal(presentation.primary?.label, "Copy MCP");
    assert.equal(presentation.secondary, undefined);
  } finally {
    setCustomAgents([]);
  }
});

test("connection cards use each agent's actual setup artifact", () => {
  const url = "http://127.0.0.1:38473/mcp/creed";
  const openClaw = getConnectionPresentation("openclaw", url);
  const hermes = getConnectionPresentation("hermes", url);
  const grokBot = getConnectionPresentation("grokbot", url);
  const devin = getConnectionPresentation("devin", url);
  assert.deepEqual(openClaw.primary, {
    kind: "copy",
    label: "Copy command",
    value: `openclaw mcp add creed --url ${url} --transport streamable-http`,
  });
  assert.deepEqual(hermes.primary, {
    kind: "copy",
    label: "Copy config",
    value: `mcp_servers:\n  creed:\n    url: "${url}"`,
  });
  assert.deepEqual(grokBot.primary, {
    kind: "copy",
    label: "Copy config",
    value: `[mcp_servers.creed]\nurl = "${url}"`,
  });
  assert.deepEqual(devin.primary, {
    kind: "copy",
    label: "Copy config",
    value: JSON.stringify(
      {
        transport: "HTTP",
        url,
      },
      null,
      2,
    ),
  });
});
