import { Command } from "commander";
import { resolve } from "node:path";

import { BootcraftError } from "../../core/errors/index.js";
import { createGenerateService } from "../../core/generate/GenerateService.js";
import type { GenerateStage } from "../../core/generate/types.js";
import { createCliLogger, resolveLogLevel } from "../output.js";

function parseKeyValue(input: string): [string, string] {
  const idx = input.indexOf("=");
  if (idx <= 0) return [input.trim(), ""];
  return [input.slice(0, idx).trim(), input.slice(idx + 1).trim()];
}

function makeStageCommand(stage: GenerateStage, description: string): Command {
  return new Command(stage)
    .description(description)
    .requiredOption("--pack <path>", `Path to the ${stage} pack directory`)
    .option("--project <dir>", "Project directory (default: cwd)", process.cwd())
    .option("--archetype <id>", "Archetype id (defaults to first archetype in pack)")
    .option(
      "-D, --define <k=v...>",
      "Template variables (repeatable)",
      (v, acc: string[]) => {
        acc.push(v);
        return acc;
      },
      [] as string[],
    )
    .option("--force", "Allow overwriting existing files", false)
    .option("--dry-run", "Preview files that would change without writing", false)
    .option("--verbose", "Show detailed output", false)
    .option("--debug", "Show debug output", false)
    .action(async (opts) => {
      const projectDir = resolve(String(opts.project));
      const packPath = resolve(String(opts.pack));
      const archetypeId = opts.archetype ? String(opts.archetype) : undefined;
      const dryRun = Boolean(opts.dryRun);

      const defines: string[] = Array.isArray(opts.define) ? opts.define : [];
      const variables: Record<string, string> = {};
      for (const def of defines) {
        const [k, v] = parseKeyValue(def);
        if (k) variables[k] = v;
      }

      const logger = createCliLogger(resolveLogLevel(opts));
      const generateService = createGenerateService({ logger });

      if (dryRun) {
        console.log(`[bootcraft] dry-run mode — no files will be written\n`);
      }

      try {
        const res = await generateService.generate({
          packPath,
          projectDir,
          archetypeId,
          variables,
          force: Boolean(opts.force),
          dryRun,
          stage,
        });

        if (dryRun) {
          console.log(`\n[bootcraft] dry-run complete — run without --dry-run to apply`);
          return;
        }

        console.log(`[bootcraft] generate ${stage} OK`);
        console.log(`- project: ${res.projectDir}`);
        console.log(`- applied: ${res.appliedPackId}@${res.appliedPackVersion}`);
        console.log(`- next: bootcraft doctor --path ${res.projectDir}`);
      } catch (err) {
        if (err instanceof BootcraftError) {
          console.error(err.toUserMessage());
          process.exit(1);
        }
        const msg = err instanceof Error ? err.message : String(err);
        console.error(`[GENERATE_FAILED] ${msg}`);
        process.exit(1);
      }
    });
}

export function generateCommand(): Command {
  const cmd = new Command("generate")
    .description(
      "Apply additional packs to an already-initialized project.\n" +
        "Run after `bootcraft init` to add stack, persistence, messaging, or docs.",
    )
    .action(() => cmd.help());

  cmd.addCommand(
    makeStageCommand(
      "stack",
      "Apply a language/runtime stack pack (e.g. stack-typescript-node, stack-go)",
    ),
  );
  cmd.addCommand(
    makeStageCommand(
      "persistence",
      "Apply a persistence pack (e.g. persistence-postgres, persistence-mongodb)",
    ),
  );
  cmd.addCommand(
    makeStageCommand(
      "messaging",
      "Apply a messaging pack (e.g. messaging-kafka, messaging-rabbitmq)",
    ),
  );
  cmd.addCommand(
    makeStageCommand("docs", "Apply a documentation pack (e.g. docs-openapi, docs-adr)"),
  );
  cmd.addCommand(makeStageCommand("custom", "Apply any pack as a custom generation stage"));

  return cmd;
}
