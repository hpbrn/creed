import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { highlightCommand } from "../lib/command-highlight.ts";

function source(path: string) {
  return readFileSync(new URL(path, import.meta.url), "utf8");
}

function typed(source: string) {
  return highlightCommand(source).filter((token) => token.type && token.text.trim());
}

test("npm run setup colours the binary and script", () => {
  assert.deepEqual(typed("npm run setup"), [
    { type: "hljs-built_in", text: "npm" },
    { type: "hljs-string", text: "setup" },
  ]);
});

test("flags and paths stay coloured while leftover args stay plain", () => {
  const tokens = typed("npm run bench -- openai/gpt-5.6-sol --task append-durable-preference");
  assert.deepEqual(tokens, [
    { type: "hljs-built_in", text: "npm" },
    { type: "hljs-string", text: "bench" },
    { type: "hljs-comment", text: "--" },
    { type: "hljs-string", text: "openai/gpt-5.6-sol" },
    { type: "hljs-attribute", text: "--task" },
  ]);
});

test("quoted strings keep $VARS distinct from the surrounding text", () => {
  const tokens = typed(`curl -fsS https://your-creed.example/api/creed -H "Authorization: Bearer $CREED_TOKEN"`);
  assert.deepEqual(
    tokens.filter((token) => token.type === "hljs-variable" || token.type === "hljs-string" || token.type === "hljs-attribute" || token.type === "hljs-built_in"),
    [
      { type: "hljs-built_in", text: "curl" },
      { type: "hljs-attribute", text: "-fsS" },
      { type: "hljs-string", text: "https://your-creed.example/api/creed" },
      { type: "hljs-attribute", text: "-H" },
      { type: "hljs-string", text: `"Authorization: Bearer ` },
      { type: "hljs-variable", text: "$CREED_TOKEN" },
      { type: "hljs-string", text: `"` },
    ],
  );
});

test("JSON command chips colour keys separately from string values", () => {
  const tokens = typed(`{
  "mcpServers": {
    "creed": {
      "url": "https://your-creed.example/mcp"
    }
  }
}`);
  assert.ok(tokens.some((token) => token.type === "hljs-attribute" && token.text === `"url"`));
  assert.ok(
    tokens.some(
      (token) =>
        token.type === "hljs-string" && token.text === `"https://your-creed.example/mcp"`,
    ),
  );
});

test("setup, docs, and bench share the Open setup command chip", () => {
  const chip = source("../components/marketing/code-command.tsx");
  const setup = source("../../creed-open/app/setup/page.tsx");
  const docs = source("../../../apps/docs/components/docs-code.tsx");
  const bench = source("../app/bench/page.tsx");

  assert.match(
    chip,
    /creed-command relative flex h-fit w-fit max-w-full items-center gap-2\.5 overflow-hidden rounded-\[12px\] bg-\[var\(--creed-surface-raised\)\] px-3 py-\[0\.45rem\]/,
  );
  assert.match(chip, /<button/);
  assert.match(chip, /creed-command-copy/);
  assert.match(chip, /hover:bg-transparent/);
  assert.match(
    chip,
    /copied\s*\?\s*"text-\[var\(--creed-text-primary\)\] hover:text-\[var\(--creed-text-primary\)\]"/,
  );
  assert.doesNotMatch(chip, /AnimatedIconButton|icon-sm|hover:bg-muted/);
  assert.match(chip, /<CommandTokens source=\{copyText\}/);
  assert.match(chip, /absolute right-3 top-\[10px\]/);
  assert.match(
    source("../app/globals.css"),
    /ProseMirror \.creed-command code/,
  );
  assert.match(setup, /bg-\[#E2E2DE\].*dark:bg-\[#383834\]/s);
  assert.match(docs, /<CodeCommand copyText=\{children\} \/>/);
  assert.match(bench, /<CodeCommand copyText=\{copyText\} \/>/);
  assert.doesNotMatch(bench, /hljs-built_in/);
});
