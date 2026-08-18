// Token Creed grants: legacy tokens with no grant rows stay personal-only.
// Orphaned grants (left or deleted Creeds) stay empty and never fall through
// to the owner's Personal Creed.

export function resolveGrantedCreeds<T extends { id: string }>(
  allCreeds: T[],
  grantIds: readonly string[],
  personal: T | undefined,
): T[] {
  const grantedIds = new Set(grantIds);
  if (grantedIds.size === 0) {
    return personal ? [personal] : [];
  }
  return allCreeds.filter((creed) => grantedIds.has(creed.id));
}
