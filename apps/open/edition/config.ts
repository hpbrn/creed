import type { CreedEdition } from "@/lib/edition";

export const edition = {
  kind: "open",
  capabilities: {
    hostedAccounts: false,
    sharedCreeds: false,
    managedBilling: false,
    managedCredits: false,
    feedback: false,
    cli: false,
    publicSignup: false,
  },
  routes: {
    unauthenticated: "/enter",
    connectAuthentication: "/enter",
  },
  save: {
    persistedLabel: "Saved to database",
    persistedTone: "text-[#16A34A] dark:text-[#4ADE80]",
    pendingLabel: "Saving…",
    pendingTone: "text-[#16A34A] dark:text-[#4ADE80]",
    failureLabel: "Couldn’t save",
    icon: "database",
  },
} as const satisfies CreedEdition;
