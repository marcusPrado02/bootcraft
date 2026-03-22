import { readFileSync } from "node:fs";
import { defineConfig } from "vitest/config";

const { version } = JSON.parse(readFileSync("./package.json", "utf-8")) as {
  version: string;
};

export default defineConfig({
  define: {
    __BOOTCRAFT_VERSION__: JSON.stringify(version),
  },
  test: {
    include: ["test/**/*.test.ts"],
    coverage: {
      provider: "v8",
      include: ["src/**/*.ts"],
      exclude: [
        // Entry point
        "src/index.ts",
        // Barrel re-export files — covered implicitly via importers
        "src/**/index.ts",
        // CLI layer — covered by E2E/integration tests, not unit tests
        "src/cli/**",
        // Type-only files
        "src/**/types.ts",
      ],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 65,
        statements: 80,
      },
    },
  },
});
