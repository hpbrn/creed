import { sectionReferenceChipStyle } from "@/components/creed/section-reference-chip";
import {
  type AccentKey,
  accentColorMap,
  accentTintMap,
} from "@/lib/creed/creed-data";
import { type CSSProperties, type ReactNode } from "react";

// Same accent vars the file editor paints onto a section so landing
// titles can reuse `em` and `mark.creed-file-mark`. Underlines use the
// YOUR scroll-statement bar (4px, same offset). Default is stack blue;
// `text-decoration` does not match that bar.

const EDITOR_PROSE_PX = 17;
const TITLE_UNDERLINE_THICKNESS_PX = 4;
const TITLE_UNDERLINE_OFFSET_PX = 0.06 * EDITOR_PROSE_PX - 8;
const TITLE_MARK_RADIUS_PX = 10;
const TITLE_CODE_RADIUS_PX = 16;

function sectionMarkStyle(
  accent: AccentKey,
): CSSProperties & Record<`--${string}`, string> {
  const color = accentColorMap[accent];
  return {
    "--section-accent": color,
    "--section-accent-tint": accentTintMap[accent],
    "--section-accent-bar": `color-mix(in srgb, ${color} 82%, transparent)`,
  };
}

export function FileItalic({ children }: { children: ReactNode }) {
  return <em>{children}</em>;
}

export function FileStrike({ children }: { children: ReactNode }) {
  return <s>{children}</s>;
}

export function FileUnderline({
  accent = "stack",
  children,
}: {
  accent?: AccentKey;
  children: ReactNode;
}) {
  return (
    <span className="relative inline whitespace-nowrap">
      {children}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0"
        style={{
          top: "100%",
          marginTop: TITLE_UNDERLINE_OFFSET_PX,
          height: TITLE_UNDERLINE_THICKNESS_PX,
          backgroundColor: accentColorMap[accent],
        }}
      />
    </span>
  );
}

export function FileCode({ children }: { children: ReactNode }) {
  return (
    <code
      className="creed-file-code"
      style={{ borderRadius: TITLE_CODE_RADIUS_PX }}
    >
      {children}
    </code>
  );
}

export function FileTag({
  accent,
  children,
}: {
  accent: AccentKey;
  children: ReactNode;
}) {
  return (
    <span
      className="creed-inline-tag"
      style={{ ...sectionReferenceChipStyle(accent), borderRadius: "0.24em" }}
    >
      {children}
    </span>
  );
}

export function FileHighlight({
  accent,
  children,
}: {
  accent: AccentKey;
  children: ReactNode;
}) {
  return (
    <mark
      className="creed-file-mark"
      style={{
        ...sectionMarkStyle(accent),
        borderRadius: TITLE_MARK_RADIUS_PX,
      }}
    >
      {children}
    </mark>
  );
}
