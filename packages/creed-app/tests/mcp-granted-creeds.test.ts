import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { resolveGrantedCreeds } from "../lib/mcp-granted-creeds.ts";

const personal = { id: "personal-1", type: "personal" as const };
const shared = { id: "shared-1", type: "shared" as const };
const all = [personal, shared];

test("legacy tokens with no grant rows stay personal-only", () => {
  assert.deepEqual(resolveGrantedCreeds(all, [], personal), [personal]);
  assert.deepEqual(resolveGrantedCreeds(all, [], undefined), []);
});

test("a live shared grant does not include Personal", () => {
  assert.deepEqual(resolveGrantedCreeds(all, [shared.id], personal), [shared]);
});

test("orphaned grants do not fall through to Personal", () => {
  assert.deepEqual(resolveGrantedCreeds(all, ["left-creed"], personal), []);
  assert.deepEqual(resolveGrantedCreeds([personal], [shared.id], personal), []);
});

test("a personal grant still loads Personal", () => {
  assert.deepEqual(resolveGrantedCreeds(all, [personal.id], personal), [personal]);
});

test("leaving one of several granted Creeds keeps the rest", () => {
  assert.deepEqual(
    resolveGrantedCreeds([personal], [personal.id, shared.id], personal),
    [personal],
  );
});

test("the MCP route uses grant resolution instead of injecting Personal", () => {
  const route = readFileSync(new URL("../app/mcp/route.ts", import.meta.url), "utf8");
  assert.match(route, /resolveGrantedCreeds\(/);
  assert.doesNotMatch(
    route,
    /if \(creeds\.length === 0 && personal\) creeds = \[personal\]/,
  );
});
