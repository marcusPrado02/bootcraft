/**
 * E2E tests for `bootcraft init` + `bootcraft doctor`.
 *
 * These tests run the full pipeline against the real fixtures/baseline-pack
 * and a temporary output directory — no mocks, no stubs.
 */

import { mkdtemp, readFile, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { describe, it, expect, beforeAll } from "vitest";

import { createInitService } from "../../src/core/init/InitService.js";
import { createDoctorService } from "../../src/core/doctor/DoctorService.js";

const BASELINE_PACK = resolve("fixtures/baseline-pack");

async function pathExists(p: string): Promise<boolean> {
  try {
    await stat(p);
    return true;
  } catch {
    return false;
  }
}

async function makeTempDir(): Promise<string> {
  return mkdtemp(join(tmpdir(), "bootcraft-e2e-"));
}

// ---------------------------------------------------------------------------
// init
// ---------------------------------------------------------------------------

describe("bootcraft init (E2E)", () => {
  let outDir: string;

  beforeAll(async () => {
    outDir = await makeTempDir();

    const init = createInitService();
    await init.init({
      packPath: BASELINE_PACK,
      outDir,
      variables: {
        projectName: "my-e2e-service",
        projectDescription: "E2E test service",
        nodeVersion: "20",
        serviceName: "my-e2e-service",
      },
    });
  });

  it("creates .bootcraft/state.json", async () => {
    const stateFile = join(outDir, ".bootcraft", "state.json");
    expect(await pathExists(stateFile)).toBe(true);

    const raw = await readFile(stateFile, "utf-8");
    const state = JSON.parse(raw);
    expect(state).toHaveProperty("schemaVersion");
    expect(state.appliedPacks).toBeInstanceOf(Array);
    expect(state.appliedPacks.length).toBeGreaterThan(0);
  });

  it("creates Clean Architecture folder structure", async () => {
    const layers = ["domain", "app", "infra", "interfaces"];
    for (const layer of layers) {
      expect(await pathExists(join(outDir, "src", layer))).toBe(true);
    }
  });

  it("creates domain sub-directories", async () => {
    const subdirs = ["entities", "value-objects", "repositories", "services", "events"];
    for (const sub of subdirs) {
      expect(await pathExists(join(outDir, "src", "domain", sub))).toBe(true);
    }
  });

  it("creates test pyramid directories", async () => {
    for (const kind of ["unit", "integration", "e2e"]) {
      expect(await pathExists(join(outDir, "tests", kind))).toBe(true);
    }
  });

  it("creates docs with ADR and OpenAPI", async () => {
    expect(await pathExists(join(outDir, "docs", "architecture", "ADR-0001-initial-architecture.md"))).toBe(true);
    expect(await pathExists(join(outDir, "docs", "api", "openapi.yaml"))).toBe(true);
  });

  it("creates README.md with interpolated project name", async () => {
    const readme = await readFile(join(outDir, "README.md"), "utf-8");
    expect(readme).toContain("my-e2e-service");
    expect(readme).not.toContain("{{projectName}}");
  });

  it("creates .env.example", async () => {
    const envExample = await readFile(join(outDir, ".env.example"), "utf-8");
    expect(envExample).toContain("my-e2e-service");
    expect(envExample).not.toContain("{{projectName}}");
  });

  it("creates health endpoint file", async () => {
    const healthFile = join(outDir, "src", "interfaces", "http", "health.ts");
    expect(await pathExists(healthFile)).toBe(true);
    const content = await readFile(healthFile, "utf-8");
    expect(content).toContain("my-e2e-service");
  });
});

// ---------------------------------------------------------------------------
// doctor — passing
// ---------------------------------------------------------------------------

describe("bootcraft doctor after init (E2E)", () => {
  let outDir: string;

  beforeAll(async () => {
    outDir = await makeTempDir();

    const init = createInitService();
    await init.init({
      packPath: BASELINE_PACK,
      outDir,
      variables: {
        projectName: "doctor-pass-service",
        serviceName: "doctor-pass-service",
      },
    });
  });

  it("doctor passes on a freshly generated project", async () => {
    const doctor = createDoctorService();
    const report = await doctor.run({ projectDir: outDir });

    const failing = report.results.filter((r) => r.status === "FAIL");
    if (failing.length > 0) {
      const details = failing.map((r) => `  ❌ ${r.id}: ${r.description}\n     ${r.hint}`).join("\n");
      throw new Error(`Doctor failed with ${failing.length} check(s):\n${details}`);
    }

    expect(report.ok).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// doctor — failing cases
// ---------------------------------------------------------------------------

describe("bootcraft doctor failure cases (E2E)", () => {
  it("fails on empty directory with all checks reported", async () => {
    const emptyDir = await makeTempDir();
    const doctor = createDoctorService();
    const report = await doctor.run({ projectDir: emptyDir });

    expect(report.ok).toBe(false);
    const failIds = report.results.filter((r) => r.status === "FAIL").map((r) => r.id);
    expect(failIds).toContain("state");
    expect(failIds).toContain("adr");
    expect(failIds).toContain("openapi");
    expect(failIds).toContain("src-domain");
    expect(failIds).toContain("src-app");
    expect(failIds).toContain("src-infra");
    expect(failIds).toContain("tests-unit");
  });

  it("reports hints for failing checks", async () => {
    const emptyDir = await makeTempDir();
    const doctor = createDoctorService();
    const report = await doctor.run({ projectDir: emptyDir });

    for (const result of report.results.filter((r) => r.status === "FAIL")) {
      expect(result.hint).toBeTruthy();
    }
  });

  it("dry-run init does not satisfy doctor", async () => {
    const outDir = await makeTempDir();
    const init = createInitService();

    await init.init({
      packPath: BASELINE_PACK,
      outDir,
      variables: { projectName: "dry-test", serviceName: "dry-test" },
      dryRun: true,
    });

    const doctor = createDoctorService();
    const report = await doctor.run({ projectDir: outDir });
    // dry-run wrote nothing — doctor must fail
    expect(report.ok).toBe(false);
  });
});
