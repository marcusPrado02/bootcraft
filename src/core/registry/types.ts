export interface RegistryPackRecord {
  id: string;
  version: string;
  source: string; // e.g. "local:/abs/path" or "git:https://..."
  integrityHash: string; // content hash
  registeredAt: string; // ISO date
}

export interface BootcraftRegistry {
  schemaVersion: "0.1";
  packs: RegistryPackRecord[];
}
