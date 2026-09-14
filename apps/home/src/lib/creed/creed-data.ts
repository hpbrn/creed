export const ACCENT_KEYS = [
  "identity",
  "stack",
  "operating-principles",
  "decisions",
  "preferences",
  "workflows",
  "tools",
  "boundaries",
  "questions",
  "skills",
  "mini-skills",
  "projects",
  "output",
  "rose",
  "yellow",
  "sage",
  "powder",
  "violet",
  "cyan",
  "lime",
  "emerald",
  "lemon",
  "ocean",
  "lavender",
  // Legacy: existing sections may still hold `teal`. It remains readable but
  // is excluded from the picker and every interface that creates accents.
  "teal",
  // Mono is the theme-aware end of the palette (black in light mode,
  // white in dark mode) - replaces the legacy "Grey" presentation of
  // `custom`. `custom` is kept in the type for back-compat with existing
  // stored sections but is no longer shown in the picker.
  "mono",
  "custom",
] as const;

export type AccentKey = (typeof ACCENT_KEYS)[number];

export const DEFAULT_ACCENT_KEY: AccentKey = "stack";

export function isAccentKey(value: unknown): value is AccentKey {
  return (
    typeof value === "string" &&
    (ACCENT_KEYS as readonly string[]).includes(value)
  );
}

export function resolveAccentKey(value: unknown): AccentKey {
  return isAccentKey(value) ? value : DEFAULT_ACCENT_KEY;
}

export type SectionTemplate =
  "identity" | "stack" | "principles" | "focus" | "projects" | "freeform";

// Per-section agent permission. "hidden" hides the section from the agent
// entirely (not in the read payload); "read-only" is visible but uneditable;
// "propose" requires approval; "direct" applies immediately. `agentWritable`
// is kept as a derived convenience (propose | direct) so the existing
// write/proposal gates keep working unchanged.
export type AgentPermission = "hidden" | "read-only" | "propose" | "direct";

export type ProposalChangeType =
  "new-memory" | "refines-existing" | "conflicts-existing";

export type ProposalImpact =
  "future-responses" | "code-generation" | "project-context";

export type ProposalConfidence = "tentative" | "repeated" | "durable";

export type ProposalStatus = "pending" | "accepted" | "rejected" | "stale";
export type ActivityStatus = ProposalStatus | "direct";

// Legacy IDs - kept so historical Creeds with the old dev-leaning section set
// still hydrate cleanly. New starter files never emit these.
export const OPERATING_PRINCIPLES_SECTION_ID = "operating-principles";
export const LEGACY_CONVENTIONS_SECTION_ID = "conventions";

// Unified proposal model: every change is a rich-text update to a section
// (or a new section). Legacy shapes still arriving from older agents are
// coerced via normalizeLegacyProposalDraft below.
export type RichTextProposalDraft = {
  kind: "rich-text";
  contentHtml?: string;
  contentMarkdown?: string;
};

export type NewSectionProposalDraft = {
  kind: "new-section";
  name: string;
  accent?: AccentKey;
  template?: SectionTemplate;
  insertAfterSectionId?: string;
  contentHtml?: string;
  contentMarkdown?: string;
};

// Section-meta proposals: agents can also propose to delete a section, rename
// it, or change its accent colour. These are intentionally separate draft
// kinds (rather than fields tacked onto rich-text) so the UI can render them
// distinctly and the user can accept/reject each kind on its own.
export type DeleteSectionProposalDraft = {
  kind: "delete-section";
};

export type RenameSectionProposalDraft = {
  kind: "rename-section";
  name: string;
};

export type RecolorSectionProposalDraft = {
  kind: "recolor-section";
  accent: AccentKey;
};

// Reorder draft. Exactly one of `afterSectionId` or `position` is meaningful;
// `position` is "first" | "last" for the ends of the list, `afterSectionId`
// places the section right after that id. The proposal's `sectionId` selects
// which section to move.
export type ReorderSectionProposalDraft = {
  kind: "reorder-section";
  afterSectionId?: string;
  position?: "first" | "last";
};

