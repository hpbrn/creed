import { redirect } from "next/navigation";
import { OpenOwnerClaimForm } from "@/components/auth/open-owner-claim-form";
import { hasValidOpenOwnerSession } from "@creed/open/lib/open-owner";
import {
  OPEN_SETUP_PATH,
  safeOpenNextPath,
  withOpenNextQuery,
} from "@creed/open/lib/open-next-path";
import { getOpenSetupStatus } from "@creed/open/lib/open-setup";
import { getRequestAuth } from "@/lib/request-auth";
import { isSupabaseConfigured } from "@creed/persistence/supabase/env";

export const dynamic = "force-dynamic";

export default async function EnterPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { setupReady, databaseReadiness } = await getOpenSetupStatus();
  const requestedNext = (await searchParams).next;
  const nextPath = safeOpenNextPath(requestedNext);

  if (!setupReady) {
    redirect(withOpenNextQuery(OPEN_SETUP_PATH, nextPath));
  }

  if (
    databaseReadiness.ready &&
    isSupabaseConfigured() &&
    (await hasValidOpenOwnerSession()) &&
    (await getRequestAuth()).user
  ) {
    redirect(nextPath);
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[var(--creed-background)] px-6">
      <div className="w-auto">
        <OpenOwnerClaimForm nextPath={nextPath} />
      </div>
    </main>
  );
}
