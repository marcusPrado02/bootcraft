import type { BootcraftState } from "../state/types.js";

export interface Logger {
  info(message: string): void;
  warn(message: string): void;
  error(message: string): void;
  debug?(message: string): void;
}

export interface GenerationContext {
  projectDir: string;
  variables: Record<string, string>;
  logger: Logger;
  state: BootcraftState;
}

export interface Step {
  /** Stable step id for logs and debugging */
  id: string;
  /** Human-readable label shown in progress output */
  name?: string;
  run(ctx: GenerationContext): Promise<void>;
}
