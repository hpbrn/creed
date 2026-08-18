import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { AppShellLayout } from "@/components/creed/app-shell-layout";
import { AppVersionNotifier } from "@/components/creed/app-version-notifier";
import { getAppVersion } from "@/lib/app-version";
import { AuthedProviders } from "@/components/creed/authed-providers";
import { isSupabaseTableMissingError } from "@/lib/creed-backend-errors";
import { hasActiveEntitlement } from "@creed/cloud/lib/stripe";
import { ensureReadyPersonalCreed, resolveActiveCreed } from "@/lib/creed-context";
import { getRequestAuth } from "@/lib/request-auth";
import { getSupabaseAdminClient } from "@creed/persistence/supabase/admin";
import { isSupabaseConfigured } from "@creed/persistence/supabase/env";
import { hasPrivateCloudAccess } from "@creed/cloud/lib/cloud-access";

// Entitlement gate for everything inside the (creed-app) route group
// (/file, /connections, /settings). Signed-out users go to /pricing.
// Unpaid users go to /pricing. A paid user with no Personal Creed gets
// one created, then enters the file.
//
// Marketing routes and /payment/* don't pass through here so they remain
// reachable to anyone. The check uses the user's own session client +
// the "Read own entitlement" RLS policy - no admin escalation needed.
export const dynamic = "force-dynamic";

export default async function CreedAppLayout({ children }: { children: ReactNode }) {
  if (!isSupabaseConfigured()) {
    // Local dev without Supabase config: skip the gate so the rest of
    // the app can render. Production deployments always have Supabase.
    return (
      <AuthedProviders>
        <AppShellLayout>
          {children}
        </AppShellLayout>
        <AppVersionNotifier initialVersion={getAppVersion()} />
      </AuthedProviders>
    );
  }

  const { supabase, user } = await getRequestAuth();

  if (!user) {
    redirect("/pricing");
  }

  const [cloudEntitled, active] = await Promise.all([
    hasPrivateCloudAccess(user.email)
      ? Promise.resolve(true)
      : hasActiveEntitlement(supabase, user.id),
    resolveActiveCreed(supabase, user),
  ]);
  const activeEntry = active?.creeds.find((creed) => creed.id === active.creedId);
  const sharedAccess = activeEntry?.type === "shared";
  let sharedOwnerEntitled = false;
  if (sharedAccess && active) {
    const admin = getSupabaseAdminClient();
    const { data: sharedCreed } = await admin
      .from("creeds")
      .select("owner_user_id")
      .eq("id", active.creedId)
      .eq("type", "shared")
      .maybeSingle();
    const ownerUserId = (sharedCreed as { owner_user_id?: string } | null)?.owner_user_id;
    sharedOwnerEntitled = ownerUserId
      ? await hasActiveEntitlement(admin, ownerUserId)
      : false;
  }
  const hasAccess = cloudEntitled || (sharedAccess && sharedOwnerEntitled);

  if (!hasAccess) {
    redirect("/pricing");
  }

  if (!sharedAccess) {
    try {
      await ensureReadyPersonalCreed(supabase, user);
    } catch (error) {
      if (!isSupabaseTableMissingError(error)) {
        throw error;
      }
    }
  }

  const readyActive = await resolveActiveCreed(supabase, user);

  return (
    <AuthedProviders
      requestAuth={{ supabase, user }}
      activeCreed={readyActive}
    >
      <AppShellLayout>
        {children}
      </AppShellLayout>
      <AppVersionNotifier initialVersion={getAppVersion()} />
    </AuthedProviders>
  );
}
