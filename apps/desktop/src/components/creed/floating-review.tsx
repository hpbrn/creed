import { useEffect, useRef, useState, type ReactNode, type RefObject } from "react";
import { AnimatePresence, motion, useDragControls } from "motion/react";
import { GripVerticalIcon, type GripVerticalIconHandle } from "@/components/ui/grip-vertical";
import { FloatingClose } from "@/components/creed/floating-close";
import { useCanvasDrag } from "@/components/creed/use-canvas-drag";
import { ShortcutKey } from "@/components/creed/shortcut-key";

export function FloatingReview({ active, children, scrollRef }: { active: boolean; children: ReactNode; scrollRef: RefObject<HTMLElement | null> }) {
  const [open, setOpen] = useState(true);
  const controls = useDragControls();
  const gripRef = useRef<GripVerticalIconHandle | null>(null);
  const drag = useCanvasDrag(scrollRef);
  useEffect(() => {
    if (!active) return;
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (event.key.toLowerCase() !== "p" || event.metaKey || event.ctrlKey || event.altKey || event.shiftKey || event.repeat || event.isComposing || event.defaultPrevented || target?.isContentEditable || target?.closest("input, textarea, select, [role=dialog]")) return;
      event.preventDefault();
      setOpen((value) => !value);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [active]);
  return (
    <AnimatePresence>
      {active && open ? (
        <motion.div role="region" aria-label="Review proposals" drag dragListener={false} dragControls={controls} dragMomentum={false} dragElastic={0} ref={drag.ref} dragConstraints={drag.dragConstraints} style={drag.style} initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.97 }} transition={{ duration: 0.16, ease: [0.22, 1, 0.36, 1] }} className="fixed left-6 top-[76px] md:left-[244px] z-40 max-w-[calc(100vw-3rem)] flex items-center gap-1 overflow-auto rounded-[var(--radius-lg)] ring-1 ring-foreground/8 bg-[var(--creed-surface)] p-1 shadow-[var(--creed-shadow-popover)]">
          <button
            type="button"
            aria-label="Move review"
            onPointerDown={(event) => controls.start(event)}
            onMouseEnter={() => gripRef.current?.startAnimation()}
            onMouseLeave={() => gripRef.current?.stopAnimation()}
            className="flex h-7 w-5 shrink-0 cursor-grab touch-none items-center justify-center rounded-[6px] text-[var(--creed-text-tertiary)] transition-colors duration-150 hover:text-[var(--creed-text-primary)] active:cursor-grabbing"
          >
            <GripVerticalIcon ref={gripRef} size={14} className="inline-flex h-3.5 w-3.5 shrink-0 items-center justify-center leading-none" />
          </button>
          <ShortcutKey>P</ShortcutKey>
          {children}
          <FloatingClose label="Hide review" onClick={() => setOpen(false)} />
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
