import { Command } from "commander";
import { doctorCommand } from "./commands/doctor.js";

export function createApp(): Command {
  const program = new Command();

  program
    .name("bootcraft")
    .description("Golden path enforcer: bootstrap projetos completos e maduros.")
    .version("0.1.0");

  program.addCommand(doctorCommand());

  // padrão: mostrar help se não passar nada
  program.action(() => {
    program.help();
  });

  return program;
}
