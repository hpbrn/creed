import { downloadFile } from "@/lib/native/export";
import { aiEnabled, useAiEnabled } from "@/lib/native/ai-availability";
import { nativeRequest as fetch } from "@/lib/native/request";

// Panel: press K anywhere in the app shell. Three modes, one surface:
//   • Search (default)  - instant local fuzzy find; Enter opens. No match →
//     "Find" runs AI smart search and navigates.
//   • Ask (Tab)         - a mini chatbot over your creed + the app. Answers
//     stream in with a waterfall reveal; navigation is offered only when going
//     somewhere is actually the point.
//   • Agent (⌘ tap)     - the in-app Creed agent. Plans edits in the MCP
//     proposal contract, streams live progress, files proposals from "Creed",
//     and keeps running in the background even if you close the panel.
// # references a section (Ask + Agent). Backspace on an empty input returns to
// Search. Esc steps back to Search, then closes.

import {
  Fragment,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type ForwardRefExoticComponent,
  type HTMLAttributes,
  type RefAttributes,
} from "react";
import { useAppNavigate, useAppPath } from "@/components/creed/app-navigation";
import { Dialog as DialogPrimitive } from "radix-ui";
import { motion, useAnimation, useReducedMotion } from "motion/react";
import { Check, LoaderCircle } from "lucide-react";
import { DelayedSpinner, useDelayedPending } from "@/components/ui/delayed-spinner";
import { Dialog, DialogPortal } from "@/components/ui/dialog";
import { ArchiveIcon } from "@/components/ui/archive";

import { ChartColumnIcon } from "@/components/ui/chart-column";
import { CompassIcon } from "@/components/ui/compass";
import { ConnectIcon } from "@/components/ui/connect";
import { ContrastIcon } from "@/components/ui/contrast";
import { CpuIcon } from "@/components/ui/cpu";

import { DatabaseIcon } from "@/components/ui/database";
import { DownloadIcon } from "@/components/ui/download";
import { FileTextIcon } from "@/components/ui/file-text";

import { HistoryIcon } from "@/components/ui/history";

import { PlusIcon } from "@/components/ui/plus";
import { SearchIcon } from "@/components/ui/search";
import { SettingsIcon } from "@/components/ui/settings";
import { SlidersHorizontalIcon } from "@/components/ui/sliders-horizontal";
import { TriangleAlertIcon } from "@/components/ui/triangle-alert";
import { UserIcon } from "@/components/ui/user";
import { CreedAgentGlyph } from "@/components/creed/brand";
import { SectionAccentMark } from "@/components/creed/section-accent-mark";
import {
  MentionInput,
  type MentionInputHandle,
} from "@/components/creed/mention-input";
import { RichAnswer } from "@/components/creed/rich-answer";
import {
  useCreedActions,
  useCreedStateSelector,
} from "@/components/creed/creed-provider";
import { useTheme } from "@/components/creed/theme-provider";
import { useCreedEdition } from "@/components/creed/edition-provider";
import { useAnimatedIconControls } from "@/components/creed/animated-icon-controls";
import {
  accentColorMap,
  type CreedSection,
  type CreedState,
  type ProposalDraft,
} from "@/lib/creed/creed-data";
import {
  liveReviewProposals,
  pendingReviewProposals,
} from "@/lib/proposal-state";
import { fuzzyScore } from "@/lib/panel/fuzzy";
import { creedMarkdownFilename } from "@/lib/creed-filename";
import type {
  PanelAction,
  PanelResult,
  PanelSectionReference,
  PanelTurn,
  SettingsSectionKey,
} from "@/lib/panel/actions";
import { AGENT_STAGE_LABEL, type AgentStage } from "@/lib/panel/agent";
import { nextPanelMode, type PanelMode } from "@/lib/panel/modes";
import {
  clearAgentRun,
  getAgentRunnerServerSnapshot,
  getAgentRunnerSnapshot,
  startAgentRun,
  stopAgentRun,
  subscribeAgentRunner,
} from "@/lib/panel/agent-runner";
import {
  dispatchSettingsPanelIntent,
  setSettingsPanelIntent,
  type SettingsPanelIntent,
} from "@/lib/panel/settings-intent";
import { cn } from "@/components/ui/utils";

export const PANEL_OPEN_EVENT = "creed:panel-open";

function samePanelSections(left: CreedSection[], right: CreedSection[]) {
  return (
    left.length === right.length &&
    left.every((section, index) => {
      const other = right[index];
      return (
        other?.id === section.id &&
        other.name === section.name &&
        other.accent === section.accent &&
        other.archived === section.archived
      );
    })
  );
}

function sameClosedPanelState(left: CreedState, right: CreedState) {
  return (
    left.creedId === right.creedId &&
    left.creedType === right.creedType &&
    left.shared === right.shared &&
    left.creeds === right.creeds &&
    left.user === right.user &&
    left.proposals === right.proposals &&
    samePanelSections(left.sections, right.sections)
  );
}

type PanelProps = {
  onFileSection: (sectionId: string) => void;
  onFileProposal: (proposalId: string) => void;
  onAddSection: () => void;
  onSetActivity: (open: boolean) => void;
};

type Mode = PanelMode;
type AskPhase = "idle" | "working" | "error";
type AskTurn = {
  role: "user" | "assistant";
  text: string;
  actions: PanelAction[];
  references: PanelSectionReference[];
};

type AnimatedIconHandle = {
  startAnimation: () => void;
  stopAnimation: () => void;
};
type AnimatedIconComponent = ForwardRefExoticComponent<
  HTMLAttributes<HTMLDivElement> & {
    size?: number;
  } & RefAttributes<AnimatedIconHandle>
>;

type Command = {
  id: string;
  label: string;
  group: "Pages" | "Sections" | "Proposals" | "Settings" | "Actions";
  keywords: string[];
  icon?: AnimatedIconComponent;
  dot?: string;
  run: () => void;
};

const GROUP_ORDER: Command["group"][] = [
  "Pages",
  "Sections",
  "Proposals",
  "Settings",
  "Actions",
];

// Proposal rows use operation colour, not the target section accent, so add /
// edit / remove stay distinguishable in a mixed list.
function CommandLabel({ label }: { label: string }) {
  // Geist packs a regular space against · so "Name · Agent" reads as glued.
  // Padding on the mark keeps a visible gap without changing the search string.
  const parts = label.split(" · ");
  if (parts.length < 2) return label;
  return parts.map((part, index) => (
    <Fragment key={`${part}-${index}`}>
      {index > 0 ? <span className="px-[0.4em]">·</span> : null}
      {part}
    </Fragment>
  ));
}

