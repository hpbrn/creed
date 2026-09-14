import { forwardRef, useRef, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import { motion, Reorder, useDragControls } from "motion/react";
import { cn } from "@/components/ui/utils";
import { accentColorMap, type CreedSection } from "@/lib/creed/creed-data";
import { RichTextEditor } from "@/components/creed/rich-text-editor";
import { SectionAccentMark } from "@/components/creed/section-accent-mark";

// Top inset lives on FileStickyHeader (py-3) so the title row matches
// the sidebar brand row, and stuck top and bottom padding stay equal.
export const FILE_COLUMN_CLASS =
  "relative mx-auto max-w-[920px] px-8 pb-6 md:px-12 md:pb-10 xl:px-16";
// After a tap the last header pill keeps :focus-visible, which paints
// border-ring brighter than the sibling rest borders. Same reset on every
// outline pill so lock cannot look selected when nexus and activity do not.
export const FILE_HEADER_OUTLINE_MOBILE_FOCUS_CLASS =
  "max-md:focus-visible:border-[var(--creed-border)] max-md:focus-visible:ring-0";
export const FILE_SECTION_STACK_CLASS = "flex flex-col gap-8 md:gap-12";
export const FILE_SECTION_ACCENT_BAR_CLASS =
  "relative -top-px inline-block h-[calc((1cap+36px)/2)] w-1 shrink-0 rounded-[1.25px] text-[1.22rem] md:text-[1.45rem]";
export const FILE_SECTION_NAME_CLASS =
  "min-w-0 truncate text-[1.22rem] font-medium leading-none md:text-[1.45rem]";

export const FILE_NAV_PRESS_CLASS =
  "creed-press-surface";

export const SIDEBAR_COLLAPSE_MOTION =
  "duration-[260ms] ease-[cubic-bezier(0.22,1,0.36,1)]";

export function sidebarLabelRevealClass(collapsed: boolean) {
  return cn(
    "min-w-0 overflow-hidden whitespace-nowrap transition-[max-width,opacity]",
    SIDEBAR_COLLAPSE_MOTION,
    collapsed ? "max-w-0 border-0 px-0 opacity-0" : "max-w-[11rem] opacity-100",
  );
}

// Keep the icon slot fixed so fractional animation rounding cannot move glyphs.
export function sidebarNavRowClass(collapsed: boolean) {
  return cn(
    `mx-0 w-full justify-start transition-[gap,padding] motion-reduce:transition-none ${SIDEBAR_COLLAPSE_MOTION}`,
    collapsed ? "gap-0 px-0" : "gap-0.5 pl-0 pr-2",
  );
}

export function sidebarIconSlotClass(_collapsed: boolean) {
  return cn("inline-flex h-8 w-8 shrink-0 items-center justify-center");
}

export function FileSectionNavButton({
  sectionId,
  name,
  accent,
  active,
  pendingCount = 0,
  pendingDelete = false,
  pendingCreate = false,
  collapsed = false,
  reorderPosition,
  canDrag = false,
  onDragStateChange,
  onClick,
}: {
  sectionId?: string;
  name: string;
  accent: string;
  active: boolean;
  pendingCount?: number;
  pendingDelete?: boolean;
  pendingCreate?: boolean;
  collapsed?: boolean;
  reorderPosition?: number;
  canDrag?: boolean;
  onDragStateChange?: (dragging: boolean) => void;
  onClick: () => void;
}) {
  const dragControls = useDragControls();
  const draggedRef = useRef(false);

  const button = (
    <button
      type="button"
      onPointerDown={(event) => {
        if (!canDrag) return;
        dragControls.start(event, { distanceThreshold: 4 });
      }}
      onClick={() => {
        if (draggedRef.current) return;
        onClick();
      }}
      className={cn(
        "mx-auto flex h-8 w-8 touch-none items-center justify-center overflow-hidden rounded-sm text-left text-[14px] font-medium text-[var(--creed-text-secondary)] hover:bg-[var(--creed-surface-raised)] hover:text-[var(--creed-text-primary)]",
        FILE_NAV_PRESS_CLASS,
        sidebarNavRowClass(collapsed),
        active &&
          "bg-[var(--creed-surface-raised)]! text-[var(--creed-text-primary)] hover:bg-[var(--creed-surface-raised)]!",
      )}
      aria-label={pendingCreate ? `Proposed: ${name}` : name}
    >
      <span className={sidebarIconSlotClass(collapsed)}>
        <SectionAccentMark color={accent} />
      </span>
      <span
        className={cn(
          "inline",
          sidebarLabelRevealClass(collapsed),
          pendingDelete && "line-through",
        )}
        aria-hidden={collapsed || undefined}
      >
        {name}
      </span>
      {pendingCount > 0 ? (
        <span
          className={cn(
            "ml-auto h-[18px] min-w-[18px] items-center justify-center rounded-[5px] px-1.5 text-[10px] font-medium leading-none tabular-nums text-white inline-flex",
            pendingDelete
              ? "bg-[#dc2626]"
              : pendingCreate
                ? "bg-[#16A34A]"
                : "bg-[var(--creed-accent)]",
            sidebarLabelRevealClass(collapsed),
          )}
          aria-label={`${pendingCount} pending proposal${pendingCount === 1 ? "" : "s"}`}
          aria-hidden={collapsed || undefined}
        >
          {pendingCount}
        </span>
      ) : null}
    </button>
  );

  if (!sectionId || reorderPosition === undefined) {
    return button;
  }

  return (
    <Reorder.Item
      value={sectionId}
      dragListener={false}
      dragControls={dragControls}
      layout="position"
      layoutDependency={reorderPosition}
      dragElastic={0}
      dragMomentum={false}
      initial={{ opacity: 1 }}
      whileDrag={{ opacity: 0.64 }}
      transition={{
        layout: {
          type: "spring",
          stiffness: 560,
          damping: 40,
          mass: 0.65,
        },
        opacity: { duration: 0.12 },
      }}
      onDragStart={() => {
        draggedRef.current = true;
        onDragStateChange?.(true);
      }}
      onDragEnd={() => {
        onDragStateChange?.(false);
        window.setTimeout(() => {
          draggedRef.current = false;
        }, 0);
      }}
      className="relative list-none"
    >
      {button}
    </Reorder.Item>
  );
}

export const FileStickyHeader = forwardRef<
  HTMLDivElement,
  {
    children: ReactNode;
    compact?: boolean;
    className?: string;
  }
>(function FileStickyHeader({ children, compact = false, className }, ref) {
  return (
    <div
      ref={ref}
      data-file-sticky-header
      className={cn(
        "sticky top-0 bg-[var(--creed-surface)] [overflow-anchor:none]",
        compact
          ? "z-[60] mb-7 py-3"
          : "z-20 mb-6 -mx-4 px-4 py-3 md:-mx-12 md:mb-8 md:px-12 xl:-mx-16 xl:px-16",
        className,
      )}
    >
      {children}
    </div>
  );
});

export function FileStickyHeaderRow({
  children,
  compact = false,
}: {
  children: ReactNode;
  compact?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex flex-col md:flex-row md:items-start md:justify-between",
        compact ? "mx-auto max-w-[700px] gap-4 px-4 md:px-7" : "gap-6",
      )}
    >
      {children}
    </div>
  );
}

