import { redirect } from "next/navigation";
import { CodeCommand } from "@/components/marketing/code-command";
import { hasValidOpenOwnerSession } from "@creed/open/lib/open-owner";
import {
  OPEN_DEFAULT_NEXT_PATH,
  OPEN_ENTER_PATH,
  safeOpenNextPath,
  withOpenNextQuery,
} from "@creed/open/lib/open-next-path";
import { getOpenSetupStatus } from "@creed/open/lib/open-setup";
import { getRequestAuth } from "@/lib/request-auth";
import { GITHUB_URL } from "@/lib/branding";
import {
  OpenSetupGuideLink,
  OpenTechnicalDetails,
} from "@creed/open/components/open-technical-details";
import { isSupabaseConfigured } from "@creed/persistence/supabase/env";

export const dynamic = "force-dynamic";

export default async function SetupPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { databaseReadiness, technicalValues, setupStates, setupReady } =
    await getOpenSetupStatus();
  const requestedNext = (await searchParams).next;
  const nextPath = safeOpenNextPath(requestedNext);

  // A valid owner cookie must not skip this page while migrations are stale.
  // The app layout sends authorised owners back here so they see
  // Database needs setup instead of a 500 on /file.
  if (
    databaseReadiness.ready &&
    isSupabaseConfigured() &&
    (await hasValidOpenOwnerSession()) &&
    (await getRequestAuth()).user
  ) {
    redirect(nextPath === OPEN_DEFAULT_NEXT_PATH ? "/" : nextPath);
  }

  if (setupReady) {
    redirect(withOpenNextQuery(OPEN_ENTER_PATH, nextPath));
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[var(--creed-surface)] px-6 py-8 md:px-10">
      <div className="w-full max-w-md">
        <h1 className="mb-6 text-center font-heading text-[1.75rem] font-medium leading-[1.1] tracking-[-0.04em] text-[var(--creed-text-primary)]">
          Setup your Creed
        </h1>
        <div className="rounded-[24px] border border-[var(--creed-border)] bg-[var(--creed-surface)] p-6 shadow-[0_24px_70px_rgba(18,18,17,0.06)] sm:p-8">
          <div className="overflow-hidden rounded-xl border border-[var(--creed-border)]">
            {setupStates.map((item) => (
              <div key={item.name} className="flex items-center justify-between gap-4 border-b border-[var(--creed-border)] px-4 py-3 text-[13px] last:border-0">
                <span className="text-[var(--creed-text-secondary)]">{item.name}</span>
                <span className={item.ready ? "text-[#16A34A] dark:text-[#4ADE80]" : "text-[#B45309] dark:text-[#FBBF24]"}>
                  {item.ready ? "Ready" : "Needs setup"}
                </span>
              </div>
            ))}
          </div>
          <div className="mt-5 rounded-xl bg-[var(--creed-surface-raised)] px-4 py-3.5">
            <div className="flex items-center gap-2 text-[13px] font-medium text-[var(--creed-text-primary)]">
              <span>Run</span>
              <CodeCommand
                copyText="npm run setup"
                className="bg-[#E2E2DE] dark:bg-[#383834]"
              />
            </div>
            <p className="mt-1 text-[12px] leading-5 text-[var(--creed-text-secondary)]">
              The installer connects Supabase, prepares the database, and checks the installation.
            </p>
          </div>
          <div className="relative mt-4 text-[12px]">
            <OpenTechnicalDetails values={technicalValues} />
            <div className="absolute right-0 top-2">
              <OpenSetupGuideLink href={`${GITHUB_URL}/blob/main/SETUP.md`} />
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
