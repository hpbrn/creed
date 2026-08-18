import type {
  CreedSection,
  Proposal,
} from "@creed/core/creed-data";

export type PendingProposalOutcome = "removed" | "stale";

export function pendingReviewProposals(proposals: Proposal[]): Proposal[] {
  return proposals.filter((proposal) => proposal.status === "pending");
}

export function inlineReviewProposals(proposals: Proposal[]): Proposal[] {
  return proposals.filter(
    (proposal) =>
      proposal.status === "pending" || proposal.status === "stale",
  );
}

export function retainProposalReviewOutcomes(
  current: Proposal[],
  remaining: Proposal[],
  stale: Map<string, Proposal>,
): Proposal[] {
  const remainingIds = new Set(remaining.map((proposal) => proposal.id));
  return current.flatMap((proposal) => {
    const staleProposal = stale.get(proposal.id);
    if (staleProposal) return [staleProposal];
    return remainingIds.has(proposal.id) ? [proposal] : [];
  });
}

export function proposalReviewBaseline(
  proposal: Proposal,
  section: Pick<CreedSection, "name" | "accent" | "content">,
  beforeText?: string,
) {
  if (proposal.status !== "stale") return section;
  return {
    name: proposal.sectionName,
    accent: proposal.accent,
    content: beforeText ?? section.content,
  };
}

export function mergePendingProposalOutcomes(
  current: Proposal[],
  incoming: Proposal[],
  outcomes: Map<string, PendingProposalOutcome>,
): Proposal[] {
  const currentById = new Map(current.map((proposal) => [proposal.id, proposal]));
  const incomingById = new Map(incoming.map((proposal) => [proposal.id, proposal]));

  for (const [id, outcome] of outcomes) {
    const proposal = incomingById.get(id);
    const unresolved =
      proposal?.status === "pending" || proposal?.status === "stale";
    if (
      (outcome === "removed" && !unresolved) ||
      (outcome === "stale" && proposal?.status !== "pending")
    ) {
      outcomes.delete(id);
    }
  }

  return incoming.flatMap((proposal) => {
    const outcome = outcomes.get(proposal.id);
    if (outcome === "removed") return [];
    if (outcome === "stale" && proposal.status === "pending") {
      const local = currentById.get(proposal.id);
      return [
        local?.status === "stale"
          ? local
          : { ...proposal, status: "stale" as const },
      ];
    }
    return [proposal];
  });
}
