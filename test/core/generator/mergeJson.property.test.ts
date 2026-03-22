/**
 * Property-based tests for mergeJsonStep / deepMerge invariants.
 *
 * Uses fast-check to fuzz inputs and verify structural guarantees
 * that example-based tests cannot exhaustively cover.
 */

import { describe, it, expect } from "vitest";
import { mkdtemp, writeFile, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import * as fc from "fast-check";

import { mergeJsonStep } from "../../../src/core/generator/steps/mergeJson.js";
import type { GenerationContext } from "../../../src/core/generator/types.js";
import { createDefaultState } from "../../../src/core/state/types.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function makeTempDir(): Promise<string> {
  return mkdtemp(join(tmpdir(), "bootcraft-merge-prop-"));
}

function makeCtx(projectDir: string): GenerationContext {
  return {
    projectDir,
    variables: {},
    logger: { info() {}, warn() {}, error() {}, debug() {} },
    state: createDefaultState(),
  };
}

/** Safe key: valid identifier-like string, excluding prototype-pollution candidates */
const safeKeyArb = fc
  .string({ minLength: 1, maxLength: 12 })
  .filter(
    (s) =>
      /^[a-zA-Z][a-zA-Z0-9_]*$/.test(s) &&
      s !== "__proto__" &&
      s !== "constructor" &&
      s !== "prototype",
  );

/** Arbitrary for a plain JSON object (depth ≤ 3, no arrays at root) */
const jsonObjectArb: fc.Arbitrary<Record<string, unknown>> = fc.dictionary(
  safeKeyArb,
  fc.oneof(
    fc.string({ maxLength: 20 }),
    fc.integer({ min: -1000, max: 1000 }),
    fc.boolean(),
    fc.constant(null),
  ),
  { minKeys: 0, maxKeys: 8 },
);

// ---------------------------------------------------------------------------
// Properties
// ---------------------------------------------------------------------------

describe("mergeJsonStep — property-based invariants", () => {
  it("merged result contains all keys from patch (patch wins)", async () => {
    await fc.assert(
      fc.asyncProperty(jsonObjectArb, jsonObjectArb, async (base, patch) => {
        const dir = await makeTempDir();
        const filePath = "data.json";

        await writeFile(join(dir, filePath), JSON.stringify(base, null, 2), "utf-8");

        const step = mergeJsonStep({ relPath: filePath, patch });
        await step.run(makeCtx(dir));

        const result = JSON.parse(await readFile(join(dir, filePath), "utf-8")) as Record<
          string,
          unknown
        >;

        for (const [key, value] of Object.entries(patch)) {
          expect(result[key]).toStrictEqual(value);
        }
      }),
      { numRuns: 50 },
    );
  });

  it("merged result preserves base keys not overridden by patch", async () => {
    await fc.assert(
      fc.asyncProperty(jsonObjectArb, jsonObjectArb, async (base, patch) => {
        const dir = await makeTempDir();
        const filePath = "data.json";

        await writeFile(join(dir, filePath), JSON.stringify(base, null, 2), "utf-8");

        const step = mergeJsonStep({ relPath: filePath, patch });
        await step.run(makeCtx(dir));

        const result = JSON.parse(await readFile(join(dir, filePath), "utf-8")) as Record<
          string,
          unknown
        >;

        for (const [key, value] of Object.entries(base)) {
          if (!(key in patch)) {
            expect(result[key]).toStrictEqual(value);
          }
        }
      }),
      { numRuns: 50 },
    );
  });

  it("applying patch twice is idempotent (same result as once)", async () => {
    await fc.assert(
      fc.asyncProperty(jsonObjectArb, jsonObjectArb, async (base, patch) => {
        // Apply once
        const dir1 = await makeTempDir();
        await writeFile(join(dir1, "data.json"), JSON.stringify(base, null, 2), "utf-8");
        await mergeJsonStep({ relPath: "data.json", patch }).run(makeCtx(dir1));
        const afterOnce = JSON.parse(await readFile(join(dir1, "data.json"), "utf-8"));

        // Apply twice
        const dir2 = await makeTempDir();
        await writeFile(join(dir2, "data.json"), JSON.stringify(base, null, 2), "utf-8");
        await mergeJsonStep({ relPath: "data.json", patch }).run(makeCtx(dir2));
        await mergeJsonStep({ relPath: "data.json", patch }).run(makeCtx(dir2));
        const afterTwice = JSON.parse(await readFile(join(dir2, "data.json"), "utf-8"));

        expect(afterOnce).toStrictEqual(afterTwice);
      }),
      { numRuns: 50 },
    );
  });

  it("result file always ends with newline", async () => {
    await fc.assert(
      fc.asyncProperty(jsonObjectArb, jsonObjectArb, async (base, patch) => {
        const dir = await makeTempDir();
        await writeFile(join(dir, "data.json"), JSON.stringify(base, null, 2), "utf-8");
        await mergeJsonStep({ relPath: "data.json", patch }).run(makeCtx(dir));
        const raw = await readFile(join(dir, "data.json"), "utf-8");
        expect(raw.endsWith("\n")).toBe(true);
      }),
      { numRuns: 50 },
    );
  });

  it("creates file from scratch if it does not exist (missing base)", async () => {
    await fc.assert(
      fc.asyncProperty(jsonObjectArb, async (patch) => {
        const dir = await makeTempDir();
        // No base file — step should create it from scratch
        await mergeJsonStep({ relPath: "new.json", patch }).run(makeCtx(dir));
        const result = JSON.parse(await readFile(join(dir, "new.json"), "utf-8"));
        for (const [key, value] of Object.entries(patch)) {
          expect(result[key]).toStrictEqual(value);
        }
      }),
      { numRuns: 50 },
    );
  });
});
