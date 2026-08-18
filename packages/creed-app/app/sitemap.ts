import type { MetadataRoute } from "next";
import { getSiteUrl } from "@creed/persistence/supabase/env";
import { edition } from "@creed/edition/config";

// Only marketing routes go in the sitemap - anything behind the
// entitlement gate (/file, /connections, /settings) would
// redirect to /pricing for unauthenticated crawlers, so listing them is
// pointless and pollutes search results.
//
// Cloud omits the root `/`: it 307-redirects to /home for signed-out visitors,
// so /home is the canonical landing URL. Open has no /home, so that path is
// filtered out below. Listing both a redirect and its target splits ranking.
//
const PUBLIC_PATHS = [
  { path: "/home", changeFrequency: "weekly" as const, priority: 1.0 },
  { path: "/roadmap", changeFrequency: "weekly" as const, priority: 0.6 },
  { path: "/sponsor", changeFrequency: "monthly" as const, priority: 0.5 },
  { path: "/changelog", changeFrequency: "weekly" as const, priority: 0.5 },
  { path: "/privacy", changeFrequency: "yearly" as const, priority: 0.3 },
  { path: "/terms", changeFrequency: "yearly" as const, priority: 0.3 },
  { path: "/stack", changeFrequency: "monthly" as const, priority: 0.4 },
];

export default function sitemap(): MetadataRoute.Sitemap {
  const base = getSiteUrl().replace(/\/$/, "");
  const lastModified = new Date();
  const publicPaths = PUBLIC_PATHS.filter(({ path }) => {
    if (path === "/home" || path === "/sponsor") {
      return edition.capabilities.hostedAccounts;
    }
    return true;
  });

  const staticEntries = publicPaths.map(({ path, changeFrequency, priority }) => ({
    url: `${base}${path}`,
    lastModified,
    changeFrequency,
    priority,
  }));

  return staticEntries;
}
