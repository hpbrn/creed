"use client";

import Image from "next/image";
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
import Link from "next/link";
import { useAppNavigate, useAppPath } from "@/components/creed/app-navigation";
import { Check, Plus, X } from "lucide-react";
import { Reorder } from "motion/react";
import { AnimatedMenuIconItem } from "@/components/creed/animated-icon-action";
import { AccountDialog, BillingDialog, FeedbackMenuItem } from "@creed/edition/ui";
import { StatusMenuItem } from "@/components/creed/status-menu";
import { BookTextIcon } from "@creed/ui/book-text";
import { ConnectIcon } from "@creed/ui/connect";
import { ContrastIcon, type ContrastIconHandle } from "@creed/ui/contrast";
import { CreditCardIcon } from "@creed/ui/credit-card";
import { CpuIcon } from "@creed/ui/cpu";
import { FileTextIcon } from "@creed/ui/file-text";
import { LayoutGridIcon } from "@creed/ui/layout-grid";
import { LogoutIcon } from "@creed/ui/logout";
import {
  PanelLeftCloseIcon,
  type PanelLeftCloseIconHandle,
} from "@creed/ui/panel-left-close";
import {
  PanelLeftOpenIcon,
  type PanelLeftOpenIconHandle,
} from "@creed/ui/panel-left-open";
import { SettingsIcon } from "@creed/ui/settings";
import { UserIcon } from "@creed/ui/user";
import { useAnimatedIconControls } from "@/components/creed/animated-icon-controls";
import { useTheme } from "@/components/creed/theme-provider";
import { Avatar, AvatarFallback } from "@creed/ui/avatar";
import { Button } from "@creed/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@creed/ui/dropdown-menu";
import { Separator } from "@creed/ui/separator";
import {
  accentColorMap,
  isAccentKey,
  normalizeLegacyProposalDraft,
  type CreedSection,
  type CreedState,
} from "@creed/core/creed-data";
import { cn } from "@creed/ui/utils";
import { ACCOUNT_MENU_ITEM_CLASS } from "@/lib/account-menu";
import { proposalTargetsLiveSection } from "@/lib/proposal-state";
import {
  preloadConnectionsScreen,
  preloadFileScreen,
  preloadSettingsScreen,
} from "@/components/creed/file-screen-loader";
import { CreedMark, CreedWordmark } from "@/components/creed/brand";
import { CreedPanel, PANEL_OPEN_EVENT } from "@/components/creed/panel";
import {
  getAgentRunnerServerSnapshot,
  getAgentRunnerSnapshot,
  subscribeAgentRunner,
} from "@/lib/panel/agent-runner";
import { SearchIcon, type SearchIconHandle } from "@creed/ui/search";
import {
  useCreedActions,
  useCreedStateSelector,
} from "@/components/creed/creed-provider";
import { preloadSettingsData } from "@/components/creed/settings-preload";
import { preloadMcpHealth } from "@/components/creed/mcp-health-preload";
import { ShortcutKey } from "@/components/creed/shortcut-key";
import {
  FileSectionNavButton,
  SIDEBAR_COLLAPSE_MOTION,
  sidebarLabelRevealClass,
  sidebarNavRowClass,
  sidebarIconSlotClass,
} from "@/components/creed/file-presentation";
import { useCreedEdition } from "@/components/creed/edition-provider";

const FILE_NAV_INTENT_KEY = "creed:file-nav-intent";
const SIDEBAR_COLLAPSED_KEY = "creed:sidebar-collapsed";
const SIDEBAR_PRESS_CLASS =
  "transform-gpu transition-[color,background-color,transform,filter] duration-150 ease-[cubic-bezier(0.22,1,0.36,1)] active:translate-y-px active:scale-[0.98] active:brightness-[0.96]";

const SIDEBAR_NAV_PRESS_CLASS =
  "transform-gpu transition-[color,transform,filter] duration-150 ease-[cubic-bezier(0.22,1,0.36,1)] active:translate-y-px active:scale-[0.98] active:brightness-[0.96]";

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
  onOpenPush?: () => void;
  onSetActivityOpen?: (open: boolean) => void;
};