export type ProposalDraft =
  | RichTextProposalDraft
  | NewSectionProposalDraft
  | DeleteSectionProposalDraft
  | RenameSectionProposalDraft
  | RecolorSectionProposalDraft
  | ReorderSectionProposalDraft;

export type Proposal = {
  id: string;
  sectionId: string;
  sectionName: string;
  accent: AccentKey;
  agentName: string;
  createdAt?: string;
  timeLabel: string;
  changeType: ProposalChangeType;
  reason: string;
  impact: ProposalImpact;
  confidence: ProposalConfidence;
  draft: ProposalDraft;
  status: ProposalStatus;
  baseRevision?: number | null;
};

// Coerces every legacy draft shape into the unified rich-text draft. Older
// agents may still submit drafts with kind "operating-principles", "rules",
// "chips", "decisions", "current-focus" - we render their payload to markdown
// and pass it through as a rich-text update.
export function normalizeLegacyProposalDraft(
  draft: ProposalDraft | { kind?: string },
): ProposalDraft {
  const raw =
    draft && typeof draft === "object"
      ? (draft as Record<string, unknown>)
      : {};
  const kind =
    raw.kind === LEGACY_CONVENTIONS_SECTION_ID
      ? OPERATING_PRINCIPLES_SECTION_ID
      : raw.kind;

  const stringField = (key: string): string | undefined => {
    const value = raw[key];
    return typeof value === "string" ? value : undefined;
  };

  if (kind === "new-section") {
    return {
      kind: "new-section",
      name: stringField("name") ?? "New section",
      accent:
        raw.accent === undefined ? undefined : resolveAccentKey(raw.accent),
      template:
        typeof raw.template === "string"
          ? (raw.template as SectionTemplate)
          : undefined,
      insertAfterSectionId: stringField("insertAfterSectionId"),
      contentHtml: stringField("contentHtml"),
      contentMarkdown: stringField("contentMarkdown"),
    };
  }

  if (kind === "rich-text") {
    const contentHtml = stringField("contentHtml");
    const contentMarkdown = stringField("contentMarkdown");
    const name = stringField("name");
    const accent =
      raw.accent === undefined ? undefined : resolveAccentKey(raw.accent);
    // A metadata-only shared draft (a rename and/or recolour filed with no body
    // change) is stored as rich-text with just a name/accent. Surface it as its
    // dedicated kind so the reviewer sees a real before/after instead of "No
    // textual change". Content edits (with or without a rename) stay rich-text.
    // A combined rename+recolour can't be one dedicated kind, so prefer the
    // rename (both fields still apply on accept via the raw draft).
    if (!contentHtml && !contentMarkdown) {
      if (name) return { kind: "rename-section", name: name.trim() };
      if (accent) return { kind: "recolor-section", accent };
    }
    return {
      kind: "rich-text",
      contentHtml,
      contentMarkdown,
    };
  }

  if (kind === "delete-section") {
    return { kind: "delete-section" };
  }

  if (kind === "rename-section") {
    return {
      kind: "rename-section",
      name: stringField("name")?.trim() || "",
    };
  }

  if (kind === "recolor-section") {
    return {
      kind: "recolor-section",
      accent: resolveAccentKey(raw.accent),
    };
  }

  if (kind === "reorder-section") {
    const position = stringField("position");
    return {
      kind: "reorder-section",
      afterSectionId: stringField("afterSectionId"),
      position:
        position === "first" || position === "last" ? position : undefined,
    };
  }

  // Legacy shapes - flatten to rich-text markdown.
  if (kind === "operating-principles") {
    const text = stringField("text") ?? "";
    return {
      kind: "rich-text",
      contentMarkdown: text ? `- ${text}` : "",
    };
  }

  if (kind === "decisions") {
    const title = stringField("title") ?? stringField("content") ?? "";
    const details = stringField("details");
    const body = details ? `**${title}** - ${details}` : `**${title}**`;
    return {
      kind: "rich-text",
      contentMarkdown: title ? `- ${body}` : "",
    };
  }

  if (kind === "current-focus") {
    return {
      kind: "rich-text",
      contentMarkdown: stringField("content") ?? "",
    };
  }

  if (kind === "rules") {
    const items = Array.isArray(raw.items)
      ? raw.items
          .map((item) => (typeof item === "string" ? item.trim() : ""))
          .filter(Boolean)
      : [];
    const append = stringField("appendItem")?.trim();
    const lines = append ? [...items, append] : items;
    return {
      kind: "rich-text",
      contentMarkdown: lines.length
        ? lines.map((line) => `- ${line}`).join("\n")
        : "",
    };
  }

  if (kind === "chips") {
    const chips = Array.isArray(raw.chips)
      ? raw.chips
          .map((chip) => (typeof chip === "string" ? chip.trim() : ""))
          .filter(Boolean)
      : [];
    return {
      kind: "rich-text",
      contentMarkdown: chips
        .map((chip) => `#${chip.replace(/\s+/g, "-").toLowerCase()}`)
        .join(" "),
    };
  }

  return {
    kind: "rich-text",
    contentMarkdown: stringField("content") ?? "",
  };
}

