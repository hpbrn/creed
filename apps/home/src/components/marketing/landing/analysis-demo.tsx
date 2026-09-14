"use client";

import {
  QualityRing,
  qualityScoreColor,
} from "@/components/creed/file-quality-ui";
import { cn } from "@/components/ui/utils";
import { accentColorMap } from "@/lib/creed/creed-data";
import { ChevronDown } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { useEffect, useRef, useState } from "react";

const EASE = [0.22, 1, 0.36, 1] as const;

// Optimistic in-view tracker: reports `true` immediately and lets an
// IntersectionObserver pause the loop only once the element is actually scrolled
// off-screen. Defaulting to visible means the demo still plays in environments
// where IO callbacks are delayed or unavailable, rather than freezing on frame 0.
function useInViewLoose(ref: React.RefObject<HTMLElement | null>) {
  const [inView, setInView] = useState(true);
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(
      (entries) => setInView(entries[0]?.isIntersecting ?? true),
      { threshold: 0.3 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [ref]);
  return inView;
}

// Drives a looping step machine while the demo is on screen. `durations[i]` is
// how long step `i` is held before advancing; the sequence wraps. Off-screen it
// rewinds to 0 (so it replays on scroll-in); under reduced motion it parks on
// `restStep` and never advances. Pass a module-stable `durations` array.
function useLoopSequence(durations: readonly number[], restStep: number) {
  const ref = useRef<HTMLDivElement | null>(null);
  const inView = useInViewLoose(ref);
  const reduce = useReducedMotion();
  const playing = inView && !reduce;
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (!playing) {
      setStep(reduce ? restStep : 0);
      return;
    }
    const timer = window.setTimeout(
      () => setStep((s) => (s + 1) % durations.length),
      durations[step],
    );
    return () => window.clearTimeout(timer);
  }, [playing, step, reduce, restStep, durations]);

  return { ref, step, setStep, playing };
}

function DemoCard({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex w-full flex-col rounded-lg border border-[var(--creed-border)] bg-[var(--creed-surface)] p-4 shadow-[0_8px_24px_rgba(28,28,26,0.04)]",
        className,
      )}
    >
      {children}
    </div>
  );
}

// 0 loading, 1 resolved (tags in, no note open), 2-4 open each note in turn.
const SCORE_STEPS = [1300, 1500, 1900, 1900, 2400] as const;
const SCORE_TARGET = 64;

type ScoreTag = { label: string; tone: "green" | "amber" | "red" };
const SCORE_TAGS: ScoreTag[] = [
  { label: "Specific", tone: "green" },
  { label: "Concrete", tone: "green" },
  { label: "Thin", tone: "amber" },
  { label: "Vague", tone: "red" },
];
const TAG_TONE_CLASS: Record<ScoreTag["tone"], string> = {
  green: "bg-[#ECFDF5] text-[#047857] dark:bg-[#052e1a]/55 dark:text-[#4ade80]",
  amber: "bg-[#FFFBEB] text-[#92400E] dark:bg-[#451a03]/55 dark:text-[#fbbf24]",
  red: "bg-[#FEF2F2] text-[#B91C1C] dark:bg-[#3F1212]/55 dark:text-[#fca5a5]",
};

type ScoreNote = {
  tone: "good" | "mid" | "bad";
  title: string;
  detail: string;
};
const SCORE_NOTES: ScoreNote[] = [
  {
    tone: "good",
    title: "Reads like a real person",
    detail: "Names the shared, the role, and where you are.",
  },
  {
    tone: "mid",
    title: "One line stays generic",
    detail: "Tighten the opener so it could only describe you.",
  },
  {
    tone: "bad",
    title: "Contains a stray line",
    detail: "A leftover scratch note near the end reads like noise.",
  },
];

// Eases a displayed integer from 0 -> target whenever `run` flips true. Skips the
// tween (snaps to target) when `animate` is false, e.g. reduced motion.
function useCountUp(target: number, run: boolean, animate: boolean) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (!run) {
      setValue(0);
      return;
    }
    if (!animate) {
      setValue(target);
      return;
    }
    let raf = 0;
    const start = performance.now();
    const duration = 760;
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      setValue(Math.round(eased * target));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [run, animate, target]);
  return value;
}

