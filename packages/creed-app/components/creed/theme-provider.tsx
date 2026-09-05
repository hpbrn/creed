"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";

type Theme = "light" | "dark";
type Origin = { x: number; y: number };

type ViewTransition = {
  ready: Promise<void>;
  finished: Promise<void>;
};

const ThemeContext = createContext<{
  theme: Theme;
  toggleTheme: (origin?: Origin) => void;
} | null>(null);

const KEY = "creed:theme";
const SWITCHING_CLASS = "creed-theme-switching";
const REVEAL_STYLE_ID = "creed-theme-reveal";
const TRANSITION_MS = 520;
const REVEAL_EASE = "cubic-bezier(0.22, 1, 0.36, 1)";
const CIRCLE_MASK = `url("data:image/svg+xml,${encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 8 8"><circle cx="4" cy="4" r="4" fill="white"/></svg>',
)}")`;

function apply(theme: Theme) {
  const root = document.documentElement;
  root.classList.toggle("dark", theme === "dark");
  root.style.colorScheme = theme;
}

function themeFromDocument(): Theme {
  return document.documentElement.classList.contains("dark") ? "dark" : "light";
}

function systemTheme(): Theme {
  return typeof matchMedia !== "undefined" &&
    matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

function guardThemeSwitchTransitions() {
  const root = document.documentElement;
  root.classList.add(SWITCHING_CLASS);
  return () => root.classList.remove(SWITCHING_CLASS);
}

function suspendOffscreenFileSections() {
  const viewportBuffer = 128;
  const sections = Array.from(
    document.querySelectorAll<HTMLElement>("[data-theme-snapshot-section]"),
  );
  const offscreen = sections
    .map((element) => ({ element, rect: element.getBoundingClientRect() }))
    .filter(
      ({ rect }) =>
        rect.bottom < -viewportBuffer ||
        rect.top > innerHeight + viewportBuffer,
    );
  const suspended = offscreen.map(({ element, rect }) => ({
    element,
    previousHeight: element.style.height,
    height: Math.ceil(rect.height),
  }));

  for (const { element, height } of suspended) {
    element.style.height = `${height}px`;
    element.setAttribute("data-theme-snapshot-hidden", "true");
  }

  let restored = false;
  return () => {
    if (restored) return;
    restored = true;
    for (const { element, previousHeight } of suspended) {
      element.removeAttribute("data-theme-snapshot-hidden");
      element.style.height = previousHeight;
    }
  };
}

function persistTheme(theme: Theme) {
  try {
    localStorage.setItem(KEY, theme);
  } catch {
    // Storage can be unavailable in restricted browser contexts.
  }
}

function originForToggle(explicit: Origin | undefined, pointer: Origin | null) {
  if (explicit) return explicit;
  if (pointer) return pointer;
  const control = document.querySelector<HTMLElement>(
    'button[aria-label="Dark mode"], button[aria-label="Light mode"]',
  );
  const target = control?.querySelector("svg") ?? control;
  if (target) {
    const rect = target.getBoundingClientRect();
    return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
  }
  return { x: innerWidth / 2, y: innerHeight / 2 };
}

function installRevealStyle(origin: Origin) {
  const radius = Math.hypot(
    Math.max(origin.x, innerWidth - origin.x),
    Math.max(origin.y, innerHeight - origin.y),
  );
  const size = Math.ceil(radius * 2.1);
  let style = document.getElementById(REVEAL_STYLE_ID);
  if (!style) {
    style = document.createElement("style");
    style.id = REVEAL_STYLE_ID;
    document.head.append(style);
  }
  // Clip-path on ::view-transition-* is ignored in some engines, which
  // leaves the default fade (a pulse from the centre). A mask animation
  // with coordinates written into the sheet is what production theme
  // wipes use, and it starts with the pseudo-elements.
  style.textContent = `
::view-transition-new(root) {
  mask: ${CIRCLE_MASK} 0 0 / 0 no-repeat;
  -webkit-mask: ${CIRCLE_MASK} 0 0 / 0 no-repeat;
  animation: creed-theme-reveal ${TRANSITION_MS}ms ${REVEAL_EASE} both;
}
@keyframes creed-theme-reveal {
  from {
    mask-size: 0px;
    mask-position: ${origin.x}px ${origin.y}px;
    -webkit-mask-size: 0px;
    -webkit-mask-position: ${origin.x}px ${origin.y}px;
  }
  to {
    mask-size: ${size}px;
    mask-position: ${origin.x - size / 2}px ${origin.y - size / 2}px;
    -webkit-mask-size: ${size}px;
    -webkit-mask-position: ${origin.x - size / 2}px ${origin.y - size / 2}px;
  }
}
`;
  return () => {
    style?.remove();
  };
}

export function ThemeProvider({
  children,
  followSystem = false,
}: {
  children: ReactNode;
  followSystem?: boolean;
}) {
  const [theme, setTheme] = useState<Theme>(() =>
    typeof document === "undefined" ? "light" : themeFromDocument(),
  );
  const pointer = useRef<Origin | null>(null);
  const revealing = useRef(false);

  useEffect(() => {
    const stored = localStorage.getItem(KEY) as Theme | null;
    const initial = stored ?? (followSystem ? systemTheme() : "light");
    setTheme(initial);
    apply(initial);

    const preference = followSystem
      ? matchMedia("(prefers-color-scheme: dark)")
      : null;
    const onScheme = (event: MediaQueryListEvent) => {
      if (localStorage.getItem(KEY)) return;
      const next: Theme = event.matches ? "dark" : "light";
      setTheme(next);
      apply(next);
    };
    preference?.addEventListener("change", onScheme);

    const onPointer = (event: PointerEvent) => {
      pointer.current = { x: event.clientX, y: event.clientY };
    };
    window.addEventListener("pointerdown", onPointer, { passive: true });
    window.addEventListener("pointermove", onPointer, { passive: true });
    return () => {
      preference?.removeEventListener("change", onScheme);
      window.removeEventListener("pointerdown", onPointer);
      window.removeEventListener("pointermove", onPointer);
    };
  }, [followSystem]);

  const toggleTheme = useCallback((origin?: Origin) => {
    if (revealing.current) return;

    const next: Theme = themeFromDocument() === "dark" ? "light" : "dark";
    const start = (
      document as Document & {
        startViewTransition?: (cb: () => void) => ViewTransition;
      }
    ).startViewTransition?.bind(document);
    const reduceMotion =
      typeof matchMedia !== "undefined" &&
      matchMedia("(prefers-reduced-motion: reduce)").matches;
    const isFileRoute = window.location.pathname === "/file";
    const p = originForToggle(origin, pointer.current);

    const commit = () => {
      const removeTransitionGuard = guardThemeSwitchTransitions();
      apply(next);
      persistTheme(next);
      setTheme(next);
      revealing.current = false;
      requestAnimationFrame(() => {
        requestAnimationFrame(removeTransitionGuard);
      });
    };

    if (reduceMotion || !start) {
      commit();
      return;
    }

    revealing.current = true;
    const removeRevealStyle = installRevealStyle(p);
    const removeTransitionGuard = guardThemeSwitchTransitions();
    const restoreOffscreenSections = isFileRoute
      ? suspendOffscreenFileSections()
      : () => {};

    const settle = () => {
      apply(next);
      persistTheme(next);
      setTheme(next);
      restoreOffscreenSections();
      removeTransitionGuard();
      removeRevealStyle();
      revealing.current = false;
    };

    let transition: ViewTransition;
    try {
      transition = start(() => {
        apply(next);
      });
    } catch {
      settle();
      return;
    }

    void transition.ready.catch(() => {});
    void transition.finished.then(settle, settle);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.key !== "m" && e.key !== "M") || e.metaKey || e.ctrlKey || e.altKey)
        return;
      if (e.repeat || e.isComposing || e.defaultPrevented) return;
      const t = e.target as HTMLElement | null;
      if (!t || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName) || t.isContentEditable)
        return;
      e.preventDefault();
      toggleTheme();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [toggleTheme]);

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used inside ThemeProvider");
  return ctx;
}
