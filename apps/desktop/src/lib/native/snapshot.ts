// Native IPC deserializes fresh objects. Retain unchanged branches so a file
// poll does not invalidate React selectors or reparse every editor document.
export function reconcileSnapshot<T>(previous: T, next: T): T {
  if (Object.is(previous, next)) return previous;
  if (Array.isArray(previous) && Array.isArray(next)) {
    const items = next.map((item, index) =>
      reconcileSnapshot(previous[index], item),
    );
    return (
      items.length === previous.length &&
      items.every((item, index) => item === previous[index])
        ? previous
        : items
    ) as T;
  }
  if (
    previous !== null &&
    next !== null &&
    typeof previous === "object" &&
    typeof next === "object" &&
    !Array.isArray(previous) &&
    !Array.isArray(next)
  ) {
    const before = previous as Record<string, unknown>;
    const after = next as Record<string, unknown>;
    const keys = Object.keys(after);
    let unchanged = Object.keys(before).length === keys.length;
    const result: Record<string, unknown> = {};
    for (const key of keys) {
      result[key] = reconcileSnapshot(before[key], after[key]);
      if (!Object.hasOwn(before, key) || result[key] !== before[key])
        unchanged = false;
    }
    return unchanged ? previous : (result as T);
  }
  return next;
}
