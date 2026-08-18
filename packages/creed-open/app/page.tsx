import { redirect } from "next/navigation";
import { BackendSetupScreen } from "@/components/auth/backend-setup-screen";
import { hasPersistedCreed } from "@/lib/creed-backend";
import { isSupabaseTableMissingError } from "@/lib/creed-backend-errors";
import { ensureReadyPersonalCreed } from "@/lib/creed-context";
import { getRequestAuth } from "@/lib/request-auth";
import { isSupabaseConfigured } from "@creed/persistence/supabase/env";
import { log } from "@/lib/observability";

export const dynamic = "force-dynamic";

export default async function Home() {
  if (!isSupabaseConfigured()) redirect("/setup");

  const { supabase, user } = await getRequestAuth();
  if (!user) redirect("/enter");

  let hasCreed: boolean;
  try {
    hasCreed = await hasPersistedCreed(supabase, user.id);
  } catch (error) {
    if (isSupabaseTableMissingError(error)) {
      return (
        <BackendSetupScreen
          errorMessage={
            error instanceof Error ? error.message : "Creed tables are missing."
          }
        />
      );
    }
    log.error("home_has_persisted_creed_failed", { route: "/", userId: user.id }, error);
    throw error;
  }

  if (!hasCreed) {
    try {
      await ensureReadyPersonalCreed(supabase, user);
    } catch (error) {
      if (isSupabaseTableMissingError(error)) {
        return (
          <BackendSetupScreen
            errorMessage={
              error instanceof Error ? error.message : "Creed tables are missing."
            }
          />
        );
      }
      throw error;
    }
  }
  redirect("/file");
}
