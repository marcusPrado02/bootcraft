import { describe, it, expect } from "vitest";
import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { ensureDir, readJsonFile, atomicWriteFile } from "../../../src/infra/fs/helpers.js";

async function makeTempDir(): Promise<string> {
  return mkdtemp(join(tmpdir(), "bootcraft-helpers-"));
}

// ---------------------------------------------------------------------------
// ensureDir
// ---------------------------------------------------------------------------

describe("ensureDir", () => {
  it("creates a directory that does not exist", async () => {
    const base = await makeTempDir();
    const target = join(base, "a", "b", "c");
    await ensureDir(target);
    const { stat } = await import("node:fs/promises");
    const s = await stat(target);
    expect(s.isDirectory()).toBe(true);
  });

  it("is idempotent — does not throw if directory already exists", async () => {
    const dir = await makeTempDir();
    await expect(ensureDir(dir)).resolves.toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// readJsonFile
// ---------------------------------------------------------------------------

describe("readJsonFile", () => {
  it("reads and parses a valid JSON file", async () => {
    const dir = await makeTempDir();
    const path = join(dir, "data.json");
    const { writeFile } = await import("node:fs/promises");
    await writeFile(path, JSON.stringify({ ok: true }), "utf-8");

    const result = await readJsonFile<{ ok: boolean }>(path);
    expect(result).toEqual({ ok: true });
  });

  it("throws BootcraftError with STATE_READ_FAILED when file does not exist", async () => {
    const path = join(tmpdir(), "does-not-exist-bootcraft.json");
    await expect(readJsonFile(path)).rejects.toMatchObject({
      code: "STATE_READ_FAILED",
    });
  });

  it("throws BootcraftError with STATE_INVALID when JSON is malformed", async () => {
    const dir = await makeTempDir();
    const path = join(dir, "bad.json");
    const { writeFile } = await import("node:fs/promises");
    await writeFile(path, "{ not valid json", "utf-8");

    await expect(readJsonFile(path)).rejects.toMatchObject({
      code: "STATE_INVALID",
    });
  });
});

// ---------------------------------------------------------------------------
// atomicWriteFile
// ---------------------------------------------------------------------------

describe("atomicWriteFile", () => {
  it("writes content to a new file", async () => {
    const dir = await makeTempDir();
    const path = join(dir, "output.txt");
    await atomicWriteFile(path, "hello world");
    const content = await readFile(path, "utf-8");
    expect(content).toBe("hello world");
  });

  it("overwrites existing file atomically", async () => {
    const dir = await makeTempDir();
    const path = join(dir, "file.txt");
    await atomicWriteFile(path, "first");
    await atomicWriteFile(path, "second");
    const content = await readFile(path, "utf-8");
    expect(content).toBe("second");
  });

  it("creates parent directories if they do not exist", async () => {
    const dir = await makeTempDir();
    const path = join(dir, "nested", "deep", "file.json");
    await atomicWriteFile(path, "{}");
    const content = await readFile(path, "utf-8");
    expect(content).toBe("{}");
  });

  it("throws BootcraftError with STATE_WRITE_FAILED when write fails", async () => {
    // Use a path whose parent is a file (not a directory) to force an error
    const dir = await makeTempDir();
    const blockingFile = join(dir, "not-a-dir");
    const { writeFile } = await import("node:fs/promises");
    await writeFile(blockingFile, "I am a file");

    const impossiblePath = join(blockingFile, "child.txt");
    await expect(atomicWriteFile(impossiblePath, "data")).rejects.toMatchObject({
      code: expect.stringMatching(/FS_ERROR|STATE_WRITE_FAILED/),
    });
  });

  it("leaves no temp file on failure", async () => {
    const dir = await makeTempDir();
    const blockingFile = join(dir, "blocker");
    const { writeFile } = await import("node:fs/promises");
    await writeFile(blockingFile, "block");

    try {
      await atomicWriteFile(join(blockingFile, "x.txt"), "data");
    } catch {
      // expected
    }

    const { readdir } = await import("node:fs/promises");
    const entries = await readdir(dir);
    const tempFiles = entries.filter((e) => e.startsWith(".bootcraft-tmp-"));
    expect(tempFiles).toHaveLength(0);
  });
});
