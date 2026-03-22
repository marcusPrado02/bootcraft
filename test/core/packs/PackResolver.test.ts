import { describe, it, expect } from "vitest";
import { mkdtemp, mkdir, writeFile, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { createPackResolver } from "../../../src/core/packs/PackResolver.js";
import { createRegistryService } from "../../../src/core/registry/RegistryService.js";

async function makeTempDir(): Promise<string> {
  return mkdtemp(join(tmpdir(), "bootcraft-pack-"));
}

const VALID_PACK_YAML = `
pack:
  name: baseline
  version: 0.1.0
archetypes:
  - id: service
    templateRoot: templates/service
`;

describe("PackResolver (local)", () => {
  it("resolves a local pack, computes hash, and registers it", async () => {
    const dir = await makeTempDir();
    const registryPath = join(dir, "registry.json");
    const packDir = join(dir, "packs", "baseline");

    await mkdir(packDir, { recursive: true });
    await writeFile(join(packDir, "pack.yaml"), VALID_PACK_YAML, "utf-8");
    await mkdir(join(packDir, "templates", "service"), { recursive: true });
    await writeFile(join(packDir, "templates", "service", "README.md"), "hello", "utf-8");

    const registry = createRegistryService({ registryPath });
    const resolver = createPackResolver({ registry });

    const resolved = await resolver.resolveLocalPack(packDir);

    expect(resolved.id).toBe("baseline");
    expect(resolved.version).toBe("0.1.0");
    expect(resolved.integrityHash).toMatch(/^[a-f0-9]{64}$/);
    expect(resolved.source).toContain("local:");

    // Confirm registered
    const reg = await registry.load();
    expect(reg.packs).toHaveLength(1);
    expect(reg.packs[0]?.id).toBe("baseline");
    expect(reg.packs[0]?.integrityHash).toBe(resolved.integrityHash);
  });

  it("hash changes when file content changes", async () => {
    const dir = await makeTempDir();
    const registryPath = join(dir, "registry.json");
    const packDir = join(dir, "pack");

    await mkdir(join(packDir, "templates", "service"), { recursive: true });
    await writeFile(join(packDir, "pack.yaml"), VALID_PACK_YAML, "utf-8");
    await writeFile(join(packDir, "a.txt"), "one", "utf-8");

    const registry = createRegistryService({ registryPath });
    const resolver = createPackResolver({ registry });

    const first = await resolver.resolveLocalPack(packDir);

    await writeFile(join(packDir, "a.txt"), "two", "utf-8");
    const second = await resolver.resolveLocalPack(packDir);

    expect(first.integrityHash).not.toBe(second.integrityHash);
  });

  it("ignores node_modules when hashing", async () => {
    const dir = await makeTempDir();
    const registryPath = join(dir, "registry.json");
    const packDir = join(dir, "pack");

    await mkdir(join(packDir, "templates", "service"), { recursive: true });
    await writeFile(join(packDir, "pack.yaml"), VALID_PACK_YAML, "utf-8");
    await writeFile(join(packDir, "a.txt"), "stable", "utf-8");

    // node_modules content should not affect hash
    await mkdir(join(packDir, "node_modules"), { recursive: true });
    await writeFile(join(packDir, "node_modules", "junk.txt"), "junk", "utf-8");

    const registry = createRegistryService({ registryPath });
    const resolver = createPackResolver({ registry });

    const first = await resolver.resolveLocalPack(packDir);

    await writeFile(join(packDir, "node_modules", "junk.txt"), "changed", "utf-8");
    const second = await resolver.resolveLocalPack(packDir);

    expect(first.integrityHash).toBe(second.integrityHash);
  });

  it("writes registry file (pretty json) after resolving", async () => {
    const dir = await makeTempDir();
    const registryPath = join(dir, "registry.json");
    const packDir = join(dir, "pack");

    await mkdir(join(packDir, "templates", "service"), { recursive: true });
    await writeFile(join(packDir, "pack.yaml"), VALID_PACK_YAML, "utf-8");
    await writeFile(join(packDir, "a.txt"), "x", "utf-8");

    const registry = createRegistryService({ registryPath });
    const resolver = createPackResolver({ registry });

    await resolver.resolveLocalPack(packDir);

    const raw = await readFile(registryPath, "utf-8");
    expect(raw.endsWith("\n")).toBe(true);
    const parsed = JSON.parse(raw);
    expect(parsed.schemaVersion).toBe("0.1");
    expect(parsed.packs.length).toBe(1);
  });
});
