import assert from "node:assert/strict";
import test from "node:test";
import { reconcileSnapshot } from "../src/lib/native/snapshot";

test("unchanged IPC snapshots preserve the complete React snapshot", () => {
  const previous = {
    activeId: "a",
    documents: [
      {
        id: "a",
        source: "## Identity\n",
        sections: [{ id: "identity", body: "Context" }],
        history: [],
      },
    ],
  };
  assert.equal(
    reconcileSnapshot(previous, structuredClone(previous)),
    previous,
  );
});

test("editing one section preserves every unchanged branch", () => {
  const previous = {
    documents: [
      {
        id: "a",
        sections: [
          { id: "first", body: "One" },
          { id: "second", body: "Two" },
        ],
        history: [],
      },
      { id: "b", sections: [], history: [] },
    ],
  };
  const next = structuredClone(previous);
  next.documents[0].sections[0].body = "Updated";
  const result = reconcileSnapshot(previous, next);
  assert.notEqual(result, previous);
  assert.notEqual(
    result.documents[0].sections[0],
    previous.documents[0].sections[0],
  );
  assert.equal(
    result.documents[0].sections[1],
    previous.documents[0].sections[1],
  );
  assert.equal(result.documents[0].history, previous.documents[0].history);
  assert.equal(result.documents[1], previous.documents[1]);
  assert.equal(previous.documents[0].sections[0].body, "One");
});

test("metadata changes and removed fields are not hidden by snapshot reuse", () => {
  const previous: { missing: boolean; proposal?: string; sections: string[] } =
    { missing: false, proposal: "pending", sections: ["one", "two"] };
  const next = { missing: true, sections: ["two", "one"] };
  const result = reconcileSnapshot(previous, next);
  assert.deepEqual(result, next);
  assert.equal(Object.hasOwn(result, "proposal"), false);
  assert.notEqual(result.sections, previous.sections);
});

test("empty, null, and explicit undefined values remain distinct", () => {
  assert.equal(reconcileSnapshot(null, null), null);
  assert.deepEqual(reconcileSnapshot<unknown>(null, []), []);
  const result = reconcileSnapshot<Record<string, unknown>>(
    {},
    { field: undefined },
  );
  assert.equal(Object.hasOwn(result, "field"), true);
});
