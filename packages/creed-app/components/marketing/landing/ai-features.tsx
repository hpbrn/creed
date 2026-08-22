"use client";

import { useEffect, useState } from "react";
import { CommandIcon } from "@creed/ui/command";
import { GaugeIcon } from "@creed/ui/gauge";
import { TextCursorInputIcon } from "@creed/ui/text-cursor-input";
import { ScoreDemo } from "@/components/marketing/how-creed-works-demos";
import { PlateCard } from "@/components/marketing/landing/plate-card";
import { SectionHeading } from "@/components/marketing/landing/section-heading";
import { cn } from "@creed/ui/utils";

const PANEL_DEMO_STEPS = [
  {
    mode: "Search",
    prompt: "billing",
    status: "Open billing settings",
    action: "Take me there",
  },
  {
    mode: "Ask",
    prompt: "what changed in Goals?",
    status: "Goals has 2 proposals and one accepted edit this week.",
    action: "Summarized",
  },
  {
    mode: "Agent",
    prompt: "tighten my Work section",
    status: "Drafting a reversible proposal",
    action: "Review diff",
  },
] as const;

function useCyclingIndex(length: number, intervalMs = 2400) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const intervalId = window.setInterval(
      () => setIndex((current) => (current + 1) % length),
      intervalMs,
    );
    return () => window.clearInterval(intervalId);
  }, [intervalMs, length]);

  return index;
}

function useTypedPanelPrompt(text: string, resetKey: number) {
  const [typed, setTyped] = useState("");

  useEffect(() => {
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
      }, 34);
    }, 240);

    return () => {
      window.clearTimeout(startTimeoutId);
      if (intervalId !== undefined) window.clearInterval(intervalId);
    };
  }, [resetKey, text]);

  return typed;
}

function PanelFeatureDemo() {
  const stepIndex = useCyclingIndex(PANEL_DEMO_STEPS.length);
  const step = PANEL_DEMO_STEPS[stepIndex];
  const typedPrompt = useTypedPanelPrompt(step.prompt, stepIndex);

  return (
    <div className="mx-auto w-full max-w-[390px] overflow-hidden rounded-xl border border-[var(--creed-border)] bg-[var(--creed-surface)] shadow-[0_10px_30px_rgba(28,28,26,0.10)]">
      <div className="flex items-center gap-2 border-b border-[var(--creed-border)] px-3.5 py-3">
        <span className="flex h-6 w-6 items-center justify-center rounded-[8px] bg-[#FCE7F3] text-[#DB2777] dark:bg-[#3F1230] dark:text-[#F472B6]">
          <CommandIcon size={14} />
        </span>
        <div className="min-w-0 flex-1 text-[13px] font-medium text-[var(--creed-text-primary)]">
          Panel
        </div>
        <div className="flex rounded-[8px] bg-[var(--creed-surface-raised)] p-0.5">
          {PANEL_DEMO_STEPS.map((item, index) => (
            <span
              key={item.mode}
              className={cn(
                "rounded-[6px] px-2 py-1 text-[10px] font-medium transition-colors duration-200",
                index === stepIndex
                  ? "bg-[var(--creed-surface)] text-[var(--creed-text-primary)] shadow-sm"
                  : "text-[var(--creed-text-tertiary)]",
              )}
            >
              {item.mode}
            </span>
          ))}
        </div>
      </div>

      <div className="p-3.5">
        <div className="rounded-md border border-[var(--creed-border)] bg-[var(--creed-surface)] px-3 py-2.5 text-[13px] text-[var(--creed-text-primary)]">
          {typedPrompt || "\u00A0"}
        </div>

        <div className="mt-3 space-y-2">
          <div className="flex items-center gap-2 rounded-md bg-[var(--creed-surface-raised)] px-3 py-2.5">
            <span className="h-1.5 w-1.5 shrink-0 rounded-[3px] bg-[#DB2777]" />
            <span className="min-w-0 flex-1 truncate text-[13px] text-[var(--creed-text-primary)]">
              {step.status}
            </span>
          </div>
          <div className="flex items-center gap-2 px-1 text-[12px] text-[var(--creed-text-tertiary)]">
            <span className="rounded-[5px] bg-[var(--creed-surface-raised)] px-1.5 py-0.5 font-medium text-[var(--creed-text-secondary)]">
              ↵
            </span>
            <span>{step.action}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// The Tab demo loop, mirroring the real in-editor flow: a line types out, Tab
// is pressed (the keycap depresses), the in-app ring spinner runs while the
// suggestion is in flight, the whole ghost appears at once, and a second Tab
// press solidifies it. No caret, no word-by-word streaming, no colour change.
const TAB_DEMO_PREFIX =
  "Keep replies short, practical, and easy to scan.";
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
        <span className="h-4 w-1 shrink-0 rounded-[3px] bg-[#06B6D4]" />
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

      <div className="min-h-[132px] p-4 text-[14px] leading-[1.7] text-[var(--creed-text-primary)]">
        <span>{TAB_DEMO_PREFIX.slice(0, typedChars)}</span>
        {phase === "accepted" ? <span>{TAB_DEMO_GHOST}</span> : null}
        {showGhost ? (
          <span className="text-[var(--creed-text-tertiary)]">
            {TAB_DEMO_GHOST}
          </span>
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
        headline="AI inside the file"
        className="max-w-[64rem]"
      />

      <div className="mx-auto mt-14 grid max-w-6xl items-stretch gap-5 lg:grid-cols-3">
        <PlateCard
          plateColor="var(--plate-proposal)"
          plateClassName="min-h-[272px]"
          title="Analysis"
          titleIcon={<GaugeIcon size={21} />}
          body="Score every section for signal, weak spots, and what to sharpen next."
          square
        >
          <ScoreDemo />
        </PlateCard>
        <PlateCard
          plateColor="var(--plate-create)"
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
