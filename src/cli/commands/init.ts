import { Command } from "commander";
import { basename, resolve } from "node:path";

import { BootcraftError } from "../../core/errors/index.js";
import { createInitService } from "../../core/init/InitService.js";
import { createCliLogger, resolveLogLevel } from "../output.js";

function parseKeyValue(input: string): [string, string] {
  const idx = input.indexOf("=");
  if (idx <= 0) return [input.trim(), ""];
  return [input.slice(0, idx).trim(), input.slice(idx + 1).trim()];
}

export function initCommand(): Command {
  return new Command("init")
    .description("Initialize a new project using the mandatory baseline pack.")
    .requiredOption("--pack <path>", "Path to the baseline pack directory")
    .requiredOption("--out <dir>", "Output directory for the generated project")
    .option("--archetype <id>", "Archetype id (defaults to first archetype in manifest)")
    .option("--name <serviceName>", "Service/project name (defaults to output folder name)")
    .option("-D, --define <k=v...>", "Define template variables (repeatable)", (v, acc: string[]) => {
      acc.push(v);
      return acc;
    }, [] as string[])
    .option("--force", "Allow init into non-empty dir and overwrite files", false)
    .option("--verbose", "Show detailed progress output", false)
    .option("--debug", "Show debug-level output (implies --verbose)", false)
    .action(async (opts) => {
      const outDir = resolve(String(opts.out));
      const packPath = resolve(String(opts.pack));
      const archetypeId = opts.archetype ? String(opts.archetype) : undefined;

      const inferredName = basename(outDir);
      const serviceName = String(opts.name ?? inferredName);

      const defines: string[] = Array.isArray(opts.define) ? opts.define : [];
      const variables: Record<string, string> = {
        serviceName,
        projectName: serviceName,
      };

      for (const def of defines) {
        const [k, v] = parseKeyValue(def);
        if (!k) continue;
        variables[k] = v;
      }

      const logger = createCliLogger(resolveLogLevel(opts));
      const init = createInitService({ logger });

      try {
        const res = await init.init({
          packPath,
          outDir,
          archetypeId,
          variables,
          force: Boolean(opts.force),
        });

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
