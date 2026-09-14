import { diffLines, diffWordsWithSpace, type Change } from "diff";
import { richTextToMarkdown } from "@/lib/creed/creed-data";

export type DiffLineKind = "added" | "removed" | "unchanged";

export type DiffLine = {
  kind: DiffLineKind;
  value: string;
  inlineParts?: Change[];
};

export type CreedDiff = {
  lines: DiffLine[];
  added: number;
  removed: number;
};

const HTML_CONTENT = /^\s*<(?:p|h[1-6]|div|ul|ol|blockquote|pre|table)(?:\s|>)/i;

export function canonicalDiffMarkdown(value: string) {
  return (HTML_CONTENT.test(value) ? richTextToMarkdown(value) : value)
    .replace(/\r\n?/g, "\n");
}

function chunkLines(value: string) {
  const lines = value.replace(/\n$/, "").split("\n");
  return lines.length === 1 && lines[0] === "" ? [] : lines;
}

function withInlineChanges(lines: DiffLine[]) {
  const result: DiffLine[] = [];
  let index = 0;

  while (index < lines.length) {
    if (lines[index].kind !== "removed") {
      result.push(lines[index]);
      index += 1;
      continue;
    }

    const removed: DiffLine[] = [];
    while (lines[index]?.kind === "removed") {
      removed.push(lines[index]);
      index += 1;
    }

    const added: DiffLine[] = [];
    while (lines[index]?.kind === "added") {
      added.push(lines[index]);
      index += 1;
    }

    const paired = Math.min(removed.length, added.length);
    for (let pair = 0; pair < paired; pair += 1) {
      const parts = diffWordsWithSpace(removed[pair].value, added[pair].value);
      removed[pair] = { ...removed[pair], inlineParts: parts };
      added[pair] = { ...added[pair], inlineParts: parts };
    }
    result.push(...removed, ...added);
  }

  return result;
}

export function computeCreedDiff(
  existing: string,
  proposed: string,
): CreedDiff {
  const before = canonicalDiffMarkdown(existing);
  const after = canonicalDiffMarkdown(proposed);
  const lines: DiffLine[] = [];

  for (const part of diffLines(before, after)) {
    const kind: DiffLineKind = part.added
      ? "added"
      : part.removed
        ? "removed"
        : "unchanged";
    for (const value of chunkLines(part.value)) {
      lines.push({ kind, value });
    }
  }

  const detailedLines = withInlineChanges(lines);
  return {
    lines: detailedLines,
    added: detailedLines.filter((line) => line.kind === "added").length,
    removed: detailedLines.filter((line) => line.kind === "removed").length,
  };
}

export function hasDiffChanges(diff: CreedDiff) {
  return diff.added > 0 || diff.removed > 0;
}

export type DiffDisplayLine = Omit<DiffLine, "kind"> & {
  kind: DiffLineKind | "modified";
};

export function diffDisplayLines(diff: CreedDiff): DiffDisplayLine[] {
  return diff.lines.flatMap((line): DiffDisplayLine[] => {
    if (!line.inlineParts) return [line];
    return line.kind === "removed" ? [{ ...line, kind: "modified" }] : [];
  });
}
