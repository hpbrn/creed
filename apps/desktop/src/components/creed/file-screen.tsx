import { downloadFile } from "@/lib/native/export";
import { useAiEnabled } from "@/lib/native/ai-availability";
import { FileToolbar, WindowToolbar } from "@/components/creed/window-toolbar";

import { pick, flushEdits } from "@/lib/native/workspace";
import { RawSourceEditor } from "@/components/creed/raw-source-editor";
import { ScanTextIcon } from "@/components/ui/scan-text";
import { sourceMayRenderDifferently } from "@/lib/creed/markdown-capabilities";
import { OPEN_SOURCE_EVENT } from "@/components/creed/native-source-dialog";
import { RichAnswer } from "@/components/creed/rich-answer";

import {
  memo,
  startTransition,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import Image from "@/lib/native/image";
import {
  AnimatePresence,
  Reorder,
  motion,
  useDragControls,
} from "motion/react";
import {
  AlertTriangle,
  Check,
  ChevronDown,
  ChevronLeft,
  Ellipsis,
  Plus,
  Send,
} from "lucide-react";
import { toast } from "sonner";
import { fireConfetti } from "@/lib/confetti";
import { creedMarkdownFilename } from "@/lib/creed-filename";
import { AnimatedCheckmark } from "@/components/ui/animated-checkmark";
import { ArchiveIcon } from "@/components/ui/archive";
import { Button } from "@/components/ui/button";
import { DelayedSpinner } from "@/components/ui/delayed-spinner";
import {
  CloudBackupIcon,
  type CloudBackupIconHandle,
} from "@/components/ui/cloud-backup";

import { CopyIcon } from "@/components/ui/copy";
import {
  FolderSyncIcon,
  type FolderSyncIconHandle,
} from "@/components/ui/folder-sync";
import { DeleteIcon } from "@/components/ui/delete";
import { DownloadIcon } from "@/components/ui/download";
import { FolderUpIcon } from "@/components/ui/folder-up";
import { GripVerticalIcon } from "@/components/ui/grip-vertical";
import { HistoryIcon } from "@/components/ui/history";
import { LockIcon } from "@/components/ui/lock";
import { LockOpenIcon } from "@/components/ui/lock-open";
import { ShredderIcon } from "@/components/ui/shredder";
import { SquarePenIcon } from "@/components/ui/square-pen";
import { StampIcon, type StampIconHandle } from "@/components/ui/stamp";
import { WaypointsIcon } from "@/components/ui/waypoints";
import { AnimatedMenuIconItem } from "@/components/creed/animated-icon-action";
import {
  useAnimatedIconControls,
  useLockIconHover,
  type AnimatedIconHandle,
} from "@/components/creed/animated-icon-controls";
import { useCreedEdition } from "@/components/creed/edition-provider";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DROPDOWN_CONTENT_CLASS,
  DROPDOWN_ICON_TRIGGER_CLASS,
  DROPDOWN_ICON_SURFACE_CLASS,
  DROPDOWN_ITEM_CLASS,
  DROPDOWN_SUB_CHEVRON_CLASS,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuPortal,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SimpleTooltip } from "@/components/ui/tooltip";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AgentIconStack } from "@/components/creed/agent-icon-stack";
import {
  ACTIVITY_STATUS_LABELS,
  getActivityStatusStyles,
} from "@/components/creed/activity-ui";
import {
  OverallQualityPopover,
  QualityRing,
  SectionQualityPopover,
  type CreedQualityReport,
} from "@/components/creed/file-quality-ui";
import {
  getInFlightFull,
  getQualityRunnerServerSnapshot,
  getQualityRunnerSnapshot,
  runFullQuality,
  runSectionQuality,
  setBaselineReport,
  setQualityRunnerScope,
  subscribeQualityRunAnnouncements,
  subscribeQualityRunner,
} from "@/lib/ai/quality-runner";
import { RichTextEditor } from "@/components/creed/rich-text-editor";
import { NexusView, type NexusViewState } from "@/components/creed/nexus-view";
import { LockLabel } from "@/components/creed/lock-label";
import { SwapLabel } from "@/components/creed/swap-label";
import { CreedFindReplace } from "@/components/creed/find-replace";
import {
  CreedDiffView,
  DiffBadge,
  InlineMetaProposal,
  InlineNewSectionProposal,
  InlineProposalDiff,
} from "@/components/creed/inline-proposal-diff";
import {
  computeCreedDiff,
  hasDiffChanges,
  type CreedDiff,
} from "@/lib/creed-diff";
import {
  inlineReviewProposals,
  liveReviewProposals,
  pendingReviewProposals,
  proposalActivityEntries,
  proposalReviewBaseline,
} from "@/lib/proposal-state";
import { ReviewPill } from "@/components/creed/review-pill";
import { FloatingReview } from "@/components/creed/floating-review";
import {
  FILE_COLUMN_CLASS,
  FILE_HEADER_OUTLINE_MOBILE_FOCUS_CLASS,
  FILE_SECTION_ACCENT_BAR_CLASS,
  FILE_SECTION_NAME_CLASS,
  FILE_SECTION_STACK_CLASS,
  FileActivityRailFrame,
} from "@/components/creed/file-presentation";
import {
  useCreedShellFileActions,
  useCreedShellActiveSection,
} from "@/components/creed/shell";
import { ShortcutKey } from "@/components/creed/shortcut-key";
import {
  useCreed,
  useCreedStateSelector,
  useCreedSyncStatus,
} from "@/components/creed/creed-provider";
import { CreedSwitcher } from "@/components/creed/creed-switcher";

import {
  accentColorMap,
  accentLabelMap,
  VISIBLE_ACCENT_KEYS,
  getProposalPreviewText,
  hasSectionName,
  isAccentKey,
  normalizeLegacyProposalDraft,
  normalizeProposalForSection,
  sectionToMarkdown,
  type AccentKey,
  type ActivityEntry,
  type CreedSection,
  type Proposal,
} from "@/lib/creed/creed-data";
import {
  normalizeRichTextInput,
  richTextContentEquivalent,
} from "@/lib/creed/rich-text";
import { qualitySectionFingerprint } from "@/lib/ai/quality-fingerprint";
import {
  canProposeToSection,
  resolveSectionPermission,
} from "@/lib/creed/creed-permissions";
import { cn } from "@/components/ui/utils";

const FILE_NAV_INTENT_KEY = "creed:file-nav-intent";
const COLLAPSED_SECTIONS_STORAGE_PREFIX = "creed:collapsed-sections:";

type FileRevealTarget = {
  highlightId: string;
  locate: { type: "section"; id: string } | { type: "proposal"; id: string };
};

function sectionReveal(sectionId: string): FileRevealTarget {
  return {
    highlightId: sectionId,
    locate: { type: "section", id: sectionId },
  };
}

function proposalReveal(proposal: Proposal): FileRevealTarget {
  if (proposal.draft.kind === "new-section") {
    return {
      highlightId: proposal.id,
      locate: { type: "proposal", id: proposal.id },
    };
  }
  return sectionReveal(proposal.sectionId);
}

// Per-section fingerprints keyed by object identity. Unchanged sections keep
// their references across commits and sync polls, so a keystroke re-stringifies
// only the edited section instead of the whole file.
const sectionFingerprintCache = new WeakMap<CreedSection, string>();
function cachedSectionFingerprint(section: CreedSection) {
  let fingerprint = sectionFingerprintCache.get(section);
  if (fingerprint === undefined) {
    fingerprint = qualitySectionFingerprint(section);
    sectionFingerprintCache.set(section, fingerprint);
  }
  return fingerprint;
}

// Returns the previous value while the new one is deep-equal, so derived
// arrays/objects keep a stable identity across unrelated re-renders (they'd
// otherwise bust the memoized section cards on every keystroke).
function useJsonStable<T>(value: T): T {
  const ref = useRef(value);
  if (
    ref.current !== value &&
    JSON.stringify(ref.current) !== JSON.stringify(value)
  ) {
    ref.current = value;
  }
  return ref.current;
}

const EMPTY_PROPOSALS: Proposal[] = [];
const ACTIVITY_PAGE_SIZE = 20;
// A touch longer than the rail's 340ms open/close animation (see
// FileActivityRailFrame). Work that would compete with that animation waits for
// this to elapse instead.
const ACTIVITY_RAIL_SETTLE_MS = 380;

function formatRelativeTime(timestamp?: string, fallbackLabel?: string) {
  if (!timestamp) {
    return fallbackLabel === "just now" ? "now" : (fallbackLabel ?? "now");
  }

  const deltaMs = Math.max(Date.now() - new Date(timestamp).getTime(), 0);
  const minutes = Math.round(deltaMs / 60000);

  if (minutes < 1) {
    return "now";
  }

  if (minutes < 60) {
    return `${minutes}m`;
  }

  const hours = Math.round(minutes / 60);
  if (hours < 24) {
    return `${hours}h`;
  }

  const days = Math.round(hours / 24);
  if (days === 1) {
    return "1d";
  }

  if (days < 7) {
    return `${days}d`;
  }

  const weeks = Math.round(days / 7);
  if (weeks === 1) {
    return "1w";
  }

  return `${weeks}w`;
}

function formatDayLabel(timestamp?: string, fallbackLabel?: string) {
  if (!timestamp) {
    return fallbackLabel ?? "Today";
  }

  const deltaMs = Math.max(Date.now() - new Date(timestamp).getTime(), 0);
  const days = Math.floor(deltaMs / 86_400_000);

  if (days <= 0) {
    return "Today";
  }

  if (days === 1) {
    return "Yesterday";
  }

  return "Earlier";
}