export type AgentIconKind =
  | "claude"
  | "claudecode"
  | "codex"
  | "chatgpt"
  | "cursor"
  | "replit"
  | "factory"
  | "manus"
  | "devin"
  | "whirl"
  | "grok"
  | "grokbot"
  | "goose"
  | "v0"
  | "opencode"
  | "openclaw"
  | "hermes"
  | "mcp"
  | "cli"
  | "all"
  | "custom";

export type McpClient = {
  id: string;
  name: string;
  icon: AgentIconKind;
  lastUsed?: string;
};

export const accentColorMap: Record<AccentKey, string> = {
  identity: "#D2A91F",
  stack: "#2563EB",
  "operating-principles": "#16A34A",
  decisions: "#E07A05",
  preferences: "#4ADE80",
  workflows: "#4F46E5",
  tools: "#38BDF8",
  boundaries: "#DC2626",
  questions: "#9333EA",
  skills: "#DB2777",
  "mini-skills": "#EDA0CA",
  projects: "#EA580C",
  output: "#F9736A",
  rose: "#E11D48",
  yellow: "#F1CDA2",
  sage: "#9FE7C6",
  powder: "#B0DBF0",
  violet: "#6D28D9",
  cyan: "#06B6D4",
  teal: "#BAE6FD",
  lime: "#65A30D",
  emerald: "#059669",
  lemon: "#FACC15",
  ocean: "#0284C7",
  lavender: "#BAACF0",
  // Mono resolves through a CSS variable so it swaps black ↔ white when
  // the document theme flips. Inline `style={{ color: ... }}` and `fill`
  // attrs that read this value will pick up the swap automatically.
  mono: "var(--accent-color-mono)",
  // Legacy: existing sections may still hold accent: "custom". Render it
  // the same as mono so older data inherits the new theme-aware behaviour.
  custom: "var(--accent-color-mono)",
};

// Tints resolve via CSS vars so light/dark variants are managed in one place
// (see `--accent-tint-*` in app/globals.css).
export const accentTintMap: Record<AccentKey, string> = {
  identity: "var(--accent-tint-identity)",
  stack: "var(--accent-tint-stack)",
  "operating-principles": "var(--accent-tint-operating-principles)",
  decisions: "var(--accent-tint-decisions)",
  preferences: "var(--accent-tint-preferences)",
  workflows: "var(--accent-tint-workflows)",
  tools: "var(--accent-tint-tools)",
  boundaries: "var(--accent-tint-boundaries)",
  questions: "var(--accent-tint-questions)",
  skills: "var(--accent-tint-skills)",
  "mini-skills": "var(--accent-tint-mini-skills)",
  projects: "var(--accent-tint-projects)",
  yellow: "var(--accent-tint-yellow)",
  sage: "var(--accent-tint-sage)",
  powder: "var(--accent-tint-powder)",
  violet: "var(--accent-tint-violet)",
  cyan: "var(--accent-tint-cyan)",
  teal: "var(--accent-tint-powder)",
  lime: "var(--accent-tint-lime)",
  emerald: "var(--accent-tint-emerald)",
  lemon: "var(--accent-tint-lemon)",
  ocean: "var(--accent-tint-ocean)",
  lavender: "var(--accent-tint-lavender)",
  mono: "var(--accent-tint-mono)",
  output: "var(--accent-tint-output)",
  rose: "var(--accent-tint-rose)",
  // Legacy alias - render with the same theme-aware tint as mono.
  custom: "var(--accent-tint-mono)",
};

