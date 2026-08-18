import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const editor = readFileSync(
  new URL("../components/creed/rich-text-editor.tsx", import.meta.url),
  "utf8",
);

test("mobile Tab toolbar keeps its right edge inside the visual viewport", () => {
  const toolbar = editor.match(
    /\{active && editor && mobileTabToolbar && !readOnly \? \([\s\S]*?<\/motion\.div>/,
  )?.[0];

  assert.ok(toolbar);
  assert.match(toolbar, /animate=\{\{ opacity: 1, x: "-100%", y: 0, scale: 1 \}\}/);
  assert.doesNotMatch(toolbar, /-translate-x-full/);
  assert.doesNotMatch(toolbar, /!state\.selection\.empty/);
  assert.match(toolbar, /invokeMobileTabCompletion\(editor\.view\)/);
});
