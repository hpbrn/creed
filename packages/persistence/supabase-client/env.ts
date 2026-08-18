import "server-only";

import {
  resolveConfiguredSiteUrl,
  resolveSiteUrl,
} from "@creed/persistence/supabase/site-url";

export function getSupabaseUrl() {
  return process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
}

export function getSupabasePublishableKey() {
  return (
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
    ""
  );
}

export function getSupabaseSecretKey() {
  return process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
}

export function isSupabaseConfigured() {
  return Boolean(getSupabaseUrl() && getSupabasePublishableKey());
}

export function isSupabaseAdminConfigured() {
  return Boolean(getSupabaseUrl() && getSupabaseSecretKey());
}

export function isSiteUrlConfigured() {
  return Boolean(resolveConfiguredSiteUrl(process.env));
}

export function getSiteUrl() {
  const siteUrl = resolveSiteUrl(process.env);
  if (siteUrl) return siteUrl;

  throw new Error(
    "No site URL is available. Set NEXT_PUBLIC_SITE_URL to the deployed origin so callbacks and agent URLs resolve correctly."
  );
}
