import { Button } from "@/components/ui/button";
import {
  memo,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { AnimatePresence, motion } from "motion/react";
import { Check, Pencil, Trash2, X } from "lucide-react";
import { ChevronDownIcon as AnimatedChevronDown } from "@/components/ui/chevron-down";
import type { Proposal } from "@/lib/creed/creed-data";
import {
  getMetaProposalDiffText,
  getProposalPreviewText,
} from "@/lib/creed/creed-data";
import {
  CreedDiffView,
  DiffBadge,
  ProposalAuthor,
} from "@/components/creed/inline-proposal-diff";
import { computeCreedDiff, type CreedDiff } from "@/lib/creed-diff";
import {
  DROPDOWN_CONTENT_CLASS,
  DROPDOWN_ITEM_CLASS,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuPortal,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/components/ui/utils";

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    const update = () => setIsMobile(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);
  return isMobile;
}

export type ReviewPillProposal = {
  proposal: Proposal;
  existingContent: string;
  sectionName?: string;
  // Whether THIS viewer can review (accept/reject) this proposal's section.
  canReview?: boolean;
};

// Decorative middot. Locked so parent hover / the dropdown
// `**:text-accent-foreground` rule cannot recolour or highlight it.
const SEP_DOT_CLASS =
  "pointer-events-none select-none !text-[var(--creed-text-tertiary)]";

const proposalDiffCache = new Map<
  string,
  {
    existingContent: string;
    proposedContent: string;
    diff: CreedDiff;
  }
>();

function proposalDiffInputs(item: ReviewPillProposal) {
  const draft = item.proposal.draft;
  if (draft.kind === "delete-section")
    return [item.existingContent, ""] as const;
  if (draft.kind === "new-section") {
    return ["", getProposalPreviewText(draft)] as const;
  }
  const meta = getMetaProposalDiffText(draft, {
    name: item.sectionName ?? item.proposal.sectionName,
    accent: item.proposal.accent,
  });
  return meta
    ? ([meta.before, meta.after] as const)
    : ([item.existingContent, getProposalPreviewText(draft)] as const);
}

function ReviewAllActions({
  onAcceptAll,
  onRejectAll,
}: {
  onAcceptAll: () => void;
  onRejectAll: () => void;
}) {
  return (
    <>
      <button
        type="button"
        onClick={onRejectAll}
        aria-label="Reject all"
        className="inline-flex h-7 shrink-0 items-center gap-1 rounded-[10px] px-2.5 text-sm font-medium whitespace-nowrap text-[var(--creed-text-secondary)] transition-colors hover:bg-[var(--creed-surface-raised)] hover:text-[var(--creed-text-primary)]"
      >
        Reject all
      </button>
      <button
        type="button"
        onClick={onAcceptAll}
        aria-label="Accept all"
        className="inline-flex h-7 shrink-0 items-center gap-1 rounded-[10px] bg-[var(--creed-accent)] px-2.5 text-sm font-medium whitespace-nowrap text-white transition-colors hover:bg-[var(--creed-accent-hover)]"
      >
        Accept all
      </button>
    </>
  );
}

export const ReviewPill = memo(function ReviewPill({
  proposals,
  onAcceptAll,
  onRejectAll,
  onAcceptOne,
  onRejectOne,
  onEditOne = () => {},
  onDeleteOne = () => {},
  onJumpToProposal,
  embedded = false,
}: {
  embedded?: boolean;
  proposals: ReviewPillProposal[];
  onAcceptAll: () => void;
  onRejectAll: () => void;
  onAcceptOne: (proposalId: string) => void;
  onRejectOne: (proposalId: string) => void;
  // The proposal's own author edits/deletes it instead of reviewing.
  onEditOne?: (proposal: Proposal) => void;
  onDeleteOne?: (proposalId: string) => void;
  onJumpToProposal: (proposal: Proposal) => void;
}) {
  // A member with only their own (unreviewable) proposals shouldn't see the
  // bulk Accept/Reject-all controls - those act on proposals you can review.
  const hasReviewable = proposals.some(
    (item) => item.canReview && !item.proposal.mine,
  );
  const [canvas, setCanvas] = useState<HTMLElement | null>(null);
  useEffect(() => {
    setCanvas(document.querySelector<HTMLElement>(".creed-file-card"));
  }, []);
  const perProposalStats = useMemo(() => {
    return proposals.map((item) => {
      const [existing, proposed] = proposalDiffInputs(item);
      const cached = proposalDiffCache.get(item.proposal.id);
      const diff =
        cached?.existingContent === existing &&
        cached.proposedContent === proposed
          ? cached.diff
          : computeCreedDiff(existing, proposed);
      if (diff !== cached?.diff) {
        proposalDiffCache.set(item.proposal.id, {
          existingContent: existing,
          proposedContent: proposed,
          diff,
        });
      }
      return { id: item.proposal.id, ...diff };
    });
  }, [proposals]);

  const totals = useMemo(() => {
    let added = 0;
    let removed = 0;
    for (const s of perProposalStats) {
      added += s.added;
      removed += s.removed;
    }
    return { added, removed };
  }, [perProposalStats]);

  const isMobile = useIsMobile();
  const [openMobileProposalId, setOpenMobileProposalId] = useState<
    string | null
  >(null);

  const [open, setOpen] = useState(false);
  const pillRef = useRef<HTMLDivElement>(null);
  const [menuLayout, setMenuLayout] = useState<{
    width: number;
    alignOffset: number;
  } | null>(null);

  useLayoutEffect(() => {
    if (!isMobile) {
      setMenuLayout(null);
      return;
    }
    const pill = pillRef.current;
    if (!pill) return;
    const sync = () => {
      const pillRect = pill.getBoundingClientRect();
      const trigger = pill.querySelector<HTMLElement>(
        "[data-slot='dropdown-menu-trigger']",
      );
      setMenuLayout({
        width: pillRect.width,
        alignOffset: trigger
          ? pillRect.left - trigger.getBoundingClientRect().left
          : -6,
      });
    };
    sync();
    const observer = new ResizeObserver(sync);
    observer.observe(pill);
    return () => observer.disconnect();
  }, [hasReviewable, isMobile, open, proposals.length]);

  if (proposals.length === 0) {
    return null;
  }

  return (
    <div
      ref={pillRef}
      className={cn(
        "inline-flex min-w-0 max-w-full items-center gap-1",
        !embedded &&
          "rounded-xl border border-[var(--creed-border)] bg-[var(--creed-surface)] px-1.5 py-1",
      )}
    >
      <DropdownMenu
        open={open}
        onOpenChange={(next) => {
          const pill = pillRef.current;
          if (next && isMobile && pill) {
            const pillRect = pill.getBoundingClientRect();
            const trigger = pill.querySelector<HTMLElement>(
              "[data-slot='dropdown-menu-trigger']",
            );
            setMenuLayout({
              width: pillRect.width,
              alignOffset: trigger
                ? pillRect.left - trigger.getBoundingClientRect().left
                : -6,
            });
          }
          setOpen(next);
        }}
      >
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            type="button"
            className="group/trigger inline-flex h-7 items-center rounded-[10px] px-2.5 text-sm font-medium text-[var(--creed-text-secondary)] outline-none select-none transition-colors hover:bg-[var(--creed-surface-raised)] hover:text-[var(--creed-text-primary)] data-[state=open]:bg-[var(--creed-surface-raised)] data-[state=open]:text-[var(--creed-text-primary)] focus-visible:ring-2 focus-visible:ring-[var(--creed-accent)]/45"
          >
            <span className="inline-flex items-center gap-2">
              <span className="inline-flex items-center gap-1">
                <DiffBadge tone="added" count={totals.added} size="md" />
                <DiffBadge tone="removed" count={totals.removed} size="md" />
              </span>
              <span aria-hidden="true" className={SEP_DOT_CLASS}>
                ·
              </span>
              <span>
                <span className="sm:hidden">{proposals.length}</span>
                <span className="hidden sm:inline">
                  {proposals.length === 1
                    ? "1 proposal"
                    : `${proposals.length} proposals`}
                </span>
              </span>
              <AnimatedChevronDown
                size={14}
                // Tertiary by default, flips to primary text colour when the
                // trigger row is hovered or the dropdown is open - matches
                // the chevron behaviour on the profile and colour dropdowns.
                className="-rotate-90 text-[var(--creed-text-tertiary)] transition-[color,rotate] duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover/trigger:text-[var(--creed-text-primary)] group-data-[state=open]/trigger:rotate-0 group-data-[state=open]/trigger:text-[var(--creed-text-primary)] in-aria-expanded:rotate-0 in-aria-expanded:text-[var(--creed-text-primary)]"
              />
            </span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="start"
          // Desktop keeps the 280px side-menu width. Mobile measures the
          // outer pill so the accordion reaches Accept all.
          alignOffset={isMobile ? (menuLayout?.alignOffset ?? -6) : -6}
          // Vertical breathing room matches the horizontal gap to neighbouring
          // cards so the popover feels evenly spaced (`gap-4` / 16px).
          sideOffset={16}
          collisionPadding={16}
          collisionBoundary={canvas}
          avoidCollisions
          className={cn(
            DROPDOWN_CONTENT_CLASS,
            "relative flex flex-col gap-0.5 md:w-[280px]",
          )}
          style={
            isMobile && menuLayout
              ? { width: menuLayout.width, minWidth: menuLayout.width }
              : undefined
          }
          onCloseAutoFocus={(event) => {
            // Don't return focus to the trigger button on close - the
            // browser's smooth `scrollIntoView` from a "Jump to section"
            // click was getting interrupted by Radix's auto-focus.
            event.preventDefault();
          }}
        >
          {proposals.map((item, index) => {
            const stats = perProposalStats[index];
            // Mobile: inline accordion (side-popping submenus get clipped on
            // narrow screens). Desktop: original side-popping submenu.
            if (isMobile) {
              return (
                <ReviewPillItem
                  key={item.proposal.id}
                  item={item}
                  stats={stats}
                  open={openMobileProposalId === item.proposal.id}
                  onOpenChange={(nextOpen) =>
                    setOpenMobileProposalId(nextOpen ? item.proposal.id : null)
                  }
                  onJumpToProposal={onJumpToProposal}
                  onAcceptOne={onAcceptOne}
                  onRejectOne={onRejectOne}
                  onEditOne={onEditOne}
                  onDeleteOne={onDeleteOne}
                />
              );
            }
            const isDeleteProposal =
              item.proposal.draft.kind === "delete-section";
            const isNewSectionProposal =
              item.proposal.draft.kind === "new-section";
            return (
              <DropdownMenuSub key={item.proposal.id}>
                <DropdownMenuSubTrigger
                  className={cn(
                    DROPDOWN_ITEM_CLASS,
                    "group/sub hover:bg-[var(--creed-surface-raised)] [&>svg:last-of-type]:hidden",
                  )}
                >
                  <div className="flex min-w-0 flex-1 items-center gap-1.5">
                    <ProposalAuthor
                      authorType={item.proposal.authorType}
                      avatarUrl={item.proposal.authorAvatarUrl}
                      initials={item.proposal.authorInitials}
                      agentName={item.proposal.agentName}
                      agentIdentity={item.proposal.agentIdentity}
                    />
                    <span className="min-w-0 truncate font-medium text-[var(--creed-text-primary)]">
                      {item.sectionName ?? item.proposal.sectionName}
                    </span>
                    <span aria-hidden="true" className={SEP_DOT_CLASS}>
                      ·
                    </span>
                    <span className="inline-flex shrink-0 items-center gap-1">
                      <DiffBadge tone="added" count={stats.added} size="md" />
                      <DiffBadge
                        tone="removed"
                        count={stats.removed}
                        size="md"
                      />
                    </span>
                    <AnimatedChevronDown
                      size={14}
                      // Sub-row chevron: muted tertiary by default, swaps
                      // to primary on row hover / open so the affordance
                      // matches the parent dropdown's trigger chevron.
                      className="ml-auto rotate-90 shrink-0 transition-[color,rotate] duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover/sub:-rotate-90 group-data-[state=open]/sub:-rotate-90 [&_svg]:h-[14px]! [&_svg]:w-[14px]! [&_svg]:stroke-[var(--creed-text-tertiary)]! group-hover/sub:[&_svg]:stroke-[var(--creed-text-primary)]! group-data-[state=open]/sub:[&_svg]:stroke-[var(--creed-text-primary)]!"
                    />
                  </div>
                </DropdownMenuSubTrigger>
                <DropdownMenuPortal>
                  <DropdownMenuSubContent
                    collisionBoundary={canvas}
                    collisionPadding={12}
                    avoidCollisions
                    sideOffset={12}
                    alignOffset={-4}
                    // Pseudo-element bridges the 12px sideOffset gap so the
                    // cursor can travel from the row in the parent dropdown
                    // into this side panel without triggering close.
                    className="relative w-[320px] max-w-[var(--radix-dropdown-menu-content-available-width)] max-h-[var(--radix-dropdown-menu-content-available-height)] overflow-y-auto border-[var(--creed-border)] bg-[var(--creed-surface)] p-0 before:pointer-events-auto before:absolute before:-left-4 before:top-0 before:bottom-0 before:w-4 before:content-['']"
                  >
                    <div className="flex items-center justify-between gap-2 border-b border-[var(--creed-border)] px-3 py-2 text-sm text-[var(--creed-text-secondary)]">
                      <div className="flex min-w-0 items-center gap-2">
                        <ProposalAuthor
                          authorType={item.proposal.authorType}
                          avatarUrl={item.proposal.authorAvatarUrl}
                          initials={item.proposal.authorInitials}
                          agentName={item.proposal.agentName}
                          agentIdentity={item.proposal.agentIdentity}
                        />
                        <span className="truncate font-medium text-[var(--creed-text-primary)]">
                          {item.proposal.agentName}
                        </span>
                      </div>
                      <span className="inline-flex items-center gap-1">
                        <DiffBadge tone="added" count={stats.added} size="md" />
                        <DiffBadge
                          tone="removed"
                          count={stats.removed}
                          size="md"
                        />
                      </span>
                    </div>
                    <div className="creed-diff-block max-h-[200px] overflow-y-auto py-2 text-[12px] leading-5">
                      <CreedDiffView diff={stats} />
                    </div>
                    <div className="flex flex-wrap items-center justify-between gap-1 border-t border-[var(--creed-border)] py-1.5 pr-2.5 pl-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          // Close immediately so the smooth scroll is the
                          // only thing the page is doing - and so the
                          // dropdown unmount can't fight the scroll.
                          setOpen(false);
                          onJumpToProposal(item.proposal);
                        }}
                        className="inline-flex h-7 shrink-0 items-center whitespace-nowrap rounded-sm px-2 text-sm font-medium text-[var(--creed-text-secondary)] transition-colors hover:bg-[var(--creed-surface-raised)] hover:text-[var(--creed-text-primary)]"
                      >
                        Jump to section
                      </button>
                      {item.proposal.mine ? (
                        // Author's own proposal: edit (jump back to continue) or
                        // delete it - they never approve their own.
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            aria-label="Edit proposal"
                            onClick={() => {
                              setOpen(false);
                              onEditOne(item.proposal);
                            }}
                            className="inline-flex h-7 items-center gap-1 rounded-sm px-2 text-sm font-medium text-[var(--creed-text-secondary)] transition-colors hover:bg-[var(--creed-surface-raised)] hover:text-[var(--creed-text-primary)]"
                          >
                            <Pencil className="h-3.5 w-3.5 sm:hidden" />
                            <span className="hidden sm:inline">Edit</span>
                          </button>
                          <button
                            type="button"
                            aria-label="Delete proposal"
                            onClick={() => onDeleteOne(item.proposal.id)}
                            className="inline-flex h-7 items-center gap-1 rounded-sm bg-[#DC2626] px-2.5 text-sm font-medium text-white transition-colors hover:bg-[#B91C1C]"
                          >
                            <Trash2 className="h-3.5 w-3.5 sm:hidden" />
                            <span className="hidden sm:inline">Delete</span>
                          </button>
                        </div>
                      ) : item.canReview ? (
                        <div className="-mr-1 flex items-center gap-1">
                          <button
                            type="button"
                            aria-label="Reject proposal"
                            onClick={() => onRejectOne(item.proposal.id)}
                            className="inline-flex h-7 items-center gap-1 rounded-sm px-2 text-sm font-medium text-[var(--creed-text-secondary)] transition-colors hover:bg-[var(--creed-surface-raised)] hover:text-[var(--creed-text-primary)]"
                          >
                            <X className="h-3.5 w-3.5 sm:hidden" />
                            <span className="hidden sm:inline">Reject</span>
                          </button>
                          <button
                            type="button"
                            aria-label="Accept proposal"
                            onClick={() => onAcceptOne(item.proposal.id)}
                            className={cn(
                              "inline-flex h-7 items-center gap-1 rounded-sm px-2.5 text-sm font-medium text-white transition-colors",
                              // Accept colour reflects intent for structural
                              // operations: red for delete-section, green for
                              // new-section, default blue for content updates.
                              isDeleteProposal
                                ? "bg-[#dc2626] hover:bg-[#b91c1c]"
                                : isNewSectionProposal
                                  ? "bg-[#16A34A] hover:bg-[#15803d]"
                                  : "bg-[var(--creed-accent)] hover:bg-[var(--creed-accent-hover)]",
                            )}
                          >
                            <Check className="h-3.5 w-3.5 sm:hidden" />
                            <span className="hidden sm:inline">Accept</span>
                          </button>
                        </div>
                      ) : null}
                    </div>
                  </DropdownMenuSubContent>
                </DropdownMenuPortal>
              </DropdownMenuSub>
            );
          })}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Reject/Accept all only when the viewer has proposals they can review
          (a member seeing only their own proposals can't bulk-approve). */}
      {hasReviewable ? (
        <ReviewAllActions onAcceptAll={onAcceptAll} onRejectAll={onRejectAll} />
      ) : null}
    </div>
  );
});

