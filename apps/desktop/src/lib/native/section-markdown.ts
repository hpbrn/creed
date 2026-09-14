import { markdownToRichHtml } from "../creed/rich-text";
import { richTextToMarkdown } from "../creed/creed-data";

export function restoreDraftFormatting(draft: string, canonical: string): string {
  return richTextToMarkdown(draft).trim() === richTextToMarkdown(canonical).trim()
    ? canonical
    : draft;
}

export function sectionMarkdownToHtml(markdown: string): string {
  let fence: { marker: string; length: number } | null = null;
  const body = markdown
    .split("\n")
    .map((line) => {
      const marker = line.match(/^\s{0,3}(`{3,}|~{3,})/);
      if (fence) {
        if (
          marker &&
          marker[1][0] === fence.marker &&
          marker[1].length >= fence.length &&
          line.slice(marker[0].length).trim() === ""
        )
          fence = null;
        return line;
      }
      if (marker) {
        fence = { marker: marker[1][0], length: marker[1].length };
        return line;
      }
      // File headings sit one level beneath the section's own ## heading.
      return line.replace(
        /^(#{3,6})\s+/,
        (_match, hashes: string) => `${"#".repeat(hashes.length - 1)} `,
      );
    })
    .join("\n");
  return markdownToRichHtml(body);
}
