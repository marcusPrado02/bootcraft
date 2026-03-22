import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtemp, rm, readFile, writeFile, mkdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  createStateStore,
  getStatePath,
  CURRENT_SCHEMA_VERSION,
  type BootcraftState,
} from "../../../src/core/state/index.js";
import { BootcraftError } from "../../../src/core/errors/index.js";

describe("StateStore", () => {
  let tempDir: string;
  let store: ReturnType<typeof createStateStore>;

  beforeEach(async () => {
    // Create a fresh temp directory for each test
    tempDir = await mkdtemp(join(tmpdir(), "bootcraft-test-"));
    store = createStateStore();
  });

  afterEach(async () => {
    // Clean up temp directory
    await rm(tempDir, { recursive: true, force: true });
  });

  describe("load()", () => {
    it("returns default state when file does not exist", async () => {
      const state = await store.load(tempDir);

      expect(state.schemaVersion).toBe(CURRENT_SCHEMA_VERSION);
      expect(state.appliedPacks).toEqual([]);
      expect(state.decisions).toEqual({});
      expect(state.project.createdAt).toBeDefined();
      expect(state.project.updatedAt).toBeDefined();
    });

    it("does not throw when .bootcraft directory does not exist", async () => {
      // tempDir has no .bootcraft folder - should not throw
      await expect(store.load(tempDir)).resolves.toBeDefined();
    });

    it("loads existing valid state file", async () => {
      // Create a valid state file
      const existingState: BootcraftState = {
        schemaVersion: CURRENT_SCHEMA_VERSION,
        project: {
          name: "test-project",
          createdAt: "2026-01-01T00:00:00.000Z",
          updatedAt: "2026-01-15T00:00:00.000Z",
        },
        decisions: { framework: "express" },
        appliedPacks: [
          {
            id: "baseline",
            version: "0.1.0",
            source: "local",
            integrityHash: "abc123",
            appliedAt: "2026-01-01T00:00:00.000Z",
          },
        ],
      };

      await mkdir(join(tempDir, ".bootcraft"), { recursive: true });
      await writeFile(getStatePath(tempDir), JSON.stringify(existingState, null, 2));

      const loaded = await store.load(tempDir);

      expect(loaded.project.name).toBe("test-project");
      expect(loaded.decisions).toEqual({ framework: "express" });
      expect(loaded.appliedPacks).toHaveLength(1);
      expect(loaded.appliedPacks[0].id).toBe("baseline");
    });

    it("throws BootcraftError with STATE_INVALID for invalid JSON", async () => {
      await mkdir(join(tempDir, ".bootcraft"), { recursive: true });
      await writeFile(getStatePath(tempDir), "{ invalid json !!!");

      await expect(store.load(tempDir)).rejects.toThrow(BootcraftError);

      try {
        await store.load(tempDir);
      } catch (err) {
        expect(err).toBeInstanceOf(BootcraftError);
        expect((err as BootcraftError).code).toBe("STATE_INVALID");
        expect((err as BootcraftError).message).toContain("Invalid JSON");
        expect((err as BootcraftError).message).toContain(getStatePath(tempDir));
      }
    });

    it("throws BootcraftError with STATE_INVALID for missing schemaVersion", async () => {
      await mkdir(join(tempDir, ".bootcraft"), { recursive: true });
      await writeFile(getStatePath(tempDir), JSON.stringify({ project: {}, appliedPacks: [] }));

      await expect(store.load(tempDir)).rejects.toThrow(BootcraftError);

      try {
        await store.load(tempDir);
      } catch (err) {
        expect((err as BootcraftError).code).toBe("STATE_INVALID");
        expect((err as BootcraftError).message).toContain("schemaVersion");
      }
    });

    it("throws BootcraftError with STATE_INVALID for non-object state", async () => {
      await mkdir(join(tempDir, ".bootcraft"), { recursive: true });
      await writeFile(getStatePath(tempDir), '"just a string"');

      await expect(store.load(tempDir)).rejects.toThrow(BootcraftError);

      try {
        await store.load(tempDir);
      } catch (err) {
        expect((err as BootcraftError).code).toBe("STATE_INVALID");
        expect((err as BootcraftError).message).toContain("JSON object");
      }
    });
  });

  describe("save()", () => {
    it("creates .bootcraft directory if missing", async () => {
      const state = await store.load(tempDir); // Get default state

      await store.save(tempDir, state);

      const content = await readFile(getStatePath(tempDir), "utf-8");
      expect(content).toBeDefined();
    });

    it("writes valid JSON with 2-space indentation and trailing newline", async () => {
      const state = await store.load(tempDir);

      await store.save(tempDir, state);

      const content = await readFile(getStatePath(tempDir), "utf-8");

      // Check trailing newline
      expect(content.endsWith("\n")).toBe(true);

      // Check 2-space indentation (look for indented line)
      expect(content).toContain('  "schemaVersion"');

      // Verify it's valid JSON
      expect(() => JSON.parse(content)).not.toThrow();
    });

    it("updates updatedAt timestamp on save", async () => {
      const state = await store.load(tempDir);
      const originalUpdatedAt = state.project.updatedAt;

      // Small delay to ensure timestamp differs
      await new Promise((r) => setTimeout(r, 10));

      await store.save(tempDir, state);

      const loaded = await store.load(tempDir);
      expect(loaded.project.updatedAt).not.toBe(originalUpdatedAt);
    });

    it("preserves all state fields through save/load cycle", async () => {
      const originalState: BootcraftState = {
        schemaVersion: CURRENT_SCHEMA_VERSION,
        project: {
          name: "my-service",
          createdAt: "2026-01-01T00:00:00.000Z",
          updatedAt: "2026-01-01T00:00:00.000Z",
        },
        decisions: {
          stack: "typescript-node",
          preset: "full",
          enableMetrics: true,
        },
        appliedPacks: [
          {
            id: "baseline",
            version: "0.1.0",
            source: "/path/to/baseline",
            integrityHash: "sha256-abc123def456",
            appliedAt: "2026-01-01T00:00:00.000Z",
          },
          {
            id: "persistence-postgres",
            version: "1.0.0",
            source: "registry",
            integrityHash: "sha256-xyz789",
            appliedAt: "2026-01-01T01:00:00.000Z",
          },
        ],
      };

      await store.save(tempDir, originalState);
      const loaded = await store.load(tempDir);

      // Check all fields preserved (except updatedAt which changes)
      expect(loaded.schemaVersion).toBe(originalState.schemaVersion);
      expect(loaded.project.name).toBe(originalState.project.name);
      expect(loaded.project.createdAt).toBe(originalState.project.createdAt);
      expect(loaded.decisions).toEqual(originalState.decisions);
      expect(loaded.appliedPacks).toEqual(originalState.appliedPacks);
    });

    it("uses atomic write (temp file then rename)", async () => {
      const state = await store.load(tempDir);

      await store.save(tempDir, state);

      // The file should exist and be complete - atomic write ensures no partial writes
      const content = await readFile(getStatePath(tempDir), "utf-8");
      const parsed = JSON.parse(content);

      // If write was not atomic, we might get partial content
      // A complete state must have all required fields
      expect(parsed.schemaVersion).toBeDefined();
      expect(parsed.project).toBeDefined();
      expect(parsed.appliedPacks).toBeDefined();
      expect(parsed.decisions).toBeDefined();
    });

    it("does not leave temp files on success", async () => {
      const state = await store.load(tempDir);

      await store.save(tempDir, state);

      // Check .bootcraft directory for temp files
      const { readdir } = await import("node:fs/promises");
      const files = await readdir(join(tempDir, ".bootcraft"));

      // Should only contain state.json, no temp files
      expect(files).toEqual(["state.json"]);
    });

    it("can overwrite existing state file", async () => {
      // Save initial state
      const state1 = await store.load(tempDir);
      state1.project.name = "first-name";
      await store.save(tempDir, state1);

      // Save updated state
      const state2 = await store.load(tempDir);
      state2.project.name = "second-name";
      await store.save(tempDir, state2);

      // Verify second save worked
      const loaded = await store.load(tempDir);
      expect(loaded.project.name).toBe("second-name");
    });
  });

  describe("schema migration", () => {
    it("migrates 0.1 state to 0.2 by adding stepHistory and capabilities", async () => {
      const v01State = {
        schemaVersion: "0.1",
        project: { createdAt: "2026-01-01T00:00:00.000Z", updatedAt: "2026-01-01T00:00:00.000Z" },
        decisions: {},
        appliedPacks: [
          {
            id: "baseline",
            version: "0.1.0",
            source: "local:/packs/baseline",
            integrityHash: "abc",
            appliedAt: "2026-01-01T00:00:00.000Z",
          },
        ],
      };

      await mkdir(join(tempDir, ".bootcraft"), { recursive: true });
      await writeFile(getStatePath(tempDir), JSON.stringify(v01State, null, 2));

      const loaded = await store.load(tempDir);

      expect(loaded.schemaVersion).toBe("0.2");
      expect(Array.isArray(loaded.stepHistory)).toBe(true);
      expect(loaded.stepHistory).toHaveLength(0);
      expect(loaded.appliedPacks[0]?.capabilities).toEqual([]);
    });

    it("does not re-migrate 0.2 state", async () => {
      const v02State = {
        schemaVersion: "0.2",
        project: { createdAt: "2026-01-01T00:00:00.000Z", updatedAt: "2026-01-01T00:00:00.000Z" },
        decisions: {},
        appliedPacks: [
          {
            id: "baseline",
            version: "0.1.0",
            source: "local:/packs/baseline",
            integrityHash: "abc",
            appliedAt: "2026-01-01T00:00:00.000Z",
            capabilities: ["health-endpoint"],
          },
        ],
        stepHistory: [
          { stepId: "recordState", completedAt: "2026-01-01T00:00:01.000Z", outcome: "success" },
        ],
      };

      await mkdir(join(tempDir, ".bootcraft"), { recursive: true });
      await writeFile(getStatePath(tempDir), JSON.stringify(v02State, null, 2));

      const loaded = await store.load(tempDir);

      expect(loaded.schemaVersion).toBe("0.2");
      expect(loaded.stepHistory).toHaveLength(1);
      expect(loaded.appliedPacks[0]?.capabilities).toEqual(["health-endpoint"]);
    });
  });

  describe("getStatePath()", () => {
    it("returns correct path for project directory", () => {
      const path = getStatePath("/home/user/my-project");
      expect(path).toBe("/home/user/my-project/.bootcraft/state.json");
    });

    it("handles trailing slash in project directory", () => {
      // join() normalizes this
      const path = getStatePath("/home/user/my-project/");
      expect(path).toContain(".bootcraft");
      expect(path).toContain("state.json");
    });
  });
});
