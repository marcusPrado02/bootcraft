/**
 * ManifestLoader
 *
 * Loads a pack manifest from either `pack.yaml` or `archetype.yaml`.
 * Validates a minimal schema (v0.1) using Zod.
 */

import { readFile, access, constants } from "node:fs/promises";
import { join, resolve } from "node:path";
import YAML from "yaml";

import { BootcraftError } from "../errors/index.js";
import { manifestSchema } from "./schemas.js";
import type { BootcraftManifest, ManifestKind } from "./types.js";

const MANIFEST_CANDIDATES = ["pack.yaml", "archetype.yaml"] as const;

export interface ManifestLoader {
  load(packDir: string): Promise<BootcraftManifest>;
}

async function fileExists(path: string): Promise<boolean> {
  try {
    await access(path, constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

function detectKind(fileName: string): ManifestKind {
  if (fileName === "pack.yaml") return "pack";
  return "archetype";
}

function formatZodIssues(
  filePath: string,
  issues: { path: (string | number)[]; message: string }[]
): string {
  const lines = issues.map((i) => {
    const p = i.path.length ? i.path.join(".") : "<root>";
    return `- ${p}: ${i.message}`;
  });
  return `Invalid manifest schema in ${filePath}\n${lines.join("\n")}`;
}

export function createManifestLoader(): ManifestLoader {
  return {
    async load(packDir: string): Promise<BootcraftManifest> {
      const root = resolve(packDir);

      let manifestPath: string | undefined;
      let manifestFileName: string | undefined;

      for (const candidate of MANIFEST_CANDIDATES) {
        const p = join(root, candidate);
        if (await fileExists(p)) {
          manifestPath = p;
          manifestFileName = candidate;
          break;
        }
      }

      if (!manifestPath || !manifestFileName) {
        throw new BootcraftError(
          "MANIFEST_NOT_FOUND",
          `No manifest found in ${root}. Expected one of: ${MANIFEST_CANDIDATES.join(", ")}`
        );
      }

      let rawText: string;
      try {
        rawText = await readFile(manifestPath, "utf-8");
      } catch (err) {
        const nodeErr = err as NodeJS.ErrnoException;
        throw new BootcraftError(
          "MANIFEST_READ_FAILED",
          `Failed to read manifest: ${manifestPath}`,
          nodeErr instanceof Error ? nodeErr : undefined
        );
      }

      let parsed: unknown;
      try {
        parsed = YAML.parse(rawText);
      } catch (err) {
        throw new BootcraftError(
          "MANIFEST_YAML_INVALID",
          `Invalid YAML in manifest: ${manifestPath}`,
          err instanceof Error ? err : undefined
        );
      }

      const result = manifestSchema.safeParse(parsed);
      if (!result.success) {
        const issues = result.error.issues
          .filter((issue) => issue.code !== "unrecognized_keys")
          .map((issue) => ({
            path: issue.path as (string | number)[],
            message: issue.message,
          }));
        throw new BootcraftError(
          "MANIFEST_SCHEMA_INVALID",
          formatZodIssues(manifestPath, issues)
        );
      }

      return {
        kind: detectKind(manifestFileName),
        filePath: manifestPath,
        pack: result.data.pack,
        archetypes: result.data.archetypes,
      };
    },
  };
}
