"use client";

import { useEffect, useRef } from "react";
import { accentColorMap } from "@creed/core/creed-data";
import {
  motion,
  transform,
  useReducedMotion,
  useMotionValue,
  useScroll,
  useTransform,
  type MotionValue,
} from "motion/react";

// Ownership first: the file is yours, then it is under your control, then
// Creed is the way it returns to you. Split so each line stays one row
// on desktop.
export const SCROLL_HIGHLIGHT_LINES = [
  "Your personal information is valuable.",
  "It should stay in your control.",
  "Creed gives it back to you.",
] as const;

const LINES = SCROLL_HIGHLIGHT_LINES.map((line, lineIndex) => ({
  words: line.split(" "),
  startIndex: SCROLL_HIGHLIGHT_LINES.slice(0, lineIndex).reduce(
    (count, earlier) => count + earlier.split(" ").length,
    0,
  ),
}));

const YOUR_COLOR_DURATION = 4.15;
const YOUR_WEIGHT_DURATION = 2.4;
const YOUR_EMPHASIS_DURATION = 5.75;
const EFFECTS = [
  { index: 1, duration: 2.4 },
  { index: 9, duration: YOUR_COLOR_DURATION + YOUR_WEIGHT_DURATION + YOUR_EMPHASIS_DURATION },
  { index: 11, duration: 2.4 },
];
const WORD_COUNT = LINES.reduce((count, line) => count + line.words.length, 0);
const TIMELINE_LENGTH = WORD_COUNT + EFFECTS.reduce((total, effect) => total + effect.duration, 0) + 0.5;
const ease = (value: number) => value * value * (3 - 2 * value);
const clamp = (value: number) => Math.min(1, Math.max(0, value));

function YourLabel({ uppercase }: { uppercase: MotionValue<number> }) {
  const lowerRef = useRef<HTMLSpanElement>(null);
  const upperRef = useRef<HTMLSpanElement>(null);
  const lowerWidth = useMotionValue(0);
  const upperWidth = useMotionValue(0);
  const width = useTransform([lowerWidth, upperWidth, uppercase], ([lower, upper, amount]: number[]) =>
    lower > 0 ? lower + (upper - lower) * amount : undefined);
  const lowerOpacity = useTransform(uppercase, (value) => 1 - value);

  useEffect(() => {
    const lower = lowerRef.current;
    const upper = upperRef.current;
    if (!lower || !upper) return;
    const measure = () => {
      lowerWidth.set(lower.getBoundingClientRect().width);
      upperWidth.set(upper.getBoundingClientRect().width);
    };
    const observer = new ResizeObserver(measure);
    observer.observe(lower);
    observer.observe(upper);
    measure();
    return () => observer.disconnect();
  }, [lowerWidth, upperWidth]);

  return (
    <>
      <span className="sr-only">your</span>
      <motion.span aria-hidden="true" className="relative inline-grid" style={{ width }}>
        <motion.span ref={lowerRef} className="col-start-1 row-start-1 w-max" style={{ opacity: lowerOpacity }}>your</motion.span>
        <motion.span ref={upperRef} className="absolute left-0 top-0 w-max" style={{ opacity: uppercase }}>YOUR</motion.span>
      </motion.span>
    </>
  );
}

