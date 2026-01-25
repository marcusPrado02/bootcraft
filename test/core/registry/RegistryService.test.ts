import { describe, it, expect } from "vitest";
import { mkdtemp, writeFile, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { createRegistryService } from "../../../src/core/registry/RegistryService.js";
import { BootcraftError } from "../../../src/core/errors/index.js";

async function makeTempDir(): Promise<string> {
  return mkdtemp(join(tmpdir(), "bootcraft-registry-"));
}

describe("RegistryService", () => {
  it("load() returns empty registry if file does not exist", async () => {
    const dir = await makeTempDir();
    const registryPath = join(dir, "registry.json");

    const svc = createRegistryService({ registryPath });
    const reg = await svc.load();

    expect(reg.schemaVersion).toBe("0.1");
    expect(reg.packs).toEqual([]);
  });

  it("registerPack() persists and load() reads it back", async () => {
    const dir = await makeTempDir();
    const registryPath = join(dir, "registry.json");

    const svc = createRegistryService({ registryPath });

    await svc.registerPack({
      id: "baseline",
      version: "0.1.0",
      source: "local:/packs/baseline",
      integrityHash: "abc123",
    });

    const reg = await svc.load();
    expect(reg.packs).toHaveLength(1);
    expect(reg.packs[0]?.id).toBe("baseline");
    expect(reg.packs[0]?.version).toBe("0.1.0");
    expect(reg.packs[0]?.integrityHash).toBe("abc123");
    expect(reg.packs[0]?.registeredAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it("registerPack() upserts by (id, version)", async () => {
    const dir = await makeTempDir();
    const registryPath = join(dir, "registry.json");
    const svc = createRegistryService({ registryPath });

    await svc.registerPack({
      id: "baseline",
      version: "0.1.0",
      source: "local:/packs/baseline",
      integrityHash: "abc123",
    });

    await svc.registerPack({
      id: "baseline",
      version: "0.1.0",
      source: "local:/packs/baseline",
      integrityHash: "NEW_HASH",
    });

    const reg = await svc.load();
    expect(reg.packs).toHaveLength(1);
    expect(reg.packs[0]?.integrityHash).toBe("NEW_HASH");
  });

  it("getPack() returns by id/version, or latest if version omitted", async () => {
    const dir = await makeTempDir();
    const registryPath = join(dir, "registry.json");
    const svc = createRegistryService({ registryPath });

    await svc.registerPack({
      id: "baseline",
      version: "0.1.0",
      source: "local:/packs/baseline",
      integrityHash: "H1",
    });

    const exact = await svc.getPack("baseline", "0.1.0");
    expect(exact?.integrityHash).toBe("H1");

    const latest = await svc.getPack("baseline");
    expect(latest?.version).toBe("0.1.0");
  });

  it("load() throws REGISTRY_INVALID for invalid JSON", async () => {
    const dir = await makeTempDir();
    const registryPath = join(dir, "registry.json");
    await writeFile(registryPath, "{invalid", "utf-8");

    const svc = createRegistryService({ registryPath });

    await expect(svc.load()).rejects.toBeInstanceOf(BootcraftError);
    await expect(svc.load()).rejects.toMatchObject({ code: "REGISTRY_INVALID" });
  });

  it("save() writes pretty JSON with newline", async () => {
    const dir = await makeTempDir();
    const registryPath = join(dir, "registry.json");
    const svc = createRegistryService({ registryPath });

    const reg = await svc.registerPack({
      id: "baseline",
      version: "0.1.0",
      source: "local:/packs/baseline",
      integrityHash: "abc123",
    });

    // Ensure file is there and ends with newline
    const raw = await readFile(registryPath, "utf-8");
    expect(raw.endsWith("\n")).toBe(true);

    // Ensure it's parseable
    const parsed = JSON.parse(raw);
    expect(parsed.schemaVersion).toBe("0.1");
    expect(parsed.packs.length).toBe(reg.packs.length);
  });
});
