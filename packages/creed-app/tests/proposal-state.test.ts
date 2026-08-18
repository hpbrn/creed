import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import type { Proposal } from "@creed/core/creed-data";
import {
  inlineReviewProposals,
  liveReviewProposals,
  mergePendingProposalOutcomes,
  pendingReviewProposals,
  proposalReviewBaseline,
  proposalTargetsLiveSection,
  retainProposalReviewOutcomes,
} from "../lib/proposal-state.ts";

function proposal(id: string, status: Proposal["status"]): Proposal {
  return {
    id,
    sectionId: "identity",
    sectionName: "Identity",
    accent: "identity",
    agentName: "Claude",
    timeLabel: "just now",
    changeType: "refines-existing",
    reason: "A durable correction.",
    impact: "future-responses",
    confidence: "durable",
    draft: { kind: "rich-text", contentHtml: `<p>${id}</p>` },
    status,
  };
}

test("stale proposals stay inline but leave pending review controls", () => {
  const proposals = [
    proposal("pending", "pending"),
    proposal("stale", "stale"),
    proposal("accepted", "accepted"),
  ];

  assert.deepEqual(
    pendingReviewProposals(proposals).map((item) => item.id),
    ["pending"],
  );
  assert.deepEqual(
    inlineReviewProposals(proposals).map((item) => item.id),
    ["pending", "stale"],
  );
});

test("a stale review outcome keeps its original position until dismissal", () => {
  const first = proposal("first", "pending");
  const stale = proposal("stale", "pending");
  const accepted = proposal("accepted", "pending");
  const staleOutcome = { ...stale, status: "stale" as const };

  assert.deepEqual(
    retainProposalReviewOutcomes(
      [first, stale, accepted],
      [first],
      new Map([[stale.id, staleOutcome]]),
    ).map((item) => [item.id, item.status]),
    [
      ["first", "pending"],
      ["stale", "stale"],
    ],
  );
});

test("stale metadata proposals keep their original review baseline", () => {
  const stale = {
    ...proposal("stale", "stale"),
    sectionName: "Original name",
    accent: "goals" as const,
    draft: { kind: "rename-section" as const, name: "Proposed name" },
  };
  const section = {
    name: "Current name",
    accent: "work" as const,
    content: "<p>Current content</p>",
  };

  assert.deepEqual(
    proposalReviewBaseline(stale, section, "<p>Original content</p>"),
    {
      name: "Original name",
      accent: "goals",
      content: "<p>Original content</p>",
    },
  );
  assert.equal(
    proposalReviewBaseline(
      { ...stale, status: "pending" },
      section,
      "<p>Original content</p>",
    ),
    section,
  );
});

test("pending server state cannot replace a locally stale proposal", () => {
  const local = proposal("proposal", "stale");
  const incomingPending = proposal("proposal", "pending");
  const outcomes = new Map([[local.id, "stale" as const]]);

  assert.deepEqual(
    mergePendingProposalOutcomes([local], [incomingPending], outcomes),
    [local],
  );
  assert.equal(outcomes.get(local.id), "stale");

  const incomingStale = proposal("proposal", "stale");
  assert.deepEqual(
    mergePendingProposalOutcomes([local], [incomingStale], outcomes),
    [incomingStale],
  );
  assert.equal(outcomes.has(local.id), false);
});

test("live review hides proposals parked on archived sections", () => {
  const sections = [
    { id: "identity", archived: false },
    { id: "work", archived: true },
  ];
  const live = proposal("live", "pending");
  const parked = {
    ...proposal("parked", "pending"),
    sectionId: "work",
    sectionName: "Work",
  };
  const created = {
    ...proposal("created", "pending"),
    sectionId: "new-section",
    draft: { kind: "new-section" as const, name: "People" },
  };
  const missing = {
    ...proposal("missing", "pending"),
    sectionId: "gone",
  };

  assert.equal(proposalTargetsLiveSection(live, sections), true);
  assert.equal(proposalTargetsLiveSection(parked, sections), false);
  assert.equal(proposalTargetsLiveSection(created, sections), true);
  assert.equal(proposalTargetsLiveSection(missing, sections), false);
  assert.deepEqual(
    liveReviewProposals([live, parked, created, missing], sections).map(
      (item) => item.id,
    ),
    ["live", "created"],
  );
});

test("archive parks proposals; delete and reset still drop them", () => {
  const provider = readFileSync(
    new URL("../components/creed/creed-provider.tsx", import.meta.url),
    "utf8",
  );
  const fileScreen = readFileSync(
    new URL("../components/creed/file-screen.tsx", import.meta.url),
    "utf8",
  );
  const panel = readFileSync(
    new URL("../components/creed/panel.tsx", import.meta.url),
    "utf8",
  );
  const shell = readFileSync(
    new URL("../components/creed/shell.tsx", import.meta.url),
    "utf8",
  );
  const panelRoute = readFileSync(
    new URL("../app/api/app/ai/panel/route.ts", import.meta.url),
    "utf8",
  );

  const archiveSection =
    provider.split("function archiveSection")[1]?.split("function restoreSection")[0] ??
    "";
  const archiveCreed =
    provider.split("function archiveCreed")[1]?.split("function clearSections")[0] ??
    "";
  const restoreSection =
    provider.split("function restoreSection")[1]?.split("function archiveCreed")[0] ??
    "";
  const deleteSection =
    provider.split("function deleteSection")[1]?.split("function archiveSection")[0] ??
    "";
  const clearSections =
    provider
      .split("function clearSections")[1]
      ?.split("function reviewSharedProposalRemote")[0] ?? "";

  assert.doesNotMatch(archiveSection, /proposals:/);
  assert.doesNotMatch(archiveCreed, /proposals:/);
  assert.doesNotMatch(restoreSection, /proposals:/);
  assert.match(deleteSection, /proposals: current.proposals.filter/);
  assert.match(clearSections, /proposals: \[\]/);
  assert.match(fileScreen, /liveReviewProposals\(state\.proposals, state\.sections\)/);
  assert.match(panel, /liveReviewProposals\(state\.proposals, state\.sections\)/);
  assert.match(shell, /proposalTargetsLiveSection\(proposal, sections\)/);
  assert.match(panelRoute, /proposalTargetsLiveSection\(proposal, state\.sections\)/);
});
