import assert from "node:assert/strict";
import test from "node:test";
import { featureMeta, normalizeFeature } from "../src/lib/ai/features.ts";

test("usage groups every recorded feature into the three product series", () => {
  assert.equal(normalizeFeature("analysis"), "analysis");
  assert.equal(normalizeFeature("tab"), "tab");
  assert.equal(normalizeFeature("panel"), "panel");
  assert.equal(normalizeFeature("agent"), "panel");
  assert.equal(normalizeFeature("unknown"), "panel");
  assert.equal(featureMeta("agent").color, "#DB2777");
});
