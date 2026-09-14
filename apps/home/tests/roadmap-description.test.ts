import assert from "node:assert/strict";
import test from "node:test";
import {
  markdownToRichHtml,
  sanitizeRichTextHtml,
} from "../src/lib/creed/rich-text.ts";

test("Linear descriptions render Markdown lists and inline formatting", () => {
  const html = sanitizeRichTextHtml(
    markdownToRichHtml(
      "Explore **views**.\n\n* Web\n* Brain\n\n[Details](https://example.com)",
    ),
  );
  assert.match(html, /<strong>views<\/strong>/);
  assert.match(html, /<ul\b[^>]*>/);
  assert.match(html, /<li\b[^>]*>Web<\/li>/);
  assert.match(html, /<li\b[^>]*>Brain<\/li>/);
  assert.match(html, /href="https:\/\/example.com"/);
  assert.doesNotMatch(html, /\* Web/);
});

test("roadmap Markdown cannot execute HTML or unsafe links", () => {
  const html = sanitizeRichTextHtml(
    markdownToRichHtml("<script>alert(1)</script>\n\n[Bad](javascript:alert)"),
  );
  assert.doesNotMatch(html, /<script|href="javascript:/);
});
