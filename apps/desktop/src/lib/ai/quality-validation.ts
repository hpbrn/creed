import {
  GOALS_SECTION_ID,
  IDENTITY_SECTION_ID,
  PREFERENCES_SECTION_ID,
  ROUTINES_SECTION_ID,
  WORK_SECTION_ID,
  type CreedSection,
} from "@/lib/creed/creed-data";
import type {
  AnalysisGuidance,
  AnalysisGuidanceType,
  CreedQualityReport,
  QualityNote,
} from "@/lib/ai/quality-types";
export const QUALITY_TAG_VOCAB = {
  green: [
    "Specific",
    "Concrete",
    "Actionable",
    "Durable",
    "Examples",
    "Current",
    "Tight",
  ],
  amber: ["Generic", "Thin", "Surface", "Wordy", "Drifty"],
  red: [
    "Bloated",
    "Vague",
    "Empty",
    "Context",
    "Stale",
    "Off-topic",
    "No examples",
    "Contradiction",
  ],
} as const;

const ALL_TAGS = new Set<string>([
  ...QUALITY_TAG_VOCAB.green,
  ...QUALITY_TAG_VOCAB.amber,
  ...QUALITY_TAG_VOCAB.red,
]);

const RED_TAGS = new Set<string>(QUALITY_TAG_VOCAB.red);
const AMBER_TAGS = new Set<string>(QUALITY_TAG_VOCAB.amber);
const GREEN_TAGS = new Set<string>(QUALITY_TAG_VOCAB.green);
const GUIDANCE_TYPES = new Set<AnalysisGuidanceType>([
  "edit",
  "ask",
  "remove",
  "move",
  "review",
]);

function clampScore(value: unknown) {
  const numeric = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(numeric)) {
    return 0;
  }

  return Math.max(0, Math.min(100, Math.round(numeric)));
}

// The visible evidence (the tags, and whether a gap is named) pins the allowed
// score, so the number can never disagree with what the popover shows. A red
// tag means a best practice is broken; an amber tag or a named gap means
// something is still missing. Clean evidence does not raise a low model score;
// it only leaves the model's chosen band intact.
function evidenceRange(tags: string[], hasGap: boolean): [number, number] {
  const reds = tags.filter((tag) => RED_TAGS.has(tag)).length;
  const ambers = tags.filter((tag) => AMBER_TAGS.has(tag)).length;
  if (reds >= 3) return [0, 61];
  if (reds === 2) return [0, 77];
  if (reds === 1) return [0, 89];
  if (ambers >= 1 || hasGap) return [0, 89];
  return [0, 100];
}

function tagsForScore(tags: string[], score: number) {
  if (score >= 90) {
    return tags.filter((tag) => !RED_TAGS.has(tag) && !AMBER_TAGS.has(tag));
  }
  return tags;
}

function reconcileOverallEvidence(
  computedScore: number,
  overall: Pick<OverallQualitative, "tags" | "gap" | "guidance">,
) {
  let gap = overall.gap;
  const [, initialEvidenceCeiling] = evidenceRange(
    overall.tags,
    gap !== null || overall.guidance !== null,
  );
  let score = Math.min(clampScore(computedScore), initialEvidenceCeiling);
  if (!gap && score < 90) {
    gap = fallbackGapFromTags(overall.tags) ?? {
      title: "Score needs evidence",
      detail:
        "The overall score is below 90, but the analysis did not identify the specific issue holding it back.",
    };
  }
  const linkedEvidence = linkEvidenceTags(overall.tags, null, gap);
  const [, finalEvidenceCeiling] = evidenceRange(
    linkedEvidence.tags,
    gap !== null || overall.guidance !== null,
  );
  score = Math.min(score, finalEvidenceCeiling);
  return { score, tags: tagsForScore(linkedEvidence.tags, score), gap };
}