function proposalPanelDot(kind: ProposalDraft["kind"]): string {
  if (kind === "new-section") return accentColorMap["operating-principles"];
  if (kind === "delete-section") return accentColorMap.boundaries;
  return accentColorMap.stack;
}
const PLACEHOLDER: Record<Mode, string> = {
  search: "Search or jump to…",
  ask: "Ask about your creed…",
  agent: "Tell Creed what to change…",
};
const MODE_LABEL: Record<Mode, string> = {
  search: "Search",
  ask: "Ask",
  agent: "Agent",
};
const AGENT_STAGES: AgentStage[] = ["reading", "planning", "writing", "filing"];
const AGENT_RESULT_REFRESH_DELAYS_MS = [400, 1200] as const;

const SETTINGS_COMMANDS: Array<{
  key: SettingsSectionKey;
  label: string;
  keywords: string[];
  icon: AnimatedIconComponent;
}> = [
  {
    key: "profile",
    label: "Identity",
    keywords: ["name", "creed name", "profile picture", "avatar"],
    icon: UserIcon,
  },
  {
    key: "agent-edits",
    label: "Agent edit behaviour",
    keywords: [
      "permissions",
      "propose",
      "direct",
      "read-only",
      "hidden",
      "agents",
    ],
    icon: SlidersHorizontalIcon,
  },

  {
    key: "model-usage",
    label: "Model usage",
    keywords: [
      "ai spend",
      "spend",
      "usage",
      "balance",
      "cost",
      "byok",
      "api key",
      "openrouter",
    ],
    icon: ChartColumnIcon,
  },

  {
    key: "archived",
    label: "Archived",
    keywords: ["restore", "archive", "archived sections"],
    icon: ArchiveIcon,
  },
  {
    key: "data",
    label: "Data",
    keywords: ["export", "download", "backup", "markdown", "word count"],
    icon: DatabaseIcon,
  },
  {
    key: "danger",
    label: "Danger zone",
    keywords: ["delete creed", "remove creed", "danger"],
    icon: TriangleAlertIcon,
  },
];

function Kbd({ children }: { children: string }) {
  return (
    <kbd className="inline-flex h-5 min-w-5 items-center justify-center rounded border border-[var(--creed-border)] bg-[var(--creed-surface-raised)] px-1 text-[10px] font-medium text-[var(--creed-text-secondary)]">
      {children}
    </kbd>
  );
}

const PANEL_COMMAND_ROW_CLASS =
  "flex h-8 w-full items-center gap-2.5 rounded-[var(--radius-md)] px-2.5 text-left text-[14px] font-medium";

// CSS height transitions restart from zero velocity on every measure, so
// filtering or streaming feels stepped. A bounce-0 spring keeps momentum
// when the target moves and is not fighting the panel's 160ms open duration.
const PANEL_HEIGHT_SPRING = {
  type: "spring" as const,
  bounce: 0,
  duration: 0.34,
};

function PanelCommandButton({
  command,
  active,
  onHover,
  onRun,
}: {
  command: Command;
  active: boolean;
  onHover: () => void;
  onRun: () => void;
}) {
  // Same play-through hover as the rest of the app: start on highlight, never
  // cut the cycle short, and ignore a new hover until it finishes.
  const { iconRef, start, settle } = useAnimatedIconControls();
  useEffect(() => {
    if (active) start();
    else settle();
  }, [active, settle, start]);
  const Icon = command.icon;

  return (
    <button
      type="button"
      data-active={active}
      onMouseEnter={() => {
        onHover();
        start();
      }}
      onMouseLeave={settle}
      onMouseMove={onHover}
      onClick={onRun}
      className={cn(
        PANEL_COMMAND_ROW_CLASS,
        "text-[var(--creed-text-secondary)] transition-colors duration-150",
        active && "bg-accent text-accent-foreground",
      )}
    >
      {Icon ? (
        <Icon
          ref={iconRef}
          size={14}
          className="inline-flex h-3.5 w-3.5 shrink-0 items-center justify-center leading-none"
        />
      ) : command.dot ? (
        <SectionAccentMark color={command.dot} />
      ) : null}
      <span className="truncate">
        <CommandLabel label={command.label} />
      </span>
    </button>
  );
}

