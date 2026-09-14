import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("Locate and Remove share geometry and row-hover visibility", () => {
  const source = readFileSync(
    new URL("../src/components/creed/creed-switcher.tsx", import.meta.url),
    "utf8",
  );
  const locate = source.match(/className="creed-switcher-locate ([^"]+)"/)?.[1];
  const remove = source.match(/className="creed-switcher-remove ([^"]+)"/)?.[1];
  assert.ok(locate);
  assert.equal(locate, remove);
  assert.match(locate, /opacity-0/);
  assert.match(locate, /group-hover\/creed-row:opacity-100/);
  assert.match(locate, /focus-visible:opacity-100/);
  assert.doesNotMatch(source, /title="Locate file"/);
  assert.equal(
    source.match(/onPointerUp=\{\(event\) => event.stopPropagation\(\)\}/g)
      ?.length,
    2,
  );
});

test("the active Creed checkmark uses the theme foreground without hover state", () => {
  const source = readFileSync(
    new URL("../src/components/creed/creed-switcher.tsx", import.meta.url),
    "utf8",
  );
  assert.match(source, /\{isActive \? \(/);
  assert.match(source, /text-\[var\(--creed-text-primary\)\]!/);
  const activeBranch = source.split("{isActive ? (")[1].split(") : (")[0];
  assert.ok(activeBranch);
  assert.doesNotMatch(activeBranch, /group-hover/);
});
