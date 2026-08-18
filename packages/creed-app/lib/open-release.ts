type StableVersion = readonly [major: number, minor: number, patch: number];

function parseStableVersion(version: string): StableVersion | null {
  const match = /^(\d+)\.(\d+)\.(\d+)$/.exec(version.trim());
  if (!match) return null;

  return [Number(match[1]), Number(match[2]), Number(match[3])];
}

export function getOpenVersionFromReleaseTag(tag: string) {
  const match = /^open-v(\d+\.\d+\.\d+)$/.exec(tag.trim());
  return match?.[1] ?? null;
}

export function isNewerOpenVersion(latest: string, installed: string) {
  const latestParts = parseStableVersion(latest);
  const installedParts = parseStableVersion(installed);
  if (!latestParts || !installedParts) return false;

  for (let index = 0; index < latestParts.length; index += 1) {
    if (latestParts[index] !== installedParts[index]) {
      return latestParts[index] > installedParts[index];
    }
  }

  return false;
}

export async function findLatestOpenRelease(
  readPage: (page: number) => Promise<unknown>,
): Promise<string | null> {
  let latest: string | null = null;
  for (let page = 1; page <= 10; page += 1) {
    const releases = await readPage(page);
    if (!Array.isArray(releases)) throw new Error("Invalid release response");
    for (const entry of releases as unknown[]) {
      if (!entry || typeof entry !== "object") continue;
      const release = entry as Record<string, unknown>;
      if (release.draft !== false || release.prerelease !== false ||
          typeof release.tag_name !== "string") continue;
      const version = getOpenVersionFromReleaseTag(release.tag_name);
      if (version && (!latest || isNewerOpenVersion(version, latest))) latest = version;
    }
    if (releases.length < 100) return latest;
  }
  throw new Error("Release history exceeds lookup limit");
}
