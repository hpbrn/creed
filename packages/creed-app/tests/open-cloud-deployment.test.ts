import assert from "node:assert/strict";
import { existsSync, lstatSync, readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join, relative } from "node:path";
import test from "node:test";

const repo = fileURLToPath(new URL("../../../", import.meta.url));
const read = (path: string) => readFileSync(join(repo, path), "utf8");

function filesUnder(path: string): string[] {
  const absolute = join(repo, path);
  if (!existsSync(absolute)) return [];
  return readdirSync(absolute, { withFileTypes: true }).flatMap((entry) => {
    if (entry.isDirectory() && [".next", "node_modules", "dist"].includes(entry.name)) {
      return [];
    }
    const child = join(absolute, entry.name);
    return entry.isDirectory()
      ? filesUnder(relative(repo, child))
      : lstatSync(child).isFile()
        ? [relative(repo, child)]
        : [];
  });
}

function directoriesUnder(path: string): string[] {
  const absolute = join(repo, path);
  if (!existsSync(absolute)) return [];
  return readdirSync(absolute, { withFileTypes: true }).flatMap((entry) => {
    if (!entry.isDirectory() || [".next", "node_modules", "dist"].includes(entry.name)) {
      return [];
    }
    const child = relative(repo, join(absolute, entry.name));
    return [child, ...directoriesUnder(child)];
  });
}

test("Open and Cloud are independent Next.js compositions", () => {
  for (const app of ["open", "cloud"]) {
    assert.ok(existsSync(join(repo, `apps/${app}/app`)));
    assert.ok(existsSync(join(repo, `apps/${app}/edition/config.ts`)));
    assert.ok(existsSync(join(repo, `apps/${app}/proxy.ts`)));
  }
  assert.ok(existsSync(join(repo, "packages/creed-open")));
  assert.ok(existsSync(join(repo, "packages/creed-cloud")));
  assert.equal(existsSync(join(repo, "apps/creed")), false);
  const conflictCopies = [
    ...filesUnder("apps"),
    ...filesUnder("packages"),
    ...directoriesUnder("apps"),
    ...directoriesUnder("packages"),
  ].filter((path) => /(?:^|\/)\S.* \d+(?:\.[^/]+)?$/.test(path));
  assert.deepEqual(conflictCopies, []);
});

test("shared Tailwind CSS scans every UI-bearing workspace", () => {
  const globals = read("packages/creed-app/app/globals.css");
  for (const source of [
    "./**/*.{js,jsx,ts,tsx,mdx}",
    "../components/**/*.{js,jsx,ts,tsx,mdx}",
    "../../creed-ui/**/*.{js,jsx,ts,tsx,mdx}",
    "../../creed-open/**/*.{js,jsx,ts,tsx,mdx}",
    "../../creed-cloud/**/*.{js,jsx,ts,tsx,mdx}",
    "../../creed-marketing/**/*.{js,jsx,ts,tsx,mdx}",
    "../../ui/**/*.{js,jsx,ts,tsx,mdx}",
    "../../open/**/*.{js,jsx,ts,tsx,mdx}",
    "../../cloud/**/*.{js,jsx,ts,tsx,mdx}",
    "../../marketing/**/*.{js,jsx,ts,tsx,mdx}",
    "../../../packages/creed-app/**/*.{js,jsx,ts,tsx,mdx}",
    "../../../packages/creed-ui/**/*.{js,jsx,ts,tsx,mdx}",
    "../../../packages/creed-open/**/*.{js,jsx,ts,tsx,mdx}",
    "../../../packages/creed-cloud/**/*.{js,jsx,ts,tsx,mdx}",
    "../../../packages/creed-marketing/**/*.{js,jsx,ts,tsx,mdx}",
    "../../../apps/open/**/*.{js,jsx,ts,tsx,mdx}",
    "../../../apps/cloud/**/*.{js,jsx,ts,tsx,mdx}",
  ]) {
    assert.ok(globals.includes(`@source "${source}";`), source);
  }
});

const LANDING_CSS_TOKENS = [
  "30vh",
  "34vh",
  "70rem",
  "py-30",
  "min-h-\\[380px\\]",
  "min-h-\\[120px\\]",
];

async function compileGlobalsCss(from: string) {
  const postcss = (await import("postcss")).default;
  const tailwind = (await import("@tailwindcss/postcss")).default;
  const css = readFileSync(join(repo, "packages/creed-app/app/globals.css"), "utf8");
  return postcss([tailwind()]).process(css, { from });
}

