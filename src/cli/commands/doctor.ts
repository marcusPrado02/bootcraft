import { Command } from "commander";
import { resolve } from "node:path";

import { BootcraftError } from "../../core/errors/index.js";
import { createDoctorService } from "../../core/doctor/DoctorService.js";

export function doctorCommand(): Command {
  return new Command("doctor")
    .description("Validate a Bootcraft-generated project against baseline requirements.")
    .option("-p, --path <dir>", "Project directory (default: cwd)", process.cwd())
    .action(async (opts) => {
      const dir = resolve(String(opts.path));
      const doctor = createDoctorService();

      try {
        const report = await doctor.run({ projectDir: dir });

        const okCount = report.results.filter((r) => r.status === "PASS").length;
        const failCount = report.results.length - okCount;

        console.log(`[bootcraft] doctor: ${report.ok ? "OK" : "FAIL"}`);
        console.log(`- path: ${report.projectDir}`);
        console.log(`- checks: ${okCount} ok, ${failCount} fail\n`);

        for (const r of report.results) {
          if (r.status === "PASS") {
            console.log(`✅ ${r.description}`);
          } else {
            console.log(`❌ ${r.description}`);
            if (r.hint) console.log(`   hint: ${r.hint}`);
          }
        }

        if (!report.ok) {
          process.exitCode = 1; // important: non-zero exit if any check fails
        }
      } catch (err) {
        if (err instanceof BootcraftError) {
          console.error(err.toUserMessage());
          process.exitCode = 1;
          return;
        }
        const msg = err instanceof Error ? err.message : String(err);
        console.error(`[DOCTOR_FAILED] ${msg}`);
        process.exitCode = 1;
      }
    });
}
