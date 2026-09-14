export function toolbarCapacity(
  available: number,
  viewport: number,
  returningControls: number,
) {
  return viewport < 1024
    ? Math.min(available, available + 1024 - viewport - returningControls)
    : available;
}

export function toolbarLayout(
  available: number,
  fixed: number,
  sync: number,
  labelledActions: number,
  iconActions: number,
  previous?: { compactActions: boolean; compactSync: boolean },
  shrinking = false,
) {
  const compactActions =
    (shrinking && previous?.compactActions === true) ||
    fixed + sync + labelledActions + (previous?.compactActions ? 12 : 0) >
      available;
  return {
    compactActions,
    compactSync:
      compactActions &&
      ((shrinking && previous?.compactSync === true) ||
        fixed + sync + iconActions + (previous?.compactSync ? 12 : 0) >
          available),
  };
}
