/**
 * Bootcraft State Schema Types
 *
 * This module defines the versioned state schema stored in .bootcraft/state.json.
 * The schema follows additive evolution: new fields can be added, but existing
 * fields should never be removed or have their types changed.
 */

/** Current schema version. Increment on breaking changes. */
export const CURRENT_SCHEMA_VERSION = "0.1" as const;

/**
 * Information about an applied pack.
 */
export interface AppliedPack {
  /** Pack identifier (kebab-case) */
  id: string;
  /** SemVer version of the pack when applied */
  version: string;
  /** Source location (local path, registry, or remote URL) */
  source: string;
  /** SHA-256 hash of pack contents for integrity verification */
  integrityHash: string;
  /** ISO 8601 timestamp when pack was applied */
  appliedAt: string;
}

/**
 * Project metadata stored in state.
 */
export interface ProjectInfo {
  /** Project name (optional, may be inferred from directory) */
  name?: string;
  /** ISO 8601 timestamp when project was initialized */
  createdAt: string;
  /** ISO 8601 timestamp of last state update */
  updatedAt: string;
}

/**
 * Root state object persisted to .bootcraft/state.json.
 *
 * This is a versioned schema. When reading older states, missing fields
 * should be treated as undefined/empty. When writing, always use the
 * current schema version.
 */
export interface BootcraftState {
  /** Schema version for forward compatibility */
  schemaVersion: typeof CURRENT_SCHEMA_VERSION;
  /** Project metadata */
  project: ProjectInfo;
  /** User decisions made during init (pack choices, presets, etc.) */
  decisions: Record<string, unknown>;
  /** List of packs applied to this project, in application order */
  appliedPacks: AppliedPack[];
}

/**
 * Create a default empty state with current timestamp.
 */
export function createDefaultState(): BootcraftState {
  const now = new Date().toISOString();
  return {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    project: {
      createdAt: now,
      updatedAt: now,
    },
    decisions: {},
    appliedPacks: [],
  };
}
