import { FeedbackMenuItem } from "@/components/creed/feedback-menu";
import { ShortcutsDialog } from "@/components/creed/shortcuts-dialog";
import { MenuIcon } from "@/components/ui/menu";
import {
  SIDEBAR_COLLAPSE_WIDTH,
  SIDEBAR_EXPAND_WIDTH,
  sidebarAvailableAt,
} from "@/lib/sidebar-layout";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import Link from "@/lib/native/link";
import { useAppNavigate, useAppPath } from "@/components/creed/app-navigation";
import { Check, Keyboard, Plus, X } from "lucide-react";
import { Reorder } from "motion/react";

import { ConnectIcon } from "@/components/ui/connect";
import { ContrastIcon } from "@/components/ui/contrast";

import { CpuIcon } from "@/components/ui/cpu";
import { FileTextIcon } from "@/components/ui/file-text";

import {
  PanelLeftCloseIcon,
  type PanelLeftCloseIconHandle,
} from "@/components/ui/panel-left-close";
import {
  PanelLeftOpenIcon,
  type PanelLeftOpenIconHandle,
} from "@/components/ui/panel-left-open";
import { SettingsIcon } from "@/components/ui/settings";
import {
  ArrowUpRightIcon,
  type ArrowUpRightIconHandle,
} from "@/components/ui/arrow-up-right";

import { useAnimatedIconControls } from "@/components/creed/animated-icon-controls";
import { useTheme } from "@/components/creed/theme-provider";

