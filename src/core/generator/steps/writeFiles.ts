import { resolve } from "node:path";
import { writeFile } from "node:fs/promises";

import { ensureDir } from "../../../infra/fs/index.js";

import type { Step } from "../types.js";

/**
 * Write arbitrary files into the project (programmatic generation).
 * Content supports {{var}} interpolation using the same rules as TemplateEngine (simple).
 */
export interface WriteFileSpec {
  relPath: string;
  content: string;
}

function interpolate(content: string, vars: Record<string, string>): string {
  return content.replace(/\{\{\s*([a-zA-Z0-9_.-]+)\s*\}\}/g, (_, key: string) => {
    if (Object.prototype.hasOwnProperty.call(vars, key)) return vars[key]!;
    return `{{${key}}}`;
  });
}

export function writeFilesStep(files: WriteFileSpec[]): Step {
  return {
    id: `writeFiles:${files.length}`,
    async run(ctx) {
      for (const f of files) {
        const abs = resolve(ctx.projectDir, f.relPath);
        await ensureDir(new URL(`file://${abs}`).pathname.split("/").slice(0, -1).join("/") || ctx.projectDir);
        const rendered = interpolate(f.content, ctx.variables);
        await writeFile(abs, rendered, "utf-8");
      }
    },
  };
}
