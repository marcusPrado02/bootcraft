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
          err instanceof Error ? err : undefined
        );
      }

      const ctx: GenerationContext = {
        projectDir: dir,
        variables,
        logger,
        state,
      };

      for (const step of steps) {
        try {
          logger.info(`[bootcraft] step:start ${step.id}`);
          await step.run(ctx);
          logger.info(`[bootcraft] step:done  ${step.id}`);
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          throw new BootcraftError(
            "GENERATOR_STEP_FAILED",
            `Step failed (${step.id}): ${msg}`,
            err instanceof Error ? err : undefined
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
          err instanceof Error ? err : undefined
        );
      }

      return ctx.state;
    },
  };
}
