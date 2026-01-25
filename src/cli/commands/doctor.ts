import { Command } from "commander";
import { access, constants } from "node:fs/promises";
import { resolve } from "node:path";

export function doctorCommand(): Command {
  return new Command("doctor")
    .description("Valida se o ambiente local está pronto para rodar o Bootcraft.")
    .option("-p, --path <dir>", "Diretório do projeto (default: cwd)", process.cwd())
    .action(async (opts) => {
      const dir = resolve(opts.path);

      // check simples e útil: permissão de escrita no diretório
      await access(dir, constants.R_OK | constants.W_OK);

      console.log(`[bootcraft] doctor OK`);
      console.log(`- path: ${dir}`);
      console.log(`- fs: read/write OK`);
    });
}
