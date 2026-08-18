import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

function source(path: string) {
  return readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
}

test("stale proposals persist until the dedicated dismiss action", () => {
  const provider = source("components/creed/creed-provider.tsx");
  const backend = source("lib/creed-backend.ts");
  const route = source("app/api/app/proposals/[id]/route.ts");
  const shared = source("lib/shared-sections.ts");

  assert.match(provider, /staleProposals\.set\(id, \{ \.\.\.proposal, status: "stale" \}\)/);
  assert.match(provider, /reviewPersonalProposalRemote\(proposalId, "dismiss"\)/);
  assert.match(backend, /const proposalRows = state\.proposals/);
  assert.doesNotMatch(backend, /proposal\.status !== "stale"/);
  assert.match(route, /b\.decision !== "dismiss"/);
  assert.match(route, /b\.decision !== "stale"/);
  assert.match(provider, /decision: "stale" as const/);
  assert.match(shared, /params\.decision === "stale"/);
});

test("Panel deletion proposals retain the deleted section content", () => {
  const execute = source("lib/panel/agent-execute.ts");

  assert.match(
    execute,
    /before_text: isDelete\s*\? params\.beforeText/,
  );
  assert.match(execute, /after_text: isDelete\s*\? ""/);
});

test("stale cards expose one blue Dismiss action", () => {
  const card = source("components/creed/inline-proposal-diff.tsx");
  const file = source("components/creed/file-screen.tsx");

  assert.match(card, /aria-label="Dismiss stale proposal"/);
  assert.match(card, /className="-mr-1 inline-flex h-7/);
  assert.match(card, /bg-\[var\(--creed-accent\)\]/);
  assert.match(card, />\s*Dismiss\s*<\/button>/);
  assert.doesNotMatch(card, /"Stale"/);
  assert.doesNotMatch(card, /This section changed after the proposal was made/);
  assert.match(card, /canReview \|\| mine \? \(\s*<StaleProposalAction/);
  assert.match(file, /stableInlineProposals/);
  assert.match(file, /stablePendingProposals/);
});
