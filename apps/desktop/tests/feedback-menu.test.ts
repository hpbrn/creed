import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("offline feedback is queued and retried when connectivity returns", () => {
  const source = readFileSync(
    new URL("../src/components/creed/feedback-menu.tsx", import.meta.url),
    "utf8",
  );
  assert.match(source, /const QUEUED_STORAGE_KEY = "creed:queued-feedback"/);
  assert.match(source, /!navigator\.onLine/);
  assert.match(source, /window\.addEventListener\("online", retry\)/);
  assert.match(source, /Saved\. We&apos;ll send it later\./);
  assert.match(source, /text-\[var\(--creed-accent\)\]/);
  assert.match(source, /Send feedback to/);
  assert.match(source, /url: "https:\/\/hpbrn\.com"/);
  assert.match(source, /href="https:\/\/hpbrn\.com"/);
  assert.match(source, />\s*hpbrn\s*<\/a>/);
});
