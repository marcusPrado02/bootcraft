/**
 * Manifest types for Bootcraft Packs/Archetypes.
 *
 * A manifest is defined by either `pack.yaml` or `archetype.yaml` at the root
 * of a pack directory.
 */

import type { CapabilityDeclaration, StepDeclaration, VariableDeclaration } from "./schemas.js";

export type ManifestKind = "pack" | "archetype";

export interface PackDescriptor {
  /** Human-friendly pack name (stable identifier across versions) */
  name: string;
  /** SemVer version string */
  version: string;
}

export interface ArchetypeDescriptor {
  /** Stable archetype identifier (kebab-case recommended) */
  id: string;
  /** Relative path inside the pack that contains templates */
  templateRoot: string;
  /** Declared template variables — used for validation and interactive prompts */
  variables?: VariableDeclaration[];
  /** Capabilities this archetype provides */
  capabilities?: CapabilityDeclaration[];
  /** Explicit generation steps. When absent, a single applyTemplates step is used. */
  steps?: StepDeclaration[];
  /** Required pack ids (semver range supported) */
  requires?: string[];
  /** Conflicting pack ids */
  conflicts?: string[];
  /** Named presets — maps preset name → variable overrides */
  presets?: Record<string, Record<string, string>>;
}

export interface BootcraftManifest {
  kind: ManifestKind;
  /** Absolute path to the manifest file used */
  filePath: string;
  pack: PackDescriptor;
  archetypes: ArchetypeDescriptor[];
}
