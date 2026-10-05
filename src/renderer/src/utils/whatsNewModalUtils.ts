import type { ChangelogVersion } from './changelogUtils';

export const WHATS_NEW_ALL_VERSIONS = 'all';

export function resolveWhatsNewDefaultVersion(
  versions: ChangelogVersion[],
  initialVersion?: string,
  currentAppVersion?: string
): string {
  if (initialVersion) return initialVersion;
  if (currentAppVersion) {
    const match = versions.find(
      (v) => v.version.toLowerCase() === currentAppVersion.toLowerCase().replace(/^v/, '')
    );
    if (match) return match.version;
  }
  return versions[0]?.version || WHATS_NEW_ALL_VERSIONS;
}

export function filterWhatsNewVersions(versions: ChangelogVersion[], search: string): ChangelogVersion[] {
  const q = search.trim().toLowerCase();
  if (!q) return versions;
  return versions.filter((v) => v.version.toLowerCase().includes(q) || (v.date && v.date.includes(q)));
}
