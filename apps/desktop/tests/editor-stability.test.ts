import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";

test("editor mode changes do not publish synthetic content updates", () => {
  const source = readFileSync(
    new URL("../src/components/creed/rich-text-editor.tsx", import.meta.url),
    "utf8",
  );
  assert.doesNotMatch(source, /setEditable\(active && !readOnly\)/);
  assert.match(source, /setEditable\(active && !readOnly, false\)/);
  assert.match(source, /editor.state.doc !== documentAtRead/);
  assert.match(source, /editor.isFocused \|\|\s+localDirtyRef.current/);
});

test("section composer grows into place and uses its Cancel action", () => {
  const source = readFileSync(
    new URL("../src/components/creed/file-screen.tsx", import.meta.url),
    "utf8",
  );
  assert.match(source, /initial=\{\{ height: 50, opacity: 0 \}\}/);
  assert.match(source, /Give your section a name\./);
  assert.doesNotMatch(source, /Pick a starter|Close composer/);
});

test("editor interactions leave composing text to the input method", () => {
  const source = readFileSync(
    new URL("../src/components/creed/rich-text-editor.tsx", import.meta.url),
    "utf8",
  );
  assert.equal(
    source.match(/event.isComposing \|\| view.composing/g)?.length,
    3,
  );
  assert.match(source, /event.nativeEvent.isComposing/);
  assert.match(source, /aria-pressed=\{active\}/);
});

test("an ineligible Tab cannot move focus out of the editor", () => {
  const source = readFileSync(
    new URL(
      "../src/components/creed/extensions/tab-complete.ts",
      import.meta.url,
    ),
    "utf8",
  );
  assert.match(
    source,
    /const emptySection = !view\.state\.doc\.textContent\.trim\(\)/,
  );
  assert.match(
    source,
    /if \(!emptySection && !canInvokeTabComplete\(view\.state\)\) \{[\s\S]*?event\.preventDefault\(\);[\s\S]*?return true;/,
  );
});

test("Ask streams plain model text instead of requiring a JSON envelope", () => {
  const source = readFileSync(
    new URL("../src/lib/native/ai-requests.ts", import.meta.url),
    "utf8",
  );
  assert.match(
    source,
    /if \(mode === "ask"\)[\s\S]*?controller\.enqueue\(encoder\.encode\(delta\)\)/,
  );
});

test("Ask reveals structural markdown in its ordered waterfall", () => {
  const source = readFileSync(
    new URL("../src/components/creed/rich-answer.tsx", import.meta.url),
    "utf8",
  );
  assert.match(source, /function revealNode\(/);
  assert.match(source, /<motion\.blockquote/);
  assert.match(source, /function AnswerTableRow\(/);
  assert.match(source, /<motion\.hr/);
});

test("panel scrolls once for a submitted turn without following output", () => {
  const source = readFileSync(
    new URL("../src/components/creed/panel.tsx", import.meta.url),
    "utf8",
  );
  assert.match(
    source,
    /pendingOutputScrollRef\.current = true;[\s\S]*?setAskTurns/,
  );
  assert.match(source, /if \(!pendingOutputScrollRef\.current\) return/);
  assert.match(source, /pendingOutputScrollRef\.current = false/);
  assert.match(source, /behavior: reduceMotion \? "auto" : "smooth"/);
  assert.doesNotMatch(source, /outputRef/);
});

test("Smart Find does not retain an empty result body while working", () => {
  const source = readFileSync(
    new URL("../src/components/creed/panel.tsx", import.meta.url),
    "utf8",
  );
  assert.match(source, /searchPhase === "working" \? null/);
});

test("Find highlights and disclosure chevrons do not animate an underline or translation", () => {
  const highlights = readFileSync(
    new URL("../src/components/creed/find-highlights.tsx", import.meta.url),
    "utf8",
  );
  const chevron = readFileSync(
    new URL("../src/components/ui/chevron-down.tsx", import.meta.url),
    "utf8",
  );
  const switcher = readFileSync(
    new URL("../src/components/creed/creed-switcher.tsx", import.meta.url),
    "utf8",
  );
  assert.doesNotMatch(highlights, /boxShadow/);
  assert.doesNotMatch(chevron, /motion\.svg|useAnimation|variants=/);
  assert.doesNotMatch(
    switcher,
    /group-data-\[state=open\]\/switcher:rotate-180/,
  );
});

test("action spinners wait before replacing stable button content", () => {
  const spinner = readFileSync(
    new URL("../src/components/ui/delayed-spinner.tsx", import.meta.url),
    "utf8",
  );
  const settings = readFileSync(
    new URL("../src/components/creed/settings-screen.tsx", import.meta.url),
    "utf8",
  );
  assert.match(spinner, /SPINNER_DELAY_MS = 180/);
  assert.match(
    spinner,
    /window\.setTimeout\(\(\) => setVisible\(true\), delay\)/,
  );
  assert.match(settings, /<DelayedSpinner pending=\{aiSaving\}/);
  assert.match(settings, /fallback=\{/);
});

test("answer code blocks keep syntax highlighting without a language badge", () => {
  const source = readFileSync(
    new URL("../src/components/creed/code-block.tsx", import.meta.url),
    "utf8",
  );
  assert.match(source, /highlightCreedCode\(code, normalizedLanguage\)/);
  assert.doesNotMatch(source, /text-\[10px\] uppercase/);
});

test("desktop has no developer preview surface or preview shortcuts", () => {
  const desktop = readFileSync(
    new URL("../src/app/desktop.tsx", import.meta.url),
    "utf8",
  );
  const updates = readFileSync(
    new URL("../src/lib/native/updates.tsx", import.meta.url),
    "utf8",
  );
  assert.doesNotMatch(
    desktop,
    /DevUiPreview|DEV_PREVIEWS_ENABLED|key\.toLowerCase\(\) === "u"/,
  );
  assert.doesNotMatch(updates, /showUpdateToastPreview|previewRun/);
  assert.match(updates, /HardDriveDownload/);
  assert.equal(
    existsSync(
      new URL("../src/components/creed/dev-ui-preview.tsx", import.meta.url),
    ),
    false,
  );
});