// Last-resort gap so a sub-90 section always tells the user what is costing it
// points. The rubric requires the model to supply a real, specific gap; this
// only fires if it flagged the section yet named no gap.
function fallbackGapFromTags(tags: string[]): QualityNote | null {
  const flagged =
    tags.find((tag) => RED_TAGS.has(tag)) ??
    tags.find((tag) => AMBER_TAGS.has(tag));
  if (!flagged) {
    return null;
  }
  return {
    title: "Held back",
    detail: `Flagged "${flagged}"; resolve that to lift the score.`,
  };
}

// The five always-on core sections. The overall score is computed from these
// (weighted) rather than asked of the model, so the headline can never drift
// from the section scores underneath it.
const CORE_SECTION_IDS = new Set<string>([
  IDENTITY_SECTION_ID,
  GOALS_SECTION_ID,
  WORK_SECTION_ID,
  PREFERENCES_SECTION_ID,
  ROUTINES_SECTION_ID,
]);

// Deterministic overall score: strong essentials are the floor, good extra
// context is the climb. A flawless core alone tops out around 90; rich,
// well-written non-core sections (optional or custom) lift it toward 100. Weak
// extras never drag the headline, so trying new context is never punished, and
// a hollow core caps the whole file. So 95-100 needs a strong core AND rich
// additional context.
function computeOverallScore(
  sections: Array<{ sectionId: string; score: number }>,
) {
  if (!sections.length) {
    return 0;
  }

  const coreScores = sections
    .filter((section) => CORE_SECTION_IDS.has(section.sectionId))
    .map((section) => section.score);
  if (!coreScores.length) {
    // No core sections present (unusual): fall back to a plain average.
    return clampScore(
      sections.reduce((sum, section) => sum + section.score, 0) /
        sections.length,
    );
  }

  const coreAvg =
    coreScores.reduce((sum, value) => sum + value, 0) / coreScores.length;
  if (Math.min(...coreScores) < 40) {
    return clampScore(Math.min(coreAvg, 70));
  }

  const base = Math.min(coreAvg, 90);
  const extras = sections.filter(
    (section) =>
      !CORE_SECTION_IDS.has(section.sectionId) && section.score >= 70,
  );
  const lift = Math.min(
    10,
    extras.reduce((sum, section) => sum + (section.score - 70) / 30, 0) * 4,
  );
  return clampScore(base + lift);
}

function normalizeStringArray(value: unknown, fallback: string[]) {
  if (!Array.isArray(value)) {
    return fallback;
  }

  const items = value
    .map((item) => (typeof item === "string" ? item.trim() : ""))
    .filter(Boolean)
    .slice(0, 6);

  return items.length ? items : fallback;
}

function normalizeTags(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of value) {
    if (typeof raw !== "string") continue;
    const trimmed = raw.trim();
    if (!ALL_TAGS.has(trimmed) || seen.has(trimmed)) continue;
    seen.add(trimmed);
    out.push(trimmed);
    if (out.length >= 3) break;
  }
  return out;
}

function normalizeNote(
  value: unknown,
  fallbackTitle?: string,
  allowedTags?: ReadonlySet<string>,
): QualityNote | null {
  // Accept either the new {title, detail} shape, the array fallback (first
  // string with sane heuristics), or null/undefined.
  if (value && typeof value === "object") {
    const obj = value as Record<string, unknown>;
    const title = typeof obj.title === "string" ? obj.title.trim() : "";
    const detail = typeof obj.detail === "string" ? obj.detail.trim() : "";
    const tag =
      typeof obj.tag === "string" && (!allowedTags || allowedTags.has(obj.tag))
        ? obj.tag
        : undefined;
    if (title && detail) {
      return {
        title: title.slice(0, 60),
        detail: detail.slice(0, 240),
        ...(tag ? { tag } : {}),
      };
    }
    if (title) {
      return { title: title.slice(0, 60), detail: title };
    }
    if (detail) {
      return {
        title: fallbackTitle ?? detail.split(/[.,;:]/)[0].slice(0, 60),
        detail: detail.slice(0, 240),
      };
    }
  }

  if (typeof value === "string" && value.trim()) {
    const text = value.trim();
    return {
      title: fallbackTitle ?? text.split(/[.,;:]/)[0].slice(0, 60),
      detail: text.slice(0, 240),
    };
  }

  return null;
}