type ShellActionsContextValue = {
  registerFileActions: (actions: ShellFileActions) => () => void;
  setActiveSectionId: (sectionId: string | null) => void;
};

const ShellActionsContext = createContext<ShellActionsContextValue | null>(null);

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
          "bg-[var(--creed-surface-raised)] text-[var(--creed-text-primary)] hover:bg-[var(--creed-surface-raised)]"
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
        className={cn("hidden lg:inline", sidebarLabelRevealClass(collapsed))}
        aria-hidden={collapsed || undefined}
      >
        {item.label}
      </span>
    </Link>
  );
}

export function CreedShell({
  children,
  userName,
  avatarInitials,
  avatarUrl,
  sections,
  pendingProposalSectionIds = [],
}: ShellProps) {
  const path = useAppPath();
  const navigate = useAppNavigate();
  const hasHostedAccounts = useCreedEdition().capabilities.hostedAccounts;
  const hasManagedCredits = useCreedEdition().capabilities.managedCredits;
  const { signOut, exportMarkdown, reorderSections } = useCreedActions();
  const state = useCreedStateSelector(
    (snapshot) => snapshot,
    sameShellState,
  );
  const [failedAvatarUrl, setFailedAvatarUrl] = useState<string | null>(null);
  const [billingOpen, setBillingOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [profilePressed, setProfilePressed] = useState(false);
  const [accountHovered, setAccountHovered] = useState(false);
  const accountTriggerRef = useRef<HTMLButtonElement>(null);
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const [accountPanel, setAccountPanel] = useState<
    "status" | "feedback" | null
  >(null);
  const searchIconRef = useRef<SearchIconHandle | null>(null);
  const closeSidebarIconRef = useRef<PanelLeftCloseIconHandle | null>(null);
  const openSidebarIconRef = useRef<PanelLeftOpenIconHandle | null>(null);
  const agentRun = useSyncExternalStore(subscribeAgentRunner, getAgentRunnerSnapshot, getAgentRunnerServerSnapshot);
  const agentBusy = agentRun.status === "working" || agentRun.status === "applying";
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
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    setCollapsed(window.localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === "1");
  }, []);

  const toggleSidebar = useCallback(() => {
    setCollapsed((current) => {
      const next = !current;
      try {
        window.localStorage.setItem(SIDEBAR_COLLAPSED_KEY, next ? "1" : "0");
      } catch {}
      return next;
    });
  }, []);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.key !== "s" && event.key !== "S") || event.metaKey || event.ctrlKey || event.altKey || event.shiftKey) return;
      const target = event.target as HTMLElement | null;
      if (!target || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName) || target.isContentEditable) return;
      if (event.isComposing || event.repeat || event.defaultPrevented) return;
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
    [registerFileActions]
  );
  const showAvatarImage = Boolean(avatarUrl) && failedAvatarUrl !== avatarUrl;
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
    // The settings preload warms the PERSONAL settings screen's shared caches
    // (AI settings, credits, usage, GitHub). It only runs for personal Creeds:
    // shared mode renders its own settings screen that fetches per-Creed data
    // directly, and warming these creed-agnostic caches with shared data would
    // leak it back to the personal screen after a Creed switch.
    if (state.creedType !== "shared") {
      const githubConnected = state.settings.integrations.github.status === "connected";
      preloadSettingsData({
        scope: state.user.email || state.user.handle,
        githubConnected,
        repoOwner: state.settings.versionControl.repoOwner,
        repoName: state.settings.versionControl.repoName,
        loadCredits: hasManagedCredits,
        // The markdown only feeds the GitHub version-status preload, so skip the
        // full export rebuild entirely when GitHub isn't connected.
        markdown: githubConnected && sections.length ? exportMarkdown() : undefined,
      });
    }
    if (sections.length) {
      preloadMcpHealth("30d", state.creedId ?? "");
    }
  }, [
    exportMarkdown,
    sections.length,
    state.creedId,
    state.creedType,
    state.user.email,
    state.user.handle,
    state.settings.integrations.github.status,
    state.settings.versionControl.repoName,
    state.settings.versionControl.repoOwner,
    hasManagedCredits,
  ]);

  function setFileIntent(
    intent:
      | { type: "section"; sectionId: string }
      | { type: "compose" }
      | { type: "proposal"; proposalId: string }
      | { type: "push" }
      | { type: "activity"; open: boolean }
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

  function handleOpenPushClick() {
    if (path === "/file" && fileActionsRef.current.onOpenPush) {
      fileActionsRef.current.onOpenPush();
      return;
    }

    setFileIntent({ type: "push" });
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
      <div className="flex h-dvh overflow-hidden bg-[var(--creed-surface)]">
        <aside
          id="creed-sidebar"
          className={cn(
            // w-12 is 48px border-box. The 1px rail border would leave a
            // 31px column for the 32px nav squares and clip them on mobile.
            "h-dvh w-[calc(3rem+1px)] shrink-0 overflow-hidden border-r border-[var(--creed-border)] bg-[var(--creed-surface)] px-2 py-3",
            `transition-[width,padding] ${SIDEBAR_COLLAPSE_MOTION}`,
            !collapsed && "lg:w-[220px] lg:px-5",
          )}
        >
          <div className="flex h-full flex-col">
            <Link
              href={hasHostedAccounts ? "/home" : "/file"}
              aria-label="Creed home"
              className="mx-auto flex h-8 w-8 items-center justify-center rounded-sm transition-opacity duration-200 hover:opacity-60 lg:hidden"
            >
              <CreedMark />
            </Link>

            {/* One 32px header on desktop so File / Connections / Settings
                stay put when the rail width changes. */}
            <div className="relative hidden h-8 w-full lg:block">
              <div
                className={cn(
                  "absolute inset-0 flex items-center justify-between gap-3 transition-opacity duration-[260ms] ease-[cubic-bezier(0.22,1,0.36,1)]",
                  collapsed && "pointer-events-none opacity-0",
                )}
              >
                <Link
                  href={hasHostedAccounts ? "/home" : "/file"}
                  aria-label="Creed home"
                  className="flex min-w-0 items-center rounded-sm px-2 py-1 transition-opacity duration-200 hover:opacity-60"
                >
                  <CreedWordmark className="ml-0" />
                </Link>
                <div className="flex shrink-0 items-center gap-1.5">
                  <ShortcutKey>S</ShortcutKey>
                  <button
                    type="button"
                    onClick={toggleSidebar}
                    onMouseEnter={() => closeSidebarIconRef.current?.startAnimation()}
                    onMouseLeave={() => closeSidebarIconRef.current?.stopAnimation()}
                    aria-label="Collapse sidebar"
                    aria-controls="creed-sidebar"
                    aria-expanded={!collapsed}
                    tabIndex={collapsed ? -1 : undefined}
                    className={cn(
                      "group flex h-7 w-7 items-center justify-center rounded-sm text-[var(--creed-text-secondary)] hover:bg-[var(--creed-surface-raised)] hover:text-[var(--creed-text-primary)]",
                      SIDEBAR_PRESS_CLASS,
                    )}
                  >
                    <PanelLeftCloseIcon
                      ref={closeSidebarIconRef}
                      size={16}
                      className="flex h-4 w-4 items-center justify-center"
                    />
                  </button>
                </div>
              </div>
              <div
                className={cn(
                  "absolute inset-0 flex items-center justify-center transition-opacity duration-[260ms] ease-[cubic-bezier(0.22,1,0.36,1)]",
                  !collapsed && "pointer-events-none opacity-0",
                )}
              >
                <button
                  type="button"
                  onClick={toggleSidebar}
                  onMouseEnter={() => openSidebarIconRef.current?.startAnimation()}
                  onMouseLeave={() => openSidebarIconRef.current?.stopAnimation()}
                  aria-label="Expand sidebar"
                  aria-controls="creed-sidebar"
                  aria-expanded={!collapsed}
                  tabIndex={collapsed ? undefined : -1}
                  className={cn(
                    "group flex h-8 w-8 items-center justify-center rounded-sm text-[var(--creed-text-secondary)] hover:bg-[var(--creed-surface-raised)] hover:text-[var(--creed-text-primary)]",
                    SIDEBAR_PRESS_CLASS,
                  )}
                >
                  <PanelLeftOpenIcon
                    ref={openSidebarIconRef}
                    size={16}
                    className="flex h-4 w-4 items-center justify-center"
                  />
                </button>
              </div>
            </div>

            <nav className="mt-4 space-y-1">
              <button
                type="button"
                onClick={() => window.dispatchEvent(new Event(PANEL_OPEN_EVENT))}
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
                      className={cn("absolute -right-1 -top-1 h-1.5 w-1.5 rounded-full", !collapsed && "lg:hidden")}
                      style={{ backgroundColor: agentTile.bg }}
                    />
                  ) : null}
                </span>
                <span
                  className={cn(
                    "hidden flex-1 text-left lg:inline",
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
                      "hidden h-5 w-5 shrink-0 items-center justify-center rounded text-white lg:inline-flex",
                      sidebarLabelRevealClass(collapsed),
                    )}
                    style={{ backgroundColor: agentTile.bg }}
                    aria-label={agentTile.label}
                  >
                    {agentBusy ? (
                      <CpuIcon size={12} className="inline-flex h-3 w-3 items-center justify-center leading-none" />
                    ) : agentRun.status === "result" ? (
                      <Check className="h-3 w-3" strokeWidth={2.5} />
                    ) : (
                      <X className="h-3 w-3" strokeWidth={2.5} />
                    )}
                  </span>
                ) : (
                  <ShortcutKey
                    className={cn(
                      "hidden shrink-0 lg:inline-flex",
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
                  "hidden text-[13px] font-medium text-[var(--creed-text-tertiary)] lg:inline",
                  sidebarLabelRevealClass(collapsed),
                )}
                aria-hidden={collapsed || undefined}
              >
                Sections
              </span>
              <span
                aria-hidden="true"
                className={cn(
                  "absolute left-1/2 top-1/2 h-px w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[var(--creed-border)] transition-opacity duration-[260ms] ease-[cubic-bezier(0.22,1,0.36,1)]",
                  collapsed ? "opacity-100" : "opacity-100 lg:opacity-0",
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
              {orderedSidebarSections.map((section, reorderPosition) => {
                const pendingCount = pendingProposalCountBySection.get(section.id) ?? 0;
                const deleteProposalId = pendingDeleteBySectionId.get(section.id);
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
              })}
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
                  <Plus className="h-3.5 w-3.5 max-w-none shrink-0" strokeWidth={1.8} />
                </span>
                <span
                  className={cn("hidden lg:inline", sidebarLabelRevealClass(collapsed))}
                  aria-hidden={collapsed || undefined}
                >
                  Add section
                </span>
              </button>
            </div>

            <div className="mt-auto">
              <Separator className="my-4 bg-[var(--creed-border)]" />
              {hasHostedAccounts ? (
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
                        Boolean(accountTriggerRef.current?.matches(":hover")),
                      );
                    });
                  });
                }}
              >
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    ref={accountTriggerRef}
                    className="group/account relative mx-auto block h-8 w-8 bg-transparent text-[14px] font-medium text-[var(--creed-text-primary)] lg:mx-0 lg:w-full"
                    onPointerEnter={() => setAccountHovered(true)}
                    onPointerLeave={() => {
                      if (!accountMenuOpen) setAccountHovered(false);
                    }}
                    onPointerDownCapture={(event) => {
                      if (event.button !== 0) return;
                      setProfilePressed(true);
                      event.currentTarget.setPointerCapture(event.pointerId);
                    }}
                    onPointerUpCapture={() => setProfilePressed(false)}
                    onPointerCancel={() => setProfilePressed(false)}
                    onLostPointerCapture={() => setProfilePressed(false)}
                  >
                    {/* The trigger box stays still so Radix keeps the menu
                        pinned. The painted plate is this child, which presses. */}
                    <span
                      className={cn(
                        "flex h-full w-full min-w-0 items-center justify-center overflow-hidden rounded-sm hover:bg-[var(--creed-surface-raised)] group-aria-expanded/account:bg-[var(--creed-surface-raised)]",
                        SIDEBAR_PRESS_CLASS,
                        sidebarNavRowClass(collapsed),
                        !collapsed && "lg:pl-[6px]",
                        accountHovered && "bg-[var(--creed-surface-raised)]",
                        profilePressed && "translate-y-px scale-[0.98] brightness-[0.96]",
                      )}
                    >
                      <span className={sidebarIconSlotClass(collapsed, "md")}>
                        <Avatar className="size-6! overflow-hidden rounded-[8px] border border-[var(--creed-border)] bg-[var(--creed-surface-raised)] after:rounded-[8px]">
                          {showAvatarImage && avatarUrl ? (
                            <Image
                              key={avatarUrl}
                              src={avatarUrl}
                              alt={userName}
                              fill
                              sizes="24px"
                              className="rounded-[8px] object-cover"
                              referrerPolicy="no-referrer"
                              unoptimized
                              onError={() => setFailedAvatarUrl(avatarUrl)}
                            />
                          ) : (
                            <AvatarFallback className="bg-transparent text-xs font-medium text-[var(--creed-text-primary)]">
                              {avatarInitials}
                            </AvatarFallback>
                          )}
                        </Avatar>
                      </span>
                      <span
                        className={cn(
                          "hidden flex-1 text-left text-sm font-medium text-[var(--creed-text-primary)] lg:inline",
                          sidebarLabelRevealClass(collapsed),
                          collapsed && "lg:absolute lg:max-h-0",
                        )}
                        aria-hidden={collapsed || undefined}
                      >
                        {userName}
                      </span>
                    </span>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="start"
                  className={cn(
                    "rounded-lg border-[var(--creed-border)] bg-[var(--creed-surface)] p-1",
                    // Collapsed rail: the trigger is a 32px square, so the
                    // trigger-width menu would be unusably narrow.
                    collapsed ? "w-48" : "w-(--radix-dropdown-menu-trigger-width)"
                  )}
                >
                  <AnimatedMenuIconItem
                    icon={UserIcon}
                    className={ACCOUNT_MENU_ITEM_CLASS}
                    onSelect={() => {
                      setAccountOpen(true);
                    }}
                  >
                    Account
                  </AnimatedMenuIconItem>
                  <AnimatedMenuIconItem
                    icon={LayoutGridIcon}
                    className={ACCOUNT_MENU_ITEM_CLASS}
                    onSelect={() => {
                      navigate("/home");
                    }}
                  >
                    Homepage
                  </AnimatedMenuIconItem>
                  <AnimatedMenuIconItem
                    icon={BookTextIcon}
                    className={ACCOUNT_MENU_ITEM_CLASS}
                    onSelect={() => {
                      window.location.assign("https://docs.creed.md");
                    }}
                  >
                    Docs
                  </AnimatedMenuIconItem>
                  <StatusMenuItem
                    open={accountPanel === "status"}
                    onOpenChange={(open) =>
                      setAccountPanel((current) =>
                        open ? "status" : current === "status" ? null : current,
                      )
                    }
                  />
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
                  <ThemeToggleMenuItem />
                  <AnimatedMenuIconItem
                    icon={CreditCardIcon}
                    className={ACCOUNT_MENU_ITEM_CLASS}
                    onSelect={() => {
                      setBillingOpen(true);
                    }}
                  >
                    Billing
                  </AnimatedMenuIconItem>
                  <AnimatedMenuIconItem
                    icon={LogoutIcon}
                    className={ACCOUNT_MENU_ITEM_CLASS}
                    onSelect={() => {
                      void signOut();
                    }}
                  >
                    Log out
                  </AnimatedMenuIconItem>
                </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <ThemeSidebarButton collapsed={collapsed} />
              )}
            </div>
          </div>
        </aside>

        <main className="h-dvh min-w-0 flex-1 overflow-hidden bg-[var(--creed-surface)]">
          {children}
        </main>
      </div>

      {hasHostedAccounts ? (
        <>
          <AccountDialog open={accountOpen} onOpenChange={setAccountOpen} />
          <BillingDialog open={billingOpen} onOpenChange={setBillingOpen} />
        </>
      ) : null}
      <CreedPanel
        onFileSection={handleSectionClick}
        onFileProposal={handleProposalClick}
        onAddSection={handleAddSectionClick}
        onOpenBilling={() => setBillingOpen(true)}
        onOpenPush={handleOpenPushClick}
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
  const iconRef = useRef<ContrastIconHandle | null>(null);

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
      onMouseEnter={() => iconRef.current?.startAnimation()}
      onMouseLeave={() => iconRef.current?.stopAnimation()}
      className={cn(ACCOUNT_MENU_ITEM_CLASS, "justify-between")}
    >
      <span className="flex items-center gap-2">
        <ContrastIcon ref={iconRef} size={14} className="inline-flex h-3.5 w-3.5 shrink-0 items-center justify-center leading-none" />
        <span className="md:hidden">Theme</span>
        <span className="hidden md:inline">{theme === "dark" ? "Light mode" : "Dark mode"}</span>
      </span>
      <ShortcutKey className="hidden md:inline-flex">M</ShortcutKey>
    </DropdownMenuItem>
  );
}

