import { describe, it, expect } from "vitest";
import { mkdtemp, mkdir, writeFile, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { createDoctorService } from "../../../src/core/doctor/DoctorService.js";

async function makeTempDir(prefix: string): Promise<string> {
  return mkdtemp(join(tmpdir(), prefix));
}

const VALID_ADR = `
# ADR-0001

## Context
Needed a good architecture.

## Decision
We chose Clean Architecture.

## Consequences
### Positive
- Testable
`;

const VALID_OPENAPI = `
openapi: "3.1.0"
info:
  title: test-service
  version: "0.1.0"
paths:
  /health:
    get:
      summary: Liveness probe
`;

async function makeFullProject(dir: string): Promise<void> {
  await mkdir(join(dir, ".bootcraft"), { recursive: true });
  await writeFile(
    join(dir, ".bootcraft", "state.json"),
    JSON.stringify({ schemaVersion: "0.1", packs: [] }, null, 2),
  );

  await mkdir(join(dir, "docs", "architecture"), { recursive: true });
  await writeFile(
    join(dir, "docs", "architecture", "ADR-0001-initial-architecture.md"),
    VALID_ADR,
    "utf-8",
  );

  await mkdir(join(dir, "docs", "api"), { recursive: true });
  await writeFile(join(dir, "docs", "api", "openapi.yaml"), VALID_OPENAPI, "utf-8");

  await mkdir(join(dir, "src", "domain"), { recursive: true });
  await mkdir(join(dir, "src", "app"), { recursive: true });
  await mkdir(join(dir, "src", "infra"), { recursive: true });

  await mkdir(join(dir, "tests", "unit"), { recursive: true });
  await mkdir(join(dir, "tests", "integration"), { recursive: true });
  await mkdir(join(dir, "tests", "e2e"), { recursive: true });
}

describe("DoctorService", () => {
  it("passes when all requirements exist with valid content", async () => {
    const dir = await makeTempDir("bootcraft-doctor-ok-");
    await makeFullProject(dir);

    const doctor = createDoctorService();
    const report = await doctor.run({ projectDir: dir });

    expect(report.ok).toBe(true);
    expect(report.results.every((r) => r.status === "PASS")).toBe(true);
  });

  it("fails when requirements are missing", async () => {
    const dir = await makeTempDir("bootcraft-doctor-fail-");

    const doctor = createDoctorService();
    const report = await doctor.run({ projectDir: dir });

    expect(report.ok).toBe(false);

    const fails = report.results.filter((r) => r.status === "FAIL").map((r) => r.id);
    expect(fails).toContain("state");
    expect(fails).toContain("adr");
    expect(fails).toContain("openapi");
    expect(fails).toContain("src-domain");
    expect(fails).toContain("tests-unit");
    expect(fails).toContain("tests-integration");
    expect(fails).toContain("tests-e2e");
  });

  it("openapi-content check fails when openapi.yaml lacks info or paths", async () => {
    const dir = await makeTempDir("bootcraft-doctor-openapi-");
    await makeFullProject(dir);

    // Overwrite with invalid openapi (no paths block)
    await writeFile(
      join(dir, "docs", "api", "openapi.yaml"),
      "openapi: 3.1.0\ninfo:\n  title: x\n",
    );

    const doctor = createDoctorService();
    const report = await doctor.run({ projectDir: dir });

    const openapiContent = report.results.find((r) => r.id === "openapi-content");
    expect(openapiContent?.status).toBe("FAIL");
  });

  it("adr-content check fails when ADR lacks required sections", async () => {
    const dir = await makeTempDir("bootcraft-doctor-adr-");
    await makeFullProject(dir);

    // Overwrite with incomplete ADR (no Consequences)
    await writeFile(
      join(dir, "docs", "architecture", "ADR-0001-initial-architecture.md"),
      "# ADR\n\n## Context\nSomething.\n\n## Decision\nWe did X.\n",
      "utf-8",
    );

    const doctor = createDoctorService();
    const report = await doctor.run({ projectDir: dir });

    const adrContent = report.results.find((r) => r.id === "adr-content");
    expect(adrContent?.status).toBe("FAIL");
  });

  it("--fix creates missing auto-fixable directories", async () => {
    const dir = await makeTempDir("bootcraft-doctor-fix-");

    const doctor = createDoctorService();
    const report = await doctor.run({ projectDir: dir, fix: true });

    // Auto-fixable dirs should now exist and pass
    const fixedIds = [
      "src-domain",
      "src-app",
      "src-infra",
      "tests-unit",
      "tests-integration",
      "tests-e2e",
    ];
    for (const id of fixedIds) {
      const result = report.results.find((r) => r.id === id);
      expect(result?.status).toBe("PASS");
    }

    // Verify directories were actually created
    await stat(join(dir, "src", "domain")); // throws if missing
    await stat(join(dir, "tests", "unit"));
  });

  it("uses custom checks when provided", async () => {
    const dir = await makeTempDir("bootcraft-doctor-custom-");

    const doctor = createDoctorService({
      checks: [
        {
          id: "custom",
          description: "Custom check always passes",
          hint: "n/a",
          async run() {
            return { id: "custom", description: "Custom check always passes", status: "PASS" };
          },
        },
      ],
    });

    const report = await doctor.run({ projectDir: dir });
    expect(report.ok).toBe(true);
    expect(report.results).toHaveLength(1);
    expect(report.results[0]?.id).toBe("custom");
  });
});