function inferGapTag(note: QualityNote): string {
  const text = `${note.title} ${note.detail}`.toLowerCase();
  if (/contradict|conflict|inconsistent/.test(text)) return "Contradiction";
  if (/stale|outdated|date|no longer current/.test(text)) return "Stale";
  if (/duplicate|repeat|redundan|bloat/.test(text)) return "Bloated";
  if (/wordy|verbose|long-winded/.test(text)) return "Bloated";
  if (/example|evidence|proof/.test(text)) return "No examples";
  if (/off-topic|misplaced|wrong section|move/.test(text)) return "Off-topic";
  if (/empty|placeholder/.test(text)) return "Empty";
  if (/vague|broad|generic|unclear|abstract/.test(text)) return "Vague";
  return "Context";
}

function linkEvidenceTags(
  rawTags: string[],
  strength: QualityNote | null,
  gap: QualityNote | null,
) {
  const strengthTag =
    strength?.tag ?? rawTags.find((tag) => GREEN_TAGS.has(tag));
  const gapTag = gap?.tag ?? (gap ? inferGapTag(gap) : undefined);
  const linkedStrength =
    strength && strengthTag ? { ...strength, tag: strengthTag } : strength;
  const linkedGap = gap && gapTag ? { ...gap, tag: gapTag } : gap;
  const tags = normalizeTags([
    ...(strengthTag ? [strengthTag] : []),
    ...(gapTag ? [gapTag] : []),
    ...rawTags,
  ]);
  return { strength: linkedStrength, gap: linkedGap, tags };
}

function deriveLegacyNote(
  items: string[] | undefined,
  fallbackTitle: string,
): QualityNote | null {
  if (!items || !items.length) return null;
  const detail = items[0];
  return {
    title: fallbackTitle,
    detail: detail.slice(0, 240),
  };
}

function normalizeGuidance({
  value,
  legacyFocus,
  fallbackGap,
  sectionIds,
  fallbackSectionIds,
}: {
  value: unknown;
  legacyFocus?: unknown;
  fallbackGap?: QualityNote | null;
  sectionIds: Set<string>;
  fallbackSectionIds: string[];
}): AnalysisGuidance | null {
  const raw =
    value && typeof value === "object"
      ? (value as Record<string, unknown>)
      : null;
  const rawTitle = typeof raw?.title === "string" ? raw.title.trim() : "";
  const rawDetail = typeof raw?.detail === "string" ? raw.detail.trim() : "";
  const legacyItems = Array.isArray(legacyFocus)
    ? normalizeStringArray(legacyFocus, [])
    : typeof legacyFocus === "string" && legacyFocus.trim()
      ? [legacyFocus.trim()]
      : [];
  const detail = rawDetail || legacyItems[0] || fallbackGap?.detail || "";
  if (!detail) return null;
  const rawType = raw?.type;
  const type =
    typeof rawType === "string" &&
    GUIDANCE_TYPES.has(rawType as AnalysisGuidanceType)
      ? (rawType as AnalysisGuidanceType)
      : legacyItems.length > 0
        ? "edit"
        : "review";

  const requestedTargets = normalizeStringArray(
    raw?.targetSectionIds,
    [],
  ).filter((sectionId) => sectionIds.has(sectionId));
  const targetSectionIds = requestedTargets.length
    ? requestedTargets
    : fallbackSectionIds.filter((sectionId) => sectionIds.has(sectionId));
  const requiresUserInput = type === "ask" || type === "review";

  return {
    type,
    title: (rawTitle || fallbackGap?.title || "Improve this section").slice(
      0,
      60,
    ),
    detail: detail.slice(0, 240),
    targetSectionIds,
    requiresUserInput,
  };
}

