import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("Creed switcher shortcuts remain visible at every window width", () => {
  const switcher = readFileSync(
    new URL("../src/components/creed/creed-switcher.tsx", import.meta.url),
    "utf8",
  );
  assert.match(switcher, /<ShortcutKey>C<\/ShortcutKey>/);
  assert.match(
    switcher,
    /<ShortcutKey className="translate-x-0\.5">N<\/ShortcutKey>/,
  );
  assert.match(switcher, /const isNewCreedShortcut = event.key === "n"/);
  assert.match(switcher, /!isNewCreedShortcut && !activeId/);
  assert.match(switcher, /const SWITCHER_PRESS_CLASS/);
  assert.match(switcher, /creed-press-surface/);
  assert.match(switcher, /"-translate-x-0\.5 text-\[var\(--creed-text-primary\)\]!"/);
});

test("live resize preserves the normal sidebar transition", () => {
  const css = readFileSync(
    new URL("../src/styles/desktop.css", import.meta.url),
    "utf8",
  );
  assert.doesNotMatch(css, /data-creed-resizing/);
  const shell = readFileSync(
    new URL("../src/components/creed/shell.tsx", import.meta.url),
    "utf8",
  );
  assert.match(shell, /transition-\[width\]/);
  assert.match(shell, /SIDEBAR_COLLAPSE_MOTION/);
});

test("toolbar visibility changes are not animated by the shared button transition", () => {
  const css = readFileSync(
    new URL("../src/styles/desktop.css", import.meta.url),
    "utf8",
  );
  const rule = css.match(
    /\.creed-responsive-toolbar \.creed-toolbar-actions > button\s*\{([^}]+)\}/,
  )?.[1];
  assert.ok(rule);
  assert.match(rule, /transition-property:/);
  assert.doesNotMatch(rule, /\b(all|visibility|width)\b/);
});

test("automatic and manual sidebar collapse share exact rail geometry", () => {
  const shell = readFileSync(
    new URL("../src/components/creed/shell.tsx", import.meta.url),
    "utf8",
  );
  assert.match(shell, /preferredCollapsed \|\| !sidebarAvailable/);
  assert.match(shell, /collapsed \? "w-12" : "w-\[220px\]"/);
  assert.doesNotMatch(shell, /animatingSidebar|w-\[calc\(3rem\+1px\)\]/);
});

test("sidebar icons keep a fixed slot and Sections crossfades at fixed positions", () => {
  const presentation = readFileSync(
    new URL("../src/components/creed/file-presentation.tsx", import.meta.url),
    "utf8",
  );
  const shell = readFileSync(
    new URL("../src/components/creed/shell.tsx", import.meta.url),
    "utf8",
  );
  assert.match(
    presentation,
    /inline-flex h-8 w-8 shrink-0 items-center justify-center/,
  );
  assert.doesNotMatch(presentation, /transition-\[width,translate\]/);
  assert.match(shell, /absolute left-3 whitespace-nowrap/);
  assert.match(shell, /absolute left-\[9px\]/);
});

test("desktop root and scroll surfaces suppress rubber-band overscroll", () => {
  const css = readFileSync(
    new URL("../src/styles/desktop.css", import.meta.url),
    "utf8",
  );
  assert.match(
    css,
    /#root\s*\{[^}]*overflow: hidden;[^}]*overscroll-behavior: none;/,
  );
  assert.match(
    css,
    /\[data-slot="scroll-area-viewport"\]\s*\{\s*overscroll-behavior: none;/,
  );
});
