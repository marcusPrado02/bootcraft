/**
 * StateStore — Manages .bootcraft/state.json for a project.
 *
 * The store handles:
 * - Loading state (with graceful defaults when file is missing)
 * - Saving state atomically (temp file + rename)
 * - Versioned schema for forward compatibility
 */

import { join } from "node:path";
import { access, constants } from "node:fs/promises";
import { atomicWriteFile, readJsonFile } from "../../infra/fs/index.js";
import { BootcraftError } from "../errors/index.js";
import {
  BootcraftState,
  CURRENT_SCHEMA_VERSION,
  createDefaultState,
} from "./types.js";

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

/**
 * Validate that an object looks like a BootcraftState.
 * Does basic structural validation without being overly strict.
 */
function validateState(data: unknown, path: string): BootcraftState {
  if (typeof data !== "object" || data === null) {
    throw new BootcraftError(
      "STATE_INVALID",
      `State file must contain a JSON object: ${path}`
    );
  }

  const obj = data as Record<string, unknown>;

  // Check required fields exist with correct types
  if (typeof obj.schemaVersion !== "string") {
    throw new BootcraftError(
      "STATE_INVALID",
      `State file missing or invalid 'schemaVersion': ${path}`
    );
  }

  if (typeof obj.project !== "object" || obj.project === null) {
    throw new BootcraftError(
      "STATE_INVALID",
      `State file missing or invalid 'project': ${path}`
    );
  }

  if (!Array.isArray(obj.appliedPacks)) {
    throw new BootcraftError(
      "STATE_INVALID",
      `State file missing or invalid 'appliedPacks': ${path}`
    );
  }

  // Note: We intentionally don't validate schemaVersion value strictly,
  // allowing future versions to be read (additive evolution)
  return data as BootcraftState;
}

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

      // File exists - read and validate it
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
