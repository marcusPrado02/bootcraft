import { Command } from "commander";
import { resolve } from "node:path";

import { BootcraftError } from "../../core/errors/index.js";
import { createRegistryService } from "../../core/registry/RegistryService.js";
import { createPackResolver } from "../../core/packs/PackResolver.js";
import { createManifestLoader } from "../../core/manifest/ManifestLoader.js";

// ---------------------------------------------------------------------------
// pack list
// ---------------------------------------------------------------------------

function packListCommand(): Command {
  return new Command("list")
    .description("List all packs registered in the local registry.")
    .action(async () => {
      const registry = createRegistryService();
      const reg = await registry.load();

      if (reg.packs.length === 0) {
        console.log("No packs registered. Run `bootcraft pack add <path>` to register one.");
        return;
      }

      console.log(`Registered packs (${reg.packs.length}):\n`);

      const rows = reg.packs
        .slice()
        .sort((a, b) => a.id.localeCompare(b.id) || a.version.localeCompare(b.version));

      for (const p of rows) {
        const source = p.source.replace(/^local:/, "");
        const hash = p.integrityHash.slice(0, 12);
        console.log(`  ${p.id}@${p.version}`);
        console.log(`    source:  ${source}`);
        console.log(`    hash:    ${hash}…`);
        console.log(`    added:   ${p.registeredAt.slice(0, 10)}`);
        console.log();
      }
    });
}

// ---------------------------------------------------------------------------
// pack info
// ---------------------------------------------------------------------------

function packInfoCommand(): Command {
  return new Command("info")
    .description("Show full manifest details for a registered pack.")
    .argument("<id>", "Pack id (e.g. baseline)")
    .option("--version <v>", "Specific version (defaults to highest registered)")
    .action(async (id: string, opts) => {
      const registry = createRegistryService();
      const record = await registry.getPack(id, opts.version);

      if (!record) {
        const suffix = opts.version ? `@${opts.version}` : "";
        console.error(`Pack not found: ${id}${suffix}`);
        console.error(`Run \`bootcraft pack list\` to see registered packs.`);
        process.exitCode = 1;
        return;
      }

      const packPath = record.source.replace(/^local:/, "");
      const loader = createManifestLoader();

      let manifest;
      try {
        manifest = await loader.load(packPath);
      } catch {
        console.log(`Pack: ${record.id}@${record.version}`);
        console.log(`Source: ${packPath}`);
        console.log(`Hash:   ${record.integrityHash}`);
        console.log(`Added:  ${record.registeredAt}`);
        console.log(`\n[warn] Could not load manifest from source path (pack may have moved).`);
        return;
      }

      console.log(`Pack: ${manifest.pack.name}@${manifest.pack.version}`);
      console.log(`Kind: ${manifest.kind}`);
      console.log(`Source: ${packPath}`);
      console.log(`Hash:   ${record.integrityHash.slice(0, 16)}…`);
      console.log(`Added:  ${record.registeredAt.slice(0, 10)}`);

      for (const arch of manifest.archetypes) {
        console.log(`\nArchetype: ${arch.id}`);
        console.log(`  templateRoot: ${arch.templateRoot}`);

        if (arch.variables && arch.variables.length > 0) {
          console.log(`  variables:`);
          for (const v of arch.variables) {
            const req = v.required
              ? " (required)"
              : v.default !== undefined
                ? ` (default: ${v.default})`
                : "";
            console.log(
              `    - ${v.name}: ${v.type}${req}${v.description ? `  — ${v.description}` : ""}`,
            );
          }
        }

        if (arch.capabilities && arch.capabilities.length > 0) {
          console.log(`  capabilities:`);
          for (const c of arch.capabilities) {
            console.log(`    - ${c.id}: ${c.name}${c.default ? " [default]" : ""}`);
          }
        }

        if (arch.steps && arch.steps.length > 0) {
          console.log(`  steps:`);
          for (const s of arch.steps) {
            console.log(`    - ${s.id}${s.name ? `: ${s.name}` : ""}`);
          }
        }
      }
    });
}

// ---------------------------------------------------------------------------
// pack add
// ---------------------------------------------------------------------------

function packAddCommand(): Command {
  return new Command("add")
    .description("Register a local pack directory in the registry.")
    .argument("<path>", "Path to the pack directory")
    .action(async (packPath: string) => {
      const resolvedPath = resolve(packPath);
      const registry = createRegistryService();
      const resolver = createPackResolver({ registry });

      try {
        const resolved = await resolver.resolveLocalPack(resolvedPath);
        console.log(`Pack registered: ${resolved.id}@${resolved.version}`);
        console.log(`  source:  ${resolvedPath}`);
        console.log(`  hash:    ${resolved.integrityHash.slice(0, 16)}…`);
      } catch (err) {
        if (err instanceof BootcraftError) {
          console.error(err.toUserMessage());
          process.exitCode = 1;
          return;
        }
        const msg = err instanceof Error ? err.message : String(err);
        console.error(`[PACK_ADD_FAILED] ${msg}`);
        process.exitCode = 1;
      }
    });
}

// ---------------------------------------------------------------------------
// pack remove
// ---------------------------------------------------------------------------

function packRemoveCommand(): Command {
  return new Command("remove")
    .description("Remove a pack from the registry (does not delete pack files).")
    .argument("<id>", "Pack id to remove")
    .option("--version <v>", "Remove only a specific version (default: remove all versions)")
    .action(async (id: string, opts) => {
      const registry = createRegistryService();

      try {
        const { removed } = await registry.removePack(id, opts.version);

        if (removed === 0) {
          const suffix = opts.version ? `@${opts.version}` : "";
          console.error(`Pack not found in registry: ${id}${suffix}`);
          process.exitCode = 1;
          return;
        }

        const suffix = opts.version
          ? `@${opts.version}`
          : ` (${removed} version${removed > 1 ? "s" : ""})`;
        console.log(`Removed: ${id}${suffix}`);
      } catch (err) {
        if (err instanceof BootcraftError) {
          console.error(err.toUserMessage());
          process.exitCode = 1;
          return;
        }
        const msg = err instanceof Error ? err.message : String(err);
        console.error(`[PACK_REMOVE_FAILED] ${msg}`);
        process.exitCode = 1;
      }
    });
}

// ---------------------------------------------------------------------------
// pack (root)
// ---------------------------------------------------------------------------

export function packCommand(): Command {
  const cmd = new Command("pack")
    .description("Manage packs in the local Bootcraft registry.")
    .action(() => cmd.help());

  cmd.addCommand(packListCommand());
  cmd.addCommand(packInfoCommand());
  cmd.addCommand(packAddCommand());
  cmd.addCommand(packRemoveCommand());

  return cmd;
}
