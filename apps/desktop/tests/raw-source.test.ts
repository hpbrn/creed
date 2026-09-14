import assert from "node:assert/strict";
import test from "node:test";
import { sourceMayRenderDifferently } from "../src/lib/creed/markdown-capabilities";

test("source warnings ignore Creed accents and supported formatting", () => {
  assert.equal(sourceMayRenderDifferently("## Identity\n\n<!-- creed:accent=stack -->\n\n**Hello**"), false);
  assert.equal(sourceMayRenderDifferently("```html\n<div>example</div>\n```"), false);
});

test("source warnings flag preserved unsupported formatting", () => {
  for (const source of ["![Photo](photo.png)", "<details>Text</details>", "$$\nx+y\n$$", "[[Wiki]]"]) {
    assert.equal(sourceMayRenderDifferently(source), true);
  }
});