test("Tailwind emits landing-only utilities from creed-marketing", async () => {
  const result = await compileGlobalsCss(
    join(repo, "packages/creed-app/app/globals.css"),
  );
  for (const token of LANDING_CSS_TOKENS) {
    assert.ok(result.css.includes(token), token);
  }
});

test("Tailwind emits landing utilities when CSS is compiled from Cloud", async () => {
  const result = await compileGlobalsCss(
    join(repo, "apps/cloud/app/globals.css"),
  );
  for (const token of LANDING_CSS_TOKENS) {
    assert.ok(result.css.includes(token), token);
  }
});

test("Tailwind emits landing utilities from the hoisted @creed/marketing path", async () => {
  const result = await compileGlobalsCss(
    join(repo, "node_modules/@creed/app/app/globals.css"),
  );
  for (const token of LANDING_CSS_TOKENS) {
    assert.ok(result.css.includes(token), token);
  }
});

test("Open has no Cloud-only routes or package dependency", () => {
  const openFiles = filesUnder("apps/open");
  const forbiddenRoutes = [
    "app/login/page.tsx",
    "app/signup/page.tsx",
    "app/reset-password/page.tsx",
    "app/onboarding/shared/page.tsx",
    "app/api/app/account/route.ts",
    "app/api/app/credits/route.ts",
    "app/api/feedback/route.ts",
    "app/api/stripe/webhook/route.ts",
    "app/home/page.tsx",
  ];
  for (const route of forbiddenRoutes) {
    assert.equal(openFiles.includes(`apps/open/${route}`), false, route);
  }
  assert.doesNotMatch(read("apps/open/package.json"), /@creed\/cloud|@creed\/marketing|stripe/i);
  assert.match(read("apps/cloud/package.json"), /@creed\/marketing/);
  assert.ok(existsSync(join(repo, "packages/creed-marketing/app/home/page.tsx")));
  assert.doesNotMatch(read("apps/open/next.config.ts"), /destination: "\/home"/);
  for (const file of [
    ...openFiles,
    ...filesUnder("packages/creed-open"),
    ...filesUnder("packages/creed-app"),
    ...filesUnder("packages/creed-core"),
    ...filesUnder("packages/creed-ui"),
    ...filesUnder("packages/persistence"),
    ...filesUnder("packages/integrations"),
  ].filter(
    (path) => /\.(?:ts|tsx|mjs|json)$/.test(path) && !path.includes("/tests/"),
  )) {
    assert.doesNotMatch(read(file), /@creed\/cloud/, file);
    assert.doesNotMatch(read(file), /@creed\/marketing/, file);
  }
});

test("edition behavior is compile-time composition, not an environment mode", () => {
  for (const file of [
    ...filesUnder("apps"),
    ...filesUnder("packages"),
  ].filter(
    (path) => /\.(?:ts|tsx|mjs)$/.test(path) && !path.includes("/tests/"),
  )) {
    const source = read(file);
    assert.doesNotMatch(source, /CREED_DEPLOYMENT|isCreedCloud|useIsCreedCloud/, file);
  }
  assert.match(read("apps/open/edition/config.ts"), /hostedAccounts: false/);
  assert.match(read("apps/open/edition/config.ts"), /sharedCreeds: false/);
  assert.match(read("apps/open/edition/config.ts"), /cli: false/);
  assert.match(read("apps/cloud/edition/config.ts"), /hostedAccounts: true/);
  assert.match(read("apps/cloud/edition/config.ts"), /cli: false/);
});

test("Open owner access is cryptographically checked and gates pages and APIs", () => {
  const owner = read("packages/creed-open/lib/open-owner.ts");
  const ownerCore = read("packages/creed-open/lib/open-owner-core.ts");
  assert.match(ownerCore, /timingSafeEqual/);
  assert.match(owner, /httpOnly: true/);
  assert.match(owner, /sameSite: "strict"/);
  assert.match(owner, /CREED_OWNER_SECRET/);
  assert.match(ownerCore, /OPEN_OWNER_CODE_LENGTH = 8/);
  assert.match(read("packages/creed-app/components/auth/open-owner-claim-form.tsx"), /OWNER_CODE_LENGTH = 8/);
  assert.match(read("packages/creed-app/lib/api-auth.ts"), /@creed\/edition\/auth/);
  assert.match(read("packages/creed-app/lib/request-auth.ts"), /@creed\/edition\/auth/);
  assert.match(read("packages/creed-open/app/(creed-app)/layout.tsx"), /getRequestAuth/);
  assert.match(read("packages/creed-open/app/authorize/page.tsx"), /getRequestAuth/);
  assert.match(read("packages/creed-open/app/authorize/decision/route.ts"), /getRequestAuth/);
});

