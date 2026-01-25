import { homedir } from "node:os";
import { join, resolve } from "node:path";

export const REGISTRY_ENV_VAR = "BOOTCRAFT_REGISTRY_PATH";

export function resolveDefaultRegistryPath(): string {
  return join(homedir(), ".bootcraft", "registry.json");
}

export function resolveRegistryPath(explicitPath?: string): string {
  const fromEnv = process.env[REGISTRY_ENV_VAR];
  const chosen = explicitPath ?? fromEnv ?? resolveDefaultRegistryPath();
  return resolve(chosen);
}
