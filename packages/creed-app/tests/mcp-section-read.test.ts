import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import type { CreedSection } from "@creed/core/creed-data";
import { mcpSectionReadResult } from "../lib/mcp-section-read.ts";

function makeSection(overrides: Partial<CreedSection> = {}): CreedSection {
  return {
    id: "beliefs",
    kind: "rich-text",
    template: "freeform",
    name: "Beliefs",
    accent: "identity",
    content: "<p>Keep the file sacred.</p>",
    agentWritable: true,
    agentPermission: "propose",
    lastEditedBy: "You",
    lastEditedType: "user",
    lastEditedLabel: "just now",
    ...overrides,
  };
}

test("creed_get_section returns body markdown agents can send back", () => {
  const result = mcpSectionReadResult(makeSection());
  assert.equal(result.contentHtml, "<p>Keep the file sacred.</p>");
  assert.equal(result.contentMarkdown, "Keep the file sacred.");
  assert.equal(result.contentMarkdown.includes("## Beliefs"), false);
  assert.equal(result.agentWritable, true);
  assert.equal(result.permission, "propose");
});

test("the MCP route and Shared loader keep propose sections writable", () => {
  const route = readFileSync(new URL("../app/mcp/route.ts", import.meta.url), "utf8");
  const backend = readFileSync(
    new URL("../lib/creed-backend.ts", import.meta.url),
    "utf8",
  );
  assert.match(route, /mcpSectionReadResult\(/);
  assert.match(route, /permissionToWritable\(effective\)/);
  assert.match(backend, /agentWritable: permissionToWritable\(agentPermission\)/);
  assert.doesNotMatch(backend, /agentWritable: agentPermission === "direct"/);
});