import {
  DROPDOWN_CONTENT_CLASS,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator";
import {
  accentColorMap,
  isAccentKey,
  normalizeLegacyProposalDraft,
  type CreedSection,
  type CreedState,
} from "@/lib/creed/creed-data";
import { cn } from "@/components/ui/utils";
import { ACCOUNT_MENU_ITEM_CLASS } from "@/lib/account-menu";
import { proposalTargetsLiveSection } from "@/lib/proposal-state";
import {
  preloadConnectionsScreen,
  preloadFileScreen,
  preloadSettingsScreen,
} from "@/components/creed/file-screen-loader";
import { WindowToolbarContext } from "@/components/creed/window-toolbar";
import { CreedPanel, PANEL_OPEN_EVENT } from "@/components/creed/panel";
import {
  getAgentRunnerServerSnapshot,
  getAgentRunnerSnapshot,
  subscribeAgentRunner,
} from "@/lib/panel/agent-runner";
import { SearchIcon, type SearchIconHandle } from "@/components/ui/search";
import {
  useCreedActions,
  useCreedStateSelector,
} from "@/components/creed/creed-provider";
import { preloadSettingsData } from "@/components/creed/settings-preload";
import { preloadMcpHealth } from "@/components/creed/mcp-health-preload";
import { ShortcutKey } from "@/components/creed/shortcut-key";
import { SwapLabel } from "@/components/creed/swap-label";
import {
  FileSectionNavButton,
  SIDEBAR_COLLAPSE_MOTION,
  sidebarLabelRevealClass,
  sidebarNavRowClass,
  sidebarIconSlotClass,
} from "@/components/creed/file-presentation";

const FILE_NAV_INTENT_KEY = "creed:file-nav-intent";

function CommunityMenuItem() {
  const arrow = useRef<ArrowUpRightIconHandle>(null);

  return (
    <DropdownMenuItem asChild className={ACCOUNT_MENU_ITEM_CLASS}>
      <a
        className="group/community"
        href="https://join.hpbrn.com"
        target="_blank"
        rel="noreferrer"
        onMouseEnter={() => arrow.current?.startAnimation()}
        onMouseLeave={() => arrow.current?.stopAnimation()}
      >
        <DiscordMark className="h-3.5 w-3.5 group-hover/community:animate-[creed-home-wiggle_400ms_ease-in-out] motion-reduce:animate-none" />
        <span className="flex-1">Community</span>
        <ArrowUpRightIcon
          ref={arrow}
          size={14}
          className="text-[var(--creed-text-tertiary)] transition-colors group-hover/community:text-[var(--creed-text-primary)] group-focus/community:text-[var(--creed-text-primary)]"
        />
      </a>
    </DropdownMenuItem>
  );
}

const SIDEBAR_COLLAPSED_KEY = "creed:sidebar-collapsed";
const SIDEBAR_PRESS_CLASS =
  "creed-press-surface";

const SIDEBAR_NAV_PRESS_CLASS =
  "creed-press-surface";

function sameShellState(left: CreedState, right: CreedState) {
  return (
    left.creedId === right.creedId &&
    left.creedType === right.creedType &&
    left.shared === right.shared &&
    left.proposals === right.proposals &&
    left.settings === right.settings &&
    left.user === right.user
  );
}

type ShellProps = {
  children: ReactNode;
  userName: string;
  avatarInitials: string;
  avatarUrl?: string;
  sections: CreedSection[];
  pendingProposalSectionIds?: string[];
};

type ShellFileActions = {
  onAddSection?: () => void;
  onSectionSelect?: (sectionId: string) => void;
  onProposalSelect?: (proposalId: string) => void;
  onSetActivityOpen?: (open: boolean) => void;
};

type ShellActionsContextValue = {
  registerFileActions: (actions: ShellFileActions) => () => void;
  setActiveSectionId: (sectionId: string | null) => void;
};

const ShellActionsContext = createContext<ShellActionsContextValue | null>(
  null,
);

const navItems = [
  { href: "/file", label: "File", icon: FileTextIcon },
  { href: "/connections", label: "Connections", icon: ConnectIcon },
  { href: "/settings", label: "Settings", icon: SettingsIcon },
];

function ShellNavLink({
  item,
  active,
  collapsed,
  onNavigate,
}: {
  item: (typeof navItems)[number];
  active: boolean;
  collapsed: boolean;
  onNavigate: () => void;
}) {
  const Icon = item.icon;
  const { iconRef, start, settle, initialState } = useAnimatedIconControls(120);

  return (
    <Link
      href={item.href}
      prefetch={true}
      className={cn(
        // Sizing kept identical to the section nav buttons below this row so
        // the two stacks read as one continuous list. On mobile each button is
        // a centred square (h-8 w-8) so the selected-state background reads as
        // a square, not a slight rectangle; lg restores the full-width row.
        "flex h-8 w-8 mx-auto items-center justify-center overflow-hidden rounded-sm text-[14px] font-medium text-[var(--creed-text-secondary)] hover:bg-[var(--creed-surface-raised)] hover:text-[var(--creed-text-primary)]",
        SIDEBAR_NAV_PRESS_CLASS,
        sidebarNavRowClass(collapsed),
        active &&
          "bg-[var(--creed-surface-raised)] text-[var(--creed-text-primary)] hover:bg-[var(--creed-surface-raised)]",
      )}
      aria-current={active ? "page" : undefined}
      aria-label={item.label}
      onClick={(event) => {
        if (
          event.metaKey ||
          event.ctrlKey ||
          event.shiftKey ||
          event.altKey ||
          event.button !== 0 ||
          active
        ) {
          return;
        }
        event.preventDefault();
        onNavigate();
      }}
      onMouseEnter={() => {
        start();
        if (item.href === "/file") preloadFileScreen();
        if (item.href === "/connections") preloadConnectionsScreen();
        if (item.href === "/settings") preloadSettingsScreen();
      }}
      onMouseLeave={settle}
      onFocus={() => {
        if (item.href === "/file") preloadFileScreen();
        if (item.href === "/connections") preloadConnectionsScreen();
        if (item.href === "/settings") preloadSettingsScreen();
      }}
    >
      <span className={sidebarIconSlotClass(collapsed)}>
        <Icon
          ref={iconRef}
          size={14}
          initialState={initialState}
          className="inline-flex h-3.5 w-3.5 shrink-0 items-center justify-center leading-none"
        />
      </span>
      <span
        className={cn("inline", sidebarLabelRevealClass(collapsed))}
        aria-hidden={collapsed || undefined}
      >
        {item.label}
      </span>
    </Link>
  );
}

export function CreedShell({
  children,
  sections,
  pendingProposalSectionIds = [],
}: ShellProps) {
  const path = useAppPath();
  const [toolbarTarget, setToolbarTarget] = useState<HTMLDivElement | null>(
    null,
  );
  const navigate = useAppNavigate();
  const { reorderSections } = useCreedActions();
  const state = useCreedStateSelector((snapshot) => snapshot, sameShellState);
  const [profilePressed, setProfilePressed] = useState(false);
  const [accountHovered, setAccountHovered] = useState(false);
  const accountTriggerRef = useRef<HTMLButtonElement>(null);
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [accountPanel, setAccountPanel] = useState<
    "status" | "feedback" | null
  >(null);
  const searchIconRef = useRef<SearchIconHandle | null>(null);
  const closeSidebarIconRef = useRef<PanelLeftCloseIconHandle | null>(null);
  const openSidebarIconRef = useRef<PanelLeftOpenIconHandle | null>(null);
  const agentRun = useSyncExternalStore(
    subscribeAgentRunner,
    getAgentRunnerSnapshot,
    getAgentRunnerServerSnapshot,
  );
  const agentBusy =
    agentRun.status === "working" || agentRun.status === "applying";
  // The launcher badge doubles as the agent's background status light: blue
  // while working, green when the last run succeeded, red when it failed, and
  // back to the plain "K" badge when idle.
  const agentTile = agentBusy
    ? { bg: "var(--creed-accent)", label: "Creed is working" }
    : agentRun.status === "result"
      ? { bg: "#16A34A", label: "Creed finished" }
      : agentRun.status === "error"
        ? { bg: "#DC2626", label: "Creed hit an error" }
        : null;
  // Desktop sidebar collapse (S key). Width interpolates on the aside itself
  // (grid-template-columns does not). Persisted so the choice survives
  // reloads; read in an effect to keep SSR markup stable.
  const [preferredCollapsed, setCollapsed] = useState(false);
  const [sidebarAvailable, setSidebarAvailable] = useState(
    () => window.matchMedia("(min-width: 1024px)").matches,
  );
  const collapsed = preferredCollapsed || !sidebarAvailable;
  useEffect(() => {
    const collapseMedia = window.matchMedia(
      `(min-width: ${SIDEBAR_COLLAPSE_WIDTH}px)`,
    );
    const expandMedia = window.matchMedia(
      `(min-width: ${SIDEBAR_EXPAND_WIDTH}px)`,
    );
    const update = () =>
      setSidebarAvailable((previous) =>
        sidebarAvailableAt(window.innerWidth, previous),
      );
    collapseMedia.addEventListener("change", update);
    expandMedia.addEventListener("change", update);
    return () => {
      collapseMedia.removeEventListener("change", update);
      expandMedia.removeEventListener("change", update);
    };
  }, []);

  useEffect(() => {
    setCollapsed(window.localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === "1");
  }, []);

  const toggleSidebar = useCallback(() => {
    if (!window.matchMedia("(min-width: 1024px)").matches) return;
    if (!sidebarAvailable) {
      setSidebarAvailable(true);
      setCollapsed(false);
      try {
        window.localStorage.setItem(SIDEBAR_COLLAPSED_KEY, "0");
      } catch {}
      return;
    }
    setCollapsed((current) => {
      const next = !current;
      try {
        window.localStorage.setItem(SIDEBAR_COLLAPSED_KEY, next ? "1" : "0");
      } catch {}
      return next;
    });
  }, [sidebarAvailable]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (
        (event.key !== "s" && event.key !== "S") ||
        event.metaKey ||
        event.ctrlKey ||
        event.altKey ||
        event.shiftKey
      )
        return;
      const target = event.target as HTMLElement | null;
      if (
        !target ||
        /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName) ||
        target.isContentEditable
      )
        return;
      if (event.isComposing || event.repeat || event.defaultPrevented) return;
      if (!window.matchMedia("(min-width: 1024px)").matches) return;
      event.preventDefault();
      toggleSidebar();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [toggleSidebar]);
  const fileActionsRef = useRef<ShellFileActions>({});
  const [activeSectionId, setActiveSectionId] = useState<string | null>(null);
  const visibleSidebarSections = useMemo(
    () => sections.filter((section) => !section.archived),
    [sections],
  );
  const canonicalSidebarOrder = useMemo(
    () => visibleSidebarSections.map((section) => section.id),
    [visibleSidebarSections],
  );
  const canonicalSidebarOrderRef = useRef(canonicalSidebarOrder);
  canonicalSidebarOrderRef.current = canonicalSidebarOrder;
  const [sidebarOrder, setSidebarOrder] = useState<string[] | null>(null);
  const sidebarOrderRef = useRef<string[] | null>(null);
  const orderedSidebarSections = useMemo(() => {
    if (!sidebarOrder) return visibleSidebarSections;
    const sectionsById = new Map(
      visibleSidebarSections.map((section) => [section.id, section]),
    );
    return sidebarOrder
      .map((id) => sectionsById.get(id))
      .filter((section): section is CreedSection => Boolean(section));
  }, [sidebarOrder, visibleSidebarSections]);
  const canReorderSidebar =
    state.creedType !== "shared" ||
    state.shared?.myRole === "owner" ||
    state.shared?.myRole === "admin";

  const beginSidebarReorder = useCallback(() => {
    const initialOrder = canonicalSidebarOrderRef.current;
    sidebarOrderRef.current = initialOrder;
  }, []);

  const previewSidebarReorder = useCallback((nextOrder: string[]) => {
    if (nextOrder.join("|") === sidebarOrderRef.current?.join("|")) return;
    sidebarOrderRef.current = nextOrder;
    setSidebarOrder(nextOrder);
  }, []);

  const finishSidebarReorder = useCallback(() => {
    const finalOrder = sidebarOrderRef.current;
    if (!finalOrder) return;

    if (finalOrder.join("|") !== canonicalSidebarOrderRef.current.join("|")) {
      reorderSections(finalOrder);
      return;
    }

    sidebarOrderRef.current = null;
    setSidebarOrder(null);
  }, [reorderSections]);

  useEffect(() => {
    if (
      !sidebarOrder ||
      sidebarOrder.join("|") !== canonicalSidebarOrder.join("|")
    ) {
      return;
    }

    sidebarOrderRef.current = null;
    setSidebarOrder(null);
  }, [canonicalSidebarOrder, sidebarOrder]);
  const registerFileActions = useCallback((actions: ShellFileActions) => {
    fileActionsRef.current = actions;

    return () => {
      if (fileActionsRef.current === actions) {
        fileActionsRef.current = {};
      }
    };
  }, []);
  const shellActions = useMemo<ShellActionsContextValue>(
    () => ({
      registerFileActions,
      setActiveSectionId,
    }),
    [registerFileActions],
  );
  const pendingProposalCountBySection = useMemo(() => {
    const counts = new Map<string, number>();
    for (const proposal of state.proposals) {
      if (proposal.status !== "pending") continue;
      if (!proposalTargetsLiveSection(proposal, sections)) continue;
      counts.set(proposal.sectionId, (counts.get(proposal.sectionId) ?? 0) + 1);
    }
    if (pendingProposalSectionIds.length && counts.size === 0) {
      // Fall back to the boolean signal from the parent if state.proposals
      // hasn't hydrated yet.
      for (const id of pendingProposalSectionIds) {
        const section = sections.find((item) => item.id === id);
        if (section?.archived) continue;
        counts.set(id, 1);
      }
    }
    return counts;
  }, [state.proposals, pendingProposalSectionIds, sections]);

  // Sidebar previews for structural proposals. Delete-section rows keep
  // the real section in the list; new-section proposals render a phantom
  // row so the proposed section is visible alongside real ones.
  const pendingDeleteBySectionId = useMemo(() => {
    const ids = new Map<string, string>();
    for (const proposal of state.proposals) {
      if (proposal.status !== "pending") continue;
      if (!proposalTargetsLiveSection(proposal, sections)) continue;
      const draft = proposal.draft
        ? normalizeLegacyProposalDraft(proposal.draft)
        : null;
      if (draft?.kind === "delete-section" && !ids.has(proposal.sectionId)) {
        ids.set(proposal.sectionId, proposal.id);
      }
    }
    return ids;
  }, [state.proposals, sections]);
  const pendingNewSections = useMemo(() => {
    const rows: Array<{ id: string; name: string; accent: string }> = [];
    for (const proposal of state.proposals) {
      if (proposal.status !== "pending") continue;
      const draft = proposal.draft
        ? normalizeLegacyProposalDraft(proposal.draft)
        : null;
      if (draft?.kind !== "new-section") continue;
      const accentKey = isAccentKey(draft.accent)
        ? draft.accent
        : proposal.accent;
      rows.push({
        id: proposal.id,
        name: draft.name?.trim() || "New section",
        accent: accentColorMap[accentKey],
      });
    }
    return rows;
  }, [state.proposals]);

  useEffect(() => {
    preloadSettingsData({ creedId: state.creedId });
    if (sections.length) {
      preloadMcpHealth("all", state.creedId ?? "");
    }
  }, [sections.length, state.creedId]);

  function setFileIntent(
    intent:
      | { type: "section"; sectionId: string }
      | { type: "compose" }
      | { type: "proposal"; proposalId: string }
      | { type: "activity"; open: boolean },
  ) {
    if (typeof window === "undefined") {
      return;
    }

    window.sessionStorage.setItem(FILE_NAV_INTENT_KEY, JSON.stringify(intent));
  }

  function handleSectionClick(sectionId: string) {
    if (path === "/file" && fileActionsRef.current.onSectionSelect) {
      fileActionsRef.current.onSectionSelect(sectionId);
      return;
    }

    setFileIntent({ type: "section", sectionId });
    navigate("/file");
  }

  function handleAddSectionClick() {
    if (path === "/file" && fileActionsRef.current.onAddSection) {
      fileActionsRef.current.onAddSection();
      return;
    }

    setFileIntent({ type: "compose" });
    navigate("/file");
  }

  function handleProposalClick(proposalId: string) {
    if (path === "/file" && fileActionsRef.current.onProposalSelect) {
      fileActionsRef.current.onProposalSelect(proposalId);
      return;
    }

    setFileIntent({ type: "proposal", proposalId });
    navigate("/file");
  }

  function handleActivityClick(open: boolean) {
    if (path === "/file" && fileActionsRef.current.onSetActivityOpen) {
      fileActionsRef.current.onSetActivityOpen(open);
      return;
    }

    setFileIntent({ type: "activity", open });
    navigate("/file");
  }

  return (
    <ShellActionsContext.Provider value={shellActions}>
      <WindowToolbarContext.Provider value={toolbarTarget}>
        <div className="creed-window-layout flex h-full flex-col overflow-hidden bg-[var(--creed-surface)]">
          <header
            className="creed-window-toolbar flex h-12 shrink-0 items-center gap-3 pr-2"
            data-tauri-drag-region
          >
            <div className="creed-traffic-lights-card" aria-hidden="true" />
            <div className="creed-sidebar-controls flex shrink-0 items-center gap-3 mr-2">
              <button
                type="button"
                onClick={toggleSidebar}
                aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
                aria-controls="creed-sidebar"
                aria-expanded={!collapsed}
                onMouseEnter={() =>
                  (collapsed
                    ? openSidebarIconRef
                    : closeSidebarIconRef
                  ).current?.startAnimation()
                }
                onMouseLeave={() =>
                  (collapsed
                    ? openSidebarIconRef
                    : closeSidebarIconRef
                  ).current?.stopAnimation()
                }
                className={cn(
                  "group flex h-8 w-8 shrink-0 items-center justify-center rounded-sm text-[var(--creed-text-secondary)] hover:bg-[var(--creed-surface-raised)] hover:text-[var(--creed-text-primary)]",
                  SIDEBAR_PRESS_CLASS,
                )}
              >
                {collapsed ? (
                  <PanelLeftOpenIcon ref={openSidebarIconRef} size={16} />
                ) : (
                  <PanelLeftCloseIcon ref={closeSidebarIconRef} size={16} />
                )}
              </button>
              <ShortcutKey>S</ShortcutKey>
            </div>
            <div
              ref={setToolbarTarget}
              className="flex min-w-0 flex-1 items-center"
              data-tauri-drag-region
            />
          </header>
          <div className="flex min-h-0 flex-1 pb-2 pr-2">
            <aside
              id="creed-sidebar"
              className={cn(
                "h-full shrink-0 overflow-hidden bg-[var(--creed-surface)] px-2 py-0 transition-[width] motion-reduce:transition-none",
                SIDEBAR_COLLAPSE_MOTION,
                collapsed ? "w-12" : "w-[220px]",
              )}
            >
              <div className="flex h-full flex-col">
                <nav className="space-y-1">
                  <button
                    type="button"
                    onClick={() =>
                      window.dispatchEvent(new Event(PANEL_OPEN_EVENT))
                    }
                    onMouseEnter={() => searchIconRef.current?.startAnimation()}
                    onMouseLeave={() => searchIconRef.current?.stopAnimation()}
                    className={cn(
                      "group mx-auto flex h-8 w-8 items-center justify-center overflow-hidden rounded-sm text-[14px] font-medium text-[var(--creed-text-secondary)] hover:bg-[var(--creed-surface-raised)] hover:text-[var(--creed-text-primary)]",
                      SIDEBAR_PRESS_CLASS,
                      sidebarNavRowClass(collapsed),
                    )}
                    aria-label="Search"
                  >
                    <span
                      className={cn(
                        "relative",
                        sidebarIconSlotClass(collapsed),
                      )}
                    >
                      <SearchIcon
                        ref={searchIconRef}
                        size={14}
                        className="inline-flex h-3.5 w-3.5 shrink-0 items-center justify-center leading-none"
                      />
                      {/* Agent background status: a small dot on the icon, coloured
                      like the tile below. Hidden on
                      the expanded row, where the tile takes over. */}
                      {agentTile ? (
                        <span
                          className={cn(
                            "absolute -right-1 -top-1 h-1.5 w-1.5 rounded-full",
                            !collapsed && "lg:hidden",
                          )}
                          style={{ backgroundColor: agentTile.bg }}
                        />
                      ) : null}
                    </span>
                    <span
                      className={cn(
                        "flex-1 text-left inline",
                        sidebarLabelRevealClass(collapsed),
                      )}
                      aria-hidden={collapsed || undefined}
                    >
                      Search
                    </span>
                    {agentTile ? (
                      // Sits exactly where the K badge would: same size and slot,
                      // but a solid status tile with a white glyph. Blue + agent
                      // icon while working, green tick on success, red cross on
                      // failure. Only the agent runs in the background.
                      <span
                        className={cn(
                          "h-5 w-5 shrink-0 items-center justify-center rounded text-white inline-flex",
                          sidebarLabelRevealClass(collapsed),
                        )}
                        style={{ backgroundColor: agentTile.bg }}
                        aria-label={agentTile.label}
                      >
                        {agentBusy ? (
                          <CpuIcon
                            size={12}
                            className="inline-flex h-3 w-3 items-center justify-center leading-none"
                          />
                        ) : agentRun.status === "result" ? (
                          <Check className="h-3 w-3" strokeWidth={2.5} />
                        ) : (
                          <X className="h-3 w-3" strokeWidth={2.5} />
                        )}
                      </span>
                    ) : (
                      <ShortcutKey
                        className={cn(
                          "shrink-0 inline-flex",
                          sidebarLabelRevealClass(collapsed),
                        )}
                      >
                        K
                      </ShortcutKey>
                    )}
                  </button>
                  {navItems.map((item) => (
                    <ShellNavLink
                      key={item.href}
                      item={item}
                      active={path === item.href}
                      collapsed={collapsed}
                      onNavigate={() => navigate(item.href)}
                    />
                  ))}
                </nav>

                <Separator className="my-4 bg-[var(--creed-border)]" />

                <div className="relative flex h-4 items-center">
                  <span
                    className={cn(
                      "absolute left-3 whitespace-nowrap text-[13px] font-medium text-[var(--creed-text-tertiary)] transition-opacity motion-reduce:transition-none",
                      SIDEBAR_COLLAPSE_MOTION,
                      collapsed ? "opacity-0" : "opacity-100",
                    )}
                    aria-hidden={collapsed || undefined}
                  >
                    Sections
                  </span>
                  <span
                    aria-hidden="true"
                    className={cn(
                      "absolute left-[9px] top-1/2 h-px w-3.5 -translate-y-1/2 rounded-full bg-[var(--creed-border)] transition-opacity motion-reduce:transition-none duration-[260ms] ease-[cubic-bezier(0.22,1,0.36,1)]",
                      collapsed ? "opacity-100" : "opacity-0",
                    )}
                  />
                </div>
                <div className="mt-2 min-h-0 flex-1 overflow-y-auto creed-scrollbar">
                  <div className="flex flex-col gap-1">
                    <Reorder.Group
                      axis="y"
                      values={sidebarOrder ?? canonicalSidebarOrder}
                      onReorder={previewSidebarReorder}
                      className="flex flex-col gap-1"
                    >
                      {orderedSidebarSections.map(
                        (section, reorderPosition) => {
                          const pendingCount =
                            pendingProposalCountBySection.get(section.id) ?? 0;
                          const deleteProposalId = pendingDeleteBySectionId.get(
                            section.id,
                          );
                          const isActive =
                            path === "/file" && activeSectionId === section.id;
                          return (
                            <FileSectionNavButton
                              key={section.id}
                              sectionId={section.id}
                              name={section.name}
                              accent={accentColorMap[section.accent]}
                              active={isActive}
                              pendingCount={pendingCount}
                              pendingDelete={Boolean(deleteProposalId)}
                              collapsed={collapsed}
                              reorderPosition={reorderPosition}
                              canDrag={canReorderSidebar}
                              onDragStateChange={(dragging) =>
                                dragging
                                  ? beginSidebarReorder()
                                  : finishSidebarReorder()
                              }
                              onClick={() =>
                                deleteProposalId
                                  ? handleProposalClick(deleteProposalId)
                                  : handleSectionClick(section.id)
                              }
                            />
                          );
                        },
                      )}
                    </Reorder.Group>

                    {/* Phantom rows for pending new-section proposals. Kept in
                  the same gap-1 stack as real rows so they do not sit flush
                  against the last existing section. */}
                    {pendingNewSections.map((row) => {
                      const isActive =
                        activeSectionId === row.id && path === "/file";
                      return (
                        <FileSectionNavButton
                          key={row.id}
                          name={row.name}
                          accent={row.accent}
                          active={isActive}
                          pendingCount={1}
                          pendingCreate
                          collapsed={collapsed}
                          onClick={() => handleProposalClick(row.id)}
                        />
                      );
                    })}
                  </div>

                  <button
                    type="button"
                    onClick={handleAddSectionClick}
                    className={cn(
                      "mx-auto mt-1 flex h-8 w-8 items-center justify-center overflow-hidden rounded-sm text-left text-[14px] text-[var(--creed-text-tertiary)] hover:bg-[var(--creed-surface-raised)] hover:text-[var(--creed-text-primary)]",
                      SIDEBAR_PRESS_CLASS,
                      sidebarNavRowClass(collapsed),
                    )}
                    aria-label="Add section"
                  >
                    <span className={sidebarIconSlotClass(collapsed)}>
                      <Plus
                        className="h-3.5 w-3.5 max-w-none shrink-0"
                        strokeWidth={1.8}
                      />
                    </span>
                    <span
                      className={cn(
                        "inline",
                        sidebarLabelRevealClass(collapsed),
                      )}
                      aria-hidden={collapsed || undefined}
                    >
                      Add section
                    </span>
                  </button>
                </div>

                <div className="mt-auto">
                  <Separator className="my-4 bg-[var(--creed-border)]" />
                  {
                    <DropdownMenu
                      open={accountMenuOpen}
                      onOpenChange={(open) => {
                        setAccountMenuOpen(open);
                        if (open) return;
                        setAccountPanel(null);
                        // The dismiss layer steals :hover. Re-read it after the
                        // layer is gone so the plate does not flash empty.
                        requestAnimationFrame(() => {
                          requestAnimationFrame(() => {
                            setAccountHovered(
                              Boolean(
                                accountTriggerRef.current?.matches(":hover"),
                              ),
                            );
                          });
                        });
                      }}
                    >
                      <DropdownMenuTrigger asChild>
                        <button
                          type="button"
                          aria-label="Menu"
                          ref={accountTriggerRef}
                          className="group/account relative block h-8 w-full bg-transparent text-[14px] font-medium text-[var(--creed-text-secondary)] transition-colors duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] hover:text-[var(--creed-text-primary)] focus-visible:text-[var(--creed-text-primary)] aria-expanded:text-[var(--creed-text-primary)]"
                          onPointerEnter={() => setAccountHovered(true)}
                          onPointerLeave={() => {
                            if (!accountMenuOpen) setAccountHovered(false);
                          }}
                          onPointerDownCapture={(event) => {
                            if (event.button !== 0) return;
                            setProfilePressed(true);
                            event.currentTarget.setPointerCapture(
                              event.pointerId,
                            );
                          }}
                          onPointerUpCapture={() => setProfilePressed(false)}
                          onPointerCancel={() => setProfilePressed(false)}
                          onLostPointerCapture={() => setProfilePressed(false)}
                        >
                          {/* The trigger box stays still so Radix keeps the menu
                        pinned. The painted plate is this child, which presses. */}
                          <span
                            data-pressed={profilePressed}
                            className={cn(
                              "flex h-full w-full min-w-0 items-center justify-center overflow-hidden rounded-sm hover:bg-[var(--creed-surface-raised)] group-aria-expanded/account:bg-[var(--creed-surface-raised)]",
                              SIDEBAR_PRESS_CLASS,
                              sidebarNavRowClass(collapsed),
                              accountHovered &&
                                "bg-[var(--creed-surface-raised)]",
                            )}
                          >
                            <span className={sidebarIconSlotClass(collapsed)}>
                              <MenuIcon
                                size={14}
                                open={accountMenuOpen}
                                aria-hidden="true"
                                className="inline-flex h-3.5 w-3.5 shrink-0 items-center justify-center leading-none"
                              />
                            </span>
                            <span
                              className={cn(
                                "flex-1 text-left text-sm font-medium inline",
                                sidebarLabelRevealClass(collapsed),
                                collapsed && "lg:absolute lg:max-h-0",
                              )}
                              aria-hidden={collapsed || undefined}
                            >
                              Menu
                            </span>
                          </span>
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent
                        align="start"
                        className={cn(
                          DROPDOWN_CONTENT_CLASS,
                          // Collapsed rail: the trigger is a 32px square, so the
                          // trigger-width menu would be unusably narrow.
                          collapsed
                            ? "w-48"
                            : "w-(--radix-dropdown-menu-trigger-width)",
                        )}
                      >
                        <FeedbackMenuItem
                          open={accountPanel === "feedback"}
                          onOpenChange={(open) =>
                            setAccountPanel((current) =>
                              open
                                ? "feedback"
                                : current === "feedback"
                                  ? null
                                  : current,
                            )
                          }
                        />
                        <CommunityMenuItem />
                        <DropdownMenuItem
                          className={cn(ACCOUNT_MENU_ITEM_CLASS, "group/shortcuts justify-between")}
                          onSelect={() => setShortcutsOpen(true)}
                        >
                          <span className="flex items-center gap-2">
                            <Keyboard className="h-3.5 w-3.5 group-data-[highlighted]/shortcuts:animate-[creed-home-wiggle_400ms_ease-in-out] motion-reduce:animate-none" />
                            Shortcuts
                          </span>
                          <ShortcutKey className="translate-x-0.5">X</ShortcutKey>
                        </DropdownMenuItem>
                        <ThemeToggleMenuItem />
                      </DropdownMenuContent>
                    </DropdownMenu>
                  }
                </div>
              </div>
            </aside>

            <main className="creed-window-main h-full min-w-0 flex-1 overflow-hidden">
              {children}
            </main>
          </div>
        </div>
      </WindowToolbarContext.Provider>

      <ShortcutsDialog open={shortcutsOpen} onOpenChange={setShortcutsOpen} />
      <CreedPanel
        onFileSection={handleSectionClick}
        onFileProposal={handleProposalClick}
        onAddSection={handleAddSectionClick}
        onSetActivity={handleActivityClick}
      />
    </ShellActionsContext.Provider>
  );
}

