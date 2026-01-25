import { readFile } from "node:fs/promises";

import { BootcraftError } from "../errors/index.js";
import { atomicWriteFile } from "../../infra/fs/index.js";
import { resolveRegistryPath } from "./paths.js";
import type { BootcraftRegistry, RegistryPackRecord } from "./types.js";

export interface RegistryService {
  load(): Promise<BootcraftRegistry>;
  save(registry: BootcraftRegistry): Promise<void>;
  registerPack(input: Omit<RegistryPackRecord, "registeredAt">): Promise<BootcraftRegistry>;
  getPack(id: string, version?: string): Promise<RegistryPackRecord | undefined>;
}

export interface RegistryServiceOptions {
  /** Optional explicit path (overrides env + default) */
  registryPath?: string;
}

function nowIso(): string {
  return new Date().toISOString();
}

function emptyRegistry(): BootcraftRegistry {
  return { schemaVersion: "0.1", packs: [] };
}

function isNodeErrno(err: unknown): err is NodeJS.ErrnoException {
  return typeof err === "object" && err !== null && "code" in err;
}

async function readRegistryFileOrUndefined(path: string): Promise<string | undefined> {
  try {
    return await readFile(path, "utf-8");
  } catch (err) {
    if (isNodeErrno(err) && err.code === "ENOENT") {
      return undefined;
    }
    throw new BootcraftError(
      "REGISTRY_READ_FAILED",
      `Failed to read registry file: ${path}`,
      err instanceof Error ? err : undefined
    );
  }
}

function parseRegistryJson(path: string, raw: string): BootcraftRegistry {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (err) {
    throw new BootcraftError(
      "REGISTRY_INVALID",
      `Invalid JSON in registry file: ${path}`,
      err instanceof Error ? err : undefined
    );
  }

  // Minimal runtime validation (v0.1). We keep it lightweight here.
  if (
    typeof parsed !== "object" ||
    parsed === null ||
    (parsed as any).schemaVersion  !== "0.1" ||
    !Array.isArray((parsed as any).packs)
  ) {
    throw new BootcraftError(
      "REGISTRY_INVALID",
      `Invalid registry schema in file: ${path} (expected schemaVersion '0.1' and packs[])`
    );
  }

  return parsed as BootcraftRegistry;
}

export function createRegistryService(options: RegistryServiceOptions = {}): RegistryService {
  const path = resolveRegistryPath(options.registryPath);

  return {
    async load(): Promise<BootcraftRegistry> {
      const raw = await readRegistryFileOrUndefined(path);
      if (!raw) return emptyRegistry();
      return parseRegistryJson(path, raw);
    },

    async save(registry: BootcraftRegistry): Promise<void> {
      const content = JSON.stringify(registry, null, 2) + "\n";
      try {
        await atomicWriteFile(path, content);
      } catch (err) {
        if (err instanceof BootcraftError) throw err;
        throw new BootcraftError(
          "REGISTRY_WRITE_FAILED",
          `Failed to write registry file: ${path}`,
          err instanceof Error ? err : undefined
        );
      }
    },

    async registerPack(input: Omit<RegistryPackRecord, "registeredAt">): Promise<BootcraftRegistry> {
      const registry = await this.load();

      const record: RegistryPackRecord = {
        ...input,
        registeredAt: nowIso(),
      };

      const idx = registry.packs.findIndex((p) => p.id === record.id && p.version === record.version);
      if (idx >= 0) {
        registry.packs[idx] = record;
      } else {
        registry.packs.push(record);
      }

      await this.save(registry);
      return registry;
    },

    async getPack(id: string, version?: string): Promise<RegistryPackRecord | undefined> {
      const registry = await this.load();
      if (version) return registry.packs.find((p) => p.id === id && p.version === version);

      // If version is omitted: return the latest by semver-ish fallback? (v0.1 keeps it simple)
      // We pick the most recently registered record.
      const matches = registry.packs.filter((p) => p.id === id);
      if (matches.length === 0) return undefined;
      return matches.slice().sort((a, b) => b.registeredAt.localeCompare(a.registeredAt))[0];
    },
  };
}
