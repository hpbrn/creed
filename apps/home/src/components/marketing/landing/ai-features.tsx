"use client";

import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import { Check, LoaderCircle, Settings as SettingsIcon } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { CommandIcon } from "@/components/ui/command";
import { CompassIcon } from "@/components/ui/compass";
import { CpuIcon } from "@/components/ui/cpu";
import { GaugeIcon } from "@/components/ui/gauge";
import { SearchIcon } from "@/components/ui/search";
import { TextCursorInputIcon } from "@/components/ui/text-cursor-input";
import { CreedAgentGlyph } from "@/components/creed/brand";
import { SectionAccentMark } from "@/components/creed/section-accent-mark";
import { SectionReferenceChip } from "@/components/creed/section-reference-chip";
import { AnalysisDemo } from "./analysis-demo";
import { AGENT_STAGE_LABEL, type AgentStage } from "@/lib/panel/agent";
import { fuzzyScore } from "@/lib/panel/fuzzy";
import type { PanelMode } from "@/lib/panel/modes";
import { accentColorMap } from "@/lib/creed/creed-data";
import { PlateCard } from "./plate-card";
import { FileCode } from "./file-text-marks";
import { SectionHeading } from "./section-heading";
import { cn } from "@/components/ui/utils";

const TAB_DEMO_ACCENT = accentColorMap.questions;

const PANEL_PLACEHOLDER: Record<PanelMode, string> = {
  search: "Search or jump to…",
  ask: "Ask about your creed…",
  agent: "Tell Creed what to change…",
};

const PANEL_DEMO_STAGES: AgentStage[] = [
  "reading",
  "planning",
  "writing",
  "filing",
];

const PANEL_COMMAND_ROW_CLASS =
  "flex h-8 w-full items-center gap-2.5 rounded-[var(--radius-md)] px-2.5 text-left text-[14px] font-medium transition-colors duration-200 ease-[cubic-bezier(0.22,1,0.36,1)]";

const PANEL_EASE = [0.22, 1, 0.36, 1] as const;
const PANEL_FADE = { duration: 0.16, ease: PANEL_EASE };
const PANEL_HEIGHT_SPRING = {
  type: "spring" as const,
  bounce: 0,
  duration: 0.34,
};

const GOALS_MENTION = { id: "goals", name: "Goals", accent: "projects" };

type PanelDemoCommand = {
  label: string;
  group: "Pages";
  keywords: string[];
  icon?: ReactNode;
};

const PANEL_DEMO_COMMANDS: PanelDemoCommand[] = [
  {
    label: "Settings",
    group: "Pages",
    keywords: ["models", "key", "preferences"],
    icon: (
      <SettingsIcon
        size={14}
        className="inline-flex h-3.5 w-3.5 shrink-0 items-center justify-center leading-none"
      />
    ),
  },
];

type PanelDemoView =
  "type" | "results" | "thinking" | "answer" | "working" | "result";

type PanelDemoStep = {
  mode: PanelMode;
  view: PanelDemoView;
  prompt: string;
  holdMs?: number;
  stageIndex?: number;
};

// Holds stay long enough to read each body. The live panel is faster;
// this loop is for the homepage, not a latency demo.
const PANEL_DEMO_STEPS: PanelDemoStep[] = [
  { mode: "search", view: "type", prompt: "settings" },
  { mode: "search", view: "results", prompt: "settings", holdMs: 3600 },
  { mode: "ask", view: "type", prompt: "what changed in Goals?" },
  {
    mode: "ask",
    view: "thinking",
    prompt: "what changed in Goals?",
    holdMs: 2000,
  },
  {
    mode: "ask",
    view: "answer",
    prompt: "what changed in Goals?",
    holdMs: 4000,
  },
  { mode: "agent", view: "type", prompt: "tighten my Work section" },
  {
    mode: "agent",
    view: "working",
    prompt: "tighten my Work section",
    stageIndex: 0,
    holdMs: 1600,
  },
  {
    mode: "agent",
    view: "working",
    prompt: "tighten my Work section",
    stageIndex: 1,
    holdMs: 1600,
  },
  {
    mode: "agent",
    view: "working",
    prompt: "tighten my Work section",
    stageIndex: 2,
    holdMs: 1800,
  },
  {
    mode: "agent",
    view: "result",
    prompt: "tighten my Work section",
    holdMs: 4000,
  },
];

