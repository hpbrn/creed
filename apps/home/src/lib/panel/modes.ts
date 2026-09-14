export type PanelMode = "search" | "ask" | "agent";

const NEXT_PANEL_MODE: Record<PanelMode, PanelMode> = {
  search: "ask",
  ask: "agent",
  agent: "search",
};

export function nextPanelMode(mode: PanelMode): PanelMode {
  return NEXT_PANEL_MODE[mode];
}
