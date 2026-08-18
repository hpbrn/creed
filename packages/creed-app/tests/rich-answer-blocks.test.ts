import assert from "node:assert/strict";
import test from "node:test";
import { HEADERLESS_TABLE_MARK } from "@creed/core/rich-text";
import { creedEditorMarkdownGuide } from "../lib/ai/editor-markdown.ts";
import { parseAnswerBlocks } from "../lib/panel/rich-answer-blocks.ts";
import { buildPanelSystemPrompt } from "../lib/panel/actions.ts";
import { buildAgentSystemPrompt, buildAgentUserPrompt } from "../lib/panel/agent.ts";
import { buildTabSystemPrompt } from "../lib/ai/tab.ts";

test("parseAnswerBlocks reads GFM tables and the headerless mark", () => {
  const headed = parseAnswerBlocks(
    ["| Person | Role |", "| --- | --- |", "| Maya | co-founder |"].join("\n"),
  );
  assert.deepEqual(headed, [
    {
      kind: "table",
      headerless: false,
      headers: ["Person", "Role"],
      rows: [["Maya", "co-founder"]],
    },
  ]);

  const headerless = parseAnswerBlocks(
    [
      HEADERLESS_TABLE_MARK,
      "|  |  |",
      "| --- | --- |",
      "| Maya | co-founder |",
    ].join("\n"),
  );
  assert.equal(headerless[0]?.kind, "table");
  if (headerless[0]?.kind === "table") {
    assert.equal(headerless[0].headerless, true);
    assert.deepEqual(headerless[0].rows, [["Maya", "co-founder"]]);
  }
});

test("parseAnswerBlocks keeps nested bullets and checklists", () => {
  const blocks = parseAnswerBlocks(
    ["- Parent", "  - Child", "- [ ] Open", "- [x] Done"].join("\n"),
  );
  assert.equal(blocks.length, 1);
  assert.equal(blocks[0]?.kind, "list");
  if (blocks[0]?.kind !== "list") return;
  assert.equal(blocks[0].groups[0]?.kind, "bullets");
  assert.equal(blocks[0].groups[0]?.items[0]?.children[0]?.items[0]?.text, "Child");
  assert.equal(blocks[0].groups[1]?.kind, "tasks");
  assert.equal(blocks[0].groups[1]?.items[0]?.checked, false);
  assert.equal(blocks[0].groups[1]?.items[1]?.checked, true);
});

test("Ask, Agent, and Tab prompts teach every native editor block", () => {
  const guide = creedEditorMarkdownGuide("write");
  assert.match(guide, /GFM pipe tables/);
  assert.match(guide, /Checklists/);
  assert.match(guide, /creed-table-headerless/);

  const ask = buildPanelSystemPrompt("ask");
  const agent = buildAgentSystemPrompt();
  const tab = buildTabSystemPrompt();
  const draft = buildAgentUserPrompt({
    query: "add a people table",
    sections: [{ id: "people", name: "People", content: "", agentPermission: "propose" }],
    archived: [],
    mentioned: [],
  });

  for (const prompt of [ask, agent, tab, draft]) {
    assert.match(prompt, /\| Person \| Role \|/);
    assert.match(prompt, /- \[ \] item/);
    assert.match(prompt, /==highlight==/);
  }
});
