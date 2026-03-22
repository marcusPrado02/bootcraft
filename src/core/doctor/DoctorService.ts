import { resolve } from "node:path";

import { BootcraftError } from "../errors/index.js";
import { DEFAULT_CHECKS, type CheckDefinition } from "./checks.js";
import type { DoctorReport } from "./types.js";

export interface DoctorService {
  run(params: { projectDir: string; fix?: boolean }): Promise<DoctorReport>;
}

export interface DoctorServiceOptions {
  /** Override the default check set (useful for tests). */
  checks?: CheckDefinition[];
}

export function createDoctorService(options: DoctorServiceOptions = {}): DoctorService {
  const checks = options.checks ?? DEFAULT_CHECKS;

  return {
    async run({ projectDir, fix = false }): Promise<DoctorReport> {
      const root = resolve(projectDir);

      try {
        const ctx = { root };
        const results = await Promise.all(
          checks.map(async (check) => {
            let result = await check.run(ctx);

            if (result.status === "FAIL" && fix && check.autoFixable && check.fix) {
              await check.fix(ctx);
              result = await check.run(ctx);
            }

            return result;
          }),
        );

        const ok = results.every((r) => r.status === "PASS");
        return { projectDir: root, results, ok };
      } catch (err) {
        throw new BootcraftError(
          "DOCTOR_FAILED",
          `Doctor failed while scanning project: ${root}`,
          err instanceof Error ? err : undefined,
        );
      }
    },
  };
}
