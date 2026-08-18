export const OPEN_ENTER_PATH = "/enter";
export const OPEN_SETUP_PATH = "/setup";
export const OPEN_DEFAULT_NEXT_PATH = "/file";

export function safeOpenNextPath(
  requested: string | undefined,
  fallback = OPEN_DEFAULT_NEXT_PATH,
) {
  if (requested?.startsWith("/") && !requested.startsWith("//")) return requested;
  return fallback;
}

export function withOpenNextQuery(pathname: string, nextPath: string) {
  if (nextPath === OPEN_DEFAULT_NEXT_PATH || nextPath === pathname) return pathname;
  return `${pathname}?next=${encodeURIComponent(nextPath)}`;
}
