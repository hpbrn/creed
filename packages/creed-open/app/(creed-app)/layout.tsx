import openPackageMetadata from "@creed/open/package.json";
import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { AppShellLayout } from "@/components/creed/app-shell-layout";
import { AppVersionNotifier } from "@/components/creed/app-version-notifier";
import { AuthedProviders } from "@/components/creed/authed-providers";
import { OpenReleaseNotifier } from "@/components/creed/open-release-notifier";
import { getAppVersion } from "@/lib/app-version";
import { isSupabaseTableMissingError } from "@/lib/creed-backend-errors";
import { ensureReadyPersonalCreed, resolveActiveCreed } from "@/lib/creed-context";
import { getRequestAuth } from "@/lib/request-auth";
import { isSupabaseConfigured } from "@creed/persistence/supabase/env";
import { getOpenDatabaseReadiness } from "@creed/open/lib/open-setup";

export const dynamic = "force-dynamic";

export default async function CreedAppLayout({ children }: { children: ReactNode }) {
  if (!(await getOpenDatabaseReadiness()).ready) redirect("/setup");

  if (!isSupabaseConfigured()) {
    return (
      <AuthedProviders>
        <AppShellLayout>
          {children}
        </AppShellLayout>
        <AppVersionNotifier initialVersion={getAppVersion()} />
        <OpenReleaseNotifier installedVersion={openPackageMetadata.version} />
      </AuthedProviders>
    );
  }

  const { supabase, user } = await getRequestAuth();
  if (!user) redirect("/enter");

  try {
    await ensureReadyPersonalCreed(supabase, user);
  } catch (error) {
    if (!isSupabaseTableMissingError(error)) throw error;
  }
  const active = await resolveActiveCreed(supabase, user);

  return (
    <AuthedProviders requestAuth={{ supabase, user }} activeCreed={active}>
      <AppShellLayout>
        {children}
      </AppShellLayout>
      <AppVersionNotifier initialVersion={getAppVersion()} />
      <OpenReleaseNotifier installedVersion={openPackageMetadata.version} />
    </AuthedProviders>
  );
}
