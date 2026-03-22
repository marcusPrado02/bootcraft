import { describe, it, expect } from "vitest";
import { mkdtemp, mkdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { createDoctorService } from "../../../src/core/doctor/DoctorService.js";

async function makeTempDir(prefix: string): Promise<string> {
  return mkdtemp(join(tmpdir(), prefix));
}

describe("DoctorService", () => {
  it("passes when baseline requirements exist", async () => {
    const dir = await makeTempDir("bootcraft-doctor-ok-");

    await mkdir(join(dir, ".bootcraft"), { recursive: true });
    await writeFile(join(dir, ".bootcraft", "state.json"), JSON.stringify({ schemaVersion: "0.1", packs: [] }, null, 2));

    await mkdir(join(dir, "docs", "architecture"), { recursive: true });
    await writeFile(join(dir, "docs", "architecture", "ADR-0001-initial-architecture.md"), "# ADR 0001\n", "utf-8");

    await mkdir(join(dir, "docs", "api"), { recursive: true });
    await writeFile(join(dir, "docs", "api", "openapi.yaml"), "openapi: 3.0.0\n", "utf-8");

    await mkdir(join(dir, "src", "domain"), { recursive: true });
    await mkdir(join(dir, "src", "app"), { recursive: true });
    await mkdir(join(dir, "src", "infra"), { recursive: true });

    await mkdir(join(dir, "tests", "unit"), { recursive: true });

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
  });
});
