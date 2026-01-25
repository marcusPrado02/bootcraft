import { readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

import { BootcraftError } from "../../errors/index.js";
import { ensureDir } from "../../../infra/fs/index.js";

import type { Step } from "../types.js";

type JsonObject = Record<string, unknown>;

function isPlainObject(v: unknown): v is JsonObject {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

/**
 * Deep merge for plain objects:
 * - object + object => recursively merge
 * - arrays => replaced (no concat)
 * - primitives => source overwrites target
 */
function deepMerge(target: unknown, source: unknown): unknown {
  if (isPlainObject(target) && isPlainObject(source)) {
    const out: JsonObject = { ...target };
    for (const [k, v] of Object.entries(source)) {
      out[k] = deepMerge(out[k], v);
    }
    return out;
  }
  // arrays and primitives: replace
  return source;
}

async function readJsonOrEmpty(path: string): Promise<JsonObject> {
  try {
    const raw = await readFile(path, "utf-8");
    const parsed = JSON.parse(raw);
    if (!isPlainObject(parsed)) {
      throw new BootcraftError("JSON_MERGE_FAILED", `JSON root must be an object: ${path}`);
    }
    return parsed;
  } catch (err) {
    const nodeErr = err as NodeJS.ErrnoException;
    if (nodeErr?.code === "ENOENT") return {};
    if (err instanceof BootcraftError) throw err;
    throw new BootcraftError(
      "JSON_MERGE_FAILED",
      `Failed to read/parse JSON: ${path}`,
      err instanceof Error ? err : undefined
    );
  }
}

export interface MergeJsonStepParams {
  relPath: string; // e.g. "package.json"
  patch: JsonObject; // values to merge into existing JSON
}

export function mergeJsonStep(params: MergeJsonStepParams): Step {
  return {
    id: `mergeJson:${params.relPath}`,
    async run(ctx) {
      const abs = resolve(ctx.projectDir, params.relPath);
      const current = await readJsonOrEmpty(abs);

      const merged = deepMerge(current, params.patch);
      if (!isPlainObject(merged)) {
        throw new BootcraftError("JSON_MERGE_FAILED", `Merge produced non-object for: ${abs}`);
      }

      await ensureDir(dirname(abs));
      await writeFile(abs, JSON.stringify(merged, null, 2) + "\n", "utf-8");
    },
  };
}