function ReviewPillItem({
  item,
  stats,
  open,
  onOpenChange,
  onJumpToProposal,
  onAcceptOne,
  onRejectOne,
  onEditOne,
  onDeleteOne,
}: {
  item: ReviewPillProposal;
  stats: {
    added: number;
    removed: number;
    lines: CreedDiff["lines"];
  };
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onJumpToProposal: (proposal: Proposal) => void;
  onAcceptOne: (proposalId: string) => void;
  onRejectOne: (proposalId: string) => void;
  onEditOne: (proposal: Proposal) => void;
  onDeleteOne: (proposalId: string) => void;
}) {
  const isDeleteProposal = item.proposal.draft.kind === "delete-section";
  const isNewSectionProposal = item.proposal.draft.kind === "new-section";

  return (
    <div className="rounded-[var(--radius-md)] hover:bg-[var(--creed-surface-raised)]">
      <button
        type="button"
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          onOpenChange(!open);
        }}
        className={cn(
          DROPDOWN_ITEM_CLASS,
          "group w-full min-w-0 justify-start text-left outline-none focus-visible:ring-2 focus-visible:ring-[var(--creed-accent)]/45",
        )}
        aria-expanded={open}
      >
        <ProposalAuthor
          authorType={item.proposal.authorType}
          avatarUrl={item.proposal.authorAvatarUrl}
          initials={item.proposal.authorInitials}
          agentName={item.proposal.agentName}
          agentIdentity={item.proposal.agentIdentity}
        />
        <span className="min-w-0 truncate font-medium text-[var(--creed-text-primary)]">
          {item.sectionName ?? item.proposal.sectionName}
        </span>
        <span aria-hidden="true" className={SEP_DOT_CLASS}>
          ·
        </span>
        <span className="inline-flex shrink-0 items-center gap-1">
          <DiffBadge tone="added" count={stats.added} size="md" />
          <DiffBadge tone="removed" count={stats.removed} size="md" />
        </span>
        <AnimatedChevronDown
          size={14}
          className="-rotate-90 ml-auto shrink-0 origin-center text-[var(--creed-text-tertiary)] transition-[color,rotate] duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:text-[var(--creed-text-primary)] in-aria-expanded:rotate-0 in-aria-expanded:text-[var(--creed-text-primary)]"
        />
      </button>

      <AnimatePresence initial={false}>
        {open ? (
          <motion.div
            key="content"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden"
          >
            <div className="border-t border-[var(--creed-border)]" />
            <div className="creed-scrollbar creed-diff-block max-h-[220px] overflow-y-auto py-2 text-[12px] leading-5">
              <CreedDiffView diff={stats} />
            </div>
            <div className="flex items-center justify-between gap-1 border-t border-[var(--creed-border)] px-1.5 py-1.5">
              <button
                type="button"
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  onJumpToProposal(item.proposal);
                }}
                className="inline-flex h-7 items-center rounded-sm px-2 text-sm font-medium text-[var(--creed-text-secondary)] transition-colors hover:bg-black/[0.06] hover:text-[var(--creed-text-primary)] dark:hover:bg-white/[0.08]"
              >
                Jump
              </button>
              {item.proposal.mine ? (
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    aria-label="Edit proposal"
                    onClick={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                      onEditOne(item.proposal);
                    }}
                    className="inline-flex h-7 items-center gap-1 rounded-sm px-2 text-sm font-medium text-[var(--creed-text-secondary)] transition-colors hover:bg-black/[0.06] hover:text-[var(--creed-text-primary)] dark:hover:bg-white/[0.08]"
                  >
                    <Pencil className="h-3.5 w-3.5 sm:hidden" />
                    <span className="hidden sm:inline">Edit</span>
                  </button>
                  <button
                    type="button"
                    aria-label="Delete proposal"
                    onClick={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                      onDeleteOne(item.proposal.id);
                    }}
                    className="inline-flex h-7 items-center gap-1 rounded-sm bg-[#DC2626] px-2.5 text-sm font-medium text-white transition-colors hover:bg-[#B91C1C]"
                  >
                    <Trash2 className="h-3.5 w-3.5 sm:hidden" />
                    <span className="hidden sm:inline">Delete</span>
                  </button>
                </div>
              ) : item.canReview ? (
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    aria-label="Reject proposal"
                    onClick={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                      onRejectOne(item.proposal.id);
                    }}
                    className="inline-flex h-7 items-center gap-1 rounded-sm px-2 text-sm font-medium text-[var(--creed-text-secondary)] transition-colors hover:bg-black/[0.06] hover:text-[var(--creed-text-primary)] dark:hover:bg-white/[0.08]"
                  >
                    Reject
                  </button>
                  <button
                    type="button"
                    aria-label="Accept proposal"
                    onClick={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                      onAcceptOne(item.proposal.id);
                    }}
                    className={cn(
                      "inline-flex h-7 items-center gap-1 rounded-sm px-2.5 text-sm font-medium text-white transition-colors",
                      isDeleteProposal
                        ? "bg-[#dc2626] hover:bg-[#b91c1c]"
                        : isNewSectionProposal
                          ? "bg-[#16A34A] hover:bg-[#15803d]"
                          : "bg-[var(--creed-accent)] hover:bg-[var(--creed-accent-hover)]",
                    )}
                  >
                    Accept
                  </button>
                </div>
              ) : null}
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