function HighlightWord({
  text,
  index,
  progress,
  reducedMotion,
}: {
  text: string;
  index: number;
  progress: MotionValue<number>;
  reducedMotion: boolean;
}) {
  const offset = EFFECTS.filter((effect) => effect.index < index).reduce(
    (total, effect) => total + effect.duration, 0,
  );
  const duration = EFFECTS.find((effect) => effect.index === index)?.duration ?? 2.4;
  const start = index + offset - 0.35;
  const end = index + offset + 1.1;
  const isPersonal = index === 1;
  const isYour = index === 9;
  const isCreed = index === 11;
  const colorDuration = isYour ? YOUR_COLOR_DURATION : duration;
  // The extra beat starts after full highlight and delays every following word.
  const effect = useTransform(progress, (value) =>
    reducedMotion ? 1 : ease(clamp((value * TIMELINE_LENGTH - end - 0.15) / (colorDuration - 0.65))),
  );
  const yourWeight = useTransform(progress, (value) => {
    const amount = reducedMotion ? 1 : ease(clamp(
      (value * TIMELINE_LENGTH - end - YOUR_COLOR_DURATION + 0.4) / YOUR_WEIGHT_DURATION,
    ));
    return 500 + amount * 200;
  });
  const emphasis = useTransform(progress, (value) => reducedMotion ? 1 : clamp(
    (value * TIMELINE_LENGTH - end - YOUR_COLOR_DURATION - YOUR_WEIGHT_DURATION + 0.25) / 5.4,
  ));
  const fingerReveal = useTransform(emphasis, (value) => ease(clamp(value / 0.37)));
  const yellow = useTransform(emphasis, (value) => ease(clamp((value - 0.37) / 0.37)));
  const uppercase = useTransform(emphasis, (value) => ease(clamp((value - 0.74) / 0.26)));
  const fingerWidth = useTransform(fingerReveal, (value) => `${value * 1.08}em`);
  const fingerX = useTransform(fingerReveal, [0, 1], ["-0.4em", "0em"]);
  const fingerFilter = useTransform(yellow, (value) =>
    value === 1 ? "none" : `grayscale(${1 - value})`);
  const color = useTransform(progress, (value) => {
    const position = value * TIMELINE_LENGTH;
    const lit = reducedMotion ? 1 : clamp((position - start) / (end - start));
    const highlighted = `color-mix(in srgb, var(--creed-text-tertiary) ${100 - lit * 100}%, var(--creed-text-primary))`;
    const amount = reducedMotion ? 1 : ease(clamp((position - end - 0.15) / (colorDuration - 0.65)));
    if (isPersonal) return `color-mix(in srgb, ${highlighted}, ${accentColorMap.skills} ${amount * 100}%)`;
    if (isYour) {
      const emphasisAmount = reducedMotion ? 1 : clamp(
        (position - end - YOUR_COLOR_DURATION - YOUR_WEIGHT_DURATION + 0.25) / 5.4,
      );
      const yellowAmount = ease(clamp((emphasisAmount - 0.37) / 0.37));
      if (yellowAmount > 0) return `color-mix(in srgb, ${accentColorMap.stack}, ${accentColorMap.identity} ${yellowAmount * 100}%)`;
      const cycling = transform(amount, [0, 0.2, 0.45, 0.7, 1], [
        accentColorMap.boundaries, accentColorMap.boundaries, accentColorMap.projects,
        accentColorMap.questions, accentColorMap.stack,
      ]);
      return `color-mix(in srgb, ${highlighted}, ${cycling} ${clamp(amount / 0.2) * 100}%)`;
    }
    return highlighted;
  });
  const padding = useTransform(effect, (value) => `${value * 0.16}em`);
  const backgroundColor = useTransform(effect, (value) => `color-mix(in srgb, transparent, ${accentColorMap.skills} ${value * 13.3}%)`);
  const hashWidth = useTransform(effect, (value) => `${value * 0.65}em`);
  const hashOpacity = useTransform(effect, (value) => value * 0.5);
  const markWidth = useTransform(effect, (value) => `${value * 0.95}em`);
  const markX = useTransform(effect, [0, 1], ["0.35em", "0em"]);
  const markOpacity = useTransform(effect, (value) => value ** 2.6);

  return (
    <motion.span
      className="relative inline-block whitespace-nowrap align-baseline"
      style={{
        color,
        ...(isYour ? { fontWeight: yourWeight } : {}),
        ...(isPersonal ? { paddingInline: padding, backgroundColor, borderRadius: "0.24em" } : {}),
      }}
    >
      {isPersonal ? (
        <motion.span aria-hidden="true" className="inline-block overflow-hidden align-bottom" style={{ width: hashWidth, opacity: hashOpacity }}>#</motion.span>
      ) : null}
      {isCreed ? (
        <motion.span aria-hidden="true" className="inline-block align-[-0.06em]" style={{ width: markWidth }}>
          <motion.span
            className="block h-[0.78em] w-[0.78em]"
            style={{
              backgroundColor: "#0066FF",
              opacity: markOpacity,
              x: markX,
              mask: "url(/assets/brand/icon.svg) center / contain no-repeat",
              WebkitMask: "url(/assets/brand/icon.svg) center / contain no-repeat",
            }}
          />
        </motion.span>
      ) : null}
      {isYour ? <YourLabel uppercase={uppercase} /> : text}
      {isYour ? (
        <motion.span aria-hidden="true" className="inline-block align-baseline" style={{ width: fingerWidth }}>
          <motion.span className="inline-block pl-[0.12em]" style={{ x: fingerX, opacity: fingerReveal, filter: fingerFilter }}>🫵</motion.span>
        </motion.span>
      ) : null}
    </motion.span>
  );
}

export function ScrollHighlightStatement() {
  const trackRef = useRef<HTMLElement>(null);
  const reducedMotion = useReducedMotion() === true;
  const { scrollYProgress } = useScroll({
    target: trackRef,
    offset: ["start start", "end end"],
  });

  return (
    <section
      ref={trackRef}
      className={
        reducedMotion
          ? "relative overflow-clip"
          : "relative h-[660vh] overflow-clip"
      }
    >
      {/* Tall track, sticky copy: progress can paint words while the
          paragraph stays on screen. */}
      <div className="sticky top-0 flex min-h-svh items-center justify-center bg-transparent px-6 py-24 [contain:paint]">
        <p className="t-section max-w-full text-center leading-[1.3]! text-[var(--creed-text-primary)]">
          {LINES.map((line) => (
            <span
              key={line.startIndex}
              className="block lg:whitespace-nowrap"
            >
              {line.words.map((text, wordIndex) => (
                <span key={`${line.startIndex}-${wordIndex}`}>
                  {wordIndex > 0 ? " " : null}
                  <HighlightWord
                    text={text}
                    index={line.startIndex + wordIndex}
                    progress={scrollYProgress}
                    reducedMotion={reducedMotion}
                  />
                </span>
              ))}
            </span>
          ))}
        </p>
      </div>
    </section>
  );
}
