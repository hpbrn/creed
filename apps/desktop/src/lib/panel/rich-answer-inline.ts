// Inline markdown for Ask answers. Same layer order as `markdownToRichHtml`:
// atomic spans first, then links, then emphasis, then strike / highlight /
// underline. Highlight runs before underline so `__==text==__` and
// `==__text__==` both nest instead of leaking raw delimiters.

import { coerceRichTextHref } from "@/lib/creed/rich-text";

export { coerceRichTextHref as coerceInlineHref };

export type InlineNode =
  | { type: "text"; text: string }
  | { type: "code"; text: string }
  | { type: "section"; id: string }
  | { type: "tag"; name: string }
  | { type: "link"; href: string; children: InlineNode[] }
  | {
      type: "strong" | "em" | "s" | "mark" | "u";
      children: InlineNode[];
    };

const PLACEHOLDER = /\x00(\d+)\x00/g;

export function parseInlineMarkdown(text: string): InlineNode[] {
  const stash: InlineNode[] = [];
  const put = (node: InlineNode) => {
    stash.push(node);
    return `\x00${stash.length - 1}\x00`;
  };
  const expand = (value: string): InlineNode[] => {
    const nodes: InlineNode[] = [];
    let last = 0;
    for (const match of value.matchAll(PLACEHOLDER)) {
      const start = match.index ?? 0;
      if (start > last)
        nodes.push({ type: "text", text: value.slice(last, start) });
      const node = stash[Number(match[1])];
      if (node) nodes.push(node);
      last = start + match[0].length;
    }
    if (last < value.length)
      nodes.push({ type: "text", text: value.slice(last) });
    return nodes;
  };

  const applyEm = (value: string) =>
    value.replace(
      /(^|[^*_])(?:\*|_)([^*_\n]+?)(?:\*|_)(?!\*|_)/g,
      (_match, lead: string, inner: string) =>
        `${lead}${put({ type: "em", children: expand(inner) })}`,
    );

  const applyUnderline = (value: string) =>
    applyEm(
      value.replace(/__([^_\n]+?)__/g, (_match, inner: string) =>
        put({ type: "u", children: expand(applyEm(inner)) }),
      ),
    );

  const applyMark = (value: string) =>
    applyUnderline(
      value.replace(/==([^=\n]+?)==/g, (_match, inner: string) =>
        put({ type: "mark", children: expand(applyUnderline(inner)) }),
      ),
    );

  const applyStrike = (value: string) =>
    applyMark(
      value.replace(/~~([^~\n]+?)~~/g, (_match, inner: string) =>
        put({ type: "s", children: expand(applyMark(inner)) }),
      ),
    );

  const applyStrong = (value: string) =>
    applyStrike(
      value.replace(/\*\*([^*\n]+?)\*\*/g, (_match, inner: string) =>
        put({ type: "strong", children: expand(applyStrike(inner)) }),
      ),
    );

  let next = text.replace(/`([^`\n]+)`/g, (_match, body: string) =>
    put({ type: "code", text: body }),
  );
  next = next.replace(/\[\[section:([^\]]+)\]\]/g, (_match, id: string) =>
    put({ type: "section", id }),
  );
  next = next.replace(
    /(^|\s)#([a-zA-Z0-9][a-zA-Z0-9_-]*)/g,
    (_match, lead: string, name: string) =>
      `${lead}${put({ type: "tag", name })}`,
  );
  next = next.replace(
    /\[([^\]\n]+?)\]\(([^)\s]+?)\)/g,
    (match, label: string, href: string) => {
      const safe = coerceRichTextHref(href);
      if (!safe || !/^(https?:|mailto:)/i.test(safe)) return match;
      return put({
        type: "link",
        href: safe,
        children: expand(applyStrong(label)),
      });
    },
  );
  next = next.replace(
    /(^|\s)(https?:\/\/[^\s<]+)/gi,
    (_match, lead: string, url: string) => {
      const trimmed = url.replace(/[.,;:!?)]+$/g, "");
      const trail = url.slice(trimmed.length);
      const safe = coerceRichTextHref(trimmed);
      if (!safe || !/^(https?:|mailto:)/i.test(safe)) return `${lead}${url}`;
      return `${lead}${put({
        type: "link",
        href: safe,
        children: [{ type: "text", text: trimmed }],
      })}${trail}`;
    },
  );
  return expand(applyStrong(next));
}
