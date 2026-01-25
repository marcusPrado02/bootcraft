import type { BootcraftManifest } from "../manifest/types.js";

export interface ResolvedPack {
  id: string; // for now: manifest.pack.name
  version: string;
  rootPath: string; // absolute
  source: string; // local:/abs/path
  integrityHash: string; // sha256 hex
  manifest: BootcraftManifest;
}
