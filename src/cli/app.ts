import { Command } from "commander";
import { doctorCommand } from "./commands/doctor.js";
import { initCommand } from "./commands/init.js";

export function createApp(): Command {
  const program = new Command();

  program
    .name("bootcraft")
    .description("Golden path enforcer: bootstrap projetos completos e maduros.")
    .version("0.1.0");


  program.addCommand(initCommand());
  program.addCommand(doctorCommand());

  program.action(() => {
    program.help();
  });

  return program;
}
