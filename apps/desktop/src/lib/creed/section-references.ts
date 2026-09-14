export type SectionReferenceTarget = {
  id: string;
  name: string;
  accent?: string;
};

const LEGACY_REFERENCE_NAMES: Record<string, string> = {
  "64c6096b430a4c00981d714a6b0c8b97": "identity",
  ca2aeea9b64c46b69bc094291b9de2e1: "goals",
  "755d131c97ec4301938b4cf836dea5ee": "work",
  "6d5e49b932ed42e5963fc57d27569bf0": "preferences",
  section1788251990826: "principles",
  section1788251979989: "boundaries",
  section1788251968994: "now",
  routines: "rhythm",
};

export function normalizeSectionReference(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/^#/, "")
    .replace(/[\s_-]+/g, "");
}

export function findSectionReferenceTarget<T extends SectionReferenceTarget>(
  rawValue: string,
  targets: readonly T[],
): T | null {
  const normalized = normalizeSectionReference(rawValue);
  if (!normalized) return null;
  const targetName = LEGACY_REFERENCE_NAMES[normalized];
  return (
    targets.find(
      (target) =>
        normalizeSectionReference(target.id) === normalized ||
        normalizeSectionReference(target.name) === normalized ||
        (targetName !== undefined &&
          normalizeSectionReference(target.name) === targetName),
    ) ?? null
  );
}
