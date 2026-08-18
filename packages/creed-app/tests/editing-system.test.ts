// Pure-function tests for the editing-system invariants that recently broke.
// No test runner is wired into CI yet , run these manually with:
//
//   node --test --experimental-strip-types tests/editing-system.test.ts
//
// on Node 22+, or `npx tsx --test tests/editing-system.test.ts` on Node 20.
//
// These tests are deliberately scoped to pure functions so they don't need
// Supabase, fetch mocking, or a running Next server. Route-level integration
// goes through the running app.

import { strict as assert } from "node:assert";
import { test } from "node:test";
import {
  ACCENT_KEYS,
  VISIBLE_ACCENT_KEYS,
  applyReorderDraft,
  getMetaProposalDiffText,
  getProposalPreviewText,
  isAccentKey,
  isSelectableAccentKey,
  normalizeLegacyAccent,
  resolveAccentKey,
} from "@creed/core/creed-data";

test("isAccentKey: accepts every key in ACCENT_KEYS", () => {
  for (const key of ACCENT_KEYS) {
    assert.equal(isAccentKey(key), true, `expected ${key} to be a valid accent`);
  }
});

test("selectable accents exclude legacy teal and include powder", () => {
  assert.equal(isSelectableAccentKey("teal"), false);
  assert.equal(isSelectableAccentKey("powder"), true);
});

test("isAccentKey: rejects bogus values", () => {
  for (const value of ["burgundy", "", "  identity  ", 123, null, undefined, {}]) {
    assert.equal(isAccentKey(value), false, `expected ${JSON.stringify(value)} to be rejected`);
  }
});

test("visible picker is a 5-column family grid ending in mono", () => {
  assert.equal(VISIBLE_ACCENT_KEYS.length, 25);
  assert.equal(VISIBLE_ACCENT_KEYS[24], "mono");
  assert.ok(
    (VISIBLE_ACCENT_KEYS as readonly string[]).includes("lavender"),
    "expected lavender in the picker",
  );
  assert.ok(
    !(VISIBLE_ACCENT_KEYS as readonly string[]).includes("teal"),
    "expected teal to remain hidden",
  );
  assert.deepEqual(
    [0, 5, 10, 15, 20].map((index) => VISIBLE_ACCENT_KEYS[index]),
    ["mini-skills", "output", "skills", "rose", "boundaries"],
  );
  assert.deepEqual(
    [1, 6, 11, 16, 21].map((index) => VISIBLE_ACCENT_KEYS[index]),
    ["yellow", "lemon", "identity", "decisions", "projects"],
  );
  assert.deepEqual(
    [2, 7, 12, 17, 22].map((index) => VISIBLE_ACCENT_KEYS[index]),
    ["sage", "preferences", "lime", "emerald", "operating-principles"],
  );
  assert.deepEqual(
    [3, 8, 13, 18, 23].map((index) => VISIBLE_ACCENT_KEYS[index]),
    ["powder", "tools", "cyan", "ocean", "stack"],
  );
  assert.deepEqual(
    [4, 9, 14, 19, 24].map((index) => VISIBLE_ACCENT_KEYS[index]),
    ["lavender", "questions", "violet", "workflows", "mono"],
  );
});

test("resolveAccentKey: defaults missing and unknown accents to blue", () => {
  assert.equal(resolveAccentKey(undefined), "stack");
  assert.equal(resolveAccentKey("burgundy"), "stack");
  assert.equal(resolveAccentKey("rose"), "rose");
});

test("normalizeLegacyAccent: heals unknown stored accents to blue", () => {
  assert.equal(normalizeLegacyAccent("workflows"), "workflows");
  assert.equal(normalizeLegacyAccent("missing-accent"), "stack");
  assert.equal(normalizeLegacyAccent(null), "stack");
});

test("getMetaProposalDiffText: delete-section produces proportional labels", () => {
  const diff = getMetaProposalDiffText(
    { kind: "delete-section" },
    { name: "Beliefs", accent: "identity" }
  );
  assert.ok(diff);
  assert.equal(diff!.before, "Keep Beliefs");
  assert.equal(diff!.after, "Delete Beliefs");
});

test("getMetaProposalDiffText: rename-section compares name vs name", () => {
  const diff = getMetaProposalDiffText(
    { kind: "rename-section", name: "Values" },
    { name: "Beliefs", accent: "identity" }
  );
  assert.ok(diff);
  assert.equal(diff!.before, "Name: Beliefs");
  assert.equal(diff!.after, "Name: Values");
});

