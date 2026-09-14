import assert from "node:assert/strict";
import test from "node:test";
import { healthSummary } from "../src/lib/native/health";
import type { Document } from "../src/lib/native/workspace";

test("local health uses recorded reads, direct edits and review outcomes in the selected range", () => {
  const now = Date.now();
  const document: Document = { id: "test", path: "/test.md", source: "", revision: "", listed: true, missing: false, sections: [], history: [], proposals: [], connections: [{ id: "session", agent: "Codex", transport: "mcp", last_seen: now }], analysis: null, spend: 0, activity: [
    { id: "read", timestamp: now, reason: "Agent read", agent: "Codex" },
    { id: "direct", timestamp: now, reason: "Edited in Creed", agent: "Codex", status: "direct" },
    { id: "accepted", timestamp: now, reason: "Accepted proposal", agent: "Codex", status: "accepted" },
    { id: "old", timestamp: now - 10 * 86400000, reason: "Agent read", agent: "Codex" },
  ] };
  const result = healthSummary(document, "7d", now);
  assert.equal(result.totals.reads, 1);
  assert.equal(result.totals.directs, 1);
  assert.equal(result.totals.accepted, 1);
  assert.equal(result.totals.acceptRate, 1);
  assert.equal(result.days.length, 1);
  assert.equal(result.days[0].readsByAgent.Codex, 1);
  assert.equal(healthSummary(document, "all", now).totals.reads, 2);
});

test("health groups aliases that render as the same agent", () => {
  const now = Date.now();
  const document: Document = { id: "test", path: "/test.md", source: "", revision: "", listed: true, missing: false, sections: [], history: [], proposals: [], connections: [{ id: "one", agent: "Codex", transport: "mcp", last_seen: now }, { id: "two", agent: "codex", transport: "mcp", last_seen: now }], analysis: null, spend: 0, activity: [
    { id: "one", timestamp: now, reason: "Agent read", agent: "Codex" },
    { id: "two", timestamp: now, reason: "Agent read", agent: "codex" },
  ] };
  const result = healthSummary(document, "7d", now);
  assert.equal(result.agents.length, 1);
  assert.equal(result.agents[0]?.name, "Codex");
  assert.equal(result.days[0]?.readsByAgent.Codex, 2);
});
