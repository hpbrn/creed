import assert from "node:assert/strict";
import test from "node:test";
import { chartTooltipPosition } from "../src/lib/chart-tooltip-position";

test("tooltip follows both cursor axes between data points", () => {
  assert.deepEqual(chartTooltipPosition(20, 30, 500, 240, 120, 60), { x: 32, y: 42 });
  assert.deepEqual(chartTooltipPosition(23, 37, 500, 240, 120, 60), { x: 35, y: 49 });
});

test("tooltip stays inside the chart at every edge", () => {
  assert.deepEqual(chartTooltipPosition(499, 239, 500, 240, 120, 60), { x: 380, y: 180 });
  assert.deepEqual(chartTooltipPosition(-20, -20, 500, 240, 120, 60), { x: 0, y: 0 });
});
