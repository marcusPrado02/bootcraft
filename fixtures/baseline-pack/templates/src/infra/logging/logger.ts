/**
 * Structured logger.
 *
 * Outputs JSON lines to stdout. Each log entry includes:
 * - timestamp, level, message, service name
 * - optional context fields
 *
 * Replace with pino/winston in the stack pack if needed.
 * This baseline logger has zero dependencies by design.
 */

export type LogLevel = "debug" | "info" | "warn" | "error";

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  service: string;
  [key: string]: unknown;
}

const LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

export function createLogger(
  service: string,
  minLevel: LogLevel = "info"
): Record<LogLevel, (message: string, context?: Record<string, unknown>) => void> {
  function log(level: LogLevel, message: string, context?: Record<string, unknown>): void {
    if (LEVELS[level] < LEVELS[minLevel]) return;

    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      service,
      ...context,
    };

    process.stdout.write(JSON.stringify(entry) + "\n");
  }

  return {
    debug: (msg, ctx) => log("debug", msg, ctx),
    info: (msg, ctx) => log("info", msg, ctx),
    warn: (msg, ctx) => log("warn", msg, ctx),
    error: (msg, ctx) => log("error", msg, ctx),
  };
}