function uniqueAgentNames(names: Array<string | undefined | null>) {
  const seen = new Set<string>();

  return names.filter((name): name is string => {
    const normalized = name?.trim();
    if (!normalized || normalized.toLowerCase() === "you") {
      return false;
    }

    const key = normalized.toLowerCase();
    if (seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
}

function findFileRevealElement(
  container: HTMLElement,
  locate: FileRevealTarget["locate"],
) {
  const attribute =
    locate.type === "proposal" ? "data-proposal-id" : "data-section-id";
  const datasetKey = locate.type === "proposal" ? "proposalId" : "sectionId";

  return (
    Array.from(container.querySelectorAll<HTMLElement>(`[${attribute}]`)).find(
      (element) => element.dataset[datasetKey] === locate.id,
    ) ?? null
  );
}

function scrollFileElementIntoView(
  container: HTMLElement,
  element: HTMLElement,
  behavior: ScrollBehavior,
) {
  const targetTop = getFileElementScrollTop(container, element);

  if (
    behavior !== "smooth" ||
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  ) {
    cancelFileScroll(container);
    container.scrollTop = targetTop;
    return;
  }

  animateFileScroll(container, targetTop);
}

type ActiveFileScroll = {
  frame: number;
  removeInputListeners: () => void;
};

const activeFileScrolls = new WeakMap<HTMLElement, ActiveFileScroll>();

function cancelFileScroll(container: HTMLElement) {
  const active = activeFileScrolls.get(container);
  if (active) {
    window.cancelAnimationFrame(active.frame);
    active.removeInputListeners();
  }
  activeFileScrolls.delete(container);
}

function creedScrollEase(progress: number) {
  let curvePosition = progress;

  for (let iteration = 0; iteration < 5; iteration += 1) {
    const inverse = 1 - curvePosition;
    const curveX =
      3 * inverse * inverse * curvePosition * 0.25 +
      3 * inverse * curvePosition * curvePosition * 0.25 +
      curvePosition * curvePosition * curvePosition;
    const slope =
      3 * inverse * inverse * 0.25 +
      6 * inverse * curvePosition * (0.25 - 0.25) +
      3 * curvePosition * curvePosition * (1 - 0.25);

    if (Math.abs(slope) < 0.0001) break;
    curvePosition = Math.min(
      1,
      Math.max(0, curvePosition - (curveX - progress) / slope),
    );
  }

  const inverse = 1 - curvePosition;
  return (
    3 * inverse * inverse * curvePosition * 0.1 +
    3 * inverse * curvePosition * curvePosition +
    curvePosition * curvePosition * curvePosition
  );
}

function animateFileScroll(container: HTMLElement, targetTop: number) {
  cancelFileScroll(container);

  const startTop = container.scrollTop;
  const distance = targetTop - startTop;
  if (Math.abs(distance) < 1) return;

  const duration = Math.min(
    900,
    Math.max(500, 420 + Math.abs(distance) * 0.22),
  );
  const startedAt = performance.now();
  const stopForInput = () => cancelFileScroll(container);
  const removeInputListeners = () => {
    container.removeEventListener("wheel", stopForInput);
    container.removeEventListener("touchstart", stopForInput);
  };
  container.addEventListener("wheel", stopForInput, { passive: true });
  container.addEventListener("touchstart", stopForInput, { passive: true });

  const step = (now: number) => {
    const progress = Math.min((now - startedAt) / duration, 1);
    container.scrollTop = startTop + distance * creedScrollEase(progress);

    if (progress < 1) {
      activeFileScrolls.set(container, {
        frame: window.requestAnimationFrame(step),
        removeInputListeners,
      });
    } else {
      removeInputListeners();
      activeFileScrolls.delete(container);
    }
  };

  activeFileScrolls.set(container, {
    frame: window.requestAnimationFrame(step),
    removeInputListeners,
  });
}

function getFileElementScrollTop(container: HTMLElement, element: HTMLElement) {
  const stickyHeader = container.querySelector<HTMLElement>(
    "[data-file-sticky-header]",
  );
  const stickyOffset = stickyHeader?.getBoundingClientRect().height ?? 0;
  const containerRect = container.getBoundingClientRect();
  const elementRect = element.getBoundingClientRect();

  return Math.max(
    container.scrollTop +
      elementRect.top -
      containerRect.top -
      stickyOffset -
      16,
    0,
  );
}

type SaveDisplayStatus =
  | "cloud-synced"
  | "cloud-syncing"
  | "cloud-failed"
  | "local-saved"
  | "local-saving";

const SYNCING_REVEAL_DELAY_MS = 350;
const SYNCING_MIN_VISIBLE_MS = 400;

function relativeSaveLabel(timestamp: number | null) {
  if (timestamp === null) return "";
  const relative = formatRelativeTime(new Date(timestamp).toISOString());
  return relative === "now" ? " · just now" : ` · ${relative} ago`;
}

function SaveStatusIcon({
  icon,
  status,
  cloudSyncedAt,
}: {
  icon: "cloud" | "database" | "alert";
  status: SaveDisplayStatus;
  cloudSyncedAt: number | null;
}) {
  const cloudRef = useRef<CloudBackupIconHandle>(null);
  const databaseRef = useRef<FolderSyncIconHandle>(null);
  const lastAnimatedCloudSyncRef = useRef(cloudSyncedAt);
  const showedCloudSyncingRef = useRef(status === "cloud-syncing");

  useEffect(() => {
    if (icon === "cloud" && status === "cloud-syncing") {
      showedCloudSyncingRef.current = true;
      void cloudRef.current?.startAnimation();
    } else if (icon === "cloud") {
      void cloudRef.current?.stopAnimation();
    } else if (
      icon === "database" &&
      (status === "local-saving" || status === "cloud-syncing")
    ) {
      showedCloudSyncingRef.current = status === "cloud-syncing";
      void databaseRef.current?.startAnimation();
    } else {
      showedCloudSyncingRef.current = false;
      void databaseRef.current?.stopAnimation();
    }
  }, [icon, status]);

  useEffect(() => {
    if (
      icon === "alert" ||
      status !== "cloud-synced" ||
      cloudSyncedAt === null ||
      cloudSyncedAt === lastAnimatedCloudSyncRef.current
    ) {
      return;
    }
    lastAnimatedCloudSyncRef.current = cloudSyncedAt;
    if (showedCloudSyncingRef.current) {
      showedCloudSyncingRef.current = false;
      return;
    }
    if (icon === "cloud") void cloudRef.current?.startAnimation();
    else void databaseRef.current?.startAnimation();
  }, [cloudSyncedAt, icon, status]);

  if (icon === "cloud") {
    return <CloudBackupIcon ref={cloudRef} size={16} aria-hidden="true" />;
  }
  if (icon === "database") {
    return <FolderSyncIcon ref={databaseRef} size={16} aria-hidden="true" />;
  }
  return <AlertTriangle size={16} strokeWidth={1.8} aria-hidden="true" />;
}

// Normal, fast writes leave the stable cloud acknowledgement visible. The
// in-flight label appears only for a perceptibly slow request, while offline or
// failed cloud writes switch to the separate IndexedDB checkpoint track.
function SaveStatus() {
  const { save } = useCreedEdition();
  const { status, localSaving, localSaveFailed, localSavedAt } =
    useCreedSyncStatus();
  const cloudSyncedAt = useCreedStateSelector(
    (snapshot) => snapshot.lastSavedAt,
  );
  const degraded = status === "offline" || status === "failed";
  const initialDisplay: SaveDisplayStatus =
    status === "unsaved" || (degraded && localSaveFailed)
      ? "cloud-failed"
      : degraded
        ? "local-saved"
        : "cloud-synced";
  const [displayStatus, setDisplayStatus] =
    useState<SaveDisplayStatus>(initialDisplay);
  const displayStatusRef = useRef(displayStatus);
  const transitionTimerRef = useRef<number | null>(null);
  const syncingVisibleAtRef = useRef<number | null>(null);
  const [, setTimeTick] = useState(0);

  const showStatus = useCallback((next: SaveDisplayStatus) => {
    displayStatusRef.current = next;
    setDisplayStatus(next);
  }, []);

  useEffect(() => {
    if (transitionTimerRef.current !== null) {
      window.clearTimeout(transitionTimerRef.current);
      transitionTimerRef.current = null;
    }

    if (status === "unsaved" || (degraded && localSaveFailed)) {
      showStatus("cloud-failed");
    } else if (degraded) {
      showStatus(localSaving ? "local-saving" : "local-saved");
    } else if (status === "syncing") {
      if (displayStatusRef.current !== "cloud-syncing") {
        transitionTimerRef.current = window.setTimeout(() => {
          transitionTimerRef.current = null;
          syncingVisibleAtRef.current = Date.now();
          showStatus("cloud-syncing");
        }, SYNCING_REVEAL_DELAY_MS);
      }
    } else if (displayStatusRef.current === "cloud-syncing") {
      const shownFor = Date.now() - (syncingVisibleAtRef.current ?? Date.now());
      transitionTimerRef.current = window.setTimeout(
        () => {
          transitionTimerRef.current = null;
          syncingVisibleAtRef.current = null;
          showStatus("cloud-synced");
        },
        Math.max(SYNCING_MIN_VISIBLE_MS - shownFor, 0),
      );
    } else {
      syncingVisibleAtRef.current = null;
      showStatus("cloud-synced");
    }

    return () => {
      if (transitionTimerRef.current !== null) {
        window.clearTimeout(transitionTimerRef.current);
        transitionTimerRef.current = null;
      }
    };
  }, [degraded, localSaveFailed, localSaving, showStatus, status]);

  useEffect(() => {
    const id = window.setInterval(
      () => setTimeTick((value) => value + 1),
      60_000,
    );
    return () => window.clearInterval(id);
  }, []);

  const content =
    displayStatus === "cloud-synced"
      ? {
          label: `${save.persistedLabel}${relativeSaveLabel(cloudSyncedAt)}`,
          tone: save.persistedTone,
          icon: save.icon,
        }
      : displayStatus === "cloud-syncing"
        ? {
            label: save.pendingLabel,
            tone: save.pendingTone,
            icon: save.icon,
          }
        : displayStatus === "cloud-failed"
          ? {
              label: save.failureLabel,
              tone: "text-[#dc2626] dark:text-[#f87171]",
              icon: "alert" as const,
            }
          : displayStatus === "local-saving"
            ? {
                label: "Saving…",
                tone: "text-[var(--creed-text-secondary)]",
                icon: "database" as const,
              }
            : {
                label: `Saved locally${relativeSaveLabel(localSavedAt)}`,
                tone: "text-[var(--creed-text-secondary)]",
                icon: "database" as const,
              };
  const statusLabels = [
    `${save.persistedLabel}${relativeSaveLabel(cloudSyncedAt)}`,
    save.pendingLabel,
    save.failureLabel,
    "Saving…",
    `Saved locally${relativeSaveLabel(localSavedAt)}`,
  ];

  return (
    <div
      className={`creed-toolbar-sync flex h-5 shrink-0 items-center gap-2 text-sm transition-colors duration-200 ${content.tone}`}
      aria-live="polite"
    >
      <span className="relative grid h-4 w-4 shrink-0 place-items-center">
        <AnimatePresence initial={false}>
          <motion.span
            key={content.icon}
            className="absolute inset-0 flex items-center justify-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
          >
            <SaveStatusIcon
              icon={content.icon}
              status={displayStatus}
              cloudSyncedAt={cloudSyncedAt}
            />
          </motion.span>
        </AnimatePresence>
      </span>
      <span className="creed-toolbar-sync-label">
        <span data-sync-label className="inline-flex w-max">
          <SwapLabel value={content.label} options={statusLabels} />
        </span>
      </span>
    </div>
  );
}

export function FileScreen({ active = true }: { active?: boolean }) {
  const {
    state,
    startLocalSave,
    finishLocalSave,
    toggleLock,
    toggleSectionLock,
    updateRichTextSection,
    fileProposalEdit,
    reorderSections,
    addSection,
    addSectionAfter,
    renameSection,
    setSectionAccent,
    deleteSection,
    archiveSection,
    archiveCreed,
    clearSections,
    acceptProposal,
    acceptProposals,
    rejectProposal,
    dismissProposal,
    withdrawProposal,
    exportMarkdown,
    sectionPresence,
    markGettingStartedStep,
  } = useCreed();
  const activeCreedName =
    state.creeds?.find((creed) => creed.id === state.creedId)?.name ??
    state.user.name;
  // Shared role gates. In personal mode the sole user is effectively the owner.
  // Managers (owner/admin) create sections; plain members cannot. Section
  // creation is owner/admin-only to keep the shared file's shape managed.
  const sharedRole =
    state.creedType === "shared" ? state.shared?.myRole : undefined;
  const isSharedManager = sharedRole === "owner" || sharedRole === "admin";
  const canCreateSections = state.creedType !== "shared" || isSharedManager;
  // Reordering (drag) is owner/admin-only in shared mode - members can't drag.
  const canReorderSections = state.creedType !== "shared" || isSharedManager;
  // Analysis runs: owners/admins can trigger a full-file analysis; members can
  // only refresh individual sections they have propose or direct access to.
  const canRunQuality = state.creedType !== "shared" || isSharedManager;
  // Quality scores are visible to every Shared member. This controls ring
  // display, not the refresh button.
  const qualityScopeKey = state.creedId ?? `type:${state.creedType}`;
  // Archived sections stay in state (so they persist) but are hidden from the
  // editor; the section list renders from this live set.
  const visibleSections = useMemo(
    () => state.sections.filter((section) => !section.archived),
    [state.sections],
  );
  const collapsedSectionsStorageKey = `${COLLAPSED_SECTIONS_STORAGE_PREFIX}${state.creedId ?? state.creedType}`;
  const [collapsedSectionIds, setCollapsedSectionIds] = useState<Set<string>>(
    () => new Set(),
  );
  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(collapsedSectionsStorageKey);
      const parsed: unknown = stored ? JSON.parse(stored) : [];
      setCollapsedSectionIds(
        new Set(
          Array.isArray(parsed)
            ? parsed.filter(
                (value): value is string => typeof value === "string",
              )
            : [],
        ),
      );
    } catch {
      setCollapsedSectionIds(new Set());
    }
  }, [collapsedSectionsStorageKey]);
  const setSectionCollapsed = useCallback(
    (sectionId: string, collapsed: boolean) => {
      setCollapsedSectionIds((current) => {
        if (current.has(sectionId) === collapsed) return current;
        const next = new Set(current);
        if (collapsed) {
          next.add(sectionId);
        } else {
          next.delete(sectionId);
        }
        try {
          window.localStorage.setItem(
            collapsedSectionsStorageKey,
            JSON.stringify([...next]),
          );
        } catch {}
        return next;
      });
    },
    [collapsedSectionsStorageKey],
  );
  const canonicalVisibleOrder = useMemo(
    () => visibleSections.map((section) => section.id),
    [visibleSections],
  );
  const canonicalVisibleOrderRef = useRef(canonicalVisibleOrder);
  canonicalVisibleOrderRef.current = canonicalVisibleOrder;
  const [reorderOrder, setReorderOrder] = useState<string[] | null>(null);
  const reorderOrderRef = useRef<string[] | null>(null);
  const orderedVisibleSections = useMemo(() => {
    if (!reorderOrder) return visibleSections;
    const sectionsById = new Map(
      visibleSections.map((section) => [section.id, section]),
    );
    const ordered = reorderOrder
      .map((id) => sectionsById.get(id))
      .filter((section): section is CreedSection => Boolean(section));
    const orderedIds = new Set(reorderOrder);
    return [
      ...ordered,
      ...visibleSections.filter((section) => !orderedIds.has(section.id)),
    ];
  }, [reorderOrder, visibleSections]);
  const beginReorder = useCallback(() => {
    const initialOrder = canonicalVisibleOrderRef.current;
    reorderOrderRef.current = initialOrder;
  }, []);

  const previewReorder = useCallback((nextOrder: string[]) => {
    if (nextOrder.join("|") === reorderOrderRef.current?.join("|")) return;
    reorderOrderRef.current = nextOrder;
    setReorderOrder(nextOrder);
  }, []);

  const finishReorder = useCallback(() => {
    const finalOrder = reorderOrderRef.current;
    if (!finalOrder) return;

    if (finalOrder.join("|") !== canonicalVisibleOrderRef.current.join("|")) {
      reorderSections(finalOrder);
      return;
    }

    reorderOrderRef.current = null;
    setReorderOrder(null);
  }, [reorderSections]);

  useEffect(() => {
    if (
      !reorderOrder ||
      reorderOrder.join("|") !== canonicalVisibleOrder.join("|")
    ) {
      return;
    }

    reorderOrderRef.current = null;
    setReorderOrder(null);
  }, [canonicalVisibleOrder, reorderOrder]);
  // json-stable: names/accents change rarely, so the identity survives
  // keystrokes and the memoized section cards don't see a new prop.
  const visibleSectionTagTargets = useJsonStable(
    useMemo(
      () =>
        visibleSections.map((section) => ({
          id: section.id,
          name: section.name,
          accent: section.accent,
        })),
      [visibleSections],
    ),
  );
  const normalizedInlineProposals = useMemo(
    () =>
      inlineReviewProposals(
        liveReviewProposals(state.proposals, state.sections),
      ).map((proposal) =>
        normalizeProposalForSection(
          {
            ...proposal,
            draft: normalizeLegacyProposalDraft(proposal.draft),
          },
          state.sections.find((section) => section.id === proposal.sectionId),
        ),
      ),
    [state.proposals, state.sections],
  );
  const normalizedPendingProposals = useMemo(
    () => pendingReviewProposals(normalizedInlineProposals),
    [normalizedInlineProposals],
  );
  // json-stable: normalization rebuilds proposal objects every pass, but
  // proposals change rarely - keeping the array identity stable keeps the
  // per-section buckets (and the memoized cards holding them) stable too.
  const stablePendingProposals = useJsonStable(normalizedPendingProposals);
  const stableInlineProposals = useJsonStable(normalizedInlineProposals);
  const newSectionInlineProposals = useMemo(
    () =>
      stableInlineProposals.filter(
        (proposal) => proposal.draft.kind === "new-section",
      ),
    [stableInlineProposals],
  );
  const proposalsBySectionId = useMemo(() => {
    const buckets = new Map<string, Proposal[]>();
    for (const proposal of stableInlineProposals) {
      const bucket = buckets.get(proposal.sectionId) ?? [];
      bucket.push(proposal);
      buckets.set(proposal.sectionId, bucket);
    }
    return buckets;
  }, [stableInlineProposals]);
  const proposalBeforeTextById = useMemo(() => {
    const snapshots = new Map<string, string>();
    for (const entry of state.activity) {
      if (
        entry.proposalId &&
        entry.beforeText !== undefined &&
        !snapshots.has(entry.proposalId)
      ) {
        snapshots.set(entry.proposalId, entry.beforeText);
      }
    }
    return snapshots;
  }, [state.activity]);
  const reviewPillProposalCandidates = useMemo(() => {
    const sectionsById = new Map(
      state.sections.map((section) => [section.id, section]),
    );
    return stableInlineProposals.map((proposal) => {
      const target = sectionsById.get(proposal.sectionId);
      return {
        proposal,
        existingContent: target?.content ?? "",
        sectionName: target?.name ?? proposal.sectionName,
        canReview: proposal.status === "pending" && (
          state.creedType !== "shared" ||
          (state.shared?.myPermissions?.[proposal.sectionId] ?? "direct") ===
            "direct"),
      };
    });
  }, [
    stableInlineProposals,
    state.shared?.myPermissions,
    state.creedType,
    state.sections,
  ]);
  const reviewPillProposalsRef = useRef(reviewPillProposalCandidates);
  const reviewPillProposalsChanged =
    reviewPillProposalsRef.current.length !==
      reviewPillProposalCandidates.length ||
    reviewPillProposalCandidates.some((candidate, index) => {
      const previous = reviewPillProposalsRef.current[index];
      return (
        !previous ||
        previous.proposal !== candidate.proposal ||
        previous.existingContent !== candidate.existingContent ||
        previous.sectionName !== candidate.sectionName ||
        previous.canReview !== candidate.canReview
      );
    });
  if (reviewPillProposalsChanged) {
    reviewPillProposalsRef.current = reviewPillProposalCandidates;
  }
  const reviewPillProposals = reviewPillProposalsRef.current;
  const [activityOpen, setActivityOpen] = useState(false);
  // The activity rail animates its width, which resizes the editor column on
  // every frame. That re-fires the editor's section IntersectionObserver, and
  // each firing used to push `setActiveShellSection` through React - a full
  // shell re-render per animation frame, which is what made opening the rail
  // feel laggy. The active section cannot meaningfully change from a resize, so
  // observer-driven updates are held for the length of the animation and then
  // flushed once with the settled geometry.
  const railAnimatingRef = useRef(false);
  const flushActiveShellSectionRef = useRef<() => void>(() => {});

  useEffect(() => {
    if (!active) {
      railAnimatingRef.current = false;
      return;
    }
    railAnimatingRef.current = true;
    const timeoutId = window.setTimeout(() => {
      railAnimatingRef.current = false;
      flushActiveShellSectionRef.current();
    }, ACTIVITY_RAIL_SETTLE_MS);
    return () => window.clearTimeout(timeoutId);
  }, [active, activityOpen]);

  // Watching the state covers every open path at once (the A shortcut, the
  // header buttons, shell intents), so the "Check activity" getting-started
  // step can't be missed by a new entry point.
  useEffect(() => {
    if (active && activityOpen) markGettingStartedStep("activity");
  }, [active, activityOpen, markGettingStartedStep]);

  // Plain A toggles the activity sidebar (guarded like the shell's other
  // single-key shortcuts: K panel, M theme, S sidebar).
  // We skip when the user is typing inside an input / textarea / contenteditable
  // so basic editing still works.
  useEffect(() => {
    if (!active) return;

    function isEditable(target: EventTarget | null): boolean {
      if (!(target instanceof HTMLElement)) return false;
      const tag = target.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT")
        return true;
      if (target.isContentEditable) return true;
      return false;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key !== "a" && event.key !== "A") return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey)
        return;
      if (event.isComposing || event.repeat || event.defaultPrevented) return;
      if (isEditable(event.target)) return;
      event.preventDefault();
      setActivityOpen((current) => !current);
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [active]);
  const qualitySnapshot = useSyncExternalStore(
    subscribeQualityRunner,
    getQualityRunnerSnapshot,
    getQualityRunnerServerSnapshot,
  );
  const qualityReport = qualitySnapshot.report;
  const qualityLoading = qualitySnapshot.fullRunning;
  const qualitySectionLoading = useMemo(() => {
    const first = qualitySnapshot.sectionRunning.values().next();
    return first.done ? null : first.value;
  }, [qualitySnapshot.sectionRunning]);
  const qualityEnabled = useAiEnabled();
  const [analyzedFullFingerprint, setAnalyzedFullFingerprint] = useState<
    string | null
  >(null);
  const [analyzedSectionFingerprints, setAnalyzedSectionFingerprints] =
    useState<Record<string, string>>({});
  const analyzedQualityFingerprintRef = useRef<{
    full: string | null;
    sections: Record<string, string>;
  }>({ full: null, sections: {} });
  analyzedQualityFingerprintRef.current = {
    full: analyzedFullFingerprint,
    sections: analyzedSectionFingerprints,
  };
  const [composerOpen, setComposerOpen] = useState(false);
  const [composerRevealed, setComposerRevealed] = useState(false);
  const [composerName, setComposerName] = useState("");
  const [composerStarter, setComposerStarter] = useState<string | undefined>();
  const [insertAfterId, setInsertAfterId] = useState<string | null>(null);
  const [copiedAction, setCopiedAction] = useState<string | null>(null);
  const [importBusy, setImportBusy] = useState(false);

  const [fileViewMode, setFileViewMode] = useState<"editor" | "nexus" | "raw">(
    "editor",
  );
  const [nexusMounted, setNexusMounted] = useState(false);
  const [rawMounted, setRawMounted] = useState(false);
  const [viewChanging, setViewChanging] = useState(false);
  const rawEntrySource = useRef<string | null>(null);
  const changeFileView = useCallback(async (next: "editor" | "nexus" | "raw") => {
    setViewChanging(true);
    try {
      await flushEdits();
      const source = exportMarkdown();
      if (fileViewMode === "raw" && next === "editor" &&
          rawEntrySource.current !== null && source !== rawEntrySource.current &&
          sourceMayRenderDifferently(source)) {
        toast.warning("Some formatting may not display correctly.");
      }
      if (next === "raw") {
        rawEntrySource.current = source;
        setRawMounted(true);
      }
      setFileViewMode(next);
    } catch (error) {
      toast.error(String(error));
    } finally {
      setViewChanging(false);
    }
  }, [exportMarkdown, fileViewMode]);
  const toggleNexusView = useCallback(() => {
    setNexusMounted(true);
    void changeFileView(fileViewMode === "nexus" ? "editor" : "nexus");
  }, [changeFileView, fileViewMode]);
  const nexusViewStateRef = useRef<{
    creedId: string | undefined;
    viewState: NexusViewState | null;
  }>({
    creedId: state.creedId,
    viewState: null,
  });
  if (nexusViewStateRef.current.creedId !== state.creedId) {
    nexusViewStateRef.current = {
      creedId: state.creedId,
      viewState: null,
    };
  }
  const [renameSectionState, setRenameSectionState] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [deleteSectionState, setDeleteSectionState] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [clearFileOpen, setClearFileOpen] = useState(false);
  const [archiveAllOpen, setArchiveAllOpen] = useState(false);
  // "Edit" a pending proposal from the top ReviewPill: hand the section its
  // draft content to re-open (the section consumes it into its local editor
  // draft). Keyed by section id so only the target section picks it up.
  const [reopenDraft, setReopenDraft] = useState<{
    sectionId: string;
    content: string;
  } | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const editorScrollRef = useRef<HTMLDivElement | null>(null);
  const composerAreaRef = useRef<HTMLDivElement | null>(null);
  const qualityBaselineLoadedRef = useRef(false);
  // Tracks which Creed the quality state belongs to, so a Creed switch can drop
  // the previous Creed's report (the runner store is module-global).
  const qualityCreedRef = useRef(qualityScopeKey);
  const qualityFingerprintsByCreedRef = useRef(
    new Map<
      string,
      {
        full: string | null;
        sections: Record<string, string>;
      }
    >(),
  );
  const currentFullFingerprintRef = useRef<string | null>(null);
  const sectionFingerprintByIdRef = useRef<Map<string, string>>(new Map());
  // Latest sections, for the shared baseline re-fetch (keeps that effect off
  // the per-edit dependency churn while still reading the current file).
  const sectionsRef = useRef(state.sections);
  sectionsRef.current = state.sections;

  const nexusIcon = useAnimatedIconControls(80, undefined, 900);
  const sourceIcon = useAnimatedIconControls(80, undefined, 1500);
  const activityIcon = useAnimatedIconControls();
  const sectionQualityById = useMemo(
    () =>
      new Map(
        (qualityReport?.sections ?? []).map((section) => [
          section.sectionId,
          section,
        ]),
      ),
    [qualityReport],
  );
  const nexusScoresBySectionId = useMemo(
    () =>
      new Map(
        (qualityReport?.sections ?? []).map((section) => [
          section.sectionId,
          section.score,
        ]),
      ),
    [qualityReport],
  );
  const currentFullFingerprint = useMemo(
    () => state.sections.map(cachedSectionFingerprint).join("|"),
    [state.sections],
  );
  const sectionFingerprintById = useMemo(
    () =>
      new Map(
        state.sections.map(
          // WeakMap-cached: only sections whose object identity changed
          // (i.e. the one being edited) get re-stringified.
          (section) => [section.id, cachedSectionFingerprint(section)] as const,
        ),
      ),
    [state.sections],
  );
  const qualityActionAvailable =
    qualityEnabled && canRunQuality && state.sections.length > 0;

  useEffect(() => {
    currentFullFingerprintRef.current = currentFullFingerprint;
    sectionFingerprintByIdRef.current = sectionFingerprintById;
  }, [currentFullFingerprint, sectionFingerprintById]);

  // Record a read-only baseline payload into the report + drift fingerprints.
  // Shared by the initial baseline load and the shared sync so both stamp the
  // analyzed fingerprints identically. The server uses those hashes to skip
  // unchanged sections on a later run.
  const applyBaselinePayload = useCallback(
    (
      payload: Awaited<ReturnType<typeof runFullQuality>>,
      sectionsSnapshot: CreedSection[],
      fingerprintSnapshot: string,
    ) => {
      if (!payload.report) return;
      // The shared-report poll usually returns exactly what we already hold.
      // Keep the previous object when the payload is value-identical so the
      // 60s sync doesn't re-render the whole screen for nothing.
      const keepIfEqual = <T,>(previous: T, next: T): T =>
        previous !== next && JSON.stringify(previous) === JSON.stringify(next)
          ? previous
          : next;
      // setBaselineReport bails on identity, so handing back the previous
      // report object when the payload is value-identical makes it a no-op.
      setBaselineReport(
        keepIfEqual(getQualityRunnerSnapshot().report, payload.report),
      );
      setAnalyzedFullFingerprint(
        payload.current
          ? fingerprintSnapshot
          : `stored:${payload.storedContentHash ?? payload.report.contentHash}`,
      );
      const nextSectionFingerprints = Object.fromEntries(
        sectionsSnapshot.flatMap((section) => {
          const currentSectionFingerprint = qualitySectionFingerprint(section);
          const storedSectionHash = payload.storedSectionHashes?.[section.id];
          const currentSectionHash = payload.sectionHashes?.[section.id];
          const hasLegacySectionReport = payload.report?.sections.some(
            (sectionReport) => sectionReport.sectionId === section.id,
          );

          if (
            payload.current ||
            (storedSectionHash && storedSectionHash === currentSectionHash)
          ) {
            return [[section.id, currentSectionFingerprint] as const];
          }
          if (storedSectionHash) {
            return [[section.id, `stored:${storedSectionHash}`] as const];
          }
          if (hasLegacySectionReport) {
            return [
              [
                section.id,
                `stored:legacy:${payload.storedContentHash ?? payload.report?.contentHash ?? "unknown"}:${section.id}`,
              ] as const,
            ];
          }
          return [];
        }),
      );
      setAnalyzedSectionFingerprints((previous) =>
        keepIfEqual(previous, nextSectionFingerprints),
      );
    },
    [],
  );
  // Stable dispatch table for the memoized section cards: identity never
  // changes (safe to hold in a memoized card across skipped renders), while
  // calls always run the freshest closures via the ref.
  const sectionHandlersImpl = {
    reopenConsumed: () => setReopenDraft(null),
    submitProposal: (sectionId: string, content: string) =>
      fileProposalEdit(sectionId, content),
    toggleLock: (sectionId: string) => toggleSectionLock(sectionId),
    refreshQuality: (section: CreedSection) =>
      void refreshSectionQuality(section),
    acceptProposal: (proposalId: string) => void acceptProposal(proposalId),
    rejectProposal: (proposalId: string) => rejectProposal(proposalId),
    dismissProposal: (proposalId: string) => dismissProposal(proposalId),
    withdrawProposal: (proposalId: string) => withdrawProposal(proposalId),
    changeRichText: (sectionId: string, content: string) =>
      updateRichTextSection(sectionId, content),
    localSaveStart: (creedId: string) => startLocalSave(creedId),
    localSaveComplete: (creedId: string, savedAt: number | null) =>
      finishLocalSave(creedId, savedAt),
    rename: (sectionId: string, name: string) =>
      setRenameSectionState({ id: sectionId, name }),
    copy: (section: CreedSection) =>
      void navigator.clipboard.writeText(sectionToMarkdown(section).trim()),
    setAccent: (sectionId: string, accent: AccentKey) =>
      setSectionAccent(sectionId, accent),
    // Defer so the section menu closes before the dialog opens, letting the
    // dialog play its enter animation.
    requestDelete: (sectionId: string, name: string) =>
      void window.setTimeout(
        () => setDeleteSectionState({ id: sectionId, name }),
        0,
      ),
    archive: (sectionId: string) => {
      archiveSection(sectionId);
    },
    addSectionAfter: (sectionId: string) => openComposerAndReveal(sectionId),
    setCollapsed: (sectionId: string, collapsed: boolean) =>
      setSectionCollapsed(sectionId, collapsed),
    dragActiveChange: (active: boolean, _sectionId: string) =>
      active ? beginReorder() : finishReorder(),
    openSection: (sectionId: string) => handleSectionSelect(sectionId),
  };
  const sectionHandlersRef = useRef(sectionHandlersImpl);
  sectionHandlersRef.current = sectionHandlersImpl;
  const sectionHandlers = useMemo<SectionCardHandlers>(() => {
    const proxies = {} as Record<string, (...args: unknown[]) => unknown>;
    for (const key of Object.keys(sectionHandlersRef.current)) {
      proxies[key] = (...args: unknown[]) =>
        (
          sectionHandlersRef.current[
            key as keyof typeof sectionHandlersRef.current
          ] as (...a: unknown[]) => unknown
        )(...args);
    }
    return proxies as unknown as SectionCardHandlers;
  }, []);

  // Pull is allowed any time GitHub is configured - including when the
  // local file is "local-ahead." That way, as soon as you make a local
  // edit, you can still click Pull to refresh against the latest remote
  // commit. The pull-preview API always fetches fresh from the GitHub
  // contents endpoint (no caching - see `githubRequest` in lib/github.ts)
  // so the dialog shows the true current state of the remote.

  useEffect(() => {
    if (active && composerOpen && composerRevealed) {
      inputRef.current?.focus({ preventScroll: true });
    }
  }, [active, composerOpen, composerRevealed]);

  // Quality state survives navigation, but it must remain scoped to one Creed.
  // Save and restore the analyzed fingerprints alongside the runner's scoped
  // report so returning to a Creed does not mark every unchanged section stale.
  useEffect(() => {
    const previousScopeKey = qualityCreedRef.current;
    setQualityRunnerScope(qualityScopeKey);
    if (previousScopeKey === qualityScopeKey) return;

    qualityFingerprintsByCreedRef.current.set(
      previousScopeKey,
      analyzedQualityFingerprintRef.current,
    );
    qualityCreedRef.current = qualityScopeKey;

    const cached = qualityFingerprintsByCreedRef.current.get(qualityScopeKey);
    qualityBaselineLoadedRef.current = Boolean(cached);
    setAnalyzedFullFingerprint(cached?.full ?? null);
    setAnalyzedSectionFingerprints(cached?.sections ?? {});
  }, [qualityScopeKey]);

  useEffect(() => {
    if (
      !active ||
      !qualityEnabled ||
      state.sections.length === 0 ||
      qualityBaselineLoadedRef.current
    ) {
      return;
    }

    // If a force refresh for this Creed and fingerprint is still in flight,
    // its result will carry the matching baseline when it lands.
    if (getInFlightFull(qualityScopeKey, `full:${currentFullFingerprint}`)) {
      qualityBaselineLoadedRef.current = true;
      return;
    }

    let cancelled = false;
    const sectionsSnapshot = state.sections;
    const fingerprintSnapshot = currentFullFingerprint;

    async function loadQualityBaseline() {
      try {
        qualityBaselineLoadedRef.current = true;
        // Reuse the runner so a navigate-away + return reattaches to any
        // in-flight baseline read instead of issuing a duplicate request.
        const payload = await runFullQuality({
          scopeKey: qualityScopeKey,
          sections: sectionsSnapshot,
          fingerprint: `baseline:${fingerprintSnapshot}`,
          readOnly: true,
        });

        if (cancelled || !payload.report) {
          return;
        }

        applyBaselinePayload(payload, sectionsSnapshot, fingerprintSnapshot);
      } catch {
        if (!cancelled) {
          qualityBaselineLoadedRef.current = false;
        }
      }
    }

    void loadQualityBaseline();

    return () => {
      cancelled = true;
    };
  }, [
    active,
    currentFullFingerprint,
    qualityEnabled,
    qualityScopeKey,
    state.sections,
    applyBaselinePayload,
  ]);

  // Cross-tab announcements provide the fast path. Focus, visibility, and a
  // bounded interval recover when the browser cannot deliver that signal.
  useEffect(() => {
    if (!active || !qualityEnabled) return;
    let cancelled = false;
    async function syncQualityReport() {
      try {
        const payload = await runFullQuality({
          scopeKey: qualityScopeKey,
          sections: sectionsRef.current,
          fingerprint: `baseline:${currentFullFingerprintRef.current ?? ""}`,
          readOnly: true,
        });
        if (!cancelled) {
          applyBaselinePayload(
            payload,
            sectionsRef.current,
            currentFullFingerprintRef.current ?? "",
          );
        }
      } catch {
        // A transient read failure just leaves the current report in place.
      }
    }
    const interval = window.setInterval(() => {
      if (document.visibilityState !== "visible") return;
      void syncQualityReport();
    }, 300_000);
    const onFocus = () => void syncQualityReport();
    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") void syncQualityReport();
    };
    const unsubscribeAnnouncements = subscribeQualityRunAnnouncements(
      qualityScopeKey,
      () => void syncQualityReport(),
    );
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
      unsubscribeAnnouncements();
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [active, qualityEnabled, qualityScopeKey, applyBaselinePayload]);

  async function refreshFullQuality() {
    if (
      !qualityEnabled ||
      !canRunQuality ||
      qualityLoading ||
      state.sections.length === 0
    ) {
      return;
    }

    const sectionFingerprints = Object.fromEntries(
      state.sections.map((section) => [
        section.id,
        qualitySectionFingerprint(section),
      ]),
    );

    // Members can only analyse sections they have propose or direct access to.
    const myPermissions = state.shared?.myPermissions;
    const isMember = state.creedType === "shared" && !isSharedManager;
    const sectionsToSend = isMember
      ? state.sections.filter((section) => {
          const permission = resolveSectionPermission(
            "member",
            myPermissions?.[section.id],
          );
          return canProposeToSection(permission);
        })
      : state.sections;

    if (sectionsToSend.length === 0) {
      return;
    }

    try {
      // One whole-file pass. The server re-scores only the sections that
      // drifted since the last analysis, carries the rest forward, and
      // recomputes the overall - so a single call does what the old
      // stale-section fan-out did, without the redundant per-section requests.
      const fingerprint =
        currentFullFingerprintRef.current ?? currentFullFingerprint;
      const payload = await runFullQuality({
        scopeKey: qualityScopeKey,
        sections: sectionsToSend,
        fingerprint: `full:${fingerprint}`,
        force: true,
      });

      if (payload.report && qualityCreedRef.current === qualityScopeKey) {
        setAnalyzedFullFingerprint(fingerprint);
        setAnalyzedSectionFingerprints(
          Object.fromEntries(
            sectionsToSend.map((section) => [
              section.id,
              sectionFingerprintByIdRef.current.get(section.id) ??
                sectionFingerprints[section.id],
            ]),
          ),
        );
        markGettingStartedStep("analysis");
      }
    } catch {
      // Full-analysis failures surface as a toast via the shell QualityToasts
      // subscriber.
    }
  }

  async function refreshSectionQuality(section: CreedSection) {
    if (!qualityEnabled || qualitySectionLoading === section.id) {
      return;
    }

    // Members can only analyse sections they have propose or direct access to.
    const myPermissions = state.shared?.myPermissions;
    const isMember = state.creedType === "shared" && !isSharedManager;
    if (isMember) {
      const permission = resolveSectionPermission(
        "member",
        myPermissions?.[section.id],
      );
      if (!canProposeToSection(permission)) {
        return;
      }
    }

    try {
      const sectionFingerprint =
        sectionFingerprintByIdRef.current.get(section.id) ??
        qualitySectionFingerprint(section);
      const nextSectionReport = await runSectionQuality({
        scopeKey: qualityScopeKey,
        sections: state.sections,
        section,
        fingerprint: sectionFingerprint,
      });
      if (nextSectionReport && qualityCreedRef.current === qualityScopeKey) {
        setAnalyzedSectionFingerprints((current) => ({
          ...current,
          [section.id]: sectionFingerprint,
        }));
        markGettingStartedStep("analysis");
      }
    } catch {
      // The failure surfaces as a toast via the shell QualityToasts subscriber
      // (the runner records the outcome).
    }
  }

  const openComposer = useCallback((afterSectionId?: string) => {
    setInsertAfterId(afterSectionId ?? null);
    setComposerOpen(true);
    setComposerName("");
    setComposerStarter(undefined);
  }, []);

  const scrollComposerIntoView = useCallback(
    (behavior: ScrollBehavior = "smooth") => {
      const container = editorScrollRef.current;
      const composerArea = composerAreaRef.current;

      if (!container || !composerArea) {
        return false;
      }

      scrollFileElementIntoView(container, composerArea, behavior);

      return true;
    },
    [],
  );

  const openComposerAndReveal = useCallback(
    (afterSectionId?: string) => {
      setFileViewMode("editor");
      openComposer(afterSectionId);
      setComposerRevealed(true);
      window.requestAnimationFrame(() => {
        scrollComposerIntoView("smooth");
      });
    },
    [openComposer, scrollComposerIntoView],
  );

  function submitComposer() {
    const trimmedName = composerName.trim();
    if (!trimmedName) {
      return;
    }

    const occupiedSectionNames = [
      ...state.sections.map((section) => section.name),
      ...normalizedPendingProposals.flatMap((proposal) =>
        proposal.draft.kind === "new-section" ? [proposal.draft.name] : [],
      ),
    ];
    if (hasSectionName(occupiedSectionNames, trimmedName)) {
      toast.error(`A section named "${trimmedName}" already exists.`);
      return;
    }

    if (insertAfterId) {
      addSectionAfter(insertAfterId, trimmedName, composerStarter);
    } else {
      addSection(trimmedName, composerStarter);
    }

    setComposerOpen(false);
    setComposerRevealed(false);
    setComposerName("");
    setComposerStarter(undefined);
    setInsertAfterId(null);
  }

  async function copyValue(key: string, value: string) {
    await navigator.clipboard.writeText(value);
    setCopiedAction(key);
    window.setTimeout(() => setCopiedAction(null), 1400);
  }

  function markActionComplete(key: string) {
    setCopiedAction(key);
    window.setTimeout(() => setCopiedAction(null), 1400);
  }

  const setActiveShellSection = useCreedShellActiveSection();
  const scrollLockRef = useRef<{ highlightId: string; until: number } | null>(
    null,
  );
  const revealFrameRef = useRef<number | null>(null);

  const revealEditorTarget = useCallback(
    (target: FileRevealTarget, behavior: ScrollBehavior = "smooth") => {
      setFileViewMode("editor");
      if (target.locate.type === "section") {
        setSectionCollapsed(target.locate.id, false);
      }

      if (revealFrameRef.current !== null) {
        window.cancelAnimationFrame(revealFrameRef.current);
        revealFrameRef.current = null;
      }

      let attempts = 0;
      const tryReveal = () => {
        const container = editorScrollRef.current;
        const element = container
          ? findFileRevealElement(container, target.locate)
          : null;

        if (container && element) {
          scrollFileElementIntoView(container, element, behavior);
          scrollLockRef.current = {
            highlightId: target.highlightId,
            until: Date.now() + 1200,
          };
          setActiveShellSection(target.highlightId);
          revealFrameRef.current = null;
          return;
        }

        attempts += 1;
        if (attempts < 32) {
          revealFrameRef.current = window.requestAnimationFrame(tryReveal);
        } else {
          revealFrameRef.current = null;
        }
      };

      revealFrameRef.current = window.requestAnimationFrame(tryReveal);
    },
    [setActiveShellSection, setSectionCollapsed],
  );

  useEffect(() => {
    if (!active && revealFrameRef.current !== null) {
      window.cancelAnimationFrame(revealFrameRef.current);
      revealFrameRef.current = null;
    }
    return () => {
      if (revealFrameRef.current !== null) {
        window.cancelAnimationFrame(revealFrameRef.current);
      }
    };
  }, [active]);

  const handleSectionSelect = useCallback(
    (sectionId: string) => {
      revealEditorTarget(sectionReveal(sectionId));
    },
    [revealEditorTarget],
  );

  const preserveNexusViewState = useCallback(
    (viewState: NexusViewState) => {
      if (nexusViewStateRef.current.creedId === state.creedId) {
        nexusViewStateRef.current.viewState = viewState;
      }
    },
    [state.creedId],
  );

  const revealProposalOrSection = useCallback(
    (proposalId: string) => {
      const proposal = normalizedPendingProposals.find(
        (item) => item.id === proposalId,
      );
      if (!proposal) {
        revealEditorTarget({
          highlightId: proposalId,
          locate: { type: "proposal", id: proposalId },
        });
        return;
      }
      if (proposal.draft.kind !== "new-section" && proposal.sectionId) {
        setSectionCollapsed(proposal.sectionId, false);
      }
      revealEditorTarget(proposalReveal(proposal));
    },
    [normalizedPendingProposals, revealEditorTarget, setSectionCollapsed],
  );
  const acceptAllReviewPillProposals = useCallback(() => {
    acceptProposals(stablePendingProposals.map((proposal) => proposal.id));
  }, [acceptProposals, stablePendingProposals]);
  const rejectAllReviewPillProposals = useCallback(() => {
    stablePendingProposals.forEach((proposal) => rejectProposal(proposal.id));
  }, [rejectProposal, stablePendingProposals]);
  const acceptOneReviewPillProposal = useCallback(
    (proposalId: string) => {
      void acceptProposal(proposalId);
    },
    [acceptProposal],
  );
  const rejectOneReviewPillProposal = useCallback(
    (proposalId: string) => rejectProposal(proposalId),
    [rejectProposal],
  );
  const deleteOneReviewPillProposal = useCallback(
    (proposalId: string) => withdrawProposal(proposalId),
    [withdrawProposal],
  );
  const editOneReviewPillProposal = useCallback(
    (proposal: Proposal) => {
      const html =
        proposal.draft.kind === "rich-text"
          ? (proposal.draft.contentHtml ?? "")
          : "";
      setReopenDraft({
        sectionId: proposal.sectionId,
        content: html,
      });
      withdrawProposal(proposal.id);
      revealEditorTarget(sectionReveal(proposal.sectionId));
    },
    [revealEditorTarget, withdrawProposal],
  );
  const jumpToReviewPillProposal = useCallback(
    (proposal: Proposal) => {
      revealProposalOrSection(proposal.id);
    },
    [revealProposalOrSection],
  );

  const handleProposalSelect = useCallback(
    (proposalId: string) => {
      revealProposalOrSection(proposalId);
    },
    [revealProposalOrSection],
  );

  // Panel/shell can open the push review and the activity sidebar. The push
  // opener goes through a ref because handleOpenPushReview is re-created every
  // render; the ref keeps shellFileActions stable so the shell registration
  // effect doesn't churn.

  const shellFileActions = useMemo(
    () => ({
      // Members can't create sections, so the shell/command "add section" entry
      // is a no-op for them (the affordance is also hidden in the UI).
      onAddSection: canCreateSections
        ? () => openComposerAndReveal()
        : undefined,
      onSectionSelect: handleSectionSelect,
      onProposalSelect: handleProposalSelect,
      onSetActivityOpen: (open: boolean) => setActivityOpen(open),
    }),
    [
      handleSectionSelect,
      handleProposalSelect,
      openComposerAndReveal,
      canCreateSections,
    ],
  );
  useCreedShellFileActions(shellFileActions);

  // Re-run the scroll tracker when the count of pending new-section
  // proposals changes so newly-mounted `[data-proposal-id]` previews
  // get picked up. Extracted from the deps array to satisfy ESLint's
  // "complex expression in dependency array" rule.
  const pendingNewSectionProposalCount = useMemo(
    () =>
      state.proposals.filter(
        (p) => p.status === "pending" && p.draft.kind === "new-section",
      ).length,
    [state.proposals],
  );

  useEffect(() => {
    if (!active) {
      setActiveShellSection(null);
      return;
    }
    if (fileViewMode !== "editor") {
      setActiveShellSection(null);
      return;
    }

    const container = editorScrollRef.current;
    if (!container) return;

    // Sidebar rows are either a section or a free-standing new-section
    // preview. In-section proposal cards are reveal targets only, not
    // scroll-follow targets, so they are left out of this query.
    const elements = Array.from(
      container.querySelectorAll<HTMLElement>(
        "[data-section-id], [data-proposal-id]",
      ),
    ).filter(
      (element) =>
        Boolean(element.dataset.sectionId) ||
        !element.parentElement?.closest("[data-section-id]"),
    );
    if (elements.length === 0) return;

    const targetIdByElement = new Map(
      elements.map((element) => [
        element,
        element.dataset.sectionId ?? element.dataset.proposalId ?? null,
      ]),
    );
    const visibleTargets = new Map<HTMLElement, IntersectionObserverEntry>();

    function update() {
      // Held while the activity rail animates - the flush below re-runs this
      // once the geometry has settled.
      if (railAnimatingRef.current) return;

      const bestEntry = Array.from(visibleTargets.values()).sort(
        (left, right) =>
          Math.abs(left.boundingClientRect.top) -
          Math.abs(right.boundingClientRect.top),
      )[0];
      const bestId = bestEntry
        ? (targetIdByElement.get(bestEntry.target as HTMLElement) ?? null)
        : null;

      const lock = scrollLockRef.current;
      if (lock) {
        if (Date.now() > lock.until || bestId === lock.highlightId) {
          scrollLockRef.current = null;
        } else {
          return;
        }
      }

      setActiveShellSection(bestId);
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting)
            visibleTargets.set(entry.target as HTMLElement, entry);
          else visibleTargets.delete(entry.target as HTMLElement);
        }
        update();
      },
      {
        root: container,
        rootMargin: "-128px 0px -65% 0px",
        threshold: [0, 0.01, 0.5, 1],
      },
    );
    for (const element of elements) observer.observe(element);
    flushActiveShellSectionRef.current = update;

    return () => {
      observer.disconnect();
      flushActiveShellSectionRef.current = () => {};
      setActiveShellSection(null);
    };
  }, [
    active,
    fileViewMode,
    setActiveShellSection,
    state.sections.length,
    pendingNewSectionProposalCount,
  ]);

  useEffect(() => {
    if (!active || typeof window === "undefined") {
      return;
    }

    const rawIntent = window.sessionStorage.getItem(FILE_NAV_INTENT_KEY);
    if (!rawIntent) {
      return;
    }

    let cancelled = false;
    let timeoutId = 0;

    timeoutId = window.setTimeout(() => {
      if (cancelled) {
        return;
      }

      try {
        const intent = JSON.parse(rawIntent) as
          | { type: "section"; sectionId: string }
          | { type: "compose" }
          | { type: "proposal"; proposalId: string }
          | { type: "activity"; open: boolean };

        if (intent.type === "activity") {
          window.sessionStorage.removeItem(FILE_NAV_INTENT_KEY);
          setActivityOpen(intent.open);
          return;
        }

        if (intent.type === "compose") {
          window.sessionStorage.removeItem(FILE_NAV_INTENT_KEY);
          if (!cancelled) {
            openComposerAndReveal();
          }
          return;
        }

        if (intent.type === "section") {
          window.sessionStorage.removeItem(FILE_NAV_INTENT_KEY);
          revealEditorTarget(sectionReveal(intent.sectionId));
          return;
        }

        if (intent.type === "proposal") {
          window.sessionStorage.removeItem(FILE_NAV_INTENT_KEY);
          revealProposalOrSection(intent.proposalId);
        }
      } catch {
        window.sessionStorage.removeItem(FILE_NAV_INTENT_KEY);
      }
    }, 140);

    return () => {
      cancelled = true;
      window.clearTimeout(timeoutId);
    };
  }, [
    active,
    openComposerAndReveal,
    revealEditorTarget,
    revealProposalOrSection,
  ]);

  return (
    <>
      <div className="relative flex h-full min-h-0 bg-[var(--creed-surface)] transition-colors duration-200">
        <div className="creed-file-card min-w-0 flex-1 overflow-hidden rounded-2xl border border-[var(--creed-border)]">
          <div
            ref={editorScrollRef}
            className="h-full overflow-y-auto overscroll-contain creed-scrollbar"
          >
            <div className={cn(
              FILE_COLUMN_CLASS,
              fileViewMode === "nexus"
                ? "h-full max-w-none p-0 md:p-0 xl:p-0"
                : "pt-5 pb-28 md:pb-10",
            )}>
              <WindowToolbar active={active}>
                <FileToolbar>
                  <div className="flex min-w-0 items-center gap-3">
                    <CreedSwitcher />
                    <SaveStatus />
                  </div>

                  <div className="creed-toolbar-actions flex shrink-0 items-center gap-2">
                    <div className="inline-flex h-7 items-center gap-1">
                      <OverallQualityPopover
                        report={qualityReport}
                        loading={qualityLoading}
                        actionAvailable={qualityActionAvailable}
                        onAction={() => void refreshFullQuality()}
                      >
                        <button
                          type="button"
                          className="inline-flex h-7 w-7 items-center justify-center rounded-full text-[var(--creed-text-primary)] transition-colors duration-150 hover:bg-[var(--creed-surface-raised)] data-[state=open]:bg-[var(--creed-surface-raised)]"
                          aria-label={
                            qualityActionAvailable
                              ? "Run Creed quality analysis"
                              : "Show Creed quality"
                          }
                        >
                          <QualityRing
                            score={qualityReport?.overall.score ?? 0}
                            color="#2563EB"
                            loading={qualityLoading}
                            actionable={qualityActionAvailable}
                          />
                        </button>
                      </OverallQualityPopover>
                    </div>

                    {/* Desktop: labelled pill. Mobile: icon-only circle that
                        matches the Activity button beside it. */}
                    <Button
                      variant="outline"
                      size="icon-sm"
                      aria-label="Nexus"
                      aria-pressed={fileViewMode === "nexus"}
                      style={{
                        borderRadius: 13,
                        height: 32,
                        width: 32,
                        minHeight: 32,
                        minWidth: 32,
                      }}
                      className={cn(
                        FILE_HEADER_OUTLINE_MOBILE_FOCUS_CLASS,
                        "translate-y-0! border-[var(--creed-border)] bg-[var(--creed-surface)] md:hidden",
                        fileViewMode === "nexus" &&
                          "bg-[var(--creed-surface-raised)]! text-[var(--creed-text-primary)] hover:bg-[var(--creed-surface-raised)]! dark:bg-input/50! dark:hover:bg-input/50!",
                      )}
                      onClick={toggleNexusView}
                    >
                      <WaypointsIcon
                        ref={nexusIcon.iconRef}
                        size={14}
                        className="inline-flex h-3.5 w-3.5 shrink-0 items-center justify-center leading-none"
                      />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      aria-pressed={fileViewMode === "nexus"}
                      style={{ borderRadius: 13, height: 32, minHeight: 32 }}
                      className={cn(
                        "translate-y-0! hidden border-[var(--creed-border)] bg-[var(--creed-surface)] px-3 text-[12px] md:inline-flex md:px-3.5 md:text-sm",
                        fileViewMode === "nexus" &&
                          "bg-[var(--creed-surface-raised)]! text-[var(--creed-text-primary)] hover:bg-[var(--creed-surface-raised)]! dark:bg-input/50! dark:hover:bg-input/50!",
                      )}
                      onMouseEnter={nexusIcon.start}
                      onMouseLeave={nexusIcon.settle}
                      onClick={toggleNexusView}
                    >
                      <WaypointsIcon
                        ref={nexusIcon.iconRef}
                        size={14}
                        className="inline-flex h-3.5 w-3.5 shrink-0 items-center justify-center leading-none"
                      />
                      Nexus
                    </Button>

                    <Button
                      variant="outline"
                      size="icon-sm"
                      aria-label="Activity"
                      style={{
                        borderRadius: 13,
                        height: 32,
                        width: 32,
                        minHeight: 32,
                        minWidth: 32,
                      }}
                      className={cn(
                        FILE_HEADER_OUTLINE_MOBILE_FOCUS_CLASS,
                        "border-[var(--creed-border)] bg-[var(--creed-surface)] md:hidden",
                        activityOpen &&
                          "bg-[var(--creed-surface-raised)]! hover:bg-[var(--creed-surface-raised)]! dark:bg-input/50! dark:hover:bg-input/50!",
                      )}
                      onClick={() => {
                        setActivityOpen((current) => !current);
                      }}
                    >
                      <HistoryIcon
                        ref={activityIcon.iconRef}
                        size={14}
                        className="inline-flex h-3.5 w-3.5 shrink-0 items-center justify-center overflow-visible leading-none"
                      />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      style={{ borderRadius: 13, height: 32, minHeight: 32 }}
                      className={cn(
                        "hidden border-[var(--creed-border)] bg-[var(--creed-surface)] px-3 text-[12px] md:inline-flex md:px-3.5 md:text-sm",
                        activityOpen &&
                          "bg-[var(--creed-surface-raised)]! hover:bg-[var(--creed-surface-raised)]! dark:bg-input/50! dark:hover:bg-input/50!",
                      )}
                      onMouseEnter={activityIcon.start}
                      onMouseLeave={activityIcon.settle}
                      onClick={() => {
                        setActivityOpen((current) => !current);
                      }}
                    >
                      <HistoryIcon
                        ref={activityIcon.iconRef}
                        size={14}
                        className="inline-flex h-3.5 w-3.5 shrink-0 items-center justify-center overflow-visible leading-none"
                      />
                      Activity
                    </Button>

                    <Button
                      variant="outline"
                      size="sm"
                      disabled={viewChanging || !state.creedId}
                      aria-label={fileViewMode === "raw" ? "Switch to Styled" : "Switch to Raw"}
                      aria-pressed={fileViewMode === "raw"}
                      style={{ borderRadius: 13, height: 32, minHeight: 32 }}
                      className={cn(
                        "border-[var(--creed-border)] bg-[var(--creed-surface)] px-3 text-sm",
                        fileViewMode === "raw" && "bg-[var(--creed-surface-raised)]!",
                      )}
                      onMouseEnter={sourceIcon.start}
                      onMouseLeave={sourceIcon.settle}
                      onFocus={sourceIcon.start}
                      onBlur={sourceIcon.settle}
                      onClick={() => void changeFileView(fileViewMode === "raw" ? "editor" : "raw")}
                    >
                      <ScanTextIcon ref={sourceIcon.iconRef} size={14} className="h-3.5 w-3.5 shrink-0" />
                      <SwapLabel value={fileViewMode === "raw" ? "Raw" : "Styled"} options={["Raw", "Styled"]} />
                    </Button>

                    <HeaderLockButton
                      locked={state.locked}
                      onToggle={toggleLock}
                    />

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="outline"
                          size="icon-sm"
                          style={{
                            borderRadius: 13,
                            height: 32,
                            width: 32,
                            minHeight: 32,
                            minWidth: 32,
                          }}
                          className={cn(
                            FILE_HEADER_OUTLINE_MOBILE_FOCUS_CLASS,
                            "border-[var(--creed-border)] bg-[var(--creed-surface)] aria-expanded:bg-[var(--creed-surface-raised)]! aria-expanded:hover:bg-[var(--creed-surface-raised)]! dark:aria-expanded:bg-input/50! dark:aria-expanded:hover:bg-input/50!",
                          )}
                        >
                          <Ellipsis className="h-3.5 w-3.5" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent
                        align="end"
                        className={DROPDOWN_CONTENT_CLASS}
                      >
                        <AnimatedMenuIconItem
                          icon={FolderUpIcon}
                          showIcon={!importBusy && copiedAction !== "import"}
                          className="text-sm"
                          disabled={importBusy}
                          onSelect={(event) => {
                            event.preventDefault();
                            setImportBusy(true);
                            void pick(false)
                              .then((opened) => {
                                if (opened) markActionComplete("import");
                              })
                              .catch((error: unknown) =>
                                toast.error(String(error)),
                              )
                              .finally(() => setImportBusy(false));
                          }}
                        >
                          {importBusy ? (
                            <DelayedSpinner pending className="h-3.5 w-3.5 animate-spin" />
                          ) : copiedAction === "import" ? (
                            <AnimatedCheckmark />
                          ) : null}
                          <SwapLabel
                            value={
                              importBusy
                                ? "Importing"
                                : copiedAction === "import"
                                  ? "Imported"
                                  : "Import"
                            }
                            options={["Import", "Importing", "Imported"]}
                          />
                        </AnimatedMenuIconItem>
                        <AnimatedMenuIconItem
                          icon={DownloadIcon}
                          showIcon={copiedAction !== "download"}
                          className="text-sm"
                          onSelect={(event) => {
                            event.preventDefault();
                            downloadFile(
                              creedMarkdownFilename(activeCreedName),
                              exportMarkdown,
                              "text/markdown;charset=utf-8",
                            );
                          }}
                        >
                          {copiedAction === "download" ? (
                            <AnimatedCheckmark />
                          ) : null}
                          <SwapLabel
                            value={
                              copiedAction === "download"
                                ? "Exported"
                                : "Export"
                            }
                            options={["Export", "Exported"]}
                          />
                        </AnimatedMenuIconItem>
                        <AnimatedMenuIconItem
                          icon={CopyIcon}
                          showIcon={copiedAction !== "copy"}
                          className="text-sm"
                          onSelect={(event) => {
                            event.preventDefault();
                            void copyValue("copy", exportMarkdown());
                          }}
                        >
                          {copiedAction === "copy" ? (
                            <AnimatedCheckmark />
                          ) : null}
                          <SwapLabel
                            value={copiedAction === "copy" ? "Copied" : "Copy"}
                            options={["Copy", "Copied"]}
                          />
                        </AnimatedMenuIconItem>
                        {state.creedType !== "shared" || isSharedManager ? (
                          <>
                            <DropdownMenuSeparator />
                            <AnimatedMenuIconItem
                              icon={ArchiveIcon}
                              className="text-sm"
                              onSelect={() => {
                                window.setTimeout(
                                  () => setArchiveAllOpen(true),
                                  0,
                                );
                              }}
                            >
                              Archive
                            </AnimatedMenuIconItem>
                          </>
                        ) : null}
                        <AnimatedMenuIconItem
                          icon={ShredderIcon}
                          className="mt-1 bg-[#DC2626] text-sm text-white hover:bg-[#B91C1C] hover:text-white focus:bg-[#B91C1C] focus:text-white data-[highlighted]:bg-[#B91C1C] data-[highlighted]:text-white not-data-[variant=destructive]:focus:**:text-white"
                          onSelect={() => {
                            // Let the menu close first, then open the dialog on
                            // the next tick so its enter animation plays (two
                            // Radix overlays in the same tick skips it).
                            window.setTimeout(() => setClearFileOpen(true), 0);
                          }}
                        >
                          Clear
                        </AnimatedMenuIconItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </FileToolbar>
              </WindowToolbar>
              <FloatingReview
                key={state.creedId}
                scrollRef={editorScrollRef}
                active={active && normalizedPendingProposals.length > 0}
              >
                {normalizedPendingProposals.length > 0 ? (
                  <ReviewPill
                    embedded
                    proposals={reviewPillProposals}
                    onAcceptAll={acceptAllReviewPillProposals}
                    onRejectAll={rejectAllReviewPillProposals}
                    onAcceptOne={acceptOneReviewPillProposal}
                    onRejectOne={rejectOneReviewPillProposal}
                    onDeleteOne={deleteOneReviewPillProposal}
                    onEditOne={editOneReviewPillProposal}
                    onJumpToProposal={jumpToReviewPillProposal}
                  />
                ) : null}
              </FloatingReview>

              {nexusMounted ? (
                <div
                  className={cn(
                    fileViewMode === "nexus" && "absolute inset-0",
                    fileViewMode !== "nexus" &&
                      "pointer-events-none invisible absolute top-0 right-4 left-4 select-none md:right-12 md:left-12 xl:right-16 xl:left-16",
                  )}
                  aria-hidden={fileViewMode !== "nexus"}
                >
                  <NexusView
                    key={`nexus-${state.creedId ?? "unscoped"}`}
                    sections={visibleSections}
                    scoresBySectionId={nexusScoresBySectionId}
                    active={active && fileViewMode === "nexus"}
                    className={fileViewMode === "nexus" ? "h-full! min-h-0!" : undefined}
                    initialViewState={nexusViewStateRef.current.viewState}
                    onViewStateChange={preserveNexusViewState}
                  />
                </div>
              ) : null}
              {rawMounted && state.creedId ? (
                <RawSourceEditor
                  key={state.creedId}
                  documentId={state.creedId}
                  active={fileViewMode === "raw"}
                  locked={state.locked}
                />
              ) : null}
              <div
                className={cn(fileViewMode !== "editor" && "hidden")}
                aria-hidden={fileViewMode !== "editor"}
              >
                {state.sourcePreamble?.trim() ? (
                  <div className="mb-8">
                    <RichAnswer markdown={state.sourcePreamble} />
                  </div>
                ) : null}
                <Reorder.Group
                  axis="y"
                  values={reorderOrder ?? canonicalVisibleOrder}
                  onReorder={previewReorder}
                  className={FILE_SECTION_STACK_CLASS}
                >
                  {orderedVisibleSections.map((section, reorderPosition) => {
                    const quality = sectionQualityById.get(section.id);

                    const isOverridden = state.sectionLockOverrides.includes(
                      section.id,
                    );
                    const baseLocked = isOverridden
                      ? !state.locked
                      : state.locked;
                    // Shared mode: a member with Read-only access on this
                    // section cannot edit it. Direct/Proposal-only stay
                    // editable (Proposal-only edits are filed as proposals
                    // by the provider).
                    const myPerm =
                      state.creedType === "shared"
                        ? (state.shared?.myPermissions?.[section.id] ??
                          "direct")
                        : "direct";
                    const sharedReadOnly =
                      state.creedType === "shared" && myPerm === "read-only";
                    const sectionLocked = baseLocked || sharedReadOnly;
                    // A shared member with Proposal-only edits by hand into a local
                    // draft, then submits it as a proposal (no autosave).
                    const proposeMode =
                      state.creedType === "shared" &&
                      myPerm === "propose" &&
                      !sectionLocked;
                    // Who may accept/reject proposals on this section: owner/admin
                    // (always "direct") and Direct-edit members. Proposal-only
                    // members see proposals preview-only.
                    const canReview =
                      state.creedType !== "shared" || myPerm === "direct";
                    // A member's per-section read-only. Drives the "look but don't
                    // touch" treatment: no drag, no kebab, a click shows an amber
                    // "read-only" toast instead of letting them edit.
                    const readOnlyMember =
                      state.creedType === "shared" && myPerm === "read-only";
                    const canArchiveSection =
                      state.creedType !== "shared" || isSharedManager;
                    return (
                      <SectionCardBound
                        key={`${state.creedId ?? "unscoped"}:${section.id}`}
                        active={active}
                        creedId={state.creedId ?? null}
                        baseRevision={state.sectionRevisions[section.id] ?? 1}
                        section={section}
                        editingBy={sectionPresence[section.id]}
                        sectionTagTargets={visibleSectionTagTargets}
                        locked={sectionLocked}
                        proposeMode={proposeMode}
                        canReview={canReview}
                        readOnlyMember={readOnlyMember}
                        canDrag={canReorderSections}
                        reorderPosition={reorderPosition}
                        collapsed={collapsedSectionIds.has(section.id)}
                        reopenDraft={
                          reopenDraft?.sectionId === section.id
                            ? reopenDraft.content
                            : null
                        }
                        globalLocked={state.locked}
                        quality={quality}
                        qualityLoading={qualitySectionLoading === section.id}
                        qualityDirty={
                          qualityEnabled &&
                          // Members can only refresh sections they have propose or direct access to.
                          (state.creedType !== "shared" ||
                            canProposeToSection(myPerm))
                        }
                        proposals={
                          proposalsBySectionId.get(section.id) ??
                          EMPTY_PROPOSALS
                        }
                        proposalBeforeTextById={proposalBeforeTextById}
                        canArchive={canArchiveSection}
                        canAddAfter={canCreateSections}
                        handlers={sectionHandlers}
                      />
                    );
                  })}
                </Reorder.Group>

                {visibleSections.length === 0 ? (
                  <div className="flex flex-col items-center justify-center gap-2 rounded-[var(--radius-xl)] border border-dashed border-[var(--creed-border)] px-4 py-16 text-center">
                    <div className="text-[15px] font-medium text-[var(--creed-text-primary)]">
                      {state.sections.length
                        ? "Every section is archived"
                        : "This file has no sections"}
                    </div>
                    <div className="max-w-sm text-[13px] leading-6 text-[var(--creed-text-secondary)]">
                      {state.sections.length
                        ? "Restore a section from Settings, under Archived, to bring it back into your Creed."
                        : "Your Markdown is preserved. Open its source to edit it, or add a section below."}
                    </div>
                    {!state.sections.length ? (
                      <Button
                        variant="outline"
                        onClick={() =>
                          window.dispatchEvent(new Event(OPEN_SOURCE_EVENT))
                        }
                      >
                        Edit Markdown source
                      </Button>
                    ) : null}
                  </div>
                ) : null}

                {newSectionInlineProposals.length > 0 ? (
                  <div
                    className={cn(
                      "flex flex-col gap-8 md:gap-12",
                      visibleSections.length > 0 && "mt-8 md:mt-12",
                    )}
                  >
                    {newSectionInlineProposals.map((proposal) => (
                      <ProposedNewSectionPreview
                        key={proposal.id}
                        proposal={proposal}
                        active={active}
                        creedId={state.creedId ?? null}
                        sectionTagTargets={visibleSectionTagTargets}
                        onAccept={() => {
                          void acceptProposal(proposal.id);
                        }}
                        onReject={() => {
                          rejectProposal(proposal.id);
                        }}
                        onDismiss={() => dismissProposal(proposal.id)}
                        onOpenSection={handleSectionSelect}
                      />
                    ))}
                  </div>
                ) : null}

                {canCreateSections ? (
                  <div ref={composerAreaRef} className="mt-10 md:mt-16">
                    {composerOpen ? (
                      <motion.div
                        initial={{ height: 50, opacity: 0 }}
                        animate={
                          composerRevealed
                            ? { height: "auto", opacity: 1 }
                            : { height: 50, opacity: 0 }
                        }
                        transition={{
                          duration: 0.26,
                          ease: [0.22, 1, 0.36, 1],
                        }}
                        className={cn(
                          "relative overflow-hidden rounded-lg border border-[var(--creed-border)] bg-[var(--creed-surface)] p-4 sm:p-5 [overflow-anchor:none]",
                          !composerRevealed && "pointer-events-none",
                        )}
                      >
                        <div>
                          <div className="flex min-w-0 flex-col gap-2">
                            <div className="font-heading text-[18px] leading-none font-medium text-[var(--creed-text-primary)]">
                              New section
                            </div>
                            <div className="hidden text-sm text-[var(--creed-text-secondary)] sm:block">
                              Give your section a name.
                            </div>
                          </div>
                        </div>

                        <Input
                          ref={inputRef}
                          value={composerName}
                          onChange={(event) =>
                            setComposerName(event.target.value)
                          }
                          onKeyDown={(event) => {
                            if (event.key === "Enter") {
                              event.preventDefault();
                              submitComposer();
                            }
                          }}
                          placeholder="Section name..."
                          className="mt-4 h-10 rounded-md border-[var(--creed-border)] bg-[var(--creed-surface)] px-3 text-[14px]"
                        />

                        <div className="mt-4 flex items-center justify-between gap-2">
                          <Button
                            variant="outline"
                            className="rounded-md border-[var(--creed-border)]"
                            onClick={() => {
                              setComposerOpen(false);
                              setComposerRevealed(false);
                            }}
                          >
                            Cancel
                          </Button>
                          <Button
                            onClick={submitComposer}
                            className="rounded-md bg-[var(--creed-accent)] text-white hover:bg-[var(--creed-accent-hover)]"
                          >
                            Create
                          </Button>
                        </div>
                      </motion.div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => openComposerAndReveal()}
                        className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-[var(--creed-border-strong)] bg-[var(--creed-surface)] px-4 py-3.5 text-sm font-medium text-[var(--creed-text-secondary)] transition-colors duration-150 hover:border-[var(--creed-text-secondary)] hover:bg-[var(--creed-surface-raised)] hover:text-[var(--creed-text-primary)]"
                      >
                        <Plus className="h-3.5 w-3.5" />
                        Add section
                      </button>
                    )}
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </div>

        <ActivityRail
          activity={state.activity}
          creedType={state.creedType === "shared" ? "shared" : "personal"}
          proposals={liveReviewProposals(state.proposals, state.sections)}
          sections={state.sections}
          open={activityOpen}
        />
      </div>

      <CreedFindReplace active={active} scrollRef={editorScrollRef} />

      <Dialog
        open={Boolean(renameSectionState)}
        onOpenChange={(open) => !open && setRenameSectionState(null)}
      >
        <DialogContent className="rounded-[var(--radius-xl)] border-[var(--creed-border)] bg-[var(--creed-surface)]">
          <DialogHeader>
            <DialogTitle>Rename section</DialogTitle>
            <DialogDescription>
              Update the section title without changing its content.
            </DialogDescription>
          </DialogHeader>
          <Input
            value={renameSectionState?.name ?? ""}
            onChange={(event) =>
              setRenameSectionState((current) =>
                current ? { ...current, name: event.target.value } : current,
              )
            }
            className="h-11 rounded-xl border-[var(--creed-border)] bg-[var(--creed-surface)] px-4 text-[15px]"
            onKeyDown={(event) => {
              if (event.key === "Enter" && renameSectionState?.name.trim()) {
                renameSection(renameSectionState.id, renameSectionState.name);
                setRenameSectionState(null);
              }
            }}
          />
          <DialogFooter className="flex-row items-center justify-between border-t-[var(--creed-border)] bg-[var(--creed-surface)] sm:justify-between">
            <Button
              variant="outline"
              className="rounded-md border-[var(--creed-border)]"
              onClick={() => setRenameSectionState(null)}
            >
              Cancel
            </Button>
            <Button
              className="rounded-md bg-[var(--creed-accent)] text-white transition-colors hover:bg-[var(--creed-accent-hover)]"
              onClick={() => {
                if (!renameSectionState?.name.trim()) {
                  return;
                }
                renameSection(renameSectionState.id, renameSectionState.name);
                setRenameSectionState(null);
              }}
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(deleteSectionState)}
        onOpenChange={(open) => !open && setDeleteSectionState(null)}
      >
        <DialogContent className="rounded-[var(--radius-xl)] border-[var(--creed-border)] bg-[var(--creed-surface)]">
          <DialogHeader>
            <DialogTitle>Delete section</DialogTitle>
            <DialogDescription>
              Remove {deleteSectionState?.name ?? "this section"} from the file.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-row items-center justify-between border-t-[var(--creed-border)] bg-[var(--creed-surface)] sm:justify-between">
            <Button
              variant="outline"
              className="rounded-md border-[var(--creed-border)]"
              onClick={() => setDeleteSectionState(null)}
            >
              Cancel
            </Button>
            <Button
              className="rounded-md bg-[#DC2626] text-white hover:bg-[#B91C1C]"
              onClick={() => {
                if (!deleteSectionState) {
                  return;
                }
                deleteSection(deleteSectionState.id);
                setDeleteSectionState(null);
              }}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={clearFileOpen} onOpenChange={setClearFileOpen}>
        <DialogContent className="rounded-[var(--radius-xl)] border-[var(--creed-border)] bg-[var(--creed-surface)]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <AlertTriangle className="h-5 w-5 text-[#B91C1C]" />
              Clear Creed
            </DialogTitle>
            <DialogDescription>
              Removes every section and clears proposals and activity. The
              Markdown file stays in place. This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-row items-center justify-between border-t-[var(--creed-border)] bg-[var(--creed-surface)] sm:justify-between">
            <Button
              variant="outline"
              className="rounded-md border-[var(--creed-border)]"
              onClick={() => setClearFileOpen(false)}
            >
              Cancel
            </Button>
            <Button
              className="rounded-md bg-[#DC2626] text-white hover:bg-[#B91C1C]"
              onClick={() => {
                clearSections();
                setClearFileOpen(false);
              }}
            >
              Clear
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={archiveAllOpen} onOpenChange={setArchiveAllOpen}>
        <DialogContent className="rounded-[var(--radius-xl)] border-[var(--creed-border)] bg-[var(--creed-surface)]">
          <DialogHeader>
            <DialogTitle>Archive all sections</DialogTitle>
            <DialogDescription>
              This moves every section to your archive and starts you with a
              single fresh section. Nothing is deleted - restore any section
              anytime in Settings, under Archived.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-row items-center justify-between border-t-[var(--creed-border)] bg-[var(--creed-surface)] sm:justify-between">
            <Button
              variant="outline"
              className="rounded-md border-[var(--creed-border)]"
              onClick={() => setArchiveAllOpen(false)}
            >
              Cancel
            </Button>
            <Button
              className="rounded-md bg-[var(--creed-text-primary)] text-[var(--creed-button-primary-fg)] hover:bg-[var(--creed-button-primary-hover)]"
              onClick={() => {
                archiveCreed();
                setArchiveAllOpen(false);
              }}
            >
              Archive all
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

// The stable dispatch table SectionCardBound routes through (see FileScreen).
type SectionCardHandlers = {
  reopenConsumed: () => void;
  submitProposal: (
    sectionId: string,
    content: string,
  ) => Promise<boolean> | boolean | void;
  toggleLock: (sectionId: string) => void;
  refreshQuality: (section: CreedSection) => void;
  acceptProposal: (proposalId: string) => void;
  rejectProposal: (proposalId: string) => void;
  dismissProposal: (proposalId: string) => void;
  withdrawProposal: (proposalId: string) => void;
  changeRichText: (sectionId: string, content: string) => void;
  localSaveStart: (creedId: string) => void;
  localSaveComplete: (creedId: string, savedAt: number | null) => void;
  rename: (sectionId: string, name: string) => void;
  copy: (section: CreedSection) => void;
  setAccent: (sectionId: string, accent: AccentKey) => void;
  requestDelete: (sectionId: string, name: string) => void;
  archive: (sectionId: string, name: string) => void;
  addSectionAfter: (sectionId: string) => void;
  setCollapsed: (sectionId: string, collapsed: boolean) => void;
  dragActiveChange: (active: boolean, sectionId: string) => void;
  openSection: (sectionId: string) => void;
};

function ignoreReadOnlyProposalContent() {}

function proposedNewSectionChrome(proposal: Proposal) {
  const draft = proposal.draft.kind === "new-section" ? proposal.draft : null;
  const name = draft?.name.trim() || "New section";
  const accentKey: AccentKey =
    draft && isAccentKey(draft.accent) ? draft.accent : proposal.accent;
  return {
    name,
    accent: accentColorMap[accentKey],
    content: draft ? normalizeRichTextInput(draft) : "",
  };
}

// Pending creates have no live section to hang the card on, so this preview
// supplies the same header-plus-body chrome a delete proposal keeps around
// the existing section.
function ProposedNewSectionPreview({
  proposal,
  active,
  creedId,
  sectionTagTargets,
  onAccept,
  onReject,
  onDismiss,
  onOpenSection,
}: {
  proposal: Proposal;
  active: boolean;
  creedId: string | null;
  sectionTagTargets: Array<{ id: string; name: string; accent?: AccentKey }>;
  onAccept: () => void;
  onReject: () => void;
  onDismiss: () => void;
  onOpenSection: (sectionId: string) => void;
}) {
  const chrome = proposedNewSectionChrome(proposal);

  return (
    <div data-proposal-id={proposal.id} className="relative scroll-mt-24">
      <section className="relative">
        <div className="flex items-center gap-3">
          <span
            className={FILE_SECTION_ACCENT_BAR_CLASS}
            style={{ backgroundColor: chrome.accent }}
          />
          <span
            className={FILE_SECTION_NAME_CLASS}
            style={{ color: chrome.accent }}
          >
            {chrome.name}
          </span>
        </div>
        <div className="pt-6 [contain:layout]">
          <div className="mb-4">
            <InlineNewSectionProposal
              proposal={proposal}
              agentName={proposal.agentName}
              onAccept={onAccept}
              onReject={onReject}
              onDismiss={onDismiss}
            />
          </div>
          <RichTextEditor
            sectionId={proposal.id}
            active={active}
            creedId={creedId}
            content={chrome.content}
            readOnly
            accentColor={chrome.accent}
            sectionTagTargets={sectionTagTargets}
            onChange={ignoreReadOnlyProposalContent}
            onOpenSection={onOpenSection}
          />
        </div>
      </section>
    </div>
  );
}

// Memo boundary for the section list. Every prop here is either a primitive,
// identity-stable across unrelated commits (section objects, presence
// arrays, proposal buckets, tag targets), or the stable `handlers` table -
// so typing in one section no longer re-renders the other N-1 cards. The
// closures below are recreated only when THIS card's data changes, and they
// dispatch through `handlers`, which always runs the freshest implementation.
const SectionCardBound = memo(function SectionCardBound({
  active,
  creedId,
  baseRevision,
  section,
  editingBy,
  sectionTagTargets,
  locked,
  proposeMode,
  canReview,
  readOnlyMember,
  canDrag,
  reorderPosition,
  collapsed,
  reopenDraft,
  globalLocked,
  quality,
  qualityLoading,
  qualityDirty,
  proposals,
  proposalBeforeTextById,
  canArchive,
  canAddAfter,
  handlers,
}: {
  active: boolean;
  creedId: string | null;
  baseRevision: number;
  section: CreedSection;
  editingBy?: string[];
  sectionTagTargets: Array<{ id: string; name: string; accent?: AccentKey }>;
  locked: boolean;
  proposeMode: boolean;
  canReview: boolean;
  readOnlyMember: boolean;
  canDrag: boolean;
  reorderPosition: number;
  collapsed: boolean;
  reopenDraft: string | null;
  globalLocked: boolean;
  quality?: CreedQualityReport["sections"][number];
  qualityLoading: boolean;
  qualityDirty: boolean;
  proposals: Proposal[];
  proposalBeforeTextById: Map<string, string>;
  canArchive: boolean;
  canAddAfter: boolean;
  handlers: SectionCardHandlers;
}) {
  return (
    <SectionCard
      active={active}
      creedId={creedId}
      baseRevision={baseRevision}
      section={section}
      editingBy={editingBy}
      sectionTagTargets={sectionTagTargets}
      locked={locked}
      proposeMode={proposeMode}
      canReview={canReview}
      readOnlyMember={readOnlyMember}
      canDrag={canDrag}
      reorderPosition={reorderPosition}
      collapsed={collapsed}
      onCollapsedChange={(nextCollapsed) =>
        handlers.setCollapsed(section.id, nextCollapsed)
      }
      onDragActiveChange={(active) =>
        handlers.dragActiveChange(active, section.id)
      }
      reopenDraft={reopenDraft}
      onReopenConsumed={handlers.reopenConsumed}
      onSubmitProposal={(content) =>
        handlers.submitProposal(section.id, content)
      }
      globalLocked={globalLocked}
      onToggleLock={() => handlers.toggleLock(section.id)}
      quality={quality}
      qualityLoading={qualityLoading}
      qualityDirty={qualityDirty}
      onRefreshQuality={() => handlers.refreshQuality(section)}
      proposals={proposals}
      proposalBeforeTextById={proposalBeforeTextById}
      onAcceptProposal={handlers.acceptProposal}
      onRejectProposal={handlers.rejectProposal}
      onDismissProposal={handlers.dismissProposal}
      onWithdrawProposal={handlers.withdrawProposal}
      onChangeRichText={(content) =>
        handlers.changeRichText(section.id, content)
      }
      onLocalSaveStart={handlers.localSaveStart}
      onLocalSaveComplete={handlers.localSaveComplete}
      onRename={() => handlers.rename(section.id, section.name)}
      onCopy={() => handlers.copy(section)}
      onSetAccent={(accent) => handlers.setAccent(section.id, accent)}
      onDelete={() => handlers.requestDelete(section.id, section.name)}
      onArchive={
        canArchive
          ? () => handlers.archive(section.id, section.name)
          : undefined
      }
      onAddSectionAfter={
        canAddAfter ? () => handlers.addSectionAfter(section.id) : undefined
      }
      onOpenSection={handlers.openSection}
    />
  );
});

function SectionCard({
  active,
  creedId,
  baseRevision,
  section,
  editingBy,
  sectionTagTargets,
  locked,
  proposeMode = false,
  canReview = true,
  readOnlyMember = false,
  canDrag = true,
  reorderPosition,
  collapsed,
  onCollapsedChange,
  onDragActiveChange,
  reopenDraft = null,
  onReopenConsumed,
  onSubmitProposal,
  globalLocked,
  onToggleLock,
  quality,
  qualityLoading,
  qualityDirty,
  onRefreshQuality,
  proposals,
  proposalBeforeTextById,
  onAcceptProposal,
  onRejectProposal,
  onDismissProposal,
  onWithdrawProposal,
  onChangeRichText,
  onLocalSaveStart,
  onLocalSaveComplete,
  onRename,
  onSetAccent,
  onCopy,
  onDelete,
  onArchive,
  onAddSectionAfter,
  onOpenSection,
}: {
  active: boolean;
  creedId: string | null;
  baseRevision: number;
  section: CreedSection;
  // Shared only: names of other members currently editing this section.
  editingBy?: string[];
  sectionTagTargets: Array<{ id: string; name: string; accent?: AccentKey }>;
  locked: boolean;
  // Shared Proposal-only: edits are buffered locally and submitted as a
  // proposal via the header button, instead of autosaving.
  proposeMode?: boolean;
  // Whether this viewer can accept/reject proposals on this section.
  canReview?: boolean;
  // Per-member read-only: look-but-don't-touch. No
  // drag, no kebab; a click on the body shows an amber read-only toast.
  readOnlyMember?: boolean;
  // Whether this viewer may reorder sections (owner/admin, or personal). When
  // false the drag handle is hidden and there's no icon left of the name.
  canDrag?: boolean;
  reorderPosition: number;
  collapsed: boolean;
  onCollapsedChange: (collapsed: boolean) => void;
  onDragActiveChange?: (active: boolean) => void;
  // When the ReviewPill's "Edit" fires for a proposal on this section, its draft
  // content arrives here to be loaded back into the local editor draft.
  reopenDraft?: string | null;
  onReopenConsumed?: () => void;
  onSubmitProposal?: (content: string) => Promise<boolean> | boolean | void;
  globalLocked: boolean;
  onToggleLock: () => void;
  quality?: CreedQualityReport["sections"][number];
  qualityLoading?: boolean;
  qualityDirty?: boolean;
  onRefreshQuality: () => void;
  proposals: Proposal[];
  proposalBeforeTextById: Map<string, string>;
  onAcceptProposal: (proposalId: string) => void;
  onRejectProposal: (proposalId: string) => void;
  onDismissProposal: (proposalId: string) => void;
  onWithdrawProposal: (proposalId: string) => void;
  onChangeRichText: (content: string) => void;
  onLocalSaveStart: (creedId: string) => void;
  onLocalSaveComplete: (creedId: string, savedAt: number | null) => void;
  onRename: () => void;
  onSetAccent: (accent: AccentKey) => void;
  onCopy: () => void;
  onDelete: () => void;
  onArchive?: () => void;
  onAddSectionAfter?: () => void;
  onOpenSection: (sectionId: string) => void;
}) {
  const dragControls = useDragControls();
  // Proposal-only draft buffer: null = clean (mirrors canonical section.content),
  // otherwise the member's unsent local edit. Reset whenever the section id
  // changes so a draft never leaks across sections.
  const [proposalDraft, setProposalDraft] = useState<string | null>(null);
  const [submittingProposal, setSubmittingProposal] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [sectionCopied, setSectionCopied] = useState(false);
  const copyResetTimerRef = useRef<number | null>(null);
  useEffect(
    () => () => {
      if (copyResetTimerRef.current !== null) {
        window.clearTimeout(copyResetTimerRef.current);
      }
    },
    [],
  );
  useEffect(() => {
    setProposalDraft(null);
  }, [section.id]);
  // "Edit" from the ReviewPill hands us the withdrawn proposal's content to
  // resume from; load it into the local draft, then clear the request.
  useEffect(() => {
    if (reopenDraft != null) {
      setProposalDraft(reopenDraft);
      onReopenConsumed?.();
    }
  }, [reopenDraft, onReopenConsumed]);
  // Draft is only non-null when it genuinely differs from canonical (the editor
  // emits an onChange echo on init/normalize; we collapse those back to null).
  const proposalDirty = proposeMode && proposalDraft !== null;
  async function submitProposal() {
    if (!proposalDirty || !onSubmitProposal || submittingProposal) return;
    setSubmittingProposal(true);
    const ok = await onSubmitProposal(proposalDraft ?? section.content);
    setSubmittingProposal(false);
    if (ok !== false) setProposalDraft(null);
  }
  // "Edit" on your own pending proposal: pull its draft back into the editor so
  // you continue where you left off, and withdraw the pending one (you'll
  // re-submit when done). "Delete" just withdraws it.
  function editProposal(p: Proposal) {
    const html =
      p.draft.kind === "rich-text"
        ? (p.draft.contentHtml ?? section.content)
        : section.content;
    setProposalDraft(html === section.content ? null : html);
    onWithdrawProposal(p.id);
  }
  const accent = accentColorMap[section.accent];
  const editorContent = proposeMode
    ? (proposalDraft ?? section.content)
    : section.content;
  // Ref so the Colour sub-trigger row can drive the stamp animation when
  // the row itself is hovered (not just the icon's own hit-target).
  const stampIconRef = useRef<StampIconHandle | null>(null);

  return (
    <Reorder.Item
      value={section.id}
      dragListener={false}
      dragControls={dragControls}
      layout="position"
      layoutDependency={reorderPosition}
      dragElastic={0}
      dragMomentum={false}
      transition={{
        layout: {
          type: "spring",
          stiffness: 340,
          damping: 32,
          mass: 0.85,
        },
      }}
      onDragStart={() => {
        setDragging(true);
        onDragActiveChange?.(true);
      }}
      onDragEnd={() => {
        setDragging(false);
        onDragActiveChange?.(false);
      }}
      data-section-id={section.id}
      data-theme-snapshot-section
      id={section.id}
      className="relative scroll-mt-24"
    >
      <section className="group relative">
        {/* Only reorderers (owner/admin, or the personal user) get the drag
            handle. Members can't reorder, so they get no icon at all on the
            left of the section name. */}
        {canDrag ? (
          <button
            type="button"
            onPointerDown={(event) => {
              dragControls.start(event, { distanceThreshold: 4 });
            }}
            className="group/drag absolute -left-7 top-1 flex touch-none rounded-full p-1 text-[var(--creed-text-secondary)] transition-colors duration-150 hover:text-[var(--creed-text-primary)]"
          >
            <GripVerticalIcon className="h-4 w-4" size={16} />
          </button>
        ) : null}

        <div
          onClick={(event) => {
            // Radix menu items render in a portal, but their React click events
            // still bubble through this header. Ignore those out-of-tree clicks
            // so actions such as Rename and Delete do not toggle the section.
            if (
              !(event.target instanceof Node) ||
              !event.currentTarget.contains(event.target)
            ) {
              return;
            }
            if (
              event.target instanceof Element &&
              event.target.closest(
                "button, a, input, textarea, select, [role='button'], [contenteditable='true']",
              )
            ) {
              return;
            }
            onCollapsedChange(!collapsed);
          }}
          className={cn(
            "group/header flex cursor-pointer items-start justify-between gap-4 transition-opacity duration-150 ease-[cubic-bezier(0.22,1,0.36,1)]",
            dragging && "opacity-60",
          )}
        >
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-3">
              <span
                className={FILE_SECTION_ACCENT_BAR_CLASS}
                style={{ backgroundColor: accent }}
              />
              <div className="flex min-w-0 items-center gap-3">
                <span
                  className={FILE_SECTION_NAME_CLASS}
                  style={{ color: accent }}
                >
                  {section.name}
                </span>
                {editingBy && editingBy.length > 0 ? (
                  <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-[var(--creed-border)] bg-[var(--creed-surface-raised)] px-2 py-1 text-[11px] leading-none text-[var(--creed-text-secondary)]">
                    <span className="h-1.5 w-1.5 rounded-full bg-[#F59E0B]" />
                    {editingBy[0]}
                    {editingBy.length > 1 ? ` +${editingBy.length - 1}` : ""}
                    {" editing"}
                  </span>
                ) : null}
                <button
                  type="button"
                  aria-label={
                    collapsed
                      ? `Expand ${section.name}`
                      : `Collapse ${section.name}`
                  }
                  aria-expanded={!collapsed}
                  onClick={() => onCollapsedChange(!collapsed)}
                  className="inline-flex h-9 shrink-0 items-center text-[var(--creed-text-secondary)] transition-colors duration-150 hover:text-[var(--creed-text-primary)] group-hover/header:text-[var(--creed-text-primary)]"
                >
                  <ChevronDown
                    className={cn(
                      "h-4 w-4 origin-center transition-[rotate] duration-200 ease-[cubic-bezier(0.22,1,0.36,1)]",
                      collapsed ? "-rotate-90" : "rotate-0",
                    )}
                  />
                </button>
                <SectionQualityPopover
                  quality={quality}
                  color={accent}
                  loading={qualityLoading}
                  sectionName={section.name}
                  actionAvailable={Boolean(qualityDirty)}
                  onAction={onRefreshQuality}
                />
              </div>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-0.5">
            {readOnlyMember ? null : (
              <AnimatePresence initial={false}>
                {proposeMode && proposalDirty ? (
                  <motion.div
                    key={`${section.id}-submit-proposal`}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    transition={{ duration: 0.15, ease: [0.22, 1, 0.36, 1] }}
                    className="shrink-0"
                  >
                    <SimpleTooltip label="Submit as proposal">
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => void submitProposal()}
                        disabled={submittingProposal}
                        aria-label="Submit as proposal"
                        className="translate-y-0! text-[var(--creed-text-secondary)] transition-colors duration-150 hover:text-[var(--creed-text-primary)]"
                      >
                        <DelayedSpinner
                          pending={submittingProposal}
                          className="h-4 w-4 animate-spin"
                          fallback={<Send className="h-4 w-4" />}
                        />
                      </Button>
                    </SimpleTooltip>
                  </motion.div>
                ) : null}
              </AnimatePresence>
            )}

            <div
              className={cn(
                "grid h-7 shrink-0 grid-cols-[28px_28px] gap-2 [contain:layout]",
                readOnlyMember && "w-7 grid-cols-[28px]",
              )}
            >
              <motion.div
                initial={false}
                animate={{ opacity: globalLocked ? 1 : 0 }}
                transition={{
                  duration: 0.16,
                  ease: [0.22, 1, 0.36, 1],
                }}
                className={cn(
                  "flex h-7 w-7 items-center justify-center",
                  !globalLocked && "pointer-events-none",
                )}
                aria-hidden={!globalLocked}
                inert={!globalLocked}
              >
                <SectionLockButton
                  locked={locked}
                  title={
                    locked ? `Unlock ${section.name}` : `Lock ${section.name}`
                  }
                  onToggle={onToggleLock}
                />
              </motion.div>
              {readOnlyMember ? null : (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      type="button"
                      aria-label={`Actions for ${section.name}`}
                      className={DROPDOWN_ICON_TRIGGER_CLASS}
                    >
                      <span className={DROPDOWN_ICON_SURFACE_CLASS}>
                        <Ellipsis className="h-4 w-4" />
                      </span>
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent
                    align="end"
                    className={DROPDOWN_CONTENT_CLASS}
                  >
                    <AnimatedMenuIconItem
                      icon={SquarePenIcon}
                      className="text-sm"
                      onSelect={onRename}
                    >
                      Rename
                    </AnimatedMenuIconItem>
                    {/*
                Colour sub-menu. Hover-driven on desktop via Radix's default
                Sub behaviour, with a custom chevron that flips < → > on
                hover/open so the affordance matches the profile-menu
                Feedback row. The default trailing chevron is hidden.
              */}
                    <DropdownMenuSub>
                      <DropdownMenuSubTrigger
                        onMouseEnter={() =>
                          stampIconRef.current?.startAnimation()
                        }
                        onMouseLeave={() =>
                          stampIconRef.current?.stopAnimation()
                        }
                        className={cn(
                          DROPDOWN_ITEM_CLASS,
                          "group/colour [&>svg:last-of-type]:hidden",
                        )}
                      >
                        <StampIcon
                          ref={stampIconRef}
                          size={14}
                          className="inline-flex h-3.5 w-3.5 shrink-0 items-center justify-center leading-none"
                        />
                        <span className="flex-1 text-left">Colour</span>
                        <ChevronLeft
                          className={cn(
                            DROPDOWN_SUB_CHEVRON_CLASS,
                            "group-hover/colour:rotate-180 group-data-[state=open]/colour:rotate-180",
                          )}
                        />
                      </DropdownMenuSubTrigger>
                      <DropdownMenuPortal>
                        <DropdownMenuSubContent
                          // Matches the gap the profile dropdown uses from its
                          // trigger button (see feedback-menu.tsx). Bridging
                          // pseudo widens to cover the 14px gap so cursor travel
                          // between trigger row and picker doesn't dismiss it.
                          sideOffset={14}
                          alignOffset={0}
                          className="relative w-auto border-[var(--creed-border)] bg-[var(--creed-surface)] p-2 before:pointer-events-auto before:absolute before:-left-4 before:top-0 before:bottom-0 before:w-4 before:content-['']"
                        >
                          <div className="grid grid-cols-5 gap-1">
                            {VISIBLE_ACCENT_KEYS.map((accentKey) => {
                              const selected =
                                section.accent === accentKey ||
                                // The legacy `custom` storage value renders as mono
                                // in the palette, so a section saved as "custom"
                                // should highlight the mono cell.
                                (accentKey === "mono" &&
                                  section.accent === "custom");
                              return (
                                <button
                                  key={accentKey}
                                  type="button"
                                  aria-label={accentLabelMap[accentKey]}
                                  aria-pressed={selected}
                                  onClick={(event) => {
                                    const rect =
                                      event.currentTarget.getBoundingClientRect();
                                    onSetAccent(accentKey);
                                    fireConfetti(
                                      rect.left + rect.width / 2,
                                      rect.top + rect.height / 2,
                                      accentColorMap[accentKey],
                                    );
                                  }}
                                  // The selected tick is painted in the app background colour
                                  // so it reads as cut out of the filled swatch.
                                  className="group/swatch relative flex aspect-square h-6 w-6 items-center justify-center overflow-hidden rounded-[10px] transition-transform duration-150 active:scale-95"
                                  style={{
                                    backgroundColor: accentColorMap[accentKey],
                                  }}
                                >
                                  <span className="pointer-events-none absolute inset-0 bg-black/0 transition-colors duration-150 group-hover/swatch:bg-black/15" />
                                  {selected ? (
                                    <Check
                                      className="relative h-3.5 w-3.5"
                                      strokeWidth={3}
                                      style={{
                                        color: "var(--creed-background)",
                                      }}
                                    />
                                  ) : null}
                                </button>
                              );
                            })}
                          </div>
                        </DropdownMenuSubContent>
                      </DropdownMenuPortal>
                    </DropdownMenuSub>
                    <AnimatedMenuIconItem
                      icon={CopyIcon}
                      showIcon={!sectionCopied}
                      className="text-sm"
                      onSelect={(event) => {
                        event.preventDefault();
                        onCopy();
                        setSectionCopied(true);
                        if (copyResetTimerRef.current !== null) {
                          window.clearTimeout(copyResetTimerRef.current);
                        }
                        copyResetTimerRef.current = window.setTimeout(
                          () => setSectionCopied(false),
                          1400,
                        );
                      }}
                    >
                      {sectionCopied ? <AnimatedCheckmark /> : null}
                      <SwapLabel
                        value={sectionCopied ? "Copied" : "Copy"}
                        options={["Copy", "Copied"]}
                      />
                    </AnimatedMenuIconItem>
                    {onArchive ? (
                      <>
                        <DropdownMenuSeparator />
                        <AnimatedMenuIconItem
                          icon={ArchiveIcon}
                          className="text-sm"
                          onSelect={onArchive}
                        >
                          Archive
                        </AnimatedMenuIconItem>
                      </>
                    ) : null}
                    <AnimatedMenuIconItem
                      icon={DeleteIcon}
                      className="mt-1 bg-[#DC2626] text-sm text-white hover:bg-[#B91C1C] hover:text-white focus:bg-[#B91C1C] focus:text-white data-[highlighted]:bg-[#B91C1C] data-[highlighted]:text-white not-data-[variant=destructive]:focus:**:text-white"
                      onSelect={onDelete}
                    >
                      Delete
                    </AnimatedMenuIconItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          </div>
        </div>

        {/* Keep Tiptap mounted, but animate only this measured wrapper. The
            layout-contained body avoids the repeated intrinsic measurement
            that made the old grid-row collapse stutter on large files. */}
        <motion.div
          initial={false}
          animate={{ height: collapsed ? 0 : "auto" }}
          transition={{
            height: { duration: 0.44, ease: [0.22, 1, 0.36, 1] },
          }}
          className="overflow-hidden"
          aria-hidden={collapsed}
          inert={collapsed}
        >
          <motion.div
            initial={false}
            animate={{
              opacity: collapsed ? 0 : 1,
              y: collapsed ? -4 : 0,
            }}
            transition={{
              duration: collapsed ? 0.3 : 0.34,
              ease: [0.22, 1, 0.36, 1],
            }}
            className={cn(
              "pt-6 [contain:layout]",
              collapsed && "pointer-events-none",
            )}
          >
            {proposals.length > 0 ? (
              <div className="mb-4 space-y-3">
                {proposals.map((p) => {
                  const kind = p.draft.kind;
                  const isDelete = kind === "delete-section";
                  const reviewBaseline = proposalReviewBaseline(
                    p,
                    section,
                    proposalBeforeTextById.get(p.id),
                  );
                  const card =
                    isDelete ||
                    kind === "rename-section" ||
                    kind === "recolor-section" ? (
                      <InlineMetaProposal
                        proposal={p}
                        existingName={reviewBaseline.name}
                        existingAccent={accentColorMap[reviewBaseline.accent]}
                        existingContent={reviewBaseline.content}
                        agentName={p.agentName}
                        canReview={canReview}
                        onAccept={() => onAcceptProposal(p.id)}
                        onReject={() => onRejectProposal(p.id)}
                        onDismiss={() => onDismissProposal(p.id)}
                      />
                    ) : (
                      <InlineProposalDiff
                        proposal={p}
                        existingContent={
                          p.status === "stale"
                            ? (proposalBeforeTextById.get(p.id) ??
                              section.content)
                            : section.content
                        }
                        agentName={p.agentName}
                        canReview={canReview}
                        mine={Boolean(p.mine)}
                        onAccept={() => onAcceptProposal(p.id)}
                        onReject={() => onRejectProposal(p.id)}
                        onDismiss={() => onDismissProposal(p.id)}
                        onEdit={() => editProposal(p)}
                        onDelete={() => onWithdrawProposal(p.id)}
                      />
                    );
                  return isDelete ? (
                    <div key={p.id} data-proposal-id={p.id}>
                      {card}
                    </div>
                  ) : (
                    <div key={p.id}>{card}</div>
                  );
                })}
              </div>
            ) : null}

            <div
              // Read-only for this member: nothing is greyed, but a click on the
              // body (as if to edit) surfaces an amber "read-only" nudge. Text
              // selection still works, so we skip the toast mid-selection.
              onClick={
                readOnlyMember
                  ? (event) => {
                      if (event.metaKey || event.ctrlKey) return;
                      if ((window.getSelection()?.toString() ?? "") === "") {
                        toast.warning("This section is read-only.");
                      }
                    }
                  : undefined
              }
            >
              <RichTextEditor
                sectionId={section.id}
                active={active}
                creedId={creedId}
                baseRevision={baseRevision}
                content={editorContent}
                readOnly={locked || section.sourceOnly}
                accentColor={accentColorMap[section.accent]}
                sectionTagTargets={sectionTagTargets}
                onChange={
                  proposeMode
                    ? (html) =>
                        setProposalDraft(html === section.content ? null : html)
                    : onChangeRichText
                }
                onLocalSaveStart={proposeMode ? undefined : onLocalSaveStart}
                onLocalSaveComplete={
                  proposeMode ? undefined : onLocalSaveComplete
                }
                onAddSectionAfter={onAddSectionAfter}
                onOpenSection={onOpenSection}
              />
              {section.sourceOnly && !locked ? (
                <Button
                  variant="ghost"
                  size="sm"
                  className="mt-3 text-[var(--creed-text-secondary)]"
                  onClick={() =>
                    window.dispatchEvent(new Event(OPEN_SOURCE_EVENT))
                  }
                >
                  Edit Markdown source
                </Button>
              ) : null}
            </div>
          </motion.div>
        </motion.div>
      </section>
    </Reorder.Item>
  );
}

function LockGlyph({
  locked,
  size,
  className,
  lockedRef,
  unlockedRef,
}: {
  locked: boolean;
  size: number;
  className: string;
  lockedRef: ReturnType<typeof useAnimatedIconControls>["iconRef"];
  unlockedRef: ReturnType<typeof useAnimatedIconControls>["iconRef"];
}) {
  return locked ? (
    <LockIcon ref={lockedRef} size={size} className={className} />
  ) : (
    <LockOpenIcon ref={unlockedRef} size={size} className={className} />
  );
}

function HeaderLockOutlineButton({
  locked,
  onToggle,
  layout,
}: {
  locked: boolean;
  onToggle: () => void;
  layout: "mobile" | "desktop";
}) {
  // Two-button pattern, identical to the Activity button:
  // mobile renders an icon-only `size="icon-sm"` circle, desktop renders a
  // labelled `size="sm"` pill with the SAME className the Activity pill uses.
  const hover = useLockIconHover(locked);
  const title = locked ? "Locked" : "Unlocked";
  const icon = (
    <LockGlyph
      locked={locked}
      size={14}
      className="inline-flex h-3.5 w-3.5 shrink-0 items-center justify-center leading-none"
      lockedRef={hover.lockedRef}
      unlockedRef={hover.unlockedRef}
    />
  );

  if (layout === "mobile") {
    return (
      <Button
        variant="outline"
        size="icon-sm"
        aria-label={title}
        aria-pressed={locked}
        style={{
          borderRadius: 13,
          height: 32,
          width: 32,
          minHeight: 32,
          minWidth: 32,
        }}
        className={cn(
          FILE_HEADER_OUTLINE_MOBILE_FOCUS_CLASS,
          "border-[var(--creed-border)] bg-[var(--creed-surface)] md:hidden",
          locked &&
            "bg-[var(--creed-surface-raised)]! hover:bg-[var(--creed-surface-raised)]! dark:bg-input/50! dark:hover:bg-input/50!",
        )}
        onClick={onToggle}
      >
        {icon}
      </Button>
    );
  }

  return (
    <Button
      variant="outline"
      size="sm"
      aria-pressed={locked}
      style={{ borderRadius: 13, height: 32, minHeight: 32 }}
      className={cn(
        "hidden border-[var(--creed-border)] bg-[var(--creed-surface)] px-3 text-[12px] md:inline-flex md:px-3.5 md:text-sm",
        locked &&
          "bg-[var(--creed-surface-raised)]! hover:bg-[var(--creed-surface-raised)]! dark:bg-input/50! dark:hover:bg-input/50!",
      )}
      onMouseEnter={hover.start}
      onMouseLeave={hover.settle}
      onClick={onToggle}
    >
      {icon}
      <LockLabel locked={locked} />
    </Button>
  );
}

function HeaderLockButton({
  locked,
  onToggle,
}: {
  locked: boolean;
  onToggle: () => void;
}) {
  return (
    <>
      <HeaderLockOutlineButton
        locked={locked}
        onToggle={onToggle}
        layout="mobile"
      />
      <HeaderLockOutlineButton
        locked={locked}
        onToggle={onToggle}
        layout="desktop"
      />
    </>
  );
}

function SectionLockButton({
  locked,
  title,
  onToggle,
}: {
  locked: boolean;
  title: string;
  onToggle: () => void;
}) {
  // Passing a ref puts the icon in controlled mode so it stays still on hover.
  const iconRef = useRef<AnimatedIconHandle | null>(null);

  return (
    <button
      type="button"
      aria-label={title}
      aria-pressed={locked}
      onClick={onToggle}
      className={DROPDOWN_ICON_TRIGGER_CLASS}
    >
      <span className={DROPDOWN_ICON_SURFACE_CLASS}>
        {locked ? (
          <LockIcon ref={iconRef} size={16} className="h-4 w-4" />
        ) : (
          <LockOpenIcon ref={iconRef} size={16} className="h-4 w-4" />
        )}
      </span>
    </button>
  );
}

// A person's profile picture in the activity feed (squircle, sized to match the
// agent glyph), with an initials fallback. Agents keep their AgentIconStack.
function ActivityActorAvatar({
  avatarUrl,
  initials,
  name,
}: {
  avatarUrl?: string;
  initials?: string;
  name: string;
}) {
  const [failed, setFailed] = useState(false);
  const showImage = Boolean(avatarUrl) && !failed;
  return (
    <span className="ml-0.5 mt-[2px] flex h-4 w-4 shrink-0 items-center justify-center overflow-hidden rounded-[5px] border border-[var(--creed-border)] bg-[var(--creed-surface-raised)]">
      {showImage && avatarUrl ? (
        <Image
          src={avatarUrl}
          alt=""
          width={16}
          height={16}
          unoptimized
          referrerPolicy="no-referrer"
          onError={() => setFailed(true)}
          className="h-4 w-4 rounded-[5px] object-cover"
        />
      ) : (
        <span className="text-[8px] font-medium leading-none text-[var(--creed-text-secondary)]">
          {initials || name.slice(0, 1).toUpperCase()}
        </span>
      )}
    </span>
  );
}

const ActivityRail = memo(function ActivityRail({
  activity,
  creedType,
  proposals,
  sections,
  open,
}: {
  activity: ActivityEntry[];
  creedType: "personal" | "shared";
  proposals: Proposal[];
  sections: CreedSection[];
  open: boolean;
}) {
  const [visibleCount, setVisibleCount] = useState(ACTIVITY_PAGE_SIZE);

  return (
    <FileActivityRailFrame open={open}>
      <ActivityRailContent
        activity={activity}
        creedType={creedType}
        proposals={proposals}
        sections={sections}
        warmDiffs={true}
        visibleCount={visibleCount}
        setVisibleCount={setVisibleCount}
      />
    </FileActivityRailFrame>
  );
});

function ActivityEmptyState({ label }: { label: string }) {
  const { iconRef, start, settle } = useAnimatedIconControls();
  return (
    <div
      className="flex flex-col items-center justify-center gap-2 px-4 py-10 text-center text-[13px] text-[var(--creed-text-tertiary)]"
      onMouseEnter={start}
      onMouseLeave={settle}
    >
      <HistoryIcon ref={iconRef} size={20} className="opacity-60" />
      <div className="flex items-center gap-2">
        <span className="font-medium opacity-60">{label}</span>
        <ShortcutKey>A</ShortcutKey>
      </div>
    </div>
  );
}

const ActivityRailContent = memo(function ActivityRailContent({
  activity,
  creedType,
  proposals,
  sections,
  warmDiffs,
  visibleCount,
  setVisibleCount,
}: {
  activity: ActivityEntry[];
  creedType: "personal" | "shared";
  proposals: Proposal[];
  sections: CreedSection[];
  warmDiffs: boolean;
  visibleCount: number;
  setVisibleCount: React.Dispatch<React.SetStateAction<number>>;
}) {
  const livePendingProposalIds = useMemo(
    () =>
      new Set(
        proposals
          .filter((proposal) => proposal.status === "pending")
          .map((proposal) => proposal.id),
      ),
    [proposals],
  );
  const proposalsById = useMemo(
    () => new Map(proposals.map((proposal) => [proposal.id, proposal])),
    [proposals],
  );
  const sectionsById = useMemo(
    () => new Map(sections.map((section) => [section.id, section])),
    [sections],
  );

  const filteredAll = useMemo(
    () =>
      proposalActivityEntries(activity, proposals).filter((entry) => {
        if (creedType !== "shared" && entry.actorType !== "agent") {
          return false;
        }

        if (
          entry.status === "pending" &&
          (!entry.proposalId || !livePendingProposalIds.has(entry.proposalId))
        ) {
          return false;
        }

        // Hide phantom edits: rows with no diff payload at all, or a direct edit
        // whose before/after differ only by whitespace (someone clicked into a
        // section or bumped the spacebar and saved). New ones are blocked by the
        // server guard, but old rows can still be in local state until refresh.
        const before = entry.beforeText ?? "";
        const after = entry.afterText ?? "";
        const hasBefore = before.trim().length > 0;
        const hasAfter = after.trim().length > 0;
        if (
          (entry.status === "direct" || entry.status === "accepted") &&
          !hasBefore &&
          !hasAfter
        ) {
          return false;
        }
        if (
          entry.status === "direct" &&
          hasBefore &&
          hasAfter &&
          before !== after &&
          richTextContentEquivalent(before, after)
        ) {
          return false;
        }

        return true;
      }),
    [activity, proposals, creedType, livePendingProposalIds],
  );

  const filtered = useMemo(
    () => filteredAll.slice(0, visibleCount),
    [filteredAll, visibleCount],
  );
  const hasMore = filteredAll.length > visibleCount;

  const grouped = filtered.reduce<Record<string, ActivityEntry[]>>(
    (accumulator, entry) => {
      const dayLabel = formatDayLabel(entry.createdAt, entry.dayLabel);

      if (!accumulator[dayLabel]) {
        accumulator[dayLabel] = [];
      }

      accumulator[dayLabel].push(entry);
      return accumulator;
    },
    {},
  );

  return (
    <div className="flex h-full w-full flex-col pl-2 pb-2">
      <ScrollArea className="min-h-0 flex-1">
        {filtered.length ? (
          <div>
            <div className="space-y-7">
              {Object.entries(grouped).map(([dayLabel, entries], index) => (
                <div key={dayLabel}>
                  <div className="mb-2 flex h-5 items-center pl-3 text-[13px] font-medium text-[var(--creed-text-tertiary)]">
                    {dayLabel}
                    {index === 0 ? (
                      <ShortcutKey className="ml-auto">A</ShortcutKey>
                    ) : null}
                  </div>
                  <div className="space-y-2">
                    {entries.map((entry) => {
                      // For pending entries we mirror the inline accept-all
                      // card byte-for-byte: same existing content, same
                      // `getProposalPreviewText` result. Without this, the
                      // sidebar diff was off by 1–2 tokens because it used a
                      // stale snapshot stored at proposal-creation time.
                      const liveProposal = entry.proposalId
                        ? proposalsById.get(entry.proposalId)
                        : undefined;
                      const liveSection = sectionsById.get(entry.sectionId);
                      const liveExistingContent =
                        entry.status === "pending"
                          ? liveProposal?.draft.kind === "new-section"
                            ? ""
                            : liveSection?.content
                          : undefined;
                      const liveProposedText =
                        entry.status === "pending" && liveProposal
                          ? liveProposal.draft.kind === "delete-section"
                            ? ""
                            : getProposalPreviewText(liveProposal.draft)
                          : undefined;
                      return (
                        <ActivityRow
                          key={entry.id}
                          entry={entry}
                          warmDiffs={warmDiffs}
                          liveExistingContent={liveExistingContent}
                          liveProposedText={liveProposedText}
                        />
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
            {hasMore ? (
              <div className="mt-3">
                <button
                  type="button"
                  onClick={() =>
                    setVisibleCount((current) => current + ACTIVITY_PAGE_SIZE)
                  }
                  className="w-full rounded-md border border-[var(--creed-border)] bg-[var(--creed-surface)] px-3 py-2 text-sm font-medium text-[var(--creed-text-secondary)] transition-colors hover:bg-[var(--creed-surface-raised)] hover:text-[var(--creed-text-primary)]"
                >
                  Load more · {filteredAll.length - visibleCount} remaining
                </button>
              </div>
            ) : null}
          </div>
        ) : (
          <ActivityEmptyState
            label={
              creedType === "shared"
                ? "Nothing here yet"
                : "No agent activity yet"
            }
          />
        )}
      </ScrollArea>
    </div>
  );
});

const activityDiffCache = new Map<
  string,
  { before: string; after: string; diff: CreedDiff }
>();

// Prepare mounted activity rows during idle time, including while the rail is
// closed, without diffing the entire history during the editor's first paint.
type ActivityIdleDeadline = { timeRemaining: () => number };
const activityDiffQueue: Array<() => void> = [];
let activityDiffDrainScheduled = false;

function drainActivityDiffQueue(deadline?: ActivityIdleDeadline) {
  activityDiffDrainScheduled = false;
  let ran = 0;
  while (activityDiffQueue.length) {
    activityDiffQueue.shift()?.();
    ran += 1;
    const hasBudget = deadline ? deadline.timeRemaining() > 4 : ran < 3;
    if (!hasBudget) break;
  }

  if (activityDiffQueue.length) {
    scheduleActivityDiffDrain();
  }
}

function scheduleActivityDiffDrain() {
  if (activityDiffDrainScheduled) return;
  activityDiffDrainScheduled = true;

  const idle = (
    window as Window & {
      requestIdleCallback?: (
        callback: (deadline: ActivityIdleDeadline) => void,
        options?: { timeout: number },
      ) => number;
    }
  ).requestIdleCallback;

  if (idle) {
    idle((deadline) => drainActivityDiffQueue(deadline), { timeout: 600 });
    return;
  }

  window.setTimeout(() => drainActivityDiffQueue(), 60);
}

function enqueueActivityDiff(task: () => void) {
  activityDiffQueue.push(task);
  scheduleActivityDiffDrain();
}

// Placeholder bar for activity content that is still being diffed. Sized in the
// caller so it can stand in for a badge or a line of copy.
function ActivitySkeletonBar({ className }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "block animate-pulse rounded-[3px] bg-[var(--creed-border)] motion-reduce:animate-none",
        className,
      )}
    />
  );
}

// Stand-in for the +N/−N pair on a collapsed card. Matching the badges' height
// and rough width keeps the row from shifting when the real numbers land.
function ActivityStatsSkeleton() {
  return (
    <span className="inline-flex items-center gap-1">
      <span className="text-[var(--creed-text-tertiary)]">·</span>
      <ActivitySkeletonBar className="h-[11px] w-7" />
      <ActivitySkeletonBar className="h-[11px] w-8" />
    </span>
  );
}

// Stand-in for the expanded diff body. Ragged widths on the last line so it
// reads as a paragraph of prose rather than a filled block.
function ActivityDiffSkeleton() {
  return (
    <span aria-hidden="true" className="block space-y-2 py-1">
      <ActivitySkeletonBar className="h-3 w-full" />
      <ActivitySkeletonBar className="h-3 w-[92%]" />
      <ActivitySkeletonBar className="h-3 w-[64%]" />
    </span>
  );
}

const ActivityRow = memo(function ActivityRow({
  entry,
  warmDiffs,
  liveExistingContent,
  liveProposedText,
}: {
  entry: ActivityEntry;
  warmDiffs: boolean;
  liveExistingContent?: string;
  liveProposedText?: string;
}) {
  const [open, setOpen] = useState(false);
  const [diffReady, setDiffReady] = useState(false);
  const diffFrameRef = useRef<number | null>(null);
  const agentNames =
    entry.actorType === "agent"
      ? uniqueAgentNames([entry.agentIdentity ?? entry.actor])
      : [];

  // Reuse the in-app diff machinery so activity cards match inline proposals.
  // For pending entries the parent feeds us the same live values the inline
  // card uses; for accepted/rejected/stale entries we fall back to the
  // snapshot stored on the entry.
  // A live pending diff is useful only as a complete pair. During state
  // reconciliation the proposal or section can briefly be missing; mixing one
  // live value with one persisted value can collapse a real change into an
  // empty diff. Keep the stored snapshot intact until both live sides exist.
  const hasCompleteLiveDiff =
    liveExistingContent !== undefined && liveProposedText !== undefined;
  const beforeForDiff = hasCompleteLiveDiff
    ? liveExistingContent
    : (entry.beforeText ?? "");
  const afterForDiff = hasCompleteLiveDiff
    ? liveProposedText
    : (entry.afterText ?? "");
  const hasLegacyDeletionSnapshot =
    beforeForDiff.startsWith("Keep ") && afterForDiff.startsWith("Delete ");
  const diff = useMemo(() => {
    const cached = activityDiffCache.get(entry.id);
    if (cached?.before === beforeForDiff && cached.after === afterForDiff) {
      return cached.diff;
    }
    if (!diffReady) return null;
    const nextDiff = computeCreedDiff(beforeForDiff, afterForDiff);
    activityDiffCache.set(entry.id, {
      before: beforeForDiff,
      after: afterForDiff,
      diff: nextDiff,
    });
    return nextDiff;
  }, [afterForDiff, beforeForDiff, diffReady, entry.id]);
  const hasTextualChange = diff ? hasDiffChanges(diff) : false;
  useEffect(
    () => () => {
      if (diffFrameRef.current !== null) {
        window.cancelAnimationFrame(diffFrameRef.current);
      }
    },
    [],
  );
  // Warm summaries before the rail opens while leaving first paint responsive.
  useEffect(() => {
    if (!warmDiffs || diffReady) return;

    let cancelled = false;
    enqueueActivityDiff(() => {
      if (cancelled) return;
      startTransition(() => setDiffReady(true));
    });
    return () => {
      cancelled = true;
    };
  }, [diffReady, warmDiffs]);
  const toggleOpen = useCallback(() => {
    const nextOpen = !open;
    setOpen(nextOpen);
    if (!nextOpen || diffReady || diffFrameRef.current !== null) return;
    diffFrameRef.current = window.requestAnimationFrame(() => {
      diffFrameRef.current = null;
      startTransition(() => setDiffReady(true));
    });
  }, [diffReady, open]);
  return (
    <div className="creed-press-card group rounded-lg border border-[var(--creed-border)] bg-[var(--creed-surface)] p-3 transition-colors duration-150 hover:bg-[var(--creed-surface-raised)]">
      <button
        type="button"
        className="block w-full text-left"
        onClick={toggleOpen}
      >
        <div className="flex items-start gap-2.5">
          {entry.actorType === "agent" ? (
            <AgentIconStack
              agents={agentNames}
              variant="inline"
              className="ml-0.5 mt-[2px] shrink-0"
              itemClassName="h-4 w-4"
            />
          ) : (
            <ActivityActorAvatar
              avatarUrl={entry.avatarUrl}
              initials={entry.avatarInitials}
              name={entry.actor}
            />
          )}
          <div className="min-w-0 flex-1">
            <div className="flex min-w-0 flex-1 items-center gap-2">
              <div className="min-w-0 truncate text-[13px] font-medium leading-5 text-[var(--creed-text-primary)]">
                {entry.actor}
              </div>
              <span
                className={cn(
                  "shrink-0 rounded-[6px] px-2 py-0.5 text-[10px] font-medium",
                  getActivityStatusStyles(entry.status),
                )}
              >
                {ACTIVITY_STATUS_LABELS[entry.status]}
              </span>
              <span
                className="inline-flex shrink-0 text-[var(--creed-text-tertiary)] transition-[color,rotate] duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:text-[var(--creed-text-primary)]"
                style={{ rotate: open ? "0deg" : "-90deg" }}
              >
                <ChevronDown className="h-3.5 w-3.5" />
              </span>
            </div>
            <div className="mt-1 flex items-center gap-2 text-[12px] leading-5 text-[var(--creed-text-secondary)]">
              <span className="truncate" style={{ color: accentColorMap[entry.accent] }}>{entry.sectionName}</span>
              {!diff ? (
                <ActivityStatsSkeleton />
              ) : !hasLegacyDeletionSnapshot && hasTextualChange && diff ? (
                <span className="inline-flex items-center gap-1">
                  <span className="mr-1 text-[var(--creed-text-tertiary)]">
                    ·
                  </span>
                  <DiffBadge tone="added" count={diff.added} />
                  <DiffBadge tone="removed" count={diff.removed} />
                </span>
              ) : null}
            </div>
          </div>
          <div className="shrink-0 text-[13px] font-medium leading-5 text-[var(--creed-text-tertiary)]">
            {(() => {
              const relative = formatRelativeTime(
                entry.createdAt,
                entry.timeLabel,
              );
              return relative === "now" ? "Just now" : `${relative} ago`;
            })()}
          </div>
        </div>
      </button>

      <AnimatePresence>
        {open ? (
          <motion.div
            initial={{ marginTop: 0 }}
            animate={{ marginTop: 12 }}
            exit={{ marginTop: 0 }}
            transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden"
          >
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
              className="overflow-hidden"
            >
              <div className="-mx-3 border-t border-[var(--creed-border)]" />
              <div className="creed-scrollbar creed-diff-block -mx-3 max-h-72 overflow-y-auto pt-2.5 leading-[1.6]">
                {!diff ? (
                  <ActivityDiffSkeleton />
                ) : hasLegacyDeletionSnapshot ? (
                  <span className="text-[var(--creed-text-secondary)]">
                    {entry.summary || `Deleted ${entry.sectionName}`}
                  </span>
                ) : hasTextualChange && diff ? (
                  <CreedDiffView diff={diff} />
                ) : (
                  // Fall back to the entry's summary so structural events
                  // (e.g. renames / recolors) still tell the user what
                  // happened even when the textual diff is empty.
                  <span className="text-[var(--creed-text-secondary)]">
                    {entry.summary || "No textual change"}
                  </span>
                )}
              </div>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
});