export function FileStickyReviewRow({
  children,
  compact = false,
}: {
  children: ReactNode;
  compact?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex justify-start",
        compact ? "mx-auto mt-3 max-w-[700px] px-2 sm:px-4 md:px-7" : "mt-3",
      )}
    >
      {children}
    </div>
  );
}

export function FileSectionHeading({
  name,
  accent,
  quality,
  supplemental,
  controls,
  collapsible = false,
  collapsed = false,
  onToggleCollapsed,
}: {
  name: string;
  accent: string;
  quality?: ReactNode;
  supplemental?: ReactNode;
  controls?: ReactNode;
  collapsible?: boolean;
  collapsed?: boolean;
  onToggleCollapsed?: () => void;
}) {
  return (
    <div className="mb-6 flex items-start justify-between gap-4">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-3">
          <span
            className={FILE_SECTION_ACCENT_BAR_CLASS}
            style={{ backgroundColor: accent }}
          />
          <div className="flex min-w-0 flex-wrap items-center gap-3">
            <span className={FILE_SECTION_NAME_CLASS} style={{ color: accent }}>
              {name}
            </span>
            {collapsible ? (
              <button
                type="button"
                aria-label={collapsed ? `Expand ${name}` : `Collapse ${name}`}
                aria-expanded={!collapsed}
                onClick={onToggleCollapsed}
                className="inline-flex h-9 shrink-0 items-center text-[var(--creed-text-secondary)] transition-colors duration-150 hover:text-[var(--creed-text-primary)]"
              >
                <ChevronDown
                  className={cn(
                    "h-4 w-4 origin-center transition-[rotate] duration-200 ease-[cubic-bezier(0.22,1,0.36,1)]",
                    collapsed ? "-rotate-90" : "rotate-0",
                  )}
                />
              </button>
            ) : null}
            {quality}
            {supplemental}
          </div>
        </div>
      </div>
      {controls ? (
        <div className="flex shrink-0 items-center gap-0.5">{controls}</div>
      ) : null}
    </div>
  );
}

