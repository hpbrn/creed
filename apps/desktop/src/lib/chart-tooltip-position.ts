export function chartTooltipPosition(
  x: number, y: number, width: number, height: number,
  tooltipWidth: number, tooltipHeight: number,
) {
  return {
    x: Math.max(0, Math.min(x + 12, width - tooltipWidth)),
    y: Math.max(0, Math.min(y + 12, height - tooltipHeight)),
  };
}