const PANEL_DEMO_REST_STEP = PANEL_DEMO_STEPS.findIndex(
  (step) => step.view === "answer",
);

function PanelDemoKbd({ children }: { children: string }) {
  return (
    <kbd className="inline-flex h-5 min-w-5 items-center justify-center rounded border border-[var(--creed-border)] bg-[var(--creed-surface-raised)] px-1 text-[10px] font-medium text-[var(--creed-text-secondary)]">
      {children}
    </kbd>
  );
}

function useTypedPanelPrompt(text: string, resetKey: number, enabled: boolean) {
  const [typed, setTyped] = useState("");

  useEffect(() => {
    if (!enabled) {
      setTyped(text);
      return;
    }
    setTyped("");
    let index = 0;
    let intervalId: number | undefined;
    const startTimeoutId = window.setTimeout(() => {
      intervalId = window.setInterval(() => {
        index += 1;
        setTyped(text.slice(0, index));
        if (index >= text.length && intervalId !== undefined) {
          window.clearInterval(intervalId);
        }
      }, 52);
    }, 280);

    return () => {
      window.clearTimeout(startTimeoutId);
      if (intervalId !== undefined) window.clearInterval(intervalId);
    };
  }, [enabled, resetKey, text]);

  return typed;
}

function PanelModeIcon({ mode }: { mode: PanelMode }) {
  const Icon =
    mode === "agent" ? CpuIcon : mode === "ask" ? CompassIcon : SearchIcon;
  return (
    <Icon
      size={16}
      className="inline-flex h-4 w-4 shrink-0 items-center justify-center leading-none"
    />
  );
}

function PanelDemoFooterHints({ mode }: { mode: PanelMode }) {
  if (mode === "search") {
    return (
      <>
        <span className="flex items-center gap-1.5">
          <PanelDemoKbd>↵</PanelDemoKbd> open
        </span>
        <span className="flex items-center gap-1.5">
          <PanelDemoKbd>⇥</PanelDemoKbd> ask
        </span>
        <span className="flex items-center gap-1.5">
          <PanelDemoKbd>⌘</PanelDemoKbd> agent
        </span>
        <span className="ml-auto flex items-center gap-1.5">
          <PanelDemoKbd>esc</PanelDemoKbd> close
        </span>
      </>
    );
  }
  if (mode === "ask") {
    return (
      <>
        <span className="flex items-center gap-1.5">
          <PanelDemoKbd>↵</PanelDemoKbd> send
        </span>
        <span className="flex items-center gap-1.5">
          <PanelDemoKbd>⇥</PanelDemoKbd> search
        </span>
        <span className="flex items-center gap-1.5">
          <PanelDemoKbd>⌘</PanelDemoKbd> agent
        </span>
        <span className="ml-auto flex items-center gap-1.5">
          <PanelDemoKbd>esc</PanelDemoKbd> back
        </span>
      </>
    );
  }
  return (
    <>
      <span className="flex items-center gap-1.5">
        <PanelDemoKbd>↵</PanelDemoKbd> run
      </span>
      <span className="flex items-center gap-1.5">
        <PanelDemoKbd>⇥</PanelDemoKbd> ask
      </span>
      <span className="flex items-center gap-1.5">
        <PanelDemoKbd>⌘</PanelDemoKbd> search
      </span>
      <span className="ml-auto flex items-center gap-1.5">
        <PanelDemoKbd>esc</PanelDemoKbd> back
      </span>
    </>
  );
}

