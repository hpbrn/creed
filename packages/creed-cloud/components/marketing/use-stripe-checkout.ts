"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

export type CheckoutPlan = "personal";
export type CheckoutCadence = "monthly" | "yearly";
// Where cancel lands, and which success `next` to attach.
// pricing: buy-from-pricing stays on the pricing surface
export type CheckoutReturnTo = "/pricing";

// Starts a Stripe Checkout for a plan + cadence and redirects to it.
// Shared by the pricing toggle CTAs so the already-owned / already-subscribed
// (409) handling and error copy live in one place. On success the browser
// navigates to Stripe, so `submitting` is intentionally left true (the page
// is leaving); it's only reset on error.
export function useStripeCheckout() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);

  const startCheckout = useCallback(
    async (opts?: {
      plan?: CheckoutPlan;
      cadence?: CheckoutCadence;
      returnTo?: CheckoutReturnTo;
    }) => {
      if (submitting) return;
      setSubmitting(true);
      const returnTo: CheckoutReturnTo = opts?.returnTo ?? "/pricing";
      try {
        const res = await fetch("/api/stripe/checkout", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            plan: opts?.plan ?? "personal",
            cadence: opts?.cadence ?? "monthly",
            returnTo,
          }),
        });
        const data = (await res.json().catch(() => ({}))) as {
          url?: string;
          error?: string;
          alreadySubscribed?: boolean;
        };
        if (data.alreadySubscribed) {
          toast.success("You're already subscribed");
          router.push("/pricing");
          return;
        }
        if (!res.ok || !data.url) {
          throw new Error(data.error || "Couldn't start checkout");
        }
        window.location.href = data.url;
      } catch (error) {
        setSubmitting(false);
        toast.error(error instanceof Error ? error.message : "Couldn't start checkout");
      }
    },
    [router, submitting]
  );

  return { startCheckout, submitting };
}
