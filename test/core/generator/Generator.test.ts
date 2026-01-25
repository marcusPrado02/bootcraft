import { describe, it, expect } from "vitest";
import { mkdtemp, mkdir, writeFile, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { createGenerator } from "../../../src/core/generator/Generator.js";
import { mergeJsonStep } from "../../../src/core/generator/steps/mergeJson.js";
import type { Step } from "../../../src/core/generator/types.js";

async function makeTempDir(prefix: string): Promise<string> {
  return mkdtemp(join(tmpdir(), prefix));
}

describe("Generator", () => {
  it("runs steps in order and saves state at the end", async () => {
    const projectDir = await makeTempDir("bootcraft-gen-");

    const order: string[] = [];
    const s1: Step = { id: "s1", async run() { order.push("s1"); } };
    const s2: Step = { id: "s2", async run() { order.push("s2"); } };

    const gen = createGenerator({ logger: { info() {}, warn() {}, error() {} } });

    const state = await gen.run({
      projectDir,
      variables: { serviceName: "orders" },
      steps: [s1, s2],
    });

    expect(order).toEqual(["s1", "s2"]);
    // .bootcraft/state.json should exist now
    const raw = await readFile(join(projectDir, ".bootcraft", "state.json"), "utf-8");
    const parsed = JSON.parse(raw);
    expect(parsed.schemaVersion).toBe("0.1");
    expect(state.schemaVersion).toBe("0.1");
  });

  it("fails with GENERATOR_STEP_FAILED when a step throws", async () => {
    const projectDir = await makeTempDir("bootcraft-gen-err-");

    const bad: Step = {
      id: "bad",
      async run() {
        throw new Error("boom");
      },
    };

    const gen = createGenerator({ logger: { info() {}, warn() {}, error() {} } });

    await expect(
      gen.run({ projectDir, variables: {}, steps: [bad] })
    ).rejects.toMatchObject({
      name: "BootcraftError",
      code: "GENERATOR_STEP_FAILED",
    });
  });

  it("mergeJsonStep merges objects and replaces arrays", async () => {
    const projectDir = await makeTempDir("bootcraft-gen-merge-");
    await mkdir(projectDir, { recursive: true });

    await writeFile(
      join(projectDir, "package.json"),
      JSON.stringify({ name: "x", scripts: { test: "old" }, arr: [1, 2] }, null, 2),
      "utf-8"
    );

    const gen = createGenerator({ logger: { info() {}, warn() {}, error() {} } });

    await gen.run({
      projectDir,
      variables: {},
      steps: [
        mergeJsonStep({
          relPath: "package.json",
          patch: { scripts: { test: "new", lint: "eslint ." }, arr: ["a"] },
        }),
      ],
    });

    const after = JSON.parse(await readFile(join(projectDir, "package.json"), "utf-8"));
    expect(after.scripts.test).toBe("new");
    expect(after.scripts.lint).toBe("eslint .");
    expect(after.arr).toEqual(["a"]);
  });
});
