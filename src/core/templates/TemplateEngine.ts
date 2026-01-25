import { mkdir, readFile, readdir, stat, writeFile } from "node:fs/promises";
import { dirname, join, relative, resolve } from "node:path";

import { BootcraftError } from "../errors/index.js";
import { ensureDir } from "../../infra/fs/index.js";
import { loadIgnoreMatcher } from "./bootcraftignore.js";

export interface TemplateRenderOptions {
  /**
   * If true, overwrite existing files. Otherwise, fail fast.
   */
  force?: boolean;

  /**
   * Optional ignore matcher override (mainly for tests).
   */
  ignoreMatcher?: { shouldIgnore(relPathPosix: string): boolean };
}

export interface TemplateEngine {
  render(params: {
    templateRoot: string;
    destDir: string;
    variables: Record<string, string>;
    options?: TemplateRenderOptions;
  }): Promise<void>;
}

function toPosixPath(p: string): string {
  return p.replaceAll("\\", "/");
}

function looksBinary(buf: Buffer): boolean {
  // Simple heuristic: presence of NUL byte
  return buf.includes(0);
}

function isTextFileByExtension(relPath: string): boolean {
  const p = relPath.toLowerCase();
  const textExt = [
    ".ts",
    ".tsx",
    ".js",
    ".mjs",
    ".cjs",
    ".json",
    ".md",
    ".txt",
    ".yaml",
    ".yml",
    ".env",
    ".properties",
    ".toml",
    ".xml",
    ".html",
    ".css",
    ".scss",
    ".java",
    ".kt",
    ".gradle",
    ".gitignore",
    ".editorconfig",
    ".sh",
    ".bat",
    ".ps1",
  ];
  return textExt.some((ext) => p.endsWith(ext));
}

function interpolate(content: string, vars: Record<string, string>): string {
  // {{var}} tokens, var = [a-zA-Z0-9_.-]+
  return content.replace(/\{\{\s*([a-zA-Z0-9_.-]+)\s*\}\}/g, (_, key: string) => {
    if (Object.prototype.hasOwnProperty.call(vars, key)) return vars[key]!;
    // If variable is missing, keep token (safer for v0.1)
    return `{{${key}}}`;
  });
}

async function fileExists(path: string): Promise<boolean> {
  try {
    await stat(path);
    return true;
  } catch {
    return false;
  }
}

async function writeFileSafe(target: string, data: Buffer | string, force: boolean): Promise<void> {
  const exists = await fileExists(target);
  if (exists && !force) {
    throw new BootcraftError(
      "TEMPLATE_TARGET_EXISTS",
      `Target already exists: ${target}. Use --force to overwrite.`
    );
  }

  await ensureDir(dirname(target));
  await writeFile(target, data);
}

async function walk(root: string, dir: string): Promise<string[]> {
  const dirents = await readdir(dir, { withFileTypes: true });
  dirents.sort((a, b) => a.name.localeCompare(b.name));

  const files: string[] = [];
  for (const d of dirents) {
    const full = join(dir, d.name);
    if (d.isDirectory()) {
      files.push(...(await walk(root, full)));
      continue;
    }
    if (d.isFile()) files.push(full);
  }
  return files;
}

export function createTemplateEngine(): TemplateEngine {
  return {
    async render({ templateRoot, destDir, variables, options }: Parameters<TemplateEngine['render']>[0]): Promise<void> {
      const root = resolve(templateRoot);
      const out = resolve(destDir);
      const force = Boolean(options?.force);

      try {
        await mkdir(out, { recursive: true });
      } catch (err) {
        throw new BootcraftError(
          "TEMPLATE_RENDER_FAILED",
          `Failed to ensure destination directory: ${out}`,
          err instanceof Error ? err : undefined
        );
      }

      const ignoreMatcher = options?.ignoreMatcher ?? (await loadIgnoreMatcher(root));
      const files = await walk(root, root);

      for (const absPath of files) {
        const rel = toPosixPath(relative(root, absPath));
        if (rel === ".bootcraftignore") continue; // never copy ignore file
        if (ignoreMatcher.shouldIgnore(rel)) continue;

        const target = join(out, rel);

        const buf = await readFile(absPath);
        const treatAsText = isTextFileByExtension(rel) && !looksBinary(buf);

        if (treatAsText) {
          const rendered = interpolate(buf.toString("utf-8"), variables);
          await writeFileSafe(target, rendered, force);
        } else {
          await writeFileSafe(target, buf, force);
        }
      }
    },
  };
}
