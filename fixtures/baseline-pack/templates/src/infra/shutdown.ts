/**
 * Graceful shutdown handler.
 *
 * Usage:
 *   import { registerShutdownHook } from "./infra/shutdown.js";
 *   registerShutdownHook(async () => { await server.close(); });
 */

type CleanupFn = () => Promise<void>;

const cleanupFns: CleanupFn[] = [];

function handleSignal(signal: string): void {
  console.log(`\nReceived ${signal}, shutting down gracefully…`);

  Promise.allSettled(cleanupFns.map((fn) => fn()))
    .then((results) => {
      const failed = results.filter((r) => r.status === "rejected");
      if (failed.length > 0) {
        console.error(`[shutdown] ${failed.length} cleanup(s) failed:`);
        failed.forEach((r) => {
          if (r.status === "rejected") console.error(" -", r.reason);
        });
        process.exitCode = 1;
      }
      process.exit(process.exitCode ?? 0);
    })
    .catch(() => process.exit(1));
}

/** Register a cleanup function to be called on SIGTERM or SIGINT. */
export function registerShutdownHook(fn: CleanupFn): void {
  if (cleanupFns.length === 0) {
    process.once("SIGTERM", () => handleSignal("SIGTERM"));
    process.once("SIGINT", () => handleSignal("SIGINT"));
  }
  cleanupFns.push(fn);
}
