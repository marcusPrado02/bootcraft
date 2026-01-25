import { createHash } from "node:crypto";
import { readFile, readdir } from "node:fs/promises";
import { join, relative } from "node:path";

export interface HashDirectoryOptions {
  /**
   * Directory/filename entries to ignore entirely (exact name match).
   * Default ignores typical build + deps folders.
   */
  ignoreNames?: Set<string>;
}

const DEFAULT_IGNORES = new Set<string>([
  "node_modules",
  "dist",
  "build",
  "out",
  ".git",
  ".DS_Store",
  ".bootcraft",
  "coverage",
  ".turbo",
  ".pnpm-store",
]);

async function walkFiles(rootDir: string, currentDir: string, ignore: Set<string>): Promise<string[]> {
  const dirents = await readdir(currentDir, { withFileTypes: true });
  // deterministic traversal
  dirents.sort((a, b) => a.name.localeCompare(b.name));

  const files: string[] = [];

  for (const d of dirents) {
    if (ignore.has(d.name)) continue;

    const full = join(currentDir, d.name);
    if (d.isDirectory()) {
      const nested = await walkFiles(rootDir, full, ignore);
      files.push(...nested);
      continue;
    }
    if (d.isFile()) {
      files.push(full);
    }
  }

  return files;
}

/**
 * Computes a deterministic SHA-256 hash of directory contents.
 * The hash is stable across machines as long as file contents and relative paths are the same.
 */
export async function hashDirectorySha256(dir: string, options: HashDirectoryOptions = {}): Promise<string> {
  const ignore = options.ignoreNames ?? DEFAULT_IGNORES;
  const files = await walkFiles(dir, dir, ignore);

  const hasher = createHash("sha256");

  for (const filePath of files) {
    const rel = relative(dir, filePath).replaceAll("\\", "/"); // normalize for Windows
    const content = await readFile(filePath);

    // path separator to avoid ambiguity
    hasher.update(rel, "utf8");
    hasher.update("\n", "utf8");
    hasher.update(content);
    hasher.update("\n", "utf8");
  }

  return hasher.digest("hex");
}
