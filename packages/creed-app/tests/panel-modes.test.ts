import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { nextPanelMode } from "../lib/panel/modes.ts";

test("panel modes cycle from Search to Ask to Agent", () => {
  assert.equal(nextPanelMode("search"), "ask");
  assert.equal(nextPanelMode("ask"), "agent");
  assert.equal(nextPanelMode("agent"), "search");
});

test("only the mobile panel icon switches modes", () => {
  const panel = readFileSync(
    new URL("../components/creed/panel.tsx", import.meta.url),
    "utf8",
  );

  assert.equal(panel.match(/data-panel-mode-switch/g)?.length, 1);
  assert.match(
    panel,
    /data-panel-mode-switch[\s\S]{0,600}className="[^"]*md:hidden"/,
  );
  assert.match(
    panel,
    /<\/button>\s*<span className="hidden[^"]*md:inline-flex">/,
  );
});
