export type GenerateStage = "stack" | "persistence" | "messaging" | "docs" | "custom";

export interface GenerateParams {
  /** Absolute path to the pack to apply */
  packPath: string;
  /** Absolute path to the existing project directory */
  projectDir: string;
  /** Archetype id within the pack; defaults to first archetype */
  archetypeId?: string;
  /** Template variables */
  variables: Record<string, string>;
  /** Allow overwriting existing files */
  force?: boolean;
  /** Dry-run: show what would change without writing */
  dryRun?: boolean;
  /** Logical stage this generate call represents */
  stage?: GenerateStage;
}

export interface GenerateResult {
  projectDir: string;
  appliedPackId: string;
  appliedPackVersion: string;
}
