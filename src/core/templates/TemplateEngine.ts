import { mkdir, readFile, readdir, stat, writeFile } from "node:fs/promises";
import { dirname, join, relative, resolve } from "node:path";

import { BootcraftError } from "../errors/index.js";
import { ensureDir } from "../../infra/fs/index.js";
import { loadIgnoreMatcher } from "./bootcraftignore.js";
import { applyHelper, builtinVars, HELPER_NAMES } from "./helpers.js";

export interface TemplateRenderOptions {
  /**
   * If true, overwrite existing files. Otherwise, fail fast.
   */
  force?: boolean;

  /**
   * If true, no files are written. onFile is called for each file
   * that would be written, allowing the caller to report them.
   */
  dryRun?: boolean;

  /**
   * Called for each file that would be written.
   * In dry-run mode this replaces the actual write.
   * In normal mode this is called after each successful write.
   */
  onFile?: (relPath: string, action: "write" | "skip") => void;

  /**
   * If true, emit a warning when a template variable token like {{varName}}
   * is left unresolved after interpolation. Default: false (silently keep token).
   */
  warnOnUnresolved?: boolean;

  /**
   * Called when an unresolved variable token is found (requires warnOnUnresolved).
   */
  onUnresolved?: (varName: string, filePath: string) => void;

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
    ".example",
    ".sh",
    ".bat",
    ".ps1",
  ];
  return textExt.some((ext) => p.endsWith(ext));
}

function isTruthy(value: string | undefined): boolean {
  if (value === undefined || value === "") return false;
  if (value === "false" || value === "0") return false;
  return true;
}

function processConditionals(content: string, vars: Record<string, string>): string {
  // {{#if varName}} ... {{/if}}
  let result = content.replace(
    /\{\{#if\s+([a-zA-Z0-9_]+)\s*\}\}([\s\S]*?)\{\{\/if\}\}/g,
    (_, key: string, body: string) => (isTruthy(vars[key]) ? body : ""),
  );

  // {{#unless varName}} ... {{/unless}}
  result = result.replace(
    /\{\{#unless\s+([a-zA-Z0-9_]+)\s*\}\}([\s\S]*?)\{\{\/unless\}\}/g,
    (_, key: string, body: string) => (!isTruthy(vars[key]) ? body : ""),
  );

  return result;
}

function processEach(content: string, vars: Record<string, string>): string {
  // {{#each varName}} ... {{this}} ... {{/each}}
  // varName value must be a comma-separated list: items=one,two,three
  return content.replace(
    /\{\{#each\s+([a-zA-Z0-9_]+)\s*\}\}([\s\S]*?)\{\{\/each\}\}/g,
    (_, key: string, body: string) => {
      const value = vars[key];
      if (!value) return "";
      const items = value
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      return items.map((item) => body.replace(/\{\{\s*this\s*\}\}/g, item)).join("");
    },
  );
}

function interpolate(content: string, vars: Record<string, string>): string {
  // Merge built-in vars (year, date) — user vars take precedence
  const allVars = { ...builtinVars(), ...vars };

  let result = processConditionals(content, allVars);
  result = processEach(result, allVars);

  // {{helperName varName}} — string transformation helpers
  const helperPattern = new RegExp(
    `\\{\\{\\s*(${HELPER_NAMES.join("|")})\\s+([a-zA-Z0-9_.]+)\\s*\\}\\}`,
    "g",
  );
  result = result.replace(helperPattern, (_, helper: string, key: string) => {
    const value = allVars[key];
    if (value === undefined) return `{{${helper} ${key}}}`;
    return applyHelper(helper as Parameters<typeof applyHelper>[0], value);
  });

  // {{varName}} — simple substitution
  result = result.replace(/\{\{\s*([a-zA-Z0-9_.-]+)\s*\}\}/g, (_, key: string) => {
    if (Object.prototype.hasOwnProperty.call(allVars, key)) return allVars[key]!;
    return `{{${key}}}`;
  });

  return result;
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
      `Target already exists: ${target}. Use --force to overwrite.`,
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
    async render({
      templateRoot,
      destDir,
      variables,
      options,
    }: Parameters<TemplateEngine["render"]>[0]): Promise<void> {
      const root = resolve(templateRoot);
      const out = resolve(destDir);
      const force = Boolean(options?.force);

      try {
        await mkdir(out, { recursive: true });
      } catch (err) {
        throw new BootcraftError(
          "TEMPLATE_RENDER_FAILED",
          `Failed to ensure destination directory: ${out}`,
          err instanceof Error ? err : undefined,
        );
      }

      const dryRun = Boolean(options?.dryRun);
      const warnOnUnresolved = Boolean(options?.warnOnUnresolved);
      const onFile = options?.onFile;
      const onUnresolved = options?.onUnresolved;
      const ignoreMatcher = options?.ignoreMatcher ?? (await loadIgnoreMatcher(root));
      const files = await walk(root, root);

      for (const absPath of files) {
        const rel = toPosixPath(relative(root, absPath));
        if (rel === ".bootcraftignore") continue; // never copy ignore file
        if (ignoreMatcher.shouldIgnore(rel)) {
          onFile?.(rel, "skip");
          continue;
        }

        const target = join(out, rel);

        if (dryRun) {
          onFile?.(rel, "write");
          continue;
        }

        const buf = await readFile(absPath);
        const treatAsText = isTextFileByExtension(rel) && !looksBinary(buf);

        if (treatAsText) {
          const rendered = interpolate(buf.toString("utf-8"), variables);

          if (warnOnUnresolved && onUnresolved) {
            const unresolved = [...rendered.matchAll(/\{\{([a-zA-Z0-9_.-]+)\}\}/g)];
            for (const match of unresolved) {
              onUnresolved(match[1]!, rel);
            }
          }

          await writeFileSafe(target, rendered, force);
        } else {
          await writeFileSafe(target, buf, force);
        }
        onFile?.(rel, "write");
      }
    },
  };
}
