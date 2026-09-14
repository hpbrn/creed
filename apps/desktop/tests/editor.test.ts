import assert from "node:assert/strict";
import test from "node:test";
import {
  buildVisibleCreedMarkdown,
  richTextToMarkdown,
  type CreedSection,
} from "../src/lib/creed/creed-data";
import { markdownToRichHtml } from "../src/lib/creed/rich-text";
import { needsSourceEditor } from "../src/lib/creed/markdown-capabilities";
import {
  restoreDraftFormatting,
  sectionMarkdownToHtml,
} from "../src/lib/native/section-markdown";
import { findSectionReferenceTarget } from "../src/lib/creed/section-references";
import { sanitizeTabCompletion } from "../src/lib/ai/tab";

test("Tab completion separates a new word from the current text", () => {
  assert.equal(sanitizeTabCompletion("next step", "Write"), " next step");
  assert.equal(sanitizeTabCompletion(" next step", "Write"), " next step");
});

test("Mono exports omit color metadata while blue exports retain it", () => {
  const section: CreedSection = {
    id: "identity",
    name: "Identity",
    kind: "rich-text",
    template: "freeform",
    accent: "mono",
    content: "<p>Text</p>",
    agentWritable: true,
    lastEditedBy: "You",
    lastEditedType: "user",
    lastEditedLabel: "",
  };
  assert.doesNotMatch(buildVisibleCreedMarkdown([section]), /creed:accent/);
  assert.match(
    buildVisibleCreedMarkdown([{ ...section, accent: "stack" }]),
    /<!-- creed:accent=stack -->/,
  );
});

test("draft recovery preserves canonical heading formatting without dropping edits", () => {
  const canonical = "<h4>Durable traits</h4><p>Original text</p>";
  assert.equal(
    restoreDraftFormatting(
      "<p>##### Durable traits</p><p>Original text</p>",
      canonical,
    ),
    canonical,
  );
  const edited = "<p>##### Durable traits</p><p>Unsaved change</p>";
  assert.equal(restoreDraftFormatting(edited, canonical), edited);
});

test("file section headings reopen at their original editor levels", () => {
  const html =
    "<h2>Overview</h2><h3>Details</h3><h4>Durable traits</h4><p>Text</p>";
  assert.equal(sectionMarkdownToHtml(richTextToMarkdown(html)), html);
  assert.equal(
    sectionMarkdownToHtml("##### Durable traits\n\n- **One**\n- Two"),
    markdownToRichHtml("#### Durable traits\n\n- **One**\n- Two"),
  );
});

test("section heading conversion leaves fenced Markdown examples untouched", () => {
  assert.match(
    sectionMarkdownToHtml("```markdown\n##### Example\n```"),
    /<code>##### Example<\/code>/,
  );
});

test("desktop renders the representative Creed section components", () => {
  const html = sectionMarkdownToHtml(`##### Centre of gravity

- **Architect** is the professional arena.
- **Creed** is the long-term project.

---

> Build capable systems, then make them feel obvious.

| Area | Current state |
| --- | --- |
| Timezone | Europe/London |

Related: #section-1788251990826`);
  assert.match(html, /^<h4>Centre of gravity<\/h4>/);
  assert.match(html, /<ul class="creed-list creed-list-bullet">/);
  assert.match(html, /<strong>Architect<\/strong>/);
  assert.match(html, /<hr class="creed-hr" \/>/);
  assert.match(html, /<blockquote class="creed-callout">/);
  assert.match(html, /<table class="creed-table">/);
  assert.match(html, /data-tag="section-1788251990826"/);
});

test("legacy web section ids resolve after importing a Markdown file", () => {
  const sections = [
    { id: "local-identity", name: "Identity" },
    { id: "local-principles", name: "Principles" },
    { id: "local-goals", name: "Goals" },
    { id: "local-now", name: "Now" },
    { id: "local-work", name: "Work" },
    { id: "local-preferences", name: "Preferences" },
    { id: "local-boundaries", name: "Boundaries" },
    { id: "local-rhythm", name: "Rhythm" },
  ];
  const references = {
    "64c6096b-430a-4c00-981d-714a6b0c8b97": "Identity",
    "section-1788251990826": "Principles",
    "ca2aeea9-b64c-46b6-9bc0-94291b9de2e1": "Goals",
    "section-1788251968994": "Now",
    "755d131c-97ec-4301-938b-4cf836dea5ee": "Work",
    "6d5e49b9-32ed-42e5-963f-c57d27569bf0": "Preferences",
    "section-1788251979989": "Boundaries",
    routines: "Rhythm",
  };
  for (const [reference, expected] of Object.entries(references)) {
    assert.equal(
      findSectionReferenceTarget(reference, sections)?.name,
      expected,
    );
  }
});

test("editor serializes subsection headings below document section headings", () => {
  assert.match(
    richTextToMarkdown("<h2>Details</h2><p>Text</p>"),
    /^### Details/m,
  );
});

test("editor keeps emphasis, code and ordinary paragraphs", () => {
  const markdown = "A **clear** preference with `code`.";
  const result = richTextToMarkdown(markdownToRichHtml(markdown));
  assert.match(result, /\*\*clear\*\*/);
  assert.match(result, /`code`/);
});

test("highlight and underline survive a file save and reopen", () => {
  const markdown = richTextToMarkdown(
    "<p>A <mark>highlight</mark> and <u>underline</u>.</p>",
  );
  const reopened = markdownToRichHtml(markdown);
  assert.match(reopened, /<mark>highlight<\/mark>/);
  assert.match(reopened, /<u>underline<\/u>/);
});

test("rendering imported HTML does not retain executable script markup", () => {
  const rendered = markdownToRichHtml(
    '<script>alert("no")</script>\n\nOrdinary text',
  );
  assert.doesNotMatch(rendered, /<script[\s>]/i);
  assert.match(rendered, /Ordinary text/);
});

test("unsupported Markdown stays in the lossless source editor", () => {
  assert.equal(needsSourceEditor("![Photo](./photo.png)"), true);
  assert.equal(needsSourceEditor("Text[^note]\n\n[^note]: Details"), true);
  assert.equal(needsSourceEditor("A **clear** preference with `code`."), false);
  assert.equal(needsSourceEditor("```html\n<div>code</div>\n```"), false);
});
