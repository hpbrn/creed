import test from "node:test";
import assert from "node:assert/strict";
import { groupLinearIssuesIntoColumns } from "../src/lib/marketing/roadmap.ts";

const PUBLIC_LABEL_ID = "public-id";
const publicLabel = { id: PUBLIC_LABEL_ID, name: "public" };
function issue(id: string, stateType = "unstarted", createdAt = "2026-01-01") {
  return {
    id,
    title: id,
    createdAt,
    state: { type: stateType },
    labels: { nodes: [publicLabel] },
  };
}

test("only the three newest public issues are exposed across all statuses", () => {
  const columns = groupLinearIssuesIntoColumns(
    [
      issue("old", "completed", "2025-01-01"),
      issue("third", "started", "2026-01-01"),
      issue("second", "unstarted", "2026-02-01"),
      issue("newest", "unstarted", "2026-03-01"),
      issue("newest", "unstarted", "2026-03-01"),
      {
        ...issue("private", "unstarted", "2026-04-01"),
        labels: { nodes: [{ id: "other", name: "public" }] },
      },
    ],
    PUBLIC_LABEL_ID,
  );
  assert.deepEqual(
    columns[0].tasks.map((t) => t.id),
    ["newest", "second"],
  );
  assert.deepEqual(
    columns[1].tasks.map((t) => t.id),
    ["third"],
  );
  assert.deepEqual(columns[2].tasks, []);
});

test("workflow statuses retain their public labels", () => {
  for (const [state, column] of Object.entries({
    backlog: "next",
    unstarted: "next",
    started: "in_progress",
    completed: "shipped",
  })) {
    const columns = groupLinearIssuesIntoColumns(
      [issue("one", state)],
      PUBLIC_LABEL_ID,
    );
    assert.equal(columns.find((c) => c.tasks.length)?.id, column);
  }
});

test("canceled, duplicate-state and malformed issues cannot fill the public slots", () => {
  const columns = groupLinearIssuesIntoColumns(
    [
      issue("canceled", "canceled"),
      issue("duplicate", "duplicate"),
      null,
      { ...issue("empty"), title: "" },
      { title: "No state" },
    ],
    PUBLIC_LABEL_ID,
  );
  assert.equal(columns.flatMap((c) => c.tasks).length, 0);
});

test("public response includes only supported card labels", () => {
  const [next] = groupLinearIssuesIntoColumns(
    [
      {
        ...issue("one"),
        description: "Description",
        labels: {
          nodes: [
            publicLabel,
            { id: "feature", name: "Feature" },
            { id: "homepage", name: "homepage" },
            { id: "internal", name: "Internal" },
          ],
        },
      },
    ],
    PUBLIC_LABEL_ID,
  );
  assert.deepEqual(next.tasks[0], {
    id: "one",
    title: "one",
    description: "Description",
    labels: ["feature"],
    createdAt: Date.parse("2026-01-01"),
  });
});

test("empty input and invalid dates are safe and deterministic", () => {
  for (const input of [[], null, undefined, "nope", 42]) {
    assert.deepEqual(
      groupLinearIssuesIntoColumns(input, PUBLIC_LABEL_ID).map((c) => c.tasks),
      [[], [], []],
    );
  }
  const [next] = groupLinearIssuesIntoColumns(
    [issue("b", "unstarted", "invalid"), issue("a", "unstarted", "invalid")],
    PUBLIC_LABEL_ID,
  );
  assert.deepEqual(
    next.tasks.map((t) => [t.id, t.createdAt]),
    [
      ["a", 0],
      ["b", 0],
    ],
  );
});
