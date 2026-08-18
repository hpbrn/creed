import test from "node:test";
import assert from "node:assert/strict";
import type { Proposal } from "@creed/core/creed-data";
import {
  inlineReviewProposals,
  mergePendingProposalOutcomes,
  pendingReviewProposals,
  proposalReviewBaseline,
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
