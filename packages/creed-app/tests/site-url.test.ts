import assert from "node:assert/strict";
import test from "node:test";
import {
  resolveConfiguredSiteUrl,
  resolveSiteUrl,
} from "../../persistence/supabase-client/site-url.ts";

test("an explicit site URL takes precedence over hosting defaults", () => {
  assert.equal(
    resolveConfiguredSiteUrl({
      NEXT_PUBLIC_SITE_URL: "https://creed.example.com",
      VERCEL_PROJECT_PRODUCTION_URL: "creed.vercel.app",
    }),
    "https://creed.example.com",
  );
});

test("a Vercel production deployment resolves without user environment values", () => {
  assert.equal(
    resolveConfiguredSiteUrl({
      VERCEL_PROJECT_PRODUCTION_URL: "creed.vercel.app",
    }),
    "https://creed.vercel.app",
  );
});

test("a Vercel preview falls back to its generated deployment URL", () => {
  assert.equal(
    resolveConfiguredSiteUrl({ VERCEL_URL: "creed-preview.vercel.app" }),
    "https://creed-preview.vercel.app",
  );
});

test("an unconfigured non-Vercel production still fails closed", () => {
  assert.equal(resolveSiteUrl({ NODE_ENV: "production" }), null);
});

test("local development retains its localhost fallback", () => {
  assert.equal(resolveSiteUrl({ NODE_ENV: "development" }), "http://localhost:3000");
});
