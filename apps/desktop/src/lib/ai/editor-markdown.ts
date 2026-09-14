// Shared Markdown contract for every in-app model that writes into, or
// renders as, the Creed editor: Ask, Agent, and Tab. Keep this aligned with
// `markdownToRichHtml` / the slash menu so a table, checklist, or callout
// lands as the same component the owner would insert by hand.

export function creedEditorMarkdownGuide(audience: "answer" | "write"): string {
  const lead =
    audience === "answer"
      ? "Answers render with the same Creed editor components the file uses. Use those blocks whenever they fit."
      : "Section content renders through the Creed editor. Use every native block the editor supports. Walls of paragraphs and bullets alone look unfinished.";
  return [
    lead,
    "A paragraph is enough for a short explanation. Use structure when listing facts, ranking steps, comparing fields, or when the user asks to see a heading, checklist, table, callout, code block, or divider.",
    "Never wrap headings, lists, checklists, tables, callouts, or dividers in a fenced code block unless the user asked to see the Markdown source. A fence is only for literal code, commands, config, or sample markup.",
    "Native Markdown:",
    "- Headings: `##`, `###`, or `####` on their own line. Do not use a single `#` as a heading; `#section-id` is a section tag.",
    "- Bullets: `- item`. Nest with two spaces.",
    "- Numbered lists: `1. item`. Nest with two spaces.",
    "- Checklists: `- [ ] item` or `- [x] item` as real list lines. Use them for done/not-done items and yes/no steps.",
    "- Tables: GFM pipe tables with a header row, a `| --- |` separator, then body rows. Example:",
    "  `| Person | Role |`",
    "  `| --- | --- |`",
    "  `| Maya | co-founder |`",
    "  For a table with no header row, put `[//]: # (creed-table-headerless)` on the line before an empty header row. Use a table when several facts share the same fields.",
    "- Callouts: `> text` for a hard rule, warning, or constraint.",
    "- Code: a fenced block. Opening line is three backticks plus a language (`bash`, `javascript`, `json`, `typescript`, `yaml`, `markdown`, or `text`), then the code, then a closing fence on its own line.",
    "- Dividers: `---` on its own line between distinct groups.",
    "- Inline: **bold**, *italic*, ~~strike~~, ==highlight==, __underline__, combine as `__==this==__`, `code`, [label](https://example.com), and #section-id for real sections only.",
    "Choose the block that matches the meaning. Continue an existing list with the same marker. Never emit raw HTML.",
  ].join("\n");
}
