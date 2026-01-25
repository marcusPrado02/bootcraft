import { access, constants } from "node:fs/promises";
import { join, resolve } from "node:path";

import { BootcraftError } from "../errors/index.js";
import type { DoctorCheckResult, DoctorReport } from "./types.js";

export interface DoctorService {
  run(params: { projectDir: string }): Promise<DoctorReport>;
}

async function exists(path: string): Promise<boolean> {
  try {
    await access(path, constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

function checkFile(id: string, description: string, absPath: string, hint: string): Promise<DoctorCheckResult> {
  return exists(absPath).then((ok) => ({
    id,
    description,
    status: ok ? "PASS" : "FAIL",
    hint: ok ? undefined : hint,
  }));
}

function checkDir(id: string, description: string, absPath: string, hint: string): Promise<DoctorCheckResult> {
  // for v0.1, existence is enough (we don't stat/isDirectory to keep it simple & fast)
  return exists(absPath).then((ok) => ({
    id,
    description,
    status: ok ? "PASS" : "FAIL",
    hint: ok ? undefined : hint,
  }));
}

export function createDoctorService(): DoctorService {
  return {
    async run({ projectDir }): Promise<DoctorReport> {
      const root = resolve(projectDir);

      try {
        const results: DoctorCheckResult[] = [];

        // Baseline requirements
        results.push(
          await checkFile(
            "state",
            "Project state exists (.bootcraft/state.json)",
            join(root, ".bootcraft", "state.json"),
            "Run `bootcraft init ...` or ensure `.bootcraft/state.json` is generated."
          )
        );

        results.push(
          await checkFile(
            "adr",
            "Architecture decision record exists (ADR-0001)",
            join(root, "docs", "architecture", "ADR-0001-initial-architecture.md"),
            "Baseline pack should generate docs/architecture/ADR-0001-initial-architecture.md"
          )
        );

        results.push(
          await checkFile(
            "openapi",
            "OpenAPI contract exists (docs/api/openapi.yaml)",
            join(root, "docs", "api", "openapi.yaml"),
            "Baseline pack should generate docs/api/openapi.yaml (even a stub)."
          )
        );

        results.push(
          await checkDir(
            "src-domain",
            "Clean Architecture: domain layer exists (src/domain)",
            join(root, "src", "domain"),
            "Create src/domain and keep business rules there (entities, value objects, domain services)."
          )
        );

        results.push(
          await checkDir(
            "src-application",
            "Clean Architecture: application layer exists (src/application)",
            join(root, "src", "application"),
            "Create src/application for use-cases and orchestration (commands/queries, DTOs)."
          )
        );

        results.push(
          await checkDir(
            "src-infrastructure",
            "Ports & Adapters: infrastructure exists (src/infrastructure)",
            join(root, "src", "infrastructure"),
            "Create src/infrastructure for adapters (db, messaging, http clients, observability)."
          )
        );

        results.push(
          await checkDir(
            "tests-unit",
            "Test pyramid: unit tests folder exists (tests/unit)",
            join(root, "tests", "unit"),
            "Create tests/unit and add at least 1 unit test as baseline."
          )
        );

        const ok = results.every((r) => r.status === "PASS");

        return { projectDir: root, results, ok };
      } catch (err) {
        throw new BootcraftError(
          "DOCTOR_FAILED",
          `Doctor failed while scanning project: ${root}`,
          err instanceof Error ? err : undefined
        );
      }
    },
  };
}