function ThemeSidebarButton({ collapsed }: { collapsed: boolean }) {
  const { theme, toggleTheme } = useTheme();
  const iconRef = useRef<ContrastIconHandle | null>(null);
  const label = theme === "dark" ? "Light mode" : "Dark mode";

  return (
    <Button
      type="button"
      variant="ghost"
      aria-label={label}
      className={cn(
        "h-auto w-full min-w-0 justify-center overflow-hidden rounded-sm border-0 bg-transparent px-1 py-1 text-[var(--creed-text-primary)] transition-colors hover:bg-[var(--creed-surface-raised)] dark:hover:bg-[var(--creed-surface-raised)]",
        `lg:transition-[padding,gap] ${SIDEBAR_COLLAPSE_MOTION}`,
        collapsed
          ? "lg:justify-start lg:gap-0 lg:px-1"
          : "lg:justify-start lg:gap-2.5 lg:pl-[7px] lg:pr-2.5 lg:py-1.5",
      )}
      onClick={(event) => {
        const rect = event.currentTarget.getBoundingClientRect();
        toggleTheme({ x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 });
      }}
      onMouseEnter={() => iconRef.current?.startAnimation()}
      onMouseLeave={() => iconRef.current?.stopAnimation()}
      onFocus={() => iconRef.current?.startAnimation()}
      onBlur={() => iconRef.current?.stopAnimation()}
    >
      <span className={sidebarIconSlotClass(collapsed, "md")}>
        <ContrastIcon
          ref={iconRef}
          size={14}
          className="inline-flex h-6 w-6 shrink-0 items-center justify-center leading-none"
        />
      </span>
      <span
        className={cn("hidden text-sm font-medium lg:inline", sidebarLabelRevealClass(collapsed))}
        aria-hidden={collapsed || undefined}
      >
        {label}
      </span>
      <span
        className={cn(
          "hidden lg:ml-auto lg:inline-flex",
          sidebarLabelRevealClass(collapsed),
        )}
        aria-hidden={collapsed || undefined}
      >
        <ShortcutKey>M</ShortcutKey>
      </span>
    </Button>
  );
}