export function useCreedShellFileActions(actions: ShellFileActions) {
  const context = useContext(ShellActionsContext);

  useEffect(() => {
    if (!context) {
      return;
    }

    return context.registerFileActions(actions);
  }, [actions, context]);
}

export function useCreedShellActiveSection() {
  const context = useContext(ShellActionsContext);
  return context?.setActiveSectionId ?? (() => {});
}

function ThemeToggleMenuItem() {
  const { theme, toggleTheme } = useTheme();
  const { iconRef, start, settle } = useAnimatedIconControls(
    0,
    "theme-toggle-menu",
    600,
  );

  return (
    <DropdownMenuItem
      onSelect={(event) => {
        event.preventDefault();
        // On touch / dropdown clicks the cursor isn't a useful origin -
        // emit the reveal from the centre of the menu row itself so the
        // animation feels rooted at the button the user just tapped.
        const target = event.target as HTMLElement | null;
        const rect = target?.getBoundingClientRect();
        const origin = rect
          ? { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 }
          : undefined;
        toggleTheme(origin);
      }}
      onMouseEnter={start}
      onMouseLeave={settle}
      onFocus={start}
      onBlur={settle}
      className={cn(ACCOUNT_MENU_ITEM_CLASS, "justify-between")}
    >
      <span className="flex items-center gap-2">
        <ContrastIcon
          ref={iconRef}
          size={14}
          className="inline-flex h-3.5 w-3.5 shrink-0 items-center justify-center leading-none"
        />
        <span className="md:hidden">Theme</span>
        <span className="hidden md:inline">
          <SwapLabel
            value={theme === "dark" ? "Light mode" : "Dark mode"}
            options={["Light mode", "Dark mode"]}
          />
        </span>
      </span>
      <ShortcutKey className="hidden translate-x-0.5 md:inline-flex">M</ShortcutKey>
    </DropdownMenuItem>
  );
}

function DiscordMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
      className={className}
    >
      <path d="M20.317 4.369a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128c.126-.094.252-.192.372-.291a.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.061 0a.074.074 0 0 1 .078.009c.12.099.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.891.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.331c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
    </svg>
  );
}
