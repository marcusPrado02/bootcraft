/**
 * Filesystem helpers for Bootcraft.
 *
 * These provide atomic, safe operations used by higher-level modules.
 * All functions are async and handle errors with clear messages.
 */

import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { randomBytes } from "node:crypto";
import { BootcraftError } from "../../core/errors/index.js";

/**
 * Ensure a directory exists, creating it and parents if needed.
 * Equivalent to `mkdir -p`.
 */
export async function ensureDir(path: string): Promise<void> {
  try {
    await mkdir(path, { recursive: true });
  } catch (err) {
    throw new BootcraftError(
      "FS_ERROR",
      `Failed to create directory: ${path}`,
      err instanceof Error ? err : undefined
    );
  }
}

/**
 * Read and parse a JSON file.
 *
 * @returns Parsed JSON content
 * @throws BootcraftError if file doesn't exist, can't be read, or contains invalid JSON
 */
export async function readJsonFile<T = unknown>(path: string): Promise<T> {
  let content: string;

  try {
    content = await readFile(path, "utf-8");
  } catch (err) {
    const nodeErr = err as NodeJS.ErrnoException;
    if (nodeErr.code === "ENOENT") {
      throw new BootcraftError(
        "STATE_READ_FAILED",
        `File not found: ${path}`,
        nodeErr
      );
    }
    throw new BootcraftError(
      "STATE_READ_FAILED",
      `Failed to read file: ${path}`,
      nodeErr
    );
  }

  try {
    return JSON.parse(content) as T;
  } catch (err) {
    throw new BootcraftError(
      "STATE_INVALID",
      `Invalid JSON in file: ${path}`,
      err instanceof Error ? err : undefined
    );
  }
}

/**
 * Write content to a file atomically.
 *
 * Uses a temp file + rename strategy to ensure the target file is never
 * left in a partial/corrupted state. The temp file is created in the same
 * directory as the target to ensure atomic rename works (same filesystem).
 */
export async function atomicWriteFile(
  targetPath: string,
  content: string
): Promise<void> {
  const dir = dirname(targetPath);
  const tempName = `.bootcraft-tmp-${randomBytes(8).toString("hex")}`;
  const tempPath = join(dir, tempName);

  try {
    // Ensure parent directory exists
    await ensureDir(dir);

    // Write to temp file
    await writeFile(tempPath, content, "utf-8");

    // Atomic rename to target
    await rename(tempPath, targetPath);
  } catch (err) {
    // Best-effort cleanup of temp file
    try {
      const { unlink } = await import("node:fs/promises");
      await unlink(tempPath);
    } catch {
      // Ignore cleanup errors
    }

    if (err instanceof BootcraftError) {
      throw err;
    }

    throw new BootcraftError(
      "STATE_WRITE_FAILED",
      `Failed to write file: ${targetPath}`,
      err instanceof Error ? err : undefined
    );
  }
}
