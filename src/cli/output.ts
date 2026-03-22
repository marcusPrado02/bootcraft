/**
 * CLI-level logger.
 *
 * Wraps console.log/warn/error with a log-level gate so --verbose and
 * --debug flags can control verbosity without touching service internals.
 */

import type { Logger } from "../core/generator/types.js";

export type LogLevel = "silent" | "normal" | "verbose" | "debug";

export function createCliLogger(level: LogLevel = "normal"): Logger {
  const showInfo = level === "verbose" || level === "debug" || level === "normal";
  const showDebug = level === "debug";

  return {
    info: (msg) => {
      if (showInfo) console.log(msg);
    },
    warn: (msg) => console.warn(`[warn] ${msg}`),
    error: (msg) => console.error(`[error] ${msg}`),
    debug: (msg) => {
      if (showDebug) console.debug(`[debug] ${msg}`);
    },
  };
}

export function resolveLogLevel(opts: { verbose?: boolean; debug?: boolean }): LogLevel {
  if (opts.debug) return "debug";
  if (opts.verbose) return "verbose";
  return "normal";
}
