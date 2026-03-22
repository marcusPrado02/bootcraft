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
      engine.render({ templateRoot: root, destDir: out, variables: {}, options: { force: false } }),
    ).rejects.toMatchObject({
      name: "BootcraftError",
      code: "TEMPLATE_TARGET_EXISTS",
    });
  });

  it("processes {{#if var}} conditional blocks", async () => {
    const root = await makeTempDir("bootcraft-tpl-root-");
    const out = await makeTempDir("bootcraft-tpl-out-");

    await writeFile(
      join(root, "readme.md"),
      "start\n{{#if featureA}}\nA is enabled\n{{/if}}\n{{#if featureB}}\nB is enabled\n{{/if}}\nend\n",
      "utf-8",
    );

    const engine = createTemplateEngine();
    await engine.render({
      templateRoot: root,
      destDir: out,
      variables: { featureA: "true", featureB: "false" },
    });

    const rendered = await readFile(join(out, "readme.md"), "utf-8");
    expect(rendered).toContain("A is enabled");
    expect(rendered).not.toContain("B is enabled");
    expect(rendered).toContain("start");
    expect(rendered).toContain("end");
  });

  it("processes {{#unless var}} conditional blocks", async () => {
    const root = await makeTempDir("bootcraft-tpl-root-");
    const out = await makeTempDir("bootcraft-tpl-out-");

    await writeFile(
      join(root, "file.txt"),
      "{{#unless debug}}\nproduction mode\n{{/unless}}\n",
      "utf-8",
    );

    const engine = createTemplateEngine();
    await engine.render({
      templateRoot: root,
      destDir: out,
      variables: { debug: "" },
    });

    const rendered = await readFile(join(out, "file.txt"), "utf-8");
    expect(rendered).toContain("production mode");
  });

  it("processes {{#each var}} loop blocks", async () => {
    const root = await makeTempDir("bootcraft-tpl-root-");
    const out = await makeTempDir("bootcraft-tpl-out-");

    await writeFile(join(root, "list.md"), "{{#each envs}}\n- {{this}}\n{{/each}}\n", "utf-8");

    const engine = createTemplateEngine();
    await engine.render({
      templateRoot: root,
      destDir: out,
      variables: { envs: "dev,staging,prod" },
    });

    const rendered = await readFile(join(out, "list.md"), "utf-8");
    expect(rendered).toContain("- dev");
    expect(rendered).toContain("- staging");
    expect(rendered).toContain("- prod");
  });

  it("applies string helpers like {{camelCase var}}", async () => {
    const root = await makeTempDir("bootcraft-tpl-root-");
    const out = await makeTempDir("bootcraft-tpl-out-");

    await writeFile(
      join(root, "config.ts"),
      "const name = '{{camelCase projectName}}';\nconst CLASS = '{{pascalCase projectName}}';\nconst KEY = '{{upper projectName}}';\n",
      "utf-8",
    );

    const engine = createTemplateEngine();
    await engine.render({
      templateRoot: root,
      destDir: out,
      variables: { projectName: "my-service" },
    });

    const rendered = await readFile(join(out, "config.ts"), "utf-8");
    expect(rendered).toContain("'myService'");
    expect(rendered).toContain("'MyService'");
    expect(rendered).toContain("'MY-SERVICE'");
  });

  it("provides {{year}} and {{date}} as built-in variables", async () => {
    const root = await makeTempDir("bootcraft-tpl-root-");
    const out = await makeTempDir("bootcraft-tpl-out-");

    await writeFile(join(root, "adr.md"), "Year: {{year}}\nDate: {{date}}\n", "utf-8");

    const engine = createTemplateEngine();
    await engine.render({ templateRoot: root, destDir: out, variables: {} });

    const rendered = await readFile(join(out, "adr.md"), "utf-8");
    expect(rendered).toMatch(/Year: \d{4}/);
    expect(rendered).toMatch(/Date: \d{4}-\d{2}-\d{2}/);
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
