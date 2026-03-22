import { describe, it, expect } from "vitest";
import { mkdtemp, mkdir, writeFile, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { createInitService } from "../../../src/core/init/InitService.js";
import { createRegistryService } from "../../../src/core/registry/RegistryService.js";
import { createPackResolver } from "../../../src/core/packs/PackResolver.js";
import { createGenerator } from "../../../src/core/generator/Generator.js";

async function makeTempDir(prefix: string): Promise<string> {
  return mkdtemp(join(tmpdir(), prefix));
}

const PACK_YAML = `
pack:
  name: baseline
  version: 0.1.0
archetypes:
  - id: service
    templateRoot: templates/service
`;

const PACK_YAML_WITH_VARS = `
pack:
  name: typed-pack
  version: 0.1.0
archetypes:
  - id: default
    templateRoot: templates
    variables:
      - name: serviceName
        type: string
        required: true
      - name: nodeVersion
        type: string
        required: false
        default: "20"
`;

describe("InitService", () => {
  it("initializes project using local baseline pack and writes state.json", async () => {
    const dir = await makeTempDir("bootcraft-init-");
    const packDir = join(dir, "packs", "baseline");
    const outDir = join(dir, "out", "orders");

    await mkdir(join(packDir, "templates", "service"), { recursive: true });
    await writeFile(join(packDir, "pack.yaml"), PACK_YAML, "utf-8");
    await writeFile(
      join(packDir, "templates", "service", "README.md"),
      "Service: {{serviceName}}\n",
      "utf-8",
    );

    const registryPath = join(dir, "registry.json");
    const registry = createRegistryService({ registryPath });
    const packResolver = createPackResolver({ registry });
    const generator = createGenerator({ logger: { info() {}, warn() {}, error() {} } });

    const init = createInitService({ packResolver, generator });

    await init.init({
      packPath: packDir,
      outDir,
      variables: { serviceName: "orders" },
    });

    const readme = await readFile(join(outDir, "README.md"), "utf-8");
    expect(readme).toBe("Service: orders\n");

    const stateRaw = await readFile(join(outDir, ".bootcraft", "state.json"), "utf-8");
    const state = JSON.parse(stateRaw);

    expect(state.schemaVersion).toBe("0.2");
    expect(state.appliedPacks.length).toBe(1);
    expect(state.appliedPacks[0].id).toBe("baseline");
    expect(state.decisions.init.archetypeId).toBe("service");
  });

  it("applies declared variable defaults when not provided", async () => {
    const dir = await makeTempDir("bootcraft-init-vars-");
    const packDir = join(dir, "pack");
    const outDir = join(dir, "out");

    await mkdir(join(packDir, "templates"), { recursive: true });
    await writeFile(join(packDir, "pack.yaml"), PACK_YAML_WITH_VARS, "utf-8");
    await writeFile(
      join(packDir, "templates", "config.ts"),
      "// node: {{nodeVersion}} service: {{serviceName}}\n",
      "utf-8",
    );

    const registryPath = join(dir, "registry.json");
    const registry = createRegistryService({ registryPath });
    const packResolver = createPackResolver({ registry });
    const generator = createGenerator({ logger: { info() {}, warn() {}, error() {} } });
    const init = createInitService({ packResolver, generator });

    await init.init({
      packPath: packDir,
      outDir,
      variables: { serviceName: "orders" }, // nodeVersion omitted — should default to "20"
    });

    const content = await readFile(join(outDir, "config.ts"), "utf-8");
    expect(content).toContain("node: 20");
    expect(content).toContain("service: orders");
  });

  it("throws INIT_FAILED when a required variable is missing", async () => {
    const dir = await makeTempDir("bootcraft-init-req-");
    const packDir = join(dir, "pack");
    const outDir = join(dir, "out");

    await mkdir(join(packDir, "templates"), { recursive: true });
    await writeFile(join(packDir, "pack.yaml"), PACK_YAML_WITH_VARS, "utf-8");
    await writeFile(join(packDir, "templates", "f.txt"), "{{serviceName}}", "utf-8");

    const registryPath = join(dir, "registry.json");
    const registry = createRegistryService({ registryPath });
    const packResolver = createPackResolver({ registry });
    const generator = createGenerator({ logger: { info() {}, warn() {}, error() {} } });
    const init = createInitService({ packResolver, generator });

    await expect(
      init.init({ packPath: packDir, outDir, variables: {} }), // serviceName not provided
    ).rejects.toMatchObject({ code: "INIT_FAILED" });
  });
});
