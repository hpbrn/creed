// Shared destination for signed-in marketing CTAs (header Continue, hero,
// closing band). Unpaid users go to pricing. Only Cloud-entitled users open
// /file. Pricing is also reachable from the Pricing nav link.
export type SignedInContinueHref = "/file" | "/pricing";

export function resolveSignedInContinueHref(isPaid: boolean): SignedInContinueHref {
  if (isPaid) return "/file";
  return "/pricing";
}
