/**
 * Minimal semver utilities — no external dependencies.
 *
 * Only covers the subset Bootcraft needs:
 *   - Parse X.Y.Z into numeric parts
 *   - Compare two version strings for sorting (higher version first)
 */

export interface SemVer {
  major: number;
  minor: number;
  patch: number;
  raw: string;
}

export function parseSemVer(version: string): SemVer | null {
  const match = /^(\d+)\.(\d+)\.(\d+)/.exec(version.trim());
  if (!match) return null;
  return {
    major: parseInt(match[1]!, 10),
    minor: parseInt(match[2]!, 10),
    patch: parseInt(match[3]!, 10),
    raw: version,
  };
}

/**
 * Returns negative if a < b, 0 if equal, positive if a > b.
 * Falls back to string comparison if either version is non-semver.
 */
export function compareSemVer(a: string, b: string): number {
  const av = parseSemVer(a);
  const bv = parseSemVer(b);

  if (!av || !bv) return a.localeCompare(b);

  if (av.major !== bv.major) return av.major - bv.major;
  if (av.minor !== bv.minor) return av.minor - bv.minor;
  return av.patch - bv.patch;
}

/** Returns the highest semver string from the array, or undefined if empty. */
export function highestVersion(versions: string[]): string | undefined {
  if (versions.length === 0) return undefined;
  return versions.slice().sort((a, b) => compareSemVer(b, a))[0];
}