// One quality note: a row that opens to reveal its detail. `open` is controlled
// by the demo loop so the notes play as an accordion (one open at a time).
// Details collapse on the grid instead of mounting. The Identity card itself
// sizes to that content; the Analysis plate keeps a stable height so the
// page does not shift.
function ScoreNoteRow({
  tone,
  title,
  detail,
  open,
}: ScoreNote & { open: boolean }) {
  const color =
    tone === "good"
      ? "var(--creed-success)"
      : tone === "mid"
        ? "var(--creed-score-mid)"
        : "var(--creed-danger)";
  const symbol = tone === "good" ? "+" : tone === "mid" ? "/" : "−";
  return (
    <div
      className={cn(
        "overflow-hidden rounded-md transition-colors",
        open && "bg-[var(--creed-surface-raised)]",
      )}
    >
      <div className="flex items-center gap-1.5 px-1.5 py-1">
        <span
          aria-hidden
          className="shrink-0 font-mono text-[12px] font-medium leading-[1.2]"
          style={{ color }}
        >
          {symbol}
        </span>
        <span className="min-w-0 flex-1 truncate text-[12px] font-medium text-[var(--creed-text-primary)]">
          {title}
        </span>
        <ChevronDown
          className={cn(
            "h-3 w-3 shrink-0 origin-center transition-[color,transform,rotate] duration-200 ease-[cubic-bezier(0.22,1,0.36,1)]",
            open
              ? "rotate-180 text-[var(--creed-text-primary)]"
              : "rotate-0 text-[var(--creed-text-tertiary)]",
          )}
        />
      </div>
      <div
        className={cn(
          "grid transition-[grid-template-rows,opacity] duration-[220ms] ease-[cubic-bezier(0.22,1,0.36,1)]",
          open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0",
        )}
      >
        <div className="overflow-hidden">
          <div className="px-1.5 pb-1.5 pl-[18px] text-[12px] leading-[1.45] text-[var(--creed-text-secondary)]">
            {detail}
          </div>
        </div>
      </div>
    </div>
  );
}

export function AnalysisDemo() {
  const reduceMotion = useReducedMotion();
  const { ref, step, playing } = useLoopSequence(SCORE_STEPS, 1);
  const accent = accentColorMap.identity;
  const loading = step === 0;
  const resolved = step >= 1;
  // Steps 2,3,4 open notes 0,1,2 respectively; only one is ever open.
  const openNote = step >= 2 ? step - 2 : -1;
  const shown = useCountUp(SCORE_TARGET, resolved, playing);

  return (
    <div ref={ref} className="w-full [overflow-anchor:none]">
      <DemoCard>
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span
              className="h-[calc((1cap+28px)/2)] w-1 shrink-0 rounded-[1.25px] text-[15px]"
              style={{ backgroundColor: accent }}
            />
            <span className="text-[15px] font-medium" style={{ color: accent }}>
              Identity
            </span>
            <QualityRing
              score={SCORE_TARGET}
              color={accent}
              loading={loading}
              size={18}
            />
          </div>
          <span className="flex items-baseline gap-1.5">
            <span
              className="font-mono text-[20px] font-medium leading-none tabular-nums"
              style={{
                color: loading
                  ? "var(--creed-text-tertiary)"
                  : qualityScoreColor(SCORE_TARGET),
              }}
            >
              {loading ? "…" : shown}
            </span>
            <span className="text-[12px] font-medium text-[var(--creed-text-primary)]">
              / 100
            </span>
          </span>
        </div>

        <motion.div
          initial={false}
          animate={{ height: resolved ? "auto" : 0, opacity: resolved ? 1 : 0 }}
          transition={{ duration: reduceMotion ? 0 : 0.26, ease: EASE }}
          className="overflow-hidden"
        >
          <div className="mt-3 flex min-h-[22px] flex-wrap gap-1">
            {SCORE_TAGS.map((tag, index) => (
              <motion.span
                key={tag.label}
                animate={{ opacity: resolved ? 1 : 0, y: resolved ? 0 : 4 }}
                transition={{
                  duration: 0.26,
                  delay: resolved ? index * 0.06 : 0,
                  ease: EASE,
                }}
                className={cn(
                  "inline-flex items-center rounded-[6px] px-1.5 py-0.5 text-[11px] font-medium leading-[1.2]",
                  TAG_TONE_CLASS[tag.tone],
                )}
              >
                {tag.label}
              </motion.span>
            ))}
          </div>

          <div className="relative mt-3 border-t border-[var(--creed-border)] pt-2">
            <div className="min-h-0 space-y-0.5 overflow-hidden">
              {SCORE_NOTES.map((note, index) => (
                <motion.div
                  key={note.title}
                  animate={{ opacity: resolved ? 1 : 0, y: resolved ? 0 : 4 }}
                  transition={{
                    duration: 0.26,
                    delay: resolved ? 0.08 + index * 0.06 : 0,
                    ease: EASE,
                  }}
                >
                  <ScoreNoteRow {...note} open={openNote === index} />
                </motion.div>
              ))}
            </div>
          </div>
        </motion.div>
      </DemoCard>
    </div>
  );
}
