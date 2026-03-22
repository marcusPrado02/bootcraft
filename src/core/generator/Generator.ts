import { resolve } from "node:path";

import { BootcraftError } from "../errors/index.js";
import { createStateStore, type StateStore } from "../state/StateStore.js";
import type { BootcraftState } from "../state/types.js";
import type { GenerationContext, Logger, Step } from "./types.js";

function defaultLogger(): Logger {
  return {
    info: (m) => console.log(m),
    warn: (m) => console.warn(m),
    error: (m) => console.error(m),
    debug: (m) => console.debug(m),
  };
}

export interface GeneratorOptions {
  stateStore?: StateStore;
  logger?: Logger;
}

export interface Generator {
  run(params: {
    projectDir: string;
    variables: Record<string, string>;
    steps: Step[];
  }): Promise<BootcraftState>;
}

export function createGenerator(options: GeneratorOptions = {}): Generator {
  const store = options.stateStore ?? createStateStore();
  const logger = options.logger ?? defaultLogger();

  return {
    async run({ projectDir, variables, steps }): Promise<BootcraftState> {
      const dir = resolve(projectDir);

      let state: BootcraftState;
      try {
        state = await store.load(dir);
      } catch (err) {
        // load() should not throw if file missing, but if it throws, expose a clear generator-level error
        throw new BootcraftError(
          "GENERATOR_FAILED",
          `Failed to load Bootcraft state for project: ${dir}`,
          err instanceof Error ? err : undefined,
        );
      }

      const ctx: GenerationContext = {
        projectDir: dir,
        variables,
        logger,
        state,
      };

      const total = steps.length;
      for (let i = 0; i < steps.length; i++) {
        const step = steps[i]!;
        const label = step.name ?? step.id;
        const prefix = `[${i + 1}/${total}]`;
        const completedAt = new Date().toISOString();
        try {
          logger.info(`${prefix} ${label}...`);
          await step.run(ctx);
          logger.info(`${prefix} ${label} done`);

          ctx.state.stepHistory = [
            ...(ctx.state.stepHistory ?? []),
            { stepId: step.id, name: step.name, completedAt, outcome: "success" },
          ];
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          ctx.state.stepHistory = [
            ...(ctx.state.stepHistory ?? []),
            { stepId: step.id, name: step.name, completedAt, outcome: "failure", error: msg },
          ];
          throw new BootcraftError(
            "GENERATOR_STEP_FAILED",
            `Step failed (${step.id}): ${msg}`,
            err instanceof Error ? err : undefined,
          );
        }
      }

      // Persist state at the end (single write)
      try {
        // touch timestamps if present
        const now = new Date().toISOString();
        ctx.state.project = {
          ...(ctx.state.project ?? {}),
          updatedAt: now,
          createdAt: ctx.state.project?.createdAt ?? now,
        } as any;

        await store.save(dir, ctx.state);
      } catch (err) {
        throw new BootcraftError(
          "GENERATOR_FAILED",
          `Failed to save Bootcraft state for project: ${dir}`,
          err instanceof Error ? err : undefined,
        );
      }

      return ctx.state;
    },
  };
}
