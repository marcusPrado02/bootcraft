export interface InitParams {
  /** Path to a local baseline pack directory */
  packPath: string;

  /** Output directory for the generated project */
  outDir: string;

  /** Optional archetype id; if omitted, uses the first archetype */
  archetypeId?: string;

  /** Variables used by templates ({{var}}) */
  variables: Record<string, string>;

  /** If true, allows writing into a non-empty directory and overwriting files */
  force?: boolean;
}

export interface InitResult {
  projectDir: string;
}
