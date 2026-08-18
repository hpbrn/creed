import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import {
  emailHasCloudAccess,
  parseCloudAccessMode,
  parseCloudTesterEmails,
} from "../../creed-cloud/lib/cloud-access-core.ts";

test("Cloud access defaults to public when the temporary flag is absent", () => {
  assert.equal(parseCloudAccessMode(undefined), "public");
  assert.equal(emailHasCloudAccess("public", new Set(), undefined), true);
});

test("private Cloud access normalizes and restricts tester emails", () => {
  const testers = parseCloudTesterEmails(" One@Example.com, two@example.com, ");
  assert.equal(emailHasCloudAccess("private", testers, "one@example.com"), true);
  assert.equal(emailHasCloudAccess("private", testers, " TWO@example.com "), true);
  assert.equal(emailHasCloudAccess("private", testers, "other@example.com"), false);
  assert.equal(emailHasCloudAccess("private", testers, null), false);
});

test("private tester access survives switching to a Shared Creed", async () => {
  const root = new URL("../", import.meta.url);
  const [home, layout] = await Promise.all([
    readFile(new URL("../creed-cloud/app/page.tsx", root), "utf8"),
    readFile(new URL("../creed-cloud/app/(creed-app)/layout.tsx", root), "utf8"),
  ]);

  assert.match(home, /const hasAccess = paid \|\| \(sharedAccess && paidSharedAccess\)/);
  assert.match(
    layout,
    /const hasAccess = cloudEntitled \|\| \(sharedAccess && sharedOwnerEntitled\)/,
  );
});

test("private testers receive the monthly allowance without Stripe entitlement state", async () => {
  const credits = await readFile(
    new URL("../../creed-cloud/lib/ai/credits.ts", import.meta.url),
    "utf8",
  );

  assert.match(
    credits,
    /if \(!isPrivateCloud\(\)\) return false;[\s\S]*auth\.admin\.getUserById\(userId\)/,
  );
  assert.match(
    credits,
    /if \(await hasPrivateTesterAllowance\(userId\)\) \{[\s\S]*GRANT_MONTHLY_USD \* MICRO_PER_USD/,
  );
  assert.doesNotMatch(
    credits,
    /from\("creed_entitlements"\)[\s\S]*upsert/,
  );
});
