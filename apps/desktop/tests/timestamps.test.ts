import assert from "node:assert/strict";
import test from "node:test";
import {
  normalizeWorkspaceTimestamps,
  timestampMilliseconds,
} from "../src/lib/native/timestamps";

test("native seconds and frontend milliseconds identify the same instant", () => {
  const milliseconds = Date.UTC(2026, 8, 13, 12);
  assert.equal(timestampMilliseconds(milliseconds / 1000), milliseconds);
  assert.equal(timestampMilliseconds(milliseconds), milliseconds);
  assert.equal(timestampMilliseconds(0), 0);
});

test("workspace timestamps are normalized without changing persisted input", () => {
  const timestamp = 1_789_300_800;
  const raw = {
    activeId: "test",
    model: "test",
    version: 1,
    documents: [
      {
        id: "test",
        path: "/example/test.md",
        source: "",
        revision: "revision",
        listed: true,
        missing: false,
        sections: [],
        analysis: null,
        spend: 0,
        history: [{ id: "history", source: "", timestamp, reason: "Saved" }],
        activity: [{ id: "activity", timestamp, reason: "Agent read" }],
        proposals: [
          {
            id: "proposal",
            sectionId: "section",
            agent: "Test",
            reason: "Test",
            baseline: "revision",
            operation: { kind: "body" },
            createdAt: timestamp,
          },
        ],
        connections: [
          {
            id: "connection",
            agent: "Test",
            transport: "mcp",
            last_seen: timestamp,
          },
        ],
      },
    ],
  };
  const normalized = normalizeWorkspaceTimestamps(raw);
  const document = normalized.documents[0];
  assert.equal(document.history[0].timestamp, timestamp * 1000);
  assert.equal(document.activity[0].timestamp, timestamp * 1000);
  assert.equal(document.proposals[0].createdAt, timestamp * 1000);
  assert.equal(document.connections[0].last_seen, timestamp * 1000);
  assert.equal(raw.documents[0].history[0].timestamp, timestamp);
  assert.deepEqual(normalizeWorkspaceTimestamps(normalized), normalized);
});
