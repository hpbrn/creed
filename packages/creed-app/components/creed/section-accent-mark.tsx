// Occupies the same 14px slot as sidebar and panel icons so section squircles
// stay aligned with File, Add section, and command-row icons.
export const SECTION_ACCENT_MARK_SLOT_CLASS =
  "inline-flex h-3.5 w-3.5 shrink-0 items-center justify-center";
export const SECTION_ACCENT_MARK_FILL_CLASS = "h-2.5 w-2.5 rounded-[4px]";

export function SectionAccentMark({ color }: { color: string }) {
  return (
    <span className={SECTION_ACCENT_MARK_SLOT_CLASS} aria-hidden="true">
      <span
        className={SECTION_ACCENT_MARK_FILL_CLASS}
        style={{ backgroundColor: color }}
      />
    </span>
  );
}
