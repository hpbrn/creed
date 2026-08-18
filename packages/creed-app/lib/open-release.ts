export const OPEN_UPDATE_COMMAND =
  "git pull --ff-only https://github.com/hpbrn/creed.git main";

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
