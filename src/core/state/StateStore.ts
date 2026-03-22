/**
 * StateStore — Manages .bootcraft/state.json for a project.
 *
 * The store handles:
 * - Loading state (with graceful defaults when file is missing)
 * - Saving state atomically (temp file + rename)
 * - Versioned schema for forward compatibility
 * - Automatic schema migration (0.1 → 0.2)
 */

import { join } from "node:path";
import { access, constants } from "node:fs/promises";
import { atomicWriteFile, readJsonFile } from "../../infra/fs/index.js";
import { BootcraftError } from "../errors/index.js";
import { type BootcraftState, CURRENT_SCHEMA_VERSION, createDefaultState } from "./types.js";

/** Directory name for Bootcraft metadata */
const BOOTCRAFT_DIR = ".bootcraft";
/** State file name */
const STATE_FILE = "state.json";

/**
 * StateStore interface for reading/writing Bootcraft project state.
 */
export interface StateStore {
  /**
   * Load state from a project directory.
   *
   * @param projectDir - Root directory of the project
   * @returns The loaded state, or a default empty state if file doesn't exist
   * @throws BootcraftError if file exists but contains invalid JSON
   */
  load(projectDir: string): Promise<BootcraftState>;

  /**
   * Save state to a project directory.
   *
   * - Creates .bootcraft directory if it doesn't exist
   * - Writes atomically (temp file + rename)
   * - Updates the `updatedAt` timestamp automatically
   *
   * @param projectDir - Root directory of the project
   * @param state - State to save
   */
  save(projectDir: string, state: BootcraftState): Promise<void>;
}

/**
 * Get the path to the state file for a project.
 */
export function getStatePath(projectDir: string): string {
  return join(projectDir, BOOTCRAFT_DIR, STATE_FILE);
}

/**
 * Check if a state file exists for a project.
 */
async function stateFileExists(projectDir: string): Promise<boolean> {
  try {
    await access(getStatePath(projectDir), constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// Schema migration
// ---------------------------------------------------------------------------

/**
 * Migrate a raw state object from any prior version to the current schema.
 * Each migration step is additive — it only sets fields that are absent.
 */
function migrateState(raw: Record<string, unknown>): BootcraftState {
  const version = raw["schemaVersion"];

  // 0.1 → 0.2: add stepHistory field and capabilities per applied pack
  if (version === "0.1") {
    raw["stepHistory"] = [];

    const packs = raw["appliedPacks"];
    if (Array.isArray(packs)) {
      raw["appliedPacks"] = packs.map((p: unknown) => {
        if (typeof p === "object" && p !== null && !("capabilities" in p)) {
          return { ...(p as object), capabilities: [] };
        }
        return p;
      });
    }

    raw["schemaVersion"] = "0.2";
  }

  return raw as unknown as BootcraftState;
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

/**
 * Validate that an object looks like a BootcraftState after migration.
 */
function validateState(data: unknown, path: string): BootcraftState {
  if (typeof data !== "object" || data === null) {
    throw new BootcraftError("STATE_INVALID", `State file must contain a JSON object: ${path}`);
  }

  const obj = data as Record<string, unknown>;

  if (typeof obj["schemaVersion"] !== "string") {
    throw new BootcraftError(
      "STATE_INVALID",
      `State file missing or invalid 'schemaVersion': ${path}`,
    );
  }

  if (typeof obj["project"] !== "object" || obj["project"] === null) {
    throw new BootcraftError("STATE_INVALID", `State file missing or invalid 'project': ${path}`);
  }

  if (!Array.isArray(obj["appliedPacks"])) {
    throw new BootcraftError(
      "STATE_INVALID",
      `State file missing or invalid 'appliedPacks': ${path}`,
    );
  }

  return migrateState(obj);
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

/**
 * Default StateStore implementation using the filesystem.
 */
export function createStateStore(): StateStore {
  return {
    async load(projectDir: string): Promise<BootcraftState> {
      const statePath = getStatePath(projectDir);

      // Return default state if file doesn't exist (not an error)
      if (!(await stateFileExists(projectDir))) {
        return createDefaultState();
      }

      // File exists - read, validate, and migrate if necessary
      const data = await readJsonFile<unknown>(statePath);
      return validateState(data, statePath);
    },

    async save(projectDir: string, state: BootcraftState): Promise<void> {
      const statePath = getStatePath(projectDir);

      // Update timestamp and ensure current schema version
      const stateToSave: BootcraftState = {
        ...state,
        schemaVersion: CURRENT_SCHEMA_VERSION,
        project: {
          ...state.project,
          updatedAt: new Date().toISOString(),
        },
      };

      // Pretty-print with 2 spaces, trailing newline
      const content = JSON.stringify(stateToSave, null, 2) + "\n";

      await atomicWriteFile(statePath, content);
    },
  };
}