export const accentLabelMap: Record<AccentKey, string> = {
  identity: "Gold",
  stack: "Blue",
  "operating-principles": "Green",
  decisions: "Amber",
  preferences: "Meadow",
  workflows: "Indigo",
  tools: "Sky",
  boundaries: "Red",
  questions: "Purple",
  skills: "Pink",
  "mini-skills": "Blush",
  projects: "Orange",
  output: "Coral",
  rose: "Rose",
  yellow: "Peach",
  sage: "Sage",
  powder: "Powder",
  violet: "Violet",
  cyan: "Cyan",
  teal: "Powder",
  lime: "Lime",
  emerald: "Emerald",
  lemon: "Yellow",
  ocean: "Ocean",
  lavender: "Lavender",
  mono: "Mono",
  // Legacy storage value - surface it under the new name so users see the
  // same label regardless of when their section was created.
  custom: "Mono",
};

// Convert the editor's HTML content back to portable markdown for the agent
// read payload. The section heading itself is `## Name`, so any h2/h3/h4
// inside the section content is shifted down one level (h2 → h3, h3 → h4,
// h4 → h5) to keep a clean markdown hierarchy without colliding levels.
//
//   <h2>...</h2>                                → ### ...
//   <h3>...</h3>                                → #### ...
//   <h4>...</h4>                                → ##### ...
//   <ul><li>...</li></ul>                       → - ...
//   nested <ul>/<ol> inside <li>                → two-space indented list
//   <ul data-type="taskList">...                → - [ ] / - [x]
//   <ol><li>...</li></ol>                       → 1. ...
//   <table>...</table>                          → GFM pipe table
//   <blockquote class="creed-callout">...</...> → > ...   (rendered as callout)
//   <pre><code>...</code></pre>                 → ```...```
//   <hr /> / <hr class="creed-hr" />            → ---
//   <span data-tag="slug">label</span>          → #slug   (inline tag mark)
//
// Anything else falls back to plain text after tag stripping.
export function richTextToMarkdown(content: string) {
  let text = content;

  // Inline tag marks first so we don't strip them in the generic tag
  // stripper below.
  text = text.replace(
    /<span\s+[^>]*data-tag="([^"]+)"[^>]*>[^<]*<\/span>/g,
    "#$1",
  );

  text = text.replace(
    /<pre[^>]*>\s*<code(?:\s+class="(?:language-)?([a-zA-Z0-9_-]+)")?[^>]*>([\s\S]*?)<\/code>\s*<\/pre>/g,
    (_match, lang: string | undefined, body: string) =>
      `\n\`\`\`${lang ?? ""}\n${decodeEntities(body).trimEnd().replace(/^\n+/, "")}\n\`\`\`\n`,
  );

  // Inline formatting - convert rich-text spans to their markdown
  // equivalents BEFORE the generic stripTags pass runs at the end of
  // this function. Without these conversions, bold / italic / links /
  // inline code / strikethrough / highlight all get stripped to plain
  // text and never make it back on pull. Each pattern emits standard
  // markdown (or GFM / Obsidian-style extensions), all of which survive
  // stripTags as plain characters and are parsed back to HTML on the
  // pull side by `inline()` in rich-text.ts.
  //
  // Order matters: inline `<code>` runs FIRST so we don't accidentally
  // re-process its inner text as emphasis. Links run before emphasis so
  // the `[text](url)` brackets don't get nibbled. Block code already
  // ran above (the `<pre><code>` fence handler), so by the time we
  // get here the only `<code>` left is the inline variety.
  text = text.replace(
    /<code\b[^>]*>([\s\S]*?)<\/code>/g,
    (_match, body: string) => `\`${stripTags(body).trim()}\``,
  );
  text = text.replace(
    /<a\b[^>]*?href=("|')([^"']+)\1[^>]*>([\s\S]*?)<\/a>/g,
    (_match, _q: string, href: string, body: string) =>
      `[${stripTags(body).trim()}](${href})`,
  );
  text = text.replace(
    /<(?:strong|b)\b[^>]*>([\s\S]*?)<\/(?:strong|b)>/g,
    "**$1**",
  );
  text = text.replace(/<(?:em|i)\b[^>]*>([\s\S]*?)<\/(?:em|i)>/g, "*$1*");
  text = text.replace(
    /<(?:s|del|strike)\b[^>]*>([\s\S]*?)<\/(?:s|del|strike)>/g,
    "~~$1~~",
  );
  text = text.replace(/<mark\b[^>]*>([\s\S]*?)<\/mark>/g, "==$1==");
  text = text.replace(/<u\b[^>]*>([\s\S]*?)<\/u>/g, "__$1__");

  // Headings - shift down one level so they nest under the section's `## Name`.
  text = text.replace(
    /<h2[^>]*>([\s\S]*?)<\/h2>/g,
    (_match, body: string) => `\n### ${stripTags(body).trim()}\n`,
  );
  text = text.replace(
    /<h3[^>]*>([\s\S]*?)<\/h3>/g,
    (_match, body: string) => `\n#### ${stripTags(body).trim()}\n`,
  );
  text = text.replace(
    /<h4[^>]*>([\s\S]*?)<\/h4>/g,
    (_match, body: string) => `\n##### ${stripTags(body).trim()}\n`,
  );

  // Horizontal rule.
  text = text.replace(/<hr\b[^>]*>/g, "\n\n---\n\n");

  // Blockquotes (rendered as callouts in the editor) → markdown `> `.
  text = text.replace(
    /<blockquote[^>]*>([\s\S]*?)<\/blockquote>/g,
    (_match, body: string) => {
      const inner = stripTags(body).trim();
      if (!inner) return "";
      return `\n${inner
        .split("\n")
        .map((line) => `> ${line}`)
        .join("\n")}\n`;
    },
  );

  // Lists, including nested bullets, numbers, and checklists.
  text = convertHtmlLists(text);

  // GFM tables. Run before remaining tag stripping so cell markup can still
  // use the inline conversions above. First-row `th` becomes a GFM header.
  // First-row `td` stays body cells via HEADERLESS_TABLE_MARK, because GFM
  // has no headerless table syntax.
  text = text.replace(
    /<table\b[^>]*>([\s\S]*?)<\/table>/gi,
    (_match, body: string) => {
      const rows = Array.from(body.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi));
      if (rows.length === 0) return "";
      const parsed = rows.map((row) =>
        Array.from(row[1].matchAll(/<(th|td)\b[^>]*>([\s\S]*?)<\/\1>/gi)).map(
          (cell) => ({
            tag: cell[1].toLowerCase(),
            text: stripTags(cell[2])
              .trim()
              .replace(/\|/g, "\\|")
              .replace(/\n+/g, " "),
          }),
        ),
      );
      const width = Math.max(0, ...parsed.map((row) => row.length));
      if (width === 0) return "";
      const pad = (row: (typeof parsed)[number]) => {
        const next = row.slice(0, width);
        while (next.length < width) next.push({ tag: "td", text: "" });
        return next;
      };
      const format = (row: (typeof parsed)[number]) =>
        `| ${pad(row)
          .map((cell) => cell.text)
          .join(" | ")} |`;
      const separator = `| ${Array.from({ length: width }, () => "---").join(" | ")} |`;
      const headerRow =
        parsed[0].length > 0 && parsed[0].every((cell) => cell.tag === "th");
      if (headerRow) {
        return `\n${[format(parsed[0]), separator, ...parsed.slice(1).map(format)].join("\n")}\n`;
      }
      const emptyHeader = `| ${Array.from({ length: width }, () => "").join(" | ")} |`;
      return `\n${HEADERLESS_TABLE_MARK}\n${[emptyHeader, separator, ...parsed.map(format)].join("\n")}\n`;
    },
  );

  // Paragraphs - drop empty paragraphs entirely so we don't emit blank lines
  // for `<p></p>` placeholders that the editor sometimes leaves behind.
  text = text.replace(/<p[^>]*>([\s\S]*?)<\/p>/g, (_match, body: string) => {
    const inner = stripTags(body).trim();
    return inner ? `\n${inner}\n` : "";
  });

  // Strip any remaining tags + tidy whitespace. Collapse 3+ newlines to a
  // single blank line, kill trailing whitespace on each line, and trim.
  const cleaned = stripTags(text)
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  return cleaned;
}