test("Open GitHub OAuth cannot enter the Cloud-only Shared flow", () => {
  const authorize = read("packages/creed-open/app/api/app/github/authorize/route.ts");
  const callback = read("packages/creed-open/app/auth/github/callback/route.ts");
  assert.doesNotMatch(authorize, /getCreedRole|teamGithub|mode === "shared"/);
  assert.doesNotMatch(callback, /shared-github|teamGithub|upsertSharedGitHubIntegration/);
  assert.match(authorize, /mode: "personal"/);
  assert.match(callback, /mode !== "personal"/);
});

test("Open GitHub routes resolve Shared services only through the edition boundary", () => {
  const openAdapter = read("apps/open/edition/github.ts");
  assert.doesNotMatch(openAdapter, /shared-github|creed-version-control|creed-context/);
  for (const route of ["branches", "repos", "status", "push"]) {
    const source = read(`packages/creed-app/app/api/app/github/${route}/route.ts`);
    assert.match(source, /@creed\/edition\/github/);
    assert.doesNotMatch(source, /@\/lib\/shared-github/);
  }
  assert.match(read("packages/creed-app/lib/creed-backend.ts"), /@creed\/edition\/github/);
});

test("Open and Cloud start Next without POSIX environment assignment", () => {
  for (const file of ["apps/open/package.json", "apps/cloud/package.json"]) {
    const source = read(file);
    assert.doesNotMatch(source, /NODE_OPTIONS=/);
    assert.match(source, /node --max-http-header-size=65536 \.\.\/\.\.\/node_modules\/next\/dist\/bin\/next/);
  }
  assert.match(
    read("packages/creed-open/scripts/setup-core.mjs"),
    /shell: platform === "win32"/,
  );
});

test("Open setup collects keys with pasteable prompts and writes only after they verify", () => {
  const setup = read("packages/creed-open/scripts/setup.mjs");
  const doctor = read("packages/creed-open/scripts/doctor.mjs");
  assert.doesNotMatch(setup, /commandAvailable\("git"\)/);
  assert.doesNotMatch(setup, /askHidden|emitKeypressEvents|setRawMode/);
  assert.doesNotMatch(doctor, /commandAvailable\("git"\)/);
  const verifyCall = setup.indexOf("await checkRemoteReadiness(");
  const writeCall = setup.indexOf("await writeEnvironment(");
  assert.ok(verifyCall > 0 && writeCall > verifyCall);
  assert.match(setup, /Your owner code is /);
  assert.match(setup, /It is also in apps\/open\/\.env\.local/);
  assert.match(setup, /pinned Supabase CLI is missing/);
  assert.match(setup, /Run npm install from the repository root/);
});

test("Open setup uses a versioned readiness RPC and deterministic owner record", () => {
  const setup = read("packages/creed-open/lib/open-setup.ts");
  const claim = read("packages/creed-open/app/api/open/claim/route.ts");
  const migration = read(
    "apps/open/supabase/migrations/20260815162526_open_baseline.sql",
  ).replaceAll('"', "").toLowerCase();
  assert.match(setup, /creed_schema_version/);
  assert.match(setup, /REQUIRED_OPEN_SCHEMA_VERSION = "20260815162526"/);
  assert.match(claim, /creed_installation/);
  assert.doesNotMatch(claim, /listUsers/);
  assert.match(migration, /create table if not exists public\.creed_installation/);
  assert.match(migration, /revoke all on table public\.creed_installation/);
  assert.match(migration, /grant select,insert,[^\n]*update on table public\.creed_installation to service_role/);
  assert.doesNotMatch(migration, /owner@creed\.open\.invalid/);
  assert.match(migration, /revoke all on function public\.creed_schema_version\(\) from public/);
  assert.match(migration, /grant all on function public\.creed_schema_version\(\) to service_role/);
  assert.match(migration, /p_action = 'replace-placeholder'/);
  assert.doesNotMatch(migration, /seed-shared/);
  assert.match(
    read("packages/creed-open/scripts/setup-core.mjs"),
    /REQUIRED_SCHEMA_VERSION = "20260815162526"/,
  );
});

