import {
  createContext,
  useContext,
  useLayoutEffect,
  useRef,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { toolbarCapacity, toolbarLayout } from "@/lib/toolbar-layout";

export const WindowToolbarContext = createContext<HTMLDivElement | null>(null);

export function FileToolbar({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const toolbar = ref.current;
    if (!toolbar) return;
    const title = toolbar.querySelector<HTMLElement>("[data-toolbar-title]");
    const sync = toolbar.querySelector<HTMLElement>("[data-sync-label]");
    const actions = toolbar.querySelector<HTMLElement>(
      ".creed-toolbar-actions",
    );
    if (!title || !sync || !actions) return;
    let frame: number | null = null;
    let previous: ReturnType<typeof toolbarLayout> | undefined;
    let previousViewport = window.innerWidth;
    let shrinking = false;
    const measure = () => {
      frame = null;
      const buttons = Array.from(actions.children).filter(
        (child): child is HTMLElement => child instanceof HTMLElement,
      );
      const width = (compact: boolean) => {
        const visible = buttons.filter((button) =>
          compact
            ? !button.classList.contains("md:inline-flex")
            : !button.classList.contains("md:hidden"),
        );
        return (
          visible.reduce((sum, button) => sum + button.offsetWidth, 0) +
          Math.max(0, visible.length - 1) * 8
        );
      };
      const fixedWidth = title.scrollWidth + 12 + 16 + 12;
      const labelWidth = sync.scrollWidth;
      const syncWidth = labelWidth + 8;
      const viewport = window.innerWidth;
      const controls = toolbar
        .closest("header")
        ?.querySelector<HTMLElement>(".creed-sidebar-controls");
      const available = toolbar.clientWidth - 12;
      const stableAvailable = controls
        ? toolbarCapacity(available, viewport, controls.offsetWidth + 20)
        : available;
      if (viewport !== previousViewport)
        shrinking = viewport < previousViewport;
      previousViewport = viewport;
      const layout = toolbarLayout(
        stableAvailable,
        fixedWidth,
        syncWidth,
        width(false),
        width(true),
        previous,
        shrinking,
      );
      previous = layout;
      const compactActions = String(layout.compactActions);
      const compactSync = String(layout.compactSync);
      if (toolbar.dataset.compactActions !== compactActions)
        toolbar.dataset.compactActions = compactActions;
      if (toolbar.dataset.compactSync !== compactSync)
        toolbar.dataset.compactSync = compactSync;
      const labelSize = `${labelWidth}px`;
      if (toolbar.style.getPropertyValue("--sync-label-width") !== labelSize)
        toolbar.style.setProperty("--sync-label-width", labelSize);
    };
    const observer = new ResizeObserver(() => {
      if (frame === null) frame = requestAnimationFrame(measure);
    });
    [toolbar, title, sync, ...Array.from(actions.children)].forEach((node) =>
      observer.observe(node),
    );
    measure();
    return () => {
      observer.disconnect();
      if (frame !== null) cancelAnimationFrame(frame);
    };
  }, []);
  return (
    <div
      ref={ref}
      className="creed-responsive-toolbar flex w-full min-w-0 items-center justify-between gap-3"
      data-tauri-drag-region
    >
      {children}
    </div>
  );
}

export function WindowToolbar({
  children,
  active,
}: {
  children: ReactNode;
  active: boolean;
}) {
  const target = useContext(WindowToolbarContext);
  return target && active ? createPortal(children, target) : null;
}
