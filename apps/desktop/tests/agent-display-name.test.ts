import assert from "node:assert/strict";
import test from "node:test";
import { getAgentDisplayName } from "../src/lib/agent-icon.ts";

test("known agents use canonical display names without renaming custom agents", () => {
  assert.equal(getAgentDisplayName("codex"), "Codex");
  assert.equal(getAgentDisplayName("CODEX"), "Codex");
  assert.equal(getAgentDisplayName("claude-code"), "Claude Code");
  assert.equal(getAgentDisplayName("chatgpt"), "ChatGPT");
  assert.equal(getAgentDisplayName("Creed"), "Creed");
  assert.equal(getAgentDisplayName("custom"), "Unknown");
  assert.equal(getAgentDisplayName("Custom Agent"), "Unknown");
  assert.equal(getAgentDisplayName("custom-agent"), "Unknown");
  assert.equal(getAgentDisplayName("My codex helper"), "My codex helper");
});
