#!/usr/bin/env node
import { createApp } from "./cli/app.js";

async function main() {
  const app = createApp();
  await app.parseAsync(process.argv);
}

main().catch((err) => {
  const message = err instanceof Error ? err.message : String(err);
  console.error(`[bootcraft] fatal: ${message}`);
  process.exit(1);
});
