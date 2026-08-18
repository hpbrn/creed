import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

function source(path: string) {
  return readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
}

test("add-section proposal cards omit the section name", () => {
  const card = source("components/creed/inline-proposal-diff.tsx");
  const newSection = card.slice(
    card.indexOf("export function InlineNewSectionProposal"),
    card.indexOf("export function InlineMetaProposal"),
  );

  assert.doesNotMatch(newSection, /sectionName/);
});

test("new-section proposals render header and body chrome in the file", () => {
  const file = source("components/creed/file-screen.tsx");
  assert.match(file, /function ProposedNewSectionPreview/);
  assert.match(file, /<ProposedNewSectionPreview/);
  assert.match(file, /normalizeRichTextInput\(draft\)/);
});