export function fileSectionTagTargets(
  sections: ReadonlyArray<Pick<CreedSection, "id" | "name" | "accent">>,
) {
  return sections.map((section) => ({
    id: section.id,
    name: section.name,
    accent: section.accent,
  }));
}

function ignoreReadOnlySectionContent(_content: string) {}

// One read-only file body: same editor, accents, and tag chips as /file.
export function FileSectionReadOnly({
  section,
  sectionTagTargets,
}: {
  section: Pick<CreedSection, "id" | "accent" | "content">;
  sectionTagTargets: ReturnType<typeof fileSectionTagTargets>;
}) {
  return (
    <RichTextEditor
      sectionId={section.id}
      content={section.content}
      readOnly
      accentColor={accentColorMap[section.accent]}
      sectionTagTargets={sectionTagTargets}
      onChange={ignoreReadOnlySectionContent}
    />
  );
}

export function FileSectionsPreview({
  sections,
}: {
  sections: CreedSection[];
}) {
  // Same column, heading, editor, and tag chips as /file so teaching
  // previews cannot drift from the live Creed.
  const sectionTagTargets = fileSectionTagTargets(sections);

  return (
    <div className={cn(FILE_COLUMN_CLASS, "pt-6 md:pt-10")}>
      <div className={FILE_SECTION_STACK_CLASS}>
        {sections.map((section) => {
          const accent = accentColorMap[section.accent];
          return (
            <section
              key={section.id}
              data-section-id={section.id}
              className="group relative"
            >
              <FileSectionHeading name={section.name} accent={accent} />
              <FileSectionReadOnly
                section={section}
                sectionTagTargets={sectionTagTargets}
              />
            </section>
          );
        })}
      </div>
    </div>
  );
}

export function FileActivityRailFrame({
  children,
  open = true,
  overlay = false,
}: {
  children: ReactNode;
  open?: boolean;
  overlay?: boolean;
}) {
  return (
    <motion.div
      initial={overlay ? { width: 0, opacity: 0 } : false}
      animate={{
        width: open ? 356 : 0,
        opacity: open ? 1 : 0,
      }}
      exit={{ width: 0, opacity: 0 }}
      transition={{ duration: 0.26, ease: [0.22, 1, 0.36, 1] }}
      style={{ maxWidth: "min(82vw, 356px)" }}
      inert={!open}
      aria-hidden={!open}
      className={cn(
        "relative h-full shrink-0 overflow-hidden",
        overlay ? "z-[70] lg:z-auto" : "z-30",
        open ? "pointer-events-auto" : "pointer-events-none",
      )}
    >
      <aside className="h-full w-[356px] max-w-[min(82vw,356px)] bg-[var(--creed-surface)]">
        {children}
      </aside>
    </motion.div>
  );
}