type SectionReport = CreedQualityReport["sections"][number];

// The whole-file qualitative judgment (everything on `overall` except the
// computed score). Shared by the model-parse path and the carry-forward path.
type OverallQualitative = {
  summary: string;
  tags: string[];
  strength: QualityNote | null;
  gap: QualityNote | null;
  guidance: AnalysisGuidance | null;
  strengths: string[];
  gaps: string[];
};

// Normalize one section's raw model/stored payload into a section report.
// `raw === undefined` (a section the model skipped, or one with no stored
// entry) yields a neutral fallback the caller can choose to override with a
// carried-forward score instead of showing a phantom zero.
function normalizeSectionReport(
  raw: Record<string, unknown> | undefined,
  section: CreedSection,
  sectionIds: Set<string>,
): SectionReport {
  const strengths = normalizeStringArray(raw?.strengths, []).slice(0, 3);
  const gaps = normalizeStringArray(
    raw?.gaps,
    raw?.missingContext ? normalizeStringArray(raw.missingContext, []) : [],
  ).slice(0, 3);

  const rawTags = normalizeTags(raw?.tags);
  let strength =
    normalizeNote(raw?.strength, undefined, GREEN_TAGS) ??
    deriveLegacyNote(strengths, "Worth keeping");
  let gap =
    normalizeNote(raw?.gap, undefined, RED_TAGS) ??
    deriveLegacyNote(gaps, "Needs work");
  let guidance = normalizeGuidance({
    value: raw?.guidance,
    legacyFocus: raw?.focus,
    fallbackGap: gap,
    sectionIds,
    fallbackSectionIds: [section.id],
  });

  // Negative evidence caps the band; clean evidence leaves the model's chosen
  // score intact rather than upgrading an unexplained low score.
  const linkedEvidence = linkEvidenceTags(rawTags, strength, gap);
  strength = linkedEvidence.strength;
  gap = linkedEvidence.gap;
  const [lo, hi] = evidenceRange(
    linkedEvidence.tags,
    gap !== null || guidance !== null,
  );
  const score = Math.max(lo, Math.min(hi, clampScore(raw?.score ?? 0)));
  let tags = tagsForScore(linkedEvidence.tags, score);
  // Gap is mandatory below 90. If the model flagged the section but named no
  // gap, surface one from the flag so the popover always explains the score.
  if (!gap && score < 90) {
    gap = fallbackGapFromTags(tags) ?? {
      title: "Score needs evidence",
      detail:
        "The score is below 90, but the analysis did not identify the specific issue holding it back.",
    };
  }
  const finalEvidence = linkEvidenceTags(tags, strength, gap);
  strength = finalEvidence.strength;
  gap = finalEvidence.gap;
  tags = finalEvidence.tags;
  guidance ??= normalizeGuidance({
    value: raw?.guidance,
    legacyFocus: raw?.focus,
    fallbackGap: gap,
    sectionIds,
    fallbackSectionIds: [section.id],
  });

  return {
    sectionId: section.id,
    sectionName: section.name,
    score,
    tags,
    strength,
    gap,
    guidance,
    reasons: normalizeStringArray(raw?.reasons, [
      "Needs a clearer signal that helps future AI know you.",
    ]).slice(0, 3),
    strengths,
    gaps,
    missingContext: normalizeStringArray(raw?.missingContext, []).slice(0, 3),
    focus: guidance?.detail ?? "",
  };
}

