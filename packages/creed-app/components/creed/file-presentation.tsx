"use client";

import {
  forwardRef,
  useRef,
  type ReactNode,
} from "react";
import { ChevronDown } from "lucide-react";
import { motion, Reorder, useDragControls } from "motion/react";
import { cn } from "@creed/ui/utils";
import { accentColorMap, type CreedSection } from "@creed/core/creed-data";
import { RichTextEditor } from "@/components/creed/rich-text-editor";
import { SectionAccentMark } from "@/components/creed/section-accent-mark";

// Top inset lives on FileStickyHeader (py-3) so the title row matches
// the sidebar brand row, and stuck top and bottom padding stay equal.
export const FILE_COLUMN_CLASS =
  "relative mx-auto max-w-[920px] px-4 pb-6 md:px-12 md:pb-10 xl:px-16";
// After a tap the last header pill keeps :focus-visible, which paints
// border-ring brighter than the sibling rest borders. Same reset on every
// outline pill so lock cannot look selected when nexus and activity do not.
export const FILE_HEADER_OUTLINE_MOBILE_FOCUS_CLASS =
  "max-md:focus-visible:border-[var(--creed-border)] max-md:focus-visible:ring-0";
export const FILE_SECTION_STACK_CLASS = "flex flex-col gap-8 md:gap-12";
export const FILE_SECTION_ACCENT_BAR_CLASS =
  "inline-block h-9 w-1 shrink-0 rounded-[1.25px]";
export const FILE_SECTION_NAME_CLASS =
  "min-w-0 truncate text-[1.22rem] font-medium leading-none md:text-[1.45rem]";

const FILE_NAV_PRESS_CLASS =
  "transform-gpu transition-[color,background-color,transform,filter] duration-150 ease-[cubic-bezier(0.22,1,0.36,1)] active:translate-y-px active:scale-[0.98] active:brightness-[0.96]";

export const SIDEBAR_COLLAPSE_MOTION =
  "duration-[260ms] ease-[cubic-bezier(0.22,1,0.36,1)]";

export function sidebarLabelRevealClass(collapsed: boolean) {
  return cn(
    "min-w-0 overflow-hidden whitespace-nowrap transition-[max-width,opacity]",
    SIDEBAR_COLLAPSE_MOTION,
    collapsed ? "max-w-0 opacity-0" : "max-w-[11rem] opacity-100",
  );
}

// Desktop rows stay full-width and start-aligned. Width, margin, and
// justify flips cannot interpolate and make the rail jump. The icon
// slot grows to 32px so the glyph centers in the collapsed column
// without changing justify.
export function sidebarNavRowClass(collapsed: boolean) {
  return cn(
    `lg:mx-0 lg:w-full lg:justify-start lg:transition-[gap,padding] ${SIDEBAR_COLLAPSE_MOTION}`,
    collapsed ? "lg:gap-0 lg:px-0" : "lg:gap-3 lg:px-2",
  );
}

export function sidebarIconSlotClass(
  collapsed: boolean,
  size: "sm" | "md" = "sm",
) {
  return cn(
    "inline-flex h-8 w-8 shrink-0 items-center justify-center lg:transition-[width]",
    SIDEBAR_COLLAPSE_MOTION,
    collapsed ? "lg:w-8" : size === "md" ? "lg:w-6" : "lg:w-3.5",
  );
}

