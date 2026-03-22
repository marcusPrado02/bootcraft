import { resolve } from "node:path";

import { createTemplateEngine, type TemplateEngine } from "../../templates/TemplateEngine.js";

import type { Step } from "../types.js";

export interface ApplyTemplatesStepParams {
  templateRoot: string;
  /**
   * Destination directory relative to project root.
   * Example: "." or "src" or "docs"
   */
  destRelDir?: string;
  force?: boolean;
  dryRun?: boolean;
}

export function applyTemplatesStep(
  params: ApplyTemplatesStepParams,
  deps?: { engine?: TemplateEngine },
): Step {
  const engine = deps?.engine ?? createTemplateEngine();

  return {
    id: `applyTemplates:${params.destRelDir ?? "."}`,
    name: "Applying templates",
    async run(ctx) {
      const destDir = resolve(ctx.projectDir, params.destRelDir ?? ".");
      const dryRun = Boolean(params.dryRun);
      await engine.render({
        templateRoot: params.templateRoot,
        destDir,
        variables: ctx.variables,
        options: {
          force: Boolean(params.force),
          dryRun,
          onFile: dryRun ? (rel) => ctx.logger.info(`  [dry-run] would write: ${rel}`) : undefined,
          warnOnUnresolved: true,
          onUnresolved: (varName, filePath) =>
            ctx.logger.warn(`Unresolved variable {{${varName}}} in ${filePath}`),
        },
      });
    },
  };
}
