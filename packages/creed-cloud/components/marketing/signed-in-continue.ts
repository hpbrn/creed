"use client";

import { useLandingAuthState } from "@/components/marketing/use-landing-auth-state";
import { usePaidStatus } from "@creed/cloud/components/marketing/use-paid-status";
import {
  resolveSignedInContinueHref,
  type SignedInContinueHref,
} from "@/lib/marketing/signed-in-continue";

export type { SignedInContinueHref };
export { resolveSignedInContinueHref };

export function useSignedInContinueHref(configured: boolean = true): {
  href: SignedInContinueHref;
  isPaid: boolean;
} {
  const authState = useLandingAuthState(configured);
  const paidStatus = usePaidStatus(configured);
  const isPaid = authState === "signed-in" && paidStatus === "paid";
  return {
    href: resolveSignedInContinueHref(isPaid),
    isPaid,
  };
}