function parseOverallQualitative(
  value: unknown,
  sectionIds: Set<string>,
): OverallQualitative {
  const overall =
    value && typeof value === "object"
      ? (value as Record<string, unknown>)
      : {};
  const strengths = normalizeStringArray(overall.strengths, []).slice(0, 4);
  const gaps = normalizeStringArray(overall.gaps, []).slice(0, 4);

  let strength =
    normalizeNote(overall.strength, undefined, GREEN_TAGS) ??
    deriveLegacyNote(strengths, "Working well");
  let gap =
    normalizeNote(overall.gap, undefined, RED_TAGS) ??
    deriveLegacyNote(gaps, "Biggest gap");
  const linkedEvidence = linkEvidenceTags(
    normalizeTags(overall.tags),
    strength,
    gap,
  );
  strength = linkedEvidence.strength;
  gap = linkedEvidence.gap;
  return {
    summary:
      typeof overall.summary === "string" && overall.summary.trim()
        ? overall.summary.trim()
        : "The profile has useful structure but needs sharper, more specific personal context.",
    tags: linkedEvidence.tags,
    strength,
    gap,
    guidance: normalizeGuidance({
      value: overall.guidance,
      legacyFocus: overall.focus,
      fallbackGap: gap,
      sectionIds,
      fallbackSectionIds: [],
    }),
    strengths,
    gaps,
  };
}

// Validate a stored (full-shape) report against the current sections. Used when
// reading a persisted report (cache hit, baseline read, the MCP read path). The
// model-response path uses `normalizeSectionReport` + `assembleReport` instead.
export function validateQualityReport(
  value: unknown,
  sections: CreedSection[],
  contentHash: string,
  // A shared report is one shared report, generated over ALL sections and keyed
  // by creed_id, but each member reads it scoped to the sections they can see.
  // For a shared read we must show the SAME thing to everyone: the stored shared
  // overall score (not one recomputed over the reader's visible subset, which
  // would differ per member) and the full shared narrative (score + tags +
  // strengths + gaps), so a member sees the identical headline and description as
  // the owner. Personal reads (sharedRead=false) recompute the score from the
  // owner's own sections, which they always see in full - byte-identical to before.
  sharedRead = false,
  analyzedAt?: string,
): CreedQualityReport {
  const root =
    value && typeof value === "object"
      ? (value as Record<string, unknown>)
      : {};
  const rawOverall =
    root.overall && typeof root.overall === "object"
      ? (root.overall as Record<string, unknown>)
      : {};
  const rawSections = Array.isArray(root.sections) ? root.sections : [];

  const sectionIds = new Set(sections.map((section) => section.id));
  const sectionReports = sections.map((section) =>
    normalizeSectionReport(
      findRawSection(rawSections, section.id),
      section,
      sectionIds,
    ),
  );
  const overall = parseOverallQualitative(rawOverall, sectionIds);

  // The shared score written by the run/merge path (computeOverallScore over the
  // full file). Used verbatim for shared reads so every member sees one true
  // number; falls back to a recompute if an old row has no stored score.
  const storedScore =
    typeof rawOverall.score === "number" && Number.isFinite(rawOverall.score)
      ? rawOverall.score
      : null;
  const overallEvidence = reconcileOverallEvidence(
    sharedRead && storedScore !== null
      ? storedScore
      : computeOverallScore(sectionReports),
    overall,
  );

  return {
    contentHash,
    overall: {
      score: overallEvidence.score,
      summary: overall.summary,
      tags: overallEvidence.tags,
      strength: overall.strength,
      gap: overallEvidence.gap,
      guidance: overall.guidance,
      strengths: overall.strengths,
      gaps: overall.gaps,
      focus: overall.guidance ? [overall.guidance.detail] : [],
    },
    sections: sectionReports,
    generatedAt:
      analyzedAt ??
      (typeof root.generatedAt === "string" && root.generatedAt.trim()
        ? root.generatedAt
        : new Date().toISOString()),
  };
}

function findRawSection(rawSections: unknown[], sectionId: string) {
  return rawSections.find(
    (item) =>
      item &&
      typeof item === "object" &&
      (item as Record<string, unknown>).sectionId === sectionId,
  ) as Record<string, unknown> | undefined;
}
