import test from "node:test";
import assert from "node:assert/strict";
import { groupLinearIssuesIntoColumns } from "../lib/marketing/roadmap.ts";

const PUBLIC_LABEL_ID = "public-roadmap";
const publicLabel = { id: PUBLIC_LABEL_ID, name: "public-roadmap" };

function issue({
  id,
  title,
  stateType,
  labels = [publicLabel],
  ...rest
}: {
  id: string;
  title: string;
  stateType: string;
  labels?: { id: string; name: string }[];
  description?: string;
  priority?: number;
  sortOrder?: number;
  createdAt?: string;
}) {
  return {
    id,
    title,
    state: { type: stateType },
    labels: { nodes: labels },
    ...rest,
  };
}

test("Linear workflow types map to the public columns", () => {
  const columns = groupLinearIssuesIntoColumns(
    [
      issue({ id: "1", title: "Backlog", stateType: "backlog" }),
      issue({ id: "2", title: "Todo", stateType: "unstarted" }),
      issue({ id: "3", title: "Doing", stateType: "started" }),
      issue({ id: "4", title: "Done", stateType: "completed" }),
    ],
    PUBLIC_LABEL_ID,
  );
  const byId = Object.fromEntries(columns.map((column) => [column.id, column]));

  assert.deepEqual(
    byId.next.tasks.map((task) => task.id),
    ["1", "2"],
  );
  assert.deepEqual(
    byId.in_progress.tasks.map((task) => task.id),
    ["3"],
  );
  assert.deepEqual(
    byId.shipped.tasks.map((task) => task.id),
    ["4"],
  );
});

test("non-public, canceled, duplicate, and malformed issues are dropped", () => {
  const columns = groupLinearIssuesIntoColumns(
    [
      issue({
        id: "1",
        title: "Private",
        stateType: "unstarted",
        labels: [{ id: "feedback", name: "feedback" }],
      }),
      issue({ id: "2", title: "Canceled", stateType: "canceled" }),
      issue({ id: "3", title: "Duplicate", stateType: "duplicate" }),
      { id: "4", state: { type: "unstarted" }, labels: { nodes: [publicLabel] } },
      { id: "5", title: "No state", labels: { nodes: [publicLabel] } },
    ],
    PUBLIC_LABEL_ID,
  );

  assert.equal(
    columns.reduce((count, column) => count + column.tasks.length, 0),
    0,
  );
});

test("cards use Linear sort order, priority, then creation time", () => {
  const [next] = groupLinearIssuesIntoColumns(
    [
      issue({
        id: "a",
        title: "A",
        stateType: "unstarted",
        sortOrder: 2,
        priority: 1,
        createdAt: "2026-01-01T00:00:00.000Z",
      }),
      issue({
        id: "b",
        title: "B",
        stateType: "unstarted",
        sortOrder: 1,
        priority: 3,
        createdAt: "2026-01-02T00:00:00.000Z",
      }),
      issue({
        id: "c",
        title: "C",
        stateType: "unstarted",
        sortOrder: 1,
        priority: 2,
        createdAt: "2026-01-03T00:00:00.000Z",
      }),
    ],
    PUBLIC_LABEL_ID,
  );

  assert.deepEqual(
    next.tasks.map((task) => task.id),
    ["c", "b", "a"],
  );
});

test("only public card labels reach the public response", () => {
  const [next] = groupLinearIssuesIntoColumns(
    [
      issue({
        id: "1",
        title: "Card",
        stateType: "unstarted",
        description: "Description",
        labels: [
          publicLabel,
          { id: "feature", name: "Feature" },
          { id: "internal", name: "Internal" },
        ],
      }),
    ],
    PUBLIC_LABEL_ID,
  );

  assert.deepEqual(next.tasks[0], {
    id: "1",
    title: "Card",
    description: "Description",
    labels: ["feature"],
  });
});

test("empty or non-array input yields three empty columns", () => {
  for (const input of [[], null, undefined, "nope", 42]) {
    const columns = groupLinearIssuesIntoColumns(input, PUBLIC_LABEL_ID);
    assert.deepEqual(
      columns.map((column) => column.id),
      ["next", "in_progress", "shipped"],
    );
    assert.equal(
      columns.reduce((count, column) => count + column.tasks.length, 0),
      0,
    );
  }
});

test("malformed optional fields fall back safely", () => {
  const [next] = groupLinearIssuesIntoColumns(
    [
      {
        title: "No id",
        state: { type: "unstarted" },
        labels: { nodes: [publicLabel] },
        priority: "high",
        sortOrder: "first",
      },
    ],
    PUBLIC_LABEL_ID,
  );

  assert.equal(next.tasks[0].id, "unstarted-No id");
  assert.deepEqual(next.tasks[0].labels, []);
});
