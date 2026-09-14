import assert from "node:assert/strict";
import test from "node:test";
import { canonicalDiffMarkdown, computeCreedDiff, diffDisplayLines } from "../src/lib/creed-diff";

test("a word deletion displays its paragraph once", () => {
  const lines = diffDisplayLines(computeCreedDiff("Keep it portable. Hello", "Keep it portable."));
  assert.equal(lines.length, 1);
  assert.equal(lines[0].kind, "modified");
  assert.equal(lines[0].inlineParts?.filter((part) => !part.removed).map((part) => part.value).join(""), "Keep it portable.");
});

test("inline changes preserve both sides including whitespace and repeated words", () => {
  for (const [before, after] of [["one  two", "one two"], ["same same old", "same new same"], ["  indented", " indented"]]) {
    const line = diffDisplayLines(computeCreedDiff(before, after))[0];
    assert.equal(line.inlineParts?.filter((part) => !part.added).map((part) => part.value).join(""), before);
    assert.equal(line.inlineParts?.filter((part) => !part.removed).map((part) => part.value).join(""), after);
  }
});

test("markdown is not parsed as HTML merely because it contains angle brackets", () => {
  const source = "Use <placeholder> literally.\n\n  Preserve indentation.\n";
  assert.equal(canonicalDiffMarkdown(source), source);
  assert.equal(computeCreedDiff(source, source).added, 0);
});
