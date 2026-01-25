import { describe, it, expect } from "vitest";
import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { createManifestLoader } from "../../../src/core/manifest/ManifestLoader";
import { BootcraftError } from "../../../src/core/errors/BootcraftError";

async function makeTempDir(): Promise<string> {
  return mkdtemp(join(tmpdir(), "bootcraft-manifest-"));
}

const VALID_PACK_YAML = `
pack:
  name: baseline
  version: 0.1.0
archetypes:
  - id: service
    templateRoot: templates/service
`;

describe("ManifestLoader", () => {
  it("loads pack.yaml and validates schema", async () => {
    const dir = await makeTempDir();
    await writeFile(join(dir, "pack.yaml"), VALID_PACK_YAML, "utf-8");

    const loader = createManifestLoader();
    const manifest = await loader.load(dir);

    expect(manifest.kind).toBe("pack");
    expect(manifest.pack.name).toBe("baseline");
    expect(manifest.pack.version).toBe("0.1.0");
    expect(manifest.archetypes).toHaveLength(1);
    expect(manifest.archetypes[0]?.id).toBe("service");
  });

  it("loads archetype.yaml when pack.yaml is missing", async () => {
    const dir = await makeTempDir();
    await writeFile(join(dir, "archetype.yaml"), VALID_PACK_YAML, "utf-8");

    const loader = createManifestLoader();
    const manifest = await loader.load(dir);

    expect(manifest.kind).toBe("archetype");
    expect(manifest.pack.name).toBe("baseline");
  });

  it("throws a clear error if no manifest exists", async () => {
    const dir = await makeTempDir();
    const loader = createManifestLoader();

    await expect(loader.load(dir)).rejects.toMatchObject({
      name: "BootcraftError",
      code: "MANIFEST_NOT_FOUND",
    });
  });

  it("throws a clear error for invalid YAML", async () => {
    const dir = await makeTempDir();
    await writeFile(join(dir, "pack.yaml"), "pack: [", "utf-8");
    const loader = createManifestLoader();

    await expect(loader.load(dir)).rejects.toMatchObject({
      name: "BootcraftError",
      code: "MANIFEST_YAML_INVALID",
    });
  });

  it("throws a clear error for schema violations with field paths", async () => {
    const dir = await makeTempDir();
    const invalid = `
pack:
  name: ""
  version: 0.1.0
archetypes:
  - id: ""
    templateRoot: ""
`;
    await writeFile(join(dir, "pack.yaml"), invalid, "utf-8");

    const loader = createManifestLoader();

    try {
      await loader.load(dir);
      expect.unreachable("expected to throw");
    } catch (err) {
      expect(err).toBeInstanceOf(BootcraftError);
      const be = err as BootcraftError;
      expect(be.code).toBe("MANIFEST_SCHEMA_INVALID");
      expect(be.message).toContain("pack.name");
      expect(be.message).toContain("archetypes.0.id");
      expect(be.message).toContain("archetypes.0.templateRoot");
    }
  });
});
