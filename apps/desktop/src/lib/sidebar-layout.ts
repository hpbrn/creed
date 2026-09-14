export const SIDEBAR_COLLAPSE_WIDTH = 1024;
export const SIDEBAR_EXPAND_WIDTH = 1048;

export function sidebarAvailableAt(
  width: number,
  previouslyAvailable: boolean,
) {
  return (
    width >=
    (previouslyAvailable ? SIDEBAR_COLLAPSE_WIDTH : SIDEBAR_EXPAND_WIDTH)
  );
}
