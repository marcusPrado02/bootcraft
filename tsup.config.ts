import { readFileSync } from "node:fs";
import { defineConfig } from "tsup";

const { version } = JSON.parse(readFileSync("./package.json", "utf-8")) as {
  version: string;
};

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["cjs"],
  splitting: false,
  sourcemap: true,
  clean: true,
  dts: false,
  target: "es2022",
  define: {
    __BOOTCRAFT_VERSION__: JSON.stringify(version),
  },
});
