// Shared Markdown contract for every in-app model that writes into, or
// renders as, the Creed editor: Ask, Agent, and Tab. Keep this aligned with
// `markdownToRichHtml` / the slash menu so a table, checklist, or callout
// lands as the same component the owner would insert by hand.

export function creedEditorMarkdownGuide(audience: "answer" | "write"): string {
  const lead =
    audience === "answer"
      ? "Answers render with the same Creed editor components the file uses. Use those blocks whenever they fit the question."
      : "Section content renders through the Creed editor. Use every native block the editor supports. Walls of paragraphs and bullets alone look unfinished.";
  return [
    lead,
    "Native Markdown:",
    "- Headings: ## to #### on their own line.",
    "- Bullets: `- item`. Nest with two spaces.",
    "- Numbered lists: `1. item`. Nest with two spaces.",
    "- Checklists: `- [ ] item` or `- [x] item`.",
    "- Tables: GFM pipe tables with a header row, a `| --- |` separator, then body rows. Example:",
    "  `| Person | Role |`",
    "  `| --- | --- |`",
    "  `| Maya | co-founder |`",
    "  For a table with no header row, put `[//]: # (creed-table-headerless)` on the line before an empty header row.",
    "- Callouts: `> text` for a hard rule or warning.",
    "- Code: fenced blocks with a language.",
    "- Dividers: `---` between distinct groups.",
    "- Inline: **bold**, *italic*, ~~strike~~, ==highlight==, __underline__, `code`, [label](https://...), and #section-id for real sections only.",
    "Choose the block that matches the meaning. Use a table when several facts share the same fields. Continue an existing list with the same marker. Never emit raw HTML.",
  ].join("\n");
}
