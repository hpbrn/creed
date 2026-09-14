import assert from "node:assert/strict";
import test from "node:test";
import { toolbarCapacity, toolbarLayout } from "../src/lib/toolbar-layout";

test("returning sidebar controls cannot reverse toolbar capacity while widening", () => {
  let previous = 0;
  for (let viewport = 720; viewport <= 1300; viewport++) {
    const available = viewport - (viewport < 1024 ? 106 : 190);
    const capacity = toolbarCapacity(available, viewport, 84);
    assert.ok(capacity >= previous, `capacity reversed at ${viewport}`);
    previous = capacity;
  }
});

test("toolbar compresses action labels before sync text and restores both with space", () => {
  for (const width of [900, 700, 500, 700, 900]) {
    assert.deepEqual(toolbarLayout(width, 300, 180, 300, 150), {
      compactActions: width < 780,
      compactSync: width < 630,
    });
  }
});

test("longer filenames trigger compression earlier without changing title width", () => {
  assert.equal(toolbarLayout(900, 300, 180, 300, 150).compactActions, false);
  assert.equal(toolbarLayout(900, 500, 180, 300, 150).compactActions, true);
  assert.deepEqual(toolbarLayout(780, 300, 180, 300, 150), {
    compactActions: false,
    compactSync: false,
  });
});

test("releasing sidebar controls while shrinking cannot expand toolbar labels", () => {
  const compact = toolbarLayout(770, 300, 180, 300, 150);
  assert.equal(compact.compactActions, true);
  const freedSpace = toolbarLayout(830, 300, 180, 300, 150, compact, true);
  assert.equal(freedSpace.compactActions, true);
  assert.equal(
    toolbarLayout(830, 300, 180, 300, 150, freedSpace, false).compactActions,
    false,
  );
});

test("small threshold fluctuations do not flash labels", () => {
  let previous = toolbarLayout(779, 300, 180, 300, 150);
  for (const width of [780, 779, 781, 780, 779]) {
    previous = toolbarLayout(width, 300, 180, 300, 150, previous);
    assert.equal(previous.compactActions, true);
  }
  assert.equal(
    toolbarLayout(792, 300, 180, 300, 150, previous).compactActions,
    false,
  );
});
