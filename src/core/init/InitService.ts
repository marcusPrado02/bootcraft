import { mkdir, readdir, stat } from "node:fs/promises";
import { join, resolve } from "node:path";

import { BootcraftError } from "../errors/index.js";
import { createPackResolver, type PackResolver } from "../packs/PackResolver.js";
import { createGenerator, type Generator } from "../generator/Generator.js";
import { applyTemplatesStep } from "../generator/steps/applyTemplates.js";
import type { Step } from "../generator/types.js";
import { resolveVariables } from "../generate/variables.js";

import type { InitParams, InitResult } from "./types.js";

export interface InitService {
  init(params: InitParams): Promise<InitResult>;
}

export interface InitServiceOptions {
  packResolver?: PackResolver;
  generator?: Generator;
  logger?: import("../generator/types.js").Logger;
}

async function pathExists(p: string): Promise<boolean> {
  try {
    await stat(p);
    return true;
  } catch {
    return false;
  }
}

async function ensureEmptyOrForce(dir: string, force: boolean): Promise<void> {
  const exists = await pathExists(dir);
  if (!exists) {
    await mkdir(dir, { recursive: true });
    return;
  }

  // If exists, it must be a directory
  const s = await stat(dir);
  if (!s.isDirectory()) {
    throw new BootcraftError("INIT_FAILED", `Output path is not a directory: ${dir}`);
  }

  const entries = await readdir(dir);
  if (entries.length > 0 && !force) {
    throw new BootcraftError(
      "INIT_OUTPUT_NOT_EMPTY",
      `Output directory is not empty: ${dir}. Use --force to proceed.`,
    );
  }
}

function nowIso(): string {
  return new Date().toISOString();
}

export function createInitService(options: InitServiceOptions = {}): InitService {
  const packResolver = options.packResolver ?? createPackResolver();
  const generator = options.generator ?? createGenerator({ logger: options.logger });

  return {
    async init(params: InitParams): Promise<InitResult> {
      const projectDir = resolve(params.outDir);
      const force = Boolean(params.force);
      const dryRun = Boolean(params.dryRun);

      await ensureEmptyOrForce(projectDir, force);

      // Resolve the baseline pack (local) + register in registry (done by resolver)
      const resolvedPack = await packResolver.resolveLocalPack(params.packPath);

      // Choose archetype
      const archetypes = resolvedPack.manifest.archetypes;
      const chosen =
        (params.archetypeId
          ? archetypes.find((a) => a.id === params.archetypeId)
          : archetypes[0]) ?? undefined;

      if (!chosen) {
        const available = archetypes.map((a) => a.id).join(", ");
        throw new BootcraftError(
          "INIT_FAILED",
          params.archetypeId
            ? `Archetype not found: ${params.archetypeId}. Available: ${available}`
            : `No archetypes found in manifest for pack: ${resolvedPack.id}@${resolvedPack.version}`,
        );
      }

      const templateRootAbs = resolve(join(resolvedPack.rootPath, chosen.templateRoot));

      // Validate and apply defaults for declared variables
      const resolvedVars = resolveVariables(chosen.variables, params.variables);

      // Step 0: record decisions + applied pack into state
      const recordStateStep: Step = {
        id: "recordState",
        name: "Recording architectural decisions",
        async run(ctx) {
          const appliedAt = nowIso();

          // decisions (keep it simple + future-proof)
          ctx.state.decisions = {
            ...(ctx.state.decisions ?? {}),
            init: {
              baselinePack: {
                id: resolvedPack.id,
                version: resolvedPack.version,
                source: resolvedPack.source,
                integrityHash: resolvedPack.integrityHash,
              },
              archetypeId: chosen.id,
            },
          };

          // appliedPacks (append if not already applied)
          const exists = ctx.state.appliedPacks?.some(
            (p) => p.id === resolvedPack.id && p.version === resolvedPack.version,
          );
          if (!exists) {
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

          // project name (best effort)
          ctx.state.project = {
            ...(ctx.state.project ?? {}),
            name: ctx.state.project?.name ?? ctx.variables.serviceName ?? ctx.variables.projectName,
          } as any;
        },
      };

      const steps: Step[] = [
        recordStateStep,
        applyTemplatesStep({
          templateRoot: templateRootAbs,
          destRelDir: ".", // project root
          force,
          dryRun,
        }),
      ];

      try {
        await generator.run({
          projectDir,
          variables: resolvedVars,
          steps,
        });

        return { projectDir };
      } catch (err) {
        if (err instanceof BootcraftError) throw err;
        throw new BootcraftError(
          "INIT_FAILED",
          `Failed to initialize project at: ${projectDir}`,
          err instanceof Error ? err : undefined,
        );
      }
    },
  };
}
