/**
 * GenerateService — Applies additional packs to an already-initialised project.
 *
 * Unlike InitService, GenerateService:
 * - Requires the project to already have .bootcraft/state.json
 * - Does not enforce an empty output directory
 * - Can be run multiple times (additive, idempotent per pack version)
 */

import { stat } from "node:fs/promises";
import { join, resolve } from "node:path";

import { BootcraftError } from "../errors/index.js";
import { createPackResolver, type PackResolver } from "../packs/PackResolver.js";
import { createGenerator, type Generator } from "../generator/Generator.js";
import { applyTemplatesStep } from "../generator/steps/applyTemplates.js";
import type { Logger, Step } from "../generator/types.js";
import type { GenerateParams, GenerateResult } from "./types.js";
import { resolveVariables } from "./variables.js";

export interface GenerateService {
  generate(params: GenerateParams): Promise<GenerateResult>;
}

export interface GenerateServiceOptions {
  packResolver?: PackResolver;
  generator?: Generator;
  logger?: Logger;
}

async function assertProjectInitialized(projectDir: string): Promise<void> {
  const stateFile = join(projectDir, ".bootcraft", "state.json");
  try {
    await stat(stateFile);
  } catch {
    throw new BootcraftError(
      "GENERATE_PROJECT_NOT_INITIALIZED",
      `Project not initialized: ${stateFile} not found.\n` +
        `Run \`bootcraft init\` first to initialize the project.`,
    );
  }
}

function nowIso(): string {
  return new Date().toISOString();
}

export function createGenerateService(options: GenerateServiceOptions = {}): GenerateService {
  const packResolver = options.packResolver ?? createPackResolver();
  const generator = options.generator ?? createGenerator({ logger: options.logger });

  return {
    async generate(params: GenerateParams): Promise<GenerateResult> {
      const projectDir = resolve(params.projectDir);
      const force = Boolean(params.force);
      const dryRun = Boolean(params.dryRun);

      if (!dryRun) {
        await assertProjectInitialized(projectDir);
      }

      const resolvedPack = await packResolver.resolveLocalPack(params.packPath);

      const archetypes = resolvedPack.manifest.archetypes;
      const chosen =
        (params.archetypeId
          ? archetypes.find((a) => a.id === params.archetypeId)
          : archetypes[0]) ?? undefined;

      if (!chosen) {
        const available = archetypes.map((a) => a.id).join(", ");
        throw new BootcraftError(
          "GENERATE_FAILED",
          params.archetypeId
            ? `Archetype not found: ${params.archetypeId}. Available: ${available}`
            : `No archetypes found in manifest for pack: ${resolvedPack.id}@${resolvedPack.version}`,
        );
      }

      const resolvedVars = resolveVariables(chosen.variables, params.variables);
      const templateRootAbs = resolve(join(resolvedPack.rootPath, chosen.templateRoot));

      const recordPackStep: Step = {
        id: "recordGeneratedPack",
        name: `Recording pack: ${resolvedPack.id}@${resolvedPack.version}`,
        async run(ctx) {
          const appliedAt = nowIso();
          const alreadyApplied = ctx.state.appliedPacks?.some(
            (p) => p.id === resolvedPack.id && p.version === resolvedPack.version,
          );
          if (!alreadyApplied) {
            ctx.state.appliedPacks = [
              ...(ctx.state.appliedPacks ?? []),
              {
                id: resolvedPack.id,
                version: resolvedPack.version,
                source: resolvedPack.source,
                integrityHash: resolvedPack.integrityHash,
                appliedAt,
              },
            ];
          }
          if (params.stage) {
            ctx.state.decisions = {
              ...(ctx.state.decisions ?? {}),
              [params.stage]: {
                packId: resolvedPack.id,
                version: resolvedPack.version,
                archetypeId: chosen.id,
                appliedAt,
              },
            };
          }
        },
      };

      const steps: Step[] = [
        recordPackStep,
        applyTemplatesStep({ templateRoot: templateRootAbs, destRelDir: ".", force, dryRun }),
      ];

      await generator.run({ projectDir, variables: resolvedVars, steps });

      return {
        projectDir,
        appliedPackId: resolvedPack.id,
        appliedPackVersion: resolvedPack.version,
      };
    },
  };
}
