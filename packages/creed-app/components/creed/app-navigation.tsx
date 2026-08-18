"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  preloadConnectionsScreen,
  preloadFileScreen,
  preloadSettingsScreen,
} from "@/components/creed/file-screen-loader";

export const APP_SURFACE_PATHS = ["/file", "/connections", "/settings"] as const;
export type AppSurfacePath = (typeof APP_SURFACE_PATHS)[number];

type AppNavigation = {
  path: string;
  navigate: (href: string) => void;
};

const AppNavigationContext = createContext<AppNavigation | null>(null);

export function appSurfaceFromPath(path: string): AppSurfacePath | null {
  const pathname = path.split("?")[0]?.split("#")[0] ?? "";
  return APP_SURFACE_PATHS.includes(pathname as AppSurfacePath)
    ? (pathname as AppSurfacePath)
    : null;
}

function preloadAppSurface(path: string) {
  if (path === "/file") preloadFileScreen();
  if (path === "/connections") preloadConnectionsScreen();
  if (path === "/settings") preloadSettingsScreen();
}

export function AppNavigationProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  // The (creed-app) layout is force-dynamic, so usePathname() stays on the
  // previous route until that layout refetch finishes. Hold the click target
  // until the real path catches up so the shell can swap immediately. from+to
  // lets a back, redirect, or other navigation drop a stale optimistic path.
  const [pending, setPending] = useState<{ from: string; to: string } | null>(
    null,
  );
  const path = pending?.to ?? pathname;

  useEffect(() => {
    if (!pending) return;
    if (pathname === pending.to || pathname !== pending.from) {
      setPending(null);
    }
  }, [pathname, pending]);

  useEffect(() => {
    const onPopState = () => setPending(null);
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  const navigate = useCallback(
    (href: string) => {
      const nextPath = appSurfaceFromPath(href) ?? href;
      preloadAppSurface(nextPath);
      if (appSurfaceFromPath(nextPath) && nextPath !== pathname) {
        setPending({ from: pathname, to: nextPath });
      } else {
        setPending(null);
      }
      router.push(href);
    },
    [pathname, router],
  );

  return (
    <AppNavigationContext.Provider value={{ path, navigate }}>
      {children}
    </AppNavigationContext.Provider>
  );
}

export function useAppPath() {
  const navigation = useContext(AppNavigationContext);
  const pathname = usePathname();
  return navigation?.path ?? pathname;
}

export function useAppNavigate() {
  const navigation = useContext(AppNavigationContext);
  const router = useRouter();
  return navigation?.navigate ?? ((href: string) => router.push(href));
}