const PENDING_NAV_TONE = {
  delete: {
    text: "text-[var(--creed-danger)]",
    hover:
      "hover:bg-[var(--creed-danger)]/12! hover:text-[var(--creed-danger)]! dark:hover:bg-[#3F1212]/55!",
    selected:
      "bg-[var(--creed-danger)]/12! text-[var(--creed-danger)]! dark:bg-[#3F1212]/55!",
  },
  create: {
    text: "text-[var(--creed-success)]",
    hover:
      "hover:bg-[var(--creed-success)]/12! hover:text-[var(--creed-success)]! dark:hover:bg-[#052e1a]/60!",
    selected:
      "bg-[var(--creed-success)]/12! text-[var(--creed-success)]! dark:bg-[#052e1a]/60!",
  },
} as const;

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

  const pendingTone = pendingDelete
    ? PENDING_NAV_TONE.delete
    : pendingCreate
      ? PENDING_NAV_TONE.create
      : null;

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
          pendingTone?.text,
          pendingTone?.hover,
          active && pendingTone?.selected,
          active &&
            !pendingTone &&
            "bg-[var(--creed-surface-raised)]! text-[var(--creed-text-primary)] hover:bg-[var(--creed-surface-raised)]!",
        )}
        aria-label={pendingCreate ? `Proposed: ${name}` : name}
      >
        <span className={sidebarIconSlotClass(collapsed)}>
          <SectionAccentMark color={accent} />
        </span>
        <span
          className={cn(
            "hidden lg:inline",
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
              "ml-auto hidden h-[18px] min-w-[18px] items-center justify-center rounded-[5px] px-1.5 text-[10px] font-medium leading-none tabular-nums text-white lg:inline-flex",
              // Same fills as the proposal Accept buttons, which stay the
              // light-mode green/red in both themes. The success/danger tokens
              // brighten in dark mode and would desync the badge from the bar.
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
        "sticky top-0 bg-[color:var(--creed-surface)]/95 backdrop-blur-sm [overflow-anchor:none]",
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
        compact
          ? "mx-auto mt-3 max-w-[700px] px-2 sm:px-4 md:px-7"
          : "mt-3",
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
          <div className="flex min-w-0 flex-wrap items-center gap-2.5">
            <span className={FILE_SECTION_NAME_CLASS} style={{ color: accent }}>
              {name}
            </span>
            {quality}
            {supplemental}
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
                    "h-4 w-4 transition-transform duration-200 ease-[cubic-bezier(0.22,1,0.36,1)]",
                    collapsed ? "-rotate-90" : "rotate-0",
                  )}
                />
              </button>
            ) : null}
          </div>
        </div>
      </div>
      {controls ? (
        <div className="flex shrink-0 items-center gap-0.5">{controls}</div>
      ) : null}
    </div>
  );
}

export function FileSectionsPreview({
  sections,
}: {
  sections: CreedSection[];
}) {
  // Same column, heading, editor, and tag chips as /file so teaching
  // previews cannot drift from the live Creed.
  const sectionTagTargets = sections.map((section) => ({
    id: section.id,
    name: section.name,
    accent: section.accent,
  }));

  return (
    <div className={cn(FILE_COLUMN_CLASS, "pt-6 md:pt-10")}>
      <div className={FILE_SECTION_STACK_CLASS}>
        {sections.map((section) => {
          const accent = accentColorMap[section.accent];
          return (
            <section key={section.id} className="group relative">
              <FileSectionHeading name={section.name} accent={accent} />
              <RichTextEditor
                sectionId={section.id}
                content={section.content}
                readOnly
                accentColor={accent}
                sectionTagTargets={sectionTagTargets}
                onChange={() => {}}
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
      transition={{ duration: 0.34, ease: [0.22, 1, 0.36, 1] }}
      style={{ maxWidth: "min(82vw, 356px)" }}
      className={cn(
        "absolute inset-y-0 right-0 h-full overflow-hidden lg:static lg:h-full lg:shrink-0",
        overlay ? "z-[70] lg:z-auto" : "z-30",
        open ? "pointer-events-auto" : "pointer-events-none",
      )}
    >
      <aside className="h-full w-[356px] max-w-[min(82vw,356px)] border-l border-[var(--creed-border)] bg-[var(--creed-surface)] shadow-[-18px_0_50px_rgba(28,28,26,0.12)] lg:shadow-none">
        {children}
      </aside>
    </motion.div>
  );
}