test("Open content tables have membership SELECT policies", () => {
  const files = readdirSync(join(repo, "apps/open/supabase/migrations")).filter((name) =>
    name.endsWith(".sql"),
  );
  const baseline = read(
    "apps/open/supabase/migrations/20260815162526_open_baseline.sql",
  )
    .replaceAll('"', "")
    .toLowerCase();
  assert.deepEqual(files, ["20260815162526_open_baseline.sql"]);
  for (const table of ["creed_sections", "creed_proposals", "creed_activity"]) {
    const name = table.slice("creed_".length);
    assert.match(
      baseline,
      new RegExp(
        `create policy members read ${name}\\s+on public\\.${table} for select to authenticated`,
      ),
    );
  }
});

test("Cloud schema is a single baseline dump", () => {
  const files = readdirSync(join(repo, "apps/cloud/supabase/migrations")).filter((name) =>
    name.endsWith(".sql"),
  );
  assert.deepEqual(files, ["20260815155608_cloud_baseline.sql"]);
});

test("authorised Open owners stay on /setup until schema is ready", () => {
  const setupPage = read("packages/creed-open/app/setup/page.tsx");
  const enterPage = read("packages/creed-open/app/enter/page.tsx");
  const claim = read("packages/creed-open/app/api/open/claim/route.ts");
  const appLayout = read("packages/creed-open/app/(creed-app)/layout.tsx");
  const nextConfig = read("apps/open/next.config.ts");
  assert.match(setupPage, /databaseReadiness\.ready &&/);
  assert.match(setupPage, /redirect\(nextPath === OPEN_DEFAULT_NEXT_PATH \? "\/" : nextPath\)/);
  assert.match(setupPage, /OPEN_ENTER_PATH/);
  assert.doesNotMatch(setupPage, /OpenOwnerClaimForm/);
  assert.doesNotMatch(setupPage, /CreedWordmark/);
  assert.doesNotMatch(setupPage, /previewOwnerForm|NODE_ENV === "development"/);
  assert.match(enterPage, /OpenOwnerClaimForm/);
  assert.match(enterPage, /OPEN_SETUP_PATH/);
  assert.match(claim, /startOwnerSession/);
  assert.match(claim, /getOpenDatabaseReadiness\(\)/);
  assert.doesNotMatch(claim, /getOpenDatabaseReadiness\(\{ fresh: true \}\)/);
  assert.match(appLayout, /getOpenDatabaseReadiness\(\)/);
  assert.match(appLayout, /redirect\("\/setup"\)/);
  assert.match(appLayout, /redirect\("\/enter"\)/);
  assert.match(appLayout, /ensureReadyPersonalCreed/);
  assert.match(read("apps/open/edition/config.ts"), /unauthenticated: "\/enter"/);
  assert.match(read("apps/open/proxy.ts"), /unauthenticatedRoot: "\/enter"/);
  assert.match(nextConfig, /source: "\/claim"/);
  assert.match(nextConfig, /destination: "\/enter"/);
  assert.match(nextConfig, /"\/enter"/);
  assert.match(nextConfig, /source: "\/onboarding"/);
  assert.match(nextConfig, /source: "\/onboarding\/:path\*"/);
  assert.match(nextConfig, /destination: "\/file"/);
});

test("Open accepts Vercel's system origin before user configuration", () => {
  const environment = read("packages/persistence/supabase-client/env.ts");
  const siteUrl = read("packages/persistence/supabase-client/site-url.ts");
  const setupStatus = read("packages/creed-open/lib/open-setup.ts");
  assert.match(environment, /resolveConfiguredSiteUrl/);
  assert.match(siteUrl, /VERCEL_PROJECT_PRODUCTION_URL/);
  assert.match(siteUrl, /VERCEL_URL/);
  assert.match(setupStatus, /isSiteUrlConfigured\(\)/);
});

test("Open skips Cloud-only credits preload", () => {
  const preload = read("packages/creed-app/components/creed/settings-preload.ts");
  const shell = read("packages/creed-app/components/creed/shell.tsx");
  assert.match(preload, /loadCredits = true/);
  assert.match(preload, /if \(loadCredits\)/);
  assert.match(shell, /loadCredits: hasManagedCredits/);
});

test("Cloud retains managed billing and Shared without leaking them into Open", () => {
  assert.ok(existsSync(join(repo, "packages/creed-cloud/app/api/stripe/webhook/route.ts")));
  assert.ok(existsSync(join(repo, "packages/creed-cloud/app/invite/[token]/page.tsx")));
  assert.match(read("packages/creed-cloud/package.json"), /"stripe"/);
  assert.doesNotMatch(read("packages/creed-app/package.json"), /"stripe"/);
  assert.doesNotMatch(read("packages/creed-open/package.json"), /"stripe"/);
});