function findHtmlOpenTag(
  html: string,
  from: number,
  tag: string,
): { index: number; attrs: string; contentStart: number } | null {
  const pattern = new RegExp(`<${tag}\\b([^>]*)>`, "gi");
  pattern.lastIndex = from;
  const match = pattern.exec(html);
  if (!match) return null;
  return {
    index: match.index,
    attrs: match[1] ?? "",
    contentStart: match.index + match[0].length,
  };
}

function findMatchingCloseTag(html: string, tag: string, contentStart: number) {
  const openPattern = new RegExp(`<${tag}\\b[^>]*>`, "gi");
  const closePattern = new RegExp(`</${tag}\\s*>`, "gi");
  let depth = 1;
  let cursor = contentStart;
  while (cursor < html.length && depth > 0) {
    openPattern.lastIndex = cursor;
    closePattern.lastIndex = cursor;
    const open = openPattern.exec(html);
    const close = closePattern.exec(html);
    if (!close) return html.length;
    if (open && open.index < close.index) {
      depth += 1;
      cursor = open.index + open[0].length;
      continue;
    }
    depth -= 1;
    if (depth === 0) return close.index;
    cursor = close.index + close[0].length;
  }
  return html.length;
}

function findNextHtmlList(
  html: string,
  from: number,
): {
  tag: "ul" | "ol";
  index: number;
  attrs: string;
  contentStart: number;
} | null {
  const ul = findHtmlOpenTag(html, from, "ul");
  const ol = findHtmlOpenTag(html, from, "ol");
  if (ul && (!ol || ul.index <= ol.index)) {
    return { tag: "ul", ...ul };
  }
  if (ol) return { tag: "ol", ...ol };
  return null;
}

