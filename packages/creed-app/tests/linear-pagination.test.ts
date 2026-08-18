import test from "node:test";
import assert from "node:assert/strict";
import { collectLinearConnection } from "../lib/linear-pagination.ts";

test("collectLinearConnection follows every cursor in order", async () => {
  const cursors: Array<string | undefined> = [];
  const pages = new Map([
    [
      undefined,
      {
        nodes: ["a", "b"],
        pageInfo: { hasNextPage: true, endCursor: "page-2" },
      },
    ],
    [
      "page-2",
      {
        nodes: ["c"],
        pageInfo: { hasNextPage: true, endCursor: "page-3" },
      },
    ],
    [
      "page-3",
      {
        nodes: ["d"],
        pageInfo: { hasNextPage: false, endCursor: "page-3" },
      },
    ],
  ]);

  const nodes = await collectLinearConnection(async (after) => {
    cursors.push(after);
    const page = pages.get(after);
    assert.ok(page);
    return page;
  });

  assert.deepEqual(cursors, [undefined, "page-2", "page-3"]);
  assert.deepEqual(nodes, ["a", "b", "c", "d"]);
});

test("collectLinearConnection rejects missing or cycled cursors", async () => {
  for (const cursors of [["page-1", null], ["page-1", "page-2", "page-1"]]) {
    let calls = 0;
    await assert.rejects(
      collectLinearConnection(async (_after) => {
        const endCursor = cursors[calls];
        calls += 1;
        return {
          nodes: [calls],
          pageInfo: {
            hasNextPage: true,
            endCursor,
          },
        };
      }),
      /linear_invalid_page_info/,
    );
    assert.equal(calls, cursors.length);
  }
});
