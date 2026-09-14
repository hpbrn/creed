import { useLayoutEffect, useState, type RefObject } from "react";
import { createPortal } from "react-dom";

type HighlightRect = {
  left: number;
  top: number;
  width: number;
  height: number;
  active: boolean;
};

export function FindHighlights({
  ranges,
  activeIndex,
  scrollRef,
}: {
  ranges: Range[];
  activeIndex: number;
  scrollRef: RefObject<HTMLElement | null>;
}) {
  const [rects, setRects] = useState<HighlightRect[]>([]);
  useLayoutEffect(() => {
    const canvas = scrollRef.current;
    if (!canvas) return;
    let frame = 0;
    const measure = () => {
      const bounds = canvas.getBoundingClientRect();
      const next: HighlightRect[] = [];
      ranges.forEach((range, index) => {
        if (!range.startContainer.isConnected) return;
        for (const rect of range.getClientRects()) {
          const left = Math.max(rect.left, bounds.left);
          const top = Math.max(rect.top, bounds.top);
          const right = Math.min(rect.right, bounds.right);
          const bottom = Math.min(rect.bottom, bounds.bottom);
          if (right > left && bottom > top)
            next.push({
              left,
              top,
              width: right - left,
              height: bottom - top,
              active: index === activeIndex,
            });
        }
      });
      setRects(next);
    };
    const schedule = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(measure);
    };
    measure();
    const observer = new ResizeObserver(schedule);
    observer.observe(canvas);
    window.addEventListener("scroll", schedule, true);
    window.addEventListener("resize", schedule);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener("scroll", schedule, true);
      window.removeEventListener("resize", schedule);
    };
  }, [ranges, activeIndex, scrollRef]);
  return createPortal(
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-20">
      {rects.map(({ active, ...rect }, index) => (
        <span
          key={index}
          className="absolute rounded-[3px]"
          style={{
            ...rect,
            background: active
              ? "rgb(59 130 246 / 0.32)"
              : "rgb(59 130 246 / 0.14)",
          }}
        />
      ))}
    </div>,
    document.body,
  );
}
