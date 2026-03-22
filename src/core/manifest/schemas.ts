import { z } from "zod";

// ---------------------------------------------------------------------------
// Sub-schemas
// ---------------------------------------------------------------------------

export const variableSchema = z.object({
  name: z.string().min(1, "variables[].name is required"),
  type: z.enum(["string", "boolean", "number"]).default("string"),
  required: z.boolean().default(false),
  default: z.string().optional(),
  description: z.string().optional(),
});

export const capabilitySchema = z.object({
  id: z.string().min(1, "capabilities[].id is required"),
  name: z.string().min(1, "capabilities[].name is required"),
  description: z.string().optional(),
  default: z.boolean().default(true),
});

export const stepSchema = z.object({
  id: z.string().min(1, "steps[].id is required"),
  name: z.string().optional(),
  description: z.string().optional(),
  /** Capabilities this step activates (gates the step execution) */
  capabilities: z.array(z.string()).optional(),
  /** Template files to process in this step */
  templates: z
    .array(
      z.object({
        src: z.string(),
        dest: z.string(),
      }),
    )
    .optional(),
  /** Other step ids that must run before this one */
  after: z.array(z.string()).optional(),
});

export const packSchema = z.object({
  name: z.string().min(1, "pack.name is required"),
  version: z.string().min(1, "pack.version is required"),
});

export const archetypeSchema = z.object({
  id: z.string().min(1, "archetypes[].id is required"),
  templateRoot: z.string().min(1, "archetypes[].templateRoot is required"),
  /** Variables declared for this archetype. Used for validation and prompts. */
  variables: z.array(variableSchema).optional(),
  /** Capabilities this archetype provides */
  capabilities: z.array(capabilitySchema).optional(),
  /** Explicit steps list. If absent, defaults to a single applyTemplates step. */
  steps: z.array(stepSchema).optional(),
  /** Other pack ids/versions this archetype requires */
  requires: z.array(z.string()).optional(),
  /** Pack ids this archetype conflicts with */
  conflicts: z.array(z.string()).optional(),
  /** Named presets — groups of variable defaults */
  presets: z.record(z.string(), z.record(z.string(), z.string())).optional(),
});

export const manifestSchema = z.object({
  pack: packSchema,
  archetypes: z.array(archetypeSchema).min(1, "At least 1 archetype is required"),
});

export type ManifestInput = z.infer<typeof manifestSchema>;
export type VariableDeclaration = z.infer<typeof variableSchema>;
export type CapabilityDeclaration = z.infer<typeof capabilitySchema>;
export type StepDeclaration = z.infer<typeof stepSchema>;
