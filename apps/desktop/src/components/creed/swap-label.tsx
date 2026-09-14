import { useLayoutEffect, useRef, useState } from "react";

import { cn } from "@/components/ui/utils";

// Sub-pixel measure + overflow-hidden clips the last glyph. A 2px pad keeps
// Copy / Hide / Imported fully visible without changing the 300ms ease.
const WIDTH_PAD = 2;
const widthCache = new Map<string, Record<string, number>>();

function paddedWidth(width: number) {
  return Math.ceil(width) + WIDTH_PAD;
}

function isCompleteMeasure(
  labels: readonly string[],
  widths: Record<string, number> | null | undefined,
) {
  return !!widths && labels.every((label) => (widths[label] ?? 0) > 0);
}

/**
 * Different-width labels snap the button and shove neighbours unless the
 * wrapper is locked to the measured active width and animated between them.
 * The first paint stays unanimated so a remounted menu row does not shrink
 * from the longest option down to the current one. The transition is armed
 * after measurement settles, before the first user-triggered value change.
 */
export function SwapLabel({
  value,
  options,
  className,
}: {
  value: string;
  options: readonly string[];
  className?: string;
}) {
  const optionKey = Array.from(
    new Set(options.includes(value) ? options : [...options, value]),
  ).join("\0");
  const labels = optionKey.split("\0");
  const refs = useRef(new Map<string, HTMLSpanElement>());
  const cachedWidths = widthCache.get(optionKey);
  const hasCachedWidths = isCompleteMeasure(labels, cachedWidths);
  const [widths, setWidths] = useState<Record<string, number> | null>(
    hasCachedWidths ? cachedWidths! : null,
  );
  const [ready, setReady] = useState(false);

  useLayoutEffect(() => {
    setReady(false);
    let armed = false;
    let frame: number | null = null;
    let settleFrame: number | null = null;
    const currentLabels = optionKey.split("\0");
    const measure = () => {
      const next: Record<string, number> = {};
      for (const label of currentLabels) {
        const node = refs.current.get(label);
        if (!node) continue;
        const width = node.getBoundingClientRect().width;
        // Hidden persistent surfaces measure as 0. Ignore those so the first
        // visible paint snaps instead of sliding from a 2px stub.
        if (width > 0) next[label] = width;
      }
      if (!isCompleteMeasure(currentLabels, next)) {
        if (frame !== null) window.cancelAnimationFrame(frame);
        if (settleFrame !== null) window.cancelAnimationFrame(settleFrame);
        frame = null;
        settleFrame = null;
        armed = false;
        setReady(false);
        return;
      }
      widthCache.set(optionKey, next);
      setWidths((current) => {
        if (
          current &&
          currentLabels.every(
            (label) =>
              current[label] !== undefined &&
              Math.abs(current[label] - next[label]) < 0.5,
          )
        ) {
          return current;
        }
        return next;
      });
      if (!armed && frame === null && settleFrame === null) {
        frame = window.requestAnimationFrame(() => {
          frame = null;
          settleFrame = window.requestAnimationFrame(() => {
            settleFrame = null;
            armed = true;
            setReady(true);
          });
        });
      }
    };

    measure();
    const observer = new ResizeObserver(measure);
    for (const node of refs.current.values()) {
      observer.observe(node);
    }
    return () => {
      observer.disconnect();
      if (frame !== null) window.cancelAnimationFrame(frame);
      if (settleFrame !== null) window.cancelAnimationFrame(settleFrame);
    };
  }, [optionKey]);

  const labelClassName =
    "col-start-1 row-start-1 w-fit justify-self-start whitespace-nowrap transition-opacity duration-200 ease-out motion-reduce:transition-none";

  return (
    <>
      <span
        aria-hidden="true"
        className={cn(
          "grid min-w-0 shrink-0 grid-cols-1 grid-rows-1 overflow-hidden",
          ready &&
            "transition-[width] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none",
          className,
        )}
        style={{
          width:
            widths?.[value] == null ? undefined : paddedWidth(widths[value]),
        }}
      >
        {labels.map((label) => (
          <span
            key={label}
            ref={(node) => {
              if (node) {
                refs.current.set(label, node);
              } else {
                refs.current.delete(label);
              }
            }}
            className={cn(
              labelClassName,
              label === value ? "opacity-100" : "opacity-0",
            )}
          >
            {label}
          </span>
        ))}
      </span>
      <span className="sr-only">{value}</span>
    </>
  );
}
