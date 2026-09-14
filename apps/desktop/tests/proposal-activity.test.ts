import assert from "node:assert/strict";
import test from "node:test";
import type { Proposal } from "../src/lib/creed/creed-data";
import { proposalActivityEntries } from "../src/lib/proposal-state";

const proposal: Proposal = {
  id: "proposal-1", sectionId: "section-1", sectionName: "Identity",
  accent: "stack", agentName: "Codex", agentIdentity: "codex",
  createdAt: "2026-01-02T12:00:00Z", timeLabel: "",
  changeType: "refines-existing", reason: "Update context",
  impact: "future-responses", confidence: "durable",
  draft: { kind: "rich-text", contentHtml: "<p>New context</p>" },
  status: "pending",
};

test("pending proposals appear without an activity record", () => {
  const entries = proposalActivityEntries([], [proposal]);
  assert.equal(entries.length, 1);
  assert.equal(entries[0].proposalId, proposal.id);
  assert.equal(entries[0].status, "pending");
  assert.equal(entries[0].actorType, "agent");
  assert.equal(entries[0].agentIdentity, "codex");
});

test("existing proposal activity is not duplicated", () => {
  const entries = proposalActivityEntries([], [proposal]);
  assert.equal(proposalActivityEntries(entries, [proposal]).length, 1);
});

test("dismissed proposals disappear and reviewed proposals leave only their outcome", () => {
  assert.deepEqual(proposalActivityEntries([], []), []);
  const [entry] = proposalActivityEntries([], [proposal]);
  const accepted = { ...entry, status: "accepted" as const };
  assert.deepEqual(proposalActivityEntries([accepted], []), [accepted]);
  assert.deepEqual(proposalActivityEntries([accepted], [proposal]), [accepted]);
});

test("new pending proposals sort ahead of older activity", () => {
  const [entry] = proposalActivityEntries([], [proposal]);
  const older = { ...entry, id: "older", proposalId: undefined,
    createdAt: "2026-01-01T12:00:00Z", status: "direct" as const };
  assert.equal(proposalActivityEntries([older], [proposal])[0].proposalId, proposal.id);
});
