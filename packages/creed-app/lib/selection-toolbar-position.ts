type Bounds = {
  left: number;
  top: number;
  width: number;
  height: number;
};

type SelectionBounds = {
  left: number;
  right: number;
  top: number;
  bottom: number;
};

export function selectionToolbarPosition({
  selection,
  viewport,
  toolbarHeight,
  toolbarWidth,
  gap,
  padding,
  pinToViewportBottom = false,
}: {
  selection: SelectionBounds;
  viewport: Bounds;
  toolbarHeight: number;
  toolbarWidth: number;
  gap: number;
  padding: number;
  pinToViewportBottom?: boolean;
}) {
  const viewportRight = viewport.left + viewport.width;
  const viewportBottom = viewport.top + viewport.height;
  const renderedWidth = Math.min(
    toolbarWidth,
    Math.max(viewport.width - padding * 2, 0),
  );
  const halfWidth = renderedWidth / 2;
  const selectionCentre =
    selection.left + (selection.right - selection.left) / 2;
  if (pinToViewportBottom) {
    return {
      x: viewport.left + viewport.width / 2,
      y: viewportBottom - toolbarHeight - padding,
      placeBelow: true,
    };
  }
  const x = Math.max(
    viewport.left + padding + halfWidth,
    Math.min(selectionCentre, viewportRight - padding - halfWidth),
  );
  const placeBelow =
    selection.top - toolbarHeight - gap < viewport.top + padding;
  const y = placeBelow
    ? Math.min(
        selection.bottom + gap,
        viewportBottom - toolbarHeight - padding,
      )
    : Math.max(
        selection.top - gap,
        viewport.top + padding + toolbarHeight,
      );

  return { x, y, placeBelow };
}
