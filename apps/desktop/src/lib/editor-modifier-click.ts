// Cmd/Ctrl+click in the file editor follows a link or jumps to a section
// tag. Bare hosts like hello.com must not become in-app routes.

import { coerceRichTextHref } from "@/lib/creed/rich-text";

export type EditorModifierClick =
  { kind: "link"; href: string } | { kind: "section"; id: string };

export function isSafeNavigableHref(href: string) {
  const coerced = coerceRichTextHref(href);
  return Boolean(coerced && /^(https?:|mailto:)/i.test(coerced));
}

export function hrefFromAnchor(link: HTMLAnchorElement): string | null {
  const raw = link.getAttribute("href");
  const fromRaw = raw ? coerceRichTextHref(raw) : null;
  if (fromRaw && /^(https?:|mailto:)/i.test(fromRaw)) return fromRaw;
  try {
    const url = new URL(link.href);
    if (url.origin === window.location.origin) {
      return coerceRichTextHref(
        url.pathname.replace(/^\//, "") + url.search + url.hash,
      );
    }
    if (
      url.protocol === "http:" ||
      url.protocol === "https:" ||
      url.protocol === "mailto:"
    ) {
      return url.href;
    }
  } catch {
    return fromRaw;
  }
  return fromRaw && /^(https?:|mailto:)/i.test(fromRaw) ? fromRaw : null;
}

export function resolveEditorModifierClick(
  tagId: string | null | undefined,
  href: string | null | undefined,
): EditorModifierClick | null {
  const id = tagId?.trim();
  if (id) return { kind: "section", id };
  const nextHref = href ? coerceRichTextHref(href) : null;
  if (!nextHref || !/^(https?:|mailto:)/i.test(nextHref)) return null;
  return { kind: "link", href: nextHref };
}

export function readEditorModifierClick(
  target: EventTarget | null,
): EditorModifierClick | null {
  const element =
    target instanceof Element
      ? target
      : target instanceof Text
        ? target.parentElement
        : null;
  if (!element) return null;
  const tag = element.closest<HTMLElement>(".creed-inline-tag");
  const tagId =
    tag?.getAttribute("data-tag") ?? tag?.getAttribute("data-section-id");
  const link = element.closest<HTMLAnchorElement>("a[href]");
  return resolveEditorModifierClick(tagId, link ? hrefFromAnchor(link) : null);
}

export function dispatchEditorModifierClick(
  click: EditorModifierClick,
  openSection?: (sectionId: string) => void,
) {
  if (click.kind === "section") {
    if (openSection) {
      openSection(click.id);
      return;
    }
    document
      .querySelector(`[data-section-id="${CSS.escape(click.id)}"]`)
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
    return;
  }
  if (click.href.startsWith("mailto:")) {
    window.location.assign(click.href);
    return;
  }
  window.open(click.href, "_blank", "noopener,noreferrer");
}
