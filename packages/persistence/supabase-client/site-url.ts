type SiteUrlEnvironment = Readonly<{
  NEXT_PUBLIC_SITE_URL?: string;
  VERCEL_PROJECT_PRODUCTION_URL?: string;
  VERCEL_URL?: string;
  NODE_ENV?: string;
}>;

function vercelOrigin(host: string | undefined) {
  const normalizedHost = host?.trim();
  return normalizedHost ? `https://${normalizedHost}` : null;
}

export function resolveConfiguredSiteUrl(environment: SiteUrlEnvironment) {
  const configuredSiteUrl = environment.NEXT_PUBLIC_SITE_URL?.trim();
  if (configuredSiteUrl) return configuredSiteUrl;

  return (
    vercelOrigin(environment.VERCEL_PROJECT_PRODUCTION_URL) ??
    vercelOrigin(environment.VERCEL_URL)
  );
}

export function resolveSiteUrl(environment: SiteUrlEnvironment) {
  return (
    resolveConfiguredSiteUrl(environment) ??
    (environment.NODE_ENV === "development" ? "http://localhost:3000" : null)
  );
}
