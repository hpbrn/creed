import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("desktop and website share stationary popup anchors and reduced-motion press rules", () => {
  const desktop = readFileSync(new URL("../src/styles/globals.css", import.meta.url), "utf8");
  const home = readFileSync(new URL("../../home/src/app/globals.css", import.meta.url), "utf8");
  const pressRules = (css: string) => css.split("@source")[0].replace(/^@import.*\n/gm, "").trim();
  assert.equal(pressRules(desktop), pressRules(home));
  assert.match(desktop, /scale: 0\.98/);
  assert.match(desktop, /\[aria-haspopup\]/);
  assert.match(desktop, /transform: none !important/);
  assert.match(desktop, /:not\(:has\(> \.creed-press-surface\)\)/);
  assert.match(desktop, /prefers-reduced-motion: reduce/);
  assert.match(desktop, /\.creed-press-card:has\(> button:active\)/);
  assert.ok(desktop.includes(".creed-press-card:has(> div > button[data-proposal-toggle]:active)"));
  const proposals = readFileSync(new URL("../src/components/creed/inline-proposal-diff.tsx", import.meta.url), "utf8");
  assert.equal(proposals.match(/data-proposal-toggle/g)?.length, 3);
  assert.equal(proposals.match(/creed-press-card/g)?.length, 3);
  assert.doesNotMatch(proposals, /expanded && "[^"]*text-/);
  assert.match(desktop, /button\.creed-popup-button/);
  const button = readFileSync(new URL("../src/components/ui/button.tsx", import.meta.url), "utf8");
  assert.match(button, /cn\(styles, "creed-press-surface w-full"\)/);
  assert.match(button, /style=\{props.style\}/);
});
