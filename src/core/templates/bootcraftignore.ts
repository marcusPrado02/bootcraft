import { readFile } from "node:fs/promises";
import { join } from "node:path";

export interface IgnoreMatcher {
  shouldIgnore(relPathPosix: string): boolean;
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Very small glob -> RegExp converter:
 * - "*"  matches anything except "/"
 * - "**" matches anything including "/"
 * - patterns are matched against POSIX-like paths ("/")
 */
function globToRegExp(glob: string): RegExp {
  const g = glob.trim();
  // normalize
  const normalized = g.replaceAll("\\", "/");

  let out = "^";
  for (let i = 0; i < normalized.length; i++) {
    const ch = normalized[i];
    const next = normalized[i + 1];

    if (ch === "*" && next === "*") {
      out += ".*";
      i++; // consume next "*"
      continue;
    }
    if (ch === "*") {
      out += "[^/]*";
      continue;
    }
    if (ch === "/") {
      out += "/";
      continue;
    }
    out += escapeRegex(ch);
  }
  out += "$";
  return new RegExp(out);
}

function parseIgnoreFile(content: string): RegExp[] {
  const lines = content
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0 && !l.startsWith("#"));

  return lines.map(globToRegExp);
}

export async function loadIgnoreMatcher(templateRoot: string): Promise<IgnoreMatcher> {
  const ignorePath = join(templateRoot, ".bootcraftignore");

  let patterns: RegExp[] = [];
  try {
    const raw = await readFile(ignorePath, "utf-8");
    patterns = parseIgnoreFile(raw);
  } catch {
    // ignore file doesn't exist or can't be read -> treat as empty ignore list for v0.1
    patterns = [];
  }

  return {
    shouldIgnore(relPathPosix: string): boolean {
      // normalize to POSIX
      const p = relPathPosix.replaceAll("\\", "/");
      return patterns.some((rx) => rx.test(p));
    },
  };
}
