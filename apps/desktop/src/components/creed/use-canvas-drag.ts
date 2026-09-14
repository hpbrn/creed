import { useLayoutEffect, useState, type RefObject } from "react";
import { useMotionValue } from "motion/react";

export function useCanvasDrag(scrollRef: RefObject<HTMLElement | null>) {
  const [element, ref] = useState<HTMLDivElement | null>(null);
  const [bounds, setBounds] = useState({ left: 0, right: 0, top: 0, bottom: 0 });
  const [size, setSize] = useState<{ maxWidth?: number; maxHeight?: number }>({});
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  useLayoutEffect(() => {
    const canvas = scrollRef.current?.closest<HTMLElement>(".creed-file-card");
    if (!element || !canvas) return;
    const measure = () => {
      const area = canvas.getBoundingClientRect();
      if (!area.width || !area.height) return;
      const rect = element.getBoundingClientRect();
      const originX = rect.left - x.get() - (element.offsetWidth - rect.width) / 2;
      const originY = rect.top - y.get() - (element.offsetHeight - rect.height) / 2;
      const left = area.left + 8 - originX;
      const top = area.top + 8 - originY;
      const next = {
        left,
        top,
        right: Math.max(left, area.right - 8 - element.offsetWidth - originX),
        bottom: Math.max(top, area.bottom - 8 - element.offsetHeight - originY),
      };
      setSize({ maxWidth: Math.max(0, area.width - 16), maxHeight: Math.max(0, area.height - 16) });
      setBounds(next);
      x.set(Math.max(next.left, Math.min(next.right, x.get())));
      y.set(Math.max(next.top, Math.min(next.bottom, y.get())));
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(canvas);
    observer.observe(element);
    window.addEventListener("resize", measure);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [element, scrollRef, x, y]);
  return { ref, dragConstraints: bounds, style: { x, y, ...size } };
}
