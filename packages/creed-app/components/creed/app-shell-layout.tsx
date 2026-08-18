"use client";

import type { ReactNode } from "react";
import { CreedShell } from "@/components/creed/shell";
import { GettingStartedCard } from "@/components/creed/getting-started-card";
import { QualityToasts } from "@/components/creed/quality-toasts";
import { useCreedStateSelector } from "@/components/creed/creed-provider";
import type { CreedSection } from "@creed/core/creed-data";
import { AppNavigationProvider } from "@/components/creed/app-navigation";
import { PersistentAppSurfaces } from "@/components/creed/persistent-file-surface";

function sameShellSections(left: CreedSection[], right: CreedSection[]) {
  return (
    left.length === right.length &&
    left.every((section, index) => {
      const other = right[index];
      return (
        other?.id === section.id &&
        other.name === section.name &&
        other.accent === section.accent &&
        other.archived === section.archived
      );
    })
  );
}

export function AppShellLayout({ children }: { children: ReactNode }) {
  const user = useCreedStateSelector((state) => state.user);
  const sections = useCreedStateSelector(
    (state) => state.sections,
    sameShellSections,
  );

  return (
    <AppNavigationProvider>
      {/* Mounted at the shell so a completion toast fires regardless of which
          app page is open when the analysis finishes. */}
      <QualityToasts />
      <GettingStartedCard />
      <CreedShell
        userName={user.name}
        avatarInitials={user.avatarInitials}
        avatarUrl={user.avatarUrl}
        sections={sections}
      >
        <PersistentAppSurfaces>{children}</PersistentAppSurfaces>
      </CreedShell>
    </AppNavigationProvider>
  );
}