export function CreedPanel({
  onFileSection,
  onFileProposal,
  onAddSection,
  onSetActivity,
}: PanelProps) {
  const navigate = useAppNavigate();
  const pathname = useAppPath();
  const hasManagedCredits = useCreedEdition().capabilities.managedCredits;
  const [open, setOpen] = useState(false);
  const aiAvailable = useAiEnabled();
  const {
    exportMarkdown,
    exportActivityJson,
    exportAllDataJson,
    refreshState,
  } = useCreedActions();
  const state = useCreedStateSelector(
    (snapshot) => snapshot,
    (left, right) =>
      open ? left === right : sameClosedPanelState(left, right),
  );
  const activeCreedName =
    state.creeds?.find((creed) => creed.id === state.creedId)?.name ??
    state.user.name;
  const { toggleTheme } = useTheme();

  const agentRun = useSyncExternalStore(
    subscribeAgentRunner,
    getAgentRunnerSnapshot,
    getAgentRunnerServerSnapshot,
  );

  const [mode, setMode] = useState<Mode>("search");
  const [query, setQuery] = useState("");
  const [mentionIds, setMentionIds] = useState<string[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const keyboardSelectionRef = useRef(false);

  // Search smart-find async.
  const [searchPhase, setSearchPhase] = useState<AskPhase>("idle");
  const [searchError, setSearchError] = useState<string | null>(null);

  // Ask chat.
  const [askTurns, setAskTurns] = useState<AskTurn[]>([]);
  const [askPhase, setAskPhase] = useState<AskPhase>("idle");
  const [askError, setAskError] = useState<string | null>(null);
  const reduceMotion = useReducedMotion();

  // Latest mode for the ⌘-tap handler (bound once in an effect).
  const modeRef = useRef<Mode>(mode);
  useEffect(() => {
    modeRef.current = mode;
  }, [mode]);

  const shakeControls = useAnimation();
  const searchAbortRef = useRef<AbortController | null>(null);
  const askAbortRef = useRef<AbortController | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);
  const bodyRef = useRef<HTMLDivElement | null>(null);
  const pendingOutputScrollRef = useRef(false);
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const mentionInputRef = useRef<MentionInputHandle | null>(null);
  const searchIcon = useAnimatedIconControls();
  const compassIcon = useAnimatedIconControls();
  const cpuIcon = useAnimatedIconControls();

  const close = useCallback(() => {
    // Search + Ask are cheap and tied to the panel; abort them on close. A live
    // or reviewable Agent run deliberately survives (agent-runner keeps
    // streaming, clearAgentRun no-ops while it works), but a finished *error*
    // isn't actionable, so drop it - otherwise reopening resurrects a stale
    // error in Agent mode instead of landing on Search.
    searchAbortRef.current?.abort();
    askAbortRef.current?.abort();
    if (agentRun.status === "error") clearAgentRun();
    setOpen(false);
  }, [agentRun.status]);

  const resetTransient = useCallback(() => {
    setQuery("");
    setMentionIds([]);
    setActiveIndex(0);
    setSearchPhase("idle");
    setSearchError(null);
    setAskTurns([]);
    setAskPhase("idle");
    setAskError(null);
  }, []);

  useEffect(() => {
    if (aiAvailable) return;
    searchAbortRef.current?.abort();
    askAbortRef.current?.abort();
    stopAgentRun();
    clearAgentRun();
    setMode("search");
    setSearchPhase("idle");
    setSearchError(null);
    setAskPhase("idle");
    setAskTurns([]);
  }, [aiAvailable]);

  const handleOpenChange = useCallback(
    (next: boolean) => {
      if (!next) {
        close();
        return;
      }
      setOpen(true);
      resetTransient();
      // Reopen straight into a live / finished Agent run if there is one.
      setMode(!aiAvailable || agentRun.status === "idle" ? "search" : "agent");
    },
    [aiAvailable, agentRun.status, close, resetTransient],
  );

  const switchMode = useCallback((next: Mode) => {
    if (next !== "search" && !aiEnabled()) return;
    searchAbortRef.current?.abort();
    askAbortRef.current?.abort();
    setMode(next);
    setQuery("");
    setMentionIds([]);
    setActiveIndex(0);
    setSearchPhase("idle");
    setSearchError(null);
    setAskTurns([]);
    setAskPhase("idle");
    setAskError(null);
  }, []);

  const cycleMode = useCallback(() => {
    switchMode(nextPanelMode(mode));
  }, [mode, switchMode]);

  // K opens (Search); Cmd/Ctrl+K is the alias.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.key !== "k" && event.key !== "K") || event.altKey) return;
      if (!(event.metaKey || event.ctrlKey)) {
        const target = event.target as HTMLElement | null;
        if (
          !target ||
          /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName) ||
          target.isContentEditable
        )
          return;
        if (event.isComposing || event.repeat || event.defaultPrevented) return;
        event.preventDefault();
        handleOpenChange(true);
        return;
      }
      event.preventDefault();
      handleOpenChange(true);
    };
    const onOpenEvent = () => handleOpenChange(true);
    window.addEventListener("keydown", onKey);
    window.addEventListener(PANEL_OPEN_EVENT, onOpenEvent);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener(PANEL_OPEN_EVENT, onOpenEvent);
    };
  }, [handleOpenChange]);

  // ⌘ tap (bare Meta/Ctrl down→up) jumps to Agent while open.
  useEffect(() => {
    if (!open) return;
    // A genuine ⌘/Ctrl "tap": the modifier goes down and up quickly with NO
    // other key pressed in between. Any other keydown (a chord like ⌘C, or an
    // aborted reach for a shortcut) disqualifies it, so it never fires while
    // the user is typing or using a real shortcut - which would otherwise wipe
    // the input on an accidental switch.
    let tapStart = 0;
    const TAP_MAX_MS = 400;
    const down = (event: KeyboardEvent) => {
      if (event.repeat) return;
      tapStart =
        event.key === "Meta" || event.key === "Control" ? Date.now() : 0;
    };
    const up = (event: KeyboardEvent) => {
      if (
        (event.key === "Meta" || event.key === "Control") &&
        tapStart > 0 &&
        Date.now() - tapStart < TAP_MAX_MS
      ) {
        tapStart = 0;
        switchMode(modeRef.current === "agent" ? "search" : "agent");
      }
    };
    window.addEventListener("keydown", down, true);
    window.addEventListener("keyup", up, true);
    return () => {
      window.removeEventListener("keydown", down, true);
      window.removeEventListener("keyup", up, true);
    };
  }, [open, switchMode]);

  // Lock background scroll while open. We do this ourselves (rather than let a
  // modal dialog's react-remove-scroll do it) because that library also blocks
  // wheel events on the portaled mention popup. Plain body overflow:hidden
  // stops background scroll without touching the popup's own scrolling.
  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const start =
      mode === "agent"
        ? cpuIcon.start
        : mode === "ask"
          ? compassIcon.start
          : searchIcon.start;
    const startId = window.setTimeout(() => {
      start();
    }, 150);
    return () => window.clearTimeout(startId);
  }, [compassIcon.start, cpuIcon.start, mode, open, searchIcon.start]);

  const goSettings = useCallback(
    (intent: SettingsPanelIntent) => {
      setSettingsPanelIntent(intent);
      if (pathname === "/settings") dispatchSettingsPanelIntent();
      else navigate("/settings");
    },
    [navigate, pathname],
  );

  const liveSections = useMemo(
    () => state.sections.filter((section) => !section.archived),
    [state.sections],
  );
  const pendingProposals = useMemo(
    () =>
      pendingReviewProposals(
        liveReviewProposals(state.proposals, state.sections),
      ),
    [state.proposals, state.sections],
  );
  const mentionSections = useMemo(
    () =>
      liveSections.map((section) => ({
        id: section.id,
        name: section.name,
        accent: section.accent,
      })),
    [liveSections],
  );

  const commands = useMemo<Command[]>(() => {
    const available: Command[] = [
      {
        id: "page:file",
        label: "File",
        group: "Pages",
        keywords: ["editor", "creed", "sections", "proposals"],
        icon: FileTextIcon as AnimatedIconComponent,
        run: () => navigate("/file"),
      },
      {
        id: "page:connections",
        label: "Connections",
        group: "Pages",
        keywords: ["agents", "mcp", "clients", "connected"],
        icon: ConnectIcon as AnimatedIconComponent,
        run: () => navigate("/connections"),
      },
      {
        id: "page:settings",
        label: "Settings",
        group: "Pages",
        keywords: ["preferences", "options"],
        icon: SettingsIcon as AnimatedIconComponent,
        run: () => navigate("/settings"),
      },
      ...liveSections.map<Command>((section) => ({
        id: `section:${section.id}`,
        label: section.name,
        group: "Sections",
        keywords: [],
        dot: accentColorMap[section.accent],
        run: () => onFileSection(section.id),
      })),
      ...pendingProposals.map<Command>((proposal) => ({
        id: `proposal:${proposal.id}`,
        label: `${proposal.sectionName} · ${proposal.agentName}`,
        group: "Proposals",
        keywords: [proposal.reason],
        dot: proposalPanelDot(proposal.draft.kind),
        run: () => onFileProposal(proposal.id),
      })),
      ...SETTINGS_COMMANDS.map<Command>((entry) => ({
        id: `settings:${entry.key}`,
        label: entry.label,
        group: "Settings",
        keywords: entry.keywords,
        icon: entry.icon,
        run: () => goSettings({ scrollTo: entry.key }),
      })),
      // Section creation is owner/admin-only in shared mode; hide it for members.
      ...(state.creedType !== "shared" ||
      state.shared?.myRole === "owner" ||
      state.shared?.myRole === "admin"
        ? ([
            {
              id: "action:add-section",
              label: "Add section",
              group: "Actions",
              keywords: ["new section", "create section", "compose"],
              icon: PlusIcon as AnimatedIconComponent,
              run: () => onAddSection(),
            },
          ] as Command[])
        : []),

      {
        id: "action:activity",
        label: "Activity",
        group: "Actions",
        keywords: ["activity", "history", "log", "changes", "recent edits"],
        icon: HistoryIcon as AnimatedIconComponent,
        run: () => onSetActivity(true),
      },
      {
        id: "action:export-creed",
        label: "Export creed",
        group: "Actions",
        keywords: ["export", "download", "markdown", "backup"],
        icon: DownloadIcon as AnimatedIconComponent,
        run: () =>
          downloadFile(
            creedMarkdownFilename(activeCreedName),
            exportMarkdown,
            "text/markdown;charset=utf-8",
          ),
      },
      {
        id: "action:toggle-theme",
        label: "Toggle theme",
        group: "Actions",
        keywords: ["dark mode", "light mode", "appearance"],
        icon: ContrastIcon as AnimatedIconComponent,
        run: () => toggleTheme(),
      },
    ];
    return hasManagedCredits
      ? available
      : available.filter(
          (command) =>
            ![
              "action:add-credits",
              "action:credits-history",
              "action:billing",
              "action:log-out",
            ].includes(command.id),
        );
  }, [
    activeCreedName,
    exportMarkdown,
    goSettings,
    liveSections,
    onAddSection,
    onFileProposal,
    onFileSection,
    onSetActivity,
    hasManagedCredits,
    navigate,
    pendingProposals,
    toggleTheme,
    state.creedType,
    state.shared?.myRole,
  ]);

  const groups = useMemo(() => {
    const trimmed = query.trim();
    const scored = trimmed
      ? commands
          .map((command) => ({
            command,
            score: fuzzyScore(trimmed, command.label, command.keywords),
          }))
          .filter((entry) => entry.score > 0)
          .sort((a, b) => b.score - a.score)
          .map((entry) => entry.command)
      : commands;
    return GROUP_ORDER.map((group) => ({
      label: group,
      items: scored.filter((command) => command.group === group),
    })).filter((group) => group.items.length > 0);
  }, [commands, query]);

  const flatResults = useMemo(
    () => groups.flatMap((group) => group.items),
    [groups],
  );

  useEffect(() => {
    if (mode === "search") setActiveIndex(0);
  }, [query, mode]);

  useEffect(() => {
    if (!keyboardSelectionRef.current) return;
    const active = listRef.current?.querySelector<HTMLElement>(
      '[data-active="true"]',
    );
    active?.scrollIntoView({ block: "nearest" });
  }, [activeIndex, flatResults.length]);

  useLayoutEffect(() => {
    if (!pendingOutputScrollRef.current) return;
    const node = bodyRef.current;
    if (!node) return;
    pendingOutputScrollRef.current = false;
    node.scrollTo({
      top: node.scrollHeight,
      behavior: reduceMotion ? "auto" : "smooth",
    });
  }, [askTurns, askPhase, agentRun, reduceMotion]);

  const runCommand = useCallback(
    (command: Command) => {
      close();
      command.run();
    },
    [close],
  );

  const executeActions = useCallback(
    (actions: PanelAction[]) => {
      const intent: SettingsPanelIntent = {};
      let navTarget: "/file" | "/connections" | "/settings" | null = null;
      for (const action of actions) {
        switch (action.kind) {
          case "navigate":
            navTarget = action.target;
            break;
          case "settings-section":
            intent.scrollTo = action.target;
            break;
          case "usage-range":
            intent.usageRange = action.value;
            intent.scrollTo = intent.scrollTo ?? "model-usage";
            break;
          case "usage-mode":
            intent.aiMode = action.value;
            intent.scrollTo = intent.scrollTo ?? "model-usage";
            break;
          case "open-dialog":
            break;
          case "file-section":
            onFileSection(action.target);
            break;
          case "file-proposal":
            onFileProposal(action.target);
            break;
          case "compose-section":
            onAddSection();
            break;
          case "open-push":
            break;
          case "activity-panel":
            onSetActivity(action.value === "open");
            break;
          case "export":
            if (action.target === "creed")
              downloadFile(
                creedMarkdownFilename(activeCreedName),
                exportMarkdown,
                "text/markdown;charset=utf-8",
              );
            else if (action.target === "activity")
              downloadFile(
                "creed-activity.json",
                exportActivityJson,
                "application/json;charset=utf-8",
              );
            else
              downloadFile(
                "creed-data.json",
                exportAllDataJson,
                "application/json;charset=utf-8",
              );
            break;
          case "copy-creed":
            void navigator.clipboard?.writeText(exportMarkdown());
            break;
          case "toggle-theme":
            toggleTheme();
            break;
        }
      }
      if (
        intent.scrollTo ||
        intent.usageRange ||
        intent.aiMode ||
        intent.openDialog
      )
        goSettings(intent);
      else if (navTarget) navigate(navTarget);
    },
    [
      activeCreedName,
      exportActivityJson,
      exportAllDataJson,
      exportMarkdown,
      goSettings,
      onAddSection,
      onFileProposal,
      onFileSection,
      onSetActivity,
      navigate,
      toggleTheme,
    ],
  );

  const shake = useCallback(() => {
    void shakeControls.start({
      x: [0, -7, 7, -5, 5, -2, 0],
      transition: { duration: 0.35, ease: "easeOut" },
    });
  }, [shakeControls]);

  const runSmartFind = useCallback(async () => {
    if (!aiEnabled()) return;
    const trimmed = query.trim();
    if (!trimmed) return;
    setSearchPhase("working");
    setSearchError(null);
    const controller = new AbortController();
    searchAbortRef.current?.abort();
    searchAbortRef.current = controller;
    try {
      const response = await fetch("/api/app/ai/panel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "search",
          query: trimmed,
          page: pathname,
        }),
        signal: controller.signal,
      });
      const payload = (await response.json()) as Partial<PanelResult> & {
        error?: string;
      };
      if (!response.ok) {
        setSearchPhase("error");
        setSearchError(payload.error || "That didn't go through. Try again");
        shake();
        return;
      }
      if (!payload.ok || !payload.actions?.length) {
        setSearchPhase("error");
        setSearchError(payload.reason || "Couldn't find anything for that.");
        shake();
        return;
      }
      executeActions(payload.actions);
      close();
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return;
      setSearchPhase("error");
      setSearchError("Couldn't reach the server. Try again");
      shake();
    }
  }, [close, executeActions, pathname, query, shake]);

  const sendAsk = useCallback(
    async (text: string) => {
      if (!aiEnabled()) return;
      const trimmed = text.trim();
      if (!trimmed) return;
      const priorHistory: PanelTurn[] = askTurns
        .slice(-4)
        .map((turn) => ({ role: turn.role, text: turn.text }));
      pendingOutputScrollRef.current = true;
      setAskTurns((turns) => [
        ...turns,
        { role: "user", text: trimmed, actions: [], references: [] },
      ]);
      mentionInputRef.current?.clear();
      setQuery("");
      setAskPhase("working");
      setAskError(null);
      const controller = new AbortController();
      askAbortRef.current?.abort();
      askAbortRef.current = controller;
      try {
        const response = await fetch("/api/app/ai/panel", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            mode: "ask",
            query: trimmed,
            page: pathname,
            mentioned: mentionIds,
            history: priorHistory,
          }),
          signal: controller.signal,
        });
        if (!response.ok) {
          const payload = (await response.json()) as { error?: string };
          setAskPhase("error");
          setAskError(payload.error || "That didn't go through. Try again");
          shake();
          return;
        }
        if (!response.body) throw new Error("Missing Ask response stream.");
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let answer = "";
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          answer += decoder.decode(value, { stream: true });
        }
        answer += decoder.decode();
        setAskTurns((turns) => [
          ...turns,
          {
            role: "assistant",
            text: answer,
            actions: [],
            references: [],
          },
        ]);
        setAskPhase("idle");
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") return;
        setAskPhase("error");
        setAskError("Couldn't reach the server. Try again");
        shake();
      }
    },
    [askTurns, mentionIds, pathname, shake],
  );

  // Everything the agent did was applied + persisted server-side (direct edits
  // and reversible meta) or filed as a proposal row. The client just pulls the
  // fresh state - no client mutation, so nothing races the server persist (the
  // old bug where an accepted edit vanished on refresh). Runs even if the panel
  // is closed when the run finishes.
  const applyAgentResult = useCallback(async () => {
    await refreshState();
    for (const delay of AGENT_RESULT_REFRESH_DELAYS_MS) {
      window.setTimeout(() => void refreshState(), delay);
    }
  }, [refreshState]);

  const sendAgent = useCallback(
    (text: string) => {
      const trimmed = text.trim();
      if (!trimmed) return;
      pendingOutputScrollRef.current = true;
      startAgentRun({
        query: trimmed,
        mentioned: mentionIds,
        apply: applyAgentResult,
      });
      mentionInputRef.current?.clear();
      setQuery("");
    },
    [applyAgentResult, mentionIds],
  );

  const reviewAgentResults = useCallback(() => {
    const result = agentRun.result;
    if (!result) return;
    // Prefer a filed proposal (there's something to review); otherwise land on
    // a directly-applied section.
    const proposal = result.results.find((item) => item.kind === "proposal");
    const applied = result.results.find((item) => item.kind === "applied");
    const sectionId =
      proposal && proposal.kind === "proposal"
        ? proposal.sectionId
        : applied?.sectionId;
    close();
    clearAgentRun();
    // Defer to after the panel closes + the freshly filed proposal paints, then
    // scroll the same way the working "Jump to section" button does: query the
    // section node directly and scrollIntoView. The prop path (offsetTop-based)
    // wasn't landing here. Fall back to it only when the node isn't on the page
    // yet (i.e. we're not on /file), which navigates there via file intent.
    requestAnimationFrame(() =>
      requestAnimationFrame(() => {
        const el = sectionId
          ? document.querySelector<HTMLElement>(
              `[data-section-id="${sectionId}"]`,
            )
          : null;
        if (el) {
          el.scrollIntoView({ behavior: "smooth", block: "start" });
        } else if (
          proposal &&
          proposal.kind === "proposal" &&
          proposal.sectionId === "new-section"
        ) {
          // A brand-new section has no live node to scroll to; open its card.
          onFileProposal(proposal.proposalId);
        } else if (sectionId) {
          // Off /file: navigate to /file and scroll to the section - the exact
          // path the sidebar section links use, which works cross-page.
          onFileSection(sectionId);
        }
      }),
    );
  }, [agentRun.result, close, onFileProposal, onFileSection]);

  const backToSearch = useCallback(() => {
    if (mode === "search") {
      close();
      return;
    }
    switchMode("search");
  }, [close, mode, switchMode]);

  // Composer keys for Ask + Agent (mention picker handles its own keys first).
  const onComposerKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      // Tab toggles Ask: press it in Ask to go back to Search.
      if (event.key === "Tab") {
        event.preventDefault();
        switchMode(mode === "ask" ? "search" : "ask");
        return;
      }
      if (event.key === "Escape") {
        event.preventDefault();
        backToSearch();
        return;
      }
      if (event.key === "Backspace" && query === "") {
        event.preventDefault();
        switchMode("search");
        return;
      }
      if (event.key === "Enter" && !event.shiftKey) {
        event.preventDefault();
        if (query.trim()) {
          if (mode === "ask") void sendAsk(query);
          else sendAgent(query);
          return;
        }
        // Empty input: confirm a held affordance.
        if (mode === "ask") {
          const last = askTurns[askTurns.length - 1];
          if (last?.role === "assistant" && last.actions.length) {
            executeActions(last.actions);
            close();
          }
        } else if (mode === "agent" && agentRun.status === "result") {
          reviewAgentResults();
        }
      }
    },
    [
      agentRun.status,
      askTurns,
      backToSearch,
      close,
      executeActions,
      mode,
      query,
      reviewAgentResults,
      sendAgent,
      sendAsk,
      switchMode,
    ],
  );

  const onSearchKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLInputElement>) => {
      if (event.key === "Tab") {
        event.preventDefault();
        switchMode("ask");
        return;
      }
      if (event.key === "Escape") {
        event.preventDefault();
        close();
        return;
      }
      if (event.key === "ArrowDown") {
        event.preventDefault();
        keyboardSelectionRef.current = true;
        setActiveIndex((index) =>
          Math.min(index + 1, Math.max(flatResults.length - 1, 0)),
        );
        return;
      }
      if (event.key === "ArrowUp") {
        event.preventDefault();
        keyboardSelectionRef.current = true;
        setActiveIndex((index) => Math.max(index - 1, 0));
        return;
      }
      if (event.key === "Enter") {
        event.preventDefault();
        const active = flatResults[activeIndex];
        if (active) runCommand(active);
        else if (query.trim()) void runSmartFind();
      }
    },
    [
      activeIndex,
      close,
      flatResults,
      query,
      runCommand,
      runSmartFind,
      switchMode,
    ],
  );

  const showSmartFind =
    aiAvailable &&
    mode === "search" &&
    query.trim().length > 0 &&
    flatResults.length === 0 &&
    searchPhase !== "working";
  const InputIcon =
    mode === "agent" ? CpuIcon : mode === "ask" ? CompassIcon : SearchIcon;
  const inputIcon =
    mode === "agent" ? cpuIcon : mode === "ask" ? compassIcon : searchIcon;
  // Only Search shows an input-row spinner; Ask + Agent show progress in the
  // body (the chat "Thinking…" line / the Agent stage list).
  const showInputSpinner = useDelayedPending(
    mode === "search" && searchPhase === "working",
  );
  const bodyRefForHeight = useRef<HTMLDivElement | null>(null);
  const [frozenOffset, setFrozenOffset] = useState<number | null>(null);
  // Measured off the inner content, then sprung on a wrapper. `auto` cannot
  // be eased, and we must not observe the animating box or the spring and
  // the observer chase each other.
  const [panelHeight, setPanelHeight] = useState<number | null>(null);
  // Off for the first measurement, or the panel would animate up from nothing
  // as it opens.
  const [easeHeight, setEaseHeight] = useState(false);
  useLayoutEffect(() => {
    if (!open) {
      setEaseHeight(false);
      return;
    }

    let frame = 0;
    let observer: ResizeObserver | null = null;

    const start = () => {
      const node = bodyRefForHeight.current;
      // offsetHeight, not getBoundingClientRect: the open animation scales the
      // panel to 95%, and measuring through that would bake in the wrong
      // numbers.
      const height = node?.offsetHeight;
      if (!node || !height) {
        // Nothing to measure yet. Keep trying - failing here silently would
        // leave the panel on percentage centring, which is the bug.
        frame = window.requestAnimationFrame(start);
        return;
      }

      // The height it opens at fixes where it sits, for good.
      setFrozenOffset(Math.round(height / 2));
      setPanelHeight(height);
      frame = window.requestAnimationFrame(() => setEaseHeight(true));

      observer = new ResizeObserver(() => {
        const next = bodyRefForHeight.current?.offsetHeight;
        if (!next) return;
        setPanelHeight((current) => (current === next ? current : next));
      });
      observer.observe(node);
    };

    start();
    return () => {
      window.cancelAnimationFrame(frame);
      observer?.disconnect();
    };
  }, [open]);

  const stageIndex = agentRun.stage ? AGENT_STAGES.indexOf(agentRun.stage) : -1;

  return (
    // Non-modal on purpose: a modal Radix dialog installs react-remove-scroll,
    // which blocks wheel/trackpad scrolling everywhere except the dialog content
    // - and the #-section popup is portaled to the body, so it couldn't scroll.
    // We lock background scroll ourselves (see the effect above) instead.
    <Dialog open={open} onOpenChange={handleOpenChange} modal={false}>
      <DialogPortal>
        {/* Manual overlay: a non-modal Radix dialog doesn't render its own, so
            we dim + blur the background ourselves to match the other popups. */}
        <div
          data-slot="dialog-overlay"
          className="fixed inset-0 z-40 bg-black/10 supports-backdrop-filter:backdrop-blur-xs duration-200 data-[state=open]:animate-in data-[state=open]:fade-in-0"
          data-state={open ? "open" : "closed"}
        />
        <DialogPrimitive.Content
          data-slot="dialog-content"
          // Centred on open, then fixed. `-50%` is a share of the panel's own
          // height, so it re-centred on every resize - which is what moved the
          // input. Once measured this becomes a pixel offset and the panel is
          // pinned: it grows and shrinks against its bottom edge only.
          //
          // On `translate` rather than `transform`, because the open animation
          // owns `transform` and would drag the panel while it plays.
          //
          // Height lives on the inner spring wrapper, not here: this node
          // also owns the 160ms open animation, and a CSS height transition
          // on it inherits that duration and restarts on every measure.
          style={{
            translate:
              frozenOffset === null ? "-50% -50%" : `-50% -${frozenOffset}px`,
          }}
          aria-describedby={undefined}
          onCloseAutoFocus={(event) => {
            // Don't let Radix restore focus to the trigger on close - its
            // auto-focus interrupts the smooth scroll we kick off when the user
            // reviews an agent result or jumps to a section, so it just looks
            // like the panel closed without moving.
            event.preventDefault();
          }}
          onEscapeKeyDown={(event) => {
            if (mode !== "search") {
              event.preventDefault();
              switchMode("search");
            }
          }}
          onInteractOutside={(event) => {
            // The #-section popup is portaled to the body (outside Content), so
            // a click on a section row reads as "outside" and would dismiss the
            // whole panel. Keep it open when the interaction is inside the popup.
            const target = event.target as HTMLElement | null;
            if (target?.closest("[data-creed-mention-popup]"))
              event.preventDefault();
          }}
          className="fixed left-1/2 top-1/2 z-50 w-[calc(100%-2rem)] max-w-[560px] overflow-hidden rounded-[var(--radius-lg)] bg-[var(--creed-surface)] p-0 text-popover-foreground ring-1 ring-foreground/8 shadow-[0_18px_48px_rgba(28,28,26,0.08)] outline-none duration-[160ms] ease-[cubic-bezier(0.22,1,0.36,1)] will-change-transform data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95"
        >
          <DialogPrimitive.Title className="sr-only">
            Panel
          </DialogPrimitive.Title>
          <motion.div
            initial={false}
            animate={{ height: panelHeight ?? "auto" }}
            transition={
              easeHeight && !reduceMotion
                ? PANEL_HEIGHT_SPRING
                : { duration: 0 }
            }
            className="overflow-hidden"
          >
            <motion.div ref={bodyRefForHeight} animate={shakeControls}>
              <div className="flex items-start gap-0.5 border-b border-[var(--creed-border)] p-1.5">
                <button
                  type="button"
                  onClick={cycleMode}
                  onMouseEnter={inputIcon.start}
                  onMouseLeave={inputIcon.settle}
                  aria-label={`Switch to ${MODE_LABEL[nextPanelMode(mode)]} mode`}
                  data-panel-mode-switch
                  className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-sm text-[var(--creed-text-secondary)] transition-colors duration-150 hover:bg-[var(--creed-surface-raised)] hover:text-[var(--creed-text-primary)] focus-visible:outline-none"
                >
                  <InputIcon
                    ref={inputIcon.iconRef}
                    size={16}
                    className="inline-flex h-4 w-4 shrink-0 items-center justify-center leading-none"
                  />
                </button>
                <div className="min-w-0 flex-1 pl-[2px]">
                  {mode === "search" ? (
                    <input
                      ref={searchInputRef}
                      autoFocus
                      value={query}
                      onChange={(event) => {
                        setQuery(event.target.value);
                        if (searchPhase === "error") {
                          setSearchPhase("idle");
                          setSearchError(null);
                        }
                      }}
                      onKeyDown={onSearchKeyDown}
                      placeholder={PLACEHOLDER.search}
                      spellCheck={false}
                      autoComplete="off"
                      className="h-8 w-full bg-transparent text-[15px] text-[var(--creed-text-primary)] outline-none placeholder:text-[var(--creed-text-tertiary)]"
                    />
                  ) : (
                    <MentionInput
                      key={mode}
                      ref={mentionInputRef}
                      sections={mentionSections}
                      placeholder={PLACEHOLDER[mode]}
                      onChange={(text, ids) => {
                        setQuery(text);
                        setMentionIds(ids);
                        if (askPhase === "error") {
                          setAskPhase("idle");
                          setAskError(null);
                        }
                      }}
                      onKeyDown={onComposerKeyDown}
                    />
                  )}
                </div>
                {showInputSpinner ? (
                  <LoaderCircle className="h-4 w-4 shrink-0 animate-spin text-[var(--creed-text-tertiary)]" />
                ) : null}
              </div>

              {mode === "search" ? (
                showSmartFind ? (
                  <div className="p-1.5">
                    <button
                      type="button"
                      onClick={() => void runSmartFind()}
                      className={cn(
                        PANEL_COMMAND_ROW_CLASS,
                        "bg-accent text-accent-foreground",
                      )}
                    >
                      <span className="truncate">
                        Find &ldquo;{query.trim()}&rdquo;
                      </span>
                      <span className="ml-auto">
                        <Kbd>↵</Kbd>
                      </span>
                    </button>
                  </div>
                ) : searchPhase === "working" ? null : searchPhase === "error" &&
                  searchError ? (
                  <div className="p-1.5">
                    <div className="rounded-[var(--radius-md)] bg-[#FEF2F2] px-3 py-2.5 text-[13px] leading-[1.55] text-[#B91C1C] dark:bg-[#3F1212]/35 dark:text-[#F87171]">
                      {searchError}
                    </div>
                  </div>
                ) : flatResults.length === 0 ? null : (
                  <div
                    ref={listRef}
                    className="max-h-[324px] overflow-y-auto p-1.5 creed-scrollbar"
                  >
                    {groups.map((group) => (
                      <div key={group.label}>
                        <div className="px-2.5 pb-1 pt-2 text-[12px] font-medium text-[var(--creed-text-tertiary)]">
                          {group.label}
                        </div>
                        {group.items.map((command) => {
                          const index = flatResults.indexOf(command);
                          return (
                            <PanelCommandButton
                              key={command.id}
                              command={command}
                              active={index === activeIndex}
                              onHover={() => {
                                keyboardSelectionRef.current = false;
                                setActiveIndex(index);
                              }}
                              onRun={() => runCommand(command)}
                            />
                          );
                        })}
                      </div>
                    ))}
                  </div>
                )
              ) : (
                <div
                  ref={bodyRef}
                  className="max-h-[360px] overflow-y-auto overscroll-contain p-2.5 creed-scrollbar"
                >
                  {mode === "ask" ? (
                    <div className="space-y-3">
                      {askTurns.length === 0 && askPhase === "idle" ? (
                        <div className="px-0.5 py-1 text-[13px] leading-[1.55] text-[var(--creed-text-tertiary)]">
                          Ask about your creed, a feature, or where to find
                          something. Type # to mention a section.
                        </div>
                      ) : null}
                      {askTurns.map((turn, index) =>
                        turn.role === "user" ? (
                          <div key={index} className="flex justify-end">
                            <div className="max-w-[85%] rounded-[var(--radius-md)] bg-[var(--creed-surface-raised)] px-3 py-1.5 text-[14px] leading-[1.5] text-[var(--creed-text-primary)]">
                              {turn.text}
                            </div>
                          </div>
                        ) : (
                          <div key={index} className="flex gap-2">
                            <CreedAgentGlyph className="mt-[3px] h-3.5 w-3.5 shrink-0" />
                            <div className="min-w-0 flex-1 space-y-1.5">
                              <div className="text-[14px] leading-[1.6] text-[var(--creed-text-primary)]">
                                <RichAnswer
                                  markdown={turn.text}
                                  animate={index === askTurns.length - 1}
                                  references={turn.references}
                                  onSectionClick={(sectionId) => {
                                    onFileSection(sectionId);
                                    close();
                                  }}
                                  footer={
                                    turn.actions.length ? (
                                      <button
                                        type="button"
                                        onClick={() => {
                                          executeActions(turn.actions);
                                          close();
                                        }}
                                        className="mt-1.5 flex items-center gap-1.5 rounded-[var(--radius-sm)] bg-accent px-2 py-1 text-[13px] font-medium text-accent-foreground"
                                      >
                                        Take me there <Kbd>↵</Kbd>
                                      </button>
                                    ) : null
                                  }
                                />
                              </div>
                            </div>
                          </div>
                        ),
                      )}
                      {askPhase === "working" ? (
                        <div className="flex items-center gap-2 px-0.5 text-[13px] text-[var(--creed-text-secondary)]">
                          <DelayedSpinner
                            pending
                            className="h-3.5 w-3.5 animate-spin text-[var(--creed-text-tertiary)]"
                          />
                          Thinking…
                        </div>
                      ) : null}
                      {askPhase === "error" && askError ? (
                        <div className="rounded-[var(--radius-md)] bg-[#FEF2F2] px-3 py-2.5 text-[13px] leading-[1.55] text-[#B91C1C] dark:bg-[#3F1212]/35 dark:text-[#F87171]">
                          {askError}
                        </div>
                      ) : null}
                    </div>
                  ) : null}

                  {mode === "agent" ? (
                    <div className="space-y-2.5">
                      {agentRun.status === "idle" ? (
                        <div className="px-0.5 py-1 text-[13px] leading-[1.55] text-[var(--creed-text-tertiary)]">
                          Tell Creed what to change. It follows your agent
                          permissions. Type # to mention a section.
                        </div>
                      ) : null}

                      {agentRun.status === "working" ||
                      agentRun.status === "applying" ? (
                        <div className="space-y-1.5 px-0.5">
                          {AGENT_STAGES.map((stage, index) => {
                            const done =
                              agentRun.status === "applying" ||
                              index < stageIndex;
                            const current =
                              agentRun.status !== "applying" &&
                              index === stageIndex;
                            return (
                              <div
                                key={stage}
                                className={cn(
                                  "flex items-center gap-2 text-[13px]",
                                  done
                                    ? "text-[var(--creed-text-secondary)]"
                                    : current
                                      ? "text-[var(--creed-text-primary)]"
                                      : "text-[var(--creed-text-tertiary)]",
                                )}
                              >
                                <span className="flex h-4 w-4 shrink-0 items-center justify-center">
                                  {done ? (
                                    <Check
                                      className="h-3.5 w-3.5 text-[var(--creed-success)]"
                                      strokeWidth={2.2}
                                    />
                                  ) : current ? (
                                    <DelayedSpinner
                                      pending
                                      className="h-3.5 w-3.5 animate-spin"
                                    />
                                  ) : (
                                    <span className="h-1.5 w-1.5 rounded-full bg-[var(--creed-border-strong)]" />
                                  )}
                                </span>
                                <span>{AGENT_STAGE_LABEL[stage]}</span>
                                {current &&
                                stage === "writing" &&
                                agentRun.tokens > 0 ? (
                                  <span className="text-[11px] text-[var(--creed-text-tertiary)] tabular-nums">
                                    {agentRun.tokens}
                                  </span>
                                ) : null}
                              </div>
                            );
                          })}
                          <button
                            type="button"
                            onClick={() => stopAgentRun()}
                            className="mt-1 flex items-center gap-1.5 rounded-[var(--radius-sm)] px-1 py-1 text-[12px] font-medium text-[var(--creed-text-tertiary)] transition-colors hover:text-[var(--creed-danger)]"
                          >
                            <Kbd>esc</Kbd> or click to stop
                          </button>
                        </div>
                      ) : null}

                      {agentRun.status === "result" && agentRun.result ? (
                        <>
                          <div className="flex items-center gap-2 px-0.5 py-1 text-[13px] text-[var(--creed-text-primary)]">
                            <CreedAgentGlyph className="h-3.5 w-3.5 shrink-0" />
                            <span className="truncate">
                              {agentRun.result.summary || "Done."}
                            </span>
                          </div>
                          <div className="space-y-0.5">
                            {agentRun.result.results.map((item, index) => (
                              <div
                                key={index}
                                className="flex items-center gap-2 px-0.5 py-1 text-[13px] text-[var(--creed-text-secondary)]"
                              >
                                <Check
                                  className="h-3.5 w-3.5 shrink-0 text-[var(--creed-success)]"
                                  strokeWidth={2.2}
                                />
                                <span className="truncate">{item.label}</span>
                                <span className="ml-auto shrink-0 text-[11px] text-[var(--creed-text-tertiary)]">
                                  {item.kind === "proposal"
                                    ? "proposed"
                                    : "applied"}
                                </span>
                              </div>
                            ))}
                          </div>
                          <button
                            type="button"
                            onClick={reviewAgentResults}
                            className={cn(
                              PANEL_COMMAND_ROW_CLASS,
                              "mt-0.5 bg-accent text-accent-foreground",
                            )}
                          >
                            <span className="truncate">
                              {agentRun.result.results.some(
                                (item) => item.kind === "proposal",
                              )
                                ? "Review"
                                : "View"}
                            </span>
                            <span className="ml-auto">
                              <Kbd>↵</Kbd>
                            </span>
                          </button>
                        </>
                      ) : null}

                      {agentRun.status === "error" && agentRun.error ? (
                        <>
                          <div className="rounded-[var(--radius-md)] bg-[#FEF2F2] px-3 py-2.5 text-[13px] leading-[1.55] text-[#B91C1C] dark:bg-[#3F1212]/35 dark:text-[#F87171]">
                            {agentRun.error}
                          </div>
                          <button
                            type="button"
                            onClick={() => clearAgentRun()}
                            className="mt-1 px-0.5 text-[12px] font-medium text-[var(--creed-text-tertiary)] transition-colors hover:text-[var(--creed-text-primary)]"
                          >
                            Dismiss
                          </button>
                        </>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              )}

              <div className="flex h-10 items-center border-t border-[var(--creed-border)] bg-muted/50 px-3.5 text-[12px] text-[var(--creed-text-tertiary)]">
                <span className="md:hidden">
                  {MODE_LABEL[mode]}{aiAvailable ? " mode · Tap the icon to switch" : ""}
                </span>
                <div className="hidden w-full items-center gap-4 md:flex">
                  {mode === "search" ? (
                    <>
                      <span className="flex items-center gap-1.5">
                        <Kbd>↵</Kbd> open
                      </span>
                      {aiAvailable && <>
                        <span className="flex items-center gap-1.5"><Kbd>⇥</Kbd> ask</span>
                        <span className="flex items-center gap-1.5"><Kbd>⌘</Kbd> agent</span>
                      </>}
                      <span className="ml-auto flex items-center gap-1.5">
                        <Kbd>esc</Kbd> close
                      </span>
                    </>
                  ) : mode === "ask" ? (
                    <>
                      <span className="flex items-center gap-1.5">
                        <Kbd>↵</Kbd> send
                      </span>
                      <span className="flex items-center gap-1.5">
                        <Kbd>⇥</Kbd> search
                      </span>
                      <span className="flex items-center gap-1.5">
                        <Kbd>⌘</Kbd> agent
                      </span>
                      <span className="ml-auto flex items-center gap-1.5">
                        <Kbd>esc</Kbd> back
                      </span>
                    </>
                  ) : (
                    <>
                      <span className="flex items-center gap-1.5">
                        <Kbd>↵</Kbd> run
                      </span>
                      <span className="flex items-center gap-1.5">
                        <Kbd>⇥</Kbd> ask
                      </span>
                      <span className="flex items-center gap-1.5">
                        <Kbd>⌘</Kbd> search
                      </span>
                      <span className="ml-auto flex items-center gap-1.5">
                        <Kbd>esc</Kbd> back
                      </span>
                    </>
                  )}
                </div>
              </div>
            </motion.div>
          </motion.div>
        </DialogPrimitive.Content>
      </DialogPortal>
    </Dialog>
  );
}