function splitTopLevelListItems(body: string) {
  const items: Array<{ attrs: string; inner: string }> = [];
  let cursor = 0;
  while (cursor < body.length) {
    const open = findHtmlOpenTag(body, cursor, "li");
    if (!open) break;
    const close = findMatchingCloseTag(body, "li", open.contentStart);
    items.push({
      attrs: open.attrs,
      inner: body.slice(open.contentStart, close),
    });
    const closeTag = body.slice(close).match(/^<\/li\s*>/i);
    cursor = close + (closeTag ? closeTag[0].length : 0);
    if (cursor <= open.index) break;
  }
  return items;
}

function isTaskListAttrs(attrs: string) {
  return (
    /data-type\s*=\s*(["'])taskList\1/i.test(attrs) ||
    /\bcreed-list-task\b/.test(attrs)
  );
}

function serializeHtmlList(
  html: string,
  open: {
    tag: "ul" | "ol";
    index: number;
    attrs: string;
    contentStart: number;
  },
  indent: string,
): { markdown: string; end: number } {
  const close = findMatchingCloseTag(html, open.tag, open.contentStart);
  const closeTag = html
    .slice(close)
    .match(new RegExp(`^</${open.tag}\\s*>`, "i"));
  const end = close + (closeTag ? closeTag[0].length : 0);
  const isTask = open.tag === "ul" && isTaskListAttrs(open.attrs);
  const items = splitTopLevelListItems(html.slice(open.contentStart, close));
  const lines: string[] = [];
  items.forEach((item, index) => {
    const checkedMatch = item.attrs.match(
      /data-checked\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/i,
    );
    const raw = (
      checkedMatch?.[1] ??
      checkedMatch?.[2] ??
      checkedMatch?.[3] ??
      ""
    ).toLowerCase();
    const checked = raw === "true" || raw === "checked";
    const marker = isTask
      ? `- [${checked ? "x" : " "}] `
      : open.tag === "ol"
        ? `${index + 1}. `
        : `- `;
    lines.push(...serializeHtmlListItem(item.inner, indent, marker));
  });
  const markdown = lines.length ? `${lines.join("\n")}` : "";
  return { markdown, end };
}

function serializeHtmlListItem(inner: string, indent: string, marker: string) {
  const nested: string[] = [];
  let rest = "";
  let cursor = 0;
  while (cursor < inner.length) {
    const nestedList = findNextHtmlList(inner, cursor);
    if (!nestedList) {
      rest += inner.slice(cursor);
      break;
    }
    rest += inner.slice(cursor, nestedList.index);
    const serialized = serializeHtmlList(inner, nestedList, `${indent}  `);
    if (serialized.markdown) nested.push(serialized.markdown);
    cursor = serialized.end;
  }
  const text = stripTags(rest).trim().replace(/\n+/g, " ");
  if (!text && nested.length === 0 && !marker.includes("[")) return [];
  const head = `${indent}${marker}${text}`.trimEnd();
  return nested.length > 0 ? [head, ...nested] : [head];
}

function convertHtmlLists(html: string) {
  let result = "";
  let cursor = 0;
  while (cursor < html.length) {
    const open = findNextHtmlList(html, cursor);
    if (!open) {
      result += html.slice(cursor);
      break;
    }
    result += html.slice(cursor, open.index);
    const serialized = serializeHtmlList(html, open, "");
    result += serialized.markdown ? `\n${serialized.markdown}\n` : "";
    cursor = serialized.end;
  }
  return result;
}

function stripTags(value: string) {
  return decodeEntities(value.replace(/<[^>]+>/g, ""));
}

function decodeEntities(value: string) {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&nbsp;/g, " ");
}

export function getProposalPreviewText(draft: ProposalDraft) {
  const normalizedDraft = normalizeLegacyProposalDraft(draft);

  if (normalizedDraft.kind === "new-section") {
    return (
      normalizedDraft.contentMarkdown?.trim() ||
      normalizedDraft.contentHtml?.trim() ||
      normalizedDraft.name.trim()
    );
  }

  if (normalizedDraft.kind === "delete-section") {
    return "Delete section";
  }

  if (normalizedDraft.kind === "rename-section") {
    return normalizedDraft.name.trim() || "Rename section";
  }

  if (normalizedDraft.kind === "recolor-section") {
    const label =
      accentLabelMap[normalizedDraft.accent] ?? normalizedDraft.accent;
    return `Change accent to ${label}`;
  }

  if (normalizedDraft.kind === "reorder-section") {
    if (normalizedDraft.position === "first") return "Move to top";
    if (normalizedDraft.position === "last") return "Move to bottom";
    if (normalizedDraft.afterSectionId)
      return `Move after ${normalizedDraft.afterSectionId}`;
    return "Reorder section";
  }

  return (
    normalizedDraft.contentMarkdown?.trim() ||
    normalizedDraft.contentHtml?.trim() ||
    ""
  );
}
import { HEADERLESS_TABLE_MARK } from "./rich-text";
