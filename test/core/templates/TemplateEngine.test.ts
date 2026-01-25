import { describe, it, expect } from "vitest";
import { mkdtemp, mkdir, writeFile, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { createTemplateEngine } from "../../../src/core/templates/TemplateEngine";

async function makeTempDir(prefix: string): Promise<string> {
  return mkdtemp(join(tmpdir(), prefix));
}

describe("TemplateEngine", () => {
  it("copies files and interpolates {{var}} in text files", async () => {
    const root = await makeTempDir("bootcraft-tpl-root-");
    const out = await makeTempDir("bootcraft-tpl-out-");

    await mkdir(join(root, "templates"), { recursive: true });
    await writeFile(join(root, "templates", "README.md"), "Hello {{serviceName}}!\n", "utf-8");

    const engine = createTemplateEngine();
    await engine.render({
      templateRoot: root,
      destDir: out,
      variables: { serviceName: "orders" },
    });

    const rendered = await readFile(join(out, "templates", "README.md"), "utf-8");
    expect(rendered).toBe("Hello orders!\n");
  });

  it("respects .bootcraftignore patterns", async () => {
    const root = await makeTempDir("bootcraft-tpl-root-");
    const out = await makeTempDir("bootcraft-tpl-out-");

    await writeFile(join(root, ".bootcraftignore"), "secret/**\n*.tmp\n", "utf-8");
    await mkdir(join(root, "secret"), { recursive: true });
    await writeFile(join(root, "secret", "a.txt"), "NOPE", "utf-8");
    await writeFile(join(root, "ok.txt"), "OK", "utf-8");
    await writeFile(join(root, "x.tmp"), "NOPE", "utf-8");

    const engine = createTemplateEngine();
    await engine.render({ templateRoot: root, destDir: out, variables: {} });

    const ok = await readFile(join(out, "ok.txt"), "utf-8");
    expect(ok).toBe("OK");

    await expect(readFile(join(out, "secret", "a.txt"), "utf-8")).rejects.toBeTruthy();
    await expect(readFile(join(out, "x.tmp"), "utf-8")).rejects.toBeTruthy();
  });

  it("fails if target exists and force=false", async () => {
    const root = await makeTempDir("bootcraft-tpl-root-");
    const out = await makeTempDir("bootcraft-tpl-out-");

    await writeFile(join(root, "file.txt"), "v1", "utf-8");
    await writeFile(join(out, "file.txt"), "existing", "utf-8");

    const engine = createTemplateEngine();

    await expect(
      engine.render({ templateRoot: root, destDir: out, variables: {}, options: { force: false } })
    ).rejects.toMatchObject({
      name: "BootcraftError",
      code: "TEMPLATE_TARGET_EXISTS",
    });
  });

  it("overwrites if target exists and force=true", async () => {
    const root = await makeTempDir("bootcraft-tpl-root-");
    const out = await makeTempDir("bootcraft-tpl-out-");

    await writeFile(join(root, "file.txt"), "v2 {{x}}", "utf-8");
    await writeFile(join(out, "file.txt"), "existing", "utf-8");

    const engine = createTemplateEngine();

    await engine.render({
      templateRoot: root,
      destDir: out,
      variables: { x: "ok" },
      options: { force: true },
    });

    const content = await readFile(join(out, "file.txt"), "utf-8");
    expect(content).toBe("v2 ok");
  });
});
