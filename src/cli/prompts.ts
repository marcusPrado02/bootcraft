/**
 * Interactive prompts for the init command.
 *
 * Only invoked when required flags are omitted. When all flags are
 * provided (CI, scripts), this module is never touched.
 */

import { input, confirm } from "@inquirer/prompts";
import { basename } from "node:path";

export interface InitAnswers {
  packPath: string;
  outDir: string;
  projectName: string;
  projectDescription: string;
  force: boolean;
}

export async function promptInitAnswers(partial: {
  packPath?: string;
  outDir?: string;
  projectName?: string;
  force?: boolean;
}): Promise<InitAnswers> {
  const packPath =
    partial.packPath ??
    (await input({
      message: "Path to the baseline pack:",
      required: true,
    }));

  const outDir =
    partial.outDir ??
    (await input({
      message: "Output directory for the generated project:",
      required: true,
    }));

  const inferredName = basename(outDir);
  const projectName =
    partial.projectName ??
    (await input({
      message: "Service name:",
      default: inferredName,
    }));

  const projectDescription = await input({
    message: "Short description:",
    default: "A service bootstrapped with Bootcraft",
  });

  const force =
    partial.force ??
    (await confirm({
      message: "Allow overwriting existing files?",
      default: false,
    }));

  return { packPath, outDir, projectName, projectDescription, force };
}
