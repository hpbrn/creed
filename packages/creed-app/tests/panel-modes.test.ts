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
    /<\/button>\s*<span[\s\S]*?className="hidden[^"]*md:inline-flex"/,
  );
});

test("panel command rows match the sidebar button height", () => {
  const panel = readFileSync(
    new URL("../components/creed/panel.tsx", import.meta.url),
    "utf8",
  );

  assert.match(panel, /const PANEL_COMMAND_ROW_CLASS =\s*"flex h-8 w-full items-center gap-2\.5/);
  assert.doesNotMatch(panel, /px-2\.5 py-2 text-left text-\[14px\]/);
});

test("panel search field is the same 40px as the footer", () => {
  const panel = readFileSync(
    new URL("../components/creed/panel.tsx", import.meta.url),
    "utf8",
  );
  const mention = readFileSync(
    new URL("../components/creed/mention-input.tsx", import.meta.url),
    "utf8",
  );

  assert.match(panel, /className="h-10 w-full bg-transparent text-\[15px\]/);
  assert.doesNotMatch(panel, /h-\[52px\]/);
  assert.match(mention, /min-h-10 w-full whitespace-pre-wrap/);
  assert.doesNotMatch(mention, /min-h-\[52px\]|py-\[15px\]/);
});

test("panel icons play through before they can start again", () => {
  const panel = readFileSync(
    new URL("../components/creed/panel.tsx", import.meta.url),
    "utf8",
  );

  assert.match(panel, /function PanelCommandButton/);
  assert.match(panel, /useAnimatedIconControls\(\)/);
  assert.match(panel, /onMouseEnter=\{\(\) => \{\s*onHover\(\);\s*start\(\);/);
  assert.match(panel, /onMouseLeave=\{settle\}/);
  assert.doesNotMatch(panel, /if \(active\) ref\.current\?\.startAnimation\(\)/);
});

test("proposal command labels keep space around the middot", () => {
  const panel = readFileSync(
    new URL("../components/creed/panel.tsx", import.meta.url),
    "utf8",
  );

  assert.match(panel, /label: `\$\{proposal\.sectionName\} · \$\{proposal\.agentName\}`/);
  assert.match(panel, /<span className="px-\[0\.4em\]">·<\/span>/);
});
