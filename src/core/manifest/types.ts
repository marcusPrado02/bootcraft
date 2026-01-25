/**
 * Manifest types for Bootcraft Packs/Archetypes.
 *
 * A manifest is defined by either `pack.yaml` or `archetype.yaml` at the root
 * of a pack directory.
 */

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
}

export interface BootcraftManifest {
  kind: ManifestKind;
  /** Absolute path to the manifest file used */
  filePath: string;
  pack: PackDescriptor;
  archetypes: ArchetypeDescriptor[];
}
