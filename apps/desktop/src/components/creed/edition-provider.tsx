const desktop = {
  kind: "desktop",
  capabilities: {
    hostedAccounts: false,
    sharedCreeds: false,
    managedBilling: false,
    managedCredits: false,
    feedback: true,
    cli: true,
    publicSignup: false,
  },
  save: {
    persistedLabel: "Synced to file",
    persistedTone: "text-[var(--creed-accent)]",
    pendingLabel: "Syncing to file…",
    pendingTone: "text-[var(--creed-accent)]",
    failureLabel: "File not saved",
    icon: "database" as const,
  },
};
export const useCreedEdition = () => desktop;
