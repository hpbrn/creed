import assert from "node:assert/strict";
import test from "node:test";
import { sidebarAvailableAt } from "../src/lib/sidebar-layout";

test("sidebar collapse ignores small reversals around the breakpoint", () => {
  let available = true;
  for (const width of [1100, 1050, 1024]) {
    available = sidebarAvailableAt(width, available);
    assert.equal(available, true);
  }
  for (const width of [1023, 1024, 1022, 1027, 1040, 1047]) {
    available = sidebarAvailableAt(width, available);
    assert.equal(available, false);
  }
  available = sidebarAvailableAt(1048, available);
  assert.equal(available, true);
  assert.equal(sidebarAvailableAt(1030, available), true);
});

test("a deliberate width reversal can collapse again", () => {
  assert.equal(
    sidebarAvailableAt(1023, sidebarAvailableAt(1100, false)),
    false,
  );
});
