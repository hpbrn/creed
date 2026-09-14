import {
  createContext,
  useContext,
  useState,
  useCallback,
  startTransition,
  type ReactNode,
} from "react";
import { flushEdits, refresh } from "@/lib/native/workspace";
import { toast } from "sonner";

export const APP_SURFACE_PATHS = [
  "/file",
  "/connections",
  "/settings",
] as const;
export type AppSurfacePath = (typeof APP_SURFACE_PATHS)[number];
export function appSurfaceFromPath(path: string): AppSurfacePath | null {
  const candidate = path.split(/[?#]/)[0];
  return APP_SURFACE_PATHS.includes(candidate as AppSurfacePath)
    ? (candidate as AppSurfacePath)
    : null;
}
const Context = createContext({
  path: "/file",
  navigate: (_href: string) => {},
});
export function AppNavigationProvider({ children }: { children: ReactNode }) {
  const [path, setPath] = useState("/file");
  const navigate = useCallback((href: string) => {
    startTransition(() => setPath(appSurfaceFromPath(href) ?? "/file"));
    void flushEdits().catch((error: unknown) => toast.error(String(error)));
  }, []);
  return (
    <Context.Provider value={{ path, navigate }}>{children}</Context.Provider>
  );
}
export const useAppPath = () => useContext(Context).path;
export const useAppNavigate = () => useContext(Context).navigate;
export const usePathname = useAppPath;
export function useRouter() {
  const navigate = useAppNavigate();
  return { push: navigate, replace: navigate, refresh: () => void refresh() };
}
