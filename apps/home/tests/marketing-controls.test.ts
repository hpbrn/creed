import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("download uses the shared accent, compact corners, and a simple label", () => {
  const source = readFileSync(
    new URL("../src/components/marketing/download-button.tsx", import.meta.url),
    "utf8",
  );
  assert.match(source, /hover:bg-\[var\(--creed-accent-hover\)\]/);
  assert.match(source, /rounded-sm/);
  assert.match(source, />Download<\/span>/);
  assert.match(source, /download="Creed.dmg"/);
  assert.doesNotMatch(source, /Get Creed|DownloadConfirmIcon/);
});

test("homepage wordmarks retain blue hover and return to the top", () => {
  const chrome = readFileSync(
    new URL("../src/components/marketing/site-chrome.tsx", import.meta.url),
    "utf8",
  );
  assert.match(chrome, /hover:\[--creed-wordmark-hover-color:#0066FF\]/);
  assert.match(chrome, /window\.scrollTo/);
  assert.match(chrome, /prefers-reduced-motion/);
  assert.match(chrome, /\{scrolled \? \(/);
  assert.ok(
    chrome.indexOf("<GitHubStarButton />") <
      chrome.indexOf("<DownloadButton />"),
  );
});