test("getMetaProposalDiffText: recolor-section uses readable accent labels", () => {
  const diff = getMetaProposalDiffText(
    { kind: "recolor-section", accent: "decisions" },
    { name: "Beliefs", accent: "identity" }
  );
  assert.ok(diff);
  assert.match(diff!.before, /^Accent: /);
  assert.match(diff!.after, /^Accent: /);
  assert.notEqual(diff!.before, diff!.after);
});

test("getMetaProposalDiffText: rich-text drafts return null (falls back to normal diff)", () => {
  const diff = getMetaProposalDiffText(
    { kind: "rich-text", contentMarkdown: "hello" },
    { name: "Beliefs", accent: "identity" }
  );
  assert.equal(diff, null);
});

test("getProposalPreviewText: delete-section returns a stable summary", () => {
  assert.equal(getProposalPreviewText({ kind: "delete-section" }), "Delete section");
});

test("getProposalPreviewText: rename-section returns the new name", () => {
  assert.equal(
    getProposalPreviewText({ kind: "rename-section", name: "Working Style" }),
    "Working Style"
  );
});

test("getProposalPreviewText: recolor-section uses the accent label, not the key", () => {
  // The user-facing summary should never expose raw accent keys like
  // "operating-principles" , it should map through the label table.
  const preview = getProposalPreviewText({
    kind: "recolor-section",
    accent: "operating-principles",
  });
  assert.match(preview, /^Change accent to /);
  assert.doesNotMatch(preview, /Change accent to operating-principles$/);
});

test("getProposalPreviewText: reorder-section describes the destination", () => {
  assert.equal(
    getProposalPreviewText({ kind: "reorder-section", position: "first" }),
    "Move to top"
  );
  assert.equal(
    getProposalPreviewText({ kind: "reorder-section", position: "last" }),
    "Move to bottom"
  );
  assert.equal(
    getProposalPreviewText({ kind: "reorder-section", afterSectionId: "beliefs" }),
    "Move after beliefs"
  );
});

test("getMetaProposalDiffText: reorder-section labels reference the section name", () => {
  const diff = getMetaProposalDiffText(
    { kind: "reorder-section", position: "first" },
    { name: "Beliefs", accent: "identity" }
  );
  assert.ok(diff);
  assert.equal(diff!.before, "Keep Beliefs in place");
  assert.equal(diff!.after, "Move Beliefs to top of file");
});

test("applyReorderDraft: position 'first' / 'last' move endpoints", () => {
  const sections = [
    { id: "a" },
    { id: "b" },
    { id: "c" },
  ];
  assert.deepEqual(
    applyReorderDraft(sections, "c", { position: "first" }).map((s) => s.id),
    ["c", "a", "b"]
  );
  assert.deepEqual(
    applyReorderDraft(sections, "a", { position: "last" }).map((s) => s.id),
    ["b", "c", "a"]
  );
});

test("applyReorderDraft: afterSectionId places target right after the anchor", () => {
  const sections = [{ id: "a" }, { id: "b" }, { id: "c" }, { id: "d" }];
  assert.deepEqual(
    applyReorderDraft(sections, "d", { afterSectionId: "a" }).map((s) => s.id),
    ["a", "d", "b", "c"]
  );
  assert.deepEqual(
    applyReorderDraft(sections, "a", { afterSectionId: "c" }).map((s) => s.id),
    ["b", "c", "a", "d"]
  );
});

test("applyReorderDraft: unknown target returns input unchanged", () => {
  const sections = [{ id: "a" }, { id: "b" }];
  assert.deepEqual(
    applyReorderDraft(sections, "missing", { position: "first" }),
    sections
  );
});

test("applyReorderDraft: unknown anchor falls back to original index (lossless)", () => {
  const sections = [{ id: "a" }, { id: "b" }, { id: "c" }];
  assert.deepEqual(
    applyReorderDraft(sections, "b", { afterSectionId: "missing" }).map((s) => s.id),
    ["a", "b", "c"]
  );
});

test("applyReorderDraft: malformed draft (neither position nor afterSectionId) restores the section", () => {
  const sections = [{ id: "a" }, { id: "b" }, { id: "c" }];
  assert.deepEqual(
    applyReorderDraft(sections, "b", {}).map((s) => s.id),
    ["a", "b", "c"]
  );
});
