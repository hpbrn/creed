import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
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
const COOKIE_KEY = "creed-theme";
const INITIAL_THEME_BOUNDARY_ID = "creed-initial-theme";
const SWITCHING_CLASS = "creed-theme-switching";
const TRANSITION_MS = 520;
const REVEAL_EASE = "cubic-bezier(0.22, 1, 0.36, 1)";

function apply(theme: Theme) {
  const root = document.documentElement;
  root.classList.toggle("dark", theme === "dark");
  root.classList.toggle("light", theme === "light");
  root.style.colorScheme = theme;
  document
    .getElementById(INITIAL_THEME_BOUNDARY_ID)
    ?.classList.remove("dark", "light");
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
  persistThemeCookie(theme);
}

function persistThemeCookie(theme: Theme) {
  document.cookie = `${COOKIE_KEY}=${theme}; Path=/; Max-Age=31536000; SameSite=Lax`;
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

function animateThemeReveal(origin: Origin) {
  const radius = Math.hypot(
    Math.max(origin.x, innerWidth - origin.x),
    Math.max(origin.y, innerHeight - origin.y),
  );
  document.documentElement.animate(
    {
      clipPath: [
        `circle(0px at ${origin.x}px ${origin.y}px)`,
        `circle(${Math.ceil(radius)}px at ${origin.x}px ${origin.y}px)`,
      ],
    },
    {
      duration: TRANSITION_MS,
      easing: REVEAL_EASE,
      pseudoElement: "::view-transition-new(root)",
    } as KeyframeAnimationOptions & { pseudoElement: string },
  );
}

export function ThemeProvider({
  children,
  followSystem = false,
}: {
  children: ReactNode;
  followSystem?: boolean;
}) {
  const [theme, setTheme] = useState<Theme>("light");
  const pointer = useRef<Origin | null>(null);
  const revealing = useRef(false);

  // Hydration rewrites `html.className` from the server string and drops the
  // classes theme-init set. Restore from storage before the browser paints so
  // marketing routes (no cookie-backed inner `.dark`) do not flash.
  useLayoutEffect(() => {
    const stored = localStorage.getItem(KEY) as Theme | null;
    const initial = stored ?? (followSystem ? systemTheme() : "light");
    setTheme(initial);
    apply(initial);
    persistThemeCookie(initial);
  }, [followSystem]);

  useEffect(() => {
    const preference = followSystem
      ? matchMedia("(prefers-color-scheme: dark)")
      : null;
    const onScheme = (event: MediaQueryListEvent) => {
      // A device-theme change ends a temporary manual override and resumes following macOS.
      localStorage.removeItem(KEY);
      const next: Theme = event.matches ? "dark" : "light";
      setTheme(next);
      apply(next);
      persistThemeCookie(next);
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

    void transition.ready.then(
      () => animateThemeReveal(p),
      () => {},
    );
    void transition.finished.then(settle, settle);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (
        (e.key !== "m" && e.key !== "M") ||
        e.metaKey ||
        e.ctrlKey ||
        e.altKey
      )
        return;
      if (e.repeat || e.isComposing || e.defaultPrevented) return;
      const t = e.target as HTMLElement | null;
      if (
        !t ||
        /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName) ||
        t.isContentEditable
      )
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
