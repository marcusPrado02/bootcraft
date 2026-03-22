import { Command } from "commander";
import { basename, resolve } from "node:path";

import { BootcraftError } from "../../core/errors/index.js";
import { createInitService } from "../../core/init/InitService.js";
import { createCliLogger, resolveLogLevel } from "../output.js";
import { promptInitAnswers } from "../prompts.js";

function parseKeyValue(input: string): [string, string] {
  const idx = input.indexOf("=");
  if (idx <= 0) return [input.trim(), ""];
  return [input.slice(0, idx).trim(), input.slice(idx + 1).trim()];
}

export function initCommand(): Command {
  return new Command("init")
    .description("Initialize a new project using the mandatory baseline pack.")
    .option("--pack <path>", "Path to the baseline pack directory")
    .option("--out <dir>", "Output directory for the generated project")
    .option("--archetype <id>", "Archetype id (defaults to first archetype in manifest)")
    .option("--name <serviceName>", "Service/project name (defaults to output folder name)")
    .option("-D, --define <k=v...>", "Define template variables (repeatable)", (v, acc: string[]) => {
      acc.push(v);
      return acc;
    }, [] as string[])
    .option("--force", "Allow init into non-empty dir and overwrite files", false)
    .option("--dry-run", "Preview files that would be written without touching the filesystem", false)
    .option("--verbose", "Show detailed progress output", false)
    .option("--debug", "Show debug-level output (implies --verbose)", false)
    .action(async (opts) => {
      const isInteractive = !opts.pack || !opts.out;

      let packPathRaw: string = opts.pack ?? "";
      let outDirRaw: string = opts.out ?? "";
      let serviceNameRaw: string = opts.name ?? "";
      let forceRaw: boolean = Boolean(opts.force);
      let extraVars: Record<string, string> = {};

      if (isInteractive) {
        const answers = await promptInitAnswers({
          packPath: opts.pack,
          outDir: opts.out,
          projectName: opts.name,
          force: opts.force ? true : undefined,
        });

        packPathRaw = answers.packPath;
        outDirRaw = answers.outDir;
        serviceNameRaw = answers.projectName;
        forceRaw = answers.force;
        extraVars = { projectDescription: answers.projectDescription };
      }

      const outDir = resolve(outDirRaw);
      const packPath = resolve(packPathRaw);
      const archetypeId = opts.archetype ? String(opts.archetype) : undefined;
      const inferredName = basename(outDir);
      const serviceName = serviceNameRaw || inferredName;

      const defines: string[] = Array.isArray(opts.define) ? opts.define : [];
      const variables: Record<string, string> = {
        serviceName,
        projectName: serviceName,
        ...extraVars,
      };

      for (const def of defines) {
        const [k, v] = parseKeyValue(def);
        if (!k) continue;
        variables[k] = v;
      }

      const logger = createCliLogger(resolveLogLevel(opts));
      const init = createInitService({ logger });
      const dryRun = Boolean(opts.dryRun);

      if (dryRun) {
        console.log("[bootcraft] dry-run mode — no files will be written\n");
      }

      try {
        const res = await init.init({
          packPath,
          outDir,
          archetypeId,
          variables,
          force: forceRaw,
          dryRun,
        });

        if (dryRun) {
          console.log("\n[bootcraft] dry-run complete — run without --dry-run to apply");
          return;
        }

        console.log("[bootcraft] init OK");
        console.log(`- project: ${res.projectDir}`);
        console.log(`- baseline: ${packPath}`);
        if (archetypeId) console.log(`- archetype: ${archetypeId}`);
        console.log(`- next: bootcraft doctor --path ${res.projectDir}`);
      } catch (err) {
        if (err instanceof BootcraftError) {
          console.error(err.toUserMessage());
          process.exit(1);
        }
        const msg = err instanceof Error ? err.message : String(err);
        console.error(`[INIT_FAILED] ${msg}`);
        process.exit(1);
      }
    });
}
