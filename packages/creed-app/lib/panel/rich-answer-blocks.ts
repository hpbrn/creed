import { HEADERLESS_TABLE_MARK } from "@creed/core/rich-text";

export type ListKind = "bullets" | "numbered" | "tasks";

export type ListNode = {
  kind: ListKind;
  text: string;
  checked?: boolean;
  children: ListGroup[];
};

export type ListGroup = {
  kind: ListKind;
  items: ListNode[];
};

export type AnswerBlock =
  | { kind: "heading"; level: number; text: string }
  | { kind: "list"; groups: ListGroup[] }
  | { kind: "callout"; text: string }
  | { kind: "code"; language: string; text: string }
  | { kind: "divider" }
  | { kind: "paragraph"; text: string }
  | {
      kind: "table";
      headerless: boolean;
      headers: string[];
      rows: string[][];
    };

type FlatListItem = {
  indent: number;
  kind: ListKind;
  text: string;
  checked?: boolean;
};

function isPipeRow(line: string) {
  return /^\|.+\|$/.test(line);
}

function splitTableCells(line: string) {
  const inner = line.replace(/^\|/, "").replace(/\|$/, "");
  const cells: string[] = [];
  let current = "";
  for (let i = 0; i < inner.length; i += 1) {
    if (inner[i] === "\\" && inner[i + 1] === "|") {
      current += "|";
      i += 1;
      continue;
    }
    if (inner[i] === "|") {
      cells.push(current.trim());
      current = "";
      continue;
    }
    current += inner[i];
  }
  cells.push(current.trim());
  return cells;
}

function isSeparatorRow(line: string) {
  if (!isPipeRow(line)) return false;
  const cells = splitTableCells(line);
  return (
    cells.length > 0 &&
    cells.every((cell) => /^:?-+:?$/.test(cell.replace(/\s+/g, "")))
  );
}

function padRow(cells: string[], width: number) {
  const next = cells.slice(0, width);
  while (next.length < width) next.push("");
  return next;
}

function parseListLine(line: string): FlatListItem | null {
  const match = line.match(/^([ \t]*)([-*]|\d+\.)[ \t]+(.*)$/);
  if (!match) return null;
  const indent = match[1].replace(/\t/g, "  ").length;
  const marker = match[2];
  const rest = match[3];
  if (marker === "-" || marker === "*") {
    const task = rest.match(/^\[([ xX])\](?:[ \t]+(.*))?$/);
    if (task) {
      return {
        indent,
        kind: "tasks",
        checked: task[1].toLowerCase() === "x",
        text: task[2] ?? "",
      };
    }
    return { indent, kind: "bullets", text: rest };
  }
  return { indent, kind: "numbered", text: rest };
}

function forest(items: FlatListItem[], base: number): ListGroup[] {
  if (items.length === 0) return [];
  const groups: ListGroup[] = [];
  let index = 0;
  while (index < items.length) {
    const kind = items[index].kind;
    const nodes: ListNode[] = [];
    while (
      index < items.length &&
      items[index].indent === base &&
      items[index].kind === kind
    ) {
      const item = items[index];
      index += 1;
      const childStart = index;
      while (index < items.length && items[index].indent > base) {
        index += 1;
      }
      nodes.push({
        kind: item.kind,
        text: item.text,
        checked: item.checked,
        children: forest(items.slice(childStart, index), items[childStart]?.indent ?? base + 2),
      });
    }
    groups.push({ kind, items: nodes });
  }
  return groups;
}

function flushTableRows(
  rows: string[],
  headerless: boolean,
): AnswerBlock | { kind: "paragraph"; text: string } | null {
  if (rows.length === 0) return null;
  if (rows.length >= 2 && isSeparatorRow(rows[1])) {
    const headers = splitTableCells(rows[0]);
    const width = headers.length;
    if (width > 0) {
      return {
        kind: "table",
        headerless,
        headers: padRow(headers, width),
        rows: rows.slice(2).map((row) => padRow(splitTableCells(row), width)),
      };
    }
  }
  return { kind: "paragraph", text: rows.join(" ") };
}

export function parseAnswerBlocks(markdown: string): AnswerBlock[] {
  const lines = markdown.replace(/\r/g, "").split("\n");
  const blocks: AnswerBlock[] = [];
  let paragraph: string[] = [];
  let listItems: FlatListItem[] = [];
  let callout: string[] = [];
  let code: { language: string; lines: string[] } | null = null;
  let tableRows: string[] | null = null;
  let tableHeaderless = false;

  const flushParagraph = () => {
    if (paragraph.length) {
      blocks.push({ kind: "paragraph", text: paragraph.join(" ") });
      paragraph = [];
    }
  };
  const flushList = () => {
    if (!listItems.length) return;
    const groups = forest(listItems, listItems[0].indent);
    if (groups.length) blocks.push({ kind: "list", groups });
    listItems = [];
  };
  const flushCallout = () => {
    if (callout.length) {
      blocks.push({ kind: "callout", text: callout.join(" ") });
      callout = [];
    }
  };
  const flushTable = () => {
    const headerless = tableHeaderless;
    tableHeaderless = false;
    if (!tableRows) return;
    const parsed = flushTableRows(tableRows, headerless);
    tableRows = null;
    if (!parsed) return;
    if (parsed.kind === "paragraph") {
      paragraph.push(parsed.text);
      flushParagraph();
      return;
    }
    blocks.push(parsed);
  };
  const flushFlow = () => {
    flushParagraph();
    flushList();
    flushCallout();
    flushTable();
  };

  for (const raw of lines) {
    const line = raw.trimEnd();
    const trimmed = line.trim();

    if (code) {
      if (trimmed === "```") {
        blocks.push({
          kind: "code",
          language: code.language,
          text: code.lines.join("\n"),
        });
        code = null;
      } else {
        code.lines.push(raw);
      }
      continue;
    }

    const fence = trimmed.match(/^```([\w.+-]*)$/);
    if (fence) {
      flushFlow();
      code = { language: fence[1], lines: [] };
      continue;
    }

    if (tableRows && !isPipeRow(trimmed)) {
      flushTable();
    }

    if (!trimmed) {
      flushFlow();
      continue;
    }

    if (trimmed === HEADERLESS_TABLE_MARK) {
      flushParagraph();
      flushList();
      flushCallout();
      flushTable();
      tableHeaderless = true;
      continue;
    }

    if (isPipeRow(trimmed)) {
      flushParagraph();
      flushList();
      flushCallout();
      if (!tableRows) tableRows = [];
      tableRows.push(trimmed);
      continue;
    }

    if (/^([-*_])\1{2,}$/.test(trimmed)) {
      flushFlow();
      blocks.push({ kind: "divider" });
      continue;
    }

    const heading = trimmed.match(/^(#{1,6})\s+(.*)$/);
    if (heading) {
      flushFlow();
      blocks.push({
        kind: "heading",
        level: heading[1].length,
        text: heading[2],
      });
      continue;
    }

    const quote = trimmed.match(/^>\s?(.*)$/);
    if (quote) {
      flushParagraph();
      flushList();
      flushTable();
      callout.push(quote[1]);
      continue;
    }

    const listLine = parseListLine(line);
    if (listLine) {
      flushParagraph();
      flushCallout();
      flushTable();
      listItems.push(listLine);
      continue;
    }

    flushList();
    flushCallout();
    paragraph.push(trimmed);
  }

  if (code) {
    blocks.push({
      kind: "code",
      language: code.language,
      text: code.lines.join("\n"),
    });
  }
  flushFlow();
  return blocks;
}