function panelBodyKey(step: PanelDemoStep) {
  if (step.mode === "search") return "search";
  if (step.mode === "ask")
    return step.view === "type" ? "ask-idle" : "ask-thread";
  if (step.view === "type") return "agent-idle";
  if (step.view === "working") return "agent-working";
  return "agent-result";
}

function PanelSearchBody({ query }: { query: string }) {
  const groups = useMemo(() => {
    const trimmed = query.trim();
    // Empty query keeps Settings on screen. The live panel would list every
    // page and section here; that catalog is taller and flashes the orange
    // Goals row when the loop restarts typing.
    const scored = trimmed
      ? PANEL_DEMO_COMMANDS.filter(
          (command) => fuzzyScore(trimmed, command.label, command.keywords) > 0,
        )
      : PANEL_DEMO_COMMANDS;
    const items = scored.length > 0 ? scored : PANEL_DEMO_COMMANDS;
    return [{ label: "Pages" as const, items }];
  }, [query]);

  const activeLabel = groups[0]?.items[0]?.label;

  return (
    <div className="p-1.5">
      {groups.map((group) => (
        <div key={group.label}>
          <div className="px-2.5 pb-1 pt-2 text-[12px] font-medium text-[var(--creed-text-tertiary)]">
            {group.label}
          </div>
          {group.items.map((command) => (
            <div
              key={command.label}
              className={cn(
                PANEL_COMMAND_ROW_CLASS,
                "text-[var(--creed-text-secondary)]",
                command.label === activeLabel &&
                  "bg-accent text-accent-foreground",
              )}
            >
              {command.icon}
              <span className="truncate">{command.label}</span>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

function PanelAskBody({ view }: { view: PanelDemoView }) {
  if (view === "type") {
    return (
      <div className="px-3 py-2.5 text-[13px] leading-[1.55] text-[var(--creed-text-tertiary)]">
        Ask about your creed.
      </div>
    );
  }

  return (
    <div className="space-y-3 p-2.5">
      <div className="flex justify-end">
        <div className="max-w-[85%] rounded-[var(--radius-md)] bg-[var(--creed-surface-raised)] px-3 py-1.5 text-[14px] leading-[1.5] text-[var(--creed-text-primary)]">
          what changed in <SectionReferenceChip section={GOALS_MENTION} />?
        </div>
      </div>
      <AnimatePresence mode="wait" initial={false}>
        {view === "thinking" ? (
          <motion.div
            key="thinking"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={PANEL_FADE}
            className="flex items-center gap-2 px-0.5 text-[13px] text-[var(--creed-text-secondary)]"
          >
            <LoaderCircle className="h-3.5 w-3.5 animate-spin text-[var(--creed-text-tertiary)]" />
            Thinking…
          </motion.div>
        ) : (
          <motion.div
            key="answer"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={PANEL_FADE}
            className="flex gap-2"
          >
            <CreedAgentGlyph className="mt-[3px] h-3.5 w-3.5 shrink-0" />
            <div className="min-w-0 flex-1 space-y-1.5">
              <div className="text-[14px] leading-[1.6] text-[var(--creed-text-primary)]">
                Goals has 2 proposals and one accepted edit this week.
              </div>
              <span className="inline-flex items-center gap-1.5 rounded-[var(--radius-sm)] bg-accent px-2 py-1 text-[13px] font-medium text-accent-foreground">
                Take me there <PanelDemoKbd>↵</PanelDemoKbd>
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function PanelAgentBody({
  view,
  stageIndex,
}: {
  view: PanelDemoView;
  stageIndex: number;
}) {
  if (view === "type") {
    return (
      <div className="px-3 py-2.5 text-[13px] leading-[1.55] text-[var(--creed-text-tertiary)]">
        Tell Creed what to change.
      </div>
    );
  }

  if (view === "working") {
    return (
      <div className="space-y-1.5 px-3 py-2.5">
        {PANEL_DEMO_STAGES.map((stage, index) => {
          const done = index < stageIndex;
          const current = index === stageIndex;
          return (
            <div
              key={stage}
              className={cn(
                "flex items-center gap-2 text-[13px] transition-colors duration-200 ease-[cubic-bezier(0.22,1,0.36,1)]",
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
                  <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <span className="h-1.5 w-1.5 rounded-full bg-[var(--creed-border-strong)]" />
                )}
              </span>
              <span>{AGENT_STAGE_LABEL[stage]}</span>
            </div>
          );
        })}
        <div className="mt-1 flex items-center gap-1.5 rounded-[var(--radius-sm)] px-1 py-1 text-[12px] font-medium text-[var(--creed-text-tertiary)]">
          <PanelDemoKbd>esc</PanelDemoKbd> or click to stop
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2.5 p-2.5">
      <div
        className={cn(
          PANEL_COMMAND_ROW_CLASS,
          "bg-accent text-accent-foreground",
        )}
      >
        <span className="truncate">Review</span>
        <span className="ml-auto">
          <PanelDemoKbd>↵</PanelDemoKbd>
        </span>
      </div>
    </div>
  );
}

// Scale model of the real panel: same chrome, input row, mode bodies, and
// footer hints as `panel.tsx`, driven by mock data so the homepage can loop
// Search, Ask, and Agent without app state.
function PanelFeatureDemo() {
  const reduceMotion = useReducedMotion();
  const [stepIndex, setStepIndex] = useState(0);
  const step = PANEL_DEMO_STEPS[stepIndex] ?? PANEL_DEMO_STEPS[0];
  const typing = step.view === "type" && !reduceMotion;
  const typedPrompt = useTypedPanelPrompt(step.prompt, stepIndex, typing);
  const bodyKey = panelBodyKey(step);
  const bodyInnerRef = useRef<HTMLDivElement>(null);
  const [bodyHeight, setBodyHeight] = useState<number | "auto">("auto");

  useLayoutEffect(() => {
    const node = bodyInnerRef.current;
    if (!node) return;
    const measure = () => {
      const next = node.offsetHeight;
      setBodyHeight((current) => (current === next ? current : next));
    };
    measure();
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(measure);
    observer.observe(node);
    return () => observer.disconnect();
  }, [bodyKey]);

  useEffect(() => {
    if (reduceMotion) {
      setStepIndex(Math.max(PANEL_DEMO_REST_STEP, 0));
      return;
    }
    if (step.view === "type") {
      if (typedPrompt.length < step.prompt.length) return;
      const id = window.setTimeout(() => {
        setStepIndex((current) => (current + 1) % PANEL_DEMO_STEPS.length);
      }, 560);
      return () => window.clearTimeout(id);
    }
    const id = window.setTimeout(() => {
      setStepIndex((current) => (current + 1) % PANEL_DEMO_STEPS.length);
    }, step.holdMs ?? 1800);
    return () => window.clearTimeout(id);
  }, [reduceMotion, step, typedPrompt]);

  const inputValue =
    step.view === "type"
      ? typedPrompt
      : step.mode === "search"
        ? step.prompt
        : "";
  const inputKey = inputValue
    ? `value-${step.mode}`
    : `placeholder-${step.mode}`;

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none mx-auto w-full max-w-[360px] select-none overflow-hidden rounded-[var(--radius-lg)] border border-[var(--creed-border)] bg-[var(--creed-surface)] shadow-[var(--creed-shadow-dialog)]"
    >
      <div className="flex items-start gap-0.5 border-b border-[var(--creed-border)] p-1.5">
        <span className="relative inline-flex h-8 w-8 shrink-0 items-center justify-center text-[var(--creed-text-secondary)]">
          <AnimatePresence mode="wait" initial={false}>
            <motion.span
              key={step.mode}
              initial={reduceMotion ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={PANEL_FADE}
              className="absolute inset-0 flex items-center justify-center"
            >
              <PanelModeIcon mode={step.mode} />
            </motion.span>
          </AnimatePresence>
        </span>
        <div className="min-w-0 flex-1 pl-[2px]">
          <div className="relative flex h-8 w-full items-center overflow-hidden bg-transparent text-[15px]">
            <AnimatePresence mode="wait" initial={false}>
              <motion.span
                key={inputKey}
                initial={reduceMotion ? false : { opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={PANEL_FADE}
                className={cn(
                  "absolute inset-y-0 left-0 right-0 truncate leading-8",
                  inputValue
                    ? "text-[var(--creed-text-primary)]"
                    : "text-[var(--creed-text-tertiary)]",
                )}
              >
                {inputValue || PANEL_PLACEHOLDER[step.mode]}
              </motion.span>
            </AnimatePresence>
          </div>
        </div>
      </div>

      <motion.div
        initial={false}
        animate={{ height: bodyHeight }}
        transition={reduceMotion ? { duration: 0 } : PANEL_HEIGHT_SPRING}
        className="overflow-hidden"
      >
        <div ref={bodyInnerRef}>
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={bodyKey}
              initial={reduceMotion ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={PANEL_FADE}
            >
              {step.mode === "search" ? (
                <PanelSearchBody query={inputValue} />
              ) : step.mode === "ask" ? (
                <PanelAskBody view={step.view} />
              ) : (
                <PanelAgentBody
                  view={step.view}
                  stageIndex={step.stageIndex ?? 0}
                />
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </motion.div>

      <div className="flex h-10 items-center border-t border-[var(--creed-border)] bg-muted/50 px-3 text-[12px] text-[var(--creed-text-tertiary)]">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={step.mode}
            initial={reduceMotion ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={PANEL_FADE}
            className="flex w-full items-center gap-3"
          >
            <PanelDemoFooterHints mode={step.mode} />
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

// The Tab demo loop, mirroring the real in-editor flow: a line types out, Tab
// is pressed (the keycap depresses), the in-app ring spinner runs while the
// suggestion is in flight, the whole ghost appears at once, and a second Tab
// press solidifies it. No caret, no word-by-word streaming, no colour change.
const TAB_DEMO_PREFIX = "Keep replies short, practical, and easy to scan.";
const TAB_DEMO_GHOST =
  " Lead with the answer, then surface the key tradeoff and next action.";

type TabDemoPhase =
  | "typing"
  | "press-invoke"
  | "loading"
  | "ghost"
  | "press-accept"
  | "accepted"
  | "pause";

const TAB_DEMO_PHASE_MS: Record<Exclude<TabDemoPhase, "typing">, number> = {
  "press-invoke": 170,
  loading: 950,
  ghost: 1500,
  "press-accept": 170,
  accepted: 2400,
  pause: 300,
};

const TAB_DEMO_NEXT: Record<Exclude<TabDemoPhase, "typing">, TabDemoPhase> = {
  "press-invoke": "loading",
  loading: "ghost",
  ghost: "press-accept",
  "press-accept": "accepted",
  accepted: "pause",
  pause: "typing",
};

function TabFeatureDemo() {
  const [phase, setPhase] = useState<TabDemoPhase>("typing");
  const [typedChars, setTypedChars] = useState(0);

  useEffect(() => {
    if (phase === "typing") {
      if (typedChars >= TAB_DEMO_PREFIX.length) {
        const id = window.setTimeout(() => setPhase("press-invoke"), 420);
        return () => window.clearTimeout(id);
      }
      const id = window.setTimeout(() => setTypedChars((c) => c + 1), 46);
      return () => window.clearTimeout(id);
    }
    const id = window.setTimeout(() => {
      if (phase === "accepted") setTypedChars(0);
      setPhase(TAB_DEMO_NEXT[phase]);
    }, TAB_DEMO_PHASE_MS[phase]);
    return () => window.clearTimeout(id);
  }, [phase, typedChars]);

  const pressed = phase === "press-invoke" || phase === "press-accept";
  const showGhost = phase === "ghost" || phase === "press-accept";

  return (
    <div className="mx-auto w-full max-w-[390px] overflow-hidden rounded-xl border border-[var(--creed-border)] bg-[var(--creed-surface)] shadow-[0_10px_30px_rgba(28,28,26,0.10)]">
      <div className="flex items-center gap-2 border-b border-[var(--creed-border)] px-3.5 py-3">
        <SectionAccentMark color={TAB_DEMO_ACCENT} />
        <div className="min-w-0 flex-1 text-[13px] font-medium text-[var(--creed-text-primary)]">
          Preferences
        </div>
        <span
          className={cn(
            "rounded-[6px] border border-[var(--creed-border)] bg-[var(--creed-surface-raised)] px-1.5 py-0.5 text-[10px] font-medium text-[var(--creed-text-secondary)] transition-all duration-150",
            pressed &&
              "translate-y-[1px] scale-95 bg-[var(--creed-border)] text-[var(--creed-text-primary)]",
          )}
        >
          Tab
        </span>
      </div>

      <div
        className="min-h-[132px] p-4 text-[14px] leading-[1.7] text-[var(--creed-text-primary)]"
        style={{ "--section-accent": TAB_DEMO_ACCENT } as CSSProperties}
      >
        <span>{TAB_DEMO_PREFIX.slice(0, typedChars)}</span>
        {phase === "accepted" ? <span>{TAB_DEMO_GHOST}</span> : null}
        {showGhost ? (
          <span className="creed-tab-ghost">{TAB_DEMO_GHOST}</span>
        ) : null}
        {phase === "loading" ? (
          <span className="creed-tab-spinner" aria-hidden />
        ) : null}
        {phase === "ghost" ? (
          <span className="ml-2 inline-flex items-center gap-1 align-middle text-[11px] text-[var(--creed-text-tertiary)]">
            <kbd className="inline-flex h-4 items-center rounded border border-[var(--creed-border)] bg-[var(--creed-surface-raised)] px-1 text-[10px] font-medium leading-none text-[var(--creed-text-secondary)]">
              Tab
            </kbd>
            accept
            <kbd className="ml-1 inline-flex h-4 items-center rounded border border-[var(--creed-border)] bg-[var(--creed-surface-raised)] px-1 text-[10px] font-medium leading-none text-[var(--creed-text-secondary)]">
              Esc
            </kbd>
            dismiss
          </span>
        ) : null}
      </div>
    </div>
  );
}

export function AiFeaturesSection() {
  return (
    <section className="px-6 py-24 md:px-10 md:py-30 lg:px-12">
      <SectionHeading
        headline={
          <>
            Models <FileCode>{"<inside>"}</FileCode> the file
          </>
        }
        className="max-w-[64rem]"
      />

      <div className="mx-auto mt-14 flex max-w-6xl flex-wrap items-stretch justify-center gap-5 [&>article]:w-[360px] [&>article]:max-w-full">
        <PlateCard
          plateColor="var(--plate-proposal)"
          plateClassName="min-h-[272px] lg:min-h-0"
          title="Analysis"
          titleIcon={<GaugeIcon size={21} />}
          body="Score every section for signal, weak spots, and what to sharpen next."
          square
        >
          <AnalysisDemo />
        </PlateCard>
        <PlateCard
          plateColor="var(--plate-create)"
          plateClassName="h-[267px] sm:h-[283px] lg:h-auto"
          title="Panel"
          titleIcon={<CommandIcon size={21} />}
          body="Search, ask, and let Creed draft reversible edits without leaving the file."
          square
        >
          <PanelFeatureDemo />
        </PlateCard>
        <PlateCard
          plateColor="var(--plate-connect)"
          title="Tab"
          titleIcon={<TextCursorInputIcon size={21} />}
          body="Press Tab and it finishes the thought in your voice, drawn from your whole file."
          square
        >
          <TabFeatureDemo />
        </PlateCard>
      </div>
    </section>
  );
}
