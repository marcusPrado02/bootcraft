import { z } from "zod";

// Intentionally minimal for v0.1 (expand later).
export const packSchema = z
  .object({
    name: z.string().min(1, "pack.name is required"),
    version: z.string().min(1, "pack.version is required"),
  })
  .strict();

export const archetypeSchema = z
  .object({
    id: z.string().min(1, "archetypes[].id is required"),
    templateRoot: z.string().min(1, "archetypes[].templateRoot is required"),
  })
  .strict();

export const manifestSchema = z
  .object({
    pack: packSchema,
    archetypes: z.array(archetypeSchema).min(1, "At least 1 archetype is required"),
  })
  .strict();

export type ManifestInput = z.infer<typeof manifestSchema>;
