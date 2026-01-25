import { resolve } from "node:path";

import { BootcraftError } from "../errors/index.js";
import { createManifestLoader } from "../manifest/ManifestLoader.js";
import { createRegistryService, type RegistryService } from "../registry/RegistryService.js";
import { hashDirectorySha256 } from "../../infra/fs/index.js";
import type { ResolvedPack } from "./types.js";

export interface PackResolver {
  resolveLocalPack(packPath: string): Promise<ResolvedPack>;
}

export interface PackResolverOptions {
  registry?: RegistryService;
}

export function createPackResolver(options: PackResolverOptions = {}): PackResolver {
  const registry = options.registry ?? createRegistryService();
  const loader = createManifestLoader();

  return {
    async resolveLocalPack(packPath: string): Promise<ResolvedPack> {
      const rootPath = resolve(packPath);
      const source = `local:${rootPath}`;

      let manifest;
      try {
        manifest = await loader.load(rootPath);
      } catch (err) {
        if (err instanceof BootcraftError) throw err;
        throw new BootcraftError(
          "PACK_RESOLVE_FAILED",
          `Failed to load pack manifest from: ${rootPath}`,
          err instanceof Error ? err : undefined
        );
      }

      let integrityHash: string;
      try {
        integrityHash = await hashDirectorySha256(rootPath);
      } catch (err) {
        throw new BootcraftError(
          "PACK_HASH_FAILED",
          `Failed to compute integrity hash for pack: ${rootPath}`,
          err instanceof Error ? err : undefined
        );
      }

      const resolved: ResolvedPack = {
        id: manifest.pack.name,
        version: manifest.pack.version,
        rootPath,
        source,
        integrityHash,
        manifest,
      };

      // Register in registry (cache for reproducibility)
      await registry.registerPack({
        id: resolved.id,
        version: resolved.version,
        source: resolved.source,
        integrityHash: resolved.integrityHash,
      });

      return resolved;
    },
  };
}
